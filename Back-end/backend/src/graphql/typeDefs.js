const gql = require("graphql-tag");

const typeDefs = gql`
  type Address {
    id: ID!
    content: String!
  }

  type Card {
    id: ID!
    last4: String!
    brand: String
    token: String!
  }

  type User {
    id: ID!
    email: String!
    role: String!
    name: String
    phone: String
    addresses: [Address]
    savedCards: [Card]
  }

  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    image: String
    category: String
    stock: Int
    isAvailable: Boolean
    averageRating: Float
  }

  type OrderItem {
    product: Product
    quantity: Int
    priceAtPurchase: Float
  }

  type Order {
    id: ID!
    user: User!
    items: [OrderItem]
    subtotal: Float
    discountTotal: Float
    total: Float!
    status: String!
    deliveryMethod: String
    createdAt: String
  }

  type Coupon {
    code: String!
    discountPercentage: Int!
  }

  type Review {
    id: ID!
    product: Product!
    user: User!
    rating: Int!
    comment: String
    status: String!
    createdAt: String
  }

  type BestSellerStat {
    productName: String!
    totalUnits: Int
    totalRevenue: Float
  }

  type SalesReportItem {
    date: String
    orderId: String
    total: Float
    status: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type MessageResponse {
    success: Boolean!
    message: String!
  }

  type Query {
    hello: String
    getProducts(
      page: Int
      limit: Int
      category: String
      search: String
    ): [Product]
    getProduct(id: ID!): Product
    myProfile: User
    myOrders(page: Int, limit: Int): [Order]
    validateCoupon(code: String!): Coupon

    # Admin
    getBestSellers(limit: Int, sortBy: String): [BestSellerStat]
    getSalesReport(startDate: String, endDate: String): [SalesReportItem]
    getPendingReviews: [Review]
    getProductReviews(productId: ID!): [Review]
  }

  input CartItemInput {
    productId: ID!
    quantity: Int!
  }

  input ProductInput {
    name: String!
    description: String
    price: Float!
    category: String
    image: String
    stock: Int
  }

  type Mutation {
    register(email: String!, password: String!): AuthPayload
    login(email: String!, password: String!): AuthPayload
    requestPasswordReset(email: String!): MessageResponse
    resetPassword(token: String!, newPassword: String!): MessageResponse

    createProduct(
      name: String!
      description: String
      price: Float!
      category: String
      image: String
      stock: Int
    ): Product
    
    updateProduct(id: ID!, input: ProductInput!): Product
    
    # --- NUEVO: Función para borrar productos ---
    deleteProduct(id: ID!): MessageResponse
    
    bulkCreateProducts(products: [ProductInput]!): MessageResponse

    updateProfile(name: String, phone: String): User
    addAddress(content: String!): User
    deleteAddress(addressId: ID!): User
    saveCard(token: String!, last4: String!, brand: String): User
    deleteCard(cardId: ID!): User
    createCoupon(
      code: String!
      discountPercentage: Int!
      daysValid: Int!
    ): Coupon

    placeOrder(
      items: [CartItemInput]!
      couponCode: String
      deliveryMethod: String!
      address: String
      paymentToken: String
      saveCard: Boolean
    ): Order

    createReview(
      productId: ID!
      rating: Int!
      comment: String
      captchaToken: String
    ): MessageResponse
    approveReview(reviewId: ID!): Review
    rejectReview(reviewId: ID!): Review

    cleanAbandonedCarts: MessageResponse

    updateOrderStatus(orderId: ID!, status: String!): Order
    cancelOrder(orderId: ID!): Order
  }
`;

module.exports = typeDefs;
