const app = document.getElementById("app");
const AUDIT_URL = "https://uprightstack.com/audit?utm_source=chrome-extension&utm_medium=extension&utm_campaign=lead-leak-checker";
const MARK = { pass: "✓", warn: "!", fail: "×", skip: "–" };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function ring(score) {
  const r = 32, c = 2 * Math.PI * r;
  const color = score >= 80 ? "#1f7a4d" : score >= 55 ? "#f2a65a" : "#a8281f";
  return `<div class="ring" role="img" aria-label="Score ${score} out of 100">
    <svg width="76" height="76" viewBox="0 0 76 76"><circle cx="38" cy="38" r="${r}" fill="none" stroke="#e3e9e9" stroke-width="7"/>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}"/></svg>
    <span class="num" aria-hidden="true">${score}</span></div>`;
}

const STATUS_LABEL = { pass: "Passed", warn: "Needs attention", fail: "Needs attention", skip: "Not measured" };

const CHEV = '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';

const row = (c) => `<li><details><summary>
  <span class="dot ${c.status}" aria-hidden="true">${MARK[c.status]}</span>
  <span class="t"><span class="sr">${STATUS_LABEL[c.status]}: </span><span class="title">${esc(c.title)}</span><br><span class="detail">${esc(c.detail)}</span></span>
  ${c.why ? CHEV : ""}
</summary>${c.why ? `<p class="why">${esc(c.why)}</p>` : ""}</details></li>`;

function render(scan) {
  const checks = buildChecks(scan);
  const score = scoreChecks(checks);
  // Problems first (failures, then warnings), then what is fine, then what could not be measured.
  const attention = checks.filter((c) => c.status === "fail").concat(checks.filter((c) => c.status === "warn"));
  const good = checks.filter((c) => c.status === "pass");
  const skipped = checks.filter((c) => c.status === "skip");
  const measured = checks.length - skipped.length;
  const summary = attention.length
    ? `${attention.length} of ${measured} checks need attention`
    : `All ${measured} checks look good`;
  const rest = good.concat(skipped);
  const restTitle = `Looking good (${good.length})${skipped.length ? ` · ${skipped.length} not measured` : ""}`;

  app.innerHTML = `
    <div class="score">${ring(score)}<div class="info"><div class="meta"><p class="host">${esc(scan.host)}</p><button class="copy" id="copy" type="button">Copy results</button></div><p class="verdict">${verdict(score)}</p><p class="count">${summary}</p></div></div>
    ${attention.length ? `<ul class="checks">${attention.map(row).join("")}</ul>` : ""}
    ${rest.length ? `<details class="group"${attention.length ? "" : " open"}><summary>${restTitle}${CHEV}</summary><ul class="checks inner">${rest.map(row).join("")}</ul></details>` : ""}
    <p class="note">Checks this page only: try a business's homepage for the clearest picture. It can't see phone systems, inboxes or follow-up after a lead comes in.</p>
    <div class="sticky">
      <a class="btn btn-primary" id="audit" href="${AUDIT_URL}" target="_blank" rel="noopener">Get my free Lead Leak Audit</a>
      <p class="assure"><span>Free</span> · <span>30 minutes</span> · <span>Written Leak Map in 48 hours</span> · <span>No obligation</span></p>
    </div>`;

  document.getElementById("copy").addEventListener("click", async (e) => {
    const lines = [
      `Lead Leak Checker: ${scan.host} scored ${score}/100 (${verdict(score).toLowerCase()}). ${summary}.`,
      ...attention.concat(good).map((c) => `${MARK[c.status]} ${c.title}: ${c.detail}`),
      "",
      "Check your own site: https://uprightstack.com/audit",
    ];
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Couldn't copy";
    }
    setTimeout(() => (btn.textContent = "Copy results"), 1800);
  });
}

function message(title, hint) {
  app.innerHTML = `<div class="state"><span class="state-icon" aria-hidden="true">i</span><p class="state-title">${esc(title)}</p>${hint ? `<p class="state-hint">${esc(hint)}</p>` : ""}</div>`;
}

(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/.test(tab.url || "")) {
      return message("Open a business website first", "Then click the icon again to check it.");
    }
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanPage });
    if (!res || !res.result) return message("Couldn't read this page", "Reload it and try again.");
    render(res.result);
  } catch (err) {
    message("Couldn't check this page", "Some pages, like the Chrome Web Store, block extensions. Try a business website.");
  }
})();
