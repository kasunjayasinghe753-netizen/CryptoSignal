
let signalFilter = "ALL";
let activePage = "Dashboard";

const API_BASE = "https://187.55.163.68";

window.CRYPTOSIGNAL46_SIGNALS = [];
window.CRYPTOSIGNAL46_HISTORY = [];

function mapApiSignal(s) {
  return {
    id: s.id,
    symbol: s.symbol,
    side: s.side,
    entryType: s.entry_type ?? s.entryType,
    entry: s.entry,
    entryLow: s.entry_low ?? s.entryLow,
    entryHigh: s.entry_high ?? s.entryHigh,
    sl: s.sl ?? s.stop_loss ?? s.stopLoss,
    tp1: s.tp1,
    tp2: s.tp2,
    tp3: s.tp3,
    status: s.status,
    createdAt: s.created_at ?? s.createdAt,
    result: s.result,
    exitReason: s.exit_reason ?? s.exitReason,
    score: s.score
  };
}

async function loadCryptoSignals() {
  try {
    const response = await fetch(`${API_BASE}/api/signals`);

    if (!response.ok) {
      throw new Error("Signals API error: " + response.status);
    }

    const data = await response.json();

    const rows = Array.isArray(data)
      ? data
      : (data.signals || data.data || []);

    window.updateCryptoSignals(rows.map(mapApiSignal));

    console.log("CRYPTOSIGNAL46: Signals updated", rows.length);

  } catch (error) {
    console.error("Signal loading failed:", error);
  }
}

