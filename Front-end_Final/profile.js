/* profile.js - Lógica del perfil de usuario
   - Carga perfil
   - Edita email/phone
   - Agrega/elimina direcciones
   - Agrega/elimina tarjetas
   - Muestra historial de pedidos
*/

document.addEventListener("DOMContentLoaded", async () => {
  // Elementos
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const editBtn = document.querySelector(
    '.section-header a[data-action="edit"]'
  );
  const saveBtn = document.createElement("button");
  const cancelBtn = document.createElement("button");

  const addressesList = document.getElementById("addresses-list");
  const addAddressBtn = document.getElementById("add-address-btn");

  const cardsList = document.getElementById("cards-list");
  const addCardBtn = document.getElementById("add-card-btn");

  const ordersContainer = document.getElementById("recent-orders-list");

  if (!localStorage.getItem("authToken")) {
    alert("Debes iniciar sesión para ver tu perfil.");
    window.location.href = "B07-Home.html";
    return;
  }

  // Crear botones Save/Cancel para edición
  saveBtn.textContent = "Guardar";
  saveBtn.className = "action-button";
  saveBtn.style.borderStyle = "solid";
  saveBtn.style.marginTop = "0.5rem";
  saveBtn.style.display = "none";

  cancelBtn.textContent = "Cancelar";
  cancelBtn.className = "action-button";
  cancelBtn.style.backgroundColor = "transparent";
  cancelBtn.style.display = "none";

  // Insertar botones después del edit link
  const headerEdit = document.querySelector(".section-header");
  if (headerEdit)
    headerEdit.appendChild(saveBtn), headerEdit.appendChild(cancelBtn);

  function setFieldsEditable(editable) {
    if (emailInput) emailInput.readOnly = !editable;
    if (phoneInput) phoneInput.readOnly = !editable;
    saveBtn.style.display = editable ? "block" : "none";
    cancelBtn.style.display = editable ? "block" : "none";
  }

  // Cargar perfil y pedidos
  async function loadProfile() {
    try {
      const profile = await API.getMyProfile();
      if (!profile) throw new Error("No se pudo obtener perfil");

      if (emailInput) emailInput.value = profile.email || "";
      if (phoneInput) phoneInput.value = profile.phone || "";

      renderAddresses(profile.addresses || []);
      renderCards(profile.savedCards || []);

      const orders = await API.myOrders();
      renderOrders(orders || []);
    } catch (err) {
      console.error(err);
      alert("Error cargando perfil. Intenta iniciar sesión de nuevo.");
      API.logout();
      window.location.href = "B07-Home.html";
    }
  }

  function renderAddresses(addresses) {
    if (!addressesList) return;
    if (!addresses || addresses.length === 0) {
      addressesList.innerHTML =
        '<p class="empty-state">No tienes direcciones guardadas.</p>';
      return;
    }
    addressesList.innerHTML = addresses
      .map(
        (a) => `
      <div class="address-item" data-id="${a.id}" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;">
        <div>${a.content}</div>
        <div><button class="action-button small" data-action="delete-address" data-id="${a.id}" style="border-width:1px;padding:0.4rem 0.6rem;">Eliminar</button></div>
      </div>
    `
      )
      .join("");

    // bind delete
    addressesList
      .querySelectorAll('button[data-action="delete-address"]')
      .forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = btn.dataset.id;
          if (!confirm("Eliminar dirección?")) return;
          try {
            await API.deleteAddress(id);
            await loadProfile();
          } catch (err) {
            alert("No se pudo eliminar la dirección");
          }
        });
      });
  }

  function renderCards(cards) {
    if (!cardsList) return;
    if (!cards || cards.length === 0) {
      cardsList.innerHTML =
        '<p class="empty-state">AÚN NO HAS GUARDADO NINGUNA TARJETA.</p>';
      return;
    }
    cardsList.innerHTML = cards
      .map(
        (c) => `
      <div class="card-item" data-id="${
        c.id
      }" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;">
        <div>${c.brand || "Tarjeta"} •••• ${c.last4}</div>
        <div><button class="action-button small" data-action="delete-card" data-id="${
          c.id
        }" style="border-width:1px;padding:0.4rem 0.6rem;">Eliminar</button></div>
      </div>
    `
      )
      .join("");

    cardsList
      .querySelectorAll('button[data-action="delete-card"]')
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          if (!confirm("Eliminar tarjeta?")) return;
          try {
            await API.deleteCard(id);
            await loadProfile();
          } catch (err) {
            alert("No se pudo eliminar la tarjeta");
          }
        });
      });
  }

  function renderOrders(orders) {
    if (!ordersContainer) return;
    if (!orders || orders.length === 0) {
      ordersContainer.innerHTML =
        '<p class="empty-state">No tienes órdenes recientes.</p>';
      return;
    }
    ordersContainer.innerHTML = orders
      .map(
        (o) => `
      <div class="order-item">
        <div>
          <p class="order-id">Pedido #${o.id} - ${new Date(
          o.createdAt
        ).toLocaleDateString()}</p>
          <p class="order-total">Total: ${o.total}</p>
        </div>
        <span class="order-status ${
          o.status === "delivered" ? "status-entregado" : "status-enviado"
        }">${o.status}</span>
      </div>
    `
      )
      .join("");
  }

  // Eventos
  // Editar datos
  if (headerEdit) {
    const editLink = headerEdit.querySelector("a");
    if (editLink) {
      editLink.dataset.action = "edit";
      editLink.addEventListener("click", (e) => {
        e.preventDefault();
        setFieldsEditable(true);
      });
    }
  }

  saveBtn.addEventListener("click", async () => {
    try {
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      await API.updateProfile(email, phone);
      alert("Perfil actualizado");
      setFieldsEditable(false);
      await loadProfile();
    } catch (err) {
      alert("No se pudo guardar perfil");
    }
  });

  cancelBtn.addEventListener("click", () => {
    setFieldsEditable(false);
    loadProfile();
  });

  // Agregar dirección
  addAddressBtn.addEventListener("click", async () => {
    const content = prompt(
      "Ingresa la nueva dirección (Calle, Número, Comuna):"
    );
    if (!content) return;
    try {
      await API.addAddress(content);
      await loadProfile();
    } catch (err) {
      alert("No se pudo agregar la dirección");
    }
  });

  // Agregar tarjeta (simple token simulado)
  addCardBtn.addEventListener("click", async () => {
    const cardNumber = prompt("Número de tarjeta (sin espacios):");
    if (!cardNumber) return;
    const clean = cardNumber.replace(/\s/g, "");
    if (clean.length < 12) return alert("Número inválido");
    const last4 = clean.slice(-4);
    const brand = /^4/.test(clean)
      ? "Visa"
      : /^5[1-5]/.test(clean)
      ? "Mastercard"
      : "Tarjeta";
    const token = `card_${Date.now()}`;
    try {
      await API.saveCard(token, last4, brand);
      await loadProfile();
    } catch (err) {
      alert("No se pudo guardar la tarjeta");
    }
  });

  // Inicializar
  await loadProfile();
});
