/**
 * Runtime configuration. Public values only (EXPO_PUBLIC_* is inlined into the
 * client bundle at build time — never put secrets here).
 *
 * API origin resolution (WITHOUT the `/api/v1` prefix — the SDK paths carry it):
 *   1. `EXPO_PUBLIC_API_URL` if set (use this for staging/prod).
 *   2. In dev, derive from the Expo host so a REAL device reaches the dev
 *      machine: `localhost` on a phone points at the phone itself, so we reuse
 *      the LAN IP Expo already serves Metro on, with the API port.
 *   3. Fallback to localhost (web / simulator).
 */
import Constants from "expo-constants";

const API_PORT = 3000;
const FALLBACK_API_URL = `http://localhost:${API_PORT}`;

/** The host Expo serves Metro from, e.g. "192.168.1.10:8081" on a LAN device. */
function expoHost(): string | null {
  const fromConfig = Constants.expoConfig?.hostUri;
  const fromGo = Constants.expoGoConfig?.debuggerHost;
  const hostUri = fromConfig ?? fromGo ?? null;
  if (!hostUri) return null;
  // Strip an optional scheme, then take the host (drop the Metro port).
  const host = hostUri.replace(/^\w+:\/\//, "").split(":")[0]?.trim();
  return host && host.length > 0 ? host : null;
}

function readApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const host = expoHost();
  if (host) return `http://${host}:${API_PORT}`;

  return FALLBACK_API_URL;
}

/** Public web origin (for the paid "Tickets on web" hand-off). Served by nginx
 *  on the dev host (port 80); override via EXPO_PUBLIC_WEB_URL in staging/prod. */
function readWebUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const host = expoHost();
  if (host) return `http://${host}`;

  return "http://localhost";
}

export const env = {
  apiUrl: readApiUrl(),
  webUrl: readWebUrl(),
  /** Yandex Maps JS API v3 key (same key web-public ships). Empty → the map
   *  screen falls back to a friendly "map unavailable" state. */
  yandexMapsApiKey: process.env.EXPO_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? "",
} as const;
