/* ========================================
   KHUSHWANT FPS - Complete Game Engine
   ======================================== */

// ========================================
// GLOBAL VARIABLES & CONFIG
// ========================================

const CONFIG = {
    // Network
    SERVER_URL: 'http://localhost:3000',
    
    // Game
    GAME_WIDTH: window.innerWidth,
    GAME_HEIGHT: window.innerHeight,
    
    // Player
    PLAYER_SPEED: 0.5,
    PLAYER_SPRINT_SPEED: 1.0,
    JUMP_FORCE: 10,
    GRAVITY: -0.3,
    CROUCH_HEIGHT: 0.5,
    
    // Weapon
    AMMO_PER_MAGAZINE: 30,
    MAX_AMMO: 120,
    RELOAD_TIME: 2000,
    FIRE_RATE: 100,
    
    // Combat
    PLAYER_MAX_HEALTH: 100,
    DAMAGE_PER_SHOT: 10,
};

let gameState = {
    isPlaying: false,
    isPaused: false,
    isCustomizing: false,
    playerId: null,
    playerName: 'Player_' + Math.floor(Math.random() * 10000),
    health: CONFIG.PLAYER_MAX_HEALTH,
    ammo: CONFIG.AMMO_PER_MAGAZINE,
    maxAmmo: CONFIG.MAX_AMMO,
    kills: 0,
    deaths: 0,
    position: { x: 0, y: 2, z: 0 },
    rotation: { x: 0, y: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    isSprinting: false,
    isCrouching: false,
    isAiming: false,
    isJumping: false,
    isGrounded: true,
    isReloading: false,
    canFire: true,
    partyCode: generatePartyCode(),
    partyMembers: [],
};

let input = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
    sprint: false,
    fire: false,
    aim: false,
    reload: false,
};

let keybinds = {
    moveForward: 'KeyW',
    moveBackward: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    jump: 'Space',
    crouch: 'KeyC',
    sprint: 'ShiftLeft',
    fire: 'Mouse1',
    aim: 'Mouse2',
    reload: 'KeyR',
};

let touchInput = {
    joystick: { x: 0, y: 0 },
    isFiring: false,
    isAiming: false,
    isReloading: false,
    isJumping: false,
    isCrouching: false,
};

let mobileControlLayout = {
    fireBtn: { x: window.innerWidth - 100, y: window.innerHeight - 100 },
    aimBtn: { x: window.innerWidth - 100, y: window.innerHeight - 170 },
    reloadBtn: { x: window.innerWidth - 100, y: window.innerHeight - 240 },
    jumpBtn: { x: window.innerWidth / 2, y: window.innerHeight - 100 },
    crouchBtn: { x: window.innerWidth / 2 + 80, y: window.innerHeight - 100 },
};

// Three.js
let scene, camera, renderer;
let players = {};
let bullets = [];
let projectileCache = [];

// Socket.io
let socket = null;

// Device Detection
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ========================================
// UTILITY FUNCTIONS
// ========================================

function generatePartyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function saveSettingsToLocalStorage() {
    localStorage.setItem('khushwant_keybinds', JSON.stringify(keybinds));
    localStorage.setItem('khushwant_controls_layout', JSON.stringify(mobileControlLayout));
    localStorage.setItem('khushwant_graphics', JSON.stringify({
        brightness: document.getElementById('brightness')?.value || 100,
        fov: document.getElementById('fov')?.value || 75,
        renderDistance: document.getElementById('renderDistance')?.value || 500,
    }));
    localStorage.setItem('khushwant_audio', JSON.stringify({
        masterVolume: document.getElementById('masterVolume')?.value || 80,
        sfxVolume: document.getElementById('sfxVolume')?.value || 80,
        musicVolume: document.getElementById('musicVolume')?.value || 50,
    }));
}

function loadSettingsFromLocalStorage() {
    const savedKeybinds = localStorage.getItem('khushwant_keybinds');
    if (savedKeybinds) {
        keybinds = JSON.parse(savedKeybinds);
    }

    const savedLayout = localStorage.getItem('khushwant_controls_layout');
    if (savedLayout) {
        mobileControlLayout = JSON.parse(savedLayout);
    }
}

