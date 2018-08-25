// Install Service Worker(triggered by browser)
self.addEventListener("install", event => {
  console.log("sw is installing ...", event);
  event.waitUntil(
    caches.open("static")
      .then(cache => {
        console.log("Pre-Caching static content.");
        cache.add("js/main.js")
      })
  );
});

// Activate Service Worker(triggered by browser)
self.addEventListener("activate", event => {
  console.log("sw is activating...", event);
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
          return fetch(event.request);
        }
      })
  );
});
