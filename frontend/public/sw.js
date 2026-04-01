const CACHE_NAME = 'scs-platform-cache-v1'
const DYNAMIC_CACHE = 'scs-platform-dynamic-v1'

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/logo.png'
]

// Install Service Worker and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache')
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      )
    })
  )
})

// Intercept Fetch Requests for Offline-First Experience
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests (POST, PUT, DELETE for API)
  if (event.request.method !== 'GET') return

  // Stale-While-Revalidate strategy for API and Dynamic Routes
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache successful dynamic responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      }).catch(() => {
        // If network fails and no cache exists, fallback to offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html')
        }
      })

      return cachedResponse || fetchPromise
    })
  )
})
