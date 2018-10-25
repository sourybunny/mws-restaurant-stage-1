let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []
// const favorite = document.createElement('div');

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
let fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
let fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute('aria-label', neighborhood);
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
let fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
let fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    option.setAttribute('aria-label', cuisine);
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
let initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1Ijoic291cnlidW5ueSIsImEiOiJjamw2NHgzcTQxNDN1M2ttcTBqa3Rhd3Z4In0.wM0ei6e_qYC4YxhAjK-BgQ',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
//  window.initMap = () => {
//   let loc = {
//     lat: 40.722216,
//     lng: -73.987501
//   };
//   self.map = new google.maps.Map(document.getElementById('map'), {
//     zoom: 12,
//     center: loc,
//     scrollwheel: false
//   });
//   updateRestaurants();
// }

/**
 * Update page and map for current restaurants.
 */
let updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
let resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
let fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
let createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const picture = document.createElement('picture');
  const webpimagesource = document.createElement('source');
  const jpegimagesource = document.createElement('source');
  const image = document.createElement('img');

  // picture.id = 'restaurant-picture';
// set webp image path
  webpimagesource.srcset = DBHelper.webPImageUrlForRestaurant(restaurant);
  webpimagesource.type = 'image/webp';
// set jpeg image path
  jpegimagesource.srcset = DBHelper.ImageUrlForRestaurant(restaurant);
  jpegimagesource.type = 'image/jpeg';


  // image.id = 'restaurant-img';
  image.className = 'restaurant-img';
  image.src = DBHelper.ImageUrlForRestaurant(restaurant);
  image.alt = `${restaurant.name} Restaurant`;

  picture.appendChild(webpimagesource);
  picture.appendChild(jpegimagesource);
  picture.appendChild(image);
  li.append(picture);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  name.setAttribute('tabindex', '0');
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  neighborhood.setAttribute('tabindex','0');
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  address.setAttribute('tabindex','0');
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `More details about ${restaurant.name}`)
  // li.append(more)
  const favorite = document.createElement('div');
  const isFavorite = (restaurant["is_favorite"] && restaurant["is_favorite"].toString() === "true")
                      ? true : false;

  favorite.className = 'favorite-button';
  favorite.id = "fav-res"+restaurant.id;
  if (isFavorite) {
    favorite.innerHTML = '&#10084;';
  } else if (!isFavorite) {
    favorite.innerHTML = '&#9825;';
    // console.log(favorite);
  }
  favorite.onclick = (event) => {
    UpdateFavoriteRestaurant(restaurant.id, !restaurant.is_favorite);
  };

  const buttonSection = document.createElement('section');
  buttonSection.className = 'card-buttons';
  buttonSection.append(more);
  buttonSection.append(favorite);

  li.append(buttonSection);

  return li
}
const UpdateFavoriteRestaurant = (resID, favState) => {
  // console.log("resID from mainjs",resID)
  const favresID = document.getElementById("fav-res"+resID);
  // console.log("clicked favresID",favresID);
  const restaurant = self
    .restaurants
    .filter(r => r.id === resID)[0];
  if (!restaurant)
    return;
  restaurant["is_favorite"] = favState;

  favresID.onclick = (event) => {
    UpdateFavoriteRestaurant(restaurant.id, !restaurant.is_favorite);
  };
  //update database
  DBHelper.SaveFavoriteRestaurant(resID, favState.toString());
}
/**
 * Add markers for current restaurants to the map.
 */
let addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}

//  addMarkersToMap = (restaurants = self.restaurants) => {
//   restaurants.forEach(restaurant => {
//     // Add marker to the map
//     const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
//     google.maps.event.addListener(marker, 'click', () => {
//       window.location.href = marker.url
//     });
//     self.markers.push(marker);
//   });
// }
