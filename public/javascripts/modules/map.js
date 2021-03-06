import axios from 'axios'; // fetching ajax
import { $ } from './bling';


// to get users location:
// Video 21 from JavaScript30: Geolocation based Speedometer and Compass
// navigator.geolocation.getCurrentPosition

// Google map options
const mapOptions = {
  center: { lat: 43.2, lng: -79.8 },
  zoom: 10
};

function loadPlaces(map, lat = 43.2, lng = -79.8) {
  axios.get(`/api/v1/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) {
        res.flash('error', 'No places found');
      }
      // create a map bounds (fixes zoom to bounds of markers)
      const bounds = new google.maps.LatLngBounds();
      // create a window for hover over markers
      const infoWindow = new google.maps.InfoWindow();

      const markers = places.map(place => {
        const [placeLng, placeLat] = place.location.coordinates; // creates 2 variables
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);
        const marker = new google.maps.Marker({
          map,
          position
        });
        // attach data to the marker
        marker.place = place;
        return marker;
      });

      // when someone clicks on a marker, show details of place
      markers.forEach(marker => marker.addListener('click', function() {
        const html = `
          <div class="popup">
            <a href="/store/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}"/>
              <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
        `;
        infoWindow.setContent(html);
        infoWindow.open(map, this);
      }));

      // zoom map to fit markets (bounds)
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    }).catch(console.error);
}

function makeMap(mapDiv) {
  if (!mapDiv) return;
  // make map
  const map = new google.maps.Map(mapDiv, mapOptions);
  loadPlaces(map);
  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
  })
}

export default makeMap;
