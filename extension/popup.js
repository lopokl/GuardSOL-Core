// ====== Settings ======
const API_BASE = "https://api.guard-sol.com"; // change if your backend runs elsewhere
const SAMPLE = [
  "B8Y1dERnVNoUUXeXA4NaCHiB9htcukMSkfHrFsTMHA7h",
  "MszS2N8CT1MV9byX8FKFnrUpkmASSeR5Fmji19ushw1",
  "3RH44Pfx9GtN8ZWoSdWHoxH7HqXAC7V3YcqkX3kDf8J4",
];

// ====== UI element ======
const addressInput = document.getElementById("addressInput");
const checkBtn = document.getElementById("checkBtn");
const runSampleBtn = document.getElementById("runSampleBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const resultDiv = document.getElementById("result");
const debugDiv = document.getElementById("debug");
const historyDiv = document.getElementById("history");
const useLocalCb = document.getElementById("useLocalCb");
const useGoplusCb = document.getElementById("useGoplusCb");
const riskBadge = document.getElementById("riskBadge");

const HISTORY_KEY = "solana_check_history_v1";

// ====== History helpers (local UI history) ======
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 200)));
}
function pushHistory(item) {
  const h = loadHistory();
  h.unshift(item);
  saveHistory(h);
  renderHistory();
}
function renderHistory() {
  const items = loadHistory();
  historyDiv.innerHTML = "";
  if (!items.length) {
    historyDiv.textContent = "No history yet.";
    return;
  }
  for (const it of items) {
    const div = document.createElement("div");
    div.className = "hist-item";
    div.innerHTML = `<div><strong>${it.address}</strong> — ${new Date(it.ts).toLocaleString()}</div><div style="font-size:12px;color:#666">${it.summary}</div>`;
    div.addEventListener("click", () => {
      resultDiv.textContent = `Деталі для ${it.address}\n\n${JSON.stringify(it.details, null, 2)}`;
      debugDiv.textContent = it.errors?.length
        ? "Errors:\n" + it.errors.join("\n")
        : "";
    });
    historyDiv.appendChild(div);
  }
}

// ====== Utils ======
function isLikelySolanaAddress(a) {
  return typeof a === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a || "");
}
function setRiskBadge(label, score) {
  riskBadge.textContent = `${label} (${score})`;
  riskBadge.className =
    "badge " +
    (label === "High"
      ? "badge-high"
      : label === "Medium"
        ? "badge-med"
        : "badge-low");
}

// ====== Call backend ======
async function checkViaBackend(address, useGoPlus) {
  try {
    const res = await fetch(`${API_BASE}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, useGoPlus }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ====== Main check handler ======
async function handleCheck(address) {
  if (!address) {
    resultDiv.textContent = "Enter the address.";
    return;
  }
  resultDiv.textContent = `Checking ${address}...`;
  debugDiv.textContent = "";

  const useGoPlus = !!useGoplusCb?.checked;
  const data = await checkViaBackend(address, useGoPlus);

  if (!data || !data.ok) {
    resultDiv.textContent = `Error: ${data?.error || "The server did not respond."}`;
    debugDiv.textContent = data?.error ? data.error : "";
    console.error("Check error", data);
    return;
  }

  // Update UI
  setRiskBadge(data.risk.label, data.risk.score);
  resultDiv.textContent =
    `Address: ${data.address}\nResult: ${data.summary}\n\n=== Details ===\n` +
    `${JSON.stringify(data.details, null, 2)}`;

  debugDiv.textContent = "";
  pushHistory({
    ts: Date.now(),
    address: data.address,
    summary: data.summary,
    details: data.details,
    errors: data.errors || [],
  });
}

// ====== UI wiring ======
checkBtn.addEventListener("click", async () => {
  const addr = addressInput.value.trim();
  if (!isLikelySolanaAddress(addr)) {
    resultDiv.textContent =
      "Warning: The address does not look like Solana. Check the input.";
  }
  await handleCheck(addr);
});

runSampleBtn.addEventListener("click", async () => {
  resultDiv.textContent = "Running a test suite...";
  for (let i = 0; i < SAMPLE.length; i++) {
    const addr = SAMPLE[i];
    resultDiv.textContent = `Test ${i + 1}/${SAMPLE.length}: ${addr}`;
    await handleCheck(addr);
    await new Promise((r) => setTimeout(r, 700));
  }
  resultDiv.textContent = "Test set completed.";
});

clearHistoryBtn.addEventListener("click", () => {
  if (!confirm("Clear history?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  resultDiv.textContent = "History cleared.";
  debugDiv.textContent = "";
});

// init
renderHistory();
