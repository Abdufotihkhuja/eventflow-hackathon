/**
 * Pick the venue on a Yandex map — the mobile counterpart of web-workspace's
 * EventLocationPicker.
 *
 * Why the JS API in a WebView and not a native map SDK: the same reason the
 * Discover map does it (app/map.tsx) — it keeps the Expo Go dev flow working
 * and needs no extra native module. This one uses the 2.1 API rather than the
 * 3.0 one the Discover map uses, because REVERSE GEOCODING is the whole point
 * here and `ymaps.geocode` ships with the JS API key we already have; the 3.0
 * API has no geocoder and would need a second, separately-billed HTTP key.
 *
 * POI interactivity is disabled (`yandexMapDisablePoiInteractivity`) so a tap
 * on a building picks THAT POINT instead of opening Yandex's own balloon —
 * otherwise a venue Yandex doesn't know about could not be chosen at all.
 */
import { createElement, useCallback, useMemo, useRef, useState } from "react";
import { Modal, Platform, View, Text } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@shared/config/env";
import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";

import { Btn, IconBtn } from "../button";
import { Field } from "../field";
import { Icon } from "../icon";
import { StateBlock } from "../primitives";

/** What the picker hands back once a point is chosen. */
export interface PickedLocation {
  latitude: number;
  longitude: number;
  /** POI name Yandex knows for the point, when it knows one. */
  venue?: string;
  address?: string;
  city?: string;
}

const PICK_MSG = "ef:pick";
const ERROR_MSG = "ef:error";
/** Tashkent — where the map opens when the event has no point yet. */
const DEFAULT_CENTER: [number, number] = [41.311151, 69.279737];

function buildPickerHtml(opts: {
  apiKey: string;
  lang: string;
  initial: [number, number] | null;
}): string {
  const mapLang = opts.lang === "ru" ? "ru_RU" : opts.lang === "uz" ? "uz_UZ" : "en_US";
  const center = opts.initial ?? DEFAULT_CENTER;
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(opts.apiKey)}&lang=${mapLang}&load=package.full"></script>
<style>
  html,body,#m{margin:0;padding:0;width:100%;height:100%;background:#FBFBFA}
