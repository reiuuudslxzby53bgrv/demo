

const API_BASE = "https://restaurantapi.stepacademy.ge";
const API_KEY = "77cc426a-8fc8-4585-ab7b-0e9e51af7f6e";

const TOKEN_KEY = "step_restaurant_access_token";
const REFRESH_TOKEN_KEY = "step_restaurant_refresh_token";
const USER_KEY = "step_restaurant_user";
const LOCAL_CART_KEY = "step-restaurant-cart";

class ApiService {
  constructor() {
    this.authListeners = new Set();
    this.cartListeners = new Set();
  }

  
  getAccessToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  }

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY) || null;
  }

  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn() {
    return Boolean(this.getAccessToken());
  }

  setAuthData(authResponse, remember = true) {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;

    
    otherStorage.removeItem(TOKEN_KEY);
    otherStorage.removeItem(REFRESH_TOKEN_KEY);
    otherStorage.removeItem(USER_KEY);

    if (authResponse?.accessToken) {
      storage.setItem(TOKEN_KEY, authResponse.accessToken);
    }
    if (authResponse?.refreshToken) {
      storage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
    }
    if (authResponse?.user) {
      storage.setItem(USER_KEY, JSON.stringify(authResponse.user));
    }

    this.notifyAuthChange();
  }

  setUser(user) {
    if (localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    this.notifyAuthChange();
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.notifyAuthChange();
    this.notifyCartChange();
  }

  onAuthChange(callback) {
    this.authListeners.add(callback);
    return () => this.authListeners.delete(callback);
  }

  notifyAuthChange() {
    const user = this.getUser();
    const isLogged = this.isLoggedIn();
    this.authListeners.forEach((cb) => {
      try {
        cb({ isLogged, user });
      } catch (e) {
        
      }
    });
  }

  onCartChange(callback) {
    this.cartListeners.add(callback);
    return () => this.cartListeners.delete(callback);
  }

  notifyCartChange() {
    this.cartListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        
      }
    });
  }

  
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
      "X-STEP-KEY": API_KEY,
      "Accept": "application/json",
      ...(options.headers || {}),
    };

    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    const token = this.getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (networkError) {
      throw new Error("ქსელური შეცდომა: სერვერთან კავშირი ვერ დამყარდა (Network error).");
    }

    
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        
        headers["Authorization"] = `Bearer ${this.getAccessToken()}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    
    let data = null;
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } catch {
      data = null;
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}.`;
      if (data && typeof data === "object") {
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.title) {
          errorMessage = data.title;
        }
        if (data.errors && typeof data.errors === "object") {
          const validationList = Object.values(data.errors).flat();
          if (validationList.length > 0) {
            errorMessage = validationList.join("\n");
          }
        }
      } else if (typeof data === "string" && data.trim()) {
        try {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === "object") {
            errorMessage = parsed.detail || parsed.message || parsed.title || data;
          } else {
            errorMessage = data;
          }
        } catch {
          errorMessage = data;
        }
      }

      
      if (
        errorMessage === "User Not Found" ||
        (response.status === 404 && endpoint.includes("forgot-password"))
      ) {
        errorMessage = "No account found with this email address. Please check your email or sign up.";
      } else if (
        errorMessage.toLowerCase().includes("password or email is incorrect") ||
        (response.status === 400 && endpoint.includes("login"))
      ) {
        errorMessage = "Incorrect email or password. Please try again.";
      } else if (errorMessage.includes("Invalid `to` field")) {
        errorMessage = "Please enter a valid personal email address (e.g. Gmail).";
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh-access-token/${encodeURIComponent(refreshToken)}`, {
        method: "POST",
        headers: {
          "X-STEP-KEY": API_KEY,
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        this.logout();
        return false;
      }

      const data = await res.json();
      const loginResponse = data?.data || data;
      if (loginResponse?.accessToken) {
        const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
        storage.setItem(TOKEN_KEY, loginResponse.accessToken);
        if (loginResponse.refreshToken) {
          storage.setItem(REFRESH_TOKEN_KEY, loginResponse.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  
  async register({ firstName, lastName, email, password }) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: { firstName, lastName, email, password },
    });
  }

  async login({ email, password, remember = true }) {
    const res = await this.request("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const data = res?.data || res;
    if (data?.accessToken) {
      this.setAuthData(data, remember);
      
      try {
        const profile = await this.getProfile();
        if (profile) {
          this.setUser(profile);
        }
      } catch {}
      
      await this.syncLocalCartToServer();
    }
    return data;
  }

  async verifyEmail({ email, code }) {
    const res = await this.request("/api/auth/verify-email", {
      method: "PUT",
      body: { email, code },
    });
    const data = res?.data || res;
    if (data?.accessToken) {
      this.setAuthData(data, true);
      try {
        const profile = await this.getProfile();
        if (profile) this.setUser(profile);
      } catch {}
      await this.syncLocalCartToServer();
    }
    return data;
  }

  async resendEmailVerification(email) {
    return this.request(`/api/auth/resend-email-verification/${encodeURIComponent(email)}`, {
      method: "POST",
    });
  }

  async forgotPassword(email) {
    return this.request(`/api/auth/forgot-password/${encodeURIComponent(email)}`, {
      method: "POST",
    });
  }

  async resetPassword({ token, newPassword }) {
    return this.request("/api/auth/reset-password", {
      method: "PUT",
      body: { token, newPassword },
    });
  }

  
  async getMe() {
    const res = await this.request("/api/users/me");
    return res?.data || res;
  }

  async getProfile() {
    const res = await this.request("/api/users/profile");
    return res?.data || res;
  }

  async editProfile(profileData) {
    const res = await this.request("/api/users/edit", {
      method: "PUT",
      body: profileData,
    });
    try {
      const updated = await this.getProfile();
      if (updated) this.setUser(updated);
    } catch {}
    return res?.data || res;
  }

  async changePassword({ oldPassword, newPassword, confirmPassword }) {
    return this.request("/api/users/change-password", {
      method: "PUT",
      body: { oldPassword, newPassword, confirmPassword },
    });
  }

  async deleteAccount() {
    const res = await this.request("/api/users/delete", {
      method: "DELETE",
    });
    this.logout();
    return res;
  }

  
  async getCategories() {
    const res = await this.request("/api/categories");
    return res?.data || [];
  }

  
  async getProducts({ page = 1, take = 50 } = {}) {
    const res = await this.request(`/api/products?Page=${page}&Take=${take}`);
    return res?.data || { products: [], hasMore: false };
  }

  async filterProducts({
    query = "",
    categoryId,
    vegetarian,
    spiciness,
    rate,
    minPrice,
    maxPrice,
    page = 1,
    take = 50,
  } = {}) {
    const params = new URLSearchParams();
    if (query) params.append("Query", query);
    if (categoryId !== undefined && categoryId !== null && categoryId !== "All") {
      params.append("CategoryId", categoryId);
    }
    if (typeof vegetarian === "boolean") params.append("Vegetarian", vegetarian);
    if (spiciness !== undefined && spiciness > 0) params.append("Spiciness", spiciness);
    if (rate !== undefined && rate > 0) params.append("Rate", rate);
    if (minPrice !== undefined && minPrice > 0) params.append("MinPrice", minPrice);
    if (maxPrice !== undefined && maxPrice < 500) params.append("MaxPrice", maxPrice);
    params.append("Page", page);
    params.append("Take", take);

    const res = await this.request(`/api/products/filter?${params.toString()}`);
    return res?.data || { products: [], hasMore: false };
  }

  async getProduct(id) {
    const res = await this.request(`/api/products/${encodeURIComponent(id)}`);
    return res?.data || res;
  }

  
  getLocalCart() {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setLocalCart(items) {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    this.notifyCartChange();
  }

  async getCart() {
    if (!this.isLoggedIn()) {
      return this.getLocalCart();
    }

    try {
      const res = await this.request("/api/cart");
      let serverItems = [];

      if (Array.isArray(res)) {
        serverItems = res;
      } else if (Array.isArray(res?.data?.items)) {
        serverItems = res.data.items;
      } else if (Array.isArray(res?.items)) {
        serverItems = res.items;
      } else if (Array.isArray(res?.data)) {
        serverItems = res.data;
      }

      return serverItems.map((item) => ({
        cartItemId: item.id,
        id: item.product?.id || item.productId || item.id,
        name: item.product?.name || item.name || "Dish",
        price: item.product?.price !== undefined ? item.product.price : (item.price || 0),
        image: item.product?.image || item.image || "",
        quantity: Number(item.quantity) || 1,
      }));
    } catch (e) {
      return this.getLocalCart();
    }
  }

  async addToCart(productId, quantity = 1) {
    const numId = Number(productId);
    const qty = Number(quantity) || 1;

    if (!this.isLoggedIn()) {
      const local = this.getLocalCart();
      const existing = local.find((i) => Number(i.id) === numId);
      if (existing) {
        existing.quantity += qty;
      } else {
        local.push({ id: numId, quantity: qty });
      }
      this.setLocalCart(local);
      return { success: true, local: true };
    }

    const res = await this.request("/api/cart/add-to-cart", {
      method: "POST",
      body: { productId: numId, quantity: qty },
    });
    this.notifyCartChange();
    return res;
  }

  async updateQuantity(cartItemIdOrProductId, newQuantity) {
    const qty = Number(newQuantity);

    if (!this.isLoggedIn()) {
      let local = this.getLocalCart();
      if (qty <= 0) {
        local = local.filter((i) => Number(i.id) !== Number(cartItemIdOrProductId));
      } else {
        const item = local.find((i) => Number(i.id) === Number(cartItemIdOrProductId));
        if (item) item.quantity = qty;
      }
      this.setLocalCart(local);
      return;
    }

    
    const cart = await this.getCart();
    const item = cart.find(
      (i) => String(i.cartItemId) === String(cartItemIdOrProductId) || String(i.id) === String(cartItemIdOrProductId)
    );

    if (!item) return;

    if (qty <= 0) {
      await this.removeFromCart(item.cartItemId);
    } else {
      await this.request("/api/cart/edit-quantity", {
        method: "PUT",
        body: { itemId: item.cartItemId, quantity: qty },
      });
      this.notifyCartChange();
    }
  }

  async removeFromCart(cartItemIdOrProductId) {
    if (!this.isLoggedIn()) {
      let local = this.getLocalCart();
      local = local.filter((i) => String(i.id) !== String(cartItemIdOrProductId));
      this.setLocalCart(local);
      return;
    }

    const cart = await this.getCart();
    const item = cart.find(
      (i) => String(i.cartItemId) === String(cartItemIdOrProductId) || String(i.id) === String(cartItemIdOrProductId)
    );

    const targetId = item ? item.cartItemId : cartItemIdOrProductId;
    await this.request(`/api/cart/remove-from-cart/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
    });
    this.notifyCartChange();
  }

  async checkout() {
    if (!this.isLoggedIn()) {
      throw new Error("შეკვეთის გასაფორმებლად გთხოვთ გაიაროთ ავტორიზაცია (Please log in to checkout).");
    }

    const res = await this.request("/api/cart/checkout", {
      method: "POST",
    });
    this.notifyCartChange();
    return res;
  }

  async syncLocalCartToServer() {
    const local = this.getLocalCart();
    if (!local || local.length === 0) return;

    for (const item of local) {
      try {
        await this.request("/api/cart/add-to-cart", {
          method: "POST",
          body: { productId: Number(item.id), quantity: Number(item.quantity) },
        });
      } catch (err) {
        
      }
    }
    
    localStorage.removeItem(LOCAL_CART_KEY);
    this.notifyCartChange();
  }
}

export const api = new ApiService();
if (typeof window !== "undefined") {
  window.api = api;
}
