if (!customElements.get("s-mega-menu")) {
  customElements.define("s-mega-menu",
    class SectionMegaMenu extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.style.display = "";
        this.activeLink = null;
        this.activeMenu = null;
        
        this.openMegaMenuUnsubscriber = window.PubSub.subscribe("open-menu", this.toggleMegaMenu);
        this.closeMegaMenuUnsubscriber = window.PubSub.subscribe("close-mega-menu", this.closeMegaMenu);
        this.showLoadAfterUnsubscriber = window.PubSub.subscribe('show-load-after', this.handleShowModal)
      }

      disconnectedCallback() {
        this.overlay.removeEventListener("click", this.closeMegaMenu);
        this.closeButton.removeEventListener("click", this.closeMegaMenu);
        this.removeEventListener("click", this.handleOpenExpandedMenu);

        window.removeEventListener("scroll", this.handleScroll);
        window.removeEventListener("scrollend", this.handleScroll);
        window.removeEventListener("resize", this.debouncedScroll);

        this.openMegaMenuUnsubscriber();
        this.closeMegaMenuUnsubscriber();
        this.showLoadAfterUnsubscriber();
      }

      updateVariables = () => {
        this.overlay = this.querySelector(".js-mega-menu__overlay");
        this.modal = this.querySelector(".js-mega-menu__modal");
        this.closeButton = this.querySelector(".js-mega-menu__button-close");
        this.expandedMenus = Array.from(this.querySelectorAll(".js-mega-menu__menu-expanded"));

        this.addEventListener("click", this.handleClick);

        this.handleScroll();

        this.debouncedScroll = debounce(this.handleScroll.bind(this), 500);

        window.addEventListener("scrollend", this.handleScroll);
        window.addEventListener("scroll", this.handleScroll);
        window.addEventListener("resize", this.debouncedScroll);
      }

      handleClick = (event) => {
        if (event.target.closest(".js-mega-menu__button-close") || event.target.closest(".js-mega-menu__overlay")) {
          this.closeMenu(event)
        }
        if (event.target.closest(".js-mega-menu__open-expanded")) {
          this.handleOpenExpandedMenu(event)
        }
        if (event.target.closest(".js-mega-menu__open-third")) {
          this.handleThirdLevelMenu(event)
        }
      }

      handleThirdLevelMenu = (event) => {
        const button = event.target.closest(".js-mega-menu__open-third");

        if (!button) return;

        const wrapper = button.closest(".js-mega-menu__menu-third-wrapper");

        if (!wrapper.classList.contains("is-active")) {
          event.preventDefault();
          wrapper.classList.add("is-active");
        } else if (!event.target.closest(".js-mega-menu__third-link-title")) {
          event.preventDefault();
          wrapper.classList.toggle("is-active");
        }
      };

      handleShowModal = () => {
        if (this.querySelector(".js-mega-menu__modal")) return;

        this.classList.add("show");

        const megaMenuTemplate = this.querySelector(".t-mega-menu");
        const content = megaMenuTemplate.content.cloneNode(true);

        this.appendChild(content);
        this.updateVariables();
      };

      closeMenu = () => {
        this.closeMegaMenu();
        window.PubSub.publish("close-mobile-menu");
      };

      toggleMegaMenu = () => {
        if (this.classList.contains("is-active")) {
          if (this.activeLink !== null) {
            this.modal.classList.remove("has-active-menu");

            this.activeMenu.classList.remove("is-active");
            this.activeMenu = null;

            this.activeLink.classList.remove("is-active");
            this.activeLink = null;
          }
        }

        this.classList.toggle("is-active");
        document.body.classList.toggle("mega-menu-is-active");
      };

      closeMegaMenu = () => {
        if (this.activeLink !== null) {
          this.modal.classList.remove("has-active-menu");

          this.activeMenu.classList.remove("is-active");
          this.activeMenu = null;

          this.activeLink.classList.remove("is-active");
          this.activeLink = null;
        }

        this.classList.remove("is-active");
        this.classList.remove("cursor-active");
        document.body.classList.remove("mega-menu-is-active");
      };

      handleOpenExpandedMenu = (event) => {
        let button = event.target.closest(".js-mega-menu__open-expanded");

        if (!button) return;

        let linkHandle = button.getAttribute("data-parent");
        let menu = this.expandedMenus.find((menu) => menu.matches(`[data-parent="${linkHandle}"]`));

        if (this.activeLink === button) {
          this.modal.classList.remove("has-active-menu");

          this.activeMenu.classList.remove("is-active");
          this.activeMenu = null;

          this.activeLink.classList.remove("is-active");
          this.activeLink = null;

          return;
        }

        if (this.activeLink !== null) {
          this.activeMenu.classList.remove("is-active");
          this.activeMenu = null;

          this.activeLink.classList.remove("is-active");
          this.activeLink = null;
        }

        this.modal.classList.add("has-active-menu");

        this.activeMenu = menu;
        this.activeMenu.classList.add("is-active");

        this.activeLink = button;
        this.activeLink.classList.add("is-active");
      };

      handleScroll = () => {
        let scrollpos = window.scrollY;
        const announcement_bar = document.querySelector(".s-announcement-bar");
        const announcementBarHeight = announcement_bar ? announcement_bar.offsetHeight : 0;

        if (announcementBarHeight > scrollpos) {
          this.style.top = `${announcementBarHeight - scrollpos}px`;
          this.modal.style.height = `calc(100% - ${announcementBarHeight - scrollpos}px)`;
        }
        if (scrollpos >= announcementBarHeight) {
          this.style.top = "0";
          this.modal.style.height = "100%";
        }
        if (scrollpos < 1) {
          this.style.top = `${announcementBarHeight}px`;
          this.modal.style.height = `calc(100% - ${announcementBarHeight}px)`;
        }
      };
    }
  );
}