if (!customElements.get("s-multiple-videos")) {
  customElements.define(
    "s-multiple-videos",
    class SectionMultipleVideos extends HTMLElement {
      constructor() {
        super();
        this.activeElements = new Set();
        this.lastScrollY = window.scrollY;

        this._initSectionOnce = this.initSection.bind(this)
      }

      connectedCallback() {
        this.videos = this.querySelectorAll(".s-multiple-videos__bg-video-src");
        this.allVideos = this.querySelectorAll("video");
        this.videoBlocks = this.querySelectorAll(".js-multiple-videos__video");
        this.coverImages = this.querySelectorAll(".s-multiple-videos__image-cover");
        this.modalsContainer = document.querySelector("#modals-container");
        this.allowBlocksMove = false;

        this.addEventListener("click", this.handleClick, true);
        document.addEventListener("scroll", this._initSectionOnce, { once: true });
        document.addEventListener("touchstart", this._initSectionOnce, { once: true });
        document.addEventListener("mousemove", this._initSectionOnce, { once: true });
        document.addEventListener("click", this._initSectionOnce, { once: true });
        window.addEventListener("scroll", this.onScroll, { passive: true });
        window.addEventListener("resize", this.handleResize);
        this.videoBlocks.forEach((video) => video.addEventListener("mouseover", this.handleVideoHover));

        this.initScrollObserver();

        this.lastScrollY = window.scrollY;
      }

      disconnectedCallback() {
        this.removeEventListener("click", this.handleClick, true);
        window.removeEventListener("resize", this.handleResize);
        window.removeEventListener("scroll", this.onScroll);
        this.videoBlocks.forEach((video) => video.removeEventListener("mouseover", this.handleVideoHover));
        this.scrollObserver?.disconnect();
      }

      initScrollObserver() {
        if (!this.videoBlocks?.length) return;

        this.scrollObserver?.disconnect();

        this.scrollObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                this.activeElements.add(entry.target);
              } else {
                this.activeElements.delete(entry.target);
              }
            });
          },
          { root: null, threshold: 0.1 }
        );

        this.videoBlocks.forEach((el) => this.scrollObserver.observe(el));
      }

      handleVideoHover = (event) => {
        const videoEl = event.target.closest(".js-multiple-videos__video");
        if (window.innerWidth > 768) {
          this.playVideo(videoEl);

          window.setTimeout(() => {
            videoEl.classList.add("hovered");
          }, 100);

          videoEl.addEventListener("mouseleave", this.handleVideoMouseleave);
        }
      };

      handleVideoMouseleave = (event) => {
        const videoEl = event.target.closest(".js-multiple-videos__video");
        videoEl.classList.remove("hovered");
        this.stopVideo(videoEl);
      };

      handleResize = () => {
        this.videoBlocks.forEach((el) => {
          el.style.transform = "translateY(0)";
          el.dataset.scrollPos = "0";
        });

        this.scrollObserver?.disconnect();
        this.activeElements.clear();
        this.initScrollObserver();
      };

      onScroll = () => {
        if (window.innerWidth > 767) {
          requestAnimationFrame(this.animateBlocks);
        }
      };

      animateBlocks = () => {
        const scrollingDirection = this.lastScrollY - window.scrollY > 0 ? "up" : "down";

        this.activeElements.forEach((el) => {
          const speed = parseFloat(el.dataset.speed) || 1;
          const elScrollPos = parseFloat(el.dataset.scrollPos) || 0;

          const newPos = scrollingDirection === "down"
            ? elScrollPos + speed
            : elScrollPos - speed;

          el.dataset.scrollPos = String(newPos);
          el.style.transform = `translateY(-${newPos}px)`;
        });

        this.lastScrollY = window.scrollY;
      };

      handleClick = (event) => {
        const target = event.target;

        if (target.closest(".js-multiple-videos__video.fixed") || target.closest(".s-multiple-videos__video-close")) {
          this.closeVideo(event);
          return;
        }

        const sourceEl = target.closest(".js-multiple-videos__video");
        if (!sourceEl) return;

        if (window.innerWidth <= 768) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          this.openVideo(sourceEl);
          return;
        }

        this.openVideo(sourceEl);
      };

      openVideo = (sourceEl) => {
        if (!this.modalsContainer) return;

        const videoEl = sourceEl.cloneNode(true);
        videoEl.style.transform = "translateY(0)";
        videoEl.dataset.scrollPos = "0";
        videoEl.classList.add("fixed");

        this.modalsContainer.appendChild(videoEl);
        this.playVideo(videoEl, false);

        videoEl.addEventListener("click", this.closeVideo);
      };

      closeVideo = (event) => {
        const videoEl = event.target.closest(".js-multiple-videos__video.fixed");
        if (!event.target.closest("video") && !event.target.closest("img")) {
          videoEl.remove();
        }
      };

      playVideo = (videoEl, addTimeout = true) => {
        const lazy = videoEl?.querySelector("c-lazy-video");
        const video = lazy?.querySelector("video");
        if (!video) return;

        const doPlay = () => {
          if (lazy && typeof lazy.loadVideo === "function") lazy.loadVideo();

          const p = video.play();
          if (p?.catch) {
            p.then(() => this.dlog("PLAY OK"))
            .catch((e) => this.dlog("PLAY FAIL", e.name, e.message));
          }
        };

        if (addTimeout) setTimeout(doPlay, 100);
        else doPlay();
      };

      stopVideo = (videoEl) => {
        const video = videoEl?.querySelector("c-lazy-video video");
        video?.pause();
      };


      initSection = () => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;

            const lazies = this.querySelectorAll("c-lazy-video");

            lazies.forEach((lazy, i) => {
              const video = lazy.querySelector("video");

              if (typeof lazy.loadVideo === "function") {
                lazy.loadVideo();
              }
            });

            observer.disconnect();
          },
          { root: null, threshold: 0.3 }
        );

        observer.observe(this);
      };
    }
  );
}
