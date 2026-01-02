// Updated script with robust slider nav binding and dynamic translate distance

const sidebarLeft = document.getElementById("sidebarLeft");
const sidebarRight = document.getElementById("sidebarRight");
const overlay = document.getElementById("overlay");
const leftToggle = document.getElementById("leftToggle");
const rightToggle = document.getElementById("rightToggle");
const navBar = document.getElementById("navBar");
const contentArea = document.getElementById("content");
const treeLinks = document.querySelectorAll(".treeLinks");
const currentPath = document.getElementById("currentPath");
const loadingBarContainer = document.getElementById("loadingBarContainer");
const loadingBar = document.getElementById("loadingBar");

// --- Slider Globals ---
let currentIdx = 0;
let autoSlideTimer = null;

function closeAll() {
  [sidebarLeft, sidebarRight, overlay].forEach(
    (el) => el && el.classList.remove("active"),
  );
  [leftToggle, rightToggle].forEach(
    (el) => el && el.classList.remove("activeBtn"),
  );
}

// --- Navigation Logic ---
leftToggle.addEventListener("click", () => {
  const isOpen = sidebarLeft.classList.contains("active");
  closeAll();
  if (!isOpen) {
    sidebarLeft.classList.add("active");
    overlay.classList.add("active");
    leftToggle.classList.add("activeBtn");
  }
});

rightToggle.addEventListener("click", () => {
  const isOpen = sidebarRight.classList.contains("active");
  closeAll();
  if (!isOpen) {
    sidebarRight.classList.add("active");
    overlay.classList.add("active");
    rightToggle.classList.add("activeBtn");
  }
});

overlay.addEventListener("click", closeAll);

async function initRotationWheel() {
  const rail = document.getElementById("sliderRail");
  if (!rail) return;

  try {
    const response = await fetch("db/ocational/rotation.json");
    const data = await response.json();

    rail.innerHTML = data
      .map(
        (item, index) => `
      <div class="gameCards ${index === 0 ? "active" : ""}">
          <div class="cardBanner" style="background-image:url(${item.image})"></div>
            <div class="cardBody">
              <span class="genreChip">${item.genre}</span>
              <h3>${item.title}</h3>
            </div>
      </div>
    `,
      )
      .join("");

    // Reset index and restart auto-rotation now that elements exist
    currentIdx = 0;
    initAutoRotation();
  } catch (err) {
    console.error("Failed to load rotation data:", err);
    rail.innerHTML = `<p>Failed to load the wheel... (╥﹏╥)</p>`;
  }
}

function rotate(step) {
  const rail = document.getElementById("rotationRail");
  const cards = document.querySelectorAll(".rotationCards");
  if (!rail || cards.length === 0) return;

  cards[currentIdx].classList.remove("active");
  currentIdx = (currentIdx + step + cards.length) % cards.length;
  cards[currentIdx].classList.add("active");

  // Get exact width of a single card including the gap
  const cardRect = cards[0].getBoundingClientRect();
  const gap = 18; // From your CSS --slider-step or gap logic

  rail.style.transform = `translateX(-${currentIdx * (cardRect.width + gap)}px)`;
}

// --- Rotation Slider Engine ---
// rotate(step): step = +1 or -1 (or other integer)
function rotate(step) {
  const rail = document.getElementById("sliderRail");
  const cards = document.querySelectorAll(".gameCards");
  if (!rail || cards.length === 0) return;

  // Normalize previous active
  cards[currentIdx]?.classList.remove("active");

  // Update index
  currentIdx = (currentIdx + step + cards.length) % cards.length;
  cards[currentIdx]?.classList.add("active");

  // Compute shift dynamically so it works independent of fixed px values
  const cardEl = cards[0];
  if (!cardEl) return;

  const cardWidth = cardEl.getBoundingClientRect().width;
  // try to read CSS gap on the rail (modern browsers support it)
  const railStyle = window.getComputedStyle(rail);
  const gapValue =
    parseFloat(railStyle.gap) || parseFloat(railStyle.columnGap) || 20;
  const shift = currentIdx * -(cardWidth + gapValue);

  rail.style.transform = `translateX(${shift}px)`;
}

