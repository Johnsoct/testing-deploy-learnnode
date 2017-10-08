export default function autocomplete(input, latInput, lngInput) {
  if(!input) return; // bail if no input on page
  const dropdown = new google.maps.places.Autocomplete(input); // Autocompletes via google maps within #address input

  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace(); // google maps api object returning object on the location
    latInput.value = place.geometry.location.lat(); // getPlace returned object function
    lngInput.value = place.geometry.location.lng(); // getPlace returned object function
  });

  // If someone enters enter on the address field, don't submit the form
  input.on('keydown', (e) => { // function of bling.js
    if(e.keyCode === 13) {
      e.preventDefault(); // prevents page from refreshing if user hits enter to autocomplete a location in #address
    }
  });
}