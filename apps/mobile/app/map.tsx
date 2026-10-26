/**
 * Events map — Yandex Maps (JS API v3, the same key web-public ships) inside a
 * WebView (an iframe on web). Ember markers = upcoming events of the selected
 * region that have coordinates; tapping a marker raises a bottom card that
 * opens the event. No native map SDK: the WebView keeps the Expo Go dev flow
 * and the release APK identical.
 */
import { createElement, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { toCardEvent, useEventsQuery } from "@entities/event";
import { RegionPicker } from "@features/region-picker";
import { env } from "@shared/config/env";
import { REGIONS } from "@shared/data/regions";
import { goBack } from "@shared/lib/go-back";
import { useI18n } from "@shared/i18n";
import { AnimatedPressable } from "@shared/motion";
import { accent, gutter, radii, shadow, type, usePalette } from "@shared/theme";
import { Btn, Icon, IconBtn, Screen, Skeleton, StateBlock, TopBar } from "@shared/ui";

interface MapPoint {
  id: string;
  lon: number;
  lat: number;
}

const MARKER_MSG = "ef-marker";

/** Uzbekistan bounding box `[[lonMin, latMin], [lonMax, latMax]]` (with a small
 *  pad). The map cannot pan or zoom outside it, and venues outside it are
 *  treated as bad data and not marked. */
const UZ_BOUNDS: [[number, number], [number, number]] = [
  [55.9, 37.0],
  [73.3, 45.7],
];

/** Where the camera *centre* may go. Tighter than the data box on purpose:
 *  clamping the centre to the country's far corners still swings most of the
 *  viewport over Kazakhstan or Pakistan, because at country zoom the screen is
 *  taller than Uzbekistan is. Pulling the centre in keeps the country on
 *  screen wherever you drag to. */
const UZ_CAMERA_BOUNDS: [[number, number], [number, number]] = [
  [58.5, 38.6],
  [71.0, 44.3],
];

function insideUz(lon: number, lat: number): boolean {
  return lon >= UZ_BOUNDS[0][0] && lon <= UZ_BOUNDS[1][0] && lat >= UZ_BOUNDS[0][1] && lat <= UZ_BOUNDS[1][1];
}

/** Build the self-contained page the WebView renders. Only serializable data
 *  crosses the bridge (points + view), so the HTML re-keys per region/data. */
function buildMapHtml(opts: {
  apiKey: string;
  lang: string;
  points: MapPoint[];
  center: [number, number];
  zoom: number;
}): string {
  const mapLang = opts.lang === "ru" ? "ru_RU" : "en_US";
  // Fit all markers when there are 2+; otherwise center on the single venue /
  // the region seat. Bounds get a small degree pad so pins don't hug the edge.
  const location =
    opts.points.length > 1
      ? {
          bounds: [
            [Math.min(...opts.points.map((p) => p.lon)) - 0.02, Math.min(...opts.points.map((p) => p.lat)) - 0.02],
            [Math.max(...opts.points.map((p) => p.lon)) + 0.02, Math.max(...opts.points.map((p) => p.lat)) + 0.02],
          ],
        }
      : { center: opts.points[0] ? [opts.points[0].lon, opts.points[0].lat] : opts.center, zoom: opts.points[0] ? 14 : opts.zoom };
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://api-maps.yandex.ru/v3/?lang=${mapLang}&apikey=${encodeURIComponent(opts.apiKey)}"></script>
<style>
  html,body,#m{margin:0;padding:0;width:100%;height:100%;background:#FBFBFA}
  .pin{width:26px;height:26px;border-radius:50%;background:#ea580c;border:2.5px solid #fff;
       box-shadow:0 2px 6px rgba(14,14,13,.35);transform:translate(-50%,-50%);cursor:pointer}
  /* Yandex's own chrome: a wordmark + terms link bottom-right
     (ymaps3--map-copyrights) and an "Open Yandex Maps" button bottom-left
     (ymaps3--controls, holding ymaps3--open-maps-button). Together they laid a
     third visual language across the bottom edge, clipped by the screen. Both
     hidden and replaced by one control of ours (the Yandex Maps chip), which
     attributes the provider and does the same job. We add no ymaps controls of
     our own, so hiding that layer is safe; matched on substrings because the
     class prefix has changed between releases before. */
  [class*="copyrights"],[class*="ymaps3--controls"]{display:none!important}
</style></head><body><div id="m"></div><script>
  var POINTS=${JSON.stringify(opts.points)};
  var LOCATION=${JSON.stringify(location)};
  var CAM=${JSON.stringify(UZ_CAMERA_BOUNDS)};
  var MIN_ZOOM=5.2, MAX_ZOOM=19;
  function send(id){
    var msg=JSON.stringify({type:"${MARKER_MSG}",id:id});
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(msg);}
    else if(window.parent!==window){window.parent.postMessage(msg,"*");}
  }
  ymaps3.ready.then(function(){
    var host=document.getElementById("m");
    var map=null;
    // The map is pinned to Uzbekistan: no panning past the border, no zooming
    // out beyond the country view.
    function makeMap(){
      if(map){map.destroy();}
      map=new ymaps3.YMap(host,{location:LOCATION});
      map.addChild(new ymaps3.YMapDefaultSchemeLayer());
      map.addChild(new ymaps3.YMapDefaultFeaturesLayer());
      // Keep the camera over Uzbekistan. The restrictMapArea and zoomRange
      // props are documented on YMap but this build honours neither — a
      // pinch-out happily reached Oman. So the clamp is enforced here, on
      // action end: let the gesture run freely, then ease back inside the box
      // when the finger lifts. Clamping every frame would fight the drag.
      map.addChild(new ymaps3.YMapListener({
        onUpdate:function(ev){
          // Only once the gesture has settled — mapInAction is true for every
          // frame of a drag or pinch, and correcting mid-gesture fights the
          // finger. The clamped values are inside the limits, so the update
          // this triggers re-enters here once and stops.
          if(!ev||!ev.location||ev.mapInAction)return;
          var c=ev.location.center,z=ev.location.zoom;
          var nz=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z));
          var nx=Math.min(Math.max(c[0],CAM[0][0]),CAM[1][0]);
          var ny=Math.min(Math.max(c[1],CAM[0][1]),CAM[1][1]);
          if(Math.abs(nz-z)<0.01&&Math.abs(nx-c[0])<1e-6&&Math.abs(ny-c[1])<1e-6)return;
          map.update({location:{center:[nx,ny],zoom:nz,duration:220}});
        }
      }));
      POINTS.forEach(function(p){
        var el=document.createElement("div");
        el.className="pin";
        el.addEventListener("click",function(){send(p.id);});
        map.addChild(new ymaps3.YMapMarker({coordinates:[p.lon,p.lat]},el));
      });
    }
    // Boot only after the page fully loads: ymaps3.ready resolves earlier, and
    // a map created mid-load renders a stale, partial viewport (seen on both
    // the web iframe and WebView). Then rebuild on real container resizes —
    // ymaps3 does not follow container growth.
    function boot(){
      requestAnimationFrame(function(){
        makeMap();
        var lastW=host.clientWidth,lastH=host.clientHeight,timer=null;
        new ResizeObserver(function(){
          if(Math.abs(host.clientWidth-lastW)<2&&Math.abs(host.clientHeight-lastH)<2){return;}
          lastW=host.clientWidth;lastH=host.clientHeight;
          clearTimeout(timer);timer=setTimeout(makeMap,150);
        }).observe(host);
      });
    }
    if(document.readyState==="complete"){boot();}
    else{window.addEventListener("load",boot);}
  });
