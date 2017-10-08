import axios from 'axios'
import { $ } from './bling';

function ajaxHeart(e) {
  e.preventDefault(); // prevent going to the API POST
  axios.post(this.action).then(res => {
    // the button within our form name's attribute = heart (this.heart)
    const isHearted = this.heart.classList.toggle('heart__button--hearted');
    // update the heartcount in nav
    $('.heart-count').textContent = res.data.hearts.length;
    if (isHearted) {
      this.heart.classList.add('heart__button--float');
      setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
    }
  }).catch(console.error);
}

export default ajaxHeart;
