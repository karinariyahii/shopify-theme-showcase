if (!customElements.get("c-contact-us")) {
  customElements.define(
    "c-contact-us",
    class ContactUsForm extends HTMLElement {
      constructor() {
        super();
        this.form = null;
        this.inputs = null;
        this.submitButton = null;
        this.formError = null;
        this.originalConsoleError = null;
      }

      connectedCallback() {
        this.form = this.querySelector(".js-contact-us__form");
        this.inputs = Array.from(this.querySelectorAll(".js-contact-us__input, .js-contact-us__textarea"));
        this.submitButton = this.querySelector(".js-contact-us__submit");
        this.formError = this.querySelector(".js-contact-us__form-error");

        this.textarea = this.querySelector(".js-contact-us__textarea");
        this.textareaCounterCurrent = this.querySelector(".js-contact-us__textarea-counter-current");
        this.textareaCharsError = this.querySelector(".js-contact-us__chars-error");

        this.maxLength = parseInt(this.textarea?.dataset.maxLength || "600", 10);

        this.originalConsoleError = console.error;
        console.error = (...args) => {
          const message = args.join(" ");
          if (message.includes("form submit failed")) {
            this.showFormError();
          }
          this.originalConsoleError(...args);
        };

        this.form.addEventListener("submit", this.handleSubmit);
        this.form.addEventListener("error", this.handleFormError);
        this.initInputs();

        this.updateTextareaCounter();

        window.addEventListener("pageshow", this.resetFormInputs);
      }

      disconnectedCallback() {
        this.form.removeEventListener("submit", this.handleSubmit);
        this.form.removeEventListener("error", this.handleFormError);
        this.inputs.forEach((input) => {
          input.removeEventListener("input", this.toggleFilled);
        });
        window.removeEventListener("pageshow", this.resetFormInputs);
      }

      resetFormInputs = () => {
        console.log("Resetting form inputs on pageshow");
        this.inputs.forEach((input) => {
          if (input.name !== "contact[subject]") {
            input.value = "";
          }
        });
      }

      initInputs = () => {
        this.inputs.forEach((input) => {
          this.toggleFilled(input);
          input.addEventListener("input", () => {
            this.toggleFilled(input);
            this.resetFieldError(input);
            this.updateSubmitButtonState();
            if (input === this.textarea) {
              this.updateTextareaCounter();
            }
          });
        });
      };

      toggleFilled = (input) => {
        const wrapper = input.closest(".js-contact-us__input-wrapper");

        if (wrapper) {
          if (input.value.trim() !== "") {
            wrapper.classList.add("filled");
          } else {
            wrapper.classList.remove("filled");
          }
        }
      };

      getErrorElements = (input) => {
        const wrapper = input.closest(".js-contact-us__input-wrapper");
        if (!wrapper) return { wrapper: null, errorElement: null, textareaError: null, textareaLengthError: null };
        return {
          wrapper,
          errorElement: wrapper.querySelector(".js-contact-us__input-error"),
          textareaError: wrapper.querySelector(".js-contact-us__textarea-error"),
          textareaLengthError: wrapper.querySelector(".js-contact-us__textarea-length-error")
        };
      };

      getValidationRule = (input) => {
        const rules = {
          "contact[email]": (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          "contact[full_name]": (value) => value !== "" && /^[A-Za-z]+$/.test(value),
          "contact[body]": (value, maxLength) => {
            const isEmpty = value.length === 0;
            const isOverLength = maxLength > 0 && value.length > maxLength;
            return { isValid: !isEmpty && !isOverLength, isTooLong: isOverLength };
          }
        };
        return rules[input.name] || (() => ({ isValid: true, isTooLong: false }));
      };

      validateField = (input) => {
        const value = input.value.trim();
        const { wrapper, errorElement, textareaError, textareaLengthError } = this.getErrorElements(input);
        if (!wrapper) return true;

        const rule = this.getValidationRule(input);
        let isValid = true;
        let isTooLong = false;

        if (input.name === "contact[body]") {
          const result = rule(value, this.maxLength);
          isValid = result.isValid;
          isTooLong = result.isTooLong;
        } else {
          isValid = rule(value);
        }

        this.updateFieldErrorState(wrapper, errorElement, textareaError, textareaLengthError, isValid, isTooLong);

        return isValid;
      };

      updateFieldErrorState = (wrapper, errorElement, textareaError, textareaLengthError, isValid, isTooLong) => {
        wrapper.classList.toggle("is-error", !isValid);
        if (textareaError && textareaLengthError) {
          textareaError.classList.toggle("is-error", !isValid && !isTooLong);
          textareaLengthError.classList.toggle("is-error", isTooLong);
        } else if (errorElement) {
          errorElement.classList.toggle("is-active", !isValid);
        }
      };

      validateForm = () => {
        let allValid = true;
        this.inputs.forEach((input) => {
          if (input.name === "contact[full_name]" || input.name === "contact[email]" || input.name === "contact[body]") {
            const isValid = this.validateField(input);
            if (!isValid) {
              allValid = false;
            }
          }
        });
        return allValid;
      };

      resetFieldError = (input) => {
        const { wrapper, errorElement, textareaError, textareaLengthError } = this.getErrorElements(input);
        if (wrapper) {
          wrapper.classList.remove("is-error");
        }
        if (errorElement) {
          errorElement.classList.remove("is-active");
        }
        if (textareaError) {
          textareaError.classList.remove("is-error");
        }
        if (textareaLengthError) {
          textareaLengthError.classList.remove("is-error");
        }
      };

      resetErrors = () => {
        this.inputs.forEach((input) => {
          this.resetFieldError(input);
        });
        if (this.formError) {
          this.formError.classList.remove("is-error");
        }
      };

      updateSubmitButtonState = () => {
        const hasErrors = Array.from(this.inputs).some((input) => {
          const wrapper = input.closest(".js-contact-us__input-wrapper");
          return wrapper?.classList.contains("is-error");
        });
        this.submitButton.classList.toggle("is-disabled", hasErrors);
      };

      handleFormError = (event) => {
        console.error("Form error event:", event);
        this.showFormError();
      };

      handleCaptchaError = () => {
        this.showFormError();
      };

      showFormError = () => {
        if (this.formError) {
          this.formError.classList.add("is-error");
        }
        this.form.addEventListener("submit", this.handleSubmit);
      };

      updateTextareaCounter = () => {
        if (!this.textarea || !this.textareaCounterCurrent) return;

        const length = this.textarea.value.length;
        this.textareaCounterCurrent.textContent = length;

        const isTooLong = this.maxLength > 0 && length > this.maxLength;

        const wrapper = this.textarea.closest(".js-contact-us__input-wrapper");
        const textareaLengthError = this.textareaCharsError;

        if (textareaLengthError && wrapper && isTooLong) {
          textareaLengthError.classList.toggle("is-error", isTooLong);
          wrapper.classList.toggle("is-error", isTooLong);
          this.submitButton.classList.add("is-disabled");
        }
      };

      handleSubmit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        this.resetErrors();

        const isValid = this.validateForm();

        if (isValid) {
          this.submitButton.classList.remove("is-disabled");
          this.form.removeEventListener("submit", this.handleSubmit);
          try {
            this.form.dispatchEvent(new Event("submit"));
          } catch (error) {
            console.error("Form submission error:", error);
            this.handleFormError({ detail: error });
          }
        } else {
          this.submitButton.classList.add("is-disabled");
        }
      };
    }
  );
}
