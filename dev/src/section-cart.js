if (!customElements.get("s-cart")) {
  customElements.define(
    "s-cart",
    class SectionCart extends HTMLElement {
      constructor() {
        super();
        this.removeQueue = Promise.resolve();
        this.prevHasDiscountCode = this.dataset.hasDiscountCode === "true";
      }

      connectedCallback() {
        this.moneyFormat = this.dataset.moneyFormat;
        this.enableTrailingZeros = this.dataset.enableTrailingZeros === "true";
        this.headingStart = this.querySelector(".js-cart__heading-start");

        this.cartUpdatedUnsubscriber = window.PubSub.subscribe("cart-updated", this.handleCartUpdated);

        this.updateVariables();
        this.initYMAL();
      };

      disconnectedCallback() {
        this.handleClearListeners();
        this.cartUpdatedUnsubscriber();
      };

      updateVariables = () => {
        this.handleClearListeners();

        this.isCartEmpty = this.dataset.cartEmpty;
        this.sectionId = this.dataset.sectionId;
        this.itemsContainer = this.querySelector(".js-cart__cart-content");
        this.deliveryBannerText = this.querySelector(".js-cart__free-delivery-text");
        this.cartItemCount = this.querySelector(".js-cart__counter");
        this.deliveryWrapper = this.querySelector(".js-cart__delivery-wrapper");

        this.discountForm = this.querySelector(".js-cart__discount-wrap");

        this.sliderRenderContainer = this.querySelector(".js-cart__slider-render-container");
        this.sliderWrapper = this.querySelector(".js-cart__recommendations-slider");

        this.qtyInputs = Array.from(this.querySelectorAll(".js-cart__form-qty-input"));
        this.qtyButtonsPlus = Array.from(this.querySelectorAll(".js-cart__form-qty-button--plus"));
        this.qtyButtonsMinus = Array.from(this.querySelectorAll(".js-cart__form-qty-button--minus"));

        this.addEventListener("click", this.handleClick);
        this.qtyButtonsPlus?.forEach((button) => button.addEventListener("click", this.qtyButtonPlusClickHandler));
        this.qtyButtonsMinus?.forEach((button) => button.addEventListener("click", this.qtyButtonMinusClickHandler));
        this.qtyInputs?.forEach((input) => input.addEventListener("change", this.qtyInputChangeHandler));
        this.discountForm?.addEventListener("submit", this.handleDiscountSubmission);

        if (this.isCartEmpty === "false") {
          this.checkInWishlistAllProductsSwym();
        }
      };

      handleClearListeners = () => {
        this.removeEventListener("click", this.handleClick);
        this.discountForm?.removeEventListener("submit", this.handleDiscountSubmission);
        this.qtyButtonsPlus?.forEach((button) => button.removeEventListener("click", this.qtyButtonPlusClickHandler));
        this.qtyButtonsMinus?.forEach((button) => button.removeEventListener("click", this.qtyButtonMinusClickHandler));
        this.qtyInputs?.forEach((input) => input.removeEventListener("change", this.qtyInputChangeHandler));
      };

      // React to global cart updates and choose partial/full refresh path.
      handleCartUpdated = async (data = {}) => {
        const { cart: incomingCart, source } = data;

        let cart = incomingCart;

        if (!cart) {
          if (source === "unknown" || !source) {
            cart = await this.fetchCart();
          } else {
            return;
          }
        }

        if (!cart) return;

        if (source === "qty" || source === "variant" || source === "discount") {
          const hasDiscountCode = cart.discount_codes && cart.discount_codes.some((d) => d.applicable);
          const discountStateChanged = hasDiscountCode !== this.prevHasDiscountCode;

          this.prevHasDiscountCode = hasDiscountCode;

          if (discountStateChanged || source === "discount") {
            await this.updateCartContent();
            return;
          }

          this.updateTotals(cart);

          return;
        }

        if (source === "clear") {
          this.renderEmptyState();
        }

        const same = this.compareCartWithDOM(cart);

        if (!same) {
          await this.updateCartContent();
          return;
        }

        this.updateTotals(cart);
      };

      // Cart Interaction Functions

      // Main click delegator for discount, remove, wishlist and variant actions.
      handleClick = async (event) => {
        const target = event.target;

        if (target.closest(".js-cart__discount-submit-btn")) {
          this.handleDiscountSubmission(event);
        } else if (target.closest(".js-cart__discount-toggle")) {
          this.classList.add("is-discount-form-active");
        } else if (target.closest(".js-cart__discount-remove")) {
          this.removeDiscount(target);
        } else if (target.closest(".js-cart__remove-all")) {
          this.clearCart();
        }

        if (target.closest(".js-cart__cart-remove")) {
          const item = target.closest(".js-cart__item");
          const itemToDelete = {
            itemKey: item.dataset.key,
          };

          this.deleteItem(itemToDelete, item);
        }

        if (target.closest(".js-cart__wishlist-add, .js-cart__wishlist-remove")) {
          const button = target.closest(".s-cart__wishlist-btn");
          const item = target.closest(".js-cart__item");

          button.classList.add("is-loading");

          const isInWishlist = item.dataset.inWishlist === "true";
          const action = isInWishlist ? "remove" : "add";

          if (!window.SwymCallbacks) {
            window.SwymCallbacks = [];
          }

          window.SwymCallbacks.push((swat) => this.toggleWishlistSwym(swat, item, button, action));
        }

        if (target.closest(".js-cart__toggle")) {
          this.closeAllDropDown();
          const itemInner = target.closest(".js-cart__item-inner");

          const toggle = target.closest(".js-cart__toggle");
          toggle.classList.toggle("is-active");
          itemInner.classList.toggle("is-visible-options");
        } else {
          this.closeVariantsDropDown();
        }

        if (target.closest(".js-cart__option")) {
          const oldProduct = target.closest(".js-cart__item");
          const itemToDelete = {
            itemKey: oldProduct.dataset.key,
          };

          const itemToAdd = {
            variantId: Number(target.dataset.variantId),
            qty: Number(oldProduct.dataset.qty),
          };

          await this.updateItem(itemToDelete, itemToAdd, oldProduct);
        }
      };

      // Process discount form submission and validate new code.
      handleDiscountSubmission = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const discountCodesList = this.querySelector(".js-cart__discounts-list")?.dataset.codes;
        const discountCodes = discountCodesList?.split(",") || [];
        const discountCode = this.querySelector(".js-cart__discount-input").value.trim();
        this.hideError();
        if (!discountCode) return;

        if (discountCodes.includes(discountCode)) return;

        discountCodes.push(discountCode);

        this.updateDiscountCodes(discountCodes)
          .then((cart) => {
            if (!cart.discount_codes.at(-1)?.applicable) {
              this.querySelector(".js-cart__discount-container").classList.add("is-not-valid");
            } else {
              window.PubSub.publish("cart-updated", { cart, source: "discount" });
            }
          })
          .catch(() => {});
      };

      removeDiscount = (target) => {
        const discountCodesList = this.querySelector(".js-cart__discounts-list")?.dataset.codes;
        const discountcodes = discountCodesList.split(",") || [];
        const discountCode = target.closest(".js-cart__discount-remove").dataset.code;
        this.hideError();
        const remainingCodes = discountcodes.filter((code) => code !== discountCode);

        this.updateDiscountCodes(remainingCodes)
          .then((cart) => {
            window.PubSub.publish("cart-updated", { cart, source: "discount" });
          })
          .catch(() => {});
      };

      qtyButtonPlusClickHandler = (event) => {
        const input = event.target.closest(".js-cart__item-quantity").querySelector(".js-cart__form-qty-input");
        input.value = parseInt(input.value) + 1;

        input.dispatchEvent(new Event("change"));
      };

      qtyButtonMinusClickHandler = (event) => {
        const input = event.target.closest(".js-cart__item-quantity").querySelector(".js-cart__form-qty-input");
        input.value = parseInt(input.value) - 1;

        input.dispatchEvent(new Event("change"));
      };

      qtyInputChangeHandler = (event) => {
        event.preventDefault();

        const input = event.target;
        const qtyContainer = input.closest(".js-cart__item-quantity");
        const buttonPlus = qtyContainer.querySelector(".js-cart__form-qty-button--plus");
        const buttonMinus = qtyContainer.querySelector(".js-cart__form-qty-button--minus");

        const value = parseInt(input.value);
        const min = parseInt(input.min);
        const max = parseInt(input.max);

        input.value = Math.max(min, Math.min(value, max));
        const clampedValue = parseInt(input.value);

        buttonPlus.classList.toggle("s-cart__form-qty-button--disabled", clampedValue >= max);
        buttonMinus.classList.toggle("s-cart__form-qty-button--disabled", clampedValue <= min);

        buttonPlus.classList.add("s-cart__form-qty-button--disabled");
        buttonMinus.classList.add("s-cart__form-qty-button--disabled");

        this.updateQuantity(input);
      };

      updateQuantity = async (input) => {
        const cartItem = input.closest(".js-cart__item");
        cartItem.classList.add("is-loading");

        const key = cartItem.dataset.key;

        const formData = {
          id: key,
          quantity: input.value,
        };

        await fetch(`${window.Shopify.routes.root}cart/change.js`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then((response) => response.json())
          .then(async (cart) => {
            const variantId = cartItem.dataset.variant;
            const updatedItem = cart.items.find((i) => i.variant_id == variantId);
            cartItem.dataset.key = updatedItem?.key || key;

            if (updatedItem) {
              await this.updateSingleItem(updatedItem.key);
            }

            this.updateTotals(cart);
            window.PubSub.publish("cart-updated", { cart, source: "qty" });
          })
          .catch((error) => {
            console.error("Error:", error);
          })
          .finally(() => {
            cartItem.classList.remove("is-loading");
          });
      };

      deleteItem = async (data, element) => {
        element.classList.add("is-loading");
        this.removeQueue = this.removeQueue.then(() => this._deleteItemInternal(data, element));
      };

      // Remove one cart item on backend, animate removal, and publish cart update.
      _deleteItemInternal = async (data, element) => {
        try {
          const response = await fetch(`${window.Shopify.routes.root}cart/change.js`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: data.itemKey,
              quantity: 0,
            }),
          });

          const cart = await response.json();

          element.classList.remove("is-loading");

          await this.removeItemAnimation(element);

          if (cart.item_count === 0) {
            this.renderEmptyState();
          }

          this.updateTotals(cart);
          window.PubSub.publish("cart-updated", { cart, source: "remove" });
        } catch (e) {
          console.error("deleteItem error:", e);
          element.classList.remove("is-removing", "is-removed");
        }
      };

      // Replace item variant by removing old line and adding a new one.
      updateItem = async (itemToDelete, itemToAdd, oldElement) => {
        try {
          if (oldElement) {
            oldElement.classList.add("is-loading");
          }

          const formData = {
            updates: {
              [itemToDelete.itemKey]: 0,
              [itemToAdd.variantId]: itemToAdd.qty,
            },
          };

          const response = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          });

          const cart = await response.json();

          const newItem = cart.items.find((i) => i.variant_id == itemToAdd.variantId);

          if (newItem) {
            await this.renderNewItem(newItem.key, oldElement);
          }

          this.updateTotals(cart);
          this.initYMAL(cart);
          window.PubSub.publish("cart-updated", { cart, source: "variant" });
        } catch (e) {
          console.error("updateItem error:", e);
        } finally {
          this.stopLoader();
        }
      };

      // Clear the full cart and animate all currently rendered items out.
      clearCart = async () => {
        try {
          const response = await fetch(`${window.Shopify.routes.root}cart/clear.js`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const cart = await response.json();
          const allItems = Array.from(this.querySelectorAll(".js-cart__item"));

          await Promise.all(allItems.map((item) => this.removeItemAnimation(item)));

          window.PubSub.publish("cart-updated", { cart, source: "clear" });
        } catch (e) {
          console.error("clearCart error:", e);
        }
      };

      closeAllDropDown = () => {
        Array.from(this.querySelectorAll(".js-cart__item-inner")).forEach((inner) => inner.classList.remove("is-visible-options"));
        Array.from(this.querySelectorAll(".js-cart__toggle")).forEach((dropdown) => dropdown.classList.remove("is-active"));
      };

      closeVariantsDropDown = () => {
        Array.from(this.querySelectorAll(".js-cart__item-inner.is-visible-options")).forEach((inner) => inner.classList.remove("is-visible-options"));
        Array.from(this.querySelectorAll(".js-cart__toggle.is-active")).forEach((toggle) => toggle.classList.remove("is-active"));
      };

      // Cart Rendering Functions

      // Pull fresh cart section HTML and replace body/footer parts in-place.
      updateCartContent = async () => {
        this.playLoader();

        const url = `${window.Shopify.routes.root}cart?section=${this.sectionId}`;

        await fetch(url)
          .then((response) => response.text())
          .then((response) => {
            const selector = `#${this.sectionId}`;
            const parser = new DOMParser();
            const parsedHTML = parser.parseFromString(response, "text/html");

            const newWrapperTemplate = parsedHTML.querySelector(".t-cart__body");
            const newFooterTemplate = parsedHTML.querySelector(".t-cart__footer");

            if (!newWrapperTemplate) {
              console.error("Side-cart wrapper template not found");
              return;
            }

            if (!newFooterTemplate) {
              console.error("Side-cart footer template not found");
              return;
            }

            const oldWrapper = this.querySelector(".js-cart__body");
            const oldFooter = this.querySelector(".js-cart__footer");

            const cloneTemplate = (tpl) => (tpl.content || tpl).cloneNode(true);
            const newWrapper = cloneTemplate(newWrapperTemplate);
            const newFooter = cloneTemplate(newFooterTemplate);
            const cartItems = Array.from(newWrapper.querySelectorAll(".js-cart__item"));

            if (cartItems.length === 0) {
              this.headingStart.classList.add("is-empty");
            } else {
              this.headingStart.classList.remove("is-empty");
            }

            this.cartItemCount.textContent = cartItems.length;

            if (oldWrapper && newWrapper) {
              oldWrapper.replaceWith(newWrapper);
            } else {
              console.error("Cannot replace side cart wrapper: missing elements");
            }

            if (oldFooter && newFooter) {
              oldFooter.replaceWith(newFooter);
            } else {
              console.error("Cannot replace side cart footer: missing elements");
            }

            const newScopedStyle = parsedHTML.querySelector(`${selector} style`);
            const currentScopedStyle = document.querySelector(`${selector} style`);

            if (newScopedStyle && currentScopedStyle) {
              currentScopedStyle.innerHTML = newScopedStyle.innerHTML;
            } else if (!currentScopedStyle && newScopedStyle) {
              document.querySelector(selector).prepend(newScopedStyle.cloneNode(true));
            }

            this.updateVariables();
            this.initYMAL();
            this.stopLoader();
          })
          .catch((e) => {
            console.error("side cart updateCartContent error:", e);
          });
      };

      // Re-render one cart line by key from dedicated section response.
      updateSingleItem = async (key) => {
        const res = await fetch(`/cart?section_id=cart-items`);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const newItem = doc.querySelector(`[data-key="${key}"]`);
        const oldItem = this.querySelector(`[data-key="${key}"]`);

        if (newItem && oldItem) {
          oldItem.innerHTML = newItem.innerHTML;
          this.updateVariables();
        }
      };

      // Insert newly created cart line and remove obsolete old line.
      renderNewItem = async (key, oldElement) => {
        const res = await fetch(`/cart?section_id=cart-items`);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const newItem = doc.querySelector(`[data-key="${key}"]`);

        if (newItem && this.itemsContainer) {
          oldElement.remove();
          this.itemsContainer.insertAdjacentElement("afterbegin", newItem);
          this.updateVariables();
        }
      };

      // Recompute subtotal/discount/total and render summary block.
      updateTotals = (cart) => {
        const saleDiscount = this.calculateSaleDiscount(cart);
        const codeDiscount = cart.total_discount;

        const totalDiscount = saleDiscount + codeDiscount;

        const subtotal = cart.total_price + totalDiscount;

        const summaryHTML = this.compileTemplate("cart-summary", {
          subtotal: this.formatMoney(subtotal),
          total: this.formatMoney(cart.total_price),
          discountAmount: totalDiscount,
          discountAmountFormatted: totalDiscount > 0 ? this.formatMoney(totalDiscount) : "",
        });

        this.querySelector(".js-cart__summary-container").innerHTML = summaryHTML;

        if (cart.item_count === 0) {
          this.headingStart.classList.add("is-empty");
        } else {
          this.headingStart.classList.remove("is-empty");
        }

        this.cartItemCount.textContent = cart.item_count;

        this.updateDelivery(cart);
        this.stopLoader();
      };

      // Update free-delivery progress bar and corresponding status text.
      updateDelivery = (cart) => {
        if (!this.deliveryWrapper) return;

        const freeLimit = Number(this.deliveryWrapper.dataset.freeDelivery);
        if (!freeLimit) return;

        const total = cart.total_price;
        const left = Math.max(freeLimit - total, 0);

        const percent = Math.min((total / freeLimit) * 100, 100);

        const bar = this.deliveryWrapper.querySelector(".s-cart__free-delivery-bgd");

        if (bar) {
          bar.style.width = percent + "%";
        }

        if (!this.deliveryBannerText) return;

        let bannerText = "";
        if (left <= 0) {
          bannerText = this.compileTemplate("delivery-complete");
        } else {
          bannerText = this.compileTemplate("delivery-progress", {
            money: this.formatMoney(left),
          });
        }
        this.deliveryBannerText.innerHTML = bannerText;

        const el = this.deliveryBannerText;
        el.classList.add("is-updated");

        const removeClass = () => el.classList.remove("is-updated");
        ["animationend", "transitionend"].forEach((evt) => el.addEventListener(evt, removeClass, { once: true }));
      };

      // Switch cart UI into empty state mode.
      renderEmptyState = () => {
        const thisCartContentWrapper = this.querySelector(".js-cart__cart-content-wrapper");
        const checkoutButton = this.querySelector(".js-cart__button-checkout");
        const discountContainer = this.querySelector(".js-cart__discount-container");
        const removeAllButton = this.querySelector(".js-cart__remove-all");

        if (discountContainer) {
          discountContainer.remove();
        }

        if (removeAllButton) {
          removeAllButton.remove();
        }

        if (checkoutButton) {
          checkoutButton.classList.add("is-disabled");
        }

        thisCartContentWrapper.classList.add("is-empty", "is-animated");

        this.dataset.cartEmpty = "true";

        this.initYMAL();
      };

      // Wishlist & YMAL Functions

      // Synchronize all cart items with wishlist status from Swym.
      checkInWishlistAllProductsSwym = () => {
        const cartItems = Array.from(this.querySelectorAll(".js-cart__item"));

        window.SwymCallbacks.push((swat) => {
          swat.fetchLists({
            callbackFn: (data) => {
              const list = data[0]?.listcontents || [];
              cartItems.forEach((item) => {
                const empi = item.dataset.empi;
                const isIn = list.some((p) => p.empi == empi);
                item.dataset.inWishlist = isIn ? "true" : "false";
              });
              window.PubSub.publish("wishlist-loaded", data[0]);
            },
            errorFn: (err) => console.error("Swym fetchLists error:", err),
          });
        });
      };

      // Add or remove product from wishlist and update button/item state.
      toggleWishlistSwym = (swat, item, button, action) => {
        const product = this.getProductFromItem(item);
        const isAdding = action === "add";

        const onSuccess = () => {
          item.dataset.inWishlist = isAdding ? "true" : "false";
          button?.classList.remove("is-loading");
          window.PubSub.publish(isAdding ? "wishlist-add-product" : "wishlist-remove-product", product);
        };

        const onError = (error) => {
          console.error(`Error ${action}ing ${isAdding ? "to" : "from"} wishlist:`, error);
          button?.classList.remove("is-loading");
        };

        const swatMethod = isAdding ? "addToList" : "deleteFromList";
        swat[swatMethod](window.apps.wishlist.listId, product, onSuccess, onError);
      };

      // Load and render related recommendations section for current cart.
      initYMAL = async (cart = null) => {
        if (this.sliderRenderContainer.classList.contains("is-static")) {
          return;
        }
        this.renderYMALSkeleton();

        try {
          if (!cart) {
            cart = await this.fetchCart();
          }

          if (!cart?.items?.length) {
            this.renderYMALFallback();

            return;
          }

          const productId = cart.items[0].product_id;

          const res = await fetch(`${window.Shopify.routes.root}recommendations/products?product_id=${productId}&limit=6&intent=related&section_id=cart-ymal`);

          const html = await res.text();
          if (!html) return;

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const slideCounts = Array.from(doc.querySelectorAll(".js-cart__slide")).length;

          if (slideCounts === 0) {
            this.renderYMALFallback();

            return;
          }

          this.sliderRenderContainer.innerHTML = doc.querySelector(".js-cart__slider-container")?.innerHTML;

          const sliderButtons = this.querySelector(".js-cart__slider-buttons");

          if (slideCounts < 3) {
            sliderButtons?.classList.add("is-hidden-mobile");
          } else if (slideCounts < 5) {
            sliderButtons?.classList.add("is-hidden-desktop");
          } else {
            sliderButtons?.classList.remove("is-hidden-desktop", "is-hidden-mobile");
            this.sliderWrapper?.classList.remove("is-hidden");
          }

          this.sliderWrapper?.classList.remove("is-loading");
        } catch (e) {
          console.error("[YMAL] init failed:", e);
        }
      };

      // Render selected YMAL template state (skeleton, fallback, content).
      renderYMAL = (templateName, isLoading = false) => {
        if (this.sliderRenderContainer?.classList.contains("is-static")) {
          return;
        }

        if (!this.sliderRenderContainer) {
          this.sliderWrapper?.classList.add("is-hidden");
          return;
        }

        const html = this.compileTemplate(templateName);

        if (!html) {
          this.sliderWrapper?.classList.add("is-hidden");
          return;
        }

        this.sliderRenderContainer.innerHTML = html;
        this.sliderWrapper?.classList.toggle("is-loading", isLoading);
        this.sliderWrapper?.classList.remove("is-hidden");
      };

      // Show YMAL loading skeleton.
      renderYMALSkeleton = () => {
        this.renderYMAL("ymal-skeleton", true);
      };

      // Show YMAL fallback when recommendations are unavailable.
      renderYMALFallback = () => {
        this.renderYMAL("ymal-fallback", false);
      };

      // Helper Functions

      // Build small HTML snippets from template tags and provided params.
      compileTemplate = (templateName, params = {}) => {
        switch (templateName) {
          case "cart-summary": {
            const mainTpl = document.getElementById("t-cart-summary-template")?.innerHTML || "";
            const discountTpl = document.getElementById("t-cart-discount-template")?.innerHTML || "";

            let discountRow = "";
            if (params.discountAmount > 0 && discountTpl) {
              discountRow = discountTpl.replace("{discount}", params.discountAmountFormatted || "");
            }

            return mainTpl
              .replace("{subtotal}", params.subtotal || "")
              .replace("{discountRow}", discountRow)
              .replace("{total}", params.total || "");
          }

          case "delivery-progress": {
            const tpl = document.getElementById("t-cart-delivery-progress-template")?.innerHTML || "";
            return tpl.replace("{money}", params.money || "");
          }

          case "delivery-complete": {
            const tpl = document.getElementById("t-cart-delivery-complete-template")?.innerHTML || "";
            return tpl;
          }

          case "ymal-skeleton": {
            const template = this.querySelector(".t-cart__ymal-skeleton");
            return template ? template.innerHTML : "";
          }

          case "ymal-fallback": {
            const template = this.querySelector(".t-cart__ymal-fallback");
            return template ? template.innerHTML : "";
          }
        }
      };

      // Compare rendered cart line keys with current cart object keys.
      compareCartWithDOM = (cart) => {
        const domKeys = Array.from(this.querySelectorAll(".js-cart__item"))
          .map((el) => el.dataset.key)
          .sort();

        const cartKeys = cart.items.map((i) => i.key).sort();

        return domKeys.length === cartKeys.length && domKeys.every((k, i) => k === cartKeys[i]);
      };

      // Calculate discount amount based on compare-at prices from DOM.
      calculateSaleDiscount = (cart) => {
        let saleDiscount = 0;

        cart.items.forEach((cartItem) => {
          const key = cartItem.key;
          const qty = cartItem.quantity;

          const domItem = this.querySelector(`.js-cart__item[data-key="${key}"]`);
          if (!domItem) return;

          const price = Number(domItem.dataset.price) || 0;
          const compare = Number(domItem.dataset.comparePrice) || 0;

          if (compare > price) {
            saleDiscount += (compare - price) * qty;
          }
        });

        return saleDiscount;
      };

      // Format cents to theme money string using configured money format.
      formatMoney = (cents) => {
        return this.formatMoneyHelper(cents, this.moneyFormat);
      };

      // Shared money formatting helper for different Shopify placeholders.
      formatMoneyHelper = (cents, format = null) => {
        if (typeof cents === "string") cents = cents.replace(".", "");

        const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
        const formatString = format || document.getElementById("cart-money-format")?.innerHTML?.trim() || "${{amount}}";

        const defaultOption = (opt, def) => (typeof opt === "undefined" ? def : opt);

        const formatWithDelimiters = (number, precision, thousands, decimal) => {
          precision = defaultOption(precision, 2);
          thousands = defaultOption(thousands, ",");
          decimal = defaultOption(decimal, ".");

          if (isNaN(number) || number == null) return 0;

          number = (number / 100.0).toFixed(precision);

          const parts = number.split(".");
          const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands);
          const centsPart = parts[1] ? decimal + parts[1] : "";

          return dollars + centsPart;
        };

        let value = "";

        const isWholeNumber = cents % 100 === 0;
        const precision = this.enableTrailingZeros || !isWholeNumber ? 2 : 0;

        const formatType = formatString.match(placeholderRegex)?.[1];

        switch (formatType) {
          case "amount":
          case "amount_no_decimals":
            value = formatWithDelimiters(cents, precision);
            break;

          case "amount_with_comma_separator":
          case "amount_no_decimals_with_comma_separator":
            value = formatWithDelimiters(cents, precision, ".", ",");
            break;

          default:
            value = formatWithDelimiters(cents, precision);
        }

        return formatString.replace(placeholderRegex, value);
      };

      playFooterLoader = () => {
        this.classList.add("footer-loading");
      };

      stopFooterLoader = () => {
        this.classList.remove("footer-loading");
      };

      playLoader = () => {
        this.classList.add("loading");
      };

      stopLoader = () => {
        this.classList.remove("loading");
      };

      // Hide discount validation error state.
      hideError = () => {
        const discountContainer = this.querySelector(".js-cart__discount-container");
        discountContainer.classList.remove("is-not-valid");
      };

      // Submit current set of discount codes to cart API.
      updateDiscountCodes = async (discountCodes) => {
        this.playFooterLoader();

        try {
          const response = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discount: discountCodes.join(",") }),
          });

          const cart = await response.json();
          return cart;
        } catch (e) {
          console.error("updateDiscountCodes error:", e);
          throw e;
        } finally {
          this.stopFooterLoader();
        }
      };

      fetchCart = async () => {
        try {
          const res = await fetch(`${window.Shopify.routes.root}cart.js`);
          return await res.json();
        } catch (e) {
          console.error("Cart fetch failed:", e);
          return null;
        }
      };

      getProductFromItem = (item) => ({
        epi: item.dataset.epi,
        empi: item.dataset.empi,
        du: item.dataset.du,
      });

      getLocalWishlistProducts = () => {
        let localProducts = window.localStorage.getItem("iWishlistmain") || null;
        if (localProducts === null) return {};

        return JSON.parse(localProducts);
      };

      removeItemAnimation = async (element) => {
        element.classList.add("is-removing");
        await this.waitTransition(element);

        element.classList.add("is-removed");

        await this.waitTransition(element);
        element.remove();
      };

      waitTransition = (element) => {
        return new Promise((resolve) => {
          let done = false;

          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };

          element.addEventListener("transitionend", finish, { once: true });

          setTimeout(finish, 280);
        });
      };
    }
  );
}
