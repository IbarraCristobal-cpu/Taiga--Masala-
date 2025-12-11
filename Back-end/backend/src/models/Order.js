const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtPurchase: {
    // Guardamos el precio al momento de comprar
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [orderItemSchema], // Array de productos con cantidad

  // Datos económicos
  subtotal: Number,
  discountTotal: { type: Number, default: 0 },
  deliveryCost: { type: Number, default: 0 },
  total: { type: Number, required: true },

  // Detalles de Entrega (Gherkin B-12)
  deliveryMethod: {
    type: String,
    enum: ["pickup", "delivery"], // Servir en mesa/retiro vs Delivery
    default: "pickup",
  },
  shippingAddress: String, // Solo si es delivery

  // Detalles de Pago
  paymentMethod: {
    type: String,
    enum: ["card", "cash"],
    default: "card",
  },

  status: {
    type: String,
    enum: ["Preparando", "Enviado", "Entregado", "Cancelado"],
    default: "Preparando",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
