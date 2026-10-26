// Main Application Logic (Menu filtering, Pagination, Cart, Checkout, UI interactions)

const productGrid = document.querySelector("#product-grid");
const searchInput = document.querySelector("#menu-search");
const sortSelect = document.querySelector("#menu-sort");
const emptyState = document.querySelector("#empty-state");
const resultsCount = document.querySelector("#results-count");
const menuPagination = document.querySelector("#menu-pagination");
const menuCategories = [...document.querySelectorAll("[data-menu-category]")];
const veganFilter = document.querySelector("#vegan-only");
const spiceFilter = document.querySelector("#spice-level");
const ratingFilter = document.querySelector("#min-rating");
const minimumPriceFilter = document.querySelector("#min-price");
const maximumPriceFilter = document.querySelector("#max-price");

const relatedProductId =
  document.body.dataset.page === "product"
    ? new URLSearchParams(window.location.search).get("id")
    : null;

const cartDrawer = document.querySelector("#cart-drawer");
const cartBackdrop = document.querySelector("#drawer-backdrop");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartSummary = document.querySelector("#cart-summary");
const toast = document.querySelector("#toast");

let selectedCategory = "All";
let currentMenuPage = 1;
const menuPageSize = 10;
let cart = [];
let toastTimer;

// Money formatting
function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

// Toast notification
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

// --- Cart Management using API & Local Storage ---
async function loadCartData() {
  if (window.api && typeof window.api.getCart === "function") {
    try {
      cart = await window.api.getCart();
    } catch {
      cart = window.api.getLocalCart();
    }
  } else {
    try {
      cart = JSON.parse(localStorage.getItem("step-restaurant-cart") || "[]");
    } catch {
      cart = [];
    }
  }

  if (!Array.isArray(cart)) {
    cart = [];
  }

  // Hydrate cart items with product details if missing
  cart = cart.map((item) => {
    const prod = window.products?.find((p) => String(p.id) === String(item.id || item.productId));
    return {
      ...item,
      id: item.id || item.productId,
      name: item.name || prod?.name || "Dish",
      price: item.price !== undefined ? item.price : prod?.price || 0,
      image: item.image || prod?.image || "",
      quantity: Number(item.quantity) || 1,
    };
  });

  renderCart();
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const total = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);

  document.querySelectorAll(".cart-count").forEach((el) => {
    el.textContent = String(count);
  });

  if (!cartItems || !cartEmpty || !cartSummary) return;

  cartEmpty.hidden = cart.length > 0;
  cartSummary.hidden = cart.length === 0;

  cartItems.innerHTML = cart
    .map(
      (item) => `
      <article class="cart-line" data-cart-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
        <div>
          <h3 class="cart-line-title">${item.name}</h3>
          <strong class="cart-line-price">${money(item.price * item.quantity)}</strong>
          <div class="quantity-control" aria-label="Quantity for ${item.name}">
            <button type="button" data-quantity="${item.id}" data-change="-1" aria-label="Remove one ${item.name}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity="${item.id}" data-change="1" aria-label="Add one ${item.name}">+</button>
          </div>
        </div>
        <button class="remove-item" type="button" data-remove="${item.id}" aria-label="Remove ${item.name} from cart">×</button>
      </article>
    `
    )
    .join("");

  const subtotalEl = document.querySelector("#cart-subtotal");
  const totalEl = document.querySelector("#cart-total");
  if (subtotalEl) subtotalEl.textContent = money(total);
  if (totalEl) totalEl.textContent = money(total);
}

async function handleAddToCart(productId, quantity = 1) {
  const prodId = Number(productId);
  const qty = Number(quantity) || 1;

  if (window.api && typeof window.api.addToCart === "function") {
    try {
      await window.api.addToCart(prodId, qty);
    } catch (e) {
      // silently ignore, local cart still used
    }
  } else {
    const existing = cart.find((i) => Number(i.id) === prodId);
    if (existing) existing.quantity += qty;
    else cart.push({ id: prodId, quantity: qty });
    localStorage.setItem("step-restaurant-cart", JSON.stringify(cart));
  }

  await loadCartData();

  const prod = window.products?.find((p) => Number(p.id) === prodId);
  const name = prod ? prod.name : "Dish";
  showToast(`${name} added to your cart!`);
}

