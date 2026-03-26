const WEBHOOK_URL = "https://aviral15.app.n8n.cloud/webhook/bccb1a8d-9b2c-4a48-b093-f99a1e23e889";
const REQUEST_TIMEOUT_MS = 12000;
const MAX_TEXT_LENGTH = 5000;

const state = {
  selectedText: "",
  loading: false
};

const el = {
  statusBanner: document.getElementById("statusBanner"),
  selectedText: document.getElementById("selectedText"),
  checkBtn: document.getElementById("checkBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  loadingState: document.getElementById("loadingState"),
  results: document.getElementById("results"),
  overallRisk: document.getElementById("overallRisk"),
  flagsList: document.getElementById("flagsList"),
  summaryText: document.getElementById("summaryText"),
  ctaText: document.getElementById("ctaText")
};

function setBanner(type, text) {
  el.statusBanner.className = `banner ${type}`;
  el.statusBanner.textContent = text;
}

function truncateText(text, maxLength = 280) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateWebhookUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_error) {
    throw new Error("Webhook URL is invalid. Update WEBHOOK_URL in popup.js.");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Webhook URL must start with http:// or https://.");
  }
}

function normalizeResponse(data) {
  const safeData = data && typeof data === "object" ? data : {};
  const safeFlags = Array.isArray(safeData.flags) ? safeData.flags : [];

  const normalizedFlags = safeFlags.map((flag) => ({
    phrase: typeof flag?.phrase === "string" ? flag.phrase.trim() : "—",
    severity: typeof flag?.severity === "string" ? flag.severity.trim() : "Low",
    risk_type: typeof flag?.risk_type === "string" ? flag.risk_type.trim() : "—",
    reason: typeof flag?.reason === "string" ? flag.reason.trim() : "—",
    suggested_rewrite:
      typeof flag?.suggested_rewrite === "string" ? flag.suggested_rewrite.trim() : "—"
  }));

  return {
    overall_risk:
      typeof safeData.overall_risk === "string" && safeData.overall_risk.trim()
        ? safeData.overall_risk.trim()
        : "Unknown",
    flags: normalizedFlags,
    summary: typeof safeData.summary === "string" ? safeData.summary.trim() || "—" : "—",
    cta: typeof safeData.cta === "string" ? safeData.cta.trim() || "—" : "—"
  };
}

function severityClass(severity) {
  const normalized = String(severity ?? "").toLowerCase();
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("low")) return "low";
  return "low";
}

function setLoading(loading) {
  state.loading = loading;
  el.loadingState.classList.toggle("hidden", !loading);
  el.checkBtn.disabled = loading || !state.selectedText;
  el.refreshBtn.disabled = loading;
}

function clearResults() {
  el.results.classList.add("hidden");
  el.overallRisk.textContent = "-";
  el.flagsList.innerHTML = "";
  el.summaryText.textContent = "-";
  el.ctaText.textContent = "-";
}

function renderNoFlagsMessage() {
  const card = document.createElement("article");
  card.className = "flag-card";
  card.innerHTML = `<p class="muted">No specific flags returned.</p>`;
  el.flagsList.appendChild(card);
}

function attachCopyHandler(button, text) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = original;
      }, 1200);
    } catch (_err) {
      button.textContent = "Copy failed";
      setTimeout(() => {
        button.textContent = "Copy rewrite";
      }, 1200);
    }
  });
}

function renderFlag(flag) {
  const phrase = escapeHtml(flag?.phrase || "—");
  const severity = escapeHtml(flag?.severity || "Low");
  const riskType = escapeHtml(flag?.risk_type || "—");
  const reason = escapeHtml(flag?.reason || "—");
  const rewrite = escapeHtml(flag?.suggested_rewrite || "—");

  const card = document.createElement("article");
  card.className = "flag-card";
  card.innerHTML = `
    <div class="flag-top">
      <h3 class="flag-phrase">${phrase}</h3>
      <span class="badge ${severityClass(severity)}">${severity}</span>
    </div>
    <p class="meta"><span class="muted">Risk type:</span> ${riskType}</p>
    <p class="reason"><span class="muted">Reason:</span> ${reason}</p>
    <p class="rewrite"><span class="muted">Suggested rewrite:</span> ${rewrite}</p>
    <button class="copy-btn" type="button">Copy rewrite</button>
  `;

  const copyBtn = card.querySelector(".copy-btn");
  attachCopyHandler(copyBtn, flag?.suggested_rewrite || "");
  el.flagsList.appendChild(card);
}

function renderResults(data) {
  clearResults();
  el.results.classList.remove("hidden");

  el.overallRisk.textContent = String(data?.overall_risk || "Unknown");
  el.summaryText.textContent = String(data?.summary || "—");
  el.ctaText.textContent = String(data?.cta || "—");

  const flags = Array.isArray(data?.flags) ? data.flags : [];
  if (!flags.length) {
    renderNoFlagsMessage();
    return;
  }

  for (const flag of flags) {
    renderFlag(flag);
  }
}

function validateBeforeRequest(text) {
  if (!text) {
    throw new Error("Please highlight text on the page first.");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Selected text is too long. Limit is ${MAX_TEXT_LENGTH} characters.`);
  }
  if (WEBHOOK_URL.includes("REPLACE_WITH_YOUR_N8N_WEBHOOK_URL")) {
    throw new Error("Set your webhook URL in popup.js before running checks.");
  }
  validateWebhookUrl(WEBHOOK_URL);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendComplianceRequest(selectedText) {
  validateBeforeRequest(selectedText);

  const response = await fetchWithTimeout(
    WEBHOOK_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: selectedText })
    },
    REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}).`);
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch (_error) {
    throw new Error("Invalid JSON response from webhook.");
  }

  return normalizeResponse(parsed);
}

async function getSelectedTextFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("Could not identify active tab.");
  }

  const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTED_TEXT" });
  return String(response?.text || "").trim();
}

function syncSelectionUI() {
  const hasSelection = Boolean(state.selectedText);
  el.selectedText.textContent = hasSelection
    ? truncateText(state.selectedText, 340)
    : "No text selected yet.";
  el.checkBtn.disabled = !hasSelection || state.loading;

  if (!hasSelection) {
    setBanner("info", "Highlight text on the page, then click Refresh Selection.");
    clearResults();
  } else {
    setBanner("info", "Selection captured. Run Check Compliance when ready.");
  }
}

async function refreshSelection() {
  try {
    const text = await getSelectedTextFromActiveTab();
    state.selectedText = text;
    syncSelectionUI();
  } catch (_error) {
    state.selectedText = "";
    syncSelectionUI();
    setBanner("error", "Could not read page selection on this tab.");
  }
}

async function runComplianceCheck() {
  setLoading(true);
  setBanner("info", "Running compliance analysis...");

  try {
    const result = await sendComplianceRequest(state.selectedText);
    renderResults(result);
    setBanner("success", "Compliance analysis complete.");
  } catch (error) {
    clearResults();
    const message = String(error?.message || "");
    if (message === "Failed to fetch") {
      setBanner(
        "error",
        "Failed to fetch webhook. Check endpoint URL, webhook availability, and CORS settings."
      );
    } else if (message.includes("aborted")) {
      setBanner("error", "Request timed out. Check webhook latency and retry.");
    } else {
      setBanner("error", message || "Something went wrong.");
    }
  } finally {
    setLoading(false);
  }
}

el.refreshBtn.addEventListener("click", refreshSelection);
el.checkBtn.addEventListener("click", runComplianceCheck);

refreshSelection();