</style></head><body><div id="m"></div><script>
  var CENTER=${JSON.stringify(center)};
  var INITIAL=${JSON.stringify(opts.initial)};
  function post(o){
    var s=JSON.stringify(o);
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s);}
    else if(window.parent!==window){window.parent.postMessage(s,"*");}
  }
  // Yandex returns [lat,lon]; GeoJSON-shaped answers come back [lon,lat].
  function norm(c){
    if(!c||c.length<2)return null;
    var a=Number(c[0]),b=Number(c[1]);
    if(isNaN(a)||isNaN(b))return null;
    if(Math.abs(a)<=90&&Math.abs(b)<=180)return [a,b];
    if(Math.abs(b)<=90&&Math.abs(a)<=180)return [b,a];
    return [a,b];
  }
  function parseGeo(obj){
    try{
      var props=obj.properties;
      var meta=props.get("metaDataProperty")||{};
      var gm=meta.GeocoderMetaData||{};
      var venue=(props.get("name")||gm.name||"").trim()||undefined;
      var address=(gm.text||props.get("description")||props.get("text")||"").trim()||undefined;
      var city;
      var comps=(gm.Address&&gm.Address.Components)||[];
      for(var i=0;i<comps.length;i++){
        if(comps[i].kind==="locality"||comps[i].kind==="district"||comps[i].kind==="area"){
          city=(comps[i].name||"").trim();
          if(comps[i].kind==="locality")break;
        }
      }
      return {venue:venue,address:address,city:city||undefined};
    }catch(e){return {};}
  }
  ymaps.ready(function(){
    var map=new ymaps.Map("m",{
      center:CENTER,
      zoom:INITIAL?16:11,
      controls:["zoomControl","geolocationControl"]
    },{
      autoFitToViewport:"always",
      openBalloonOnClick:false,
      // A tap on a building must pick that point, not open Yandex's card.
      yandexMapDisablePoiInteractivity:true,
      suppressMapOpenBlock:true
    });
    var pm=null;
    function place(coords){
      if(pm){map.geoObjects.remove(pm);}
      pm=new ymaps.Placemark(coords,{},{preset:"islands#redIcon",draggable:true});
      pm.events.add("dragend",function(){
        var c=norm(pm.geometry.getCoordinates());
        if(c)resolve(c,false);
      });
      map.geoObjects.add(pm);
    }
    function emit(coords,obj){
      var d=obj?parseGeo(obj):{};
      post({type:"${PICK_MSG}",lat:coords[0],lon:coords[1],venue:d.venue,address:d.address,city:d.city});
    }
    function resolve(coords,recenter){
      place(coords);
      if(recenter){map.setCenter(coords,16);}
      ymaps.geocode(coords,{results:1}).then(function(res){
        emit(coords,res.geoObjects.getLength()>0?res.geoObjects.get(0):null);
      },function(){
        // Coordinates are still valid without a readable address.
        emit(coords,null);
      });
    }
    function apply(obj){
      var c=norm(obj.geometry.getCoordinates());
      if(!c)return false;
      place(c);
      map.setCenter(c,16);
      emit(c,obj);
      return true;
    }
    // The geocoder resolves ADDRESSES only — "IT Park Tashkent" finds nothing
    // there. Businesses live in the search provider, so fall back to it before
    // telling the author their venue does not exist.
    function searchPoi(q){
      if(!ymaps.search){post({type:"${ERROR_MSG}",reason:"notfound"});return;}
      ymaps.search(q,{results:1,provider:"yandex#search"}).then(function(res){
        if(!res||!res.geoObjects||res.geoObjects.getLength()===0||!apply(res.geoObjects.get(0))){
          post({type:"${ERROR_MSG}",reason:"notfound"});
        }
      },function(){post({type:"${ERROR_MSG}",reason:"notfound"});});
    }
    function search(q){
      if(!q)return;
      ymaps.geocode(q,{results:1}).then(function(res){
        if(res.geoObjects.getLength()===0||!apply(res.geoObjects.get(0))){searchPoi(q);}
      },function(){searchPoi(q);});
    }
    map.events.add("click",function(e){
      var c=norm(e.get("coords"));
      if(c)resolve(c,false);
    });
    // Native injects a call to efSearch; the web build posts a message instead.
    window.efSearch=search;
    window.addEventListener("message",function(e){
      try{
        var m=typeof e.data==="string"?JSON.parse(e.data):e.data;
        if(m&&m.type==="ef:search")search(m.q);
      }catch(_){}
    });
    if(INITIAL){place(INITIAL);}
  });
