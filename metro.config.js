const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver to handle react-native-executorch on web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Mock react-native-executorch for web
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-executorch': require.resolve('./src/lib/embedding-service.web.ts'),
};

module.exports = config;