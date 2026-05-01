# ⚔️ KHUSHWANT FPS - Cross-Platform Multiplayer Battle Game

> A complete, modern **First-Person Shooter** game built with **Three.js**, **Node.js**, and **Socket.io** that works on both **PC and Mobile** devices with full multiplayer support!

---

## 🎮 Features

### ✅ Complete Implementation
- **3D First-Person Shooter** with Three.js rendering
- **Real-time Multiplayer** using Socket.io (up to 6 players per party)
- **Cross-Platform Support**: PC (Keyboard + Mouse) & Mobile (Touch Controls)
- **Auto Device Detection** - Game adapts automatically
- **Advanced Settings System** with localStorage persistence
- **Party System** with 6-character codes
- **Kill Feed** and Player Statistics
- **Customizable Controls** - Drag & Drop button layout on mobile
- **Complete HUD** with Health, Ammo, FPS, Player Count

### 🎯 Game Systems
- **First-Person Camera** with smooth mouse/touch controls
- **Weapon System** with ammo management & reload
- **Combat System** with health, damage, and death respawn
- **Physics** - Jump, gravity, sprint, crouch mechanics
- **Recoil System** for realistic shooting
- **Kill Notifications** with auto-clearing
- **Player List** with health indicators (Tab key)

### 📱 Mobile Features (Touch Optimized)
- **Virtual Joystick** on left side
- **Swipe Camera** on right side
- **Action Buttons** - Fire, Aim, Reload, Jump, Crouch
- **Customizable Button Layout** - Drag & resize buttons
- **Responsive Design** for all screen sizes

### ⚙️ Settings & Customization
- **Graphics Settings**: Brightness, FOV, Render Distance
- **Audio Settings**: Master, SFX, Music volumes
- **Keybind Customization**: All PC controls remappable
- **Control Customization**: Mobile button positioning
- **Auto-Save** to localStorage

### 🌐 Multiplayer Features
- **Real-Time Sync** - Positions, rotations, shots
- **Friend System** - Party codes for easy joining
- **6 Player Parties** - Play with friends
- **Kill/Death Tracking** - See your stats
- **Player List** - See all online players
- **Chat Ready** - Socket infrastructure ready

---

## 🚀 Quick Start

### Option 1: Play Single File (Simplest)
1. Download `index.html` from the repository
2. Open it directly in your browser
3. Click "Play" to start
4. **Note**: Multiplayer requires backend server (see Option 2)

### Option 2: Full Setup (Multiplayer)

#### Prerequisites
- Node.js (v14+)
- npm or yarn
- Browser with WebGL support

#### Server Setup
```bash
# 1. Navigate to server directory
cd server

# 2. Install dependencies
npm install

# 3. Start the server
npm start
# Server runs on http://localhost:3000
```

#### Client Setup
```bash
# Method A: Open index.html directly in browser
# Just double-click the index.html file

# Method B: Use local server (recommended)
cd client
npx http-server
# Open http://localhost:8080 in browser
```

#### Connect to Game
1. Open http://localhost:3000 in browser
2. Click "Play"
3. Share your **Party Code** with friends (Friends & Party menu)
4. Friends enter code to join your party
5. Start playing!

---

## 🎮 Controls

### PC Controls (Keyboard + Mouse)
```
W              → Move Forward
A              → Move Left
S              → Move Backward
D              → Move Right
Space          → Jump
C              → Crouch
Shift          → Sprint
Left Click     → Fire
Right Click    → Aim / Scope
R              → Reload
Tab            → Toggle Player List
ESC            → Pause Menu
```

### Mobile Controls (Touch)
```
Left Side      → Virtual Joystick (Movement)
Right Side     → Swipe (Camera Look)
FIRE Button    → Shoot
AIM Button     → Aim / Scope
RELOAD Button  → Reload Ammo
JUMP Button    → Jump
CROUCH Button  → Crouch
```

---

## 📁 Project Structure

