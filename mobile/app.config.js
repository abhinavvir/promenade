const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure react-native-maps for OpenStreetMap
config.resolver.sourceExts.push('mjs');

module.exports = config;
