const page = document.body.dataset.page;
const navigation = [
  ["home", "Home", "index.html"],
  ["menu", "Menu", "menu.html"],
  ["photos", "Photos", "photos.html"],
  ["about", "About us", "about.html"],
  ["contact", "Contact", "contact.html"],
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("step_restaurant_user") || sessionStorage.getItem("step_restaurant_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasAuthToken() {
  return Boolean(
    localStorage.getItem("step_restaurant_access_token") ||
    sessionStorage.getItem("step_restaurant_access_token")
  );
}

function renderAuthActions() {
  const isLoggedIn = hasAuthToken();
  const user = getStoredUser();

  if (isLoggedIn) {
    const displayName = user?.firstName || user?.email?.split("@")[0] || "Account";
    return `
      <div class="user-header-menu" style="display:flex; align-items:center; gap:8px;">
        <a class="nav-link user-profile-link" href="profile.html" style="font-weight:600; display:flex; align-items:center; gap:6px;">
          <span style="display:inline-flex; width:26px; height:26px; border-radius:50%; background:#ff5b35; color:#fff; align-items:center; justify-content:center; font-size:12px; font-weight:700;">
            ${displayName.charAt(0).toUpperCase()}
          </span>
          <span>${displayName}</span>
        </a>
        <button id="header-logout-btn" type="button" class="menu-login" style="padding:4px 8px; font-size:12px; cursor:pointer; background:none; border:none; color:#777;">
          Sign Out
        </button>
      </div>
    `;
  }

  return `
    <a class="menu-login" href="login.html">Login</a>
    <a class="menu-signup" href="signup.html">Sign Up</a>
  `;
}

const header = document.querySelector("#site-header");
if (header) {
  header.innerHTML = `
    <header class="site-header ${page === "menu" || page === "home" || page === "product" || page === "profile" ? "menu-site-header" : ""}">
      <a class="menu-brand" href="index.html" style="text-decoration:none; font-family:'Playfair Display', serif; font-size:24px; font-weight:700; color:#111;">Foodie</a>
      <button class="mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">
        <span class="sr-only">Toggle navigation</span><span></span><span></span>
      </button>
      <nav class="main-nav" id="main-nav" aria-label="Main navigation">
        ${navigation.map(([id, label, href]) => `<a class="nav-link${page === id ? " active" : ""}" href="${href}"${page === id ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
      <div class="header-actions menu-header-actions" style="display:flex; align-items:center; gap:14px;">
        <button class="icon-button cart-trigger" type="button" aria-label="Open cart" style="background:transparent; border:none; cursor:pointer; position:relative; padding:6px; display:inline-flex; align-items:center; justify-content:center;">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;">
            <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 8H6" />
            <circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
          </svg>
          <span class="cart-count" aria-live="polite" style="position:absolute; top:-2px; right:-4px; background:#ff5b35; color:#fff; border-radius:10px; font-size:11px; font-weight:700; min-width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; padding:0 4px;">0</span>
        </button>
        <div id="header-auth-container" style="display:flex; align-items:center; gap:10px;">
          ${renderAuthActions()}
        </div>
      </div>
    </header>
  `;

  // Attach logout handler
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "header-logout-btn") {
      localStorage.removeItem("step_restaurant_access_token");
      localStorage.removeItem("step_restaurant_refresh_token");
      localStorage.removeItem("step_restaurant_user");
      sessionStorage.removeItem("step_restaurant_access_token");
      sessionStorage.removeItem("step_restaurant_refresh_token");
      sessionStorage.removeItem("step_restaurant_user");
      window.location.reload();
    }
  });
}

const footer = document.querySelector("#site-footer");
if (footer) {
  footer.innerHTML = `
    <footer class="site-footer">
      <div class="footer-main">
        <section class="footer-column footer-brand">
          <a class="footer-logo" href="index.html">Foodie</a>
          <p>Delicious food delivered to your door</p>
          <div class="footer-socials" aria-label="Social media">
            <a href="https://www.facebook.com/" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v2H6v4h3v6h4v-6h3l1-4h-4V9c0-.7.3-1 1-1Z" /></svg>
            </a>
            <a href="https://www.instagram.com/" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle class="social-dot" cx="17.5" cy="6.8" r=".8" /></svg>
            </a>
            <a href="https://www.x.com/" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h3.8l10.2 14h-3.8L5 5Zm0 14 5.5-6.3m3-3.4L19 5" /></svg>
            </a>
          </div>
        </section>
        <section class="footer-column">
          <h2>Contact</h2>
          <p>123 Food Street<br />Tbilisi, Georgia<br />Phone: +995 555 123456<br />Mon-Sun: 10AM - 10PM</p>
        </section>
        <nav class="footer-column" aria-label="Quick links">
          <h2>Quick Links</h2>
          <a href="index.html">Home</a>
          <a href="menu.html">Menu</a>
          <a href="photos.html">Photos</a>
          <a href="about.html">About us</a>
          <a href="contact.html">Contact</a>
          <a href="profile.html">My Profile</a>
        </nav>
        <section class="footer-column footer-newsletter">
          <h2>Newsletter</h2>
          <p>Subscribe to get special offers</p>
          <div class="newsletter-form">
            <label class="sr-only" for="newsletter-email">Your email</label>
            <input id="newsletter-email" type="email" placeholder="Your email" />
            <button type="button">Subscribe</button>
          </div>
        </section>
      </div>
      <div class="footer-credit">
        <span>Created with <a href="https://restaurantapi.stepacademy.ge/swagger/index.html" target="_blank" rel="noopener">RestaurantAPI</a> • IT Academy STEP Georgia</span>
      </div>
    </footer>
  `;
}

// Inject drawer backdrop, cart drawer, and toast notification container
document.body.insertAdjacentHTML(
  "beforeend",
  `
  <div class="drawer-backdrop" id="drawer-backdrop" hidden></div>
  <aside class="cart-drawer" id="cart-drawer" aria-labelledby="cart-title" aria-modal="true" role="dialog" aria-hidden="true">
    <div class="drawer-heading">
      <div><p class="eyebrow"><span></span> Your order</p><h2 id="cart-title">Your <em>cart</em></h2></div>
      <button class="icon-button drawer-close" type="button" aria-label="Close cart">×</button>
    </div>
    <div class="cart-items" id="cart-items"></div>
    <div class="cart-empty" id="cart-empty">
      <span class="empty-bag" aria-hidden="true">♡</span>
      <h3>Your cart is empty</h3>
      <p>Add some delicious dishes and they'll show up here.</p>
      <a class="button button-primary" href="menu.html">Browse the menu</a>
    </div>
    <div class="cart-summary" id="cart-summary" hidden>
      <div class="summary-row"><span>Subtotal</span><strong id="cart-subtotal">$0.00</strong></div>
      <div class="summary-row"><span>Delivery</span><strong style="color:#2e7d32;">Free</strong></div>
      <div class="summary-total"><span>Total</span><strong id="cart-total">$0.00</strong></div>
      <button class="button button-primary checkout-button" type="button" id="checkout-button">Place Order <span aria-hidden="true">→</span></button>
      <p class="checkout-note" id="checkout-note" role="status" hidden style="margin-top:10px; font-size:12px; color:#555; text-align:center;"></p>
    </div>
  </aside>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`
);