async function loadSignalHistory() {
  const main = document.querySelector("main");

  main.innerHTML = `
    <h3>Signal History</h3>
    <div class="card">Loading history...</div>
  `;

  try {
    const response = await fetch(`${API_BASE}/api/history`);

    if (!response.ok) {
      throw new Error("History API error: " + response.status);
    }

    const data = await response.json();

    const rows = Array.isArray(data)
      ? data
      : (data.signals || data.history || data.data || []);

    const history = rows.map(mapApiSignal);

    window.CRYPTOSIGNAL46_HISTORY = history;

    if (history.length === 0) {
      main.innerHTML = `
        <h3>Signal History</h3>
        <div class="card">
          <h3>No Closed Signals Yet</h3>
          <p>Closed signals will appear here.</p>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <h3>Signal History</h3>

      <div class="card">
        <p>Total Closed Signals: <strong>${history.length}</strong></p>
      </div>

      ${history.map(signal => `
        <div class="card signal-card">

          <h3 class="${signal.side === "LONG" ? "green" : "red"}">
            ${signal.side || "-"} - ${signal.symbol || "-"}
          </h3>

          <p>Entry Type: ${signal.entryType || "-"}</p>
          <p>Entry: ${signal.entry ?? "-"}</p>
          <p>Entry Zone: ${signal.entryLow ?? "-"} - ${signal.entryHigh ?? "-"}</p>

          <p class="red">Stop Loss: ${signal.sl ?? "-"}</p>

          <p class="green">TP1: ${signal.tp1 ?? "-"}</p>
          <p class="green">TP2: ${signal.tp2 ?? "-"}</p>
          <p class="green">TP3: ${signal.tp3 ?? "-"}</p>

          <hr>

          <p>Status: <strong>${signal.status || "CLOSED"}</strong></p>
          <small>${signal.createdAt || ""}</small>

        </div>
      `).join("")}
    `;

  } catch (error) {
    console.error("History loading failed:", error);

    main.innerHTML = `
      <h3>Signal History</h3>
      <div class="card">
        <p>Could not load history.</p>
        <p>Please try again later.</p>
      </div>
    `;
  }
}


function dashboardRows(data, fallbackKeys) {
  if (Array.isArray(data)) return data;
  for (const key of fallbackKeys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function dashboardEscape(value) {
  return String(value ?? "-").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

function renderDashboard(signals = window.CRYPTOSIGNAL46_SIGNALS || [],
                         history = window.CRYPTOSIGNAL46_HISTORY || []) {
  if (activePage !== "Dashboard") return;

  const main = document.querySelector("main");
  if (!main) return;

  const active = signals.filter(s => ["OPEN", "PENDING"].includes(String(s.status || "").toUpperCase()));
  const closed = history.length;
  const wins = history.filter(s =>
    String(s.result || "").toUpperCase() === "WIN"
  ).length;
  const losses = history.filter(s =>
    String(s.result || "").toUpperCase() === "LOSS"
  ).length;
  const decided = wins + losses;
  const winRate = decided ? (wins / decided * 100).toFixed(1) + "%" : "--";
  const total = active.length + closed;

  const latest = [...signals].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 5);

  main.innerHTML = `
    <div class="dashboard-heading">
      <div>
        <h3>Home Dashboard</h3>
        <small>Live OKX USDT Perpetual signals</small>
      </div>
      <span class="live-indicator">● LIVE</span>
    </div>

    <div class="stats dashboard-stats">
      <div class="card">
        <small>TOTAL SIGNALS</small>
        <div class="number">${total}</div>
      </div>
      <div class="card">
        <small>ACTIVE SIGNALS</small>
        <div class="number green">${active.length}</div>
      </div>
      <div class="card">
        <small>WIN RATE</small>
        <div class="number">${winRate}</div>
        <small>${wins} wins / ${losses} losses</small>
      </div>
      <div class="card">
        <small>CLOSED SIGNALS</small>
        <div class="number">${closed}</div>
      </div>
    </div>

    <div class="dashboard-section-title">
      <h3>Latest Signals</h3>
      <small>Refreshes every 30 seconds</small>
    </div>

    ${latest.length ? latest.map(signal => {
      const side = String(signal.side || "").toUpperCase();
      const status = String(signal.status || "PENDING").toUpperCase();
      const entry = signal.entry ?? (
        signal.entryLow != null || signal.entryHigh != null
          ? `${signal.entryLow ?? "-"} – ${signal.entryHigh ?? "-"}`
          : "-"
      );
      return `
        <div class="card dashboard-signal-card" data-signal-id="${dashboardEscape(signal.id)}" role="button" tabindex="0">
          <div class="signal">
            <strong>${dashboardEscape(signal.symbol)}</strong>
            <span class="tag ${side === "SHORT" ? "short-tag" : ""}">${dashboardEscape(side)}</span>
          </div>
          <div class="dashboard-signal-meta">
            <span>Status: <strong>${dashboardEscape(status)}</strong></span>
            <span>Entry: <strong>${dashboardEscape(entry)}</strong></span>
          </div>
          <div class="dashboard-levels">
            <span>SL <b class="red">${dashboardEscape(signal.sl)}</b></span>
            <span>TP1 <b class="green">${dashboardEscape(signal.tp1)}</b></span>
            <span>TP2 <b class="green">${dashboardEscape(signal.tp2)}</b></span>
            <span>TP3 <b class="green">${dashboardEscape(signal.tp3)}</b></span>
          </div>
        </div>
      `;
    }).join("") : `
      <div class="card">
        <strong>No active signals</strong>
        <p><small>New signals will appear here when the bot publishes them.</small></p>
      </div>
    `}
  `;
}

async function loadDashboardData() {
  try {
    const [signalsResponse, historyResponse] = await Promise.all([
      fetch(`${API_BASE}/api/signals`),
      fetch(`${API_BASE}/api/history`)
    ]);

    if (!signalsResponse.ok) throw new Error("Signals API error: " + signalsResponse.status);
    if (!historyResponse.ok) throw new Error("History API error: " + historyResponse.status);

    const [signalsData, historyData] = await Promise.all([
      signalsResponse.json(),
      historyResponse.json()
    ]);

    const signalRows = dashboardRows(signalsData, ["signals", "data"]);
    const historyRows = dashboardRows(historyData, ["signals", "history", "data"]);

    window.CRYPTOSIGNAL46_SIGNALS = signalRows.map(mapApiSignal);
    window.CRYPTOSIGNAL46_HISTORY = historyRows.map(mapApiSignal);

    renderSignals(window.CRYPTOSIGNAL46_SIGNALS);
    renderDashboard();
    console.log("CRYPTOSIGNAL46: Dashboard updated", {
      active: signalRows.length,
      closed: historyRows.length
    });
  } catch (error) {
    console.error("Dashboard loading failed:", error);
    if (activePage === "Dashboard") {
      const main = document.querySelector("main");
      if (main) main.innerHTML = `
        <h3>Home Dashboard</h3>
        <div class="card">
          <strong>Could not connect to VPS</strong>
          <p><small>Dashboard data will be retried automatically.</small></p>
        </div>
      `;
    }
  }
}

function show(page) {
  activePage = page;
  const main = document.querySelector("main");

  if (page === "Dashboard") {
    renderDashboard();
    loadDashboardData();
    return;
  }

  if (page === "Calculator") {
    main.innerHTML = `
      <h3>TP / SL Management Calculator</h3>

      <div class="card">
        <label>Margin (USDT)</label>
        <input id="margin" type="number" placeholder="20">

        <label>Leverage (X)</label>
        <input id="leverage" type="number" value="20">

        <label>Position</label>
        <select id="side">
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>

        <label>Entry Price</label>
        <input id="entry" type="number" placeholder="100">

        <label>Stop Loss</label>
        <input id="sl" type="number" placeholder="98">

        <label>Take Profit 1</label>
        <input id="tp1" type="number" placeholder="103">

        <label>Take Profit 2</label>
        <input id="tp2" type="number" placeholder="105">

        <label>Take Profit 3</label>
        <input id="tp3" type="number" placeholder="107">

        <button onclick="calculate()">CALCULATE</button>

        <div id="result"></div>
      </div>
    `;
    return;
  }

  if (page === "Signals") {
    main.innerHTML = `
      <div class="dashboard-heading">
        <div>
          <h3>Active Signals</h3>
          <small>Live OPEN / PENDING signals from CRYPTOSIGNAL46</small>
        </div>
        <span class="live-indicator">● LIVE</span>
      </div>

      <div class="card active-signal-summary">
        <div class="active-signal-top">
          <div>
            <strong id="signalCount">0 Active Signals</strong>
            <p class="muted">Market: OKX USDT Perpetual</p>
          </div>
          <button class="refresh-button" onclick="loadCryptoSignals()">↻ Refresh</button>
        </div>

        <div class="signal-filters">
          <button onclick="setSignalFilter('ALL')">ALL</button>
          <button onclick="setSignalFilter('LONG')">LONG</button>
          <button onclick="setSignalFilter('SHORT')">SHORT</button>
        </div>
      </div>

      <div id="signalList"></div>
    `;

    renderSignals(window.CRYPTOSIGNAL46_SIGNALS || []);
    loadCryptoSignals();
    return;
  }

  if (page === "History") {
    loadSignalHistory();
    return;
  }
}

function openSignalDetails(signalId) {
  const signal = (window.CRYPTOSIGNAL46_SIGNALS || []).find(s => String(s.id) === String(signalId));
  if (!signal) return;

  activePage = "Signals";
  const main = document.querySelector("main");
  if (!main) return;

  const side = String(signal.side || "").toUpperCase();
  const sideClass = side === "LONG" ? "green" : "red";
  const status = String(signal.status || "PENDING").toUpperCase();
  const entry = signal.entry != null ? signal.entry : `${signal.entryLow ?? "-"} - ${signal.entryHigh ?? "-"}`;

  main.innerHTML = `
    <div class="dashboard-heading">
      <div><h3>Signal Details</h3><small>CRYPTOSIGNAL46 Active Signal</small></div>
      <span class="live-indicator">● LIVE</span>
    </div>
    <div class="card signal-card signal-detail-card">
      <div class="signal">
        <h3 class="${sideClass}">${dashboardEscape(side)} - ${dashboardEscape(signal.symbol)}</h3>
        <span class="tag ${side === "SHORT" ? "short-tag" : ""}">${dashboardEscape(status)}</span>
      </div>
      <p>Entry Type: <strong>${dashboardEscape(signal.entryType)}</strong></p>
      <p>Entry / Zone: <strong>${dashboardEscape(entry)}</strong></p>
      <div class="dashboard-levels">
        <span>SL <b class="red">${dashboardEscape(signal.sl)}</b></span>
        <span>TP1 <b class="green">${dashboardEscape(signal.tp1)}</b></span>
        <span>TP2 <b class="green">${dashboardEscape(signal.tp2)}</b></span>
        <span>TP3 <b class="green">${dashboardEscape(signal.tp3)}</b></span>
      </div>
      <hr>
      <p>Signal ID: <strong>${dashboardEscape(signal.id)}</strong></p>
      <small>${dashboardEscape(signal.createdAt)}</small>
    </div>
    <button class="back-button" onclick="show('Dashboard')">← Back to Home</button>
  `;
}
function setSignalFilter(filter) {
  signalFilter = filter;
  renderSignals(window.CRYPTOSIGNAL46_SIGNALS || []);
}

function renderSignals(signals) {
  const list = document.getElementById("signalList");
  const count = document.getElementById("signalCount");

  if (!list) return;

  const filtered = signals.filter(signal =>
    signalFilter === "ALL" || signal.side === signalFilter
  );

  if (count) {
    count.textContent = filtered.length + " Signals";
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="card">
        <h3>No Signals Yet</h3>
        <p>Waiting for VPS connection...</p>
        <p>LONG and SHORT signals will appear here.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(signal => {
    const sideClass = signal.side === "LONG" ? "green" : "red";

    const entry = signal.entry !== undefined && signal.entry !== null
      ? signal.entry
      : `${signal.entryLow ?? "-"} - ${signal.entryHigh ?? "-"}`;

    return `
      <div class="card signal-card">

        <h3 class="${sideClass}">
          ${signal.side} - ${signal.symbol}
        </h3>

        <p>Entry Type: <strong>${signal.entryType || "-"}</strong></p>
        <p>Entry Zone: ${entry}</p>

        <p class="red">Stop Loss: ${signal.sl ?? "-"}</p>

        <p class="green">TP1: ${signal.tp1 ?? "-"}</p>
        <p class="green">TP2: ${signal.tp2 ?? "-"}</p>
        <p class="green">TP3: ${signal.tp3 ?? "-"}</p>

        <hr>

        <p>Status: <strong>${signal.status || "PENDING"}</strong></p>
        <small>${signal.createdAt || ""}</small>

      </div>
    `;
  }).join("");
}

window.updateCryptoSignals = function(signals) {
  window.CRYPTOSIGNAL46_SIGNALS = signals;
  renderSignals(signals);
  renderDashboard();
};

function calculate() {
  const margin = Number(document.getElementById("margin").value);
  const leverage = Number(document.getElementById("leverage").value);
  const entry = Number(document.getElementById("entry").value);
  const sl = Number(document.getElementById("sl").value);
  const tp1 = Number(document.getElementById("tp1").value);
  const tp2 = Number(document.getElementById("tp2").value);
  const tp3 = Number(document.getElementById("tp3").value);
  const side = document.getElementById("side").value;

  const values = [margin, leverage, entry, sl, tp1, tp2, tp3];

  if (values.some(v => !Number.isFinite(v) || v <= 0)) {
    alert("Please enter all valid positive numbers.");
    return;
  }

  if (side === "LONG" &&
      !(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
    alert("LONG: SL < Entry < TP1 < TP2 < TP3");
    return;
  }

  if (side === "SHORT" &&
      !(sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3)) {
    alert("SHORT: SL > Entry > TP1 > TP2 > TP3");
    return;
  }

  const position = margin * leverage;
  const quantity = position / entry;

  const closePercent = 0.25;
  const remainingPercent = 0.75;

  function priceProfit(price, qty) {
    return side === "LONG"
      ? qty * (price - entry)
      : qty * (entry - price);
  }

  const closedQty = quantity * closePercent;
  const remainingQty = quantity * remainingPercent;

  const tp1PartialProfit = priceProfit(tp1, closedQty);

  const tp2Total =
    tp1PartialProfit + priceProfit(tp2, remainingQty);

  const tp3Total =
    tp1PartialProfit + priceProfit(tp3, remainingQty);

  const protectedProfit =
    tp1PartialProfit + priceProfit(tp1, remainingQty);

  const initialLoss = priceProfit(sl, quantity);

  const fmt = n => n.toFixed(2);
  const roi = n => (n / margin * 100).toFixed(2) + "%";

  const rr = n => Math.abs(initialLoss) > 0
    ? (n / Math.abs(initialLoss)).toFixed(2) + "R"
    : "N/A";

  const color = n => n >= 0 ? "green" : "red";

  document.getElementById("result").innerHTML = `
    <hr>
    <h3>Position Details</h3>
    <p>Position Size: ${fmt(position)} USDT</p>
    <p>Quantity: ${quantity.toFixed(6)}</p>

    <hr>
    <h3 class="green">TP1 MANAGEMENT</h3>
    <p>TP1 Price: ${tp1}</p>
    <p>Close: 25% (${closedQty.toFixed(6)})</p>
    <p>TP1 Realized Profit:
      <strong class="green">${fmt(tp1PartialProfit)} USDT</strong>
    </p>
    <p>Remaining Position: 75% (${remainingQty.toFixed(6)})</p>
    <p>New Stop Loss: ${tp1}</p>

    <hr>
    <h3>AFTER TP1 RESULTS</h3>

    <p>TP1 Hit → SL Hit at TP1:</p>
    <strong class="green">${fmt(protectedProfit)} USDT</strong>
    <p>ROI: ${roi(protectedProfit)}</p>

    <hr>
    <p>TP2 Hit → Total Profit:</p>
    <strong class="${color(tp2Total)}">${fmt(tp2Total)} USDT</strong>
    <p>ROI: ${roi(tp2Total)}</p>
    <p>Risk/Reward: ${rr(tp2Total)}</p>

    <hr>
    <p>TP3 Hit → Total Profit:</p>
    <strong class="${color(tp3Total)}">${fmt(tp3Total)} USDT</strong>
    <p>ROI: ${roi(tp3Total)}</p>
    <p>Risk/Reward: ${rr(tp3Total)}</p>

    <hr>
    <h3 class="red">BEFORE TP1</h3>
    <p>Initial Stop Loss: ${sl}</p>
    <strong class="red">${fmt(initialLoss)} USDT</strong>
    <p>ROI: ${roi(initialLoss)}</p>

    <hr>
    <small>
      Assumes 25% closes at TP1 and remaining 75% closes
      at TP2, TP3 or the moved SL at TP1.
      Fees, funding and slippage are excluded.
      Calculation only; it does not modify exchange orders.
    </small>
  `;
}

// Handle Home signal-card taps with event delegation.
// This avoids relying on inline onclick handlers, which can be blocked by browser/CSP rules.
document.addEventListener("click", event => {
  const card = event.target.closest(".dashboard-signal-card");
  if (!card) return;
  const signalId = card.getAttribute("data-signal-id");
  if (signalId) openSignalDetails(signalId);
});

document.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".dashboard-signal-card");
  if (!card) return;
  event.preventDefault();
  const signalId = card.getAttribute("data-signal-id");
  if (signalId) openSignalDetails(signalId);
});

// Load the live dashboard when the app opens and refresh it every 30 seconds.
window.addEventListener("load", () => {
  loadDashboardData();
  setInterval(loadDashboardData, 30 * 1000);
});
