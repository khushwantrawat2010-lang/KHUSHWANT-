/* ========================================
   KHUSHWANT FPS - Multiplayer Server
   Node.js + Express + Socket.io
   ======================================== */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

// CORS & Socket.io Setup
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// ========================================
// GAME STATE MANAGEMENT
// ========================================

let players = {};
let parties = {};
let gameState = {
    maxPlayersPerParty: 6,
    gameStartTime: Date.now(),
};

class Player {
    constructor(id, name, partyCode = null) {
        this.id = id;
        this.name = name;
        this.partyCode = partyCode;
        this.position = { x: 0, y: 2, z: 0 };
        this.rotation = { x: 0, y: 0 };
        this.health = 100;
        this.ammo = 30;
        this.maxAmmo = 120;
        this.kills = 0;
        this.deaths = 0;
        this.joinedAt = Date.now();
    }
}

class Party {
    constructor(code) {
        this.code = code;
        this.members = [];
        this.leader = null;
        this.createdAt = Date.now();
    }

    addMember(playerId) {
        if (this.members.length < gameState.maxPlayersPerParty) {
            this.members.push(playerId);
            if (this.members.length === 1) {
                this.leader = playerId;
            }
            return true;
        }
        return false;
    }

    removeMember(playerId) {
        this.members = this.members.filter(id => id !== playerId);
        if (this.leader === playerId && this.members.length > 0) {
            this.leader = this.members[0];
        }
    }

    isEmpty() {
        return this.members.length === 0;
    }
}

// ========================================
// SOCKET.IO EVENT HANDLERS
// ========================================

