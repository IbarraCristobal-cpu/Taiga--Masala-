const mongoose = require('mongoose');

// Sub-esquema para tarjetas (Tokenización simulada)
const cardSchema = new mongoose.Schema({
  last4: { type: String, required: true }, // "4242"
  brand: { type: String, default: 'Visa' },
  token: { type: String, required: true }  // Token seguro del procesador de pagos
});

const addressSchema = new mongoose.Schema({
  content: { type: String, required: true }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin', 'developer', 'delivery'], default: 'customer' },
  name: { type: String, trim: true },
  phone: { type: String, trim: true },
  addresses: [addressSchema],
  
  // NUEVO: Tarjetas Guardadas (Gherkin B-12)
  savedCards: [cardSchema],

  // Seguridad
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
