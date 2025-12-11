/*
  api.js - Backend Simulado Local (localStorage)
  Este archivo contiene toda la lógica de datos y autenticación.
*/

const API = {
  // --- UTILIDAD: Simulación de espera (Network Delay) ---
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // --- DATOS INICIALES (Seed Data) ---
  initialProducts: [
    {
      id: 1,
      name: "Samosa",
      price: 8400,
      stock: 50,
      description: "Empanadillas de fina masa rellenas de papas y verduras.",
      category: "Entradas",
      image: "images/Entradas/4.jpg",
    },
    {
      id: 2,
      name: "Jheenga Koliwada",
      price: 13000,
      stock: 40,
      description: "Camarones ecuatorianos apanados y marinados en masala.",
      category: "Entradas",
      image: "images/Entradas/2.jpg",
    },
    {
      id: 3,
      name: "Chana Pindi Batura",
      price: 14400,
      stock: 30,
      description: "Garbanzos en masala servidos en salsa de cebolla.",
      category: "Platos Principales",
      image: "images/Vegetarianos/1.jpg",
    },
    {
      id: 4,
      name: "Murgh Mitha Suthra",
      price: 12500,
      stock: 25,
      description: "Pollo macerado en deliciosa crema de almendras y coco.",
      category: "Platos Principales",
      image: "images/Pollo/3.jpg",
    },
    {
      id: 5,
      name: "Gajjar ka halwa",
      price: 5000,
      stock: 20,
      description: "Suave postre de zanahorias con almendras.",
      category: "Postres",
      image: "images/Postres/1.jpg",
    },
    {
      id: 6,
      name: "Masala Chai",
      price: 4500,
      stock: 100,
      description: "Té negro de alta calidad con especias aromáticas.",
      category: "Jugos",
      image: "images/JugosNaturales/Masala_Chai.jpg",
    },
  ],

  // ============================
  // GESTIÓN DE PRODUCTOS (CRUD)
  // ============================

  // 1. LEER TODOS (Read)
  async getProducts() {
    await this.delay(300);
    const stored = localStorage.getItem("malasa_products");

    if (!stored) {
      localStorage.setItem(
        "malasa_products",
        JSON.stringify(this.initialProducts)
      );
      return this.initialProducts;
    }
    return JSON.parse(stored);
  },

  // 2. LEER UNO POR ID (Read One)
  async getProductById(id) {
    await this.delay(200);
    const products = await this.getProducts();
    return products.find((p) => p.id === parseInt(id));
  },

  // 3. CREAR (Create)
  async createProduct(productData) {
    await this.delay(500);
    const products = await this.getProducts();

    // Generar ID automático
    const newId =
      products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;

    const newProduct = { id: newId, ...productData };
    products.push(newProduct);

    localStorage.setItem("malasa_products", JSON.stringify(products));
    return newProduct;
  },

  // 4. ACTUALIZAR (Update)
  async updateProduct(id, productData) {
    await this.delay(400);
    const products = await this.getProducts();
    const index = products.findIndex((p) => p.id === parseInt(id));

    if (index === -1) throw new Error("Producto no encontrado");

    // Mantener ID original
    products[index] = { ...products[index], ...productData, id: parseInt(id) };

    localStorage.setItem("malasa_products", JSON.stringify(products));
    return products[index];
  },

  // 5. BORRAR (Delete)
  async deleteProduct(id) {
    await this.delay(300);
    let products = await this.getProducts();
    const initialLength = products.length;

    products = products.filter((p) => p.id !== parseInt(id));

    if (products.length === initialLength)
      throw new Error("Producto no encontrado");

    localStorage.setItem("malasa_products", JSON.stringify(products));
    return true;
  },

  // ============================
  // AUTENTICACIÓN (LOGIN & REGISTRO)
  // ============================

  // 1. LOGIN
  async login(email, password) {
    await this.delay(300);

    // Intentar primero usar backend GraphQL si está disponible
    const backend = window.BACKEND_URL || "http://localhost:4000/";
    const query = `mutation Login($email:String!, $password:String!){ login(email:$email,password:$password){ token user{ id email name role } } }`;
    try {
      const res = await fetch(backend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { email, password } }),
      });
      if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
      const json = await res.json();
      if (json.errors)
        throw new Error(json.errors[0].message || "Error en login");
      const payload = json.data && json.data.login;
      if (!payload) throw new Error("Respuesta inválida del servidor");
      // Guardar estado básico en localStorage para UI
      if (payload.token) localStorage.setItem("authToken", payload.token);
      if (payload.user) {
        localStorage.setItem("userRole", payload.user.role || "customer");
        try {
          localStorage.setItem("userData", JSON.stringify(payload.user));
        } catch (e) {}
        localStorage.setItem(
          "userName",
          payload.user.name || payload.user.email
        );
      }
      return { token: payload.token, ...payload.user };
    } catch (err) {
      // No fallback: propagar error para que la UI muestre el mensaje
      console.error("Login error (forcing backend):", err);
      throw err;
    }
  },

  // 2. REGISTRO
  async register(name, email, password) {
    await this.delay(300);
    const backend = window.BACKEND_URL || "http://localhost:4000/";
    const query = `mutation Register($email:String!, $password:String!){ register(email:$email,password:$password){ token user{ id email name role } } }`;
    try {
      const res = await fetch(backend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { email, password } }),
      });
      if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
      const json = await res.json();
      if (json.errors)
        throw new Error(json.errors[0].message || "Error en registro");
      const payload = json.data && json.data.register;
      if (!payload) throw new Error("Respuesta inválida del servidor");
      if (payload.token) localStorage.setItem("authToken", payload.token);
      if (payload.user) {
        localStorage.setItem("userRole", payload.user.role || "customer");
        try {
          localStorage.setItem("userData", JSON.stringify(payload.user));
        } catch (e) {}
        localStorage.setItem(
          "userName",
          payload.user.name || payload.user.email
        );
      }
      return {
        success: true,
        message: "Usuario registrado correctamente",
        user: payload.user,
      };
    } catch (err) {
      console.error("Register error (forcing backend):", err);
      throw err;
    }
  },

  // 3. LOGOUT
  async logout() {
    localStorage.removeItem("userRole");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    // No borramos 'users' ni 'malasa_products' para no perder datos
  },

  // ============================
  // UTILIDADES EXTRAS
  // ============================
  async cleanAbandonedCarts() {
    await this.delay(600);
    localStorage.removeItem("cart");
    return {
      success: true,
      message: "Carritos abandonados eliminados correctamente.",
    };
  },

  async getMyProfile() {
    await this.delay(300);
    const userName = localStorage.getItem("userName") || "Usuario";
    return {
      name: userName,
      email: "usuario@ejemplo.com", // Simulado
      phone: "+569 12345678",
      addresses: [{ id: 101, content: "Av. Providencia 1322, Providencia" }],
    };
  },

  async requestPasswordReset(email) {
    await this.delay(200);
    const backend = window.BACKEND_URL || "http://localhost:4000/";
    const query = `mutation ReqReset($email:String!){ requestPasswordReset(email:$email){ success message } }`;
    try {
      const res = await fetch(backend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { email } }),
      });
      if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
      const json = await res.json();
      if (json.errors)
        throw new Error(json.errors[0].message || "Error requestPasswordReset");
      return json.data.requestPasswordReset || { success: true };
    } catch (err) {
      console.error("requestPasswordReset error:", err);
      throw err;
    }
  },

  async resetPassword(token, newPassword) {
    await this.delay(200);
    const backend = window.BACKEND_URL || "http://localhost:4000/";
    const query = `mutation Reset($token:String!, $newPassword:String!){ resetPassword(token:$token,newPassword:$newPassword){ success message } }`;
    try {
      const res = await fetch(backend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { token, newPassword } }),
      });
      if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
      const json = await res.json();
      if (json.errors)
        throw new Error(json.errors[0].message || "Error resetPassword");
      return json.data.resetPassword || { success: true };
    } catch (err) {
      console.error("resetPassword error:", err);
      throw err;
    }
  },
};

// Exponer API globalmente
window.API = API;