io.on('connection', (socket) => {
    console.log(`[${new Date().toLocaleTimeString()}] New client connected: ${socket.id}`);

    // Player join
    socket.on('player_join', (data) => {
        const playerId = socket.id;
        const playerName = data.name || `Player_${playerId.substring(0, 5)}`;
        const partyCode = data.partyCode;

        // Create player
        const player = new Player(playerId, playerName, partyCode);
        players[playerId] = player;

        // Handle party
        if (partyCode) {
            if (!parties[partyCode]) {
                parties[partyCode] = new Party(partyCode);
            }
            parties[partyCode].addMember(playerId);
        }

        // Send player their ID
        socket.emit('player_id', { playerId: playerId });

        // Notify everyone
        socket.broadcast.emit('player_joined', {
            playerId: playerId,
            playerName: playerName,
            position: player.position,
            rotation: player.rotation,
        });

        // Send all existing players to new player
        Object.entries(players).forEach(([id, p]) => {
            if (id !== playerId) {
                socket.emit('player_joined', {
                    playerId: id,
                    playerName: p.name,
                    position: p.position,
                    rotation: p.rotation,
                });
            }
        });

        // Send party members if in party
        if (partyCode && parties[partyCode]) {
            const memberNames = parties[partyCode].members.map(id => players[id]?.name || 'Unknown');
            io.emit('party_members', { code: partyCode, members: memberNames });
        }

        console.log(`${playerName} (${playerId}) joined the game`);
        console.log(`Total players online: ${Object.keys(players).length}`);
    });

    // Player movement
    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;

            // Broadcast to others
            socket.broadcast.emit('player_moved', {
                playerId: socket.id,
                position: data.position,
                rotation: data.rotation,
            });
        }
    });

    // Player fire
    socket.on('fire', (data) => {
        if (players[socket.id]) {
            // Broadcast to all
            socket.broadcast.emit('fire', {
                playerId: socket.id,
                position: data.position,
                direction: data.direction,
                rotation: data.rotation,
            });
        }
    });

    // Player damage
    socket.on('damage', (data) => {
        if (players[data.targetId]) {
            players[data.targetId].health -= data.damage;

            // Notify target
            io.to(data.targetId).emit('damage', {
                damage: data.damage,
                attackerId: socket.id,
            });

            // If dead
            if (players[data.targetId].health <= 0) {
                players[data.targetId].health = 0;
                players[data.targetId].deaths++;
                if (players[socket.id]) {
                    players[socket.id].kills++;
                }

                // Notify all
                io.emit('player_died', {
                    playerId: data.targetId,
                    killedBy: socket.id,
                    killer: players[socket.id]?.name || 'Unknown',
                    victim: players[data.targetId]?.name || 'Unknown',
                });

                // Respawn after delay
                setTimeout(() => {
                    if (players[data.targetId]) {
                        players[data.targetId].health = 100;
                        players[data.targetId].position = {
                            x: (Math.random() - 0.5) * 200,
                            y: 2,
                            z: (Math.random() - 0.5) * 200,
                        };

                        socket.emit('respawn', {
                            position: players[data.targetId].position,
                        });
                    }
                }, 3000);
            }
        }
    });

    // Join party
    socket.on('join_party', (data) => {
        const code = data.code.toUpperCase();
        const playerId = socket.id;

        if (parties[code]) {
            if (parties[code].addMember(playerId)) {
                players[playerId].partyCode = code;

                // Notify party
                const memberNames = parties[code].members.map(id => players[id]?.name || 'Unknown');
                io.to(code).emit('party_members', {
                    code: code,
                    members: memberNames,
                });

                socket.emit('party_joined', { code: code, success: true });
                console.log(`${players[playerId].name} joined party ${code}`);
            } else {
                socket.emit('party_joined', { code: code, success: false, reason: 'Party full' });
            }
        } else {
            socket.emit('party_joined', { code: code, success: false, reason: 'Party not found' });
        }
    });

    // Leave party
    socket.on('leave_party', () => {
        const playerId = socket.id;
        if (players[playerId] && players[playerId].partyCode) {
            const code = players[playerId].partyCode;
            if (parties[code]) {
                parties[code].removeMember(playerId);

                if (parties[code].isEmpty()) {
                    delete parties[code];
                    console.log(`Party ${code} disbanded`);
                }
            }
            players[playerId].partyCode = null;
        }
    });

    // Chat message
    socket.on('chat', (data) => {
        const player = players[socket.id];
        if (player) {
            io.emit('chat_message', {
                playerId: socket.id,
                playerName: player.name,
                message: data.message,
                timestamp: new Date().toLocaleTimeString(),
            });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const player = players[socket.id];
        if (player) {
            console.log(`${player.name} (${socket.id}) disconnected`);
            console.log(`[Stats] Kills: ${player.kills}, Deaths: ${player.deaths}`);

            // Remove from party
            if (player.partyCode && parties[player.partyCode]) {
                parties[player.partyCode].removeMember(socket.id);

                if (parties[player.partyCode].isEmpty()) {
                    delete parties[player.partyCode];
                }
            }

            // Notify others
            socket.broadcast.emit('player_left', { playerId: socket.id });

            // Remove player
            delete players[socket.id];

            console.log(`Total players online: ${Object.keys(players).length}`);
        }
    });

    // Error handling
    socket.on('error', (error) => {
        console.error(`Socket error from ${socket.id}:`, error);
    });
});

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        players: Object.keys(players).length,
        parties: Object.keys(parties).length,
        uptime: Date.now() - gameState.gameStartTime,
    });
});

// Server stats
app.get('/api/stats', (req, res) => {
    const stats = {
        totalPlayers: Object.keys(players).length,
        totalParties: Object.keys(parties).length,
        players: Object.entries(players).map(([id, player]) => ({
            id,
            name: player.name,
            health: player.health,
            kills: player.kills,
            deaths: player.deaths,
            joinedAt: player.joinedAt,
        })),
        parties: Object.entries(parties).map(([code, party]) => ({
            code,
            members: party.members.length,
            leader: players[party.leader]?.name || 'Unknown',
        })),
    };
    res.json(stats);
});

// Serve client
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// ========================================
// SERVER START
// ========================================

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   KHUSHWANT FPS - Game Server Online   ║
╚════════════════════════════════════════╝
    
Server running on http://localhost:${PORT}
WebSocket listening for connections...
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Clean up old disconnected players periodically
setInterval(() => {
    const now = Date.now();
    Object.entries(players).forEach(([id, player]) => {
        // This would need additional tracking in production
    });
}, 60000);

// Broadcast server stats periodically
setInterval(() => {
    io.emit('server_stats', {
        playersOnline: Object.keys(players).length,
        serverTime: new Date().toLocaleTimeString(),
    });
}, 5000);
