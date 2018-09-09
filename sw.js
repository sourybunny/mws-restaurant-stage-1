importScripts('/js/idb.js');
// importScripts('/js/dbhelper.js');

// open/create idb.
const dbPromise = idb.open('restaurants-store', 1, upgradeDB => {
  switch(upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore(
        'restaurants',
        {
          keyPath: 'id',
        }
      );
  }
});

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

//handle ajax-request, cache json data in idb
// ajaxurl:
// locallhost:1337/restaurants/
// localhost:1337/restaurants/id
function fromIndexedDB(ajaxurl) {
  let restaurantId = ajaxurl.pathname.split('/').slice(-1)[0];// get last item(restaurants/id)
  restaurantId = restaurantId == 'restaurants' ? -1 : restaurantId; //store id
// read from idb first
    return dbPromise.then(db => {
      const tx = db.transaction('restaurants',"readonly");
      const store = tx.objectStore('restaurants');
      return store.get(restaurantId)
      .then(cacheres => {
        if (cacheres) {
          return cacheres.data;//return idb data
        }
          return fetch(ajaxurl).then(res => {//fetch from network
          return res.json();
        }).then(restaurants => {
            console.log("restaurants data: ",restaurants);//json data
            dbPromise.then(db => {//store in idb
              const tx = db.transaction("restaurants", "readwrite");
              const store = tx.objectStore("restaurants");
              store.put({id: restaurantId, data: restaurants});
            });
          return restaurants;//return json data
        });
      }).then(restaurants => {
        return new Response(JSON.stringify(restaurants));
      });
    });
}

// handle non-ajax requests
//cache API
function fromCache(nonajaxreq) {
  //first check in cache
return caches.match(nonajaxreq)
          .then(function (response) {
            if (response) {
              return response;//return cache data
            } else {
              return fetch(nonajaxreq)//make network req
                .then(function (res) {
                  return caches.open(dynamic_cache)
                    .then(function (cache) {
                      cache.put(nonajaxreq.url, res.clone());//sttore req,res
                      return res;
                    })
                })
                .catch(function (err) {
                  return caches.open(static_cache)
                    .then(function (cache) {
                      if (nonajaxreq.headers.get('accept').includes('text/html')) {
                        return cache.match('offline.html');
                      }
                    });
                });
            }
          })
}

//handle/intercept all fetch events.
self.addEventListener('fetch', event => {
  const eventReq = event.request;
  console.log("from sw,fetch event req:" ,eventReq);
  const url = new URL(eventReq.url);
  console.log("from sw:: requested url:" ,url);
  if(url.port === '1337'){
    event.respondWith(fromIndexedDB(url));
  }else{
    event.respondWith(fromCache(eventReq));
  }
});
