// Plain Expo Babel preset. (NativeWind's babel preset + jsxImportSource were
// removed alongside its Metro transform — see metro.config.js — because the app
// styles via the JS token layer, not Tailwind `className`.)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
