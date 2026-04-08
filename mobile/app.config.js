const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewindtailwind/config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure react-native-maps for OpenStreetMap
config.resolver.sourceExts.push('mjs');

module.exports = withNativeWind(config, {
  input: './global.css',
  projectRoot: __dirname,
});
