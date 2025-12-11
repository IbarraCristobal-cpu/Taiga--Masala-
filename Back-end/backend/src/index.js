const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

// 1. Importar la conexión a BD
const connectDB = require("./config/db");

// 2. Cargar variables
dotenv.config();

// 3. Conectar a Base de Datos
connectDB();

const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_desarrollo";

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }) => {
      const token = req.headers.authorization || "";
      if (token) {
        try {
          const cleanToken = token.replace("Bearer ", "");
          const user = jwt.verify(cleanToken, JWT_SECRET);
          return { user };
        } catch (e) {
          // Token inválido/expirado
        }
      }
      return {};
    },
  });

  console.log(`🚀 Servidor listo en: ${url}`);
}

startServer();
