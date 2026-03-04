if (!customElements.get("s-product-slider")) {
  customElements.define(
    "s-product-slider",
    class SectionProductSlider extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.productId = this.dataset.productId;
        this.sectionId = this.dataset.sectionId;
        this.productsSource = this.dataset.productsSource;
        this.productsLimit = this.dataset.productsLimit;
        this.recommendationsType = this.dataset.recommendationsType;

        if (this.productsSource == "recommendations") {
          this.renderRecommendedProducts();
        }
      }

      disconnectedCallback() {}

      renderRecommendedProducts = () => {
        fetch(window.Shopify.routes.root + `recommendations/products?product_id=${this.productId}&limit=${this.productsLimit}&section_id=${this.sectionId}&intent=${this.recommendationsType}`)
          .then((response) => response.text())
          .then((text) => {
            const html = document.createElement("div");
            html.innerHTML = text;
            const recommendations = html.querySelector(".js-product-slider__grid");

            if (recommendations?.innerHTML.trim().length) {
              this.querySelector(".js-product-slider__grid").innerHTML = recommendations.innerHTML;
            }
          })
          .catch((error) => console.error("Error fetching recommendations:", error));
      };
    }
  );
}
