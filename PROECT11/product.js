// Product details page script
const urlParams = new URLSearchParams(window.location.search);
const rawProductId = urlParams.get("id");

const productDetail = document.querySelector("#product-detail");
const notFound = document.querySelector("#product-not-found");
const relatedProductsSection = document.querySelector("#related-products-section");

function findProductLocally(idOrSlug) {
  const list = window.products || (typeof products !== "undefined" ? products : []);
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.find(
    (entry) =>
      String(entry.id) === String(idOrSlug) ||
      (entry.slug && entry.slug === idOrSlug) ||
      (entry.name && entry.name.toLowerCase().replace(/\s+/g, "-") === String(idOrSlug).toLowerCase())
  );
}

async function loadProductDetail() {
  if (!rawProductId) {
    if (notFound) notFound.hidden = false;
    return;
  }

  let product = findProductLocally(rawProductId);

  // If not found locally or lacks ingredients, fetch from live API
  if (!product || !product.ingredients || product.ingredients.length === 0) {
    try {
      const res = await fetch(`https://restaurantapi.stepacademy.ge/api/products/${encodeURIComponent(rawProductId)}`, {
        headers: {
          "X-STEP-KEY": "77cc426a-8fc8-4585-ab7b-0e9e51af7f6e",
          "Accept": "application/json"
        }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data) {
          const categoryObj = window.categories?.find(c => c.id === data.categoryId);
          product = {
            id: data.id,
            name: data.name,
            category: categoryObj ? categoryObj.name : "Main Courses",
            categoryId: data.categoryId,
            description: data.description || "",
            price: data.price,
            rating: Number(data.rate || 0),
            spiciness: data.spiciness || 0,
            vegetarian: Boolean(data.vegetarian || data.vegeterian),
            image: data.image || "",
            ingredients: Array.isArray(data.ingredients) && data.ingredients.length > 0
              ? data.ingredients
              : [data.name, "Fresh seasonal ingredients", "Italian herbs and seasoning"],
            preparation: data.method || `Prepared fresh in the kitchen using ${data.name.toLowerCase()} and carefully selected ingredients.`
          };
        }
      }
    } catch (e) {
      console.warn("Could not fetch product detail from API:", e);
    }
  }

  if (product) {
    document.title = `${product.name} — Foodie`;
    if (productDetail) productDetail.hidden = false;
    if (notFound) notFound.hidden = true;
    if (relatedProductsSection) relatedProductsSection.hidden = false;

    const img = document.querySelector("#detail-image");
    if (img) {
      img.src = product.image;
      img.alt = product.name;
    }

    const title = document.querySelector("#detail-name");
    if (title) title.textContent = product.name;

    const stars = document.querySelector("#detail-stars");
    if (stars) {
      const r = Math.max(0, Math.min(5, Math.round(product.rating || 0)));
      stars.textContent = `${"★".repeat(r)}${"☆".repeat(5 - r)}`;
    }

    const rating = document.querySelector("#detail-rating");
    if (rating) rating.textContent = `${(product.rating || 0).toFixed(1)} rating`;

    const price = document.querySelector("#detail-price");
    if (price) price.textContent = `$${(product.price || 0).toFixed(2)}`;

    const desc = document.querySelector("#detail-description");
    if (desc) desc.textContent = product.description;

    const prep = document.querySelector("#detail-preparation");
    if (prep) prep.textContent = product.preparation;

    const veg = document.querySelector("#detail-vegetarian");
    if (veg) veg.hidden = !product.vegetarian;

    const addBtn = document.querySelector("#detail-add");
    if (addBtn) addBtn.dataset.add = String(product.id);

    const ingredientList = document.querySelector("#detail-ingredients");
    if (ingredientList) {
      ingredientList.innerHTML = "";
      (product.ingredients || []).forEach((ingredient) => {
        const item = document.createElement("li");
        item.textContent = ingredient;
        ingredientList.append(item);
      });
    }

    // Render related dishes
    renderRelatedProducts(product);
  } else {
    if (productDetail) productDetail.hidden = true;
    if (notFound) notFound.hidden = false;
    if (relatedProductsSection) relatedProductsSection.hidden = true;
  }
}

function renderRelatedProducts(currentProduct) {
  const grid = document.querySelector(".related-products-grid");
  const allProds = window.products || (typeof products !== "undefined" ? products : []);
  if (!grid || !allProds.length) return;

  const related = allProds
    .filter((p) => p.id !== currentProduct.id && (p.category === currentProduct.category || p.categoryId === currentProduct.categoryId))
    .slice(0, 4);

  const displayList = related.length > 0 ? related : allProds.filter((p) => p.id !== currentProduct.id).slice(0, 4);

  grid.innerHTML = displayList
    .map(
      (item) => `
    <article class="product-card" data-product-id="${item.id}">
      <div class="product-image-wrap">
        <a class="product-image-link" href="product.html?id=${encodeURIComponent(item.id)}" aria-label="View ${item.name}">
          <img class="product-image" src="${item.image}" alt="${item.name}" loading="lazy" />
        </a>
      </div>
      <div class="product-info">
        <h3 class="product-title"><a href="product.html?id=${encodeURIComponent(item.id)}">${item.name}</a></h3>
        <p class="product-description">${item.description}</p>
        <span class="product-rating"><span aria-hidden="true">★</span>${(item.rating || 0).toFixed(1)}</span>
        <div class="product-bottom">
          <strong class="product-price">$${(item.price || 0).toFixed(2)}</strong>
          <button class="button add-button" type="button" data-add="${item.id}">Add to Cart</button>
        </div>
      </div>
    </article>
  `
    )
    .join("");
}

// Quantity controls on product page
document.querySelector(".detail-quantity-control")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quantity-change]");
  if (!button) return;
  const quantityInput = document.querySelector("#detail-quantity");
  if (!quantityInput) return;
  const nextQuantity = Number(quantityInput.value) + Number(button.dataset.quantityChange);
  quantityInput.value = String(Math.min(99, Math.max(1, nextQuantity)));
});

document.querySelector("#detail-quantity")?.addEventListener("change", (event) => {
  const input = event.currentTarget;
  const quantity = Number(input.value);
  input.value = String(Number.isInteger(quantity) ? Math.min(99, Math.max(1, quantity)) : 1);
});

// Initialize on DOM load or when products are ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadProductDetail);
} else {
  loadProductDetail();
}

window.addEventListener("productsLoaded", loadProductDetail);