```
KHUSHWANT-/
│
├── index.html                 # 🎮 SINGLE COMPLETE GAME FILE (All-in-one)
│
├── client/
│   ├── index.html            # Game HTML structure
│   ├── main.js               # Game engine & logic
│   └── style.css             # Styling & UI
│
└── server/
    ├── server.js             # Node.js Socket.io server
    └── package.json          # Dependencies
```

---

## ⚙️ Configuration

### Change Server URL (if hosting remotely)
Edit `index.html` or `client/main.js`:
```javascript
const CONFIG = {
    SERVER_URL: 'http://your-server-ip:3000',  // Change this
    // ... other config
};
```

### Adjust Game Settings
```javascript
const CONFIG = {
    GAME_WIDTH: window.innerWidth,
    GAME_HEIGHT: window.innerHeight,
    PLAYER_SPEED: 0.5,              // Movement speed
    PLAYER_SPRINT_SPEED: 1.0,       // Sprint speed
    JUMP_FORCE: 10,                 // Jump height
    AMMO_PER_MAGAZINE: 30,          // Bullets per clip
    RELOAD_TIME: 2000,              // Reload duration (ms)
    FIRE_RATE: 100,                 // Fire rate (ms between shots)
    PLAYER_MAX_HEALTH: 100,         // Starting health
    DAMAGE_PER_SHOT: 10,            // Damage per bullet
};
```

---

## 🎮 Game Mechanics

### Shooting System
- **Ammo Management**: 30 bullets per magazine, 120 total
- **Reload**: Press R or reload button (2 second animation)
- **Recoil**: Gun moves up and slightly off-center when firing
- **Fire Rate**: 100ms between shots (10 bullets per second)

### Health & Combat
- **Starting Health**: 100 HP
- **Damage**: 10 HP per hit
- **Death**: Auto-respawn after 3 seconds at random location
- **Kill Feed**: See kills with notifications

### Movement
- **Normal Speed**: 0.5 units/frame
- **Sprint Speed**: 1.0 units/frame (double speed)
- **Gravity**: -0.3 units/frame (fall speed)
- **Jump Force**: 10 units upward

### Party System
- **Party Code**: Unique 6-character alphanumeric code
- **Max Size**: 6 players per party
- **Join Method**: Share code, friends enter to join
- **Party Leader**: First person to create party

---

## 📊 Server Stats & Monitoring

### Check Server Status
```bash
# While server is running, open in browser:
http://localhost:3000/health

# Expected response:
{
  "status": "online",
  "players": 2,
  "parties": 1,
  "uptime": 123456
}
```

### View Detailed Stats
```bash
curl http://localhost:3000/api/stats
```

---

## 🎨 UI Features

### Main Menu
- Play Game
- Settings
- Friends & Party

### Settings Menu
- **Controls Tab**: Keybind display, mobile customization
- **Graphics Tab**: Brightness, FOV, Render Distance
- **Audio Tab**: Volume controls (Master, SFX, Music)

### In-Game HUD
- Health Bar (bottom left)
- Ammo Counter (bottom right)
- FPS Counter (top left)
- Player Count (top right)
- Minimap (bottom left)
- Crosshair (center)
- Kill Feed (top right)
- Player List (Tab key)

### Pause Menu
- Resume Game
- Settings
- Leave Game

---

## 🔧 Troubleshooting

### "Cannot connect to server"
1. Make sure Node.js server is running: `npm start` in `/server`
2. Server should output: "Server running on http://localhost:3000"
3. Check firewall isn't blocking port 3000
4. Verify `SERVER_URL` in code is correct

### "Mobile controls not appearing"
1. Game auto-detects mobile devices
2. Open on actual mobile device (not desktop mobile emulation)
3. Or test with user agent: `iPhone` or `Android`

### "Settings not saving"
1. Check browser allows localStorage
2. Disable private/incognito mode
3. Check browser developer console for errors

