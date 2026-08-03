(() => {
  const PAGE_SIZE = 48;
  const FAV_PICKS = {
    "Toy Story": ["Woody", "Buzz Lightyear", "Jessie"],
    "Winnie the Pooh": ["Winnie the Pooh", "Tigger", "Piglet"],
    "Lilo & Stitch": ["Stitch", "Lilo", "Angel"],
  };

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
  };

  /** @type {{cards: any[], sets: any[], rarities: string[], stories: string[]}} */
  let catalog = { cards: [], sets: [], rarities: [], stories: [] };
  let filtered = [];
  let shown = 0;
  let searchTimer = null;

  initStars();
  boot();

  async function boot() {
    try {
      const res = await fetch("./data/cards.json");
      if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
      catalog = await res.json();
      fillFilters();
      paintFavorites();
      bindUI();
      applyFilters();
    } catch (err) {
      els.countLabel.textContent = "The ink wouldn’t settle. Try refreshing.";
      console.error(err);
    }
  }

  function fillFilters() {
    for (const set of catalog.sets) {
      const opt = document.createElement("option");
      opt.value = set.code;
      opt.textContent = set.name;
      els.setFilter.appendChild(opt);
    }
    for (const rarity of catalog.rarities) {
      const opt = document.createElement("option");
      opt.value = rarity;
      opt.textContent = rarity;
      els.rarityFilter.appendChild(opt);
    }
    for (const story of catalog.stories) {
      const opt = document.createElement("option");
      opt.value = story;
      opt.textContent = story;
      els.storyFilter.appendChild(opt);
    }
  }

  function paintFavorites() {
    const map = {
      "Toy Story": "favArtToy",
      "Winnie the Pooh": "favArtPooh",
      "Lilo & Stitch": "favArtStitch",
    };
    for (const [story, id] of Object.entries(map)) {
      const art = document.getElementById(id);
      if (!art) continue;
      const names = FAV_PICKS[story] || [];
      let card =
        catalog.cards.find(
          (c) => c.story === story && names.includes(c.name) && c.type === "Character"
        ) || catalog.cards.find((c) => c.story === story && c.type === "Character");
      if (card) {
        art.style.backgroundImage = `url("${card.full || card.thumb}")`;
      }
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

    document.querySelectorAll(".fav-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const story = btn.getAttribute("data-story") || "";
        els.search.value = "";
        els.setFilter.value = "";
        els.rarityFilter.value = "";
        els.storyFilter.value = story;
        applyFilters();
        document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    els.grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      const card = catalog.cards.find((c) => String(c.id) === btn.dataset.id);
      if (card) openModal(card);
    });

    els.modalClose.addEventListener("click", () => els.modal.close());
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) els.modal.close();
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
      els.countLabel.textContent = `${total.toLocaleString()} cards across every released set`;
    } else {
      els.countLabel.textContent = `${n.toLocaleString()} card${n === 1 ? "" : "s"} found`;
    }

    els.activePills.hidden = parts.length === 0;
    els.activePills.innerHTML = parts
      .map((p) => `<span class="pill">${escapeHtml(p)}</span>`)
      .join("");
    els.empty.hidden = n !== 0;
  }

  function renderMore() {
    if (shown >= filtered.length) return;
    const slice = filtered.slice(shown, shown + PAGE_SIZE);
    const frag = document.createDocumentFragment();
    slice.forEach((card, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.dataset.id = String(card.id);
      btn.style.animationDelay = `${Math.min(i, 12) * 28}ms`;
      btn.setAttribute("aria-label", `${card.fullName}, ${card.rarity}`);
      btn.innerHTML = `
        <img src="${card.thumb}" alt="" loading="lazy" decoding="async" width="367" height="512" />
        <span class="card-badge">${escapeHtml(card.rarity || "")}</span>
      `;
      frag.appendChild(btn);
    });
    els.grid.appendChild(frag);
    shown += slice.length;
  }

  function openModal(card) {
    els.modalImg.src = card.full || card.thumb;
    els.modalImg.alt = card.fullName;
    els.modalStory.textContent = card.story || "Lorcana";
    els.modalName.textContent = card.name || card.fullName;
    els.modalVersion.textContent = card.version ? card.version : card.fullName;
    els.modalRarity.textContent = card.rarity || "—";
    els.modalSet.textContent = card.setName || card.setCode || "—";
    els.modalType.textContent = card.type || "—";
    els.modalColor.textContent = card.color || "—";
    if (typeof els.modal.showModal === "function") els.modal.showModal();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
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
