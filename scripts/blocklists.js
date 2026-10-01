/* Vio — свои блокировки: хосты рекламы + CSS для баннеров и куки-окон.
   Чистый модуль без зависимостей: используется и в main, и в renderer, и в тестах. */
(function () {
  /* известные рекламные/попапные серверы (точное совпадение или поддомен) */
  const AD_HOSTS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adservice.google.com', 'adservice.google.ru',
    'adnxs.com', 'adsrvr.org', 'adnxs-simple.com',
    'criteo.com', 'criteo.net',
    'taboola.com', 'outbrain.com', 'revcontent.com', 'mgid.com',
    'adfox.ru', 'yandexadexchange.net', 'an.yandex.ru', 'yabs.yandex.ru',
    'zedo.com', 'pubmatic.com', 'rubiconproject.com', 'openx.net', 'openx.com',
    'moatads.com', 'scorecardresearch.com', 'quantserve.com',
    'popads.net', 'popcash.net', 'propellerads.com', 'adcash.com',
    'adsterra.com', 'exoclick.com', 'juicyads.com', 'hilltopads.net',
    'adriver.ru', 'adlegend.com', 'adizio.com', 'adblade.com',
    'bidbarrel.com', 'bidvertiser.com', 'chitika.com', 'clicksor.com',
    'conversantmedia.com', 'coxmt.com', 'dtscout.com', 'effectivemeasure.net',
    'emxdgt.com', 'eyereturn.com', 'fast-adv.it', 'fimserve.com',
    'firstadsolution.com', 'fmpub.net', 'free-counter.co.uk', 'funklicks.com',
    'fusionads.net', 'fxj.com', 'game-advertising-online.com', 'getclicky.com',
    'go2jump.org', 'gocarrot.com', 'ads.google.com',
    'ads.yahoo.com', 'advertising.com', 'adalliance.io', 'adform.com',
    'adform.net', 'adgear.com', 'adition.com', 'adkernel.com', 'adloox.com',
    'adman.gr', 'admatic.com.tr', 'admaxim.com', 'admedia.com', 'admicro.vn',
    'admixer.net', 'admob.com', 'adnami.io', 'adnium.com', 'adop.cc',
    'adocean.pl', 'adotmob.com', 'adpone.com', 'adrecover.com', 'adrevolver.com',
    'adrta.com', 'ads-twitter.com', 'adsafeprotected.com', 'adsco.re',
    'adservinginternational.com', 'adsrv.eacdn.com', 'adsymptotic.com',
    'adtelligent.com', 'ad-up.ru', 'advmaker.ru', 'adwile.com', 'adxpose.com',
    'adyoulike.com', 'adzouk.com', 'a8.net', 'affiliatewindow.com', 'amung.us',
    'analyticsquery.com', 'appnexus.com', 'atemda.com',
    'atwola.com', 'auditude.com', 'avazutracking.net', 'bannersnack.com',
    'bat.bing.com', 'bidswitch.net', 'bluekai.com', 'bnmla.com', 'bttrack.com',
    'buysellads.com', 'capturehigher.com', 'casalemedia.com', 'chartbeat.com',
    'chartboost.com', 'clickbank.net', 'clickfuse.com', 'clicksor.net',
    'clicktale.net', 'cointraffic.io', 'collarity.com', 'commander1.com',
    'contextweb.com', 'cpro.baidustatic.com', 'cpxinteractive.com',
    'crazyegg.com', 'criteo.net', 'cuelinks.com', 'dable.io', 'demdex.net',
    'domdex.com', 'dotomi.com', 'doublepimp.com',
    'eadsrv.com', 'emitad.com', 'engagebdr.com', 'eu1.madsone.com',
    'eyereturn.com', 'ezoic.net', 'fiftyt.com', 'flashtalking.com',
    'freeonlineusers.com', 'gdeslon.ru', 'geo.digitalpoint.com',
    'getintent.com', 'gmossp-sp.jp', 'gumgum.com',
    'hitslink.com', 'hotwords.com', 'hpmdnetwork.ru', 'hurra.com',
    'hydramedia.com', 'ib-ibi.com', 'id5-sync.com', 'imarketservices.com',
    'implecity.com', 'imrworldwide.com', 'infolinks.com', 'innovid.com',
    'insightexpressai.com', 'intellitxt.com', 'ipredictive.com', 'jsecoin.com',
    'kixer.com', 'lijit.com', 'linksynergy.com', 'liveadexchanger.com',
    'lkqd.com', 'localadbuy.com', 'lucidmedia.com', 'madadsmedia.com',
    'matomy.com', 'maxymiser.net', 'mb01.com', 'media-servers.net',
    'media.net', 'media6degrees.com', 'mediamath.com', 'mediaplex.com',
    'mediav.com', 'medyanetads.com', 'megaclick.com', 'mgidcdn.com',
    'miarroba.com', 'microad.jp', 'mocean.mobi', 'mobytrks.com',
    'monetizemore.com', 'morgdm.ru', 'mxptint.net', 'mythings.com',
    'n149adserv.com', 'nakanohito.jp', 'native-hr.com', 'nativo.com',
    'navegg.com', 'netseer.com', 'newsflare.com', 'nexac.com', 'nster.net',
    'o2online.deads', 'oascentral.com', 'omnitagjs.com', 'onaudience.com',
    'oneiota.co.uk', 'onetag-sys.com', 'openxadexchange.com',     'opera-adv.com',
    'optimized-by.rubiconproject.com', 'otm-r.com',
    'overflowad.com', 'partner-ads.com', 'performax.cz',
    'pgmediaserve.com', 'phluant.com', 'pippio.com',
    'placelocal.com', 'plugrush.com', 'pocketmath.com',
    'pointroll.com', 'postrelease.com',
    'precisionclick.com', 'predictad.com', 'primead.jp',
    'pro-market.net', 'protagcdn.com',
    'provenpixel.com', 'psma02.com', 'pubmine.com', 'pulsepoint.com',
    'qservz.com', 'quantcast.com', 'quantumdex.io', 'quisma.com',
    'r.com', 'r66net.com', 'reporo.net', 'retargetssl.com', 'rfihub.com',
    'richmedia247.com', 'rlcdn.com',
    'rtbhouse.com', 'rubiconproject.com', 'rutarget.ru',
    'sailthru.com', 'scarabresearch.com', 'sekindo.com',
    'servebom.com', 'servedby-buysellads.com', 'sexad.net',
    'sharethrough.com', 'shinobi.jp', 'shorte.st', 'simpli.fi',
    'smartadserver.com', 'smaato.net', 'smilewanted.com',
    'sociomantic.com', 'solvemedia.com', 'sonobi.com', 'sovrn.com',
    'specificclick.net', 'specificmedia.com', 'spoutable.com',
    'springserve.com', 'statcounter.com', 'stickyadstv.com',
    'streamrail.com', 'sxp.smartclip.net', 'synacor.com',
    'tacoda.net', 'tagan.ru', 'targetnet.com', 'tbn.ru', 'teads.tv',
    'teracent.net', 'theadex.com', 'theadhost.com',
    'thinkrealtime.com', 'tidaltv.com', 'tinypass.com',

    'tns-counter.ru', 'tnsnet.ru', 'toplist.cz',
    'trafficjunky.net', 'trafmag.com',
    'tremorhub.com', 'trhnt.com', 'trk42.net',
    'trustx.org', 'tubemogul.com', 'tynt.com', 'ucfunnel.com', 'undertone.com',
    'unrulymedia.com', 'usemax.de', 'valueclick.com', 'valueclickmedia.com',
    'vdopia.com', 'velti.com', 'venatusmedia.com',
    'veruta.com', 'vibrant.co', 'videoegg.com', 'videologygroup.com',
    'visiblemeasures.com', 'visualdna.com', 'w55c.net', 'warlog.ru',
    'weborama.com', 'weborama.fr', 'webtraffic.se',
    'wtp101.com', 'xaxis.com', 'yieldlab.net', 'yieldmanager.com', 'yieldmo.com',
    'yottos.com', 'z5x.net', 'zanox.com', 'zemanta.com',
    'zone-media.eu', 'zucks.net', 'zv1.nov.ru',
  ].map(s => String(s).toLowerCase().replace(/[^a-z0-9.\-]/g, '')).filter(s => s.indexOf('.') > 0)

  /* мусорные записи без точки отсеяны выше; точное совпадение или поддомен */
  function adBlocked (host) {
    const h = String(host || '').toLowerCase().replace(/\.$/, '')
    if (!h || h === 'localhost') return false
    for (let i = 0; i < AD_HOSTS.length; i++) {
      const d = AD_HOSTS[i]
      if (h === d || h.slice(-d.length - 1) === '.' + d) return true
    }
    return false
  }

  /* прячем рекламные блоки на странице */
  const AD_CSS = [
    '.adsbygoogle', '.adsense', '[id^="div-gpt-ad"]', '[id*="google_ads"]',
    '.ad-banner', '.ad-container', '.ad-wrapper', '.advertisement', '.advert',
    '.banner-ad', '#banner-ad', '.popup-ad', '.interstitial-ad', '.video-ads',
    'div[id^="yandex_rtb"]', 'div[id^="adfox_"]',
    '#taboola', '[id^="taboola-"]', '.outbrain', '[id^="outbrain-"]',
    'iframe[src*="googlesyndication"]', 'iframe[src*="doubleclick"]',
    'iframe[src*="adnxs"]', 'iframe[src*="criteo"]', 'iframe[src*="taboola"]'
  ].join(',') + '{display:none!important}'

  /* прячем окна согласия на куки */
  const COOKIE_CSS = [
    '#onetrust-banner-sdk', '#onetrust-consent-sdk', '.onetrust-pc-dark-filter',
    '#qc-cmp2-container', '#qc-cmp2-ui', '.qc-cmp2-container',
    '#fc-consent-root', '.fc-consent-root',
    '.cookie-banner', '#cookie-banner', '.cookie-consent', '#cookie-consent',
    '.cookie-notice', '#cookie-notice', '.cookie-policy-banner',
    '.gdpr-banner', '#gdpr-banner', '.consent-banner', '#consent-banner',
    '.privacy-banner', '.eu-cookie', '.cc-window', '.cc-banner',
    '#CybotCookiebotDialog', '.CookiebotDialog',
    '#sp_message_container', '.sp_message_container',
    '.cookies-eu', '#cookies-eu', '.js-cookie-banner',
    '#truste-consent-track', '.truste_box_overlay', '.truste_box',
    '#portal-cookieinfo', '#cookie-law-info-bar', '.cookie-law-info-bar'
  ].join(',') + '{display:none!important}'

  const api = { AD_HOSTS, AD_CSS, COOKIE_CSS, adBlocked }
  if (typeof window !== 'undefined') window.VioBlock = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})()
