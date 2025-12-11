const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const Review = require("../models/Review");
const sendEmail = require("../utils/email");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_desarrollo";

// Helper de seguridad
const checkAdmin = (context) => {
  if (!context.user) throw new Error("No autenticado");
  if (
    context.user.role !== "admin" &&
    context.user.role !== "developer" &&
    !context.user.email.includes("admin")
  ) {
    throw new Error("Acceso denegado: Se requieren permisos de administrador");
  }
};

const resolvers = {
  Query: {
    hello: () => "¡API E-commerce Lista! 🛒",

    async getProducts(_, { page = 1, limit = 50, category, search }) {
      const skip = (page - 1) * limit;
      const filter = { isAvailable: true };

      if (category && category !== "Todos") filter.category = category;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Aumentamos el límite por defecto para que se vea todo el catálogo
      return await Product.find(filter)
        .sort({ createdAt: -1 });
    },

    async getProduct(_, { id }) {
      return await Product.findById(id);
    },

    async getBestSellers(_, { limit = 8, sortBy = "units" }, context) {
      checkAdmin(context);
      const pipeline = [
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalUnits: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: ["$items.quantity", "$items.priceAtPurchase"],
              },
            },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $project: {
            productName: "$productInfo.name",
            totalUnits: 1,
            totalRevenue: 1,
          },
        },
      ];

      const sortStage = {};
      if (sortBy === "revenue") sortStage.totalRevenue = -1;
      else sortStage.totalUnits = -1;

      pipeline.push({ $sort: sortStage });
      pipeline.push({ $limit: limit });

      return await Order.aggregate(pipeline);
    },

    async getSalesReport(_, { startDate, endDate }, context) {
      checkAdmin(context);
      const filter = {};
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(filter).sort({ createdAt: -1 });
      return orders.map((o) => ({
        date: o.createdAt.toISOString(),
        orderId: o.id,
        total: o.total,
        status: o.status,
      }));
    },

    async getPendingReviews(_, __, context) {
      checkAdmin(context);
      return await Review.find({ status: "pending" })
        .populate("product")
        .populate("user");
    },

    async getProductReviews(_, { productId }) {
      return await Review.find({ product: productId, status: "approved" })
        .populate("user")
        .sort({ createdAt: -1 });
    },

    async myProfile(_, __, context) {
      if (!context.user) throw new Error("No autenticado");
      return await User.findById(context.user.id);
    },

    async myOrders(_, { page = 1, limit = 10 }, context) {
      if (!context.user) throw new Error("No autenticado");
      const skip = (page - 1) * limit;
      return await Order.find({ user: context.user.id })
        .populate("items.product")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    },

    async validateCoupon(_, { code }) {
      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true,
      });
      if (!coupon) throw new Error("Cupón inválido");
      if (coupon.expirationDate < Date.now()) throw new Error("Cupón expirado");
      return coupon;
    },
  },

  Mutation: {
    // --- PRODUCTOS ---
    async createProduct(_, args, context) {
      checkAdmin(context); // Solo admin puede crear
      return await new Product({ ...args, isAvailable: true }).save();
    },

    async updateProduct(_, { id, input }, context) {
      checkAdmin(context);
      return await Product.findByIdAndUpdate(id, input, { new: true });
    },

    // --- NUEVO: DELETE PRODUCT ---
    async deleteProduct(_, { id }, context) {
      checkAdmin(context);
      const deleted = await Product.findByIdAndDelete(id);
      if (!deleted) throw new Error("Producto no encontrado");
      return { success: true, message: "Producto eliminado correctamente" };
    },

    async bulkCreateProducts(_, { products }, context) {
      checkAdmin(context);
      await Product.insertMany(products);
      return {
        success: true,
        message: `${products.length} productos cargados`,
      };
    },

    // --- GESTIÓN DE PEDIDOS ---
    async updateOrderStatus(_, { orderId, status }, context) {
      checkAdmin(context);
      const allowedStatus = ["Preparando", "Enviado", "Entregado", "Cancelado"];

      if (!allowedStatus.includes(status)) {
        throw new Error(
          "Estado inválido. Use: Preparando, Enviado, Entregado, Cancelado"
        );
      }

      const order = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true }
      );
      return order;
    },

    async cancelOrder(_, { orderId }, context) {
      if (!context.user) throw new Error("No autenticado");

      const order = await Order.findOne({
        _id: orderId,
        user: context.user.id,
      });
      if (!order) throw new Error("Pedido no encontrado o no te pertenece");

      if (order.status !== "Preparando") {
        throw new Error(
          "No puedes cancelar un pedido que ya fue enviado o entregado"
        );
      }

      // DEVOLVER STOCK
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }

      order.status = "Cancelado";
      await order.save();
      return order;
    },

    // --- LIMPIEZA DE CARRITOS ABANDONADOS ---
    async cleanAbandonedCarts(_, __, context) {
      checkAdmin(context);
      // Aquí eliminamos pedidos en estado 'Preparando' muy antiguos, por ejemplo
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 30);
      const result = await Order.deleteMany({
        $or: [
          { status: "Cancelado" },
          { status: "Preparando", createdAt: { $lt: limitDate } },
        ],
      });
      return {
        success: true,
        message: `Limpieza: ${result.deletedCount} eliminados.`,
      };
    },

    // --- AUTH & USUARIOS ---
    async requestPasswordReset(_, { email }) {
      const user = await User.findOne({ email });
      if (!user) return { success: true, message: "Si el correo existe, recibirás un enlace." };

      const resetToken = crypto.randomBytes(20).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
      await user.save();

      console.log(`\n🔐 PASSWORD RESET REQUESTED`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Reset Token: ${resetToken}`);
      
      return { success: true, message: "Correo enviado (Revisar consola del servidor)." };
    },

    async createReview(_, { productId, rating, comment, captchaToken }, context) {
      if (!context.user) throw new Error("No autenticado");
      const newReview = new Review({
        product: productId,
        user: context.user.id,
        rating,
        comment,
      });
      await newReview.save();
      return { success: true, message: "Reseña enviada." };
    },
    async approveReview(_, { reviewId }, context) {
      checkAdmin(context);
      return await Review.findByIdAndUpdate(reviewId, { status: "approved" }, { new: true });
    },
    async rejectReview(_, { reviewId }, context) {
      checkAdmin(context);
      return await Review.findByIdAndUpdate(reviewId, { status: "rejected" }, { new: true });
    },
    
    async placeOrder(_, { items, couponCode, deliveryMethod, address, paymentToken, saveCard }, context) {
      if (!context.user) throw new Error("Debes iniciar sesión");
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) throw new Error(`Producto no encontrado`);
        if (product.stock < item.quantity) throw new Error(`Stock insuficiente: ${product.name}`);

        subtotal += product.price * item.quantity;
        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          priceAtPurchase: product.price,
        });
      }

      let discountTotal = 0;
      if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
        if (coupon && coupon.expirationDate > Date.now()) {
          discountTotal = (subtotal * coupon.discountPercentage) / 100;
        }
      }

      const total = subtotal - discountTotal;
      const newOrder = new Order({
        user: context.user.id,
        items: orderItems,
        subtotal,
        discountTotal,
        total,
        deliveryMethod,
        shippingAddress: address,
        status: "Preparando",
      });
      await newOrder.save();

      // Descontar Stock
      for (const item of items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      }

      return await Order.findById(newOrder._id).populate("items.product");
    },
    async updateProfile(_, args, ctx) {
      if (!ctx.user) throw new Error("No auth");
      return await User.findByIdAndUpdate(ctx.user.id, args, { new: true });
    },
    async addAddress(_, { content }, ctx) {
      const user = await User.findById(ctx.user.id);
      user.addresses.push({ content });
      await user.save();
      return user;
    },
    async deleteAddress(_, { addressId }, ctx) {
      const user = await User.findById(ctx.user.id);
      user.addresses = user.addresses.filter((a) => a.id != addressId);
      await user.save();
      return user;
    },
    async saveCard(_, args, ctx) {
      const user = await User.findById(ctx.user.id);
      user.savedCards.push(args);
      await user.save();
      return user;
    },
    async deleteCard(_, { cardId }, ctx) {
      const user = await User.findById(ctx.user.id);
      user.savedCards = user.savedCards.filter((c) => c.id != cardId);
      await user.save();
      return user;
    },
    async createCoupon(_, args) {
      const exp = new Date();
      exp.setDate(exp.getDate() + args.daysValid);
      return await new Coupon({ ...args, expirationDate: exp }).save();
    },
    async register(_, args) {
      const exist = await User.findOne({ email: args.email });
      if (exist) throw new Error("Email ocupado");
      const pass = await bcrypt.hash(args.password, 10);
      const u = await new User({ ...args, password: pass, role: "customer" }).save();
      const t = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET);
      return { token: t, user: u };
    },
    async login(_, args) {
      const u = await User.findOne({ email: args.email });
      if (!u || !(await bcrypt.compare(args.password, u.password))) throw new Error("Credenciales malas");
      const t = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET);
      return { token: t, user: u };
    },
    async resetPassword(_, { token, newPassword }) {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) throw new Error("Token inválido.");
      user.password = await bcrypt.hash(newPassword, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return { success: true, message: "Contraseña actualizada." };
    },
  },
};

resolvers.Product = { id: (p) => p._id || p.id };
resolvers.Review = {
  id: (p) => p._id || p.id,
  product: async (p) => await Product.findById(p.product),
  user: async (p) => await User.findById(p.user),
};
resolvers.Order = {
  id: (p) => p._id || p.id,
  user: async (p) => {
    if (p.user && p.user.email) return p.user;
    return await User.findById(p.user);
  },
  items: async (p) => {
    if (p.items && p.items.length && p.items[0].product && !p.items[0].product.name) {
      const pop = [];
      for (let i of p.items) {
        const pr = await Product.findById(i.product);
        pop.push({ ...i.toObject(), product: pr });
      }
      return pop;
    }
    return p.items;
  },
};

module.exports = resolvers;
