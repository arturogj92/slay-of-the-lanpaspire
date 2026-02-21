// Slay of the Lanpaspire - Main Server
// Stack: Express + Socket.io + SQLite

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { getDb } = require('./db/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3490;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', game: 'Slay of the Lanpaspire', version: '0.1.0' });
});

// API routes
app.use('/api', require('./routes/api'));

// Socket.io for real-time game
io.on('connection', (socket) => {
  console.log(`[WS] Player connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[WS] Player disconnected: ${socket.id}`);
  });
});

// Initialize DB on startup
getDb();
console.log('[DB] Database initialized');

server.listen(PORT, () => {
  console.log(`[SERVER] Slay of the Lanpaspire running on port ${PORT}`);
  console.log(`[SERVER] http://localhost:${PORT}`);
});
