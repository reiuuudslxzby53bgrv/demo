import { api } from "./api.js";

// Re-export for compatibility with reset-password.js and external callers
export async function forgotPassword(email) {
  const res = await api.forgotPassword(email);
  return res?.data || res;
}

export async function resetPassword({ token, newPassword, code }) {
  const resetToken = token || code;
  const res = await api.resetPassword({ token: resetToken, newPassword });
  return res?.data || res;
}

export async function login({ email, password, remember = true }) {
  return api.login({ email, password, remember });
}

export async function register({ firstName, lastName, email, password }) {
  return api.register({ firstName, lastName, email, password });
}

export async function verifyEmail({ email, code }) {
  return api.verifyEmail({ email, code });
}

export async function resendEmailVerification(email) {
  return api.resendEmailVerification(email);
}

export function logout() {
  api.logout();
  window.location.href = "login.html";
}

// Password toggle helper
function initPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-input")?.querySelector("input");
      if (!input) return;
      const showPassword = input.type === "password";
      input.type = showPassword ? "text" : "password";
      button.setAttribute("aria-pressed", String(showPassword));
      button.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
    });
  });
}

function showMessage(container, text, isError = false) {
  const message = container?.querySelector("[data-auth-message]") || document.querySelector("[data-auth-message]");
  if (!message) return;
  message.textContent = text;
  message.dataset.state = isError ? "error" : "success";
  message.style.display = "block";
}

function clearMessage(container) {
  const message = container?.querySelector("[data-auth-message]") || document.querySelector("[data-auth-message]");
  if (!message) return;
  message.textContent = "";
  message.removeAttribute("data-state");
  message.style.display = "none";
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (redirect && !redirect.startsWith("http")) {
    return redirect;
  }
  return "menu.html";
}

function applyPrefillFromQuery() {
  const form = document.querySelector("[data-auth-form]");
  const emailInput = form?.querySelector('[name="email"]');
  if (!emailInput) return;

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  if (email) emailInput.value = email;
}

// Render verification step into the card
function renderVerificationView(email, reason = "") {
  const card = document.querySelector(".auth-card");
  if (!card) return;

  card.innerHTML = `
    <header class="auth-heading">
      <h1>Verify Email</h1>
      <p>${reason || "We sent a verification code to"}<br><strong>${email}</strong></p>
    </header>
    <form class="auth-form" id="verify-email-form">
      <input type="hidden" name="email" value="${email}" />
      <label class="auth-field" for="verification-code">
        <span>Verification Code</span>
        <input id="verification-code" name="code" type="text" placeholder="Enter code from email" required autofocus />
      </label>
      <button class="auth-submit" type="submit">Verify & Sign In</button>
      <div class="auth-options" style="justify-content:center; gap:12px; margin-top:4px;">
        <button class="auth-text-button" type="button" id="resend-code-btn">Resend code</button>
        <span style="color:#aaa;">•</span>
        <a class="auth-text-button" href="login.html" style="text-decoration:none;">Back to Sign In</a>
      </div>
      <p class="auth-message" role="status" aria-live="polite" data-auth-message></p>
    </form>
  `;

  const form = document.getElementById("verify-email-form");
  const resendBtn = document.getElementById("resend-code-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = form.querySelector('[name="code"]').value.trim();
    if (!code) {
      showMessage(form, "Please enter the verification code.", true);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";
    clearMessage(form);

    try {
      await api.verifyEmail({ email, code });
      showMessage(form, "Email verified successfully! Redirecting...", false);
      setTimeout(() => {
        window.location.href = getRedirectTarget();
      }, 1000);
    } catch (err) {
      showMessage(form, err.message || "Verification failed.", true);
      submitBtn.disabled = false;
      submitBtn.textContent = "Verify & Sign In";
    }
  });

  resendBtn.addEventListener("click", async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = "Sending...";
    try {
      await api.resendEmailVerification(email);
      showMessage(form, "A new code has been sent to your email.", false);
      setTimeout(() => {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend code";
      }, 5000);
    } catch (err) {
      showMessage(form, err.message || "Could not resend code.", true);
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend code";
    }
  });
}

