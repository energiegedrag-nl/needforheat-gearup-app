const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.disableHierarchicalLookup = true;

// use-latest-callback >= 0.2.4 exposes an ESM wrapper (esm.mjs) through package exports. Under
// Expo SDK 54 its default export comes out undefined, so React Navigation 6 crashed at startup in
// PreventRemoveProvider ("undefined is not a function"). Use the CommonJS build next to it instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const result = context.resolveRequest(context, moduleName, platform);
  if (
    result.type === 'sourceFile' &&
    result.filePath.split(path.sep).join('/').endsWith('/use-latest-callback/esm.mjs')
  ) {
    return { type: 'sourceFile', filePath: path.join(path.dirname(result.filePath), 'lib', 'src', 'index.js') };
  }
  return result;
};

module.exports = config;
