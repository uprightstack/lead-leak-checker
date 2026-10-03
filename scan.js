// Runs inside the page being checked (injected by popup.js). It must stay self-contained:
// chrome.scripting serializes this function, so it can't use anything defined outside it.
// Reads the page only. Nothing is sent anywhere.
function scanPage() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  };
  const has = (hay, list) => list.find((k) => hay.includes(k));

  // Everything a script or frame loads from, plus small inline scripts.
  const urls = [...document.querySelectorAll("script[src], iframe[src], link[href]")]
    .map((e) => (e.src || e.href || "").toLowerCase())
    .join(" ");
  const inline = [...document.querySelectorAll("script:not([src])")]
    .map((s) => (s.textContent || "").slice(0, 20000).toLowerCase())
    .join(" ");
  const hay = urls + " " + inline;

  const CHAT = {
    "widget.leadconnectorhq": "chat widget", "leadconnectorhq.com/chat": "chat widget", "msgsndr": "chat widget",
    "intercom.io": "Intercom", "intercomcdn": "Intercom", "drift.com": "Drift", "tawk.to": "Tawk.to", "crisp.chat": "Crisp", "tidio.co": "Tidio",
    "livechatinc": "LiveChat", "zdassets": "Zendesk chat", "usemessages.com": "HubSpot chat", "olark.com": "Olark",
    "freshchat.com": "Freshchat", "podium.com": "Podium", "birdeye.com": "Birdeye", "smith.ai": "Smith.ai",
  };
  const BOOKING = {
    "calendly": "Calendly", "acuityscheduling": "Acuity", "app.cal.com": "Cal.com", "/widget/booking": "booking widget",
    "/widget/bookings": "booking widget", "meetings.hubspot": "HubSpot Meetings", "squareup.com/appointments": "Square Appointments",
    "housecallpro": "Housecall Pro", "clienthub": "Jobber", "getjobber": "Jobber", "setmore": "Setmore",
    "youcanbook.me": "YouCanBookMe", "simplybook": "SimplyBook", "vagaro": "Vagaro", "mindbodyonline": "Mindbody",
    "booksy": "Booksy", "fresha.com": "Fresha", "zocdoc": "Zocdoc", "schedulista": "Schedulista", "oncehub": "OnceHub",
  };
  const CRM = {
    "hs-scripts": "HubSpot", "hsforms": "HubSpot", "hubspot": "HubSpot", "leadconnectorhq": "GoHighLevel", "msgsndr": "GoHighLevel",
    "gohighlevel": "GoHighLevel", "pardot": "Pardot", "salesforce": "Salesforce", "zoho": "Zoho", "pipedrive": "Pipedrive",
    "activecampaign": "ActiveCampaign", "klaviyo": "Klaviyo", "mailchimp": "Mailchimp", "jotform": "Jotform",
    "typeform": "Typeform", "wufoo": "Wufoo", "formspree": "Formspree", "gravityforms": "Gravity Forms",
    "wpforms": "WPForms", "contact-form-7": "Contact Form 7", "jobber": "Jobber", "housecallpro": "Housecall Pro",
    "servicetitan": "ServiceTitan", "monday.com": "monday.com",
  };
  const TRACKING = ["googletagmanager", "google-analytics", "gtag(", "fbevents", "clarity.ms", "hotjar", "plausible", "segment.com"];

  const pick = (map) => {
    const key = has(hay, Object.keys(map));
    return key ? map[key] : null;
  };
  const chatTool = pick(CHAT);
  const bookingTool = pick(BOOKING);
  const crmTool = pick(CRM);
  const hasTracking = !!has(hay, TRACKING);

  // Forms: skip search and login forms, count visible fields in the most contact-like one.
  const FIELD = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]):not([type=reset]):not([type=checkbox]):not([type=radio]), textarea, select';
  const candidates = [...document.forms]
    .map((f) => {
      if (f.getAttribute("role") === "search" || f.querySelector("input[type=search], input[type=password]")) return null;
      const fields = [...f.querySelectorAll(FIELD)].filter(visible);
      if (fields.length < 2) return null;
      const contactLike = !!f.querySelector("input[type=email], input[type=tel], input[name*=phone i], input[name*=email i]");
      return { fields: fields.length, contactLike };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.contactLike) - Number(a.contactLike) || a.fields - b.fields);
  const embeddedForm = /hsforms|typeform|jotform|wufoo|forms\.gle|\/widget\/form|leadconnectorhq\.com\/widget\/form|formstack|cognito/.test(urls);
  const form = candidates[0] || null;

  // Phone: a tappable number, or a number shown as plain text.
  const telLinks = [...document.querySelectorAll('a[href^="tel:" i]')].filter(visible);
  const smsLinks = [...document.querySelectorAll('a[href^="sms:" i]')].filter(visible);
  const bodyText = (document.body.innerText || "").slice(0, 60000);
  const phoneText = /(\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b0\d{3,4}[\s]\d{3}[\s]?\d{3,4}\b/.test(bodyText);

  // A clear next step in the first screen.
  const CTA_RE = /\b(book|schedule|quote|estimate|audit|consult\w*|appointment|inspection|call|contact|request|get started|free|demo|talk to|text us)\b/i;
  const foldCta = [...document.querySelectorAll("a, button, [role=button]")].find((el) => {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > innerHeight) return false;
    const label = (el.innerText || el.getAttribute("aria-label") || "").trim();
    return label.length > 0 && label.length < 45 && CTA_RE.test(label);
  });
  const foldTel = telLinks.some((a) => {
    const r = a.getBoundingClientRect();
    return r.top >= 0 && r.top < innerHeight;
  });

  const nav = performance.getEntriesByType("navigation")[0];
  const ttfb = nav ? nav.responseStart : null;
  const loadMs = nav ? (nav.loadEventEnd || nav.domContentLoadedEventEnd || null) : null;
  const viewport = !!document.querySelector('meta[name="viewport"]');

  return new Promise((resolve) => {
    let lcp = null;
    try {
      new PerformanceObserver((list) => {
        const e = list.getEntries();
        if (e.length) lcp = e[e.length - 1].startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch (e) {}
    setTimeout(() => {
      resolve({
        host: location.hostname.replace(/^www\./, ""),
        title: document.title,
        form: form ? { fields: form.fields } : embeddedForm ? { fields: null } : null,
        telLinks: telLinks.length,
        smsLinks: smsLinks.length,
        phoneText,
        chatTool,
        bookingTool,
        crmTool,
        hasTracking,
        foldCta: !!foldCta || foldTel,
        lcp, ttfb, loadMs, viewport,
      });
    }, 250);
  });
}
