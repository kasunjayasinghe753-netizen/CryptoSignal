
function show(page) {
  const main = document.querySelector("main");

  if (page === "Dashboard") {
    location.reload();
    return;
  }

  if (page === "Calculator") {
    main.innerHTML = `
      <h3>Profit Calculator</h3>

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

        <label>Exit Price</label>
        <input id="exit" type="number" placeholder="105">

        <button onclick="calculate()">CALCULATE</button>

        <div id="result"></div>
      </div>
    `;
  }

  if (page === "Signals") {
    main.innerHTML = `
      <h3>Live Signals</h3>
      <div class="card">
        <p class="green">LONG / SHORT</p>
        <p>Waiting for VPS connection</p>
      </div>
    `;
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
  const exit = Number(document.getElementById("exit").value);
  const side = document.getElementById("side").value;

  if ([margin, leverage, entry, exit].some(x => !Number.isFinite(x) || x <= 0)) {
    alert("Please enter valid positive numbers");
    return;
  }

  const position = margin * leverage;
  const quantity = position / entry;

  const pnl = side === "LONG"
    ? quantity * (exit - entry)
    : quantity * (entry - exit);

  const roi = (pnl / margin) * 100;

  document.getElementById("result").innerHTML = `
    <hr>
    <p>Position Size: ${position.toFixed(2)} USDT</p>
    <p>Quantity: ${quantity.toFixed(6)}</p>
    <h3 style="color:${pnl >= 0 ? '#36e6a0' : '#ff6577'}">
      P/L: ${pnl.toFixed(2)} USDT
    </h3>
    <p>ROI: ${roi.toFixed(2)}%</p>
    <small>Estimated result before trading fees and funding.</small>
  `;
}

