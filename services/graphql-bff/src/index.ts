import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { DataSources } from './datasources';
import { authenticateToken, extractToken } from './utils/auth';

interface Context {
  dataSources: DataSources;
  user: any;
  token?: string;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Initialize data sources
  const dataSources = new DataSources();

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    introspection: true, // Enable GraphQL Playground in production
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
      };
    },
  });

  await server.start();

  // Apply middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<Context> => {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = extractToken(authHeader);
        
        // Authenticate user
        const user = token ? authenticateToken(token) : null;
        
        // Set token in data sources for forwarding to microservices
        if (token) {
          dataSources.setAuthToken(token);
        }

        return {
          dataSources,
          user,
          token,
        };
      },
    })
  );

  // Health check endpoint
  app.get('/.well-known/apollo/server-health', (req, res) => {
    res.status(200).send('OK');
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'GraphQL BFF is running',
      graphql: '/graphql',
      health: '/.well-known/apollo/server-health',
    });
  });

  const PORT = process.env.PORT || 4000;

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  
  console.log(`🚀 GraphQL BFF ready at http://localhost:${PORT}/graphql`);
  console.log(`📊 Health check at http://localhost:${PORT}/.well-known/apollo/server-health`);
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});