function initAutoRotation() {
  if (autoSlideTimer) clearInterval(autoSlideTimer);
  const rail = document.getElementById("sliderRail");
  if (!rail) return;

  autoSlideTimer = setInterval(() => rotate(1), 5000);

  const windowEl = document.getElementById("sliderWindow");
  if (windowEl) {
    windowEl.addEventListener("mouseenter", () =>
      clearInterval(autoSlideTimer),
    );
    windowEl.addEventListener("mouseleave", () => initAutoRotation());
  }

  // Bind previous/next nav buttons using event delegation (works if content injected dynamically)
  // Prefer delegation so handlers remain after loadPage injects new HTML
  // We attach a single delegated listener to the content area (or document fallback)
  const delegateRoot = contentArea || document;
  // Remove previous delegated handler if present by using a symbol on root
  if (!delegateRoot.__navDelegationAdded) {
    delegateRoot.addEventListener("click", (e) => {
      const btn = e.target.closest && e.target.closest(".navBtns");
      if (!btn) return;
      const action = btn.getAttribute("data-action") || btn.dataset.action;
      if (!action) return;
      if (action === "prev") rotate(-1);
      if (action === "next") rotate(1);
    });
    delegateRoot.__navDelegationAdded = true;
  }
}

// --- Activity/Session Graph Logic ---
async function initSessionGraph() {
  const graph = document.getElementById("sessionGraph");
  if (!graph) return;

  try {
    const response = await fetch("db/sessions.json");
    if (!response.ok) throw new Error("JSON not found");
    const data = await response.json();

    let total = 0,
      peak = 0,
      daysPlayed = 0;
    graph.innerHTML = "";

    for (let i = 0; i < 364; i++) {
      const square = document.createElement("div");
      square.classList.add("square");
      const day = data[i];
      const hrs = day ? parseFloat(day.hours) : 0;

      total += hrs;
      if (hrs > peak) peak = hrs;
      if (hrs > 0) daysPlayed++;

      if (hrs === 0) square.classList.add("level0");
      else if (hrs <= 2) square.classList.add("level1");
      else if (hrs <= 5) square.classList.add("level2");
      else if (hrs <= 8) square.classList.add("level3");
      else square.classList.add("level4");

      if (day) square.title = `${day.date}: ${hrs}h`;
      graph.appendChild(square);
    }

    const totalEl = document.getElementById("totalHours");
    const peakEl = document.getElementById("peakHours");
    const avgEl = document.getElementById("avgHours");

    if (totalEl) totalEl.textContent = `${total.toFixed(1)}h`;
    if (peakEl) peakEl.textContent = `${peak.toFixed(1)}h`;
    if (avgEl) avgEl.textContent = `${(total / (daysPlayed || 1)).toFixed(1)}h`;
  } catch (err) {
    console.warn("Could not load stats data", err);
  }
}

