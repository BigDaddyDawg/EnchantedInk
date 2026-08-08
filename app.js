(() => {
  const PAGE_SIZE = 48;
  const UNIVERSE_KEY = "enchantedink_universe_v1";
  const LORCAST_CARD_URL = "https://api.lorcast.com/v0/cards";
  const PRICE_CACHE_TTL_MS = 60 * 60 * 1000;
  const HEART_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.2s-6.7-4.2-9.1-8.1C1.2 9.4 2.1 6.4 5 5.4c1.8-.6 3.7.1 4.8 1.5C11 5.5 12.9 4.8 14.7 5.4c2.9 1 3.8 4 2.1 6.7-2.4 3.9-9.1 8.1-9.1 8.1z"/></svg>`;

  const UNIVERSES = {
    lorcana: {
      id: "lorcana",
      brand: "Enchanted Ink",
      tagline: "Every Disney Lorcana card, waiting to be found.",
      catalogUrl: "./data/cards.json?v=4",
      comingUrl: "./data/coming-soon.json?v=4",
      wishlistKey: "enchantedink_wishlist_v1",
      appSlug: "enchantedink",
      newsUrl: "https://www.disneylorcana.com/en-US/news/",
      liveNewsUrl: "https://r.jina.ai/http://www.disneylorcana.com/en-US/news/",
      hasMarketPrices: true,
      liveNews: true,
      themeColor: "#07111f",
      documentTitle: "Enchanted Ink · Lorcana Gallery",
      countAllLabel: "{n} cards across every released set",
      emptySearch: "No cards match that spell. Try another search.",
      searchPlaceholder: "Search by name or character…",
      favHeading: "Whispers from the Ink",
      favBlurb: "Start with the stories closest to her heart.",
      collectionHeading: "The Full Collection",
      setLabel: "Set",
      setAll: "All sets",
      rarityLabel: "Rarity",
      rarityAll: "All rarities",
      storyLabel: "Character / Story",
      storyAll: "All stories",
      comingScout: "Peeking into the next chapter of Lorcana…",
      revealsEmpty:
        "No early card art yet — as soon as Hyperia City (and friends) are teased, they’ll sparkle here.",
      comingSetsLabel: "Next sets on the horizon",
      comingNewsLabel: "Fresh from the realm",
      comingRevealsLabel: "Newly revealed cards",
      modalStoryFallback: "Lorcana",
      modalRarityLabel: "Rarity",
      modalSetLabel: "Set",
      modalTypeLabel: "Type",
      modalColorLabel: "Ink",
      footerMainHtml:
        'Enchanted Ink · fan gallery · card data via <a href="https://lorcanajson.org/" rel="noopener" target="_blank">LorcanaJSON</a>',
      footerFine:
        "Disney Lorcana and all related marks are trademarks of Disney and Ravensburger. Not affiliated with Disney or Ravensburger.",
      favorites: [
        {
          story: "Toy Story",
          title: "Toy Story",
          kicker: "To infinity…",
          className: "fav-toy",
          pickNames: ["Woody", "Buzz Lightyear", "Jessie"],
          preferType: "Character",
        },
        {
          story: "Winnie the Pooh",
          title: "Winnie the Pooh",
          kicker: "A little smackerel",
          className: "fav-pooh",
          pickNames: ["Winnie the Pooh", "Tigger", "Piglet"],
          preferType: "Character",
        },
        {
          story: "Lilo & Stitch",
          title: "Lilo & Stitch",
          kicker: "Ohana means family",
          className: "fav-stitch",
          pickNames: ["Stitch", "Lilo", "Angel"],
          preferType: "Character",
        },
      ],
    },
    kiratto: {
      id: "kiratto",
      brand: "Enchanted Ink",
      tagline: "Tenyo’s shimmering Disney Art Gallery — every Kiratto card.",
      catalogUrl: "./data/kiratto-cards.json?v=1",
      comingUrl: "./data/kiratto-coming-soon.json?v=1",
      wishlistKey: "kirattogallery_wishlist_v1",
      appSlug: "kirattogallery",
      newsUrl: "https://tenyo.jp/agcard",
      liveNewsUrl: null,
      hasMarketPrices: false,
      liveNews: false,
      themeColor: "#140c18",
      documentTitle: "Enchanted Ink · Kiratto Gallery",
      countAllLabel: "{n} sparkling gallery cards across Blue, Red & Green packs",
      emptySearch: "No cards match that shimmer. Try another search.",
      searchPlaceholder: "Search Kiratto character or series…",
      favHeading: "Spark favorites",
      favBlurb: "Jump to the faces that light up first.",
      collectionHeading: "The Kiratto Gallery",
      setLabel: "Pack",
      setAll: "All packs",
      rarityLabel: "Finish",
      rarityAll: "All finishes",
      storyLabel: "Character",
      storyAll: "All characters",
      comingScout: "Checking the Tenyo Kiratto lineup…",
      revealsEmpty: "The full Kiratto line is already in the gallery — new waves will sparkle here.",
      comingSetsLabel: "Pack lineup",
      comingNewsLabel: "From Tenyo",
      comingRevealsLabel: "Gallery notes",
      modalStoryFallback: "Kiratto",
      modalRarityLabel: "Finish",
      modalSetLabel: "Pack",
      modalTypeLabel: "Type",
      modalColorLabel: "Color",
      footerMainHtml: "Enchanted Ink · Kiratto Art Gallery · art via Tenyo",
      footerFine:
        "Disney characters and Kiratto Art Gallery cards are trademarks of their respective owners. Not affiliated with Disney or Tenyo.",
      favorites: [
        { story: "Mickey Mouse", title: "Mickey Mouse", kicker: "It’s Magic!", className: "fav-toy" },
        { story: "Rapunzel", title: "Rapunzel", kicker: "Musical Magic", className: "fav-pooh" },
        { story: "Stitch", title: "Stitch", kicker: "Ohana", className: "fav-stitch" },
      ],
    },
  };

  function readSavedUniverse() {
    try {
      const saved = localStorage.getItem(UNIVERSE_KEY);
      if (saved && UNIVERSES[saved]) return saved;
    } catch (_) {}
    return "lorcana";
  }

  let universeId = readSavedUniverse();
  let universe = UNIVERSES[universeId];
  let WISHLIST_KEY = universe.wishlistKey;
  let NEWS_URL = universe.newsUrl;
  let LIVE_NEWS_URL = universe.liveNewsUrl;
  let switchingUniverse = false;
  let uiBound = false;

  const els = {
    grid: document.getElementById("cardGrid"),
    sentinel: document.getElementById("sentinel"),
    empty: document.getElementById("emptyState"),
    countLabel: document.getElementById("countLabel"),
    search: document.getElementById("search"),
    setFilter: document.getElementById("setFilter"),
    rarityFilter: document.getElementById("rarityFilter"),
    storyFilter: document.getElementById("storyFilter"),
    clearFilters: document.getElementById("clearFilters"),
    activePills: document.getElementById("activePills"),
    modal: document.getElementById("cardModal"),
    modalClose: document.getElementById("modalClose"),
    modalImg: document.getElementById("modalImg"),
    modalStory: document.getElementById("modalStory"),
    modalName: document.getElementById("modalName"),
    modalVersion: document.getElementById("modalVersion"),
    modalRarity: document.getElementById("modalRarity"),
    modalSet: document.getElementById("modalSet"),
    modalType: document.getElementById("modalType"),
    modalColor: document.getElementById("modalColor"),
    modalPriceRow: document.getElementById("modalPriceRow"),
    modalPrice: document.getElementById("modalPrice"),
    modalPriceNote: document.getElementById("modalPriceNote"),
    modalWish: document.getElementById("modalWish"),
    modalRarityLabel: document.getElementById("modalRarityLabel"),
    modalSetLabel: document.getElementById("modalSetLabel"),
    modalTypeLabel: document.getElementById("modalTypeLabel"),
    modalColorLabel: document.getElementById("modalColorLabel"),
    panelCollection: document.getElementById("panelCollection"),
    panelWishlist: document.getElementById("panelWishlist"),
    panelComing: document.getElementById("panelComing"),
    tabCollection: document.getElementById("tabCollection"),
    tabWishlist: document.getElementById("tabWishlist"),
    tabComing: document.getElementById("tabComing"),
    wishGrid: document.getElementById("wishGrid"),
    wishEmpty: document.getElementById("wishEmpty"),
    wishSearch: document.getElementById("wishSearch"),
    wishCountLabel: document.getElementById("wishCountLabel"),
    wishTabCount: document.getElementById("wishTabCount"),
    comingStatus: document.getElementById("comingStatus"),
    comingRefresh: document.getElementById("comingRefresh"),
    upcomingSets: document.getElementById("upcomingSets"),
    newsList: document.getElementById("newsList"),
    revealsGrid: document.getElementById("revealsGrid"),
    revealsNote: document.getElementById("revealsNote"),
    brandTitle: document.getElementById("brandTitle"),
    brandTagline: document.getElementById("brandTagline"),
    favGrid: document.getElementById("favGrid"),
    favHeading: document.getElementById("favHeading"),
    favBlurb: document.getElementById("favBlurb"),
    collectionHeading: document.getElementById("collectionHeading"),
    setFilterLabel: document.getElementById("setFilterLabel"),
    rarityFilterLabel: document.getElementById("rarityFilterLabel"),
    storyFilterLabel: document.getElementById("storyFilterLabel"),
    storyFilterAll: document.getElementById("storyFilterAll"),
    comingSetsLabel: document.getElementById("comingSetsLabel"),
    comingNewsLabel: document.getElementById("comingNewsLabel"),
    comingRevealsLabel: document.getElementById("comingRevealsLabel"),
    footerMain: document.getElementById("footerMain"),
    footerFine: document.getElementById("footerFine"),
    universeLorcana: document.getElementById("universeLorcana"),
    universeKiratto: document.getElementById("universeKiratto"),
    universeTransition: document.getElementById("universeTransition"),
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),
  };

  /** @type {{cards: any[], sets: any[], rarities: string[], stories: string[], count?: number}} */
  let catalog = { cards: [], sets: [], rarities: [], stories: [] };
  let filtered = [];
  let shown = 0;
  let searchTimer = null;
  let wishSearchTimer = null;
  let comingLoaded = false;
  let comingBusy = false;
  /** @type {any} */
  let comingData = null;
  /** @type {any[]} */
  let comingDisplayCards = [];
  /** @type {Set<string>} */
  let wishlist = new Set();
  /** @type {string | null} */
  let modalCardId = null;
  /** @type {any | null} */
  let modalCard = null;
  let modalPriceToken = 0;
  /** @type {Map<string, { at: number, text: string, note: string }>} */
  const priceCache = new Map();
  let activeTab = "collection";
  /** @type {ReturnType<typeof window.FamilyListSync.create> | null} */
  let wishSync = null;

  initStars();
  applyUniverseChrome();
  loadWishlist();
  registerServiceWorker();
  boot();

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js?v=3")
        .then((reg) => {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          reg.update().catch(() => {});
        })
        .catch(() => {});

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "ENCHANTEDINK_SW_UPDATED" && !refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  async function boot() {
    try {
      const res = await fetch(universe.catalogUrl);
      if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
      catalog = await res.json();
      await initFamilyVault();
      fillFilters();
      paintFavorites();
      if (!uiBound) {
        bindUI();
        uiBound = true;
      }
      applyFilters();
      updateWishChrome();
      maybeOpenTabFromHash();
    } catch (err) {
      els.countLabel.textContent = "The ink wouldn’t settle. Try refreshing.";
      console.error(err);
    }
  }

  function applyUniverseChrome() {
    document.documentElement.setAttribute("data-universe", universeId);
    if (els.themeColorMeta) els.themeColorMeta.setAttribute("content", universe.themeColor);
    document.title = universe.documentTitle;
    if (els.brandTitle) els.brandTitle.textContent = universe.brand;
    if (els.brandTagline) els.brandTagline.textContent = universe.tagline;
    if (els.favHeading) els.favHeading.textContent = universe.favHeading;
    if (els.favBlurb) els.favBlurb.textContent = universe.favBlurb;
    if (els.collectionHeading) els.collectionHeading.textContent = universe.collectionHeading;
    if (els.setFilterLabel) els.setFilterLabel.textContent = universe.setLabel;
    if (els.rarityFilterLabel) els.rarityFilterLabel.textContent = universe.rarityLabel;
    if (els.storyFilterLabel) els.storyFilterLabel.textContent = universe.storyLabel;
    if (els.comingSetsLabel) els.comingSetsLabel.textContent = universe.comingSetsLabel;
    if (els.comingNewsLabel) els.comingNewsLabel.textContent = universe.comingNewsLabel;
    if (els.comingRevealsLabel) els.comingRevealsLabel.textContent = universe.comingRevealsLabel;
    if (els.modalRarityLabel) els.modalRarityLabel.textContent = universe.modalRarityLabel;
    if (els.modalSetLabel) els.modalSetLabel.textContent = universe.modalSetLabel;
    if (els.modalTypeLabel) els.modalTypeLabel.textContent = universe.modalTypeLabel;
    if (els.modalColorLabel) els.modalColorLabel.textContent = universe.modalColorLabel;
    if (els.footerMain) els.footerMain.innerHTML = universe.footerMainHtml;
    if (els.footerFine) els.footerFine.textContent = universe.footerFine;
    if (els.empty) els.empty.textContent = universe.emptySearch;
    if (els.search) els.search.placeholder = universe.searchPlaceholder;
    if (els.comingStatus && !comingLoaded) els.comingStatus.textContent = universe.comingScout;
    if (els.revealsNote) els.revealsNote.textContent = universe.revealsEmpty;

    document.querySelectorAll(".universe-tab").forEach((btn) => {
      const active = btn.getAttribute("data-universe") === universeId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function playUniverseTransition() {
    const layer = els.universeTransition;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!layer || reduce) return;
    layer.hidden = false;
    layer.setAttribute("aria-hidden", "false");
    layer.classList.remove("is-flash");
    layer.classList.add("is-on");
    await sleep(700);
    layer.classList.add("is-flash");
    await sleep(260);
    layer.classList.remove("is-on", "is-flash");
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
  }

  async function switchUniverse(nextId) {
    if (!UNIVERSES[nextId] || nextId === universeId || switchingUniverse) return;
    switchingUniverse = true;
    try {
      await playUniverseTransition();
      universeId = nextId;
      universe = UNIVERSES[universeId];
      WISHLIST_KEY = universe.wishlistKey;
      NEWS_URL = universe.newsUrl;
      LIVE_NEWS_URL = universe.liveNewsUrl;
      try {
        localStorage.setItem(UNIVERSE_KEY, universeId);
      } catch (_) {}

      if (wishSync?.unsubscribe) wishSync.unsubscribe();
      wishSync = null;

      comingLoaded = false;
      comingBusy = false;
      comingData = null;
      comingDisplayCards = [];
      modalCardId = null;
      modalCard = null;
      if (els.modal?.open) els.modal.close();

      applyUniverseChrome();
      if (els.search) els.search.value = "";
      if (els.setFilter) els.setFilter.value = "";
      if (els.rarityFilter) els.rarityFilter.value = "";
      if (els.storyFilter) els.storyFilter.value = "";
      loadWishlist();
      await boot();
      showTab("collection");
    } finally {
      switchingUniverse = false;
    }
  }

  async function initFamilyVault() {
    if (!window.FamilyListSync?.create) return;
    wishSync = window.FamilyListSync.create({
      app: universe.appSlug,
      listType: "wishlist",
      storageKey: WISHLIST_KEY,
      onRemoteChange: (ids) => {
        wishlist = new Set(ids.map(String));
        updateWishChrome();
        if (activeTab === "wishlist") renderWishlist();
        if (modalCardId) {
          syncModalWishBtn();
          refreshModalPrice();
        }
      },
    });
    wishlist = await wishSync.hydrate(wishlist);
    wishSync.subscribe();
  }

  function loadWishlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      wishlist = new Set((Array.isArray(raw) ? raw : []).map(String));
    } catch {
      wishlist = new Set();
    }
  }

  function saveWishlist() {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishlist]));
    } catch (err) {
      console.warn("Could not save wishlist", err);
    }
  }

  function isWished(id) {
    return wishlist.has(String(id));
  }

  function toggleWish(id) {
    const key = String(id);
    if (wishlist.has(key)) wishlist.delete(key);
    else wishlist.add(key);
    saveWishlist();
    if (wishSync) wishSync.setItem(key, wishlist.has(key));
    syncWishButtons(key);
    updateWishChrome();
    if (activeTab === "wishlist") renderWishlist();
    if (modalCardId === key) {
      syncModalWishBtn();
      refreshModalPrice();
    }
    return wishlist.has(key);
  }

  function formatUsd(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: n >= 100 ? 0 : 2,
    }).format(n);
  }

  function formatMarketPrices(prices, rarity) {
    const usd = formatUsd(prices?.usd);
    const foil = formatUsd(prices?.usd_foil);
    const enchanted = /enchanted|epic|iconic/i.test(String(rarity || ""));
    if (enchanted && foil) return { text: foil, note: "Approx. foil market · Lorcast" };
    if (usd && foil) return { text: `${usd} · Foil ${foil}`, note: "Approx. current selling · Lorcast" };
    if (usd) return { text: usd, note: "Approx. current selling · Lorcast" };
    if (foil) return { text: foil, note: "Approx. foil market · Lorcast" };
    return null;
  }

  function setModalPriceState(text, note, visible) {
    if (!els.modalPriceRow || !els.modalPrice) return;
    els.modalPriceRow.hidden = !visible;
    els.modalPrice.textContent = text;
    if (els.modalPriceNote) els.modalPriceNote.textContent = note;
  }

  function refreshModalPrice() {
    if (!universe.hasMarketPrices) {
      setModalPriceState("—", "", false);
      return;
    }
    if (!modalCard || !isWishable(modalCard.id) || !isWished(modalCard.id)) {
      setModalPriceState("—", "Approx. current selling · Lorcast", false);
      return;
    }
    loadModalPrice(modalCard);
  }

  async function loadModalPrice(card) {
    const key = String(card.id);
    const token = ++modalPriceToken;
    const cached = priceCache.get(key);
    if (cached && Date.now() - cached.at < PRICE_CACHE_TTL_MS) {
      setModalPriceState(cached.text, cached.note, true);
      return;
    }

    const setCode = card.setCode != null ? String(card.setCode) : "";
    const number = card.number != null ? String(card.number) : "";
    if (!setCode || !number) {
      setModalPriceState("Unavailable", "No market match for this card yet", true);
      return;
    }

    setModalPriceState("Looking up…", "Approx. current selling · Lorcast", true);

    try {
      const res = await fetch(
        `${LORCAST_CARD_URL}/${encodeURIComponent(setCode)}/${encodeURIComponent(number)}`
      );
      if (token !== modalPriceToken || modalCardId !== key) return;
      if (!res.ok) {
        setModalPriceState("Unavailable", "No live listing found for this print", true);
        return;
      }
      const data = await res.json();
      const formatted = formatMarketPrices(data.prices, card.rarity || data.rarity);
      if (!formatted) {
        setModalPriceState("Unavailable", "No recent selling price yet", true);
        return;
      }
      priceCache.set(key, { at: Date.now(), text: formatted.text, note: formatted.note });
      setModalPriceState(formatted.text, formatted.note, true);
    } catch (err) {
      if (token !== modalPriceToken || modalCardId !== key) return;
      console.warn("Market price lookup failed", err);
      setModalPriceState("Unavailable", "Couldn’t reach price data right now", true);
    }
  }

  function fillFilters() {
    if (els.setFilter) {
      els.setFilter.innerHTML = `<option value="">${escapeHtml(universe.setAll)}</option>`;
      for (const set of catalog.sets || []) {
        const opt = document.createElement("option");
        opt.value = set.code;
        opt.textContent = set.name;
        els.setFilter.appendChild(opt);
      }
    }
    if (els.rarityFilter) {
      els.rarityFilter.innerHTML = `<option value="">${escapeHtml(universe.rarityAll)}</option>`;
      for (const rarity of catalog.rarities || []) {
        const opt = document.createElement("option");
        opt.value = rarity;
        opt.textContent = rarity;
        els.rarityFilter.appendChild(opt);
      }
    }
    if (els.storyFilter) {
      els.storyFilter.innerHTML = "";
      const all = document.createElement("option");
      all.value = "";
      all.id = "storyFilterAll";
      all.textContent = universe.storyAll;
      els.storyFilter.appendChild(all);
      els.storyFilterAll = all;
      for (const story of catalog.stories || []) {
        const opt = document.createElement("option");
        opt.value = story;
        opt.textContent = story;
        els.storyFilter.appendChild(opt);
      }
    }
  }

  function paintFavorites() {
    const grid = els.favGrid;
    if (!grid) return;
    grid.innerHTML = "";
    for (const fav of universe.favorites) {
      const btn = document.createElement("button");
      btn.className = `fav-card ${fav.className || ""}`.trim();
      btn.type = "button";
      btn.dataset.story = fav.story;
      btn.innerHTML = `
        <span class="fav-art"></span>
        <span class="fav-copy">
          <span class="fav-kicker">${escapeHtml(fav.kicker || "")}</span>
          <span class="fav-title">${escapeHtml(fav.title || fav.story)}</span>
        </span>
      `;
      const art = btn.querySelector(".fav-art");
      const picks = fav.pickNames || [];
      let card = null;
      if (picks.length) {
        card = catalog.cards.find(
          (c) =>
            c.story === fav.story &&
            picks.includes(c.name) &&
            (!fav.preferType || c.type === fav.preferType)
        );
      }
      if (!card) {
        card =
          catalog.cards.find(
            (c) => c.story === fav.story && (!fav.preferType || c.type === fav.preferType)
          ) || catalog.cards.find((c) => c.story === fav.story || c.name === fav.story);
      }
      if (card && art) art.style.backgroundImage = `url("${card.full || card.thumb}")`;
      grid.appendChild(btn);
    }
  }

  function bindUI() {
    els.search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 160);
    });
    els.setFilter.addEventListener("change", applyFilters);
    els.rarityFilter.addEventListener("change", applyFilters);
    els.storyFilter.addEventListener("change", applyFilters);
    els.clearFilters.addEventListener("click", () => {
      els.search.value = "";
      els.setFilter.value = "";
      els.rarityFilter.value = "";
      els.storyFilter.value = "";
      applyFilters();
    });

    els.favGrid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".fav-card");
      if (!btn) return;
      showTab("collection");
      const story = btn.getAttribute("data-story") || "";
      els.search.value = "";
      els.setFilter.value = "";
      els.rarityFilter.value = "";
      els.storyFilter.value = story;
      applyFilters();
      document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    els.grid.addEventListener("click", onGridClick);
    els.wishGrid?.addEventListener("click", onGridClick);
    els.revealsGrid?.addEventListener("click", onGridClick);

    els.modalClose.addEventListener("click", () => els.modal.close());
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) els.modal.close();
    });
    els.modalWish?.addEventListener("click", () => {
      if (modalCardId) toggleWish(modalCardId);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal.open) els.modal.close();
    });

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) renderMore();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(els.sentinel);

    els.tabCollection?.addEventListener("click", () => showTab("collection"));
    els.tabWishlist?.addEventListener("click", () => showTab("wishlist"));
    els.tabComing?.addEventListener("click", () => showTab("coming"));
    els.wishSearch?.addEventListener("input", () => {
      clearTimeout(wishSearchTimer);
      wishSearchTimer = setTimeout(renderWishlist, 160);
    });
    els.comingRefresh?.addEventListener("click", () => loadComingSoon(true));
    els.universeLorcana?.addEventListener("click", () => switchUniverse("lorcana"));
    els.universeKiratto?.addEventListener("click", () => switchUniverse("kiratto"));
    window.addEventListener("hashchange", maybeOpenTabFromHash);
  }

  function onGridClick(e) {
    const wishBtn = e.target.closest(".wish-btn");
    if (wishBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = wishBtn.dataset.wishId;
      if (id) toggleWish(id);
      return;
    }
    const btn = e.target.closest("[data-id]");
    if (!btn || btn.classList.contains("wish-btn")) return;
    const id = btn.dataset.id;
    const card =
      catalog.cards.find((c) => String(c.id) === id) ||
      comingDisplayCards.find((c) => String(c.id) === id) ||
      (comingData?.reveals || []).find((c) => String(c.id) === id);
    if (card) openModal(card);
  }

  function maybeOpenTabFromHash() {
    const hash = (location.hash || "").toLowerCase();
    if (hash.includes("wishlist")) showTab("wishlist");
    else if (hash.includes("coming")) showTab("coming");
    else if (hash.includes("collection")) showTab("collection");
  }

  function showTab(name) {
    activeTab = name;
    const collection = name === "collection";
    const wishlistTab = name === "wishlist";
    const coming = name === "coming";

    els.panelCollection.hidden = !collection;
    if (els.panelWishlist) els.panelWishlist.hidden = !wishlistTab;
    els.panelComing.hidden = !coming;

    els.tabCollection.classList.toggle("is-active", collection);
    els.tabWishlist?.classList.toggle("is-active", wishlistTab);
    els.tabComing.classList.toggle("is-active", coming);

    if (coming) {
      history.replaceState(null, "", "#coming-soon");
      if (!comingLoaded) loadComingSoon(false);
    } else if (wishlistTab) {
      history.replaceState(null, "", "#wishlist");
      renderWishlist();
    } else {
      history.replaceState(null, "", "#collection");
    }
  }

  function syncWishButtons(id) {
    const key = String(id);
    const on = isWished(key);
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
    document.querySelectorAll(`.wish-btn[data-wish-id="${safe}"]`).forEach((btn) => {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Remove from wishlist" : "Add to wishlist");
    });
  }

  function syncModalWishBtn() {
    if (!els.modalWish || !modalCardId) return;
    const on = isWished(modalCardId);
    els.modalWish.classList.toggle("is-on", on);
    els.modalWish.setAttribute("aria-pressed", on ? "true" : "false");
    els.modalWish.textContent = on ? "Remove from wishlist" : "Add to wishlist";
  }

  function updateWishChrome() {
    const n = wishlist.size;
    if (els.wishTabCount) {
      els.wishTabCount.hidden = n === 0;
      els.wishTabCount.textContent = String(n);
    }
    if (els.wishCountLabel) {
      els.wishCountLabel.textContent =
        n === 0
          ? "Shared family wishlist — same list on every phone."
          : `${n.toLocaleString()} card${n === 1 ? "" : "s"} waiting to be found.`;
    }
  }

  function makeCardTile(card, i = 0) {
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";
    wrap.style.animationDelay = `${Math.min(i, 12) * 28}ms`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.dataset.id = String(card.id);
    btn.setAttribute("aria-label", `${card.fullName}, ${card.rarity}`);
    btn.innerHTML = `
      <img src="${escapeAttr(card.thumb || card.full)}" alt="" loading="lazy" decoding="async" width="367" height="512" />
      <span class="card-badge">${escapeHtml(card.rarity || "")}</span>
    `;
    wrap.appendChild(btn);

    if (isWishable(card.id)) {
      const wish = document.createElement("button");
      wish.type = "button";
      wish.className = `wish-btn${isWished(card.id) ? " is-on" : ""}`;
      wish.dataset.wishId = String(card.id);
      wish.setAttribute("aria-pressed", isWished(card.id) ? "true" : "false");
      wish.setAttribute("aria-label", isWished(card.id) ? "Remove from wishlist" : "Add to wishlist");
      wish.innerHTML = HEART_SVG;
      wrap.appendChild(wish);
    }

    return wrap;
  }

  function isWishable(id) {
    return !String(id).startsWith("preview-");
  }

  function findCard(id) {
    const key = String(id);
    return (
      catalog.cards.find((c) => String(c.id) === key) ||
      comingDisplayCards.find((c) => String(c.id) === key) ||
      (comingData?.reveals || []).find((c) => String(c.id) === key) ||
      null
    );
  }

  function renderWishlist() {
    if (!els.wishGrid) return;
    const q = (els.wishSearch?.value || "").trim().toLowerCase();
    const cards = [...wishlist]
      .map(findCard)
      .filter(Boolean)
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.fullName} ${c.name} ${c.version} ${c.story}`.toLowerCase();
        return hay.includes(q);
      });

    els.wishGrid.innerHTML = "";
    const frag = document.createDocumentFragment();
    cards.forEach((card, i) => frag.appendChild(makeCardTile(card, i)));
    els.wishGrid.appendChild(frag);

    if (els.wishEmpty) {
      const emptyMsg =
        wishlist.size === 0
          ? "No cards saved yet. Browse the collection and tap a heart to begin."
          : "No saved cards match that search.";
      els.wishEmpty.textContent = emptyMsg;
      els.wishEmpty.hidden = cards.length !== 0;
    }
  }

  async function loadComingSoon(forceLive) {
    if (comingBusy) return;
    comingBusy = true;
    els.comingRefresh.disabled = true;
    els.comingStatus.textContent = forceLive
      ? "Refreshing the latest whispers…"
      : universe.comingScout || "Gathering upcoming sets and news…";

    try {
      const stamp = Date.now();
      const bakedRes = await fetch(`${universe.comingUrl}${universe.comingUrl.includes("?") ? "&" : "?"}t=${stamp}`, {
        cache: "no-store",
      });
      if (!bakedRes.ok) throw new Error(`${universe.comingUrl} ${bakedRes.status}`);
      comingData = await bakedRes.json();

      let liveNews = null;
      if (universe.liveNews && LIVE_NEWS_URL) {
        try {
          liveNews = await fetchLiveNews();
        } catch (err) {
          console.warn("Live news unavailable, using baked copy.", err);
        }
        if (liveNews?.length) comingData.news = liveNews;
      }

      renderComingSoon();
      comingLoaded = true;

      const when = comingData.generated
        ? new Date(comingData.generated).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "just now";
      const liveBit = liveNews?.length ? " · news refreshed live" : "";
      els.comingStatus.textContent = `Catalog snapshot ${when}${liveBit}`;
    } catch (err) {
      console.error(err);
      els.comingStatus.textContent =
        "Couldn’t reach the ink wells right now. Try Refresh in a moment.";
    } finally {
      comingBusy = false;
      els.comingRefresh.disabled = false;
    }
  }

  async function fetchLiveNews() {
    const res = await fetch(`${LIVE_NEWS_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "X-Return-Format": "html",
      },
    });
    if (!res.ok) throw new Error(`live news ${res.status}`);
    const html = await res.text();
    const fromHtml = parseNewsHtml(html);
    if (fromHtml.length) return fromHtml;
    return parseLiveNewsMarkdown(html);
  }

  function parseNewsHtml(raw) {
    const items = [];
    const seen = new Set();
    const re =
      /<p class="date">(?<date>[^<]+)<\/p>\s*(?:<p class="category">(?<category>[^<]*)<\/p>\s*)?<h1 class="heading">(?<title>[^<]+)<\/h1>\s*(?:<p class="description">(?<summary>.*?)<\/p>)?/gis;
    let m;
    while ((m = re.exec(raw))) {
      const title = decodeEntities(m.groups.title || "").replace(/\s+/g, " ").trim();
      if (!title || seen.has(title.toLowerCase())) continue;
      if (/^(news|latest news|featured news|all news)$/i.test(title)) continue;
      seen.add(title.toLowerCase());
      const window = raw.slice(Math.max(0, m.index - 500), m.index + m[0].length + 500);
      const href = window.match(/href="(\/en-US\/news\/[^"]+)"/i);
      const img = window.match(/<img[^>]+src="([^"]+)"/i);
      items.push({
        title,
        date: decodeEntities(m.groups.date || "").trim(),
        category: decodeEntities(m.groups.category || "News").trim(),
        summary: decodeEntities(m.groups.summary || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 320),
        url: href ? `https://www.disneylorcana.com${href[1]}` : NEWS_URL,
        image: img ? img[1] : null,
      });
      if (items.length >= 16) break;
    }
    return items;
  }

  function decodeEntities(str) {
    const el = document.createElement("textarea");
    el.innerHTML = str || "";
    return el.value;
  }

  function parseLiveNewsMarkdown(md) {
    const items = [];
    const seen = new Set();
    const lines = md.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const titleMatch = line.match(/^#+\s+(.+)$/);
      if (!titleMatch) continue;
      let title = titleMatch[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      title = title.replace(/!\[.*?\]\(.*?\)/g, "").trim();
      if (title.length < 8 || title.length > 120) continue;
      const skip = /^(US|News|Latest News|Featured News|All News|Products|Card Gallery|Challenge|Store Locator)$/i;
      if (skip.test(title)) continue;
      if (
        /Attack of the Vine!|Collection Starter|Companion App|Hyperia City|Winterspell|Fabled|Into the Inkdark/i.test(
          title
        ) &&
        title.length < 24
      ) {
        if (!/What’s New|Press Release|Creative Spotlight|Release Notes/i.test(title)) continue;
      }
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      let date = "";
      let summary = "";
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nxt = lines[j].trim();
        if (!date) {
          const dm = nxt.match(
            /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})/
          );
          if (dm) date = dm[1];
        }
        if (nxt && !nxt.startsWith("#") && !nxt.startsWith("*") && nxt.length > 40 && !summary) {
          summary = nxt.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 280);
        }
      }
      items.push({
        title,
        date,
        category: "News",
        summary,
        url: NEWS_URL,
      });
      if (items.length >= 12) break;
    }
    return items;
  }

  function renderComingSoon() {
    const sets = comingData?.upcomingSets || [];
    els.upcomingSets.innerHTML = sets
      .map((set) => {
        const art = set.heroImage
          ? `style="background-image:url('${escapeAttr(set.heroImage)}')"`
          : "";
        const dates = [
          set.prereleaseLabel ? `Prerelease ${set.prereleaseLabel}` : null,
          set.releaseLabel
            ? `Everywhere ${set.releaseLabel}`
            : set.releaseDate
              ? `Release ${set.releaseDate}`
              : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const href = set.productUrl || NEWS_URL;
        const count =
          set.revealedCount > 0
            ? `${set.revealedCount} card${set.revealedCount === 1 ? "" : "s"} revealed so far`
            : "Cards not revealed yet — check back as spoilers drop";
        return `
          <a class="set-card" href="${escapeAttr(href)}" target="_blank" rel="noopener">
            <span class="set-card-art" ${art}></span>
            <span class="set-card-body">
              <span class="set-kicker">${escapeHtml(set.type || "Upcoming set")}</span>
              <h4>${escapeHtml(set.name || "Untitled set")}</h4>
              <p class="set-dates">${escapeHtml(dates || "Date TBA")}</p>
              <p class="set-blurb">${escapeHtml(set.blurb || "More ink is on the way.")}</p>
              <p class="set-meta">${escapeHtml(count)}</p>
            </span>
          </a>
        `;
      })
      .join("");

    const news = comingData?.news || [];
    if (!news.length) {
      els.newsList.innerHTML = `<p class="coming-note">No headlines yet — tap Refresh, or visit the <a href="${escapeAttr(
        NEWS_URL
      )}" target="_blank" rel="noopener">official page</a>.</p>`;
    } else {
      els.newsList.innerHTML = news
        .map((n) => {
          const thumb = n.image
            ? `<img class="news-thumb" src="${escapeAttr(n.image)}" alt="" loading="lazy" />`
            : `<div class="news-thumb placeholder" aria-hidden="true">✦</div>`;
          const meta = [n.date, n.category].filter(Boolean).join(" · ");
          return `
            <a class="news-item" href="${escapeAttr(n.url || NEWS_URL)}" target="_blank" rel="noopener">
              ${thumb}
              <span>
                <p class="news-date">${escapeHtml(meta || "Latest")}</p>
                <h4>${escapeHtml(n.title)}</h4>
                ${n.summary ? `<p class="news-summary">${escapeHtml(n.summary)}</p>` : ""}
              </span>
            </a>
          `;
        })
        .join("");
    }

    const reveals = comingData?.reveals || [];
    const previewArts = [];
    for (const set of sets) {
      for (const url of set.gallery || []) {
        if (!/\/cards?\//i.test(url)) continue;
        previewArts.push({
          id: `preview-${set.code}-${previewArts.length}`,
          fullName: `${set.name} preview`,
          name: set.name,
          version: "Official preview",
          rarity: "Preview",
          setName: set.name,
          setCode: set.code,
          story: "Coming Soon",
          type: "Preview",
          color: "",
          thumb: url,
          full: url,
        });
      }
    }
    const showCards = reveals.length ? reveals : previewArts;
    comingDisplayCards = showCards;
    els.revealsNote.textContent = reveals.length
      ? `${reveals.length} early reveal${reveals.length === 1 ? "" : "s"} from upcoming sets`
      : previewArts.length
        ? `${previewArts.length} official preview image${previewArts.length === 1 ? "" : "s"} — full spoilers will appear here as they’re revealed`
        : universe.revealsEmpty;
    els.revealsGrid.innerHTML = "";
    showCards.forEach((card, i) => {
      els.revealsGrid.appendChild(makeCardTile(card, i));
    });
  }

  function applyFilters() {
    const q = els.search.value.trim().toLowerCase();
    const setCode = els.setFilter.value;
    const rarity = els.rarityFilter.value;
    const story = els.storyFilter.value;

    filtered = catalog.cards.filter((c) => {
      if (setCode && c.setCode !== setCode) return false;
      if (rarity && c.rarity !== rarity) return false;
      if (story && c.story !== story) return false;
      if (q) {
        const hay = `${c.fullName} ${c.name} ${c.version} ${c.story}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    shown = 0;
    els.grid.innerHTML = "";
    updateMeta();
    renderMore();
  }

  function updateMeta() {
    const total = catalog.count || catalog.cards.length;
    const n = filtered.length;
    const parts = [];
    if (els.storyFilter.value) parts.push(els.storyFilter.value);
    if (els.setFilter.value) {
      const set = catalog.sets.find((s) => s.code === els.setFilter.value);
      parts.push(set?.name || els.setFilter.value);
    }
    if (els.rarityFilter.value) parts.push(els.rarityFilter.value);
    if (els.search.value.trim()) parts.push(`“${els.search.value.trim()}”`);

    if (n === total && !parts.length) {
      els.countLabel.textContent = universe.countAllLabel.replace("{n}", total.toLocaleString());
    } else {
      els.countLabel.textContent = `${n.toLocaleString()} card${n === 1 ? "" : "s"} found`;
    }

    els.activePills.hidden = parts.length === 0;
    els.activePills.innerHTML = parts.map((p) => `<span class="pill">${escapeHtml(p)}</span>`).join("");
    els.empty.hidden = n !== 0;
  }

  function renderMore() {
    if (shown >= filtered.length) return;
    const slice = filtered.slice(shown, shown + PAGE_SIZE);
    const frag = document.createDocumentFragment();
    slice.forEach((card, i) => frag.appendChild(makeCardTile(card, i)));
    els.grid.appendChild(frag);
    shown += slice.length;
  }

  function openModal(card) {
    modalCardId = String(card.id);
    modalCard = card;
    els.modalImg.src = card.full || card.thumb;
    els.modalImg.alt = card.fullName;
    els.modalStory.textContent = card.story || universe.modalStoryFallback;
    els.modalName.textContent = card.name || card.fullName;
    els.modalVersion.textContent = card.version ? card.version : card.fullName;
    els.modalRarity.textContent = card.rarity || "—";
    els.modalSet.textContent = card.setName || card.setCode || "—";
    els.modalType.textContent = card.type || "—";
    els.modalColor.textContent = card.color || "—";
    if (els.modalWish) {
      els.modalWish.hidden = !isWishable(card.id);
      syncModalWishBtn();
    }
    refreshModalPrice();
    if (typeof els.modal.showModal === "function") els.modal.showModal();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("'", "&#39;");
  }

  function initStars() {
    const canvas = document.getElementById("stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(160, Math.floor((w * h) / 14000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random(),
        s: Math.random() * 0.015 + 0.004,
        p: Math.random() * Math.PI * 2,
      }));
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const star of stars) {
        const twinkle = reduce ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(t * star.s + star.p));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 244, 210, ${twinkle * star.a})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", () => {
      cancelAnimationFrame(raf);
      resize();
      raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }
})();
