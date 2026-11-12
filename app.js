
let signalFilter = "ALL";
let activePage = "Dashboard";
let trackingRefreshTimer = null;
let trackingTimeframe = "15m";

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
      <div class="card dashboard-active-card" onclick="show('Signals')" role="button" tabindex="0" aria-label="Open active signals">
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


async function loadDailyReport() {
  const main = document.querySelector("main");
  if (!main) return;

  main.innerHTML = `
    <div class="dashboard-heading">
      <div>
        <h3>Daily Report</h3>
        <small>CRYPTOSIGNAL46 performance summary</small>
      </div>
      <span class="live-indicator">● LIVE</span>
    </div>
    <div class="card"><strong>Loading report...</strong></div>
  `;

  try {
    const response = await fetch(`${API_BASE}/api/history`);
    if (!response.ok) throw new Error("History API error: " + response.status);

    const data = await response.json();
    const rows = dashboardRows(data, ["signals", "history", "data"]).map(mapApiSignal);
    window.CRYPTOSIGNAL46_HISTORY = rows;

    const todayKey = new Date().toISOString().slice(0, 10);
    const today = rows.filter(s => {
      const raw = s.createdAt;
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === todayKey;
    });

    const wins = today.filter(s => String(s.result || "").toUpperCase() === "WIN").length;
    const losses = today.filter(s => String(s.result || "").toUpperCase() === "LOSS").length;
    const breakeven = today.filter(s => {
      const r = String(s.result || "").toUpperCase();
      return r === "BREAKEVEN" || r === "BE";
    }).length;
    const decided = wins + losses;
    const winRate = decided ? (wins / decided * 100).toFixed(1) + "%" : "--";
    const tp1 = today.filter(s => String(s.exitReason || "").toUpperCase().includes("TP1")).length;
    const tp2 = today.filter(s => String(s.exitReason || "").toUpperCase().includes("TP2")).length;
    const tp3 = today.filter(s => String(s.exitReason || "").toUpperCase().includes("TP3")).length;

    main.innerHTML = `
      <div class="dashboard-heading">
        <div>
          <h3>Daily Report</h3>
          <small>${todayKey} • Closed signal performance</small>
        </div>
        <span class="live-indicator">● LIVE</span>
      </div>

      <div class="stats dashboard-stats">
        <div class="card"><small>SIGNALS</small><div class="number">${today.length}</div></div>
        <div class="card"><small>WIN RATE</small><div class="number green">${winRate}</div></div>
        <div class="card"><small>WINS</small><div class="number green">${wins}</div></div>
        <div class="card"><small>LOSSES</small><div class="number red">${losses}</div></div>
      </div>

      <div class="card">
        <h3>TP / SL Results</h3>
        <p>TP1: <strong class="green">${tp1}</strong></p>
        <p>TP2: <strong class="green">${tp2}</strong></p>
        <p>TP3: <strong class="green">${tp3}</strong></p>
        <p>Breakeven: <strong>${breakeven}</strong></p>
      </div>

      <div class="card">
        <h3>Summary</h3>
        <p>Closed today: <strong>${today.length}</strong></p>
        <p>Pending/other history rows: <strong>${Math.max(0, today.length - wins - losses - breakeven)}</strong></p>
        <button class="refresh-button" onclick="loadDailyReport()">↻ Refresh Report</button>
      </div>
    `;
  } catch (error) {
    console.error("Daily report loading failed:", error);
    main.innerHTML = `
      <h3>Daily Report</h3>
      <div class="card">
        <strong>Could not load daily report.</strong>
        <p><small>Please try again later.</small></p>
      </div>
    `;
  }
}



function okxInstId(symbol) {
  return String(symbol || "")
    .replace("/USDT:USDT", "-USDT-SWAP")
    .replace("/USDT", "-USDT")
    .replace("/", "-");
}

