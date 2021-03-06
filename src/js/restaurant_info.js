/*global google*/
import DBHelper from './dbhelper';
import ImgUtils from './imgutils';
import LazyImgs from './lazyImgs';
import 'whatwg-fetch';
import 'intersection-observer';
import Utils from './utils';
import IdbRestaurants from './idbrestaurants';

class RestaurantInfo {
  constructor() {
    this.restaurant = undefined;
    this.map = undefined;
    this.initMap();
    window.addEventListener('online',  () => {
      this.syncPendingReviews();
    });
  }

  /**
   * Initialize Google map, called from HTML.
   */
  initMap() {
    window.initMap = () => {
      this.fetchRestaurantFromURL((error, restaurant) => {
        if (error) { // Got an error!
          console.error(error);
        } else {
          this.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 16,
            center: restaurant.latlng,
            scrollwheel: false
          });
          this.fillBreadcrumb();
          DBHelper.mapMarkerForRestaurant(this.restaurant, this.map);
        }
      });
    };
  }

  /**
   * Get current restaurant from page URL.
   */
  fetchRestaurantFromURL(callback) {
    if (this.restaurant) { // restaurant already fetched!
      callback(null, this.restaurant);
      return;
    }
    const id = this.getParameterByName('id');
    if (!id) { // no id found in URL
      callback('No restaurant id in URL', null);
    } else {
      DBHelper.fetchRestaurantReviews(id).then((reviews) => {
        DBHelper.fetchRestaurantById(id)
          .then((restaurant) => {
            this.restaurant = restaurant;
            this.restaurant.reviews = reviews;
            this.fillRestaurantHTML();
            new LazyImgs('.restaurant-img');
            this.setSubmitReviewHandler(id);
            callback(null, restaurant);
          })
          .catch((error) => {
            console.error(error);
          });
      });

    }
  }

  /**
   * Create restaurant HTML and add it to the webpage
   */
  fillRestaurantHTML(restaurant = this.restaurant) {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
    image.alt = ImgUtils.getAlternateById(restaurant.id - 1);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
      this.fillRestaurantHoursHTML();
    }
    // create favorite heart
    document.querySelectorAll('.restaurant-wrapper')[1].append(Utils.createFavoriteHTML(restaurant));
    // fill reviews
    this.fillReviewsHTML();

  }

  /**
   * Create restaurant operating hours HTML table and add it to the webpage.
   */
  fillRestaurantHoursHTML(operatingHours = this.restaurant.operating_hours) {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
      const row = document.createElement('tr');

      const day = document.createElement('td');
      day.innerHTML = key;
      row.appendChild(day);

      const time = document.createElement('td');
      time.innerHTML = operatingHours[key];
      row.appendChild(time);

      hours.appendChild(row);
    }
  }

  /**
   * Create all reviews HTML and add them to the webpage.
   */
  fillReviewsHTML(reviews = this.restaurant.reviews) {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(this.createReviewHTML(review));
    });
    container.appendChild(ul);
  }

  /**
   * Create review HTML and add it to the webpage.
   */
  createReviewHTML(review) {
    const li = document.createElement('li');
    const divContainer = document.createElement('div');
    divContainer.className = 'review-header';
    const name = document.createElement('div');
    name.className = 'review-name';
    name.innerHTML = review.name;
    divContainer.appendChild(name);

    const date = document.createElement('div');
    date.className = 'review-date';
    date.innerHTML = new Date(review.createdAt).toDateString();
    divContainer.appendChild(date);

    li.appendChild(divContainer);

    const divContainerInfo = document.createElement('div');
    divContainerInfo.className = 'review-info';
    const rating = document.createElement('span');
    rating.className = 'review-rating';
    rating.innerHTML = `Rating: ${review.rating}`;
    divContainerInfo.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    divContainerInfo.appendChild(comments);

    li.appendChild(divContainerInfo);

    return li;
  }

  /**
   * Add restaurant name to the breadcrumb navigation menu
   */
  fillBreadcrumb (restaurant = this.restaurant) {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
  }

  /**
   * Get a parameter by name from page URL.
   */
  getParameterByName(name, url) {
    if (!url){
      url = window.location.href;
    }
    // eslint-disable-next-line no-useless-escape
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
      results = regex.exec(url);
    if (!results)
      return null;
    if (!results[2])
      return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  setSubmitReviewHandler(restaurantId) {
    document.getElementById('review-submit').addEventListener('click', (event) => {
      event.preventDefault();
      const review = {
        'restaurant_id': parseInt(restaurantId),
        'name': document.getElementById('reviewer-name').value,
        'rating': parseInt(document.querySelector('input[name="rating"]:checked').value),
        'comments': document.getElementById('review').value
      };
      DBHelper.createRestaurantReview(review).then((review) => {
        // Add review to list and to indexeddb
        IdbRestaurants.saveRestaurantReview(review);
        const ul = document.getElementById('reviews-list');
        ul.appendChild(this.createReviewHTML(review));
        document.querySelector('#form-review').reset().reset();
        this.setSuccesReviewMessage();
      }).catch(() => {
        if(!navigator.onLine){
          this.setErrorReviewMessage();
          IdbRestaurants.saveRestaurantPendingReview(review);
        }
        document.querySelector('#form-review').reset();
      });
    });
  }

  syncPendingReviews() {
    IdbRestaurants.getAllPendingReviews().then((pendingReviews) => {
      if(pendingReviews && pendingReviews.length > 0) {
        pendingReviews.forEach((pendingReview) => {
          DBHelper.createRestaurantReview(pendingReview).then((review) => {
            IdbRestaurants.saveRestaurantReview(review);
            IdbRestaurants.deleteRestaurantPendingReview(pendingReview.id);
            const ul = document.getElementById('reviews-list');
            ul.appendChild(this.createReviewHTML(review));
            this.setSuccesReviewMessage();
          });
        });
      }
    });
  }

  setSuccesReviewMessage() {
    document.querySelector('.review-status-message').innerHTML = 'Your review has been succesfully submitted.';
    document.querySelector('.review-status-wrapper').classList.add('success');
    document.querySelector('.review-status-wrapper').classList.remove('error');
  }

  setErrorReviewMessage() {
    document.querySelector('.review-status-message').innerHTML = 'You have not internet connection! Your review will be submitted as soon as you go online.';
    document.querySelector('.review-status-wrapper').classList.add('error');
    document.querySelector('.review-status-wrapper').classList.remove('success');
  }
}

new RestaurantInfo();
