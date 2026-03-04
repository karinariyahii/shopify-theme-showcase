if (!customElements.get("s-product-tabs")) {
  customElements.define(
    "s-product-tabs",
    class extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.tabs = this.querySelectorAll(".js-product-tabs__tab");
        this.swipers = this.querySelectorAll(".js-product-tabs__swiper-container");

        this.tabs.forEach((tab, index) => {
          tab.dataset.index = index;
          tab.addEventListener("click", this.onTabClick);
        });

        this.initObserver();
      }

      disconnectedCallback() {
        if (this.observer) this.observer.disconnect();

        this.tabs.forEach((tab) => {
          tab.removeEventListener("click", this.onTabClick);
        });
      }

      initObserver() {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                this.initAllSwipers();
                this.observer.unobserve(this);
              }
            });
          },
          { threshold: 0.1 }
        );

        this.observer.observe(this);
      }

      initAllSwipers() {
        this.swipers.forEach((swiper) => {
          this.checkSwiperCentering(swiper);

          if (!swiper.hasAttribute("init")) {
            swiper.setAttribute("init", "true");
          }
        });
      }

      checkSwiperCentering(swiper) {
        const slides = swiper.querySelectorAll('swiper-slide.s-product-tabs__swiper-slide');
        const isMobile = window.innerWidth < 1024;
        const threshold = 5;

        if (isMobile) {
          swiper.classList.remove("is-centered");
          return; 
        }

        if (slides.length < threshold) {
          swiper.classList.add("is-centered");
        } else {
          swiper.classList.remove("is-centered");
        }
      }

      onTabClick = (tabEl) => {
        const tab = tabEl.currentTarget;
        const index = Number(tab.dataset.index);

        this.tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");

        this.swipers.forEach((s) => s.classList.remove("is-active"));
        const targetSwiper = this.swipers[index];
        targetSwiper.classList.add("is-active");

        if (!targetSwiper.hasAttribute("init")) {
          targetSwiper.setAttribute("init", "true");
        }
      };
    }
  );
}
