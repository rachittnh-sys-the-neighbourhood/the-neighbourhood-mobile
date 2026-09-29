/**
 * Whether this page is currently running as an installed Home Screen web
 * app ("standalone"/PWA mode) rather than a normal browser tab.
 * `navigator.standalone` is iOS Safari/WebKit's own, long-standing flag
 * for this; `display-mode: standalone` is the cross-platform media-query
 * equivalent Android/Chrome (and modern WebKit) also support. Checking
 * both covers every platform that can install this app.
 *
 * Why this matters: an iOS Home Screen web app has a well-documented
 * history of running on a storage/session context that isn't reliably
 * the same as Safari's own — and third-party OAuth redirects (Google)
 * can get handed off to a regular Safari tab instead of staying inside
 * the installed icon's own window. That's a platform behavior, not a bug
 * in this codebase, and no client-side code can force iOS to keep the
 * navigation inside the standalone shell. See app/welcome.tsx and
 * lib/db/session.ts signInWithGoogle for where this is used: the goal
 * isn't to prevent the hand-off (not possible from here), it's to make
 * it a known, explained step instead of a confusing silent one.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  const mediaStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || mediaStandalone;
}
