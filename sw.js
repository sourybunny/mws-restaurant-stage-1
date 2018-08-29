importScripts('/js/idb.js');
importScripts('/js/dbhelper.js');

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


function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) {
    console.log('matched ', string);
    cachePath = string.substring(self.origin.length); //path: after localhost:8000
  } else {
    cachePath = string; //for links, copy full path
  }
  return array.indexOf(cachePath) > -1;
}

self.addEventListener('fetch', function (event) {
  console.log(event.request);
// var url= DBHelper.fetchURL;
var url="dummyURL";//futureuse
// console.log(url);
//   // var url = DBHelper.DATABASE_URL; //url for which this strategy is to be applied
//   // console.log("dbhelper url",url);
//   if (event.request.url.indexOf(url) > -1) {
//     event.respondWith(fetch(event.request)
//             // .then(function (res) {
//             // var clonedRes = res.clone();
//             // clearAll('restaurants')
//             // .then(function(){
//             //   return clonedRes.json();
//             // })
//             // .then(function(data){
//             //   for(var key in data){
//             //     writeToIdb('restaurants', data[key]);
//             //   }
//             // });
//               // return res;
//         })
//     );

  if (event.request.url.indexOf(url) > -1) {  //if req url is same then only continue this strategy
    event.respondWith(
      caches.open(dynamic_cache) //cache dynamic content by dynamically caching
        .then(function(cache){
          return fetch(event.request) //return n/w response and then store in cache too
          .then(function(netres){
            cache.put(event.request, netres.clone());//make copy
            return netres;
          });
        })

    );

    // cache only for basic static assets
  } else if (isInArray(event.request.url, static_files)) {
    event.respondWith(
      caches.match(event.request)
    );
    // cache ,then n/w serve offline page
    //dynamically caching visited content in a cache[dynamic_cache]
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(function (response) {
          if (response) {
            return response;
          } else {
            return fetch(event.request)
              .then(function (res) {
                return caches.open(dynamic_cache)
                  .then(function (cache) {
                    cache.put(event.request.url, res.clone());
                    return res;
                  })
              })
              .catch(function (err) {
                return caches.open(static_cache)
                  .then(function (cache) {
                    if (event.request.headers.get('accept').includes('text/html')) {
                      return cache.match('offline.html');
                    }
                  });
              });
          }
        })
    );
  }
});

// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.match(event.request)
//       .then(function(response) {
//         if (response) {
//           return response;
//         } else {
//           return fetch(event.request)
//             .then(function(res) {
//               return caches.open(dynamic_cache)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//             })
//             .catch(function(err) {
//               return caches.open(static_cache)
//                 .then(function(cache) {
//                   return cache.match('offline.html');
//                 });
//             });
//         }
//       })
//   );
// });
// n/w then cache (store in cache)
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function(res) {
//         return caches.open(dynamic_cache)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//       })
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });

// Cache-only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     caches.match(event.request)
//   );
// });

// Network-only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });


// Respond with fetch (triggered by application)
// self.addEventListener("fetch", event => {
//   console.log("sw is fetching something...", event);
//   event.respondWith(
//     caches.match(event.request)
//       .then(response => {
//         if (response) {
//           return response;
//         }else {
//           // make server (fetch) request
//           return fetch(event.request)
//             .then(networkres => {
//               // store req and res for future use
//               return caches.open(dynamic_cache)
//                 .then(cache => {
//                   // res is consumed once, so make a clone
//                   console.log("event request", event.request.url);
//                   cache.put(event.request.url, networkres.clone());
//                   return networkres;
//                 })
//             })
//                 .catch(err => {
//                   return caches.open(static_cache)
//                   .then(cache => {
//                     return cache.match("offline.html")
//                   })
//                 });
//         }
//       })
//   );
// });