async function loadOKXCandles(symbol, bar = trackingTimeframe) {
  const instId = okxInstId(symbol);
  const url = "https://www.okx.com/api/v5/market/candles?instId="
    + encodeURIComponent(instId)
    + "&bar=" + encodeURIComponent(bar)
    + "&limit=60";

  const response = await fetch(url);
  if (!response.ok) throw new Error("OKX candles error: " + response.status);

  const data = await response.json();
  if (data.code !== "0" || !Array.isArray(data.data)) {
    throw new Error("OKX candles unavailable");
  }

  return data.data.reverse().map(row => ({
    ts: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4])
  })).filter(c => [c.open,c.high,c.low,c.close].every(Number.isFinite));
}

function drawTrackingChart(canvas, candles, signal) {
  if (!canvas || !candles.length) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(300, Math.floor(rect.width));
  const height = 260;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = height + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const pad = { left: 48, right: 12, top: 18, bottom: 28 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const levels = [
    { value: Number(signal.sl), label: "SL", cls: "sl" },
    { value: Number(signal.entry ?? signal.entryLow), label: "ENTRY", cls: "entry" },
    { value: Number(signal.tp1), label: "TP1", cls: "tp" },
    { value: Number(signal.tp2), label: "TP2", cls: "tp" },
    { value: Number(signal.tp3), label: "TP3", cls: "tp" }
  ].filter(x => Number.isFinite(x.value));

  const values = candles.flatMap(c => [c.high, c.low]).concat(levels.map(x => x.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, Math.abs(max) * 0.001, 0.000001);
  const lo = min - range * 0.08;
  const hi = max + range * 0.08;

  const y = price => pad.top + ((hi - price) / (hi - lo)) * plotH;
  const x = i => pad.left + (i + 0.5) * (plotW / candles.length);

  ctx.fillStyle = "#0b1320";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(148,163,184,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const gy = pad.top + (plotH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(width - pad.right, gy);
    ctx.stroke();
  }

  ctx.font = "10px Arial";
  ctx.fillStyle = "#8290a3";
  for (let i = 0; i < 4; i++) {
    const p = hi - ((hi - lo) / 3) * i;
    ctx.fillText(p >= 1 ? p.toFixed(2) : p.toPrecision(4), 5, pad.top + (plotH / 3) * i + 4);
  }

  const candleW = Math.max(2, Math.min(10, (plotW / candles.length) * 0.62));

  candles.forEach((c, i) => {
    const cx = x(i);
    const up = c.close >= c.open;
    const bodyTop = y(Math.max(c.open, c.close));
    const bodyBottom = y(Math.min(c.open, c.close));
    const bodyH = Math.max(1.5, bodyBottom - bodyTop);

    ctx.strokeStyle = up ? "#36e6a0" : "#ff6577";
    ctx.fillStyle = up ? "#36e6a0" : "#ff6577";

    ctx.beginPath();
    ctx.moveTo(cx, y(c.high));
    ctx.lineTo(cx, y(c.low));
    ctx.stroke();

    ctx.fillRect(cx - candleW / 2, bodyTop, candleW, bodyH);
  });

  levels.forEach(level => {
    const yy = y(level.value);
    ctx.setLineDash(level.cls === "entry" ? [5,4] : [3,4]);
    ctx.strokeStyle = level.cls === "sl" ? "#ff6577" : level.cls === "entry" ? "#f5c542" : "#36e6a0";
    ctx.lineWidth = level.cls === "entry" ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 9px Arial";
    ctx.fillText(level.label, width - pad.right - 30, yy - 3);
  });

  const last = candles[candles.length - 1];
  const currentY = y(last.close);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x(candles.length - 1), currentY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8290a3";
  ctx.font = "10px Arial";
  ctx.fillText(trackingTimeframe.toUpperCase(), pad.left, height - 9);
  ctx.fillText("OKX", width - 36, height - 9);
}

async function renderTrackingCharts(active) {
  await Promise.all(active.map(async signal => {
    const canvas = document.getElementById("tracking-chart-" + signal.id);
    if (!canvas) return;

    try {
      const candles = await loadOKXCandles(signal.symbol, trackingTimeframe);
      drawTrackingChart(canvas, candles, signal);
    } catch (error) {
      console.error("Chart failed:", signal.symbol, error);
      const ctx = canvas.getContext("2d");
      const width = canvas.clientWidth || 300;
      canvas.width = width;
      canvas.height = 260;
      ctx.fillStyle = "#0b1320";
      ctx.fillRect(0, 0, width, 260);
      ctx.fillStyle = "#8290a3";
      ctx.font = "12px Arial";
      ctx.fillText("Chart unavailable", 20, 35);
    }
  }));
}

async function loadLiveTracking(timeframe = trackingTimeframe) {
  trackingTimeframe = timeframe;
  const main = document.querySelector("main");
  if (!main) return;

  main.innerHTML = `
    <div class="dashboard-heading">
      <div>
        <h3>Live TP / SL Tracking</h3>
        <small>Current OKX price vs Entry / TP / SL</small>
      </div>
      <span class="live-indicator">● LIVE</span>
    </div>
    <div class="card"><strong>Loading live tracking...</strong></div>
  `;

  try {
    const [signalsResponse, pricesResponse] = await Promise.all([
      fetch(`${API_BASE}/api/signals`),
      fetch(`${API_BASE}/api/prices`)
    ]);

    if (!signalsResponse.ok) throw new Error("Signals API error: " + signalsResponse.status);
    if (!pricesResponse.ok) throw new Error("Prices API error: " + pricesResponse.status);

    const [signalsData, pricesData] = await Promise.all([
      signalsResponse.json(),
      pricesResponse.json()
    ]);

    const rows = dashboardRows(signalsData, ["signals", "data"]).map(mapApiSignal);
    const prices = pricesData.prices || {};
    window.CRYPTOSIGNAL46_SIGNALS = rows;

    const active = rows.filter(s =>
      ["OPEN", "PENDING"].includes(String(s.status || "").toUpperCase())
    );

    function n(v) {
      const x = Number(v);
      return Number.isFinite(x) ? x : null;
    }

    function fmt(v) {
      const x = n(v);
      if (x === null) return "-";
      if (Math.abs(x) >= 1000) return x.toFixed(2);
      if (Math.abs(x) >= 1) return x.toFixed(4);
      return x.toPrecision(5);
    }

    function tracking(s) {
      const current = n(prices[s.symbol]?.price);
      const entry = n(s.entry ?? s.entryLow);
      const tp1 = n(s.tp1);
      const tp2 = n(s.tp2);
      const tp3 = n(s.tp3);
      const sl = n(s.sl);
      const side = String(s.side || "").toUpperCase();

      if (current === null) {
        return { current: "-", progress: 0, label: "Price unavailable", stateClass: "" };
      }

      let progress = 0;
      let label = "Tracking";
      let stateClass = "";

      if (side === "LONG" && entry !== null && tp3 !== null && tp3 !== entry) {
        progress = ((current - entry) / (tp3 - entry)) * 100;
        if (sl !== null && current <= sl) {
          label = "At / through SL";
          stateClass = "tracking-danger";
        } else if (tp3 !== null && current >= tp3) {
          label = "At / through TP3";
          stateClass = "tracking-target";
        } else if (tp2 !== null && current >= tp2) {
          label = "At / through TP2";
          stateClass = "tracking-target";
        } else if (tp1 !== null && current >= tp1) {
          label = "At / through TP1";
          stateClass = "tracking-target";
        } else {
          label = current >= entry ? "Above Entry" : "Below Entry";
        }
      } else if (side === "SHORT" && entry !== null && tp3 !== null && tp3 !== entry) {
        progress = ((entry - current) / (entry - tp3)) * 100;
        if (sl !== null && current >= sl) {
          label = "At / through SL";
          stateClass = "tracking-danger";
        } else if (current <= tp3) {
          label = "At / through TP3";
          stateClass = "tracking-target";
        } else if (tp2 !== null && current <= tp2) {
          label = "At / through TP2";
          stateClass = "tracking-target";
        } else if (tp1 !== null && current <= tp1) {
          label = "At / through TP1";
          stateClass = "tracking-target";
        } else {
          label = current <= entry ? "Below Entry" : "Above Entry";
        }
      }

      progress = Math.max(0, Math.min(100, progress));
      return { current: fmt(current), progress, label, stateClass };
    }

    main.innerHTML = `
      <div class="dashboard-heading">
        <div>
          <h3>Live TP / SL Tracking</h3>
          <small>${active.length} active signals • OKX live price</small>
        </div>
        <span class="live-indicator">● LIVE</span>
      </div>

      ${active.length ? active.map(s => {
        const t = tracking(s);
        return `
          <div class="card signal-card">
            <div class="signal">
              <h3 class="${s.side === "LONG" ? "green" : "red"}">
                ${dashboardEscape(s.side)} - ${dashboardEscape(s.symbol)}
              </h3>
              <span class="tag ${s.side === "SHORT" ? "short-tag" : ""}">
                ${dashboardEscape(s.status || "PENDING")}
              </span>
            </div>

            <div class="live-price-box">
              <small>LIVE PRICE</small>
              <div class="live-price">${dashboardEscape(t.current)}</div>
              <strong class="${t.stateClass}">${dashboardEscape(t.label)}</strong>
            </div>

            <div class="chart-card">
              <div class="chart-top">
                <strong>LIVE MARKET</strong>
                <div class="chart-timeframes">
                  <button class="${trackingTimeframe === "15m" ? "active" : ""}" onclick="loadLiveTracking('15m')">15M</button>
                  <button class="${trackingTimeframe === "1H" ? "active" : ""}" onclick="loadLiveTracking('1H')">1H</button>
                </div>
              </div>
              <canvas id="tracking-chart-${dashboardEscape(s.id)}" class="tracking-chart"></canvas>
              <div class="chart-note">OKX candles • live market view</div>
            </div>

            <div class="tracking-levels">
              <span>Entry <b>${dashboardEscape(fmt(s.entry ?? s.entryLow))}</b></span>
              <span>SL <b class="red">${dashboardEscape(fmt(s.sl))}</b></span>
              <span>TP1 <b class="green">${dashboardEscape(fmt(s.tp1))}</b></span>
              <span>TP2 <b class="green">${dashboardEscape(fmt(s.tp2))}</b></span>
              <span>TP3 <b class="green">${dashboardEscape(fmt(s.tp3))}</b></span>
            </div>

            <div class="tracking-bar">
              <div class="tracking-label">
                <span>Entry</span>
                <span>TP3</span>
              </div>
              <div class="tracking-track">
                <div class="tracking-fill ${t.stateClass}" style="width:${t.progress.toFixed(1)}%"></div>
              </div>
              <div class="tracking-percent">${t.progress.toFixed(1)}%</div>
            </div>

            <button class="refresh-button" onclick="openSignalDetails('${dashboardEscape(s.id)}')">
              Open Details
            </button>
          </div>
        `;
      }).join("") : `
        <div class="card">
          <strong>No active signals</strong>
          <p>Waiting for new signals.</p>
        </div>
      `}

      <div class="card">
        <small>Live prices and candles are read from OKX. This screen shows current market position; it does not place or modify orders.</small>
      </div>
    `;

    await renderTrackingCharts(active);

  } catch (error) {
    console.error("Live tracking failed:", error);
    main.innerHTML = `
      <div class="card">
        <strong>Could not load live tracking.</strong>
        <p><small>${dashboardEscape(error.message)}</small></p>
        <button class="refresh-button" onclick="loadLiveTracking()">↻ Retry</button>
      </div>
    `;
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

  if (page === "Report") {
    loadDailyReport();
    return;
  }

  if (page === "Tracking") {
    loadLiveTracking();
    if (trackingRefreshTimer) clearInterval(trackingRefreshTimer);
    trackingRefreshTimer = setInterval(() => {
      if (activePage === "Tracking") loadLiveTracking();
    }, 15000);
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
      <p>Score: <strong>${dashboardEscape(signal.score ?? "-")}</strong></p>
      <div class="card tp-plan">
        <h3>TP / SL Management</h3>
        <p>TP1 → secure 25% and move SL to TP1.</p>
        <p>TP2 → keep remaining 75% open.</p>
        <p>TP3 → final target for the remaining position.</p>
      </div>
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