### "No other players visible"
1. Check internet connection
2. Wait 2-3 seconds for connection
3. Open multiple browser windows to test locally
4. Check server is broadcasting player joins

### "Low FPS / Lag"
1. Lower render distance in Graphics settings
2. Disable browser extensions
3. Close other applications
4. Check internet latency with `ping localhost`

---

## 🚀 Deployment (Production)

### Deploy to Cloud (Example: Heroku)

```bash
# 1. Create Heroku app
heroku create khushwant-fps

# 2. Set environment variable
heroku config:set PORT=3000

# 3. Deploy
git push heroku main

# 4. View logs
heroku logs --tail

# 5. Update client SERVER_URL
# Change to: https://khushwant-fps.herokuapp.com
```

### Deploy Frontend (Example: Vercel/Netlify)

```bash
# For Vercel
vercel --prod

# For Netlify
netlify deploy --prod
```

---

## 📈 Performance Metrics

- **Network**: ~20-50KB/s per player
- **Server Load**: ~5-10MB RAM per 10 players
- **Client Load**: ~50-100MB RAM on browser
- **Ideal Tick Rate**: 60 FPS client-side
- **Server Update Rate**: 20 ticks/second

---

## 🎓 Code Structure

### Game State Management
```javascript
gameState = {
    isPlaying: false,
    isPaused: false,
    playerId: null,
    health: 100,
    ammo: 30,
    position: { x, y, z },
    rotation: { x, y },
    // ... more
}
```

### Input System
```javascript
input = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    fire: false,
    aim: false,
    // ... more
}
```

### Three.js Scene
- Scene with ambient + directional lighting
- Ground plane (500x500 units)
- 4 building obstacles
- Player meshes (body, head, gun)
- Real-time bullet rendering

### Socket.io Events
```javascript
// Client → Server
socket.emit('player_join', { name, partyCode })
socket.emit('player_move', { position, rotation })
socket.emit('fire', { position, direction, rotation })
socket.emit('damage', { targetId, damage })

// Server → Client
socket.on('player_joined', { playerId, name, position })
socket.on('player_moved', { playerId, position, rotation })
socket.on('player_left', { playerId })
socket.on('player_died', { playerId, killedBy })
```

---

## 🐛 Known Issues & Limitations

1. **No Collision Detection** between players/bullets and buildings
2. **No Voice Chat** (can be added)
3. **No Database** (players not persistent after disconnect)
4. **No Authentication** (anyone can join)
5. **Limited Map** (single static map)
6. **No Animations** for reloading/running

---

## 🔮 Future Features

- [ ] Multiple maps
- [ ] Weapon variety (rifles, pistols, grenades)
- [ ] Sound effects & music
- [ ] Player customization (skins, cosmetics)
- [ ] Ranked system
- [ ] Voice chat integration
- [ ] Match-making system
- [ ] Game modes (deathmatch, capture the flag, etc)

---

## 📜 License

MIT License - Feel free to use, modify, and distribute!

---

## 💬 Support

For issues, questions, or suggestions:
1. Check **Troubleshooting** section above
2. Review browser console (F12) for errors
3. Check server logs if running locally
4. Test with different browsers

---

## 👨‍💻 Made with ❤️ by KHUSHWANT

**KHUSHWANT FPS** - Where every shot counts!

```
╔════════════════════════════════════════╗
║   KHUSHWANT FPS - Battle Arena         ║
║   Cross-Platform Multiplayer Shooter   ║
╚════════════════════════════════════════╝
```

---

## 📊 Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend Rendering** | Three.js (WebGL) |
| **UI Framework** | HTML5 + CSS3 |
| **Game Logic** | Vanilla JavaScript |
| **Real-time Sync** | Socket.io |
| **Backend** | Node.js + Express |
| **Database** | In-Memory (Socket.io) |
| **Deployment** | Heroku, Vercel, Netlify |

---

**Enjoy your epic FPS battles! 🎮⚔️**
