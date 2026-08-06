/**
 * Cyber Snake Multiplayer Backend Preparation
 * Simple Express & WebSocket Server architecture blueprint.
 * Run in production using: npm install express ws
 */
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static gameplay client files from root
app.use(express.static(path.join(__dirname, '../')));

// Multiplayer Lobby state
const rooms = {}; // Maps roomID -> { players: { wsClientId: playerState }, foods: [] }

function uuid() {
  return Math.random().toString(36).substring(2, 9);
}

// Websocket sync loops
wss.on('connection', (ws) => {
  ws.clientId = uuid();
  ws.roomId = null;
  console.log(`[LOBBY] Client linked: ${ws.clientId}`);
  
  // Send connection welcome handshake
  ws.send(JSON.stringify({
    type: 'INIT',
    clientId: ws.clientId
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'JOIN_ROOM':
          handleJoinRoom(ws, data);
          break;
          
        case 'UPDATE_POSITION':
          handlePositionUpdate(ws, data);
          break;
          
        case 'FOOD_COLLECTED':
          handleFoodCollected(ws, data);
          break;
          
        case 'COLLISION':
          handlePlayerCrash(ws, data);
          break;
      }
    } catch(e) {
      console.error("[ERROR] Failed parsing WS message packet:", e);
    }
  });

  ws.on('close', () => {
    console.log(`[LOBBY] Client closed link: ${ws.clientId}`);
    handleClientDisconnect(ws);
  });
});

function handleJoinRoom(ws, data) {
  // Simple matchmaking: join first room that has less than 4 players, or create one
  let targetRoomId = null;
  
  for (let id in rooms) {
    if (Object.keys(rooms[id].players).length < 4) {
      targetRoomId = id;
      break;
    }
  }
  
  if (!targetRoomId) {
    targetRoomId = `ROOM_${uuid()}`;
    rooms[targetRoomId] = {
      players: {},
      foods: [{ gx: 10, gy: 10, type: 'normal' }, { gx: 15, gy: 15, type: 'golden' }]
    };
    console.log(`[ROOM] Created new arena space: ${targetRoomId}`);
  }
  
  ws.roomId = targetRoomId;
  rooms[targetRoomId].players[ws.clientId] = {
    x: 100,
    y: 100,
    angle: 0,
    skin: data.skin || 'cyber',
    score: 0,
    segments: []
  };
  
  console.log(`[ROOM] Client ${ws.clientId} joined room ${targetRoomId}`);
  
  // Sync room initialization state back to player
  ws.send(JSON.stringify({
    type: 'ROOM_JOINED',
    roomId: targetRoomId,
    players: rooms[targetRoomId].players,
    foods: rooms[targetRoomId].foods
  }));
  
  // Notify other players in room
  broadcastToRoom(targetRoomId, ws.clientId, {
    type: 'PLAYER_CONNECTED',
    clientId: ws.clientId,
    playerState: rooms[targetRoomId].players[ws.clientId]
  });
}

function handlePositionUpdate(ws, data) {
  const rId = ws.roomId;
  if (!rId || !rooms[rId]) return;
  
  const player = rooms[rId].players[ws.clientId];
  if (!player) return;
  
  // Update state coordinates
  player.x = data.x;
  player.y = data.y;
  player.angle = data.angle;
  player.segments = data.segments;
  player.score = data.score;
  
  // Broadcast updates coordinates back to other room clients (minimizing bandwidth)
  broadcastToRoom(rId, ws.clientId, {
    type: 'PLAYER_MOVED',
    clientId: ws.clientId,
    x: player.x,
    y: player.y,
    angle: player.angle,
    segments: player.segments,
    score: player.score
  });
}

function handleFoodCollected(ws, data) {
  const rId = ws.roomId;
  if (!rId || !rooms[rId]) return;
  
  const room = rooms[rId];
  // Remove existing collected food
  room.foods = room.foods.filter(f => !(f.gx === data.gx && f.gy === data.gy));
  
  // Spawn new food coords on server side to synchronize grids
  const newFood = {
    gx: Math.floor(Math.random() * 24),
    gy: Math.floor(Math.random() * 24),
    type: Math.random() > 0.8 ? 'golden' : 'normal'
  };
  room.foods.push(newFood);
  
  // Broadcast food replacement update to all players in the room
  broadcastToRoom(rId, null, {
    type: 'FOOD_UPDATED',
    collectedGX: data.gx,
    collectedGY: data.gy,
    newFood: newFood
  });
}

function handlePlayerCrash(ws, data) {
  const rId = ws.roomId;
  if (!rId || !rooms[rId]) return;
  
  console.log(`[ROOM] Player ${ws.clientId} crashed: ${data.reason}`);
  
  broadcastToRoom(rId, ws.clientId, {
    type: 'PLAYER_CRASHED',
    clientId: ws.clientId,
    reason: data.reason
  });
}

function handleClientDisconnect(ws) {
  const rId = ws.roomId;
  if (!rId || !rooms[rId]) return;
  
  delete rooms[rId].players[ws.clientId];
  
  // Notify others
  broadcastToRoom(rId, ws.clientId, {
    type: 'PLAYER_DISCONNECTED',
    clientId: ws.clientId
  });
  
  // Clean empty rooms
  if (Object.keys(rooms[rId].players).length === 0) {
    delete rooms[rId];
    console.log(`[ROOM] Cleaned empty arena: ${rId}`);
  }
}

function broadcastToRoom(roomId, senderClientId, payload) {
  if (!rooms[roomId]) return;
  
  const wssClients = Array.from(wss.clients);
  wssClients.forEach(client => {
    if (client.roomId === roomId && client.clientId !== senderClientId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

server.listen(PORT, () => {
  console.log(`[SERVER] Cyber Snake Multiplayer listening on port: ${PORT}`);
});
