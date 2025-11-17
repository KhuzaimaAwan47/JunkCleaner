const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@emotion/unitless': path.join(__dirname, 'node_modules/@emotion/unitless'),
};

module.exports = config;

