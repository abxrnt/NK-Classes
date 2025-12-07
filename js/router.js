/* ============================
   ADVANCED SPA ROUTER (Final)
   ============================ */

const app = document.getElementById("app");

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

    // 3) If multiple exported functions
    Object.values(module).forEach((fn) => {
      if (typeof fn === "function" && fn.autoRun) fn();
    });

  } catch (err) {
    console.warn(`⚠️ No JS file found: ${jsPath}`);
  }
}

// Render page
async function showPage(page) {
  const html = await loadComponentHTML(page);

  // Fade out previous page
  app.classList.add("fade-out");
  await new Promise((res) => setTimeout(res, 150));

  // Insert new page
  app.innerHTML = html;

  // Fade in new page
  app.classList.remove("fade-out");
  app.classList.add("fade-in");

  updateActiveTab(page);
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Load JS for page
  await loadComponentJS(page);
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
    btn.onclick = () => {
      location.hash = btn.dataset.tab;
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
  const pg = location.hash.replace("#", "") || "home";
  showPage(pg);
});

// Initial page load
window.addEventListener("load", () => {
  const initial = location.hash.replace("#", "") || "home";
  showPage(initial);

  initTabEvents();
  initMobileMenu();
});
