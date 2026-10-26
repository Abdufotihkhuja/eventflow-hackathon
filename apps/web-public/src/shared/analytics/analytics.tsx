import Script from "next/script";

import { GTM_ENABLED, GTM_ID, YM_ENABLED, YM_ID } from "./config";

/**
 * Google Tag Manager + Yandex.Metrika. Each tag renders only when its ID is
 * set for the current environment (see ./config) — so dev/stage never pollute
 * production stats. Inline loaders run via next/script `afterInteractive`
 * (GTM's recommended strategy); `<noscript>` fallbacks render through
 * `<AnalyticsNoScript />`; SPA pageviews via `<AnalyticsRouteTracker />`.
 */

export function Analytics(): React.ReactNode {
  return (
    <>
      {GTM_ENABLED ? (
        <Script id="gtm-loader" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      ) : null}
      {YM_ENABLED ? (
        <Script id="ym-loader" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}', 'ym');ym(${YM_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
        </Script>
      ) : null}
    </>
  );
}

export function AnalyticsNoScript(): React.ReactNode {
  return (
    <>
      {GTM_ENABLED ? (
        <noscript>
          <iframe
            title="Google Tag Manager"
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      ) : null}
      {YM_ENABLED ? (
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://mc.yandex.ru/watch/${YM_ID}`}
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
      ) : null}
    </>
  );
}
