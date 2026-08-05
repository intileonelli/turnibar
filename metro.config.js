const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite ships a WebAssembly build for the web platform.
config.resolver.assetExts.push('wasm');

module.exports = config;
