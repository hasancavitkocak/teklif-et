module.exports = {
  expo: {
    name: "Teklif Et",
    slug: "teklif-et",
    owner: "hasancavitkocak",
    version: "1.0.7",
    orientation: "portrait",
    icon: "./assets/images/puzzle-iconnew.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    jsEngine: "hermes",
    splash: {
      image: "./assets/images/puzzle-iconnew.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.teklifet.app"
    },
    android: {
      softwareKeyboardLayoutMode: "resize",
      package: "com.teklifet.app",
      versionCode: 11,
      minSdkVersion: 23,
      targetSdkVersion: 34,
      icon: "./assets/images/puzzle-iconnew.png",
      adaptiveIcon: {
        foregroundImage: "./assets/images/puzzle-iconnew.png",
        backgroundColor: "#FFFFFF",
        monochromeImage: "./assets/images/puzzle-iconnew.png"
      },
      roundIconImage: "./assets/images/puzzle-iconnew.png",
      allowBackup: false,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK",
        "com.android.vending.BILLING"
      ],
      blockedPermissions: [],
      gradleProperties: {
        "newArchEnabled": "true",
        "hermesEnabled": "true",
        "android.enableR8": "true",
        "android.enableProguard": "true"
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router", 
      "expo-font",
      "expo-dev-client",
      [
        "expo-notifications",
        {
          icon: "./assets/images/puzzle-iconnew.png",
          color: "#8B5CF6",
          mode: "production"
        }
      ],
      "react-native-iap"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "e641448f-0ea3-41cd-bd11-0add24fd7573"
      }
    }
  }
};
