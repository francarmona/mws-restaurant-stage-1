import * as idb from '../../node_modules/idb';

let _dbPromise;
export default class IdbRestaurants {

  static get db() {
    if(!_dbPromise){
      IdbRestaurants.createDb();
    }
    return _dbPromise;
  }

  static createDb() {
    _dbPromise = idb.open('restaurantsDb', 1, function(upgradeDB) {
      upgradeDB.createObjectStore('restaurants', {
        keyPath: 'id'
      });
      upgradeDB.createObjectStore('reviews', {
        keyPath: 'id',
      }).createIndex('restaurant_id', 'restaurant_id');
      upgradeDB.createObjectStore('pendingReviews', {
        keyPath: 'id',
        autoIncrement: true
      });
    });
  }

  static save(restaurants) {
    IdbRestaurants.db.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      restaurants.map((restaurant) => {
        tx.objectStore('restaurants').put(restaurant);
      });
    });
  }

  static update(restaurant) {
    IdbRestaurants.db.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      tx.objectStore('restaurants').put(restaurant);
    });
  }

  static saveRestaurantReviews(reviews) {
    IdbRestaurants.db.then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      reviews.map((review) => {
        tx.objectStore('reviews').put(review);
      });
    });
  }

  static saveRestaurantReview(review) {
    IdbRestaurants.db.then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      tx.objectStore('reviews').put(review);
    });
  }

  static saveRestaurantPendingReview(pendingReview) {
    IdbRestaurants.db.then(db => {
      const tx = db.transaction('pendingReviews', 'readwrite');
      console.log(pendingReview);
      tx.objectStore('pendingReviews').put(pendingReview);
    });
  }

  static deleteRestaurantPendingReview(id) {
    IdbRestaurants.db.then(db => {
      const tx = db.transaction('pendingReviews', 'readwrite');
      tx.objectStore('pendingReviews').delete(id);
    });
  }

  static getAllPendingReviews() {
    return IdbRestaurants.db.then(db => {
      return db.transaction('pendingReviews')
        .objectStore('pendingReviews').getAll();
    });
  }

  static getAll() {
    return IdbRestaurants.db.then(db => {
      return db.transaction('restaurants')
        .objectStore('restaurants').getAll();
    });
  }

  static getAllReviews() {
    return IdbRestaurants.db.then(db => {
      return db.transaction('reviews')
        .objectStore('reviews').getAll();
    });
  }

  static getRestaurantReviews(idRestaurant) {
    return IdbRestaurants.db.then(db => {
      return db.transaction('reviews')
        .objectStore('reviews')
        .index('restaurant_id')
        .getAll(parseInt(idRestaurant));
    });
  }

}