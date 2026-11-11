
let signalFilter = "ALL";

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
    createdAt: s.created_at ?? s.createdAt
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

function show(page) {
  const main = document.querySelector("main");

  if (page === "Dashboard") {
    location.reload();
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
      <h3>CRYPTOSIGNAL46 Signals</h3>

      <div class="card">
        <p><strong>Signal Center</strong></p>
        <p>Market: OKX USDT Perpetual</p>
        <p id="signalCount">0 Signals</p>

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

// Load signals automatically when the app opens.
window.addEventListener("load", () => {
  loadCryptoSignals();

  // Refresh signals every 15 minutes.
  setInterval(loadCryptoSignals, 15 * 60 * 1000);
});