async function handleUpdateQuantity(productId, change) {
  const item = cart.find((entry) => String(entry.id) === String(productId));
  if (!item) return;

  const nextQuantity = item.quantity + change;

  if (window.api && typeof window.api.updateQuantity === "function") {
    try {
      await window.api.updateQuantity(item.cartItemId || item.id, nextQuantity);
    } catch (e) {
      // silently ignore quantity errors
    }
  } else {
    if (nextQuantity <= 0) {
      cart = cart.filter((i) => String(i.id) !== String(productId));
    } else {
      item.quantity = nextQuantity;
    }
    localStorage.setItem("step-restaurant-cart", JSON.stringify(cart));
  }

  await loadCartData();
}

async function handleRemoveFromCart(productId) {
  const item = cart.find((entry) => String(entry.id) === String(productId));

  if (window.api && typeof window.api.removeFromCart === "function") {
    try {
      await window.api.removeFromCart(item?.cartItemId || productId);
    } catch (e) {
      // silently ignore remove errors
    }
  } else {
    cart = cart.filter((i) => String(i.id) !== String(productId));
    localStorage.setItem("step-restaurant-cart", JSON.stringify(cart));
  }

  await loadCartData();
}

async function handleCheckout() {
  const note = document.querySelector("#checkout-note");
  const checkoutBtn = document.querySelector("#checkout-button");

  if (!window.api || !window.api.isLoggedIn()) {
    if (note) {
      note.hidden = false;
      note.innerHTML = `
        <span style="color:#d32f2f;">Please log in to complete your order.</span><br>
        <a href="login.html?redirect=cart" style="color:#ff5b35; font-weight:600; text-decoration:underline;">Click here to Sign In</a>
      `;
    }
    return;
  }

  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Processing order...";
  }

  try {
    await window.api.checkout();
    cart = [];
    renderCart();
    if (note) {
      note.hidden = false;
      note.innerHTML = `<strong style="color:#2e7d32;">✓ Order placed successfully! Thank you for ordering with Foodie.</strong>`;
    }
    showToast("🎉 Order placed successfully!");
    setTimeout(() => {
      closeCart();
      if (note) note.hidden = true;
    }, 2800);
  } catch (err) {
    if (note) {
      note.hidden = false;
      note.innerHTML = `<span style="color:#d32f2f;">${err.message || "Checkout failed. Please try again."}</span>`;
    }
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = `Place Order <span aria-hidden="true">→</span>`;
    }
  }
}

// Drawer Open / Close
// Drawer Open / Close
function openCart() {
  if (!cartDrawer || !cartBackdrop) return;
  cartDrawer.inert = false;
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  cartBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
  document.querySelector(".drawer-close")?.focus();
}

function closeCart() {
  if (!cartDrawer || !cartBackdrop) return;
  document.querySelector(".cart-trigger")?.focus();
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartDrawer.inert = true;
  cartBackdrop.hidden = true;
  document.body.classList.remove("drawer-open");
}

