// In babel.config.js (NEW FILE)

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
   
  };
};