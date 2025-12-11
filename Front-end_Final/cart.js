/**
 * ==================== CART.JS ====================
 * Script separado para la lógica del carrito de compras
 * Maneja: renderizado, cantidad, descuentos, cálculos
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==================== ELEMENTOS DEL DOM ====================
  const cartListEl = document.getElementById("cart-items-list");
  const emptyMessageEl = document.getElementById("cart-empty-message");
  const summaryActionsEl = document.getElementById("summary-and-actions");
  const subtotalEl = document.getElementById("summary-subtotal");
  const shippingEl = document.getElementById("summary-shipping");
  const totalEl = document.getElementById("summary-total");
  const discountLineEl = document.getElementById("discount-line");
  const discountAmountEl = document.getElementById("summary-discount");
  const discountInput = document.getElementById("discount-code-input");
  const applyDiscountBtn = document.getElementById("apply-discount-btn");
  const invalidCodeModal = document.getElementById("invalid-code-modal");
  const modalOkBtn = document.getElementById("modal-ok-btn");

  // ==================== DATOS DE DESCUENTOS ====================
  // TODO: En producción, estos códigos deberían validarse en el backend
  const discountCodes = {
    VERANO2025: { type: "percentage", value: 10 },
    DESCUENTO20: { type: "percentage", value: 20 },
    PROMO500: { type: "fixed", value: 500 },
  };

  // ==================== ESTADO DEL CARRITO ====================
  let cartItems = [];
  let appliedDiscountCode = null;

  // ==================== FUNCIONES AUXILIARES ====================

  /**
   * Formatea un número como moneda chilena (CLP)
   */
  function formatCurrency(value) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(value || 0);
  }

  /**
   * Carga el carrito desde localStorage y enriquece los items
   * Si el storage contiene objetos { productId, quantity } los convertimos
   * a items en memoria con `id`, `name`, `price`, `image`, `quantity`.
   */
  async function loadCartFromStorage() {
    const stored = localStorage.getItem("cart");
    const raw = stored ? JSON.parse(stored) : [];

    // Soportar dos formatos: { productId, quantity } (desde catálogo)
    // o ya items enriquecidos (id, name, price, ...)
    const normalized = await Promise.all(
      raw.map(async (r) => {
        if (r.productId) {
          try {
            const p = await API.getProductById(r.productId);
            if (!p) return null; // producto eliminado
            return {
              id: p.id,
              productId: p.id,
              name: p.name || "Sin nombre",
              price: p.price || 0,
              image: p.image || null,
              quantity: r.quantity || 1,
            };
          } catch (e) {
            return null;
          }
        }

        // Si ya viene enriquecido, preservar estructura
        if (r.id && (r.name || r.price)) {
          return {
            id: r.id,
            productId: r.productId || r.id,
            name: r.name || "Sin nombre",
            price: r.price || 0,
            image: r.image || null,
            quantity: r.quantity || 1,
          };
        }

        return null;
      })
    );

    // Filtrar nulos (productos no encontrados)
    cartItems = normalized.filter(Boolean);
    return cartItems;
  }

  /**
   * Guarda el carrito en localStorage
   */
  function saveCartToStorage() {
    // Guardar en formato compacto { productId, quantity } para compatibilidad
    const compact = cartItems.map((i) => ({
      productId: i.productId || i.id,
      quantity: i.quantity,
    }));
    localStorage.setItem("cart", JSON.stringify(compact));
  }

  /**
   * Calcula el subtotal del carrito
   */
  function calculateSubtotal() {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Calcula el monto de descuento basado en código
   */
  function calculateDiscount(subtotal) {
    if (!appliedDiscountCode || !discountCodes[appliedDiscountCode]) {
      return 0;
    }

    const code = discountCodes[appliedDiscountCode];
    if (code.type === "percentage") {
      return subtotal * (code.value / 100);
    } else if (code.type === "fixed") {
      return Math.min(code.value, subtotal);
    }
    return 0;
  }

  /**
   * Renderiza todos los items del carrito
   */
  async function renderCart() {
    // Recargar desde storage
    await loadCartFromStorage();

    // Limpiar lista anterior
    cartListEl.innerHTML = "";

    // Mostrar/ocultar mensaje vacío
    if (cartItems.length === 0) {
      emptyMessageEl.style.display = "block";
      summaryActionsEl.style.display = "none";
      cartListEl.style.display = "none";
      subtotalEl.textContent = formatCurrency(0);
      totalEl.textContent = formatCurrency(0);
      return;
    } else {
      emptyMessageEl.style.display = "none";
      summaryActionsEl.style.display = "block";
      cartListEl.style.display = "block";
    }

    // Renderizar cada item
    let subtotal = 0;
    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";
      itemEl.innerHTML = `
        <img 
          src="${
            item.image ||
            "https://via.placeholder.com/100x100.png/ccc/ffffff?text=IMG"
          }" 
          alt="${item.name}"
        />
        <div class="item-details">
          <p class="item-name">${item.name}</p>
          <p class="item-price-info">
            ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(
        itemTotal
      )}
          </p>
        </div>
        <div class="item-controls">
          <div class="item-quantity">
            <button class="quantity-btn" data-id="${
              item.id
            }" data-action="decrease">−</button>
            <input type="text" class="quantity-input" value="${
              item.quantity
            }" readonly />
            <button class="quantity-btn" data-id="${
              item.id
            }" data-action="increase">+</button>
          </div>
          <div class="item-remove">
            <button data-id="${
              item.id
            }" data-action="remove" title="Eliminar del carrito">🗑️</button>
          </div>
        </div>
      `;
      cartListEl.appendChild(itemEl);
    });

    // Calcular totales
    const discountAmount = calculateDiscount(subtotal);
    const shipping = 0; // Por ahora, envío gratis
    const total = subtotal - discountAmount + shipping;

    // Actualizar resumen
    subtotalEl.textContent = formatCurrency(subtotal);
    shippingEl.textContent = formatCurrency(shipping);

    if (appliedDiscountCode) {
      discountLineEl.style.display = "flex";
      discountAmountEl.textContent = `- ${formatCurrency(discountAmount)}`;
    } else {
      discountLineEl.style.display = "none";
    }

    totalEl.textContent = formatCurrency(total);

    // Guardar carrito en storage para checkout (compact)
    saveCartToStorage();
  }

  /**
   * Actualiza el estado de un item en el carrito
   */
  async function updateCartItem(itemId, action) {
    const itemIndex = cartItems.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const item = cartItems[itemIndex];

    if (action === "increase") {
      item.quantity++;
    } else if (action === "decrease") {
      if (item.quantity > 1) {
        item.quantity--;
      } else {
        cartItems.splice(itemIndex, 1);
      }
    } else if (action === "remove") {
      cartItems.splice(itemIndex, 1);
    }

    saveCartToStorage();
    await renderCart();
  }

  /**
   * Aplica un código de descuento
   */
  function applyDiscount(code) {
    const trimmedCode = code.trim().toUpperCase();

    if (discountCodes[trimmedCode]) {
      appliedDiscountCode = trimmedCode;
      localStorage.setItem("appliedCoupon", trimmedCode);
      renderCart();
      return true;
    } else {
      appliedDiscountCode = null;
      localStorage.removeItem("appliedCoupon");
      return false;
    }
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Maneja clics en botones de cantidad (+, -, eliminar)
   */
  cartListEl.addEventListener("click", (event) => {
    const target = event.target;
    if (target.tagName !== "BUTTON" || !target.dataset.id) return;

    const itemId = parseInt(target.dataset.id);
    const action = target.dataset.action;

    updateCartItem(itemId, action);
  });

  /**
   * Botón para aplicar descuento
   */
  applyDiscountBtn.addEventListener("click", () => {
    const code = discountInput.value.trim();

    if (!code) {
      alert("Por favor, ingresa un código de descuento");
      return;
    }

    if (applyDiscount(code)) {
      discountInput.value = "";
      discountInput.placeholder = `✓ Código '${code.toUpperCase()}' aplicado`;
    } else {
      invalidCodeModal.classList.add("show");
    }
  });

  /**
   * Permitir aplicar descuento con Enter
   */
  discountInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyDiscountBtn.click();
    }
  });

  /**
   * Cerrar modal de código inválido
   */
  modalOkBtn.addEventListener("click", () => {
    invalidCodeModal.classList.remove("show");
    discountInput.value = "";
  });

  /**
   * Cerrar modal al clickear afuera
   */
  invalidCodeModal.addEventListener("click", (e) => {
    if (e.target === invalidCodeModal) {
      invalidCodeModal.classList.remove("show");
    }
  });

  // ==================== INICIALIZACIÓN ====================

  /**
   * Al cargar la página, renderizar carrito y restaurar descuento
   */
  async function initialize() {
    await loadCartFromStorage();

    // Restaurar código de descuento guardado
    const savedCoupon = localStorage.getItem("appliedCoupon");
    if (savedCoupon && discountCodes[savedCoupon]) {
      appliedDiscountCode = savedCoupon;
    }

    await renderCart();
  }

  initialize();

  // ==================== FUNCIONES GLOBALES PARA OTRAS PÁGINAS ====================
  async function modifyCompactCart(productId, change) {
    const compact = JSON.parse(localStorage.getItem("cart") || "[]");
    const pid = parseInt(productId);
    let found = compact.find(
      (i) => i.productId === pid || parseInt(i.productId) === pid
    );
    if (found) {
      found.quantity = (found.quantity || 0) + change;
      if (found.quantity <= 0) {
        const idx = compact.indexOf(found);
        if (idx !== -1) compact.splice(idx, 1);
      }
    } else if (change > 0) {
      compact.push({ productId: pid, quantity: change });
    }
    localStorage.setItem("cart", JSON.stringify(compact));
    await loadCartFromStorage();
    await renderCart();
  }

  window.addToCart = async function (productId, qty = 1) {
    await modifyCompactCart(productId, qty);
  };

  window.removeFromCart = async function (productId) {
    const compact = JSON.parse(localStorage.getItem("cart") || "[]");
    const pid = parseInt(productId);
    const filtered = compact.filter((i) => parseInt(i.productId) !== pid);
    localStorage.setItem("cart", JSON.stringify(filtered));
    await loadCartFromStorage();
    await renderCart();
  };

  // Compatibilidad: exponer `updateCartItem(productId, change)` global
  window.updateCartItem = async function (productId, change) {
    return await modifyCompactCart(productId, change);
  };

  // Escuchar cambios en localStorage desde otras pestañas/ventanas
  window.addEventListener("storage", async (e) => {
    if (e.key === "cart" || e.key === "appliedCoupon") {
      await loadCartFromStorage();
      await renderCart();
    }
  });
});
