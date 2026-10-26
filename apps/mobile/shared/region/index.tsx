/**
 * Region context — the participant's active city for Discover.
 *
 * The first choice is auto-derived from the device region (Uzbekistan → the
 * capital, Tashkent; anywhere else → "all"), then persisted to secure-store and
 * overridable via the picker. The selected region's `city` feeds the events
 * query's `city` filter.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import * as Localization from "expo-localization";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

import { DEFAULT_UZ_REGION, REGIONS, type Region } from "@shared/data/regions";

const KEY = "ef.region";
/** Set once the location prompt has run, whatever the answer — the OS only
 *  shows its dialog once, so re-asking would silently do nothing. */
const ASKED_KEY = "ef.region.asked";
/** Beyond this the nearest listed city is not meaningfully "yours", so the feed
 *  opens on all regions rather than pretending you are in Nukus. */
const NEAR_KM = 120;

/** Great-circle distance in km (equirectangular is close enough at this scale). */
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const x = toRad(bLon - aLon) * Math.cos(toRad((aLat + bLat) / 2));
  const y = toRad(bLat - aLat);
  return Math.sqrt(x * x + y * y) * R;
}

/** The listed region closest to a coordinate, or "all" when nothing is near. */
export function nearestRegionCode(lat: number, lon: number): string {
  let best: { code: string; km: number } | null = null;
  for (const r of REGIONS) {
    if (!r.city) continue; // skip "all"
    const km = distanceKm(lat, lon, r.coords[1], r.coords[0]);
    if (!best || km < best.km) best = { code: r.code, km };
  }
  return best && best.km <= NEAR_KM ? best.code : "all";
}

function regionByCode(code: string | null | undefined): Region {
  return REGIONS.find((r) => r.code === code) ?? REGIONS[0];
}

/** Auto-pick from the device region: UZ → capital, otherwise "all". */
function deviceRegionCode(): string {
  try {
    const rc = Localization.getLocales()?.[0]?.regionCode;
    return rc === "UZ" ? DEFAULT_UZ_REGION : "all";
  } catch {
    return "all";
  }
}

async function load(key: string): Promise<string | null> {
  try {
    return Platform.OS === "web"
      ? globalThis.localStorage?.getItem(key) ?? null
      : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string): void {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
    else void SecureStore.setItemAsync(key, value);
  } catch {
    /* best-effort */
  }
}

const loadCode = (): Promise<string | null> => load(KEY);
const saveCode = (code: string): void => save(KEY, code);

interface RegionValue {
  region: Region;
  setRegion: (code: string) => void;
  regions: Region[];
  /**
   * True once the persisted choice has been read back (or found absent).
   * Consumers gate their FIRST fetch on this so a cold start makes a single
   * request for the right city instead of fetching for the device default and
   * then visibly re-keying to the persisted region (hydration race).
   */
  ready: boolean;
  /**
   * Ask the OS for location once and set the nearest listed region from it.
   * A refusal (or a position far from every listed city) settles on "all
   * regions" — the feed must never end up empty because permission was denied.
   * No-ops if the user has already chosen a region or already been asked.
   */
  requestLocation: () => Promise<void>;
  /** Whether the one-time prompt still has to run. */
  needsLocationPrompt: boolean;
}

const RegionCtx = createContext<RegionValue | null>(null);

export function RegionProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [code, setCode] = useState<string>(deviceRegionCode);
  const [ready, setReady] = useState(false);
  const [needsLocationPrompt, setNeedsPrompt] = useState(false);

  // A persisted choice overrides the device default once it loads.
  useEffect(() => {
    void Promise.all([loadCode(), load(ASKED_KEY)]).then(([v, asked]) => {
      const known = Boolean(v && REGIONS.some((r) => r.code === v));
      if (known) setCode(v as string);
      // Only offer the prompt to someone who has neither chosen a region nor
      // been asked before — the OS dialog is one-shot per install.
      setNeedsPrompt(!known && asked !== "1");
      setReady(true);
    });
  }, []);

  const setRegion = useCallback((next: string) => {
    setCode(next);
    saveCode(next);
  }, []);

  const requestLocation = useCallback(async () => {
    setNeedsPrompt(false);
    save(ASKED_KEY, "1");
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setRegion("all");
        return;
      }
      const pos = await Location.getLastKnownPositionAsync()
        ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      if (!pos) {
        setRegion("all");
        return;
      }
      setRegion(nearestRegionCode(pos.coords.latitude, pos.coords.longitude));
    } catch {
      // A location failure is not an error worth surfacing — show everything.
      setRegion("all");
    }
  }, [setRegion]);

  const value = useMemo<RegionValue>(
    () => ({ region: regionByCode(code), setRegion, regions: REGIONS, ready, requestLocation, needsLocationPrompt }),
    [code, setRegion, ready, requestLocation, needsLocationPrompt],
  );

  return <RegionCtx.Provider value={value}>{children}</RegionCtx.Provider>;
}

export function useRegion(): RegionValue {
  const ctx = useContext(RegionCtx);
  if (!ctx) throw new Error("useRegion must be used within <RegionProvider>");
  return ctx;
}