function initLibraryFilters() {
  const table =
    document.getElementById("gameLibraryTable") ||
    document.getElementById("game-library-table") ||
    document.querySelector("#game-library-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const platformFilter = document.getElementById("platformFilter");
  const sortBtns = document.querySelectorAll(".sortBtn");

  if (platformFilter) {
    platformFilter.onchange = (e) => {
      const val = e.target.value;
      rows.forEach((row) => {
        const platform = row.getAttribute("data-platform");
        row.style.display = val === "all" || platform === val ? "" : "none";
      });
    };
  }

  const sortTable = (type, btn) => {
    sortBtns.forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const sortedRows = rows.sort((a, b) => {
      const valA = parseFloat(a.getAttribute(`data-${type}`)) || 0;
      const valB = parseFloat(b.getAttribute(`data-${type}`)) || 0;
      return valB - valA; // Descending
    });

    sortedRows.forEach((row) => tbody.appendChild(row));
  };

  sortBtns.forEach((btn) => {
    btn.onclick = () => sortTable(btn.getAttribute("data-sort"), btn);
  });

  const defaultSortBtn = document.querySelector('.sortBtn[data-sort="time"]');
  if (defaultSortBtn) {
    sortTable("time", defaultSortBtn);
  }
}

// --- Tab Logic (with LocalStorage) ---
function initInternalTabs() {
  const tabs = document.querySelectorAll(".tabBtns");
  const contents = document.querySelectorAll(".tabContents");
  const pageName = window.location.hash.substring(1) || "ishini";
  const storageKey = `activeTab_${pageName}`;

  const savedTabId = localStorage.getItem(storageKey);

  if (savedTabId) {
    const targetTab = document.querySelector(`[data-target="${savedTabId}"]`);
    const targetContent = document.getElementById(savedTabId);

    if (targetTab && targetContent) {
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      targetTab.classList.add("active");
      targetContent.classList.add("active");

      if (currentPath)
        currentPath.textContent = `/root/${pageName}/${savedTabId}`;
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target");

      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(target)?.classList.add("active");

      localStorage.setItem(storageKey, target);

      if (currentPath) currentPath.textContent = `/root/${pageName}/${target}`;

      initAutoRotation();
      initSessionGraph();
      initLibraryFilters();
    });
  });
}

// --- Page Loading Logic ---
async function loadPage(pageName, linkElement) {
  try {
    loadingBarContainer.style.display = "block";
    loadingBar.style.width = "40%";

    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) throw new Error();
    const rawHTML = await response.text();
    const doc = new DOMParser().parseFromString(rawHTML, "text/html");

    if (sidebarLeft)
      sidebarLeft.innerHTML =
        doc.getElementById("newLeft")?.innerHTML ||
        doc.getElementById("new-left")?.innerHTML ||
        "";
    if (navBar)
      navBar.innerHTML =
        doc.getElementById("newNav")?.innerHTML ||
        doc.getElementById("new-nav")?.innerHTML ||
        "";
    if (contentArea)
      contentArea.innerHTML =
        doc.getElementById("newContent")?.innerHTML ||
        doc.getElementById("new-content")?.innerHTML ||
        "";

    window.location.hash = pageName;

    initPageSpecificScripts();
    currentIdx = 0;

    // reset rail translation (helpful if previous page left a transform)
    const rail = document.getElementById("sliderRail");
    if (rail) rail.style.transform = "translateX(0)";

    loadingBar.style.width = "100%";
    setTimeout(() => {
      loadingBarContainer.style.display = "none";
      loadingBar.style.width = "0%";
    }, 400);

    treeLinks.forEach((l) => l.classList.remove("active"));
    const activeLink =
      linkElement || document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) activeLink.classList.add("active");

    if (currentPath) currentPath.textContent = `/root/${pageName}`;
    if (window.innerWidth <= 850) closeAll();
  } catch (err) {
    loadingBarContainer.style.display = "none";
    if (contentArea)
      contentArea.innerHTML = `<h2>Error</h2><p>Page could not be loaded.</p>`;
  }
}

// --- Event Listeners ---
treeLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    loadPage(link.getAttribute("data-page"), link);
  });
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.substring(1);
  if (hash) loadPage(hash, null);
});

window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.substring(1);
  loadPage(hash || "ishini", null);
});

function initTerminal() {
  const input = document.getElementById("terminalInput");
  const output = document.getElementById("terminalBody");
  if (!input || !output) return;

  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      const cmd = input.value.toLowerCase().trim();
      if (!cmd) return;

      const line = document.createElement("div");
      line.className = "terminalLines";
      line.innerHTML = `<span style="color:var(--accent)">></span> ${cmd}`;
      output.appendChild(line);

      executeCommand(cmd, output);

      input.value = "";
      output.scrollTop = output.scrollHeight;
    }
  };
}

