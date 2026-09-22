/*
  Shared unit conversion helpers.
  Any future tool with a mi/km toggle should reuse these rather than
  redefining conversion constants locally.
*/
(function (global) {
  var KM_PER_MI = 1.609344;
  var LITERS_PER_GAL = 3.785411784;
  var MPG_L100KM_CONST = 235.214583; // L/100km = MPG_L100KM_CONST / mpg

  var Units = {
    KM_PER_MI: KM_PER_MI,
    LITERS_PER_GAL: LITERS_PER_GAL,

    kmToMi: function (km) {
      return km / KM_PER_MI;
    },
    miToKm: function (mi) {
      return mi * KM_PER_MI;
    },

    // efficiency: km-per-kWh <-> mi-per-kWh (same ratio as distance)
    kmPerKwhToMiPerKwh: function (v) {
      return v / KM_PER_MI;
    },
    miPerKwhToKmPerKwh: function (v) {
      return v * KM_PER_MI;
    },

    // fuel economy: mpg (US) <-> L/100km
    mpgToLPer100km: function (mpg) {
      if (!mpg) return 0;
      return MPG_L100KM_CONST / mpg;
    },
    lPer100kmToMpg: function (l) {
      if (!l) return 0;
      return MPG_L100KM_CONST / l;
    },

    // price: per US gallon <-> per liter
    pricePerGalToPerLiter: function (p) {
      return p / LITERS_PER_GAL;
    },
    pricePerLiterToPerGal: function (p) {
      return p * LITERS_PER_GAL;
    },
  };

  global.Units = Units;
})(window);
