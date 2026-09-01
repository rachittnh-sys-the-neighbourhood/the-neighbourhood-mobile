import { Platform } from "react-native";

/**
 * Registers the app-shell service worker (see scripts/sw-source.js) —
 * web + production only. Skipped in dev because Metro's dev server never
 * serves dist/sw.js (that file only exists after `expo export` +
 * scripts/generate-sw.mjs run, see vercel.json), so registering there
 * would just 404 on every load for no benefit.
 */
export function registerServiceWorker() {
  if (Platform.OS !== "web" || __DEV__) return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // A failed registration (e.g. an ad blocker, an unsupported browser)
    // should never block the app itself from loading.
  });
}
