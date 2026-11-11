
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
      <h3>Live Signals</h3>
      <div class="card">
        <p class="green">LONG / SHORT</p>
        <p>Waiting for VPS connection</p>
      </div>
    `;
    return;
  }

  if (page === "History") {
    main.innerHTML = `
      <h3>Signal History</h3>
      <div class="card">
        <p>History will appear after VPS connection.</p>
      </div>
    `;
  }
}

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

  // TP1: Close 25%, keep 75%
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

  // After TP1, SL moves to TP1 price
  const protectedProfit =
    tp1PartialProfit + priceProfit(tp1, remainingQty);

  // Initial SL before TP1
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
