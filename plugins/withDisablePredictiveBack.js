const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const withDisablePredictiveBack = (config) => {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:enableOnBackInvokedCallback'] = 'false';
    return config;
  });
};

module.exports = withDisablePredictiveBack;
