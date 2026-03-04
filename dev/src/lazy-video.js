if (!customElements.get("c-lazy-video")) {
  customElements.define(
    "c-lazy-video",
    class CLazyVideo extends HTMLElement {
      constructor() {
        super();

        this._activeTimeout = null;
      }

      connectedCallback() {
        this.video = this.querySelector("video");

        if (!this.video) return;

        this.video.muted = this.dataset.muted === "true";
        this.video.loop = this.dataset.loop === "true";
        this.video.controls = this.dataset.controls === "true";
        this.video.preload = this.dataset.preload || "none";
        this.video.playsInline = true;

        this.videoContainer = this;
        this.playPauseBtn = this.querySelector(".c-lazy-video__custom-controls");

        if (this.dataset.autoplay === "true") {
          this.video.setAttribute("data-autoplay", "true");
        } else {
          this.video.removeAttribute("data-autoplay");
        }

        this.video?.addEventListener("play", this.handlePlay);
        this.video?.addEventListener("pause", this.handlePause);
        this.videoContainer?.addEventListener("click", this.videoClickHandler);
        this.debouncedResize = debounce(this.handleResize.bind(this), 100);
        window.addEventListener("resize", this.debouncedResize);

        this.initObserver();
      }

      disconnectedCallback() {
        this.video?.removeEventListener("play", this.handlePlay);
        this.video?.removeEventListener("pause", this.handlePause);
        this.videoContainer?.removeEventListener("click", this.videoClickHandler);
        window.removeEventListener("resize", this.debouncedResize);

        this.observer?.disconnect();
      }

      handlePlay = () => {
        this.playPauseBtn && (this.playPauseBtn.dataset.state = "pause");
      };

      handlePause = () => {
        this.playPauseBtn && (this.playPauseBtn.dataset.state = "play");
      };

      clearActiveTimer = () => {
        if (this._activeTimeout) {
          clearTimeout(this._activeTimeout);
          this._activeTimeout = null;
        }
      };

      setActiveState = () => {
        if (!this.playPauseBtn) return;

        this.playPauseBtn.classList.add("is-active");

        this.clearActiveTimer();
        this._activeTimeout = setTimeout(() => {
          this.playPauseBtn?.classList.remove("is-active");
          this._activeTimeout = null;
        }, 2000);
      };

      toggleCustomButton = () => {
        if (!this.video) return;

        if (this.video.paused) {
          this.video.play();
          this.classList.add("is-loaded");
        } else {
          this.video.pause();
        }
      };

      videoClickHandler = (event) => {
        if (!this.video) return;

        if (this.isMobile()) {
          const isActive = this.playPauseBtn?.classList.contains("is-active");

          // 1st tap
          if (!isActive) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            this.setActiveState();
            return;
          }

          // 2nd tap
          this.clearActiveTimer();
          this.playPauseBtn?.classList.remove("is-active");

          this.toggleCustomButton();
          return;
        } else {
          this.playPauseBtn?.classList.remove("is-active");
        }

        this.toggleCustomButton();
      };

      handleResize = () => {
        if (!this.video.dataset.loaded) return;

        let newMode = "desktop";
        if (this.isMobile()) newMode = "mobile";
        else if (this.isTablet()) newMode = "tablet";

        if (newMode === this.currentMode) return;
        this.swapVideoSource();
      };

      initObserver() {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                this.loadVideo();
                this.observer.disconnect();
              }
            });
          },
          { rootMargin: "200px 0px", threshold: 0 }
        );

        this.observer.observe(this.video);
      }

      isMobile() {
        return window.matchMedia("(max-width: 767px)").matches;
      }

      isTablet() {
        return window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches;
      }

      loadVideo() {
        if (this.video.dataset.loaded) return;

        this.swapVideoSource();
        this.video.dataset.loaded = "true";

        this.video.addEventListener("canplay", () => this.playVideo(), {
          once: true,
        });
      }

      getBestSource() {
        const isMobile = this.isMobile();
        const isTablet = this.isTablet();

        let sources = [];

        if (isMobile) {
          sources = [
            { src: this.dataset.mobileWebm, type: "video/webm" },
            { src: this.dataset.mobileMp4, type: "video/mp4" },
            { src: this.dataset.tabletWebm, type: "video/webm" },
            { src: this.dataset.tabletMp4, type: "video/mp4" },
            { src: this.dataset.desktopWebm, type: "video/webm" },
            { src: this.dataset.desktopMp4, type: "video/mp4" },
          ];
        } else if (isTablet) {
          sources = [
            { src: this.dataset.tabletWebm, type: "video/webm" },
            { src: this.dataset.tabletMp4, type: "video/mp4" },
            { src: this.dataset.desktopWebm, type: "video/webm" },
            { src: this.dataset.desktopMp4, type: "video/mp4" },
          ];
        } else {
          sources = [
            { src: this.dataset.desktopWebm, type: "video/webm" },
            { src: this.dataset.desktopMp4, type: "video/mp4" },
          ];
        }

        return sources.find((source) => source.src && source.src.trim().length > 0);
      }

      swapVideoSource() {
        const bestSource = this.getBestSource();

        if (this.isMobile()) this.currentMode = "mobile";
        else if (this.isTablet()) this.currentMode = "tablet";
        else this.currentMode = "desktop";

        if (!bestSource) return;

        const wasPlaying = !this.video.paused;
        this.video.querySelectorAll("source").forEach((source) => source.remove());

        const sourceEl = document.createElement("source");
        sourceEl.src = bestSource.src;
        sourceEl.type = bestSource.type;
        this.video.appendChild(sourceEl);
        this.video.load();

        if (wasPlaying || this.video.hasAttribute("data-autoplay")) {
          this.video.play().catch(console.warn);
        }
      }

      playVideo() {
        if (!this.video.hasAttribute("data-autoplay")) return;

        this.classList.add("is-loaded");

        const playPromise = this.video.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => console.warn("Autoplay blocked:", error));
        }
      }
    }
  );
}
