// Turns the raw scan into checks and a score. Plain functions, no DOM, so it's easy to test.
const PASS = "pass", WARN = "warn", FAIL = "fail", SKIP = "skip";

function buildChecks(s) {
  const secs = (ms) => (ms < 100 ? "under 0.1s" : (ms / 1000).toFixed(1) + "s");
  const checks = [];

  // 1. Contact form
  checks.push(
    s.form
      ? { id: "form", title: "Contact form", weight: 15, status: PASS, detail: "A contact form is on the page.", why: "A form lets people reach you when they can't call right now." }
      : { id: "form", title: "Contact form", weight: 15, status: FAIL, detail: "No contact form found on this page.", why: "Visitors who can't call right now have no way to leave their details." }
  );

  // 2. Form length
  if (s.form && s.form.fields) {
    const n = s.form.fields;
    checks.push({
      id: "length", title: "Short form", weight: 10,
      status: n <= 5 ? PASS : n <= 8 ? WARN : FAIL,
      detail: `${n} fields to fill in.`,
      why: "Every extra field is another reason to give up. Name, phone and what they need is usually enough.",
    });
  } else {
    checks.push({ id: "length", title: "Short form", weight: 10, status: SKIP, detail: s.form ? "The form is embedded, so we can't count its fields." : "No form to measure.", why: "" });
  }

  // 3. Click-to-call
  if (s.telLinks > 0) {
    checks.push({ id: "call", title: "Tap-to-call number", weight: 15, status: PASS, detail: "A phone number you can tap on mobile.", why: "Most people search on a phone. One tap should start the call." });
  } else if (s.phoneText) {
    checks.push({ id: "call", title: "Tap-to-call number", weight: 15, status: WARN, detail: "A phone number is shown, but it isn't a tappable link.", why: "On mobile, people have to copy the number before they can call. Some won't bother." });
  } else {
    checks.push({ id: "call", title: "Tap-to-call number", weight: 15, status: FAIL, detail: "No phone number found on this page.", why: "Many service customers want to call first." });
  }

  // 4. Chat or text-back
  if (s.chatTool || s.smsLinks > 0) {
    checks.push({ id: "chat", title: "Chat or text option", weight: 15, status: PASS, detail: s.chatTool ? `Detected: ${s.chatTool}.` : "A text-us link is on the page.", why: "Gives people a way to ask a quick question without a phone call." });
  } else {
    checks.push({ id: "chat", title: "Chat or text option", weight: 15, status: FAIL, detail: "No chat widget or text link detected.", why: "When nobody can pick up, a text option keeps the conversation going. (We can only see what the page loads, not your phone system.)" });
  }

  // 5. Online booking
  checks.push(
    s.bookingTool
      ? { id: "booking", title: "Online booking", weight: 15, status: PASS, detail: `Detected: ${s.bookingTool}.`, why: "People who are ready can book without waiting for a reply." }
      : { id: "booking", title: "Online booking", weight: 15, status: FAIL, detail: "No online booking tool detected.", why: "Without one, every job starts with a back-and-forth. (A booking link that opens another site may not show up here.)" }
  );

  // 6. Call to action above the fold
  checks.push(
    s.foldCta
      ? { id: "cta", title: "Clear next step up top", weight: 10, status: PASS, detail: "A call to action is in the first screen.", why: "Visitors should see what to do without scrolling." }
      : { id: "cta", title: "Clear next step up top", weight: 10, status: FAIL, detail: "No clear call to action in the first screen.", why: "If the first screen doesn't say what to do next, many visitors leave." }
  );

  // 7. Lead tool behind the page
  checks.push(
    s.crmTool
      ? { id: "crm", title: "Lead tool connected", weight: 10, status: PASS, detail: `Detected: ${s.crmTool}.`, why: "Forms should land in a system, not just an inbox." }
      : { id: "crm", title: "Lead tool connected", weight: 10, status: WARN, detail: "No CRM or form tool detected on the page.", why: "If the form only sends an email, leads can sit unseen. (Some tools run behind the scenes and can't be seen from here.)" }
  );

  // 8. Speed
  const t = s.lcp || s.loadMs;
  if (t) {
    checks.push({
      id: "speed", title: "Loads fast", weight: 10,
      status: t <= 2500 ? PASS : t <= 4000 ? WARN : FAIL,
      detail: `Main content shows in ${secs(t)}.`,
      why: "People leave slow pages, especially on mobile data.",
    });
  } else {
    checks.push({ id: "speed", title: "Loads fast", weight: 10, status: SKIP, detail: "Couldn't measure load time on this page.", why: "" });
  }

  return checks;
}

function scoreChecks(checks) {
  let earned = 0, possible = 0;
  for (const c of checks) {
    if (c.status === SKIP) continue;
    possible += c.weight;
    earned += c.status === PASS ? c.weight : c.status === WARN ? c.weight / 2 : 0;
  }
  return possible ? Math.round((earned / possible) * 100) : 0;
}

function verdict(score) {
  if (score >= 80) return "Few leaks found";
  if (score >= 55) return "Some leaks found";
  return "Leads could be slipping away";
}

if (typeof module !== "undefined") module.exports = { buildChecks, scoreChecks, verdict };