function updateHUD() {
    // Health
    const healthPercent = (gameState.health / CONFIG.PLAYER_MAX_HEALTH) * 100;
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');
    if (healthFill) {
        healthFill.style.width = healthPercent + '%';
    }
    if (healthText) {
        healthText.textContent = `${Math.max(0, Math.floor(gameState.health))} / ${CONFIG.PLAYER_MAX_HEALTH}`;
    }

    // Ammo
    const ammoText = document.getElementById('ammoText');
    if (ammoText) {
        ammoText.textContent = `${gameState.ammo} / ${gameState.maxAmmo}`;
    }

    // Player Count
    const playerCountText = document.getElementById('playerCountText');
    if (playerCountText) {
        const count = Object.keys(players).length + 1;
        playerCountText.textContent = `Players: ${count}`;
    }
}

function updatePlayerList() {
    const playerList = document.getElementById('playerList');
    if (!playerList) return;

    playerList.innerHTML = '';

    // Add self
    const selfEntry = document.createElement('div');
    selfEntry.className = 'player-entry self';
    selfEntry.textContent = `${gameState.playerName} (You) - ${gameState.health.toFixed(0)} HP`;
    playerList.appendChild(selfEntry);

    // Add other players
    Object.values(players).forEach(player => {
        const entry = document.createElement('div');
        entry.className = 'player-entry' + (player.health <= 0 ? ' dead' : '');
        entry.textContent = `${player.name} - ${player.health.toFixed(0)} HP`;
        playerList.appendChild(entry);
    });
}

// ========================================
// THREE.JS SETUP
// ========================================

function initializeThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, CONFIG.GAME_WIDTH, 1000);

    // Camera
    camera = new THREE.PerspectiveCamera(75, CONFIG.GAME_WIDTH / CONFIG.GAME_HEIGHT, 0.1, 1000);
    camera.position.set(0, 2, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    renderer.shadowMap.enabled = true;
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -250;
    directionalLight.shadow.camera.right = 250;
    directionalLight.shadow.camera.top = 250;
    directionalLight.shadow.camera.bottom = -250;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add some simple obstacles (boxes)
    createMapGeometry();
}

function createMapGeometry() {
    // Create simple building structures
    const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    // Building 1
    let buildingGeom = new THREE.BoxGeometry(50, 30, 50);
    let building = new THREE.Mesh(buildingGeom, buildingMaterial);
    building.position.set(100, 15, 100);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);

    // Building 2
    building = new THREE.Mesh(buildingGeom, buildingMaterial);
    building.position.set(-100, 15, -100);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);

    // Building 3
    building = new THREE.Mesh(buildingGeom, buildingMaterial);
    building.position.set(100, 15, -100);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);

    // Building 4
    building = new THREE.Mesh(buildingGeom, buildingMaterial);
    building.position.set(-100, 15, 100);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
}

function createPlayerMesh(name, color = 0xff0000) {
    const group = new THREE.Group();

    // Body
    const bodyGeom = new THREE.BoxGeometry(0.5, 1.8, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.9;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeom, headMat);
    head.castShadow = true;
    head.position.y = 2;
    group.add(head);

    // Gun (simple cylinder)
    const gunGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const gun = new THREE.Mesh(gunGeom, gunMat);
    gun.castShadow = true;
    gun.rotation.z = Math.PI / 2;
    gun.position.set(0.3, 1.5, -0.5);
    group.add(gun);

    // Muzzle
    const muzzleGeom = new THREE.SphereGeometry(0.05, 4, 4);
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const muzzle = new THREE.Mesh(muzzleGeom, muzzleMat);
    muzzle.position.set(0.3 + 0.6, 1.5, -0.5);
    group.add(muzzle);

    group.userData = { name: name, originalColor: color };
    return group;
}

