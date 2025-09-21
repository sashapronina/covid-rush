class COVIDTetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.CELL_SIZE = 45; // 10 * 45 = 450 width, 20 * 45 = 900 height
        
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.highestScore = 600; // Static Covid era record
        this.yourHighestScore = localStorage.getItem('covidTetrisYourHighestScore') || 0;
        this.packs = 0;
        this.level = 1;
        this.linesToNextLevel = 1; // Level 1 → 2: 1 line (faster!)
        this.totalLinesCleared = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.initialized = false;
        
        // Illustration properties
        this.packsHeld = 0;
        this.packsFallen = 0;
        this.isBalancing = false;
        this.balanceLossThreshold = 3;
        this.dropTime = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;
        
        // SVG storage
        this.unitImages = {};
        this.illustrationImages = {};
        this.imagesLoaded = 0;
        this.totalImages = 5; // 3 game pieces + human + pack
        
        this.colors = {
            0: 'transparent',
            1: '#ff69b4', // Pink
            2: '#87ceeb', // Blue  
            3: '#ffd700'  // Yellow
        };
        
        this.pieces = [
            // I piece
            [[1,1,1,1]],
            // O piece
            [[1,1],[1,1]],
            // T piece
            [[0,1,0],[1,1,1]],
            // S piece
            [[0,1,1],[1,1,0]],
            // Z piece
            [[1,1,0],[0,1,1]],
            // J piece
            [[1,0,0],[1,1,1]],
            // L piece
            [[0,0,1],[1,1,1]]
        ];
        
        this.funFacts = [
            "The biggest toilet paper purchase during COVID was 600 rolls by one family in Australia!",
            "Toilet paper was invented in 1857 by Joseph Gayetty in New York.",
            "It takes approximately 0.17 kg of cellulose to create 1 toilet paper roll.",
            "During COVID, toilet paper sales increased by 845% in some areas!",
            "The average person uses about 57 sheets of toilet paper per day.",
            "Toilet paper wasn't widely used until the 1900s - before that, people used leaves, corn cobs, or newspapers!",
            "Charmin's 'Mr. Whipple' commercials ran for 21 years, making it one of the longest-running ad campaigns.",
            "The world's largest toilet paper roll was 8 feet tall and weighed over 1,000 pounds!",
            "During the Great Toilet Paper Shortage of 2020, some people resorted to using bidets, washcloths, or even leaves.",
            "Ancient Romans used a sponge on a stick that was shared by everyone in the public restroom!"
        ];
        
        // Piece glow tracking
        this.pieceGlowPositions = []; // Track positions of pieces that just landed
        this.pieceGlowTime = 0; // Track glow animation time
        
        this.loadSVGImages();
    }
    
    loadSVGImages() {
        // Load SVG images
        const gamePieces = ['color-pink.svg', 'color-blue.svg', 'color-yellow.svg'];
        const illustrationFiles = ['human-illustration.svg', 'pack.svg'];
        
        // Set a timeout to start the game even if images fail to load
        setTimeout(() => {
            if (this.imagesLoaded < this.totalImages) {
                console.log('Timeout reached, starting game with available images');
        this.init();
            }
        }, 3000);
        
        // Load game piece SVGs
        gamePieces.forEach((filename, index) => {
            const img = new Image();
            img.onload = () => {
                this.unitImages[index + 1] = img;
                this.imagesLoaded++;
                console.log(`Loaded ${filename}`);
                if (this.imagesLoaded === this.totalImages) {
                    console.log('All SVG images loaded');
                    this.init();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load ${filename}`);
                this.imagesLoaded++;
                if (this.imagesLoaded === this.totalImages) {
                    console.log('All SVG images processed (some may have failed)');
                    this.init();
                }
            };
            img.src = filename;
        });
        
        // Load illustration SVGs
        illustrationFiles.forEach((filename, index) => {
            const img = new Image();
            img.onload = () => {
                this.illustrationImages[filename.replace('.svg', '')] = img;
                this.imagesLoaded++;
                console.log(`Loaded ${filename}`);
                if (this.imagesLoaded === this.totalImages) {
                    console.log('All SVG images loaded');
                    this.init();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load ${filename}`);
                this.imagesLoaded++;
                if (this.imagesLoaded === this.totalImages) {
                    console.log('All SVG images processed (some may have failed)');
                    this.init();
                }
            };
            img.src = filename;
        });
    }
    
    init() {
        // Prevent multiple initialization
        if (this.initialized) {
            console.log('Game already initialized, skipping...');
            return;
        }
        this.initialized = true;
        
        console.log('Initializing game...');
        this.updateDisplay();
        this.setupEventListeners();
        this.updateAnimation();
        this.initAudio();
        // Don't start game automatically - wait for user to start
    }
    
    setupEventListeners() {
        // Tab visibility detection - pause when tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab is hidden - pause the game if it's running
                if (this.gameRunning && !this.gamePaused) {
                    this.togglePause('tab');
                }
            } else {
                // Tab is visible - resume if game was paused due to tab switch
                // Note: We don't auto-resume to avoid interrupting the user
            }
        });

        document.addEventListener('keydown', (e) => {
            // R key for restart (works in any state)
            if (e.code === 'KeyR') {
                e.preventDefault();
                this.restartGame();
                return;
            }
            
            if (!this.gameRunning || this.gamePaused) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    if (!this.gameRunning) {
                        this.startGame();
                    } else {
                        this.togglePause();
                    }
                }
                return;
            }
            
            switch(e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    e.preventDefault();
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    e.preventDefault();
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    e.preventDefault();
                    this.movePiece(0, 1);
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    e.preventDefault();
                    this.rotatePiece();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'Space':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        });
        
        // Debug mode for testing animations (hold Shift + number keys)
        document.addEventListener('keydown', (e) => {
            if (e.shiftKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                switch(e.key) {
                    case '1':
                        this.testPackAnimation(1);
                        break;
                    case '2':
                        this.testPackAnimation(2);
                        break;
                    case '3':
                        this.testPackAnimation(3);
                        break;
                    case '4':
                        this.testPackAnimation(4);
                        break;
                    case '5':
                        this.testPackAnimation(5);
                        break;
                    case '0':
                        this.resetIllustration();
                        break;
                }
            }
        });
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.score = 0;
        this.packs = 0;
        this.level = 1;
        this.linesToNextLevel = 1; // Level 1 → 2: 1 line (faster!)
        this.totalLinesCleared = 0;
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        
        // Always generate fresh pieces when starting
        this.generateNewPiece();
        this.generateNewPiece();
        
        // Start the game loop
        this.gameLoop();
        
        this.updateDisplay();
        this.updateAnimation();
        document.getElementById('gameOverModal').style.display = 'none';
    }
    
    togglePause(reason = 'manual') {
        this.gamePaused = !this.gamePaused;
        const modal = document.getElementById('pauseModal');
        const scoreDisplay = document.getElementById('pauseScore');
        const funFactDisplay = document.getElementById('funFact');
        
        if (this.gamePaused) {
            modal.style.display = 'flex';
            scoreDisplay.textContent = `Current score: ${this.score}`;
            
            // Show different message based on pause reason
            if (reason === 'tab') {
                funFactDisplay.textContent = 'Game paused - you switched tabs! Press Space to resume.';
            } else {
            funFactDisplay.textContent = this.funFacts[Math.floor(Math.random() * this.funFacts.length)];
            }
            
            this.pauseAllSounds();
        } else {
            modal.style.display = 'none';
            this.resumeAllSounds();
        }
    }

    // Pause all audio when game is paused
    pauseAllSounds() {
        if (this.audioContext && this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
        }
        
        // Also pause the level up sound if it's playing
        const levelUpAudio = document.getElementById('levelUpSound');
        if (levelUpAudio && !levelUpAudio.paused) {
            levelUpAudio.pause();
        }
    }

    // Resume all audio when game is unpaused
    resumeAllSounds() {
        if (this.audioContext && this.masterGain) {
            this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.1);
        }
    }
    
    resumeGame() {
        this.gamePaused = false;
        document.getElementById('pauseModal').style.display = 'none';
        this.resumeAllSounds();
    }
    
    restartGame() {
        // Reset game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.level = 1;
        this.linesToNextLevel = 2;
        this.totalLinesCleared = 0;
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        this.currentPiece = null;
        this.nextPiece = null;
        this.pieceGlowPositions = [];
        this.pieceGlowTime = 0;
        this.animatingLines = false;
        this.clearedRows = [];
        
        // Clear any modals
        document.getElementById('pauseModal').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';
        
        // Update display
        this.updateDisplay();
        
        // Start new game
        this.startGame();
    }
    
    generateNewPiece() {
        this.currentPiece = this.nextPiece || this.createRandomPiece();
        this.nextPiece = this.createRandomPiece();
        
        if (this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y)) {
            this.gameOver();
            return;
        }
        
        this.drawNextPiece();
    }
    
    createRandomPiece() {
        const pieceIndex = Math.floor(Math.random() * this.pieces.length);
        const colorIndex = Math.floor(Math.random() * 3) + 1;
        
        return {
            shape: this.pieces[pieceIndex],
            color: colorIndex,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.pieces[pieceIndex][0].length / 2),
            y: 0
        };
    }
    
    movePiece(dx, dy) {
        if (!this.currentPiece) return;
        
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;
        
        if (!this.checkCollision(this.currentPiece, newX, newY)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
        } else if (dy > 0) {
            this.placePiece();
            this.clearLines();
        }
    }
    
    rotatePiece() {
        if (!this.currentPiece) return;
        
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        const originalShape = this.currentPiece.shape;
        
        this.currentPiece.shape = rotated;
        
        if (this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y)) {
            this.currentPiece.shape = originalShape;
        }
    }
    
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = matrix[i][j];
            }
        }
        
        return rotated;
    }
    
    hardDrop() {
        if (!this.currentPiece) return;
        
        while (!this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
        }
        
        this.placePiece();
        this.clearLines();
        this.updateDisplay();
    }
    
    checkCollision(piece, x, y) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    if (newX < 0 || newX >= this.BOARD_WIDTH || 
                        newY >= this.BOARD_HEIGHT || 
                        (newY >= 0 && this.board[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    placePiece() {
        if (!this.currentPiece) return;
        
        // Track positions of the piece that just landed for glow effect
        this.pieceGlowPositions = [];
        
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const x = this.currentPiece.x + col;
                    const y = this.currentPiece.y + row;
                    
                    if (y >= 0) {
                        this.board[y][x] = this.currentPiece.color;
                        // Store position for glow effect
                        this.pieceGlowPositions.push({ x, y, color: this.currentPiece.color });
                    }
                }
            }
        }
        
        // Reset glow animation timer
        this.pieceGlowTime = 0;
        
        // Play piece placement sound
        this.playPiecePlaceSound();
        
        this.currentPiece = null;
    }
    
    clearLines() {
        let linesCleared = 0;
        let clearedRows = [];
        
        // Check for completed lines
        for (let row = this.BOARD_HEIGHT - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                clearedRows.push(row);
            }
        }
        
        if (clearedRows.length > 0) {
            // Remove cleared rows
            clearedRows.sort((a, b) => b - a);
            clearedRows.forEach(row => {
                this.board.splice(row, 1);
                this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
            });
            
            // Update score and level
            this.processLineClearing(clearedRows.length);
            
            // Create particles for each cleared row
            clearedRows.forEach(row => {
                const centerX = (this.BOARD_WIDTH / 2) * this.CELL_SIZE;
                const centerY = row * this.CELL_SIZE + this.CELL_SIZE / 2;
                this.createParticles(centerX, centerY, 12);
            });
            
            // Create score particles
            this.createScoreParticles(8);
            
            // Play line clear sound
            this.playLineClearSound();
            
            // Generate new piece after clearing lines
            this.generateNewPiece();
            
            // Update display
            this.updateDisplay();
        } else {
            // No lines cleared, still need to generate new piece
            this.generateNewPiece();
        }
    }
    
    animateLineClearing(clearedRows) {
        // Store original board state for animation
        this.animatingLines = true;
        this.clearedRows = clearedRows;
        this.draw(); // Redraw with animation
    }
    
    processLineClearing(linesCleared) {
        if (linesCleared > 0) {
            // Each line has 10 squares, so each cleared line = 10 rolls
            // Bonus for multiple lines cleared at once
            const baseRolls = linesCleared * 10;
            const bonusMultiplier = linesCleared > 1 ? linesCleared * 0.5 : 1;
            const points = Math.floor(baseRolls * bonusMultiplier);
            
            this.score += points;
            this.totalLinesCleared += linesCleared;
            
            // Smart level progression system
            const previousLevel = this.level;
            this.linesToNextLevel -= linesCleared;
            if (this.linesToNextLevel <= 0) {
                this.level++;
                
                // Set requirements for next level based on current level (reduced by 1 line each!)
                if (this.level === 2) {
                    this.linesToNextLevel = 2; // Level 2 → 3: 2 lines (was 3)
                } else if (this.level === 3) {
                    this.linesToNextLevel = 2; // Level 3 → 4: 2 lines (was 3)
                } else {
                    this.linesToNextLevel = 4; // Level 4+: 4 lines each (was 5)
                }
                
                // Increase game speed with each level (decrease drop interval)
                if (this.level === 2) {
                    this.dropInterval = 800; // Level 2: 0.8 speed
                } else if (this.level === 3) {
                    this.dropInterval = 700; // Level 3: 0.7 speed
                } else {
                    // Level 4+: progressive speed increase by 100ms
                    this.dropInterval = Math.max(300, 700 - (this.level - 3) * 100);
                }
                
                // Trigger level up animation and sound
                if (this.level > previousLevel) {
                    this.triggerLevelUpAnimation();
                    this.playLevelUpSound();
                }
            }
            
            // Update illustration: reveal packs in grid positions
            // Each line cleared reveals one pack in the grid
            this.updateIllustration();
            
            this.updateDisplay();
            this.updateAnimation();
        }
        
        // Reset animation state
        this.animatingLines = false;
        this.clearedRows = [];
    }
    
    triggerLevelUpAnimation() {
        const levelElement = document.getElementById('currentLevel');
        levelElement.classList.add('level-up-animation');
        
        // Show the level-up popup in the center of the game canvas
        this.showLevelUpPopup();
        
        // Remove animation class after animation completes
        setTimeout(() => {
            levelElement.classList.remove('level-up-animation');
        }, 250);
    }

    showLevelUpPopup() {
        const popup = document.getElementById('levelUpPopup');
        const gameCanvas = document.getElementById('gameCanvas');
        const levelText = document.querySelector('.level-up-text');
        
        if (popup && levelText) {
            // Update the text to show the new level number
            levelText.textContent = `Level ${this.level}`;
            
            popup.classList.add('show');
            
            // Add canvas glow that matches popup timing
            if (gameCanvas) {
                gameCanvas.classList.add('canvas-glow');
                setTimeout(() => {
                    gameCanvas.classList.remove('canvas-glow');
                }, 600);
            }
            
            // Hide the popup after 0.5 seconds
            setTimeout(() => {
                popup.classList.remove('show');
            }, 600);
        }
    }
    
    createParticles(x, y, count = 8) {
        const gameContainer = document.querySelector('.game-board');
        if (!gameContainer) return; // Safety check
        const rect = gameContainer.getBoundingClientRect();
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle particle-sparkle';
            
            // Random position around the center
            const angle = (i / count) * Math.PI * 2;
            const distance = 25 + Math.random() * 35;
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            particle.style.left = (rect.left + particleX) + 'px';
            particle.style.top = (rect.top + particleY) + 'px';
            
            // Use the sparkle.svg with FFEA81 color (handled by CSS filter)
            
            document.body.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1200);
        }
    }
    
    createScoreParticles(count = 5) {
        const scoreElement = document.getElementById('currentScoreNumber');
        if (!scoreElement) return; // Safety check
        const rect = scoreElement.getBoundingClientRect();
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'score-particle score-particle-sparkle';
            
            // Random position around the score element
            const particleX = rect.left + Math.random() * rect.width;
            const particleY = rect.top + Math.random() * rect.height;
            
            particle.style.left = particleX + 'px';
            particle.style.top = particleY + 'px';
            
            // Use the sparkle.svg with FFEA81 color (handled by CSS filter)
            
            document.body.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }
    

    triggerCanvasGlow() {
        // Add canvas glow effect when lines are cleared
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.classList.add('canvas-glow');
            setTimeout(() => {
                canvas.classList.remove('canvas-glow');
            }, 500);
        }
    }
    
    // Initialize Web Audio API
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.8; // Much louder volume
            
            // Enable audio on first user interaction
            const enableAudio = () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('keydown', enableAudio);
            };
            
            document.addEventListener('click', enableAudio);
            document.addEventListener('keydown', enableAudio);
        } catch (error) {
            console.log('Web Audio API not supported:', error);
            this.audioContext = null;
        }
    }
    
    // Create paper crinkling sound
    createPaperCrinkle() {
        if (!this.audioContext) return;
        
        // Create multiple layers for realistic paper crinkling
        for (let i = 0; i < 3; i++) {
            const noiseBuffer = this.createPaperNoiseBuffer(0.18, 'crinkle');
            const noiseSource = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter1 = this.audioContext.createBiquadFilter();
            const filter2 = this.audioContext.createBiquadFilter();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(filter1);
            filter1.connect(filter2);
            filter2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            const delay = i * 0.015;
            
            // First filter - high frequency emphasis for crinkling
            filter1.type = 'highpass';
            filter1.frequency.setValueAtTime(800 + (i * 200), this.audioContext.currentTime + delay);
            filter1.frequency.exponentialRampToValueAtTime(400 + (i * 100), this.audioContext.currentTime + delay + 0.18);
            
            // Second filter - bandpass for paper texture
            filter2.type = 'bandpass';
            filter2.frequency.setValueAtTime(1500 + (i * 300), this.audioContext.currentTime + delay);
            filter2.frequency.exponentialRampToValueAtTime(800 + (i * 150), this.audioContext.currentTime + delay + 0.18);
            filter2.Q.value = 4;
            
            // Crinkle envelope - quick bursts with irregular timing
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + delay + 0.003);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.18);
            
            noiseSource.start(this.audioContext.currentTime + delay);
            noiseSource.stop(this.audioContext.currentTime + delay + 0.18);
        }
    }
    
    // Create realistic paper noise buffer with texture
    createPaperNoiseBuffer(duration = 0.2, texture = 'crinkle') {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        // Generate different types of paper noise
        for (let i = 0; i < bufferSize; i++) {
            let noise = 0;
            
            if (texture === 'crinkle') {
                // Crinkling paper - sharp, irregular noise with bursts
                const time = i / this.audioContext.sampleRate;
                const burst = Math.random() < 0.1 ? Math.random() * 0.8 : 0;
                const baseNoise = (Math.random() * 2 - 1) * 0.4;
                const envelope = Math.exp(-time * 8); // Quick decay
                noise = (baseNoise + burst) * envelope;
                
            } else if (texture === 'tear') {
                // Tearing paper - sharp crackling with irregular spikes
                const time = i / this.audioContext.sampleRate;
                const spike = Math.random() < 0.15 ? (Math.random() * 2 - 1) * 0.9 : 0;
                const crackle = (Math.random() * 2 - 1) * 0.3;
                const envelope = Math.exp(-time * 5);
                noise = (spike + crackle) * envelope;
                
            } else if (texture === 'rustle') {
                // Rustling paper - softer, more continuous noise
                const time = i / this.audioContext.sampleRate;
                const baseNoise = (Math.random() * 2 - 1) * 0.2;
                const flutter = Math.sin(time * 200 + Math.random() * 10) * 0.1;
                const envelope = Math.exp(-time * 3);
                noise = (baseNoise + flutter) * envelope;
                
            } else if (texture === 'crumble') {
                // Gentle paper crumbling - very soft, subtle noise
                const time = i / this.audioContext.sampleRate;
                const baseNoise = (Math.random() * 2 - 1) * 0.15;
                const gentleCrinkle = Math.sin(time * 150 + Math.random() * 5) * 0.08;
                const softBurst = Math.random() < 0.05 ? Math.random() * 0.3 : 0;
                const envelope = Math.exp(-time * 4); // Slower decay for gentleness
                noise = (baseNoise + gentleCrinkle + softBurst) * envelope;
            }
            
            output[i] = noise;
        }
        return buffer;
    }
    
    // Create paper tearing sound
    createPaperTear() {
        if (!this.audioContext) return;
        
        // Create layered tearing sounds with realistic paper texture
        for (let i = 0; i < 3; i++) {
            const noiseBuffer = this.createPaperNoiseBuffer(0.25, 'tear');
            const noiseSource = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter1 = this.audioContext.createBiquadFilter();
            const filter2 = this.audioContext.createBiquadFilter();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(filter1);
            filter1.connect(filter2);
            filter2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Dual filter setup for realistic paper tearing
            const delay = i * 0.02;
            
            // First filter - high frequency emphasis for sharp tearing
            filter1.type = 'highpass';
            filter1.frequency.setValueAtTime(800, this.audioContext.currentTime + delay);
            filter1.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + delay + 0.25);
            
            // Second filter - bandpass for paper texture
            filter2.type = 'bandpass';
            filter2.frequency.setValueAtTime(2000 - (i * 400), this.audioContext.currentTime + delay);
            filter2.frequency.exponentialRampToValueAtTime(1000 - (i * 200), this.audioContext.currentTime + delay + 0.25);
            filter2.Q.value = 6;
            
            // Tearing envelope - sharp attack, realistic decay
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(0.9, this.audioContext.currentTime + delay + 0.003);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.25);
            
            noiseSource.start(this.audioContext.currentTime + delay);
            noiseSource.stop(this.audioContext.currentTime + delay + 0.25);
        }
    }
    
    // Create paper rubbing sound
    createPaperRub() {
        if (!this.audioContext) return;
        
        // Create multiple layers for realistic paper rustling
        for (let i = 0; i < 2; i++) {
            const noiseBuffer = this.createPaperNoiseBuffer(0.15, 'rustle');
            const noiseSource = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter1 = this.audioContext.createBiquadFilter();
            const filter2 = this.audioContext.createBiquadFilter();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(filter1);
            filter1.connect(filter2);
            filter2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            const delay = i * 0.01;
            
            // First filter - low frequency emphasis for paper rustling
            filter1.type = 'lowpass';
            filter1.frequency.setValueAtTime(600 - (i * 100), this.audioContext.currentTime + delay);
            filter1.frequency.linearRampToValueAtTime(300 - (i * 50), this.audioContext.currentTime + delay + 0.15);
            
            // Second filter - slight high-pass for texture
            filter2.type = 'highpass';
            filter2.frequency.setValueAtTime(100, this.audioContext.currentTime + delay);
            filter2.frequency.linearRampToValueAtTime(80, this.audioContext.currentTime + delay + 0.15);
            
            // Rubbing envelope - gentle, continuous
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + delay + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.15);
            
            noiseSource.start(this.audioContext.currentTime + delay);
            noiseSource.stop(this.audioContext.currentTime + delay + 0.15);
        }
    }

    // Create gentle paper crumbling sound for line clearing
    createPaperCrumble() {
        if (!this.audioContext) return;
        
        // Create gentle, soft paper crumbling layers
        for (let i = 0; i < 2; i++) {
            const noiseBuffer = this.createPaperNoiseBuffer(0.25, 'crumble');
            const noiseSource = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter1 = this.audioContext.createBiquadFilter();
            const filter2 = this.audioContext.createBiquadFilter();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(filter1);
            filter1.connect(filter2);
            filter2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            const delay = i * 0.02;
            
            // First filter - low frequency emphasis for gentle crumbling
            filter1.type = 'lowpass';
            filter1.frequency.setValueAtTime(400 - (i * 50), this.audioContext.currentTime + delay);
            filter1.frequency.linearRampToValueAtTime(200 - (i * 25), this.audioContext.currentTime + delay + 0.25);
            
            // Second filter - gentle high-pass for soft texture
            filter2.type = 'highpass';
            filter2.frequency.setValueAtTime(80, this.audioContext.currentTime + delay);
            filter2.frequency.linearRampToValueAtTime(60, this.audioContext.currentTime + delay + 0.25);
            
            // Gentle crumbling envelope - very soft and smooth
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + delay + 0.05); // Much lower volume
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.25);
            
            noiseSource.start(this.audioContext.currentTime + delay);
            noiseSource.stop(this.audioContext.currentTime + delay + 0.25);
        }
    }
    
    // Sound effect functions with toilet paper theme
    playLineClearSound() {
        // Gentle paper crumbling sound for line clearing
        this.createPaperCrumble();
        // Add a second gentle crumble for extra satisfaction
        setTimeout(() => this.createPaperCrumble(), 120);
    }
    
    playLevelUpSound() {
        // Use the custom level-sound.mp3 for level up but stop it after a short duration
        try {
            const audio = document.getElementById('levelUpSound');
            const source = document.getElementById('levelUpSource');
            if (audio && source) {
                // Add cache busting to ensure fresh audio
                const timestamp = new Date().getTime();
                source.src = `level sound.mp3?v=${timestamp}`;
                audio.load(); // Reload the audio element
                
                audio.currentTime = 0; // Reset to beginning
                audio.play().catch(e => console.log('Level up audio play failed:', e));
                
                // Stop the audio after 0.5 seconds to make it shorter
                setTimeout(() => {
                    if (!audio.paused) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                }, 500);
            }
        } catch (error) {
            console.log('Level up sound error:', error);
            // Fallback to generated sounds if MP3 fails
            this.createPaperCrinkle();
            setTimeout(() => this.createPaperCrinkle(), 80);
            setTimeout(() => this.createPaperCrinkle(), 160);
        }
    }
    
    playPiecePlaceSound() {
        // Gentle paper rubbing sound for piece placement
        this.createPaperRub();
    }
    
    updateDisplay() {
        // Update current score
        // Assuming 1 roll lasts about 1 week, so 52 rolls = 1 year
        const years = Math.floor(this.score / 52);
        const weeks = this.score % 52;
        const months = Math.floor(weeks / 4.33); // Average weeks per month
        const remainingWeeks = Math.floor(weeks % 4.33);
        const days = Math.floor(remainingWeeks * 7); // Convert weeks to days
        
        let timeText = '';
        if (this.score === 0) {
            timeText = '0 days';
        } else if (years > 0) {
            timeText += `${years} years `;
            if (months > 0) timeText += `${months} months `;
            if (remainingWeeks > 0) timeText += `${remainingWeeks} weeks`;
        } else if (months > 0) {
            timeText += `${months} months `;
            if (remainingWeeks > 0) timeText += `${remainingWeeks} weeks`;
        } else if (weeks > 0) {
            timeText += `${weeks} weeks`;
            } else {
            timeText = `${days} days`;
        }
        
        document.getElementById('currentScoreNumber').textContent = this.score;
        document.getElementById('currentTimeSupply').textContent = `${timeText.trim()} supply`;
        document.getElementById('currentLevel').textContent = `Level ${this.level}`;
        
        // Update your highest score
        if (this.score > this.yourHighestScore) {
            this.yourHighestScore = this.score;
            localStorage.setItem('covidTetrisYourHighestScore', this.yourHighestScore);
        }
        
        // Display static highest score (Covid era record)
        document.getElementById('highestScore').textContent = '600 rolls or 8 years supply';
        document.getElementById('yourHighestScore').textContent = `${this.yourHighestScore} rolls`;
    }
    
    updateIllustration() {
        // Illustration area removed - no longer needed
    }
    
    updateAnimation() {
        // Keep the old function for backward compatibility but use new illustration
        this.updateIllustration();
    }
    
    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (!this.nextPiece) return;
        
        // Use the same cell size as the main game (45px) but scaled down for the preview
        const cellSize = 45;
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * cellSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * cellSize) / 2;
        
        for (let row = 0; row < this.nextPiece.shape.length; row++) {
            for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                if (this.nextPiece.shape[row][col]) {
                    this.drawToiletPaperRollMini(offsetX + col * cellSize, offsetY + row * cellSize, this.nextPiece.color, cellSize);
                }
            }
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = '#ff69b4';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.CELL_SIZE, 0);
            this.ctx.lineTo(x * this.CELL_SIZE, this.BOARD_HEIGHT * this.CELL_SIZE);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.CELL_SIZE);
            this.ctx.lineTo(this.BOARD_WIDTH * this.CELL_SIZE, y * this.CELL_SIZE);
            this.ctx.stroke();
        }
        
        // Draw placed pieces
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                if (this.board[row][col]) {
                    // Check if this row is being animated for clearing
                    if (this.animatingLines && this.clearedRows && this.clearedRows.includes(row)) {
                        // Draw with clearing animation effect
                        this.drawToiletPaperRollWithAnimation(col * this.CELL_SIZE, row * this.CELL_SIZE, this.board[row][col], this.CELL_SIZE);
                    } else {
                    this.drawToiletPaperRoll(col * this.CELL_SIZE, row * this.CELL_SIZE, this.board[row][col], this.CELL_SIZE);
                    }
                }
            }
        }
        
        // Draw glow effect for pieces that just landed (overlay on top)
        if (this.pieceGlowPositions.length > 0) {
            this.drawPieceGlow();
        }
        
        // Draw current piece
        if (this.currentPiece) {
            for (let row = 0; row < this.currentPiece.shape.length; row++) {
                for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                    if (this.currentPiece.shape[row][col]) {
                        const x = (this.currentPiece.x + col) * this.CELL_SIZE;
                        const y = (this.currentPiece.y + row) * this.CELL_SIZE;
                        this.drawToiletPaperRoll(x, y, this.currentPiece.color, this.CELL_SIZE);
                    }
                }
            }
        }
    }
    
    drawToiletPaperRoll(x, y, color, size) {
        if (this.unitImages[color]) {
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(this.unitImages[color], x, y, size, size);
        }
    }
    
    drawToiletPaperRollWithAnimation(x, y, color, size) {
        if (this.unitImages[color]) {
            this.ctx.save();
            this.ctx.imageSmoothingEnabled = false;
            
            // Add a bright white overlay for the clearing effect
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fillRect(x, y, size, size);
            
            // Draw the piece with dramatic scale for line clearing
            this.ctx.globalAlpha = 1;
            this.ctx.drawImage(this.unitImages[color], x - 4, y - 4, size + 8, size + 8);
            
            this.ctx.restore();
        }
    }
    
    drawPieceGlow() {
        // Update glow animation time
        this.pieceGlowTime += 16; // Assuming 60fps
        
        // Glow duration in milliseconds
        const glowDuration = 200; // Very short duration for immediate feedback
        
        if (this.pieceGlowTime > glowDuration) {
            // Clear glow positions when animation is complete
            this.pieceGlowPositions = [];
            return;
        }
        
        // Calculate scale animation (bounce effect for landing)
        const progress = this.pieceGlowTime / glowDuration;
        const scale = 1 + (0.1 * Math.sin(progress * Math.PI)); // Scale from 1.0 to 1.1 and back (more noticeable)
        
        // Draw scaled pieces as overlay for each position
        this.pieceGlowPositions.forEach(pos => {
            const x = pos.x * this.CELL_SIZE;
            const y = pos.y * this.CELL_SIZE;
            
            // Draw the piece with scale effect as an overlay
            this.ctx.save();
            this.ctx.translate(x + this.CELL_SIZE/2, y + this.CELL_SIZE/2);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-this.CELL_SIZE/2, -this.CELL_SIZE/2);
            
            // Draw the piece with the scale effect
            this.drawToiletPaperRoll(0, 0, pos.color, this.CELL_SIZE);
            
            this.ctx.restore();
        });
    }
    
    drawPinkRoll(x, y, size) {
        const scale = size / 30; // Scale factor based on cell size
        
        // Main pink body
        this.ctx.fillStyle = "#ff69b4";
        this.ctx.fillRect(x + 2*scale, y + 2*scale, (size - 4*scale), (size - 4*scale));
        
        // Top flap (darker pink)
        this.ctx.fillStyle = "#ff1493";
        this.ctx.fillRect(x + 4*scale, y + 2*scale, (size - 8*scale), 4*scale);
        
        // Core circle (white)
        this.ctx.fillStyle = "#fff";
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y + 4*scale, 3*scale, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Horizontal line (perforation)
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4*scale, y + 8*scale);
        this.ctx.lineTo(x + size - 4*scale, y + 8*scale);
        this.ctx.stroke();
        
        // Star patterns (white)
        this.drawStar(x + 8*scale, y + 12*scale, "#fff", scale);
        this.drawStar(x + size - 8*scale, y + 16*scale, "#fff", scale);
        this.drawStar(x + 12*scale, y + size - 8*scale, "#fff", scale);
        
        // Detached piece
        this.ctx.fillStyle = "#ff69b4";
        this.ctx.fillRect(x + size - 6*scale, y + size - 6*scale, 6*scale, 4*scale);
        this.drawStar(x + size - 3*scale, y + size - 4*scale, "#fff", scale);
    }
    
    drawBlueRoll(x, y, size) {
        const scale = size / 30;
        
        // Main blue body
        this.ctx.fillStyle = "#87ceeb";
        this.ctx.fillRect(x + 2*scale, y + 2*scale, (size - 4*scale), (size - 4*scale));
        
        // Top core (darker blue)
        this.ctx.fillStyle = "#4682b4";
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y + 4*scale, 3*scale, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Horizontal line
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4*scale, y + 8*scale);
        this.ctx.lineTo(x + size - 4*scale, y + 8*scale);
        this.ctx.stroke();
        
        // Diamond patterns (light blue)
        this.drawDiamond(x + 8*scale, y + 12*scale, "#b0e0e6", scale);
        this.drawDiamond(x + size - 8*scale, y + 16*scale, "#b0e0e6", scale);
        
        // Unrolling piece
        this.ctx.fillStyle = "#87ceeb";
        this.ctx.fillRect(x + size - 6*scale, y + size - 6*scale, 6*scale, 4*scale);
        this.drawDiamond(x + size - 3*scale, y + size - 4*scale, "#b0e0e6", scale);
    }
    
    drawYellowRoll(x, y, size) {
        const scale = size / 30;
        
        // Main yellow body
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(x + 2*scale, y + 2*scale, (size - 4*scale), (size - 4*scale));
        
        // Top golden core
        this.ctx.fillStyle = "#ffd700";
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y + 3*scale, 2*scale, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Horizontal band
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4*scale, y + 7*scale);
        this.ctx.lineTo(x + size - 4*scale, y + 7*scale);
        this.ctx.stroke();
        
        // Chain element
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 6*scale, y + 8*scale);
        this.ctx.lineTo(x + 8*scale, y + 10*scale);
        this.ctx.stroke();
        
        // Diamond patterns
        this.drawDiamond(x + 8*scale, y + 12*scale, "#ffd700", scale);
        this.drawDiamond(x + size - 8*scale, y + 16*scale, "#ffd700", scale);
        
        // Torn edge piece
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(x + size - 6*scale, y + size - 6*scale, 6*scale, 4*scale);
        this.drawDiamond(x + size - 3*scale, y + size - 4*scale, "#ffd700", scale);
    }
    
    drawStar(x, y, color, scale) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 1*scale, y, 2*scale, 1*scale);
        this.ctx.fillRect(x, y - 1*scale, 1*scale, 3*scale);
    }
    
    drawDiamond(x, y, color, scale) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 1*scale, y, 2*scale, 1*scale);
        this.ctx.fillRect(x, y - 1*scale, 1*scale, 3*scale);
        this.ctx.fillRect(x - 1*scale, y - 1*scale, 1*scale, 1*scale);
        this.ctx.fillRect(x + 1*scale, y - 1*scale, 1*scale, 1*scale);
        this.ctx.fillRect(x - 1*scale, y + 1*scale, 1*scale, 1*scale);
        this.ctx.fillRect(x + 1*scale, y + 1*scale, 1*scale, 1*scale);
    }
    
    drawToiletPaperRollMini(x, y, color, size) {
        if (this.unitImages[color]) {
            this.nextCtx.imageSmoothingEnabled = false;
            this.nextCtx.drawImage(this.unitImages[color], x, y, size, size);
        }
    }
    
    drawPinkRollMini(x, y, size) {
        // Main pink body
        this.ctx.fillStyle = "#ff69b4";
        this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        
        // Top flap
        this.ctx.fillStyle = "#ff1493";
        this.ctx.fillRect(x + 2, y + 1, size - 4, 2);
        
        // Core circle
        this.ctx.fillStyle = "#fff";
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y + 2, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Star pattern
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(x + 3, y + 6, 1, 1);
    }
    
    drawBlueRollMini(x, y, size) {
        // Main blue body
        this.ctx.fillStyle = "#87ceeb";
        this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        
        // Top core
        this.ctx.fillStyle = "#4682b4";
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y + 2, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Diamond pattern
        this.ctx.fillStyle = "#b0e0e6";
        this.ctx.fillRect(x + 3, y + 6, 1, 1);
    }
    
    drawYellowRollMini(x, y, size) {
        // Main yellow body
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        
        // Top core
        this.ctx.fillStyle = "#ffd700";
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y + 2, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Diamond pattern
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(x + 3, y + 6, 1, 1);
    }
    
    gameOver() {
        this.gameRunning = false;
        
        // Calculate years of supply (1 roll = 5 days)
        const days = Math.floor(this.score * 5);
        let timeText = '';
        if (days >= 365) {
            const years = Math.floor(days / 365);
            timeText = `${years} years`;
        } else if (days >= 7) {
            const weeks = Math.floor(days / 7);
            timeText = `${weeks} weeks`;
        } else {
            timeText = `${days} days`;
        }
        
        // Update game over message with conditional fun copy
        let message = '';
        if (this.score < 10) {
            message = `How will you survive?! You only collected ${this.score} rolls or ${timeText} supply of toilet paper.`;
        } else if (this.score < 50) {
            message = `It's not too bad! You collected ${this.score} rolls or ${timeText} supply of toilet paper.`;
        } else if (this.score < 100) {
            message = `You loo star! You collected ${this.score} rolls or ${timeText} supply of toilet paper.`;
        } else {
            message = `Amazing! You have your children and grandchildren covered with ${this.score} rolls or ${timeText} supply of toilet paper!`;
        }
        document.getElementById('gameOverMessage').textContent = message;
        
        document.getElementById('gameOverModal').style.display = 'flex';
    }
    
    gameLoop(currentTime = 0) {
        if (!this.gameRunning || this.gamePaused) {
            requestAnimationFrame((time) => this.gameLoop(time));
            return;
        }
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.dropTime += deltaTime;
        
        if (this.dropTime >= this.dropInterval) {
            this.movePiece(0, 1);
            this.dropTime = 0;
        }
        
        this.draw();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    // Debug functions for testing animations
    testPackAnimation(packCount) {
        console.log(`Testing animation with ${packCount} packs`);
        this.packsHeld = packCount;
        this.totalLinesCleared = packCount;
        this.updateIllustration();
    }
    
    resetIllustration() {
        console.log('Resetting illustration');
        this.packsHeld = 0;
        this.totalLinesCleared = 0;
        this.updateIllustration();
    }
    
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new COVIDTetris();
});

// Global functions for buttons
function resumeGame() {
    if (game) game.resumeGame();
}

function restartGame() {
    if (game) game.restartGame();
}
