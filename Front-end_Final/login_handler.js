(function () {
  if (window.__login_handler_initialized) return;
  window.__login_handler_initialized = true;

  function updateNavForUser(user) {
    const profile = document.getElementById("nav-btn-profile");
    const logout = document.getElementById("nav-btn-logout");
    const login = document.getElementById("nav-btn-login");
    const admin = document.getElementById("nav-btn-admin");

    if (profile) profile.style.display = "inline-block";
    if (logout) {
      logout.style.display = "inline-block";
      logout.onclick = function (e) {
        e.preventDefault();
        if (window.API && API.logout) API.logout();
        else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("userRole");
          try {
            localStorage.removeItem("userData");
          } catch (e) {}
          try {
            window.location.reload();
          } catch (e) {}
        }
      };
    }
    if (login) login.style.display = "none";

    if (admin) {
      const role = (user && user.role) || localStorage.getItem("userRole");
      if (role === "admin" || role === "developer")
        admin.style.display = "inline-block";
      else admin.style.display = "none";
    }
  }

  function initLoginForm() {
    const loginForm = document.getElementById("login-form");
    if (!loginForm) return;
    if (loginForm.__login_handler_attached) return;
    loginForm.__login_handler_attached = true;

    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const emailEl = document.getElementById("emailLogin");
      const passEl = document.getElementById("passLogin");
      const email = emailEl ? emailEl.value.trim() : "";
      const pass = passEl ? passEl.value : "";
      const btn = loginForm.querySelector("button[type='submit']");

      try {
        if (btn) {
          btn.innerText = "Verificando...";
          btn.disabled = true;
        }
        if (!window.API || !API.login) throw new Error("API no disponible");
        const user = await API.login(email, pass);
        console.log("login_handler: user ->", user);

        if (user && user.token) localStorage.setItem("authToken", user.token);
        localStorage.setItem("userRole", user.role || "user");
        try {
          localStorage.setItem("userData", JSON.stringify(user));
        } catch (e) {}

        updateNavForUser(user);

        // Cerrar modal si existe
        const loginModal = document.getElementById("login-modal");
        if (loginModal) loginModal.classList.add("hidden");

        if (btn) {
          btn.innerText = "Ingresar";
          btn.disabled = false;
        }

        // Redirigir al perfil para UX consistente
        window.location.href = "B08_B09-Perfil_de_usuario.html";
      } catch (err) {
        if (btn) {
          btn.innerText = "Ingresar";
          btn.disabled = false;
        }
        const errorMsgEl = loginForm.querySelector("#login-error-msg");
        if (errorMsgEl) {
          errorMsgEl.style.display = "block";
          errorMsgEl.textContent = err.message || "Error en autenticación";
        } else alert(err.message || "Error en autenticación");
        console.error("Login handler error:", err);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Inicializar comportamiento de abrir modal desde nav
    const loginBtn = document.getElementById("nav-btn-login");
    const loginModal = document.getElementById("login-modal");
    if (loginBtn && loginModal) {
      loginBtn.addEventListener("click", function (e) {
        e.preventDefault();
        loginModal.classList.remove("hidden");
      });
    }

    // Inicializar formulario
    initLoginForm();

    // Si ya hay token, actualizar nav
    const token = localStorage.getItem("authToken");
    if (token) {
      let userData = null;
      try {
        userData = JSON.parse(localStorage.getItem("userData") || "null");
      } catch (e) {}
      updateNavForUser(userData || { role: localStorage.getItem("userRole") });
    }
  });
})();
