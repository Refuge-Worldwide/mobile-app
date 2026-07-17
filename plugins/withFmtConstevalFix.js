const { withPodfile } = require('@expo/config-plugins');

/**
 * Xcode 26.4+ (Apple Clang 21) enforces stricter C++20 consteval rules that
 * break the `fmt` pod bundled with React Native < 0.83.9. Compiling just
 * that pod against C++17 skips the consteval path entirely.
 * Remove once this project is on Expo SDK 56 / React Native >= 0.83.9,
 * which bundle a fixed version of fmt.
 */
const withFmtConstevalFix = (config) => {
  return withPodfile(config, (config) => {
    const marker = "target.name == 'fmt'";
    if (config.modResults.contents.includes(marker)) {
      return config;
    }

    const anchor = 'post_install do |installer|';
    const index = config.modResults.contents.indexOf(anchor);
    if (index === -1) {
      throw new Error('withFmtConstevalFix: could not find post_install hook in Podfile');
    }

    const insertion = `${anchor}
    # Fix for Xcode 26.4+ consteval build error in fmt library
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

    config.modResults.contents =
      config.modResults.contents.slice(0, index) +
      insertion +
      config.modResults.contents.slice(index + anchor.length + 1);

    return config;
  });
};

module.exports = withFmtConstevalFix;
