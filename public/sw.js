importScripts('https://cdn.jsdelivr.net/npm/workbox-cdn@4.3.1/workbox/workbox-sw.js')
workbox.setConfig({
  modulePathPrefix: 'https://cdn.jsdelivr.net/npm/workbox-cdn@4.3.1/workbox/'
})

workbox.routing.registerRoute(
  /^https:\/\/cdn\.jsdelivr\.net\/gh\/pwxcoo\/chinese-xinhua/,
  new workbox.strategies.CacheFirst({
    cacheName: 'user-json-cache',
    plugins: [
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.Plugin({
        // 30 Days Cache
        maxAgeSeconds: 60 * 60 * 24 * 30,
        maxEntries: 30,
      })
    ]
  })
)

workbox.routing.registerRoute(
  /.*\.(js|css)$/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-file-cache'
  })
)

workbox.routing.setDefaultHandler(
  new workbox.strategies.NetworkFirst({
    options: [{
      networkTimeoutSeconds: 10,
    }]
  })
)