</script></body></html>`;
}

/** Platform seam, mirroring app/map.tsx: a WebView natively, an iframe on web
 *  (react-native-webview has no web implementation). */
function PickerCanvas({
  html,
  onMessage,
  searchRef,
}: {
  html: string;
  onMessage: (raw: string) => void;
  searchRef: React.MutableRefObject<((q: string) => void) | null>;
}): React.JSX.Element {
  const webRef = useRef<WebView>(null);

  if (Platform.OS === "web") {
    return createElement("iframe", {
      srcDoc: html,
      style: { border: 0, width: "100%", height: "100%", display: "block" },
      ref: (node: unknown) => {
        if (!node) return;
        const frame = node as { __efBound?: boolean; contentWindow?: Window | null };
        searchRef.current = (q: string) => {
          frame.contentWindow?.postMessage(JSON.stringify({ type: "ef:search", q }), "*");
        };
        if (frame.__efBound) return;
        frame.__efBound = true;
        window.addEventListener("message", (e: MessageEvent) => {
          if (typeof e.data === "string") onMessage(e.data);
        });
      },
    }) as unknown as React.JSX.Element;
  }

  searchRef.current = (q: string) => {
    webRef.current?.injectJavaScript(`window.efSearch && window.efSearch(${JSON.stringify(q)}); true;`);
  };
  return (
    <WebView
      ref={webRef}
      // baseUrl gives Yandex our domain as the Referer — required once the key
      // is domain-restricted (inline HTML sends no referer at all).
      source={{ html, baseUrl: "https://eventflow.uz" }}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onMessage={(e: WebViewMessageEvent) => onMessage(e.nativeEvent.data)}
      style={{ flex: 1, backgroundColor: "transparent" }}
    />
  );
}

export function LocationPicker({
  visible,
  onClose,
  onApply,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (value: PickedLocation) => void;
  /** Point the event already carries, if any — the map opens on it. */
  initial?: { latitude: number; longitude: number } | null;
}): React.JSX.Element | null {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const searchRef = useRef<((q: string) => void) | null>(null);

  // Keyed on the point the sheet OPENED with: rebuilding the page mid-session
  // would drop the pin the user just placed.
  const initialCoords = useMemo<[number, number] | null>(
    () => (initial ? [initial.latitude, initial.longitude] : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible],
  );
  const html = useMemo(
    () => buildPickerHtml({ apiKey: env.yandexMapsApiKey, lang, initial: initialCoords }),
    [lang, initialCoords],
  );

  const onMessage = useCallback((raw: string): void => {
    try {
      const msg = JSON.parse(raw) as {
        type?: string;
        lat?: number;
        lon?: number;
        venue?: string;
        address?: string;
        city?: string;
      };
      if (msg.type === PICK_MSG && typeof msg.lat === "number" && typeof msg.lon === "number") {
        setNotFound(false);
        setPicked({
          latitude: msg.lat,
          longitude: msg.lon,
          venue: msg.venue,
          address: msg.address,
          city: msg.city,
        });
        haptics.select();
      } else if (msg.type === ERROR_MSG) {
        setNotFound(true);
      }
    } catch {
      /* not ours */
    }
  }, []);

  if (!visible) return null;

  // No key → the map cannot load at all; say so instead of showing a blank box.
  if (!env.yandexMapsApiKey) {
    return (
      <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: p.canvas, paddingTop: insets.top + 8 }}>
          <View style={{ paddingHorizontal: 12 }}>
            <IconBtn name="x" size={40} onPress={onClose} accessibilityLabel={t("common.close")} />
          </View>
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 36 }}>
            <StateBlock icon="map" title={t("org.form.map.unavailable")} body={t("org.form.map.unavailableBody")} />
          </View>
        </View>
      </Modal>
    );
  }

  const summary = picked
    ? [picked.venue, picked.address].filter(Boolean).join(" · ") ||
      `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`
    : null;

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: p.canvas }}>
        {/* header */}
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 10,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: p.surface,
            borderBottomWidth: 1,
            borderBottomColor: p.border,
          }}
        >
          <IconBtn name="x" size={40} onPress={onClose} accessibilityLabel={t("common.close")} />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[type({ weight: 700, size: 16, leading: 1.2, color: p.fg }), { flex: 1, textAlign: "center" }]}
          >
            {t("org.form.map.title")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* search */}
        <View style={{ paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 10, gap: 8 }}>
          <Field
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setNotFound(false);
            }}
            placeholder={t("org.form.map.searchPlaceholder")}
            icon="search"
            returnKeyType="search"
            autoCapitalize="sentences"
            onSubmitEditing={() => searchRef.current?.(query.trim())}
            error={notFound ? t("org.form.map.notFound") : undefined}
          />
        </View>

        <View style={{ flex: 1, overflow: "hidden" }}>
          <PickerCanvas html={html} onMessage={onMessage} searchRef={searchRef} />
        </View>

        {/* result + apply */}
        <View
          style={{
            paddingHorizontal: gutter,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            gap: 10,
            backgroundColor: p.surface,
            borderTopWidth: 1,
            borderTopColor: p.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 38 }}>
            <Icon name="pin" size={18} color={picked ? accent.base : p.fgSubtle} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
                style={type({ weight: 500, size: 13, leading: 1.35, color: picked ? p.fg : p.fgMuted })}
              >
                {summary ?? t("org.form.map.hint")}
              </Text>
              {picked ? (
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={type({ role: "mono", weight: 400, size: 11, leading: 1.3, color: p.fgSubtle })}
                >
                  {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}
                </Text>
              ) : null}
            </View>
          </View>
          <Btn
            full
            variant="primary"
            onPress={() => {
              if (!picked) return;
              onApply(picked);
              onClose();
            }}
            disabled={!picked}
          >
            {t("org.form.map.apply")}
          </Btn>
        </View>
      </View>
    </Modal>
  );
}