// ========================================
// INPUT HANDLING
// ========================================

document.addEventListener('keydown', (e) => {
    if (gameState.isPlaying && !gameState.isPaused) {
        if (e.code === keybinds.moveForward) input.forward = true;
        if (e.code === keybinds.moveBackward) input.backward = true;
        if (e.code === keybinds.moveLeft) input.left = true;
        if (e.code === keybinds.moveRight) input.right = true;
        if (e.code === keybinds.jump) input.jump = true;
        if (e.code === keybinds.crouch) input.crouch = !input.crouch;
        if (e.code === keybinds.sprint) input.sprint = true;
        if (e.code === keybinds.reload) handleReload();
    }

    // Pause with ESC
    if (e.code === 'Escape') {
        togglePauseMenu();
    }

    // Tab for player list
    if (e.code === 'Tab') {
        e.preventDefault();
        togglePlayerList();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === keybinds.moveForward) input.forward = false;
    if (e.code === keybinds.moveBackward) input.backward = false;
    if (e.code === keybinds.moveLeft) input.left = false;
    if (e.code === keybinds.moveRight) input.right = false;
    if (e.code === keybinds.sprint) input.sprint = false;
});

document.addEventListener('mousedown', (e) => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    if (e.button === 0) input.fire = true; // Left click
    if (e.button === 2) input.aim = true; // Right click
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.fire = false;
    if (e.button === 2) input.aim = false;
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

// Mouse movement for camera
document.addEventListener('mousemove', (e) => {
    if (!gameState.isPlaying || gameState.isPaused || !document.pointerLockElement) return;

    const sensitivity = 0.002;
    gameState.rotation.y -= e.movementX * sensitivity;
    gameState.rotation.x -= e.movementY * sensitivity;

    // Clamp vertical rotation
    gameState.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.rotation.x));
});

// Request pointer lock on click
document.addEventListener('click', () => {
    if (gameState.isPlaying && !gameState.isPaused) {
        document.getElementById('gameContainer').requestPointerLock();
    }
});

// ========================================
// MOBILE TOUCH CONTROLS
// ========================================

function setupMobileControls() {
    if (!isMobile) return;

    const mobileControls = document.getElementById('mobileControls');
    mobileControls.style.display = 'flex';

    // Joystick
    const joystickContainer = document.getElementById('joystickContainer');
    let joystickActive = false;

    joystickContainer.addEventListener('touchstart', (e) => {
        joystickActive = true;
        updateJoystick(e);
    });

    document.addEventListener('touchmove', (e) => {
        if (joystickActive) {
            updateJoystick(e);
        }
    });

    document.addEventListener('touchend', () => {
        joystickActive = false;
        resetJoystick();
    });

    function updateJoystick(e) {
        const touch = e.touches[0];
        const rect = joystickContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let x = touch.clientX - centerX;
        let y = touch.clientY - centerY;

        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = rect.width / 2;

        if (distance > maxDistance) {
            x = (x / distance) * maxDistance;
            y = (y / distance) * maxDistance;
        }

        touchInput.joystick.x = x / maxDistance;
        touchInput.joystick.y = y / maxDistance;

        // Update stick position visually
        const stick = document.getElementById('joystickStick');
        stick.style.transform = `translate(${x}px, ${y}px)`;

        // Update input
        input.forward = touchInput.joystick.y < -0.3;
        input.backward = touchInput.joystick.y > 0.3;
        input.left = touchInput.joystick.x < -0.3;
        input.right = touchInput.joystick.x > 0.3;
    }

    function resetJoystick() {
        touchInput.joystick = { x: 0, y: 0 };
        document.getElementById('joystickStick').style.transform = 'translate(0px, 0px)';
        input.forward = false;
        input.backward = false;
        input.left = false;
        input.right = false;
    }

    // Action buttons
    const actionButtons = document.querySelectorAll('.action-button');
    actionButtons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            handleMobileAction(action, true);
            btn.style.opacity = '0.5';
        });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            handleMobileAction(action, false);
            btn.style.opacity = '1';
        });

        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            handleMobileAction(action, false);
            btn.style.opacity = '1';
        });
    });

    // Right side swipe for camera
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
        if (e.touches[0].clientX > window.innerWidth / 2) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (e.touches[0].clientX > window.innerWidth / 2 && gameState.isPlaying && !gameState.isPaused) {
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;

            const sensitivity = 0.01;
            gameState.rotation.y -= deltaX * sensitivity;
            gameState.rotation.x -= deltaY * sensitivity;

            gameState.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.rotation.x));

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });
}