// --- Product Grid & Menu Filtering ---
function renderProducts() {
  if (!productGrid) return;

  const allProducts = window.products || (typeof products !== "undefined" ? products : []);
  const query = (searchInput?.value || "").trim().toLowerCase();
  const isHomePage = document.body.dataset.page === "home";
  const featuredOnly = productGrid.dataset.featuredOnly === "true" || isHomePage;

  const selectedCategories = menuCategories
    .filter((input) => input.checked)
    .map((input) => input.value);

  const veganOnly = veganFilter?.checked || false;
  const minimumRating = Number(ratingFilter?.value || 0);
  const minimumPrice = Number(minimumPriceFilter?.value || 0);
  const maximumPrice = Number(maximumPriceFilter?.value || 500);
  const maximumSpice = Number(spiceFilter?.value || 0);

  let visibleProducts = allProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesMenuCategories =
      selectedCategories.length === 0 || selectedCategories.includes(product.category);
    const searchTarget = `${product.name} ${product.category} ${product.description || ""}`.toLowerCase();
    const matchesSearch = searchTarget.includes(query);
    const matchesVegan = !veganOnly || product.vegetarian || product.vegan;
    const matchesSpice = maximumSpice === 0 || (product.spice || product.spiciness || 0) <= maximumSpice;
    const matchesRating = (product.rating || 0) >= minimumRating;
    const matchesPrice = product.price >= minimumPrice && product.price <= maximumPrice;
    const isNotCurrentProduct = String(product.id) !== String(relatedProductId);

    return (
      matchesCategory &&
      matchesMenuCategories &&
      matchesSearch &&
      matchesVegan &&
      matchesSpice &&
      matchesRating &&
      matchesPrice &&
      isNotCurrentProduct
    );
  });

  // Sort
  if (sortSelect?.value === "price-asc") visibleProducts.sort((a, b) => a.price - b.price);
  else if (sortSelect?.value === "price-desc") visibleProducts.sort((a, b) => b.price - a.price);
  else if (sortSelect?.value === "rating" || isHomePage) visibleProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // If on Home page, take top 6 popular dishes
  if (isHomePage) {
    visibleProducts = visibleProducts.slice(0, 6);
  }

  // Pagination for Menu page
  if (menuPagination && !isHomePage) {
    const totalCount = visibleProducts.length;
    const pageCount = Math.max(1, Math.ceil(totalCount / menuPageSize));
    currentMenuPage = Math.min(currentMenuPage, pageCount);

    const paginatedProducts = visibleProducts.slice(
      (currentMenuPage - 1) * menuPageSize,
      currentMenuPage * menuPageSize
    );

    menuPagination.innerHTML =
      pageCount > 1
        ? `
      <button class="pagination-arrow" type="button" data-menu-page="${currentMenuPage - 1}"${currentMenuPage === 1 ? " disabled" : ""} aria-label="Previous page">‹</button>
      ${Array.from({ length: pageCount }, (_, index) => {
        const p = index + 1;
        return `<button class="pagination-number${p === currentMenuPage ? " is-current" : ""}" type="button" data-menu-page="${p}" aria-label="Page ${p}"${p === currentMenuPage ? ' aria-current="page"' : ""}>${p}</button>`;
      }).join("")}
      <button class="pagination-arrow" type="button" data-menu-page="${currentMenuPage + 1}"${currentMenuPage === pageCount ? " disabled" : ""} aria-label="Next page">›</button>
    `
        : "";

    visibleProducts = paginatedProducts;
    if (resultsCount) resultsCount.textContent = String(totalCount);
  } else if (resultsCount) {
    resultsCount.textContent = String(visibleProducts.length);
  }

  if (emptyState) emptyState.hidden = visibleProducts.length > 0;

  // Filter indicator labels
  const spiceValue = document.querySelector("#spice-value");
  const ratingValue = document.querySelector("#rating-value");
  const minPriceValue = document.querySelector("#min-price-value");
  const maxPriceValue = document.querySelector("#max-price-value");
  if (spiceValue) spiceValue.textContent = maximumSpice === 0 ? "Level: not selected" : `Level: ${maximumSpice}`;
  if (ratingValue) ratingValue.textContent = `${minimumRating.toFixed(1)}+`;
  if (minPriceValue) minPriceValue.textContent = `$${minimumPrice}+`;
  if (maxPriceValue) maxPriceValue.textContent = `$${maximumPrice}+`;

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-image-wrap">
        <a class="product-image-link" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${product.name}">
          <img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy" />
        </a>
      </div>
      <div class="product-info">
        <h3 class="product-title"><a href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a></h3>
        <p class="product-description">${product.description || ""}</p>
        <span class="product-rating"><span aria-hidden="true">★</span>${(product.rating || 0).toFixed(1)}</span>
        <div class="product-bottom">
          <strong class="product-price">${money(product.price)}</strong>
          <button class="button add-button" type="button" data-add="${product.id}">Add to Cart</button>
        </div>
      </div>
    </article>
  `
    )
    .join("");
}

// Filter listeners
const resetMenuPage = () => {
  currentMenuPage = 1;
  renderProducts();
};

searchInput?.addEventListener("input", resetMenuPage);
sortSelect?.addEventListener("change", resetMenuPage);
menuCategories.forEach((input) => input.addEventListener("change", resetMenuPage));
veganFilter?.addEventListener("change", resetMenuPage);
spiceFilter?.addEventListener("input", resetMenuPage);
ratingFilter?.addEventListener("input", resetMenuPage);
minimumPriceFilter?.addEventListener("input", resetMenuPage);
maximumPriceFilter?.addEventListener("input", resetMenuPage);

document.querySelector("#clear-filters")?.addEventListener("click", () => {
  menuCategories.forEach((input) => {
    input.checked = false;
  });
  if (searchInput) searchInput.value = "";
  if (veganFilter) veganFilter.checked = false;
  if (spiceFilter) spiceFilter.value = "0";
  if (ratingFilter) ratingFilter.value = "0";
  if (minimumPriceFilter) minimumPriceFilter.value = "0";
  if (maximumPriceFilter) maximumPriceFilter.value = "500";
  resetMenuPage();
});

// Card navigation
productGrid?.addEventListener("click", (event) => {
  if (event.target.closest("a, button")) return;
  const card = event.target.closest("[data-product-id]");
  if (card) {
    window.location.href = `product.html?id=${encodeURIComponent(card.dataset.productId)}`;
  }
});

// Pagination clicks
menuPagination?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-page]");
  if (!button || button.disabled) return;
  currentMenuPage = Number(button.dataset.menuPage);
  renderProducts();
  document.querySelector(".menu-results-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Global "Add to Cart" button listener
document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    const qty =
      addButton.id === "detail-add"
        ? Number(document.querySelector("#detail-quantity")?.value || 1)
        : 1;
    handleAddToCart(addButton.dataset.add, qty);
  }
});

// Cart Drawer events
cartItems?.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  if (quantityButton) {
    handleUpdateQuantity(quantityButton.dataset.quantity, Number(quantityButton.dataset.change));
    return;
  }
  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    handleRemoveFromCart(removeButton.dataset.remove);
  }
});

// Cart Trigger & Drawer Listeners (works on buttons and links)
document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".cart-trigger");
  if (trigger) {
    e.preventDefault();
    openCart();
  }
});

document.querySelector(".drawer-close")?.addEventListener("click", closeCart);
cartBackdrop?.addEventListener("click", closeCart);
document.querySelector("#checkout-button")?.addEventListener("click", handleCheckout);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartDrawer?.classList.contains("is-open")) {
    closeCart();
  }
  if (event.key === "/" && searchInput && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

// Mobile menu toggle
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const mainNav = document.querySelector("#main-nav");
mobileMenuToggle?.addEventListener("click", () => {
  const isOpen = mobileMenuToggle.getAttribute("aria-expanded") === "true";
  mobileMenuToggle.setAttribute("aria-expanded", String(!isOpen));
  mainNav?.classList.toggle("is-open", !isOpen);
});

mainNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    mainNav.classList.remove("is-open");
    mobileMenuToggle?.setAttribute("aria-expanded", "false");
  }
});

// Hook into API cart & product events
if (window.api && typeof window.api.onCartChange === "function") {
  window.api.onCartChange(loadCartData);
}

window.addEventListener("productsLoaded", () => {
  renderProducts();
  loadCartData();
});

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    renderProducts();
    loadCartData();
  });
} else {
  renderProducts();
  loadCartData();
}

// Background sync from API
if (typeof window.refreshProductsFromApi === "function") {
  window.refreshProductsFromApi();
}