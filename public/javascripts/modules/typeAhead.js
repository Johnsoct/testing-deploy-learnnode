import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
  return stores.map(store => {
    return `
    <a href="/store/${store.slug}" class="search__result">
      <strong>${store.name}</strong>
    </a>
    `;
  }).join(''); // returns a single string (chunk of HTML) instead of an array of 3
}

function typeAhead(search) {
  // if no search | kill if search somehow isn't on page
  if (!search) return;

  // found within layout.pug (search bar)
  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  // .on is short for .addEventListener using bling.js
  // 'input' is when a user inputs a value into searchInput
  searchInput.on('input', function() {
    // if there is no value, KILL | if a user inputs and then deletes it all
    if (!this.value) {
      searchResults.style.display = 'none';
      return; //
    }

    // show the search results
    searchResults.style.display = 'block';
    searchResults.innerHTML = '';

    axios
      .get(`/api/v1/search?q=${this.value}`)
      .then(res => {
        // There are some results
        if (res.data.length) {
          const html = searchResultsHTML(res.data); // unnecessary
          // to prevent XSS attack, always sanitize custom inserted/written HTML
          searchResults.innerHTML = dompurify.sanitize(html);
          return;
        }
        // if nothing came back
        // to prevent XSS attack, always sanitize custom inserted/written HTML
        searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results found for ${this.value} found!</div>`);
      }).catch(err => {
        console.error(err);
    });
  });

  // Handle keyboard inputs
  searchInput.on('keyup', (e) => {
    // if aren't pressing up, down, or enter, who gives a fuck
    if (![38, 40, 13].includes(e.keyCode)) {
      return; // nah
    }
    // set .active
    const active = 'search__result--active';
    // find current active
    const current = search.querySelector(`.${active}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    // press down
    if (e.keyCode === 40 && current) {
      // if no next sibling, set to the first item
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) { // press down and no active yet
      next = items[0];
    } else if (e.keyCode === 38 && current) { // press up
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) { // press enter
      window.location = current.href;
      return; // stops function from running if change location
    }
    if (current) {
      current.classList.remove(active);
    }
    next.classList.add(active);
  });
};

export default typeAhead;
