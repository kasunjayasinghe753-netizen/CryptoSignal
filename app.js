
function show(page) {
  const main = document.querySelector("main");

  if (page === "Dashboard") {
    location.reload();
    return;
  }

  if (page === "Calculator") {
    main.innerHTML = `
      <h3>TP / SL Profit Calculator</h3>

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

  if (side === "LONG" && !(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
    alert("LONG: SL < Entry < TP1 < TP2 < TP3 විය යුතුයි.");
    return;
  }

  if (side === "SHORT" && !(sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3)) {
    alert("SHORT: SL > Entry > TP1 > TP2 > TP3 විය යුතුයි.");
    return;
  }

  const position = margin * leverage;
  const quantity = position / entry;

  function pnl(price) {
    return side === "LONG"
      ? quantity * (price - entry)
      : quantity * (entry - price);
  }

  function roi(profit) {
    return (profit / margin) * 100;
  }

  const loss = Math.abs(pnl(sl));
  const p1 = pnl(tp1);
  const p2 = pnl(tp2);
  const p3 = pnl(tp3);

  const riskReward1 = loss > 0 ? p1 / loss : 0;
  const riskReward2 = loss > 0 ? p2 / loss : 0;
  const riskReward3 = loss > 0 ? p3 / loss : 0;

  const money = n => n.toFixed(2);
  const percent = n => n.toFixed(2) + "%";
  const ratio = n => n.toFixed(2) + "R";

  document.getElementById("result").innerHTML = `
    <hr>
    <h3>Calculation Results</h3>

    <p>Position Size: ${money(position)} USDT</p>
    <p>Quantity: ${quantity.toFixed(6)}</p>

    <hr>
    <h3 class="green">TAKE PROFIT RESULTS</h3>

    <p>TP1 Profit: <strong class="green">${money(p1)} USDT</strong></p>
    <p>TP1 ROI: ${percent(roi(p1))}</p>
    <p>TP1 Risk/Reward: ${ratio(riskReward1)}</p>

    <hr>

    <p>TP2 Profit: <strong class="green">${money(p2)} USDT</strong></p>
    <p>TP2 ROI: ${percent(roi(p2))}</p>
    <p>TP2 Risk/Reward: ${ratio(riskReward2)}</p>

    <hr>

    <p>TP3 Profit: <strong class="green">${money(p3)} USDT</strong></p>
    <p>TP3 ROI: ${percent(roi(p3))}</p>
    <p>TP3 Risk/Reward: ${ratio(riskReward3)}</p>

    <hr>
    <h3 class="red">STOP LOSS RESULT</h3>
    <p>Estimated Loss: <strong class="red">-${money(loss)} USDT</strong></p>
    <p>Loss ROI: <span class="red">-${percent(roi(loss))}</span></p>

    <hr>
    <small>Estimated results before trading fees and funding. Assumes the full position closes at each target separately. This is not a liquidation calculator.</small>
  `;
}
