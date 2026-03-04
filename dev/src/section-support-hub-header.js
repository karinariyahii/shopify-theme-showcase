if (!customElements.get("s-support-hub-header")) {
  customElements.define(
    "s-support-hub-header",
    class SectionSupportHubHeader extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.input = this.querySelector(".js-support-hub-header__input");
        this.button = this.querySelector(".js-support-hub-header__button");
        this.searchWrapper = this.querySelector(".js-support-hub-header__search");
        this.clearSearchButton = this.querySelector(".js-support-hub-header__clear-search");

        this.searchPageUrl = this.dataset.searchPageUrl;

        if (!this.input || !this.button || !this.searchWrapper) return;

        this.initFromUrl();
        this.updateEmptyState();

        this.button.addEventListener("click", this.handleSubmit);
        this.input.addEventListener("keydown", this.handleEnterSubmit);
        this.input.addEventListener("input", this.updateEmptyState);
        this.clearSearchButton?.addEventListener("click", this.handleClearSearch);

        this.clearSearchUnsubscriber = window.PubSub.subscribe("support-hub-clear-search", this.handleClearSearch);
      }

      disconnectedCallback() {
        this.button?.removeEventListener("click", this.handleSubmit);
        this.input?.removeEventListener("keydown", this.handleEnterSubmit);
        this.input?.removeEventListener("input", this.updateEmptyState);
        this.clearSearchButton?.removeEventListener("click", this.handleClearSearch);
        this.clearSearchUnsubscriber();
      }

      handleSubmit = (event) => {
        event.preventDefault();

        const query = this.input.value.trim();
        if (!query) return;

        if (this.isOnSearchPage()) {
          const params = new URLSearchParams(window.location.search);
          params.set("q", query);

          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.pushState({}, "", newUrl);

          window.PubSub.publish("support-hub-search-update", { query });
        } else {
          const searchUrl = `${this.searchPageUrl}?q=${encodeURIComponent(query)}`;
          window.location.href = searchUrl;
        }
      };

      handleEnterSubmit = (event) => {
        if (event.key !== "Enter") return;
        if (!this.input.value.trim()) return;
        this.handleSubmit(event);
      };

      handleClearSearch = (event) => {
        event?.preventDefault();

        this.input.value = "";
        this.updateEmptyState();
        this.input.focus();
      };

      updateEmptyState = () => {
        const isEmpty = !this.input.value.trim();
        this.searchWrapper.classList.toggle("is-empty", isEmpty);
      };

      initFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const query = params.get("q");

        if (query) {
          this.input.value = query;
        }

        this.updateEmptyState();
      };

      isOnSearchPage = () => {
        if (!this.searchPageUrl) return false;

        const currentPath = window.location.pathname;
        const searchPath = new URL(this.searchPageUrl, window.location.origin).pathname;

        return currentPath === searchPath;
      };
    }
  );
}