</script></body></html>`;
}

/** Platform seam: react-native-webview natively, a sandboxed iframe on web
 *  (react-native-webview has no web implementation). */
function MapCanvas({ html, onMarker }: { html: string; onMarker: (id: string) => void }): React.JSX.Element {
  const parse = (raw: string): void => {
    try {
      const msg = JSON.parse(raw) as { type?: string; id?: string };
      if (msg.type === MARKER_MSG && msg.id) onMarker(msg.id);
    } catch {
      /* not ours */
    }
  };
  if (Platform.OS === "web") {
    return createElement("iframe", {
      srcDoc: html,
      style: { border: 0, width: "100%", height: "100%", display: "block" },
      // The page posts marker taps to the parent window.
      ref: (node: unknown) => {
        if (node && !(node as { __efBound?: boolean }).__efBound) {
          (node as { __efBound?: boolean }).__efBound = true;
          window.addEventListener("message", (e: MessageEvent) => {
            if (typeof e.data === "string") parse(e.data);
          });
        }
      },
    }) as unknown as React.JSX.Element;
  }
  return (
    <WebView
      // baseUrl makes the WebView's Yandex requests carry our domain as the
      // Referer — required once the API key is domain-restricted in the Yandex
      // developer console (inline HTML otherwise sends NO referer at all).
      source={{ html, baseUrl: "https://eventflow.uz" }}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onMessage={(e: WebViewMessageEvent) => parse(e.nativeEvent.data)}
      style={{ flex: 1, backgroundColor: "transparent" }}
    />
  );
}

export default function EventsMap(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang, tx } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The map's own filter — deliberately NOT the persisted Discover region:
  // the map always opens on the whole country.
  const [regionCode, setRegionCode] = useState("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const region = REGIONS.find((r) => r.code === regionCode) ?? REGIONS[0];

  // limit 50 = the API's PublicEventsQuery cap.
  const eventsQ = useEventsQuery({ locale: lang, filter: "upcoming", limit: 50, city: region.city ?? undefined });
  const items = useMemo(() => eventsQ.data?.items ?? [], [eventsQ.data]);
  const points = useMemo<MapPoint[]>(
    () =>
      items
        .filter((e) => e.latitude != null && e.longitude != null)
        .map((e) => ({ id: e.id, lon: Number(e.longitude), lat: Number(e.latitude) }))
        .filter((pt) => insideUz(pt.lon, pt.lat)),
    [items],
  );

  const html = useMemo(
    () =>
      buildMapHtml({
        apiKey: env.yandexMapsApiKey,
        lang,
        points,
        center: region.coords,
        zoom: region.city ? 11 : 5,
      }),
    [points, lang, region.coords, region.city],
  );

  const selected = selectedId ? items.find((e) => e.id === selectedId) : undefined;
  const card = selected ? toCardEvent(selected, lang) : undefined;
  const pending = eventsQ.isLoading;
  /** Events in this region the map cannot show, because nobody geocoded their
   *  venue. They were being dropped silently, which made a populated region
   *  look empty. */
  const unmapped = items.length - points.length;

  /** Hand off to Yandex Maps — the selected venue when there is one, otherwise
   *  the region. Also the provider attribution, which is why it is always
   *  visible rather than tucked behind the event card. */
  function openInYandex(): void {
    const at = selected?.latitude != null && selected?.longitude != null
      ? { lon: Number(selected.longitude), lat: Number(selected.latitude), z: 16 }
      : { lon: region.coords[0], lat: region.coords[1], z: region.city ? 11 : 6 };
    void Linking.openURL(`https://yandex.uz/maps/?ll=${at.lon},${at.lat}&z=${at.z}`).catch(() => undefined);
  }

  return (
    <Screen>
      <TopBar title={t("map.title")} left={<IconBtn name="cleft" size={40} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />} border />

      {!env.yandexMapsApiKey ? (
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: gutter }}>
          <StateBlock icon="map" title={t("map.unavailable.title")} body={t("map.unavailable.body")} />
        </View>
      ) : pending ? (
        <View style={{ flex: 1, padding: gutter }}>
          <Skeleton h={520} r={radii.xl} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapCanvas html={html} onMarker={setSelectedId} />

          {/* Region filter — floats over the map, defaults to the whole country. */}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={tx(region.label)}
            haptic="tap"
            scaleTo={0.97}
            onPress={() => setPickerOpen(true)}
            style={[
              { position: "absolute", left: gutter, top: 14, flexDirection: "row", alignItems: "center", gap: 7, height: 40, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
              shadow.lg,
            ]}
          >
            <Icon name="pin" size={15} color={accent.ink} />
            <Text style={type({ weight: 700, size: 14, leading: 1, color: p.fg })}>{tx(region.label)}</Text>
            <Icon name="cdown" size={14} color={p.fgMuted} />
          </AnimatedPressable>

          {/* Attribution and the hand-off to Yandex Maps, as one control in our
              own language — replacing the provider's own stacked block that ran
              off the bottom edge. Top-right, so it never fights the event card. */}
          <AnimatedPressable
            accessibilityRole="link"
            accessibilityLabel={t("map.provider")}
            haptic="tap"
            scaleTo={0.97}
            onPress={openInYandex}
            style={[
              { position: "absolute", right: gutter, top: 14, flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
              shadow.lg,
            ]}
          >
            <Icon name="map" size={15} color={p.fgMuted} />
            <Text style={type({ weight: 600, size: 13, leading: 1, color: p.fgDefault })}>{t("map.provider")}</Text>
          </AnimatedPressable>

          {/* Nothing to plot. The map stays for context; the notice says which
              of the two reasons it is and offers the way out. */}
          {points.length === 0 && !pending ? (
            <View
              style={[
                { position: "absolute", left: gutter, right: gutter, top: 66, paddingHorizontal: 16, paddingVertical: 16, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
                shadow.lg,
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="pin" size={16} color={p.fgMuted} />
                <Text style={[type({ weight: 700, size: 15, leading: 1.2, color: p.fg }), { flex: 1 }]}>{t("map.empty.title")}</Text>
              </View>
              <Text style={[type({ weight: 400, size: 13, leading: 1.45, color: p.fgMuted }), { marginTop: 8 }]}>
                {unmapped > 0
                  ? t("map.noCoords", { n: unmapped })
                  : region.city
                    ? t("map.empty.region", { region: tx(region.label) })
                    : t("map.empty.all")}
              </Text>
              {region.city ? (
                <View style={{ marginTop: 14, alignSelf: "flex-start" }}>
                  <Btn size="sm" variant="secondary" onPress={() => setRegionCode("all")}>{t("map.empty.showAll")}</Btn>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Selected event card */}
          {card ? (
            <View
              style={[
                { position: "absolute", left: gutter, right: gutter, bottom: Math.max(insets.bottom, 14), borderRadius: radii.xl, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16 },
                shadow.lg,
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
                    {tx(card.title)}
                  </Text>
                  <Text numberOfLines={1} style={[type({ role: "mono", weight: 500, size: 12, leading: 1.3, color: p.fgMuted }), { marginTop: 5 }]}>
                    {card.date} · {card.time}
                    {tx(card.venue) ? ` · ${tx(card.venue)}` : ""}
                  </Text>
                </View>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                  haptic="tap"
                  hitSlop={8}
                  onPress={() => setSelectedId(null)}
                >
                  <Icon name="x" size={20} color={p.fgMuted} />
                </AnimatedPressable>
              </View>
              <View style={{ marginTop: 12 }}>
                <Btn full size="md" iconRight="aright" onPress={() => router.push(`/event/${card.id}`)}>
                  {t("map.open")}
                </Btn>
              </View>
            </View>
          ) : null}
        </View>
      )}

      <RegionPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={regionCode}
        onSelect={(code) => {
          setRegionCode(code);
          setSelectedId(null);
        }}
      />
    </Screen>
  );
}
