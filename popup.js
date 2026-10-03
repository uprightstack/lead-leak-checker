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

function render(scan) {
  const checks = buildChecks(scan);
  const score = scoreChecks(checks);
  const leaks = checks.filter((c) => c.status === "fail" || c.status === "warn");

  app.innerHTML = `
    <div class="score">${ring(score)}<div><p class="host">${esc(scan.host)}</p><p class="verdict">${verdict(score)}</p></div><button class="copy" id="copy" type="button">Copy</button></div>
    <ul class="checks">${checks
      .map(
        (c) => `<li><details><summary>
          <span class="dot ${c.status}" aria-hidden="true">${MARK[c.status]}</span>
          <span class="t"><span class="title">${esc(c.title)}</span><br><span class="detail">${esc(c.detail)}</span></span>
          ${c.why ? '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>' : ""}
        </summary>${c.why ? `<p class="why">${esc(c.why)}</p>` : ""}</details></li>`
      )
      .join("")}</ul>
    <p class="note">A quick read of what this page shows. It can't see phone systems, inboxes or follow-up after a lead comes in.</p>
    <div class="sticky">
      <a class="btn btn-primary" id="audit" href="${AUDIT_URL}" target="_blank" rel="noopener">Get my free Lead Leak Audit</a>
      <p class="assure"><span>Free</span> · <span>30 minutes</span> · <span>Written Leak Map in 48 hours</span> · <span>No obligation</span></p>
    </div>`;

  document.getElementById("copy").addEventListener("click", async (e) => {
    const lines = [
      `Lead Leak Checker: ${scan.host} scored ${score}/100 (${verdict(score).toLowerCase()}).`,
      ...checks.filter((c) => c.status !== "skip").map((c) => `${MARK[c.status]} ${c.title}: ${c.detail}`),
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
    setTimeout(() => (btn.textContent = "Copy"), 1800);
  });
}

function message(text) {
  app.innerHTML = `<p class="state">${esc(text)}</p>`;
}

(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/.test(tab.url || "")) {
      return message("Open a business website, then click the icon again.");
    }
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanPage });
    if (!res || !res.result) return message("Couldn't read this page.");
    render(res.result);
  } catch (err) {
    message("Couldn't check this page. Some pages, like the Chrome Web Store, block extensions.");
  }
})();
