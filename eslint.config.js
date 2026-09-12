const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "web-build/**"],
    settings: {
      "import/ignore": ["react-native", "expo-clipboard"],
    },
    rules: {
      "import/namespace": "off",
    },
  },
];