// Render inline Forgot Password / Reset Password modal or view
function renderForgotPasswordView(prefillEmail = "") {
  const card = document.querySelector(".auth-card");
  if (!card) return;

  card.innerHTML = `
    <header class="auth-heading">
      <h1>Reset Password</h1>
      <p>Enter your email to receive a password reset token</p>
    </header>
    <form class="auth-form" id="forgot-password-step1">
      <label class="auth-field" for="forgot-email">
        <span>Email Address</span>
        <input id="forgot-email" name="email" type="email" placeholder="you@example.com" value="${prefillEmail}" required autofocus />
      </label>
      <button class="auth-submit" type="submit">Send Reset Token</button>
      <div class="auth-options" style="justify-content:center; margin-top:4px;">
        <a class="auth-text-button" href="login.html" style="text-decoration:none;">Back to Sign In</a>
      </div>
      <p class="auth-message" role="status" aria-live="polite" data-auth-message></p>
    </form>
  `;

  const form1 = document.getElementById("forgot-password-step1");
  form1.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) return;

    const submitBtn = form1.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    clearMessage(form1);

    try {
      const res = await api.forgotPassword(email);
      const token = res?.data || (typeof res === "string" ? res : "");

      // Render step 2: Enter new password with token
      card.innerHTML = `
        <header class="auth-heading">
          <h1>New Password</h1>
          <p>Set a new password for <strong>${email}</strong></p>
        </header>
        <form class="auth-form" id="forgot-password-step2">
          <label class="auth-field" for="reset-token">
            <span>Reset Token / Code</span>
            <input id="reset-token" name="token" type="text" placeholder="Enter token from email or response" value="${token}" required />
          </label>
          <label class="auth-field" for="new-password">
            <span>New Password</span>
            <span class="password-input">
              <input id="new-password" name="newPassword" type="password" placeholder="At least 8 chars" required minlength="8" />
              <button class="password-toggle" type="button" aria-label="Show password" aria-pressed="false" data-password-toggle>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
              </button>
            </span>
          </label>
          <button class="auth-submit" type="submit">Update Password</button>
          <div class="auth-options" style="justify-content:center; margin-top:4px;">
            <a class="auth-text-button" href="login.html" style="text-decoration:none;">Cancel & Sign In</a>
          </div>
          <p class="auth-message" role="status" aria-live="polite" data-auth-message></p>
        </form>
      `;

      initPasswordToggles();
      const form2 = document.getElementById("forgot-password-step2");
      form2.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const resetTokenVal = document.getElementById("reset-token").value.trim();
        const newPasswordVal = document.getElementById("new-password").value;

        const subBtn2 = form2.querySelector('button[type="submit"]');
        subBtn2.disabled = true;
        subBtn2.textContent = "Updating...";
        clearMessage(form2);

        try {
          await api.resetPassword({ token: resetTokenVal, newPassword: newPasswordVal });
          showMessage(form2, "Password updated successfully! Redirecting to login...", false);
          setTimeout(() => {
            window.location.href = `login.html?email=${encodeURIComponent(email)}`;
          }, 1500);
        } catch (err2) {
          showMessage(form2, err2.message || "Failed to reset password.", true);
          subBtn2.disabled = false;
          subBtn2.textContent = "Update Password";
        }
      });
    } catch (err) {
      showMessage(form1, err.message || "User not found or request failed.", true);
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reset Token";
    }
  });
}

// Main page initialization
document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();
  applyPrefillFromQuery();

  const authForm = document.querySelector("[data-auth-form]");
  if (authForm) {
    const isSignup = authForm.dataset.authKind === "signup";

    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!authForm.reportValidity()) return;

      const submitBtn = authForm.querySelector(".auth-submit");
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = isSignup ? "Creating account..." : "Signing in...";
      clearMessage(authForm);

      const formData = new FormData(authForm);

      if (isSignup) {
        const firstName = formData.get("given-name")?.toString().trim();
        const lastName = formData.get("family-name")?.toString().trim();
        const email = formData.get("email")?.toString().trim();
        const password = formData.get("password")?.toString();

        try {
          await api.register({ firstName, lastName, email, password });
          // Transition to email verification view
          renderVerificationView(email, "Account created! Please check your email for the verification code:");
        } catch (error) {
          showMessage(authForm, error.message || "Registration failed.", true);
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      } else {
        const email = formData.get("email")?.toString().trim();
        const password = formData.get("password")?.toString();
        const remember = Boolean(formData.get("remember"));

        try {
          await api.login({ email, password, remember });
          showMessage(authForm, "Signed in successfully! Redirecting...", false);
          setTimeout(() => {
            window.location.href = getRedirectTarget();
          }, 700);
        } catch (error) {
          // If 406 or requires email verification
          if (error.status === 406 || (error.message && error.message.toLowerCase().includes("verification"))) {
            renderVerificationView(email, "Your account needs verification. Check your email for code:");
            return;
          }

          showMessage(authForm, error.message || "Invalid credentials.", true);
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // Handle forgot password button on login page
  document.querySelector("[data-forgot-password]")?.addEventListener("click", () => {
    const emailVal = document.querySelector('[name="email"]')?.value?.trim() || "";
    renderForgotPasswordView(emailVal);
  });
});