function handleMobileAction(action, pressed) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    switch (action) {
        case 'fire':
            input.fire = pressed;
            break;
        case 'aim':
            input.aim = pressed;
            break;
        case 'reload':
            if (pressed) handleReload();
            break;
        case 'jump':
            if (pressed) input.jump = true;
            break;
        case 'crouch':
            if (pressed) input.crouch = !input.crouch;
            break;
    }
}

// ========================================
// GAME LOGIC
// ========================================

function updatePlayerPhysics() {
    const moveVector = new THREE.Vector3();

    if (input.forward) moveVector.z -= 1;
    if (input.backward) moveVector.z += 1;
    if (input.left) moveVector.x -= 1;
    if (input.right) moveVector.x += 1;

    if (moveVector.length() > 0) {
        moveVector.normalize();
    }

    // Apply rotation to movement
    const rotationMatrix = new THREE.Matrix4().makeRotationY(gameState.rotation.y);
    moveVector.applyMatrix4(rotationMatrix);

    // Speed
    const speed = input.sprint ? CONFIG.PLAYER_SPRINT_SPEED : CONFIG.PLAYER_SPEED;

    gameState.velocity.x = moveVector.x * speed;
    gameState.velocity.z = moveVector.z * speed;

    // Gravity
    if (!gameState.isGrounded) {
        gameState.velocity.y += CONFIG.GRAVITY;
    }

    // Jump
    if (input.jump && gameState.isGrounded) {
        gameState.velocity.y = CONFIG.JUMP_FORCE;
        gameState.isGrounded = false;
        input.jump = false;
    }

    // Update position
    gameState.position.x += gameState.velocity.x;
    gameState.position.z += gameState.velocity.z;
    gameState.position.y += gameState.velocity.y;

    // Ground collision
    if (gameState.position.y <= 2) {
        gameState.position.y = 2;
        gameState.velocity.y = 0;
        gameState.isGrounded = true;
    }

    // Boundary check
    const boundary = 250;
    gameState.position.x = Math.max(-boundary, Math.min(boundary, gameState.position.x));
    gameState.position.z = Math.max(-boundary, Math.min(boundary, gameState.position.z));

    // Update camera
    camera.position.copy(gameState.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = gameState.rotation.y;
    camera.rotation.x = gameState.rotation.x;
}

function handleFire() {
    if (!gameState.canFire || gameState.ammo <= 0 || gameState.isReloading) return;

    gameState.canFire = false;
    gameState.ammo--;

    // Create bullet
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), gameState.rotation.x);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), gameState.rotation.y);

    const bulletData = {
        position: gameState.position.clone(),
        direction: direction,
        playerId: gameState.playerId,
        playerName: gameState.playerName,
        damage: CONFIG.DAMAGE_PER_SHOT,
        age: 0,
    };

    bullets.push(bulletData);

    // Send to server
    if (socket) {
        socket.emit('fire', {
            position: gameState.position,
            direction: direction,
            rotation: gameState.rotation,
        });
    }

    // Recoil effect
    gameState.rotation.x -= 0.02;
    gameState.rotation.y += (Math.random() - 0.5) * 0.05;

    setTimeout(() => {
        gameState.canFire = true;
    }, CONFIG.FIRE_RATE);
}

function handleReload() {
    if (gameState.isReloading || gameState.ammo === CONFIG.AMMO_PER_MAGAZINE) return;

    gameState.isReloading = true;

    setTimeout(() => {
        gameState.ammo = CONFIG.AMMO_PER_MAGAZINE;
        gameState.isReloading = false;
    }, CONFIG.RELOAD_TIME);
}

