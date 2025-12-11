/*
  js/menu_logic.js
  Controlador global para la barra de navegación.
  Se ejecuta automáticamente en todas las páginas que lo importen.
*/

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});

// Función global que actualiza la UI del menú
function updateNavbar() {
    // 1. Leer estado desde localStorage
    const userRole = localStorage.getItem("userRole"); // 'admin', 'customer', o null
    const isLoggedIn = userRole !== null;

    // 2. Referencias a botones (Ids estándar)
    const btnLogin = document.getElementById('nav-btn-login');
    const btnProfile = document.getElementById('nav-btn-profile');
    const btnAdmin = document.getElementById('nav-btn-admin');
    const btnLogout = document.getElementById('nav-btn-logout');

    // 3. Lógica de visibilidad
    if (isLoggedIn) {
        // --- USUARIO CONECTADO ---
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnProfile) btnProfile.style.display = 'inline-block'; // Mostrar perfil
        if (btnLogout) btnLogout.style.display = 'inline-block';   // Mostrar salir

        // Mostrar Panel Admin SOLO si es admin
        if (userRole === 'admin') {
            if (btnAdmin) btnAdmin.style.display = 'inline-block'; // o 'block' según CSS
        } else {
            if (btnAdmin) btnAdmin.style.display = 'none';
        }
    } else {
        // --- INVITADO (NO LOGUEADO) ---
        if (btnLogin) btnLogin.style.display = 'inline-block';
        if (btnProfile) btnProfile.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'none';
        if (btnAdmin) btnAdmin.style.display = 'none';
    }
    
    // 4. Configurar Logout globalmente
    if (btnLogout) {
        // Clonamos para limpiar eventos previos y evitar duplicados
        const newLogout = btnLogout.cloneNode(true);
        if(btnLogout.parentNode) {
            btnLogout.parentNode.replaceChild(newLogout, btnLogout);
            
            newLogout.addEventListener('click', (e) => {
                e.preventDefault();
                if(window.API && API.logout) API.logout();
                else {
                    // Fallback manual si API no está cargada
                    localStorage.removeItem("userRole");
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("userName");
                }
                // Redirigir al home o recargar
                window.location.href = 'B07-Home.html'; 
            });
        }
    }
}

// Exponer la función globalmente para poder llamarla tras el login sin recargar
window.updateNavbar = updateNavbar;