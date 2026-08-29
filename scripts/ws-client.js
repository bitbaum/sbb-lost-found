#!/usr/bin/env node
// Minimal Socket.IO client to observe notification events in dev
// Usage: node scripts/ws-client.js [url]
// Default URL: http://localhost:3003 (or via gateway http://localhost:3000)

const { io } = require('socket.io-client');

const url = process.argv[2] || process.env.WS_URL || 'http://localhost:3003';
const socket = io(url, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('WS connected to', url);
});

for (const ch of ['driver_notification', 'lost_item_created', 'lost_item_status_updated']) {
  socket.on(ch, (evt) => console.log('[evt]', ch, JSON.stringify(evt)));
}

socket.on('disconnect', (reason) => {
  console.log('WS disconnected:', reason);
});
