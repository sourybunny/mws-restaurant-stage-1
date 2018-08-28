importScripts('/src/js/idb.js');

let static_cache = 'static-v2';
let dynamic_cache = 'dynamic-v2';

var static_files = [
  'index.html',
  'restaurant.html',
  'offline.html',
  '/css/styles.css',
  '/js/dbhelper.js',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/register.js',
  '/js/idb.js',
  '/img/1.jpg',
  '/img/2.jpg',
  '/img/3.jpg',
  '/img/4.jpg',
  '/img/5.jpg',
  '/img/6.jpg',
  '/img/7.jpg',
  '/img/8.jpg',
  '/img/9.jpg',
  '/img/10.jpg'
];
// Install Service Worker(triggered by browser)
self.addEventListener("install", event => {
  console.log("sw is installing ...", event);
  event.waitUntil(
    caches.open(static_cache)
      .then(cache => {
        console.log("Pre-Caching static content.");
        cache.addAll(static_files);
      })
  );
});

// Activate Service Worker(triggered by browser)
self.addEventListener("activate", event => {
  console.log("sw is activating...", event);
  event.waitUntil(
    // array of sub-caches
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key != static_cache && key !=dynamic_cache){
            console.log("removing old cache: ",key);
            return caches.delete(key);
          }
        }));
      })
  );
  return self.clients.claim();
});

// Respond with fetch (triggered by application)
self.addEventListener("fetch", event => {
  // console.log("sw is fetching something...", event);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }else {
          // make server (fetch) request
          return fetch(event.request)
            .then(networkres => {
              // store req and res for future use
              return caches.open(dynamic_cache)
                .then(cache => {
                  // res is consumed once, so make a clone
                  cache.put(event.request.url, networkres.clone());
                  return networkres;
                })
            })
                .catch(err => {
                  return caches.open(static_cache)
                  .then(cache => {
                    return cache.match("offline.html")
                  })
                });
        }
      })
  );
});
