if (!customElements.get("s-results-page")) {
  customElements.define(
    "s-results-page",
    class ResultsPage extends HTMLElement {
      constructor() {
        super();
        this.normCache = new Map();
      }

      connectedCallback() {
        this.nav = this.querySelector(".js-results-page__nav");
        this.navLinksWrapper = this.querySelector(".js-results-page__nav-links");
        this.resultsWrapper = this.querySelector(".js-results-page__results");
        this.titleWrapper = this.querySelector(".js-results-page__result-title-wrapper");
        this.loader = this.querySelector(".js-results-page__loader");

        this.templates = {
          navLink: this.querySelector(".t-results-page__nav-link"),
          navAll: this.querySelector(".t-results-page__nav-link--all-sections"),
          resultTitle: this.querySelector(".t-results-page__result-title"),
          result: this.querySelector(".t-results-page__result"),
          noResults: this.querySelector(".t-results-page__nav-link--no-results"),
          clearSearch: this.querySelector(".t-results-page__clear-search"),
        };

        this.searchQuery = new URLSearchParams(window.location.search).get("q") || "";

        if (!window.ALL_FAQ_CATEGORIES) return;

        this.showLoader();
        requestAnimationFrame(() => {
          this.render();
          this.hideLoader();
        });

        this.searchQueryUnsubscriber = window.PubSub.subscribe("support-hub-search-update", ({ query }) => {
          const nextQuery = query || "";
          if (nextQuery.toLowerCase() === this.searchQuery.toLowerCase()) return;

          this.searchQuery = nextQuery;
          this.showLoader();
          requestAnimationFrame(() => {
            this.render();
            this.hideLoader();
          });
        });

        this.nav.addEventListener("click", this.handleNavClick);
        window.addEventListener("resize", this.setNavTop);
        this.setNavTop();
      }

      disconnectedCallback() {
        this.clearSearchButton?.removeEventListener("click", this.handleClearSearch);
        this.searchQueryUnsubscriber?.();
        this.nav?.removeEventListener("click", this.handleNavClick);
        window.removeEventListener("resize", this.setNavTop);
      }

      normalizeText(text = "") {
        if (this.normCache.has(text)) return this.normCache.get(text);
        const res = String(text)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\p{L}\p{N}\s-]/gu, " ")
          .replace(/\s+/g, " ")
          .trim();
        this.normCache.set(text, res);
        return res;
      }

      tokenize(text = "") {
        return this.normalizeText(text)
          .split(" ")
          .filter((t) => t.length >= 2);
      }

      levenshtein(a, b) {
        const tmp = [];
        for (let i = 0; i <= a.length; i++) tmp[i] = [i];
        for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = a[i - 1] === b[j - 1] ? tmp[i - 1][j - 1] : Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + 1);
          }
        }
        return tmp[a.length][b.length];
      }

      getMatchScore(faq, query, tokens) {
        const qText = this.normalizeText(faq.question);
        const aText = this.normalizeText(faq.answer || "");
        const combined = qText + " " + aText;
        let score = 0;

        if (qText.includes(query)) score += 100;
        else if (aText.includes(query)) score += 40;

        const words = combined.split(" ");
        tokens.forEach((t) => {
          let bestForToken = 0;

          words.forEach((w) => {
            if (w === t) {
              bestForToken = Math.max(bestForToken, 30);
            } else if (w.startsWith(t)) {
              bestForToken = Math.max(bestForToken, 20);
            } else if (t.length >= 3) {
              const dist = this.levenshtein(t, w);
              const maxAllowedDist = t.length > 5 ? 2 : 1;

              if (dist <= maxAllowedDist) {
                bestForToken = Math.max(bestForToken, 15);
              }
            }
          });
          score += bestForToken;
        });

        return score >= 15 ? score : 0;
      }

      collectMatches() {
        const query = this.searchQuery.trim();
        if (!query) return [];
        const normQuery = this.normalizeText(query);
        const tokens = this.tokenize(normQuery);

        const result = window.ALL_FAQ_CATEGORIES.map(({ category, faqs }) => {
          const matchedFaqs = faqs
            .map((f) => ({ ...f, _score: this.getMatchScore(f, normQuery, tokens) }))
            .filter((f) => f._score > 0)
            .sort((a, b) => b._score - a._score);

          return matchedFaqs.length ? { category, faqs: matchedFaqs } : null;
        }).filter(Boolean);

        return result.sort((a, b) => b.faqs[0]._score - a.faqs[0]._score);
      }

      render() {
        this.navLinksWrapper.innerHTML = "";
        this.resultsWrapper.innerHTML = "";
        this.titleWrapper.innerHTML = "";

        if (!this.searchQuery) {
          this.renderNav([]);
          this.renderTitle([]);
          return;
        }

        const matches = this.collectMatches();
        this.renderNav(matches);
        this.renderTitle(matches);
        this.renderResults(matches);
      }

      renderNav(matches) {
        const allCount = matches.reduce((sum, { faqs }) => sum + faqs.length, 0);
        if (allCount > 0) {
          this.navLinksWrapper.insertAdjacentHTML("beforeend", this.compileTemplate("navAll", { count: allCount }));
          matches.forEach(({ category, faqs }) => {
            this.navLinksWrapper.insertAdjacentHTML(
              "beforeend",
              this.compileTemplate("navLink", {
                category_name: category,
                count: faqs.length,
                category_class: category.toLowerCase().replace(/\s+/g, "-"),
              })
            );
          });
        } else {
          this.navLinksWrapper.insertAdjacentHTML("beforeend", this.compileTemplate("noResults"));
        }
      }

      renderTitle(matches) {
        const totalCount = matches.reduce((sum, { faqs }) => sum + faqs.length, 0);
        this.titleWrapper.innerHTML = this.compileTemplate("resultTitle", {
          count: totalCount,
          search_query: `"${this.searchQuery}"`,
        });
      }

      renderResults(matches) {
        if (!matches.length) {
          this.resultsWrapper.insertAdjacentHTML("beforeend", this.compileTemplate("clearSearch"));
          this.querySelector(".js-results-page__clear-search")?.addEventListener("click", this.handleClearSearch);
          return;
        }

        matches.forEach(({ category, faqs }) => {
          faqs.forEach((faq) => {
            this.resultsWrapper.insertAdjacentHTML(
              "beforeend",
              this.compileTemplate("result", {
                category_title: category,
                faq_question: faq.question,
                faq_sentence: this.extractSentence(faq.answer),
                faq_url: faq.url,
                category_class: category.toLowerCase().replace(/\s+/g, "-"),
              })
            );
          });
        });
      }

      extractSentence(answer = "") {
        const sentences = String(answer).split(/(?<=[.!?])\s+/);
        const normQuery = this.normalizeText(this.searchQuery);
        const tokens = this.tokenize(normQuery);
        if (!sentences.length) return "";

        let best = { s: sentences[0], score: -1, highlights: new Set() };

        sentences.forEach((s) => {
          const normS = this.normalizeText(s);
          const words = normS.split(" ");
          let currentScore = 0;
          let currentHighlights = new Set();

          tokens.forEach((t) => {
            words.forEach((w, i) => {
              const dist = this.levenshtein(t, w);
              const maxAllowedDist = t.length > 5 ? 2 : 1;

              if (w.includes(t) || (t.length >= 3 && dist <= maxAllowedDist)) {
                currentScore += w === t ? 10 : 5;
                currentHighlights.add(i);
              }
            });
          });

          if (currentScore > best.score) {
            best = { s, score: currentScore, highlights: currentHighlights };
          }
        });

        const originalWords = best.s.split(/(\s+)/);
        let wordIdx = 0;
        return originalWords
          .map((part) => {
            if (part.trim().length === 0) return part;
            const isHit = best.highlights.has(wordIdx);
            wordIdx++;
            return isHit ? `<strong>${part}</strong>` : part;
          })
          .join("");
      }

      handleClearSearch = () => window.PubSub.publish("support-hub-clear-search");

      showLoader() {
        this.loader?.classList.remove("is-hidden");
        this.nav?.classList.add("is-hidden");
      }

      hideLoader() {
        this.loader?.classList.add("is-hidden");
        this.nav?.classList.remove("is-hidden");
      }

      handleNavClick = (e) => {
        const btn = e.target.closest(".js-results-page__nav-link");
        if (!btn) return;
        this.nav.querySelectorAll(".js-results-page__nav-link").forEach((l) => l.classList.remove("is-active"));
        btn.classList.add("is-active");

        const cat = btn.dataset.category;
        this.querySelectorAll(".s-results-page__result").forEach((res) => {
          res.classList.toggle("is-hidden", cat ? !res.classList.contains(`s-results-page__result--${cat}`) : false);
        });
      };

      compileTemplate(name, params = {}) {
        let template = this.templates[name];
        if (!template) return "";
        let html = template.innerHTML;
        Object.entries(params).forEach(([k, v]) => (html = html.replaceAll(`{${k}}`, v)));
        return html;
      }

      setNavTop = () => {
        const header = document.querySelector(".s-header");
        const hubHeader = document.querySelector(".s-support-hub__header");
        const offset = (header?.offsetHeight || 0) + (hubHeader?.offsetHeight || 0) + 69;

        this.nav.style.top = offset + "px";
      }
    }
  );
}
