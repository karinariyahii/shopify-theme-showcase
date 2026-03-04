if (!customElements.get("mobile-menu")) {
  customElements.define(
    "mobile-menu",
    class SectionMobileMenu extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.style.display = "";
        this.activeMenu = null;

        this.openMobileMenuUnsubscriber = window.PubSub.subscribe("open-menu", this.openMobileMenu);
        this.closeMobileMenuUnsubscriber = window.PubSub.subscribe("close-mobile-menu", this.closeMobileMenu);
        this.showLoadAfterUnsubscriber = window.PubSub.subscribe("show-load-after", this.handleShowModal);
      }

      disconnectedCallback() {
        if (this.overlay) this.overlay.removeEventListener("click", this.closeMenu);

        if (this.closeBtns) {
          this.closeBtns.forEach((closeBtn) => {
            closeBtn.removeEventListener("click", this.closeMenu);
          });
        }

        if (this.countryBtn) {
          this.countryBtn.removeEventListener("click", this.openCountrySelector);
        }

        this.removeEventListener("click", this._handleOpenExpandedMenu);
        this.removeEventListener("click", this._handleCloseExpandedMenu);
        this.removeEventListener("click", this.handleClick);

        this.openMobileMenuUnsubscriber();
        this.closeMobileMenuUnsubscriber();
        this.showLoadAfterUnsubscriber();

        window.removeEventListener("resize", this.debouncedResize);
      }

      updateVariables = () => {
        this.overlay = this.querySelector(".js-mobile-menu__overlay");
        this.closeBtns = this.querySelectorAll(".js-mobile-menu__close");
        this.modal = this.querySelector(".js-mobile-menu__modal");
        this.countryBtn = this.querySelector(".js-mobile-menu__country-selector-button");

        this.overlay.addEventListener("click", this.closeMenu);
        this.closeBtns.forEach((closeBtn) => {
          closeBtn.addEventListener("click", this.closeMenu);
        });

        if (this.countryBtn) {
          this.countryBtn.addEventListener("click", this.openCountrySelector);
        }

        this.addEventListener("click", this._handleOpenExpandedMenu);
        this.addEventListener("click", this._handleCloseExpandedMenu);
        this.addEventListener("click", this.handleClick);

        window.addEventListener("resize", this.debouncedResize);
      };

      handleShowModal = () => {
        if (this.querySelector(".js-mobile-menu__modal")) return;

        this.classList.add("show");

        const mobileMenuTemplate = this.querySelector(".t-mobile-menu");
        const content = mobileMenuTemplate.content.cloneNode(true);

        this.appendChild(content);

        this.updateVariables();
      };

      handleClick = (event) => {
        const target = event.target;

        if (target.closest(".js-mobile-menu__open-third")) {
          this.handleThirdLevelMenu(event);
        }
      };

      handleThirdLevelMenu = (event) => {
        const button = event.target.closest(".js-mobile-menu__open-third");

        if (!button) return;

        const wrapper = button.closest(".js-mobile-menu__menu-third-wrapper");

        if (!wrapper.classList.contains("is-active")) {
          event.preventDefault();
          wrapper.classList.add("is-active");
        } else if (!event.target.closest(".js-mobile-menu__third-link-title")) {
          event.preventDefault();
          wrapper.classList.toggle("is-active");
        }
      };

      _handleCloseExpandedMenu = (event) => {
        let button = event.target.closest(".js-mobile-menu__close-expanded");

        if (!button) return;

        this.activeMenu.classList.remove("is-active");
        this.activeMenu = null;
      };

      _handleOpenExpandedMenu = (event) => {
        let button = event.target.closest(".js-mobile-menu__open-expanded");

        if (!button) return;

        if (this.activeMenu === button) {
          this.activeMenu.classList.remove("is-active");
          this.activeMenu = null;
          return;
        }

        if (this.activeMenu !== null) {
          this.activeMenu.classList.remove("is-active");
          this.activeMenu = null;
        }

        this.activeMenu = button;
        this.activeMenu.classList.add("is-active");
      };

      closeMenu = () => {
        this.closeMobileMenu();
        window.PubSub.publish("close-mega-menu");
      };

      openMobileMenu = () => {
        this.classList.add("is-active");
        document.body.classList.add("mega-menu-is-active");
      };

      closeMobileMenu = () => {
        if (this.activeMenu !== null) {
          this.activeMenu.classList.remove("is-active");
          this.activeMenu = null;
        }

        this.classList.remove("is-active");
        document.body.classList.remove("mega-menu-is-active");
        window.PubSub.publish("close-mega-menu");
      };

      openCountrySelector = () => {
        window.PubSub.publish("open-country-selector");
        this.closeMenu();
      };
    }
  );
}