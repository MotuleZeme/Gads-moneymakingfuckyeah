/*
  EV Home Charging Cost Calculator.
  All math runs internally in metric (km, kWh, liters) so the mi/km
  toggle never causes rounding drift. Display-unit conversion happens
  only when reading from or writing to the visible inputs/outputs.
*/
(function () {
  var Units = window.Units;

  var els = {
    unitButtons: document.querySelectorAll(".unit-toggle__option"),
    distance: document.getElementById("distance"),
    distanceSuffix: document.querySelector('[data-suffix="distance"]'),
    efficiency: document.getElementById("efficiency"),
    efficiencySuffix: document.querySelector('[data-suffix="efficiency"]'),
    rate: document.getElementById("rate"),
    loss: document.getElementById("loss"),
    lossValue: document.getElementById("loss-value"),
    charger: document.getElementById("charger"),
    battery: document.getElementById("battery"),
    gasEfficiency: document.getElementById("gas-efficiency"),
    gasEfficiencySuffix: document.querySelector('[data-suffix="gasEfficiency"]'),
    gasPrice: document.getElementById("gas-price"),
    gasPriceSuffix: document.querySelector('[data-suffix="gasPriceUnit"]'),
    unitWords: document.querySelectorAll("[data-unit-word]"),

    outMonthlyCost: document.getElementById("out-monthly-cost"),
    outCostPerDistance: document.getElementById("out-cost-per-distance"),
    outChargeTime: document.getElementById("out-charge-time"),
    outMonthlySavings: document.getElementById("out-monthly-savings"),
    outAnnualSavings: document.getElementById("out-annual-savings"),
    barElectric: document.getElementById("out-bar-electric"),
    barElectricValue: document.getElementById("out-bar-electric-value"),
    barGas: document.getElementById("out-bar-gas"),
    barGasValue: document.getElementById("out-bar-gas-value"),
  };

  // Canonical state, always metric.
  var state = {
    unit: "mi",
    distanceKm: Units.miToKm(1000),
    effKmPerKwh: Units.miPerKwhToKmPerKwh(3.5),
    electricityRate: 0.16,
    lossPercent: 12,
    chargerKw: 7.4,
    batteryKwh: 75,
    gasLPer100km: Units.mpgToLPer100km(30),
    gasPricePerLiter: Units.pricePerGalToPerLiter(3.5),
  };

  function toNumber(value) {
    var n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  }

  function formatCurrency(n) {
    var sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function round(n, decimals) {
    var f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
  }

  function renderUnitDependentInputs() {
    var mi = state.unit === "mi";

    els.distance.value = mi ? round(Units.kmToMi(state.distanceKm), 0) : round(state.distanceKm, 0);
    els.efficiency.value = mi
      ? round(Units.kmPerKwhToMiPerKwh(state.effKmPerKwh), 2)
      : round(state.effKmPerKwh, 2);
    els.gasEfficiency.value = mi
      ? round(Units.lPer100kmToMpg(state.gasLPer100km), 1)
      : round(state.gasLPer100km, 1);
    els.gasPrice.value = mi
      ? round(Units.pricePerLiterToPerGal(state.gasPricePerLiter), 2)
      : round(state.gasPricePerLiter, 2);

    els.distanceSuffix.textContent = mi ? "mi" : "km";
    els.efficiencySuffix.textContent = mi ? "mi/kWh" : "km/kWh";
    els.gasEfficiencySuffix.textContent = mi ? "mpg" : "L/100km";
    els.gasPriceSuffix.textContent = mi ? "/gal" : "/L";

    els.unitWords.forEach(function (el) {
      el.textContent = mi ? "mile" : "kilometer";
    });
  }

  function computeAndRender() {
    var effKmPerKwh = state.effKmPerKwh > 0 ? state.effKmPerKwh : 0.0001;
    var lossFactor = 1 - state.lossPercent / 100;
    if (lossFactor <= 0) lossFactor = 0.01;

    var kWhAtWheel = state.distanceKm / effKmPerKwh;
    var kWhFromWall = kWhAtWheel / lossFactor;
    var electricMonthlyCost = kWhFromWall * state.electricityRate;
    var electricCostPerKm = state.distanceKm > 0 ? electricMonthlyCost / state.distanceKm : 0;

    var gasMonthlyCost = (state.distanceKm / 100) * state.gasLPer100km * state.gasPricePerLiter;

    var monthlySavings = gasMonthlyCost - electricMonthlyCost;
    var annualSavings = monthlySavings * 12;

    var chargerKw = state.chargerKw > 0 ? state.chargerKw : 0.0001;
    var fullChargeHours = state.batteryKwh / chargerKw;

    var mi = state.unit === "mi";
    var costPerDistance = mi ? electricCostPerKm * Units.KM_PER_MI : electricCostPerKm;

    els.outMonthlyCost.textContent = Math.round(electricMonthlyCost).toLocaleString("en-US");
    els.outCostPerDistance.textContent = "$" + costPerDistance.toFixed(2);
    els.outChargeTime.textContent = fullChargeHours.toFixed(1) + " hrs";
    els.outMonthlySavings.textContent = formatCurrency(monthlySavings);
    els.outAnnualSavings.textContent = formatCurrency(annualSavings);

    var maxCost = Math.max(electricMonthlyCost, gasMonthlyCost, 1);
    els.barElectric.style.width = (electricMonthlyCost / maxCost) * 100 + "%";
    els.barGas.style.width = (gasMonthlyCost / maxCost) * 100 + "%";
    els.barElectricValue.textContent = formatCurrency(electricMonthlyCost);
    els.barGasValue.textContent = formatCurrency(gasMonthlyCost);
  }

  // ---- Unit-dependent field listeners ----

  els.distance.addEventListener("input", function () {
    var v = toNumber(els.distance.value);
    state.distanceKm = state.unit === "mi" ? Units.miToKm(v) : v;
    computeAndRender();
  });

  els.efficiency.addEventListener("input", function () {
    var v = toNumber(els.efficiency.value);
    state.effKmPerKwh = state.unit === "mi" ? Units.miPerKwhToKmPerKwh(v) : v;
    computeAndRender();
  });

  els.gasEfficiency.addEventListener("input", function () {
    var v = toNumber(els.gasEfficiency.value);
    state.gasLPer100km = state.unit === "mi" ? Units.mpgToLPer100km(v) : v;
    computeAndRender();
  });

  els.gasPrice.addEventListener("input", function () {
    var v = toNumber(els.gasPrice.value);
    state.gasPricePerLiter = state.unit === "mi" ? Units.pricePerGalToPerLiter(v) : v;
    computeAndRender();
  });

  // ---- Unit-independent field listeners ----

  els.rate.addEventListener("input", function () {
    state.electricityRate = toNumber(els.rate.value);
    computeAndRender();
  });

  els.loss.addEventListener("input", function () {
    state.lossPercent = toNumber(els.loss.value);
    els.lossValue.textContent = state.lossPercent + "%";
    computeAndRender();
  });

  els.charger.addEventListener("change", function () {
    state.chargerKw = toNumber(els.charger.value);
    computeAndRender();
  });

  els.battery.addEventListener("input", function () {
    state.batteryKwh = toNumber(els.battery.value);
    computeAndRender();
  });

  // ---- Unit toggle ----

  els.unitButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var unit = btn.getAttribute("data-unit");
      if (unit === state.unit) return;

      state.unit = unit;
      els.unitButtons.forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });

      renderUnitDependentInputs();
      computeAndRender();
    });
  });

  renderUnitDependentInputs();
  computeAndRender();
})();
