if (!customElements.get("s-hero-banner")) {
  customElements.define(
    "s-hero-banner",
    class SectionHeroBanner extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.swiperEl = this.querySelector(".js-hero-banner__slider");
        if (this.swiperEl && (this.isInViewport(this) || window.innerWidth < 768)) {
          this.initSlider();
        }

        if (this.swiperEl) {
          document.addEventListener("scroll", this.initSlider, {
            once: true,
          });
          document.addEventListener("touchstart", this.initSlider, {
            once: true,
          });
          document.addEventListener("mousemove", this.initSlider, {
            once: true,
          });
        }
      }

      disconnectedCallback() {}

      isInViewport = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      };

      initSlider = () => {
        this.swiperEl = this.querySelector(".js-hero-banner__slider");
        const paginationEnabled = this.swiperEl.dataset.paginationEnabled == "true";
        const paginationType = this.swiperEl.dataset.paginationType;
        const paginationClickable = this.swiperEl.dataset.paginationClickable == "true";
        const paginationBgColor = this.swiperEl.dataset.paginationBgColor;
        const paginationColor = this.swiperEl.dataset.paginationColor;
        const paginationColorBullets = this.swiperEl.dataset.paginationColorBullets;
        const paginationColorBulletsActive = this.swiperEl.dataset.paginationColorBulletsActive;

        const params =
          paginationType == "text-content"
            ? {
                injectStyles: [
                  `
            .s-hero-banner__pagination-bullet{
              position: relative;
              display:inline-block;
              height:fit-content;
              margin:0 !important;
            }
            .s-hero-banner__pagination-bullet::before{
              content: "";
              position: absolute;
              bottom: -1px;
              left: 0;
              height: 1px;
              background-color:#fff;
              opacity:0.32;
              width:100%;
              z-index:1;
            }
            .s-hero-banner__pagination-bullet::after{
              content: "";
              position: absolute;
              bottom: -1px;
              transition: width 0.6s linear;
              left: 0;
              height: 1px;
              background-color:#fff;
              opacity:0;
              width:0;
              z-index:2;
            }
            .swiper-pagination-bullet {
              position:relative;
              width: fit-content;
              text-align: center;
              color: #fff;
              opacity: 1;
              background: transparent;
              padding-bottom:10px;

              font-family: var(--font-body);
              font-size: 14px;
              font-style: normal;
              font-weight: 400;
              line-height: 150%; /* 21px */
              letter-spacing: -0.07px;
            }
            
            .swiper-pagination {
              text-align: var(--pagination-align-mobile);
              color: ${paginationColor};
              background-color: ${paginationBgColor};
            }
            @media screen and (min-width: 768px) {
              .swiper-pagination {
                text-align: var(--pagination-align-desktop);
              }
            }
            .swiper-pagination-bullet-active {
              color: #fff;
              
            }
            .swiper-pagination-bullet-active::after {
              opacity:1;
              animation-name: growWidth;
              animation-duration: var(--pagination-animation-duration);
              animation-timing-function: linear;
              animation-fill-mode: forwards;
            }
            .swiper-pagination.swiper-pagination-clickable.swiper-pagination-bullets.swiper-pagination-horizontal{
              bottom: 40px;
              padding: 0 16px;
              display:flex;
              gap: 24px;
              width: calc(100% - 32px);
            }

            @media screen and (min-width:768px){
              .swiper-pagination.swiper-pagination-clickable.swiper-pagination-bullets.swiper-pagination-horizontal{
                bottom: 64px;
                padding: 0 40px;
                gap: 12px;
                width: calc(100% - 80px);
              }
            }

            .swiper-pagination.swiper-pagination-clickable.swiper-pagination-bullets.swiper-pagination-horizontal{
                justify-content: var(--pagination-align-mobile);
            }

            @media screen and (min-width:768px){
              .swiper-pagination.swiper-pagination-clickable.swiper-pagination-bullets.swiper-pagination-horizontal{
                justify-content: var(--pagination-align-desktop);
              }
            }

            .s-hero-banner__pagination-bullet::after{
              transition: var(--pagination-transition);
            }

            @keyframes growWidth {
              0% {
                  width: 0%;
              }
              100% {
                  width: 100%;
              }
            }
          `,
                ],
                ...(paginationEnabled && {
                  pagination: {
                    clickable: paginationClickable,
                    renderBullet: (index, className) => {
                      return this.querySelector(`.t-hero-banner__pagination-${index}`)?.innerHTML.replace(/{className}/g, className);
                    },
                  },
                }),
              }
            : {
                injectStyles: [
                  `
            .swiper-pagination {
              text-align: var(--pagination-align-mobile);
              color: ${paginationColor};
              background-color: ${paginationBgColor};
            }
            .swiper-pagination-bullet {
              opacity: 1;
              background-color: ${paginationColorBullets};
            }
            .swiper-pagination-bullet-active {
              background-color: ${paginationColorBulletsActive};
            }
            .swiper-pagination-progressbar-fill {
              background-color: ${paginationColor} !important;
            }
            @media screen and (min-width: 768px) {
              .swiper-pagination {
                text-align: var(--pagination-align-desktop);
              }
            }
            `,
                ],
                ...(paginationEnabled && {
                  pagination: {
                    type: paginationType,
                    clickable: paginationClickable,
                  },
                }),
              };

        Object.assign(this.swiperEl, params);
        this.swiperEl.initialize();

        document.removeEventListener("scroll", this.initSlider, {
          once: true,
        });
        document.removeEventListener("touchstart", this.initSlider, {
          once: true,
        });
        document.removeEventListener("mousemove", this.initSlider, {
          once: true,
        });
      };
    }
  );
}
