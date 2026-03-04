if (!customElements.get('s-care-content')) {
  customElements.define('s-care-content', class SectionCareContent extends HTMLElement {
    activeMenu = null;

    constructor() {
      super()
    }

    connectedCallback() {
      // this.supportButton = document.querySelector('.js-care-content__support-trigger');

      // if (this.supportButton) {
      //   this.supportButton.addEventListener('click', this.triggerSupportChat);
      // }

      if(this.dataset.hasFaq === 'true') {
        this.faqItems = Array.from(this.querySelectorAll('.js-care-content__faq-item'));
        this.searchInput = this.querySelector('.js-care-content__search-input');
        this.searchContainer = this.querySelector('.js-care-content__search-container');
        this.clearButton = this.querySelector('.js-care-content__remove-icon');

        this.faqItems.forEach(btn => {
          btn.addEventListener('click', this.toggleFaqButton)
        })
        this.searchInput.addEventListener('input', this.debounce(this.handleInputChange, 300) )
        this.clearButton.addEventListener('click', this.handleDelete)
      }
    }

    disconnectedCallback() {
      if(this.dataset.hasFaq === 'true') {
        this.faqItems.forEach(btn => {
          btn.removeEventListener('click', this.toggleFaqButton);
        })
      }

      // if (this.supportButton) {
      //   this.supportButton.removeEventListener('click', this.triggerSupportChat);
      // }
		}

    // triggerSupportChat = () => { // trigger zendesk chat button inside iframe
    //   const iframe = document.querySelector('#launcher');
    //   const innerDoc = (iframe.contentDocument) ? iframe.contentDocument : iframe.contentWindow.document;
    //   innerDoc.querySelector('button').click();
    // }

    handleInputChange = (event) => {
      let query = event.target.value.trim();

      if(query === '') {
        this.searchContainer.classList.remove('is-active');
        this.faqItems.forEach(item => {
          item.closest('.js-care-content__faq-wrapper').classList.remove('hide-content');
          item.classList.remove('is-active')
          item.classList.remove('is-hidden')
          item.querySelector('.js-care-content__faq-answer').innerHTML = item.querySelector('.js-care-content__faq-answer').innerText;
          item.querySelector('.js-care-content__faq-question').innerHTML = item.querySelector('.js-care-content__faq-question').innerText;
        });

        return
      } else {
        this.searchContainer.classList.add('is-active');
      }

      this.faqItems.forEach(item => {
        let question = item.querySelector('.s-care-content__faq-question').innerText;
        let answer = item.querySelector('.js-care-content__faq-answer').innerText;
        let regex = new RegExp(`(${query})`, 'gi');

        item.closest('.js-care-content__faq-wrapper').classList.add('hide-content');

        if(question.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || answer.toLocaleLowerCase().includes(query.toLocaleLowerCase())) {
          item.classList.remove('is-hidden');
          item.classList.add('is-active');
          item.querySelector('.s-care-content__faq-question').innerHTML = question.replace(regex, '<span class="highlight">$1</span>');
          item.querySelector('.js-care-content__faq-answer').innerHTML = answer.replace(regex, '<span class="highlight">$1</span>');
        } else {
          item.classList.add('is-hidden');
        }
      })
    }

    handleDelete = () => {
      this.searchInput.value = '';
      this.searchContainer.classList.remove('is-active')

      this.faqItems.forEach(item => {
        item.closest('.js-care-content__faq-wrapper').classList.remove('hide-content');
          item.classList.remove('is-active')
          item.classList.remove('is-hidden')
          item.querySelector('.js-care-content__faq-answer').innerHTML = item.querySelector('.js-care-content__faq-answer').innerText;
          item.querySelector('.js-care-content__faq-question').innerHTML = item.querySelector('.js-care-content__faq-question').innerText;
      });
    }

    toggleFaqButton = (event) => {
      if(event.target.closest('.js-care-content__faq-answer'))return

      let button = event.target.closest('.js-care-content__faq-item');

      if(this.activeMenu === button) {
        this.activeMenu.classList.remove('is-active');
        this.activeMenu = null;
        return
      }

      if(this.activeMenu) {
        this.activeMenu.classList.remove('is-active');
        this.activeMenu = null;
      }

      if(this.activeMenu === null && button.classList.contains('is-active')) {
        button.classList.remove('is-active');
        return
      }

      this.activeMenu = button;
      this.activeMenu.classList.toggle('is-active');
    }

    debounce(func, delay) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
      };
    }
  })
}
