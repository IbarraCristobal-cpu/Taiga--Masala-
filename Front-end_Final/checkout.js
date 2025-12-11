/**
 * ==================== CHECKOUT.JS ====================
 * Script separado para la lógica de checkout
 * Maneja: carga de perfil, validación, procesamiento de órdenes
 */

document.addEventListener("DOMContentLoaded", async () => {
  // ==================== ELEMENTOS DEL DOM ====================
  const checkoutForm = document.getElementById("checkout-form");
  const deliveryTypeRadios = document.querySelectorAll(
    'input[name="deliveryType"]'
  );
  const addressSection = document.getElementById("address-section");
  const savedAddressSelect = document.getElementById("saved-address-select");
  const savedCardsSelect = document.getElementById("saved-cards-select");
  const saveCardCheckbox = document.getElementById("save-card-checkbox");
  const cardNumberInput = document.getElementById("card-number");
  const cardExpiryInput = document.getElementById("card-expiry");
  const cardCvvInput = document.getElementById("card-cvv");

  // ==================== VARIABLES DE ESTADO ====================
  let userProfile = null;
  let savedCards = [];
  let savedAddresses = [];

  // ==================== FUNCIONES PRINCIPALES ====================

  /**
   * Carga el perfil del usuario desde el backend
   * Extrae tarjetas guardadas y direcciones
   */
  async function loadUserProfile() {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Necesitas iniciar sesión para continuar");
        window.location.href = "B07-Home.html";
        return;
      }

      userProfile = await API.getMyProfile();
      if (!userProfile) throw new Error("No se pudo cargar el perfil");

      savedCards = userProfile.savedCards || [];
      savedAddresses = userProfile.addresses || [];

      updateDropdowns();
      console.log("Perfil del usuario cargado:", userProfile);
    } catch (error) {
      console.error("Error cargando perfil:", error);
      alert("Error cargando datos. Intenta nuevamente.");
    }
  }

  /**
   * Renderiza las tarjetas guardadas en el dropdown
   */
  function renderSavedCardsDropdown() {
    savedCardsSelect.innerHTML =
      '<option value="">-- Seleccione una tarjeta guardada --</option>';
    savedCards.forEach((card) => {
      const option = document.createElement("option");
      option.value = card.id;
      option.textContent = `${card.brand || "Tarjeta"} terminada en ${
        card.last4
      }`;
      savedCardsSelect.appendChild(option);
    });
  }

  /**
   * Renderiza las direcciones guardadas en el dropdown
   */
  function renderSavedAddressesDropdown() {
    savedAddressSelect.innerHTML =
      '<option value="">-- Seleccione una dirección guardada --</option>';
    savedAddresses.forEach((address) => {
      const option = document.createElement("option");
      option.value = address.id;
      option.textContent = address.content;
      savedAddressSelect.appendChild(option);
    });
  }

  /**
   * Actualiza ambos dropdowns (tarjetas y direcciones)
   */
  function updateDropdowns() {
    renderSavedCardsDropdown();
    renderSavedAddressesDropdown();
  }

  /**
   * Valida y obtiene la dirección de envío
   * Si delivery=true, requiere dirección guardada o nueva
   */
  function getDeliveryAddress(deliveryType) {
    if (deliveryType !== "delivery") return null;

    const selectedAddressId = savedAddressSelect.value;
    const newStreet =
      document.getElementById("new-address-street")?.value?.trim() || "";
    const newCity =
      document.getElementById("new-address-city")?.value?.trim() || "";

    if (selectedAddressId) {
      const selectedAddr = savedAddresses.find(
        (a) => a.id === selectedAddressId
      );
      return selectedAddr?.content || null;
    } else if (newStreet && newCity) {
      const details =
        document.getElementById("new-address-details")?.value?.trim() || "";
      return details
        ? `${newStreet}, ${details}, ${newCity}`
        : `${newStreet}, ${newCity}`;
    }

    throw new Error(
      "Por favor, selecciona o ingresa una dirección de envío válida"
    );
  }

  /**
   * Valida y obtiene el token de pago
   * Si hay tarjeta guardada, la usa; sino, valida datos nuevos
   */
  function getPaymentToken() {
    const selectedCardId = savedCardsSelect.value;

    if (selectedCardId) {
      const selectedCard = savedCards.find((c) => c.id === selectedCardId);
      return selectedCard?.token || selectedCardId;
    }

    const newCardNumber = cardNumberInput.value.replace(/\s/g, "");
    const cardExpiry = cardExpiryInput?.value;
    const cardCvv = cardCvvInput?.value;

    if (newCardNumber.length < 16)
      throw new Error("Número de tarjeta inválido (mínimo 16 dígitos)");
    if (!cardExpiry || cardExpiry.length < 5)
      throw new Error("Fecha de expiración inválida (formato MM/AA)");
    if (!cardCvv || cardCvv.length < 3)
      throw new Error("CVV inválido (3-4 dígitos)");

    return `card_${Date.now()}`;
  }

  /**
   * Extrae información de tarjeta para guardarla
   */
  function extractCardInfo() {
    const newCardNumber = cardNumberInput.value.replace(/\s/g, "");
    const last4 = newCardNumber.slice(-4);
    const brand = detectCardBrand(newCardNumber) || "Tarjeta";
    return { last4, brand };
  }

  /**
   * Detecta el tipo de tarjeta basado en el número
   */
  function detectCardBrand(cardNumber) {
    if (/^4/.test(cardNumber)) return "Visa";
    if (/^5[1-5]/.test(cardNumber)) return "Mastercard";
    if (/^3[47]/.test(cardNumber)) return "American Express";
    if (/^36/.test(cardNumber)) return "Diners Club";
    return "Tarjeta";
  }

  /**
   * Actualiza el estado del botón submit
   */
  function setSubmitButtonState(disabled, text = "Finalizar Compra") {
    const btn = checkoutForm.querySelector("button[type='submit']");
    btn.disabled = disabled;
    btn.textContent = text;
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Muestra/oculta sección de dirección según tipo de entrega
   */
  deliveryTypeRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      if (event.target.value === "delivery") {
        addressSection.classList.remove("hidden");
      } else {
        addressSection.classList.add("hidden");
      }
    });
  });

  /**
   * Auto-formatea número de tarjeta: XXXX XXXX XXXX XXXX
   */
  cardNumberInput.addEventListener("input", (e) => {
    const value = e.target.value.replace(/\D/g, "");
    const groups = value.match(/.{1,4}/g) || [];
    e.target.value = groups.join(" ").slice(0, 19);
  });

  /**
   * Auto-formatea expiración: MM/AA
   */
  cardExpiryInput?.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    e.target.value = value.slice(0, 5);
  });

  /**
   * Valida solo dígitos para CVV
   */
  cardCvvInput?.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
  });

  /**
   * Procesa el envío del formulario de checkout
   */
  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      // 1. Validar autenticación
      if (!localStorage.getItem("authToken")) {
        throw new Error("Necesitas iniciar sesión para completar la compra");
      }

      // 2. Obtener carrito
      const cartItems = JSON.parse(localStorage.getItem("cart") || "[]");
      if (cartItems.length === 0) {
        throw new Error("Tu carrito está vacío");
      }

      // 3. Obtener datos del formulario
      const deliveryType = document.querySelector(
        'input[name="deliveryType"]:checked'
      ).value;
      const address = getDeliveryAddress(deliveryType);
      const paymentToken = getPaymentToken();
      const couponCode = localStorage.getItem("appliedCoupon") || null;
      const selectedCardId = savedCardsSelect.value;

      // 4. Mostrar estado "procesando"
      setSubmitButtonState(true, "Procesando...");

      // 5. Crear orden en el backend
      const order = await API.placeOrder(
        cartItems,
        couponCode,
        deliveryType,
        address,
        paymentToken,
        saveCardCheckbox.checked
      );

      if (!order || !order.id) {
        throw new Error("Error: No se pudo crear la orden");
      }

      console.log("Orden creada:", order);

      // 6. Guardar tarjeta si se solicita
      if (saveCardCheckbox.checked && !selectedCardId) {
        try {
          const { last4, brand } = extractCardInfo();
          await API.saveCard(paymentToken, last4, brand);
          console.log("Tarjeta guardada en el perfil");
        } catch (e) {
          console.warn("Aviso: No se pudo guardar la tarjeta:", e);
        }
      }

      // 7. Limpiar estado local
      localStorage.removeItem("cart");
      localStorage.removeItem("appliedCoupon");

      // 8. Mostrar confirmación y redirigir
      alert(`✅ ¡Compra exitosa!\nNúmero de orden: ${order.id}`);
      window.location.href = "B08_B09-Perfil_de_usuario.html";
    } catch (error) {
      console.error("Error en checkout:", error);
      alert(`❌ Error al procesar la compra:\n${error.message}`);
      setSubmitButtonState(false, "Finalizar Compra");
    }
  });

  // ==================== INICIALIZACIÓN ====================
  await loadUserProfile();
});