const terminalState = {
  neon: false,
  ghost: false,
  invert: false,
};

function executeCommand(cmd, output) {
  const resp = document.createElement("div");
  resp.style.color = "#00f5ff";
  resp.style.fontSize = "0.7rem";
  resp.style.marginBottom = "8px";

  switch (cmd) {
    case "help":
      resp.textContent = "Available: neon, ghost, invert, shake, clear, reset";
      break;

    case "neon":
      terminalState.neon = !terminalState.neon;
      const cards = document.querySelectorAll(
        ".favCards, .wishCards, .statCards, .mediaItems",
      );
      cards.forEach((c) => {
        c.style.boxShadow = terminalState.neon ? "0 0 20px #ff3399" : "";
        c.style.borderColor = terminalState.neon ? "#ff3399" : "";
      });
      resp.textContent = terminalState.neon
        ? "Neon Overdrive: ON"
        : "Neon Overdrive: OFF";
      break;

    case "ghost":
      terminalState.ghost = !terminalState.ghost;
      document.body.style.opacity = terminalState.ghost ? "0.5" : "1";
      resp.textContent = terminalState.ghost
        ? "Stealth Mode: ON"
        : "Stealth Mode: OFF";
      break;

    case "invert":
      terminalState.invert = !terminalState.invert;
      document.documentElement.style.filter = terminalState.invert
        ? "invert(1)"
        : "invert(0)";
      resp.textContent = terminalState.invert
        ? "Colors: INVERTED"
        : "Colors: NORMAL";
      break;

    case "shake":
      document.body.style.animation = "none";
      setTimeout(() => {
        document.body.style.animation = "shake 0.5s ease";
      }, 10);
      resp.textContent = "Impact triggered.";
      break;

    case "clear":
      output.innerHTML = "";
      return;

    case "reset":
      terminalState.neon = false;
      terminalState.ghost = false;
      terminalState.invert = false;

      document.body.style.opacity = "1";
      document.documentElement.style.filter = "none";
      document.body.style.animation = "none";
      const allCards = document.querySelectorAll(
        ".favCards, .wishCards, .statCards, .mediaItems",
      );
      allCards.forEach((c) => {
        c.style.boxShadow = "";
        c.style.borderColor = "";
      });

      resp.textContent = "System restored to default. (｡•̀ᴗ-)✧";
      break;

    default:
      resp.style.color = "#ff4444";
      resp.textContent = `Unknown command: ${cmd}`;
  }
  output.appendChild(resp);
}

async function initFavorites() {
  const grid = document.getElementById("favGrid");
  if (!grid) return;

  try {
    const response = await fetch("db/ocational/favourites.json");
    if (!response.ok) throw new Error("File not found");
    const data = await response.json();

    grid.innerHTML = data
      .map((game) => {
        // Logic to determine style based on genre number
        const isVN = game.genre === 1;
        const typeClass = isVN ? "vnStyle" : "compStyle";
        const typeLabel = isVN ? "Visual Novel" : "Competitive";

        return `
        <div class="favCards ${typeClass}" onclick="window.open('https://${game.link}', '_blank')">
          <div class="favImageBox">
            <img src="${game.img}" alt="${game.name}"/>
            <div class="${typeClass} typeBadge">${typeLabel}</div>
          </div>
          <div class="favDetails">
            <h4>${game.name}</h4>
            <p>${game.categories}</p>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.warn("Favorites load failed:", err);
    grid.innerHTML = `<p class="error">Failed to load Hall of Fame.</p>`;
  }
}

// --- Controller for Page-Specific Scripts ---
function initPageSpecificScripts() {
  initInternalTabs();
  initRotationWheel();
  initAutoRotation();
  initSessionGraph();
  initLibraryFilters();
  initTerminal();
  initFavorites();
}
