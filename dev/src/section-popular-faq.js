if (!customElements.get("s-popular-faq")) {
  customElements.define(
    "s-popular-faq",
    class SectionPopularFaq extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.viewAllButton = this.querySelector(".js-popular-faq__header-button");
        this.questionButtons = this.querySelectorAll(".js-popular-faq__button");

        this.viewAllButton?.addEventListener("click", this.handleViewAllClick);
        this.questionButtons?.forEach((button) => {
          button.addEventListener("click", this.handleIconClick);
        });
      }

      disconnectedCallback() {
        this.viewAllButton?.removeEventListener("click", this.handleViewAllClick);
        this.questionButtons?.forEach((button) => {
          button.removeEventListener("click", this.handleIconClick);
        });
      }

      handleViewAllClick = (e) => {
        const allItems = this.querySelectorAll(".js-popular-faq__questions-item");
        const isAllOpened = Array.from(allItems).every((item) => item.classList.contains("is-active"));

        allItems.forEach((item) => {
          const isOpen = item.classList.contains("is-active");
          const answer = item.querySelector(".js-popular-faq__answer");

          if (isAllOpened) {
            this.viewAllButton.classList.remove("is-active");
            item.classList.remove("is-active");
            answer.style.maxHeight = null;
          }

          if (!isOpen) {
            this.viewAllButton.classList.add("is-active");;
            item.classList.add("is-active");
            answer.style.maxHeight = answer.scrollHeight + "px";
          }
        });
      };

      handleIconClick = (e) => {
        const button = e.currentTarget;
        const item = button.closest(".js-popular-faq__questions-item");
        const answer = item.querySelector(".js-popular-faq__answer");
        const isOpen = item.classList.contains("is-active");

        if (isOpen) {
          this.viewAllButton.classList.remove("is-active");
          item.classList.remove("is-active");
          answer.style.maxHeight = null;
        }

        if (!isOpen) {
          item.classList.add("is-active");
          answer.style.maxHeight = answer.scrollHeight + "px";
        }

        const allItems = this.querySelectorAll(".js-popular-faq__questions-item");
        const isAllOpened = Array.from(allItems).every((item) => item.classList.contains("is-active"));

        if (isAllOpened) {
          this.viewAllButton.classList.add("is-active");;
        }
      };
    }
  );
}
