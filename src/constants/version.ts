import Constants from "expo-constants";

/**
 * Single source of truth for App Version Control across the application.
 * Reads dynamically from app.json / Constants.expoConfig with fallback.
 */
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.6";
export const BUILD_NUMBER = "57.0.22";
