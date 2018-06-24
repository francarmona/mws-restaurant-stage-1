import IdbRestaurants from './idbrestaurants';
import DBHelper from './dbhelper';

export default class Utils {

  static castToBoolean(value) {
    if(typeof value === 'string' || value instanceof String){
      return value === 'false' ? false : true;
    }
    return value;
  }

  static createFavoriteHTML(restaurant) {
    const favorite = document.createElement('div');
    const heartCheckbox = document.createElement('input');
    heartCheckbox.setAttribute('type', 'checkbox');
    heartCheckbox.setAttribute('id', `heart${restaurant.id}`);
    heartCheckbox.checked = Utils.castToBoolean(restaurant.is_favorite);
    heartCheckbox.addEventListener('change', function(){
      // Update favorite status
      DBHelper.updateFavoriteRestaurant(restaurant.id, this.checked).then((restaurant) => {
        IdbRestaurants.update(restaurant);
      });
    });
    const label = document.createElement('label');
    label.setAttribute('for', `heart${restaurant.id}`);
    label.innerHTML = '❤';
    const labelText = document.createElement('span');
    labelText.className = 'favorite-text';
    labelText.innerHTML = ' Favourite';
    label.append(labelText);
    favorite.append(heartCheckbox);
    favorite.append(label);
    return favorite;
  }

}