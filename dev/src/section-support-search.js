if (!customElements.get("s-support-search")) {
  customElements.define(
    "s-support-search",
    class SectionSupportSearch extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.input = this.querySelector(".js-support-search__input");
        this.button = this.querySelector(".js-support-search__button");

        this.searchPageUrl = this.dataset.searchPageUrl;

        if (!this.searchPageUrl) return;

        if (!this.input || !this.button) return;

        this.button.addEventListener("click", this.handleSubmit);
        this.input.addEventListener("keydown", this.handleEnterSubmit);
      }

      disconnectedCallback() {
        this.button?.removeEventListener("click", this.handleSubmit);
        this.input?.removeEventListener("keydown", this.handleEnterSubmit);
      }

      handleSubmit = (event) => {
        event.preventDefault();

        const query = this.input.value.trim();
        if (!query) return;

        const searchUrl = `${this.searchPageUrl}?q=${encodeURIComponent(query)}`;
        window.location.href = searchUrl;
      };

      handleEnterSubmit = (event) => {
        if (event.key !== "Enter") return;
        this.handleSubmit(event);
      };
    }
  );
}
