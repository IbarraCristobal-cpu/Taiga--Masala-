const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  category: {
    type: String,
    enum: ['entrante', 'principal', 'postre', 'bebida'],
    default: 'principal'
  },
  // NUEVO: Control de Inventario (Gherkin B-10)
  stock: {
    type: Number,
    default: 20 // Valor inicial para pruebas
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);