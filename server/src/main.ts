import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { authMiddleware, errorHandler, notFoundHandler } from './middleware/auth.js';
import { errorHandler as errorHandlerMiddleware } from './middleware/errorHandler.js';
import { runMigrations } from './database/migrate.js';

import auctionRoutes from './routes/auction.js';
import captainRoutes from './routes/captain.js';
import healthRoutes from './routes/health.js';

import { setupBidSocket } from './sockets/bidSocket.js';
import { setupAuctionSocket } from './sockets/auctionSocket.js';
import { setupSessionSocket } from './sockets/sessionSocket.js';
import { setupChatSocket } from './sockets/chatSocket.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/captain', captainRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandlerMiddleware);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  setupSessionSocket(io, socket);
  setupBidSocket(io, socket);
  setupAuctionSocket(io, socket);
  setupChatSocket(io, socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const port = config.port;

// Run migrations then start listening
runMigrations()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📡 Socket.io listening on ws://localhost:${port}`);
      console.log(`✅ Environment: ${config.nodeEnv}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to run migrations, aborting startup:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
