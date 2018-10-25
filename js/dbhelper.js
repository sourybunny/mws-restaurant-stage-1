// import idb from "idb";
// importScripts('/js/idb.js');
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
const dbP = idb.open("restaurants-store");

window.addEventListener('online', () => {
  console.log('online')
  dbP.then(db => {
    db.transaction('pending', 'readonly')
      .objectStore('pending')
      .count()
      .then(requests => {
        console.log('Pending requests', requests)
        if (requests > 0) DBHelper.attemptCommitPendingReviews()
      })
  })
})


/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 ;// Change this to your server port
    return `http://localhost:${port}`;
  }


// cache the pending review to idb when offline
  static addPendingReviewToQueue(url, method, body) {
    console.log("adding pending review to pending table in idb:",body);
  dbP.then(db => {
    db.transaction("pending", "readwrite")
      .objectStore("pending")
      .put({
        data: {
          url,
          method,
          body
        }
      })
  })

}

// loop to commit pending reviews
static commitPendingReviews() {
  DBHelper.attemptCommitPendingReviews(DBHelper.commitPendingReviews);
}

static attemptCommitPendingReviews(callback) {

  dbP.then(db => {
    if (!db.objectStoreNames.length) {
      db.close();
      return;
    }

    db.transaction("pending", "readwrite")
      .objectStore("pending")
      .openCursor()
      .then(cursor => {
        if (!cursor) {
          return;
        }

        let url = cursor.value.data.url;
        let method = cursor.value.data.method;
        let body = cursor.value.data.body;
        console.log("from pending, POSTing to server:",url,method,body);

      // delete any bad review that has missing info
        if ((!url || !method) || (method === "POST" && !body)) {
          cursor
            .delete()
            .then(callback());
          return;
        };

        const postReview = {
          body: JSON.stringify(body),
          method: method
        }

        console.log("postReview from pending: ", postReview);
        // make a post request to url:localhost:1337/reviews/
        fetch(url, postReview)
          .then(response => {
            console.log(response);
        // if resp not ok, return
          if (!response.ok && !response.redirected) {
            return;
          }
        })
          .then(() => {
            console.log("posted to server from pending");
            db.transaction("pending", "readwrite")
              .objectStore("pending")
              .openCursor()
              .then(cursor => {
                cursor
                  .delete()
                  .then(() => {
                    callback();
                  })
              })
            console.log("deleted pending review from pending table");
          })
      })
      .catch(error => {
        console.log("Error reading cursor");
        return;
      })
  })
}

  /**
 * Update reviews with the new review in idb.
 */
static addNewReviewToIdb(restaurantId, review) {
  return dbPromise.then((db) => {
    if (!db) return;
    let tx = db.transaction('reviews', 'readwrite');
    let reviewsStore = tx.objectStore('reviews');
    reviewsStore.put({id: Date.now(),
        "restaurant_id": restaurantId,
        data: review});
    tx.complete;
    console.log("new review is cached to idb")
  });
}

  static saveNewReview(id, bodyObj, callback) {
    // let body = {
    //   restaurant_id: id,
    //   name: bodyObj.name,
    //   rating: bodyObj.rating,
    //   comments: bodyObj.comments,
    //   createdAt: Date.now(),
    //   updatedAt: Date.now()
    // }
    const url = DBHelper.DATABASE_URL + "/reviews/";
    const method = "POST";
    let body = bodyObj;
    const btn = document.querySelector('.review-submit');
    btn.onclick = null;//disable double click till review is saved
    console.log("adding new review to idb: ", body);
    DBHelper.addNewReviewToIdb(id, body);
    // if online, send review to server else, queue the new review.
    if (navigator.onLine) {
      DBHelper.sendReviewToDatabase(url, 'POST', body)
    } else DBHelper.addPendingReviewToQueue(url, 'POST', body)
      callback(null, null);
    }

//post new review to server if already online.

    static sendReviewToDatabase (url = '', method, body) {

        fetch(url, {
          method: 'post',
          body: JSON.stringify(body)
        })
          .then(response => {
            console.log('online: POSTing new review to server: ', response)
          })
          .catch(err => console.log('post to server failed', err))
      }

  static SaveFavoriteRestaurant(resId, newState) {
    const url = `${DBHelper.DATABASE_URL}/restaurants/${resId}/?is_favorite=${newState}`;
    const method = 'PUT';
    const favBtn = document.getElementById("fav-res"+resId);
    // favBtn.onclick = null;
    console.log("favBtn:",favBtn);
    console.log("updating fav to idb: ",resId , newState);
    // updateUI
    if(newState=="true"){
      favBtn.innerHTML = '&#10084;';
    }else {
      favBtn.innerHTML = '&#9825;';
    }
    DBHelper.UpdateFavoriteRestaurantToIdb(resId, newState);

    if (navigator.onLine) {
      console.log("online: updating fav")
      DBHelper.UpdateFavoriteToDatabase(url, method)
    } else {
      DBHelper.addPendingReviewToQueue(url, method, null)
    console.log("offline, adding fav to pending");
  }
      // callback(null, {resId, value: newState});

  }

  static UpdateFavoriteRestaurantToIdb(resId, newState) {
    dbP.then(db => {
      const tx = db.transaction("restaurants", "readwrite");
      const oldresdata = tx.objectStore("restaurants")
                          .get("-1")
                          .then(data => {
                            // console.log(data);
                            if(!data){
                              console.log("idb restaurants is empty");
                              return;
                            }
      const resdata = data.data;
      console.log(resdata);
      const restaurantToUpdate = resdata.filter(restaurant => restaurant.id === resId)[0];
      console.log(" restaurant to update in idb is: ",restaurantToUpdate);
      // update restaurantToUpdate
      restaurantToUpdate.is_favorite = newState;
      // data is now updated with new data
      dbP.then(db => {
          const tx = db.transaction("restaurants", "readwrite");
          tx
            .objectStore("restaurants")
            .put({id: "-1", data: resdata});
          return tx.complete;
        })
                          })
    })
  }
  static UpdateFavoriteToDatabase(url, method){
    return fetch(url, {
      method: method
    });
    console.log("updated fav to db")
  }
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(DBHelper.DATABASE_URL + '/restaurants')
      .then(response => {
        return response.json();
      })
      .then(restaurants => callback(null, restaurants))
      .catch(err => callback(err, null));
  }

// fetch reviews for a specific restaurant
  static fetchRestaurantReviewsById(id, callback) {

    const fetchURL = DBHelper.DATABASE_URL + `/reviews/?restaurant_id=${id}`;
    fetch(fetchURL)
      .then(response => response.json())
      .then(data => callback(null, data))
      .catch(err => callback(err, null));
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static webPImageUrlForRestaurant(restaurant) {
      return (`/dist/img/webp/${restaurant.id}.webp`);
    }

  static ImageUrlForRestaurant(restaurant) {
      return (`/img/${restaurant.id}.jpg`);
    }
  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  }
  //  static mapMarkerForRestaurant(restaurant, map) {
  //   const marker = new google.maps.Marker({
  //     position: restaurant.latlng,
  //     title: restaurant.name,
  //     url: DBHelper.urlForRestaurant(restaurant),
  //     map: map,
  //     animation: google.maps.Animation.DROP}
  //   );
  //   return marker;
  // }

}
