const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true, // "VERANO2025"
    trim: true
  },
  discountPercentage: {
    type: Number,
    required: true, // Ej: 10 para 10%
    min: 1,
    max: 100
  },
  expirationDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Coupon', couponSchema);