function updateBullets() {
    bullets = bullets.filter(bullet => {
        bullet.position.add(bullet.direction.clone().multiplyScalar(2));
        bullet.age++;

        // Remove old bullets
        if (bullet.age > 300) return false;

        // Check collision with players
        Object.entries(players).forEach(([id, player]) => {
            if (id === gameState.playerId) return;

            const distance = bullet.position.distanceTo(player.position);
            if (distance < 1) {
                player.health -= bullet.damage;
                bullets = bullets.filter(b => b !== bullet);

                // Send damage to server
                if (socket) {
                    socket.emit('damage', { targetId: id, damage: bullet.damage });
                }

                // Kill notification
                if (player.health <= 0) {
                    addKillFeed(`${gameState.playerName} killed ${player.name}`);
                    gameState.kills++;
                }
            }
        });

        return true;
    });
}

// ========================================
// UI MENU HANDLERS
// ========================================

function togglePauseMenu() {
    if (!gameState.isPlaying) return;

    gameState.isPaused = !gameState.isPaused;
    const pauseMenu = document.getElementById('pauseMenu');
    const gameContainer = document.getElementById('gameContainer');

    if (gameState.isPaused) {
        pauseMenu.classList.add('active');
        gameContainer.style.filter = 'blur(5px)';
        document.exitPointerLock?.();
    } else {
        pauseMenu.classList.remove('active');
        gameContainer.style.filter = 'none';
    }
}

function togglePlayerList() {
    const overlay = document.getElementById('playerListOverlay');
    overlay.classList.toggle('active');
}

function toggleCustomizeMode() {
    gameState.isCustomizing = !gameState.isCustomizing;
    const actionButtons = document.querySelectorAll('.action-button');

    actionButtons.forEach(btn => {
        if (gameState.isCustomizing) {
            btn.classList.add('draggable');
            btn.style.position = 'fixed';
            
            makeDraggable(btn);
            makeResizable(btn);
        } else {
            btn.classList.remove('draggable');
            saveSettingsToLocalStorage();
        }
    });
}

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.addEventListener('mousedown', dragMouseDown);

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', closeDragElement);
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + 'px';
        element.style.left = (element.offsetLeft - pos1) + 'px';
    }

    function closeDragElement() {
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
    }
}

function makeResizable(element) {
    // Add resize handle
    let isResizing = false;
    let currentSize = 60;

    element.addEventListener('wheel', (e) => {
        if (!gameState.isCustomizing) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? -5 : 5;
        currentSize = Math.max(40, Math.min(100, currentSize + delta));
        element.style.width = currentSize + 'px';
        element.style.height = currentSize + 'px';
    });
}

// ========================================
// GAME MENU INITIALIZATION
// ========================================

document.getElementById('playBtn').addEventListener('click', startGame);
document.getElementById('settingsBtn').addEventListener('click', () => {
    showSettingsMenu();
});
document.getElementById('friendsBtn').addEventListener('click', showFriendsMenu);

document.getElementById('resumeBtn').addEventListener('click', togglePauseMenu);
document.getElementById('settingsFromGameBtn').addEventListener('click', () => {
    togglePauseMenu();
    showSettingsMenu();
});
document.getElementById('leaveGameBtn').addEventListener('click', leaveGame);

document.getElementById('backFromSettingsBtn').addEventListener('click', () => {
    const settingsMenu = document.getElementById('settingsMenu');
    const mainMenu = document.getElementById('mainMenu');
    const pauseMenu = document.getElementById('pauseMenu');

    saveSettingsToLocalStorage();
    settingsMenu.classList.remove('active');

    if (gameState.isPlaying) {
        pauseMenu.classList.add('active');
    } else {
        mainMenu.classList.add('active');
    }
});

