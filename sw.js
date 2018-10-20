importScripts('/js/idb.js');
// importScripts('/js/dbhelper.js');

// open/create idb.
const dbPromise = idb.open('restaurants-store', 2, upgradeDB => {
  switch(upgradeDB.oldVersion) {
    case 0:
    upgradeDB.createObjectStore("restaurants", {keyPath: "id"})
    case 1:
      {
        const reviewsStore = upgradeDB.createObjectStore("reviews", {keyPath: "id"});
        reviewsStore.createIndex("restaurant_id", "restaurant_id");
      }
    case 2:
      upgradeDB.createObjectStore("pending", {
        keyPath: "id",
        autoIncrement: true
      });
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
function getRestaurantsfromIndexedDB(ajaxurl, id) {
  // let restaurantId = ajaxurl.pathname.split('/').slice(-1)[0];// get last item(restaurants/id)
  // restaurantId = restaurantId == 'restaurants' ? -1 : restaurantId; //store id
  let restaurantId = id;
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

function getReviewsfromIndexedDB(event, id){
  event.respondWith(dbPromise.then(db => {
    return db
      .transaction("reviews")
      .objectStore("reviews")
      .index("restaurant_id")
      .getAll(id);
  }).then(idbreviews => {
    console.log("idb reviews: ", idbreviews);
    return (idbreviews.length && idbreviews) || fetch(event.request)
      .then(fetchResponse => fetchResponse.json())
      .then(fetchedReviews => {
        return dbPromise.then(db => {
          const tx = db.transaction("reviews", "readwrite");
          const store = tx.objectStore("reviews");
          fetchedReviews.forEach(review => {
            store.put({id: review.id, "restaurant_id": review["restaurant_id"], data: review});
          })
          return fetchedReviews;
        })
      })
  }).then(finalResponse => {
    if (finalResponse[0].data) {
      const formatResponse = finalResponse.map(review => review.data);
      return new Response(JSON.stringify(formatResponse));
    }
    return new Response(JSON.stringify(finalResponse));
  }).catch(error => {
    return new Response("Error fetching data", {status: 500})
  }))
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
  const requestURL = new URL(eventReq.url);

  if (requestURL.port === "1337") {

      const splitURL = requestURL.pathname.split("/");
      let id = requestURL.searchParams.get("restaurant_id") - 0;
      if (!id) {
        if (requestURL.pathname.indexOf("restaurants")) {
          id = splitURL[splitURL.length - 1] === "restaurants"? "-1": splitURL[splitURL.length - 1];
        } else {
          id = requestURL.searchParams.get("restaurant_id");
        }
      }
      handleAJAXEvent(event, id);
  }else{
    event.respondWith(fromCache(eventReq));
  }
});


const handleAJAXEvent = (event, id) => {
  if (event.request.method !== "GET") {
    console.log("handling ajax from sw::method type: ", event.request.method);
    return;
  }

  if (event.request.url.indexOf("reviews") > -1) {
    getReviewsfromIndexedDB(event, id);
    return;
  } else {
    event.respondWith(getRestaurantsfromIndexedDB(event.request.url, id));
  }
}
