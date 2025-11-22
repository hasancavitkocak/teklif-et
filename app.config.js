module.exports = {
  expo: {
    name: "Teklif Et",
    slug: "teklif-et",
    owner: "hasancavitkocak",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/app-icon-new.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    jsEngine: "hermes",
    splash: {
      image: "./assets/images/app-icon-new.png",
      resizeMode: "contain",
      backgroundColor: "#8B5CF6"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.teklifet.app"
    },
    android: {
      softwareKeyboardLayoutMode: "pan",
      package: "com.teklifet.app",
      versionCode: 2,
      minSdkVersion: 23,
      targetSdkVersion: 34,
      adaptiveIcon: {
        foregroundImage: "./assets/images/app-icon-new.png",
        backgroundColor: "#8B5CF6"
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
      ],
      blockedPermissions: [],
      gradleProperties: {
        "newArchEnabled": "true",
        "hermesEnabled": "true"
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: ["expo-router", "expo-font", "expo-web-browser"],
    experiments: {
      typedRoutes: true
    }
  }
};