document.getElementById('backFromFriendsBtn').addEventListener('click', () => {
    const friendsMenu = document.getElementById('friendsMenu');
    const mainMenu = document.getElementById('mainMenu');
    friendsMenu.classList.remove('active');
    mainMenu.classList.add('active');
});

// Settings tabs
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active from all buttons
        document.querySelectorAll('.tab-button').forEach(b => {
            b.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(tabName + 'Tab').classList.add('active');
        btn.classList.add('active');
    });
});

// Customize button
document.getElementById('customizeToggle').addEventListener('click', function () {
    toggleCustomizeMode();
    this.textContent = gameState.isCustomizing ? 'Disable Customize Mode' : 'Enable Customize Mode';
    this.style.background = gameState.isCustomizing ? 'rgba(0, 255, 0, 0.4)' : 'rgba(0, 255, 0, 0.2)';
});

// Graphics sliders
const sliders = {
    brightness: { element: document.getElementById('brightness'), display: document.getElementById('brightnessValue'), suffix: '%' },
    fov: { element: document.getElementById('fov'), display: document.getElementById('fovValue'), suffix: '°' },
    renderDistance: { element: document.getElementById('renderDistance'), display: document.getElementById('renderDistanceValue'), suffix: 'm' },
    masterVolume: { element: document.getElementById('masterVolume'), display: document.getElementById('masterVolumeValue'), suffix: '%' },
    sfxVolume: { element: document.getElementById('sfxVolume'), display: document.getElementById('sfxVolumeValue'), suffix: '%' },
    musicVolume: { element: document.getElementById('musicVolume'), display: document.getElementById('musicVolumeValue'), suffix: '%' },
};

Object.entries(sliders).forEach(([key, data]) => {
    if (data.element) {
        data.element.addEventListener('input', () => {
            data.display.textContent = data.element.value + data.suffix;
            if (key === 'fov' && camera) {
                camera.fov = parseInt(data.element.value);
                camera.updateProjectionMatrix();
            }
        });
    }
});

// Friends & Party
document.getElementById('generatedCode').textContent = gameState.partyCode;

document.getElementById('copyCodeBtn').addEventListener('click', function () {
    navigator.clipboard.writeText(gameState.partyCode);
    this.textContent = 'Copied!';
    setTimeout(() => {
        this.textContent = 'Copy';
    }, 2000);
});

document.getElementById('joinPartyBtn').addEventListener('click', () => {
    const code = document.getElementById('joinCodeInput').value.toUpperCase();
    if (code.length === 6) {
        if (socket) {
            socket.emit('join_party', { code: code });
        }
    }
});

function showSettingsMenu() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('settingsMenu').classList.add('active');
}

function showFriendsMenu() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('friendsMenu').classList.add('active');
}

// ========================================
// SOCKET.IO SETUP
// ========================================

