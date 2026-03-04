if (!customElements.get("c-product-card")) {
  customElements.define(
    "c-product-card",
    class ComponentProductCard extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.slider = this.querySelector(".js-product-card__swiper");
        this.wishlistButton = this.querySelector(".js-product-card__wishlist");
        this.addToCartButton = this.querySelector(".js-product-card__add-to-cart");

        this.slider?.addEventListener("swiperslidechange", this.handleSlideChange);
        this.wishlistButton?.addEventListener("click", this.wishlistButtonHandle);
        this.addToCartButton?.addEventListener("click", this.addProductToCart);
      }

      disconnectedCallback() {
        this.slider?.removeEventListener("swiperslidechange", this.handleSlideChange);
        this.wishlistButton?.removeEventListener("click", this.wishlistButtonHandle);
        this.addToCartButton?.removeEventListener("click", this.addProductToCart);
      }

      handleLazyLoad = () => {
        const lazySlides = this.querySelectorAll(".c-product-card__image-slide--lazy");
        lazySlides.forEach(slide => slide.classList.remove("c-product-card__image-slide--lazy"));
      };

      wishlistButtonHandle = () => {

      };

      addProductToCart = () => {
        const variantId = this.dataset.variantId;
        const available = this.addToCartButton.dataset.available === "true";
        const isLoading = this.addToCartButton.classList.contains("c-product-card__add-to-cart--loading");

        if (!variantId || !available || isLoading) {
          return;
        }

        const buttonText = this.addToCartButton.querySelector(".js-product-card__add-to-cart-text");

        this.addToCartButton.disabled = true;
        this.addToCartButton.classList.add("c-product-card__add-to-cart--loading");

        fetch(window.Shopify.routes.root + "cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: variantId,
            quantity: 1
          })
        })
          .then((response) => {
            if (!response.ok) {
              const error = response.json().catch(() => ({}));
              throw new Error(error.description);
            }
            
            const newMaxInventory = this.addToCartButton.dataset.propertyMaxInventory - 1;
            this.addToCartButton.setAttribute("data-property-max-inventory", newMaxInventory);
            
            if (newMaxInventory === 0) {
              buttonText.innerHTML = this.addToCartButton.dataset.soldOutText;
            }

            this.addToCartButton.classList.remove("c-product-card__add-to-cart--loading");
            this.addToCartButton.disabled = false;
            window.PubSub.publish("cart-updated", true);
          })
          .catch((error) => {
            console.error("Error:", error);
            this.addToCartButton.classList.remove("c-product-card__add-to-cart--loading");
            this.addToCartButton.disabled = false;
          });
      };

      handleSlideChange = () => {
        this.handleLazyLoad();

        const swiper = this.slider.swiper;
        const isMobileDevice = window.innerWidth < 768;

        if (this.returnToFirstSlideTimeout) {
          clearTimeout(this.returnToFirstSlideTimeout);
          this.returnToFirstSlideTimeout = null;
        }

        if (!swiper || !isMobileDevice || swiper.slides.length < 2) {
          return;
        }

        if (swiper.activeIndex != 0) {
          this.returnToFirstSlideTimeout = setTimeout(() => {
            swiper.slideTo(0);
            this.returnToFirstSlideTimeout = null;
          }, 5000);
        }
      };
    }
  );
}
