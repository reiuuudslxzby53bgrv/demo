import { forgotPassword, resetPassword } from "./auth.js";

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const message = document.getElementById("message");

function setMessage(text, isError = false) {
  if (!message) return;
  message.textContent = text;
  message.style.color = isError ? "#d32f2f" : "#2e7d32";
  message.setAttribute("role", isError ? "alert" : "status");
  message.style.display = "block";
}

// Request password reset token
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("forgotPasswordEmail").value.trim();
    if (!email) return;

    const btn = forgotPasswordForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending...";
    }

    try {
      const token = await forgotPassword(email);
      const emailField = document.getElementById("resetPasswordEmail");
      if (emailField) emailField.value = email;

      const codeField = document.getElementById("resetPasswordCode");
      if (codeField && typeof token === "string" && token.length > 5) {
        codeField.value = token;
      }

      setMessage("Password reset code sent! Enter it below with your new password.");
      if (resetPasswordForm) {
        resetPasswordForm.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Password reset request failed.";
      setMessage(errorMessage, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Send Reset Code";
      }
    }
  });
}

// Set new password with token/code
if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const code = document.getElementById("resetPasswordCode").value.trim();
    const newPassword = document.getElementById("resetNewPassword").value;

    if (!code || !newPassword) {
      setMessage("Please fill in both the code and your new password.", true);
      return;
    }

    const btn = resetPasswordForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Updating...";
    }

    try {
      await resetPassword({ token: code, code, newPassword });
      setMessage("Password reset successfully! Redirecting to login...", false);
      resetPasswordForm.reset();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Password reset failed.";
      setMessage(errorMessage, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Set New Password";
      }
    }
  });
}