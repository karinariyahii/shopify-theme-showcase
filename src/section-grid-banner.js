if (!customElements.get("s-grid-banner")) {
  customElements.define(
    "s-grid-banner",
    class SectionGridBanner extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.swatchesSlider = this.querySelector(".js-grid-banner__swatches");
        this.mainSlider = this.querySelector(".js-grid-banner__slider");

        if (this.swatchesSlider && this.mainSlider) {
          this.swatchesSlider.addEventListener("mouseover", this.handleSwatchHover);
        }
      }

      disconnectedCallback() {
        if (this.swatchesSlider) {
          this.swatchesSlider.removeEventListener("mouseover", this.handleSwatchHover);
        }
      }

      handleSwatchHover = (e) => {
        const swatchSlide = e.target.closest(".js-grid-banner__swatches-slide");
        if (!swatchSlide || !this.mainSlider?.swiper) return;

        const slides = this.swatchesSlider.querySelectorAll(".js-grid-banner__swatches-slide");
        const index = Array.from(slides).indexOf(swatchSlide);

        if (index !== -1) {
          this.mainSlider.swiper.slideToLoop(index);
        }
      };
    }
  );
}