function initializeSocket() {
    socket = io(CONFIG.SERVER_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('player_join', { name: gameState.playerName, partyCode: gameState.partyCode });
    });

    socket.on('player_id', (data) => {
        gameState.playerId = data.playerId;
        console.log('Your player ID:', gameState.playerId);
    });

    socket.on('player_joined', (data) => {
        console.log('Player joined:', data);
        players[data.playerId] = {
            id: data.playerId,
            name: data.playerName,
            position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
            rotation: data.rotation,
            health: CONFIG.PLAYER_MAX_HEALTH,
            mesh: createPlayerMesh(data.playerName, Math.random() * 0xffffff),
        };
        scene.add(players[data.playerId].mesh);
    });

    socket.on('player_moved', (data) => {
        if (players[data.playerId]) {
            players[data.playerId].position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
            players[data.playerId].rotation = data.rotation;
        }
    });

    socket.on('fire', (data) => {
        if (data.playerId !== gameState.playerId && players[data.playerId]) {
            const direction = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);
            const bulletData = {
                position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
                direction: direction,
                playerId: data.playerId,
                playerName: players[data.playerId].name,
                damage: CONFIG.DAMAGE_PER_SHOT,
                age: 0,
            };
            bullets.push(bulletData);
        }
    });

    socket.on('damage', (data) => {
        if (data.targetId === gameState.playerId) {
            gameState.health -= data.damage;
            if (gameState.health <= 0) {
                gameState.deaths++;
                respawnPlayer();
            }
        }
    });

    socket.on('player_left', (data) => {
        if (players[data.playerId]) {
            scene.remove(players[data.playerId].mesh);
            delete players[data.playerId];
        }
    });

    socket.on('party_members', (data) => {
        gameState.partyMembers = data.members;
        updatePartyUI();
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

function updatePartyUI() {
    const membersList = document.getElementById('partyMembersList');
    membersList.innerHTML = '<li>You</li>';
    gameState.partyMembers.forEach(member => {
        const li = document.createElement('li');
        li.textContent = member;
        membersList.appendChild(li);
    });
}

function addKillFeed(message) {
    const killFeed = document.getElementById('killFeed');
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.textContent = message;
    killFeed.appendChild(entry);

    setTimeout(() => {
        entry.remove();
    }, 5000);
}

// ========================================
// GAME LIFECYCLE
// ========================================

function startGame() {
    // Hide menu
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('loadingScreen').classList.add('active');

    // Initialize
    if (!scene) {
        initializeThreeJS();
    }

    gameState.isPlaying = true;
    gameState.isPaused = false;

    // Show game
    document.getElementById('gameContainer').classList.add('active');
    document.getElementById('hud').classList.add('active');

    if (isMobile) {
        setupMobileControls();
    }

    loadSettingsFromLocalStorage();
    initializeSocket();

    // Simulate player spawn
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.remove('active');
    }, 1500);

    // Start game loop
    gameLoop();
}

function leaveGame() {
    if (socket) {
        socket.emit('player_leave');
        socket.disconnect();
    }

    gameState.isPlaying = false;
    gameState.isPaused = false;

    document.getElementById('gameContainer').classList.remove('active');
    document.getElementById('hud').classList.remove('active');
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('mainMenu').classList.add('active');

    // Reset game state
    players = {};
    bullets = [];
    gameState.health = CONFIG.PLAYER_MAX_HEALTH;
    gameState.ammo = CONFIG.AMMO_PER_MAGAZINE;
    gameState.kills = 0;
    gameState.deaths = 0;
    gameState.position = { x: 0, y: 2, z: 0 };
    gameState.rotation = { x: 0, y: 0 };
}

function respawnPlayer() {
    gameState.health = CONFIG.PLAYER_MAX_HEALTH;
    gameState.position = {
        x: (Math.random() - 0.5) * 200,
        y: 2,
        z: (Math.random() - 0.5) * 200,
    };
    gameState.rotation = { x: 0, y: Math.random() * Math.PI * 2 };
}

let frameCount = 0;
let lastTime = performance.now();

function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (!gameState.isPlaying) return;

    // Update
    if (!gameState.isPaused) {
        updatePlayerPhysics();

        if (input.fire) {
            handleFire();
        }

        updateBullets();

        // Send position to server
        if (socket && frameCount % 3 === 0) {
            socket.emit('player_move', {
                position: gameState.position,
                rotation: gameState.rotation,
            });
        }

        updatePlayerList();
        updateHUD();

        // Update other players positions
        Object.values(players).forEach(player => {
            player.mesh.position.copy(player.position);
            player.mesh.rotation.y = player.rotation.y;
        });
    }

    // Render
    renderer.render(scene, camera);

    // FPS counter
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        document.getElementById('fpsText').textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        lastTime = currentTime;
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    CONFIG.GAME_WIDTH = window.innerWidth;
    CONFIG.GAME_HEIGHT = window.innerHeight;

    if (camera && renderer) {
        camera.aspect = CONFIG.GAME_WIDTH / CONFIG.GAME_HEIGHT;
        camera.updateProjectionMatrix();
        renderer.setSize(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    }
});

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadSettingsFromLocalStorage();
    document.getElementById('mainMenu').classList.add('active');
});
