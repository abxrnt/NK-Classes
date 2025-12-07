/* ============================
   ADVANCED SPA ROUTER (Updated)
   - shows loading.gif while fetching / switching
   - protects against race conditions for fast navigations
   ============================ */

const app = document.getElementById("app");
// loader element (optional: ensure an element with id="routerLoader" exists)
const loader = document.getElementById("routerLoader") || null;

// HTML cache
const componentCache = {};
// JS Module cache
const scriptCache = {};

// Load HTML
async function loadComponentHTML(name) {
  if (componentCache[name]) return componentCache[name];

  const res = await fetch(`components/${name}.html`);
  if (!res.ok) {
    console.error(`❌ Failed to load component: ${name}.html`);
    return `<p class='text-red-600 text-center py-10'>
              Failed to load ${name}.html
            </p>`;
  }

  const html = await res.text();
  componentCache[name] = html;
  return html;
}

// Load JS file if exists
async function loadComponentJS(name) {
  if (scriptCache[name]) return; // Already imported

  const jsPath = `./js/components/${name}.js`;

  try {
    const module = await import(jsPath);
    scriptCache[name] = module;

    // 1) If module.init() exists → run it
    if (module.init) module.init();

    // 2) If module exports a function with same name (contactInit, pyqsInit)
    const autoFn = module[`${name}Init`];
    if (autoFn) autoFn();

    // 3) If multiple exported functions marked with .autoRun
    Object.values(module).forEach((fn) => {
      if (typeof fn === "function" && fn.autoRun) fn();
    });

  } catch (err) {
    // not an error to be noisy about — optional file not found
    console.warn(`⚠️ No JS file found or failed to import: ${jsPath}`, err);
  }
}

// Loader helpers
let loaderTimer = null;
function showLoader(immediate = false) {
  if (!loader) return;
  // avoid flicker for very fast loads by default; if immediate === true then show right away
  if (!immediate) {
    // schedule showing after a short delay
    if (loaderTimer) clearTimeout(loaderTimer);
    loaderTimer = setTimeout(() => loader.classList.add("show"), 140);
  } else {
    if (loaderTimer) clearTimeout(loaderTimer);
    loader.classList.add("show");
  }
}
function hideLoader() {
  if (!loader) return;
  if (loaderTimer) { clearTimeout(loaderTimer); loaderTimer = null; }
  // small delay to allow smooth transition
  setTimeout(() => loader.classList.remove("show"), 120);
}

// Fade helpers (optional CSS classes expected: fade-out, fade-in)
function fadeOut(el, ms = 140) {
  el.classList.add("fade-out");
  return new Promise((res) => setTimeout(res, ms));
}
function fadeIn(el) {
  el.classList.remove("fade-out");
  el.classList.add("fade-in");
  // remove the fade-in class after short time to avoid accumulation
  setTimeout(() => el.classList.remove("fade-in"), 300);
}

// Track the latest requested page to prevent race display
let latestRequestId = 0;

// Render page
async function showPage(page) {
  const requestId = ++latestRequestId;

  // show loader (not immediate by default; prevents tiny flickers)
  showLoader();

  // begin loading HTML + JS in parallel (HTML must be inserted before JS init)
  // note: we await HTML to insert DOM before running JS
  let html;
  try {
    html = await loadComponentHTML(page);
  } catch (e) {
    console.error("Error loading HTML:", e);
    html = `<div class="p-6 card"><h2 class="text-xl font-bold">Content unavailable</h2><p class="text-gray-600">Check /components folder.</p></div>`;
  }

  // if another newer request happened, abandon updating DOM for this one
  if (requestId !== latestRequestId) {
    // still allow JS to load in background if desired, but do nothing visible
    loadComponentJS(page).catch(()=>{});
    return;
  }

  try {
    // Fade out previous page quickly
    await fadeOut(app, 120);

    // Insert new page
    app.innerHTML = html;

    // Fade in new page
    fadeIn(app);

    updateActiveTab(page);
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Load associated JS module (optional)
    await loadComponentJS(page);

  } catch (err) {
    console.error("Error while showing page:", err);
  } finally {
    // Only hide loader if this is still the latest request
    if (requestId === latestRequestId) hideLoader();
  }
}

// Highlight active tab
function updateActiveTab(current) {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.classList.remove("tab-active");
  });
  const active = document.querySelector(`[data-tab="${current}"]`);
  if (active) active.classList.add("tab-active");
}

// Close mobile menu
function closeMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) {
    menu.classList.add("hidden");
    menu.classList.remove("open");
  }
}

// Nav click events
function initTabEvents() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.onclick = (e) => {
      // show loader immediately so user sees instant feedback on click
      showLoader(true);
      // small timeout to let loader render before changing hash (improves perceived speed)
      setTimeout(() => {
        location.hash = btn.dataset.tab;
      }, 60);
      e.preventDefault?.();
    };
  });
}

// Mobile menu toggle
function initMobileMenu() {
  const btn = document.getElementById("menu-btn");
  const menu = document.getElementById("mobile-menu");

  if (!btn || !menu) return;

  btn.onclick = () => {
    const isHidden = menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !isHidden);
    menu.classList.toggle("open", isHidden);
  };
}

// URL hash router
window.addEventListener("hashchange", () => {
  const pg = (location.hash.replace("#", "") || "home");
  showPage(pg);
});

// Initial page load
window.addEventListener("load", () => {
  const initial = (location.hash.replace("#", "") || "home");
  // show loader immediately on first load for clear feedback
  showLoader(true);
  showPage(initial);

  initTabEvents();
  initMobileMenu();
});
