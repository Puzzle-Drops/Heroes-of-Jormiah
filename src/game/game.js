        class Game {
            constructor() {
                this.canvas = document.getElementById('dungeon-canvas');
                
                // Initialize resource managers for memory leak prevention
                this.eventManager = new EventListenerManager();
                this.animationManager = new AnimationManager();
                this.timerManager = new TimerManager();
                this.destroyed = false;
                this.ctx = this.canvas.getContext('2d');
                this.canvas.width = this.canvas.offsetWidth;
                this.canvas.height = this.canvas.offsetHeight;
                
                // Delta time for real-time combat
                this.lastFrameTime = performance.now();
                this.deltaTime = 0;
                
                this.mapCanvas = document.getElementById('map-canvas');
                this.mapCtx = this.mapCanvas.getContext('2d');
                
                this.lootSortBy = [];
                this.inventorySortBy = [];
                
                // Make game instance globally accessible for position change tracking
window.game = this;

// Skill tree integration
                this.skillTreeOpen = false;
                this.currentSkillTreeCharacter = null;
                this.skillTreeFrame = null;
                
                this.party = [];
                this.enemies = [];
                this.room = null;
                this.dungeonLayout = null;
                this.dungeonFloor = 1;
                this.currentDungeon = null;
                this.gold = 0;
                this.blessingCurrency = 0; // Blessing currency for endgame upgrades
                this.loot = [];
                this.inventory = [];
                
                // Keystone system
this.keystones = [];
this.equippedKeystones = {
    tank: null,
    healer: null,
    mage: null,
    rogue: null,
    archer: null,
    paladin: null
};
this.keystoneSlots = {
    tank: true,
    healer: true,
    mage: true,
    rogue: true,
    archer: true,
    paladin: true
};
                
                // Rune system
                this.runes = [];
                this.equippedRunes = {
                    tank: [null, null, null, null, null],
                    healer: [null, null, null, null, null],
                    mage: [null, null, null, null, null],
                    rogue: [null, null, null, null, null],
                    archer: [null, null, null, null, null],
                    paladin: [null, null, null, null, null]
                };
                this.runeSlots = {
                    tank: [false, false, false, false, false],
                    healer: [false, false, false, false, false],
                    mage: [false, false, false, false, false],
                    rogue: [false, false, false, false, false],
                    archer: [false, false, false, false, false],
                    paladin: [false, false, false, false, false]
                };
                
                // Rune Trial Keys
                this.runeTrialKeys = [];
                this.nextRuneTrialKeyId = 1;
                
                // Pet system - each character has their own pet slot
                this.pets = [];
                this.equippedPets = {
                    tank: null,
                    healer: null,
                    mage: null,
                    rogue: null,
                    archer: null,
                    paladin: null
                };
                
// Chest system
                this.playerChests = [];
                this.nextChestId = 1;
                this.successfulRuns = 0;
                
                // Vault Key system
                this.vaultKeys = [];
                this.nextVaultKeyId = 1;
                
                // Keystone system
                this.keystones = [];
                this.nextKeystoneId = 1;
                
                // Loot filter settings - all enabled by default
                this.lootFilter = {
                    common: true,
                    uncommon: true,
                    rare: true,
                    epic: true,
                    legendary: true,
                    minLevel: 1  // Minimum item level to keep
                };
                
// Dungeon loot tables
                this.dungeonLootTables = {
                    umbral: ['amulet', 'ring'],
                    everfall: ['helmet', 'gloves', 'belt', 'boots', 'chest'],
                    stoneforge: ['wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'],
                    vault: ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer']
                };
                
                // Weapon mapping for filtering loot by party composition
                this.weaponClassMapping = {
                    'greatsword': 'Tank',
                    'staff': 'Healer',
                    'wand': 'Mage',
                    'dagger': 'Rogue',
                    'bow': 'Archer',
                    'warhammer': 'Paladin'
                };
                
                this.paused = false;
                this.speed = 1;
                this.inBattle = false;
                this.battleTimer = 0;
                this.movingToNextRoom = false;
                this.transitioningFloor = false;  // Prevent race conditions during floor transitions
                
                // FLOOR JUMPING FIX: Guard timers to prevent multiple setTimeout calls
                this._completeDungeonTimeout = null;
                this._moveNextRoomTimeout = null;
                this._floorCompletionHandled = false;
                this.floorCompleteQueued = false;
                
                // Summary duration setting (in seconds)
                this.summaryDuration = 4;
                
                // Dungeon change cooldown
                this.lastDungeonChangeTime = 0;
                this.dungeonChangeCooldown = 30000; // 30 seconds in milliseconds
                
// Floor statistics tracking
this.floorStats = {
    startTime: null,
    damageDealt: 0,
    enemiesKilled: 0,
    goldEarned: 0,
    lootObtained: 0
};

// Global statistics tracking
this.globalStats = {
                    farthestFloor: 1,
                    legendariesFound: 0,
                    chestsFound: 0,
                    mythicChestsFound: 0,
                    fastestFloorTime: null,
                    totalFloorsCleared: 0,
                    totalGoldEarned: 0,
                    totalDeaths: 0
                };

// Dungeon-specific progress
this.dungeonProgress = {
    everfall: { startFloor: 1, farthestFloor: 1 },
    stoneforge: { startFloor: 1, farthestFloor: 1 },
    umbral: { startFloor: 1, farthestFloor: 1 }
};

this.offsetX = this.canvas.width / 2;
this.offsetY = this.canvas.height / 3;

// Object pooling for floating texts
this.floatingTextPool = [];
this.maxPoolSize = 20;

// Minimap debounce
this._lastMinimapUpdate = 0;
                
                this.init();
                
                // Add mouse tracking for enemy tooltips
                this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
                this.canvas.addEventListener('mouseleave', () => {
                    document.getElementById('enemy-tooltip').classList.remove('show');
                });
                
                this.gameLoop();
                
                // Start helpful tip timer (60 seconds)
                this.helpfulTipTimer = setTimeout(() => {
                    this.checkAndShowHelpfulTip();
                }, 60000); // 60 seconds
            }
            
            checkAndShowHelpfulTip() {
                // Calculate total gear score
                const totalGearScore = this.party.reduce((total, member) => {
                    let memberGearScore = 0;
                    for (const slot in member.equipment) {
                        if (member.equipment[slot]) {
                            memberGearScore += this.calculateGearScore(member.equipment[slot]);
                        }
                    }
                    return total + memberGearScore;
                }, 0);
                
                // Only show if gear score is below 100
                if (totalGearScore < 100) {
                    this.showHelpfulTip();
                }
            }
            
            showHelpfulTip() {
    const tipHTML = `
        <div id="helpful-tip-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.95); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 5000; backdrop-filter: blur(10px); padding: 40px;">
            <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/helpful%20tip.png" style="max-width: 90vw; max-height: 75vh; width: auto; height: auto; border-radius: 16px; box-shadow: 0 20px 80px rgba(0, 0, 0, 0.9); margin-bottom: 20px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;">
            
            <button id="helpful-tip-ok-btn" style="padding: 8px 20px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 3px 12px rgba(16, 185, 129, 0.4); transition: all 0.3s ease; display: inline-block; width: auto;">
    Got It! 🚀
</button>
        </div>
    `;
                
                const div = document.createElement('div');
                div.innerHTML = tipHTML;
                document.body.appendChild(div.firstElementChild);
                
                const btn = document.getElementById('helpful-tip-ok-btn');
                btn.onclick = () => {
                    document.getElementById('helpful-tip-overlay').remove();
                };
                
                // Add hover effect
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'translateY(-3px)';
                    btn.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.6)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                });
            }

            init() {
                // Get selected party (4 characters)
                let selectedParty = ['tank', 'healer', 'mage', 'rogue']; // Default party (4 only)
                const savedParty = localStorage.getItem(LS_KEYS.SELECTED_PARTY);
                if (savedParty) {
                    try {
                        const parsed = JSON.parse(savedParty);
                        if (parsed.length === 4 && parsed.every(c => c !== null)) {
                            selectedParty = parsed;
                        }
                    } catch (e) {
                        console.error('Error loading party selection:', e);
                    }
                }
                
                // Create party based on selected characters
                const classConstructors = {
                    'tank': Tank,
                    'healer': Healer,
                    'mage': Mage,
                    'rogue': Rogue,
                    'archer': Archer,
                    'paladin': Paladin
                };
                
                this.party = selectedParty.map(charClass => new classConstructors[charClass]());
                const charNames = selectedParty; // Use the party selection as character names

// Load and apply skill tree data if it exists
const savedSkillData = localStorage.getItem('skillTreeData');
if (savedSkillData) {
    try {
        const data = JSON.parse(savedSkillData);
        this.party.forEach((member, idx) => {
            const charKey = charNames[idx];
            if (data.characters && data.characters[charKey]) {
                member.skillTreeData = {
                    allocatedNodes: new Set(data.characters[charKey].allocatedNodes || [0]),
                    usedPoints: data.characters[charKey].usedPoints || 0
                };
                member.skillPoints = data.characters[charKey].availablePoints || 0;
                
                // Apply skill tree stats
                this.applySkillTreeStats(member);
                
                // Count and unlock rune slots based on allocated nodes
                let runeSlotCount = 0;
                if (data.characters[charKey].totalStats) {
                    runeSlotCount = data.characters[charKey].totalStats.runeSlots || 0;
                }
                
                // Update rune slots for this character
                for (let i = 0; i < 5; i++) {
                    if (i < runeSlotCount) {
                        this.runeSlots[charKey][i] = true;
                    } else {
                        this.runeSlots[charKey][i] = false;
                    }
                }
                
                // HP and Mana already set correctly by applySkillTreeStats()
            }
        });
    } catch (e) {
        console.error('Error loading initial skill tree data:', e);
    }
}

// Add starter chest (level 1)
this.playerChests.push({
    id: this.nextChestId++,
    level: 1,
    isMythic: false,
    openCost: CHEST_CONFIG.OPEN_COST_MULTIPLIER * 1,
    sellValue: CHEST_CONFIG.SELL_VALUE_MULTIPLIER * 1,
    sourceDungeon: 'everfall',
    foundAtFloor: 1,
    rarityOdds: { ...CHEST_CONFIG.RARITY_DISTRIBUTION }
});


                // Create sprites with formation positions
                const colorMap = {
                    'Tank': '#6b7280',
                    'Healer': '#10b981',
                    'Mage': '#52525b',
                    'Rogue': '#ef4444',
                    'Archer': '#f59e0b',
                    'Paladin': '#3b82f6'
                };
                
                const symbolMap = {
                    'Tank': '🛡',
                    'Healer': '💊',
                    'Mage': '🔮',
                    'Rogue': '🗡',
                    'Archer': '🏹',
                    'Paladin': '⚔️'
                };
                
                // Set up initial formation positions - bottom center of room
                const formations = {
                    0: {x: 5, y: 7}, // Position 0 - front line center bottom
                    1: {x: 3, y: 7}, // Position 1 - back line left
                    2: {x: 4, y: 8}, // Position 2 - back line center
                    3: {x: 6, y: 8}  // Position 3 - back line right
                };
                
                this.party.forEach((member, i) => {
                    const pos = formations[i];
                    const color = colorMap[member.className] || '#6b7280';
                    const symbol = symbolMap[member.className] || '🛡';
                    member.sprite = new CharacterSprite(pos.x, pos.y, color, 'party');
                    member.sprite.classSymbol = symbol;
                    member.sprite.setCombatPosition(pos.x, pos.y);
                });

                // Show dungeon selector
                this.showDungeonSelector();
                
// Setup controls
document.getElementById('pause-btn').onclick = () => this.togglePause();

// Graphics toggle button
const graphicsBtn = document.getElementById('graphics-toggle-btn');
if (graphicsBtn) {
    // Update button text based on current setting
    graphicsBtn.textContent = GRAPHICS_VERSION === 2 ? '✨ Graphics: V2' : '📦 Graphics: V1';
    graphicsBtn.style.background = GRAPHICS_VERSION === 2 
        ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' 
        : 'linear-gradient(135deg, #6b7280, #4b5563)';
    
    graphicsBtn.onclick = () => {
        GRAPHICS_VERSION = GRAPHICS_VERSION === 2 ? 1 : 2;
        localStorage.setItem('graphicsVersion', GRAPHICS_VERSION.toString());
        graphicsBtn.textContent = GRAPHICS_VERSION === 2 ? '✨ Graphics: V2' : '📦 Graphics: V1';
        graphicsBtn.style.background = GRAPHICS_VERSION === 2 
            ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' 
            : 'linear-gradient(135deg, #6b7280, #4b5563)';
        if (window.game) {
            window.game.addLog(`🎨 Graphics switched to V${GRAPHICS_VERSION}`, 'legendary');
        }
    };
}

// Setup damage stats display toggle
const damageStatsDisplay = document.getElementById('damage-stats-display');
const combatStatsContainer = document.getElementById('combat-stats-container');

if (damageStatsDisplay && combatStatsContainer) {
    // Load saved position from localStorage
    const savedPos = localStorage.getItem('combatStatsPosition');
    if (savedPos) {
        try {
            const pos = JSON.parse(savedPos);
            combatStatsContainer.style.left = pos.left;
            combatStatsContainer.style.top = pos.top;
            combatStatsContainer.style.right = 'auto';
            combatStatsContainer.style.bottom = 'auto';
        } catch (e) {
            
        }
    }
    
    // Drag functionality
    let isDragging = false;
    let dragStarted = false;
    let startX, startY, startLeft, startTop;
    
    const onMouseDown = (e) => {
        isDragging = true;
        dragStarted = false;
        
        const rect = combatStatsContainer.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        
        // Remove transform and convert to left/top positioning
        combatStatsContainer.style.transform = 'none';
        combatStatsContainer.style.left = startLeft + 'px';
        combatStatsContainer.style.top = startTop + 'px';
        combatStatsContainer.style.right = 'auto';
        combatStatsContainer.style.bottom = 'auto';
        
        e.preventDefault();
    };
    
    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // If moved more than 5 pixels, consider it a drag
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            if (!dragStarted) {
                dragStarted = true;
                combatStatsContainer.classList.add('dragging');
            }
        }
        
        if (dragStarted) {
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // Keep within window bounds
            const maxLeft = window.innerWidth - combatStatsContainer.offsetWidth;
            const maxTop = window.innerHeight - combatStatsContainer.offsetHeight;
            
            combatStatsContainer.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            combatStatsContainer.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
        }
    };
    
    const onMouseUp = (e) => {
        if (isDragging) {
            isDragging = false;
            combatStatsContainer.classList.remove('dragging');
            
            // Save position to localStorage
            if (dragStarted) {
                localStorage.setItem('combatStatsPosition', JSON.stringify({
                    left: combatStatsContainer.style.left,
                    top: combatStatsContainer.style.top
                }));
                
                // Prevent click event from firing after drag
                e.stopPropagation();
            } else {
                // It was a click, not a drag - toggle stats display
                this.toggleCharacterStatsDisplay();
            }
        }
    };
    
    damageStatsDisplay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Double-click to reset position
    damageStatsDisplay.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        localStorage.removeItem('combatStatsPosition');
        combatStatsContainer.style.left = 'auto';
        combatStatsContainer.style.top = '50%';
        combatStatsContainer.style.right = '20px';
        combatStatsContainer.style.bottom = 'auto';
        combatStatsContainer.style.transform = 'translateY(-50%)';
        
        // Show feedback
        const originalText = damageStatsDisplay.innerHTML;
        damageStatsDisplay.innerHTML = '<span style="opacity: 0.5; margin-right: 4px;">⋮⋮</span>📍 Reset!';
        setTimeout(() => {
            damageStatsDisplay.innerHTML = originalText;
        }, 1000);
    });
}

// Setup collapse all button
document.getElementById('collapse-all-btn').onclick = () => {
    const sections = document.querySelectorAll('.collapsible-section');
    const allCollapsed = Array.from(sections).every(s => s.classList.contains('collapsed'));
    
    sections.forEach(section => {
        if (allCollapsed) {
            section.classList.remove('collapsed');
        } else {
            section.classList.add('collapsed');
        }
    });
    
    document.getElementById('collapse-all-btn').textContent = allCollapsed ? 'Collapse All' : 'Expand All';
};

// Setup reset account button in controls tab
document.getElementById('reset-account-controls-btn').onclick = () => {
    resetAccount();
};

// Add keyboard handlers
document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    
    // Don't trigger hotkeys when typing in input fields
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );
    
    if (isTyping) {
        return; // User is typing, don't handle hotkeys
    }
    
    if (e.key === 'Escape') {
        if (this.skillTreeOpen) {
            this.closeSkillTree();
        } else if (this.currentDungeon === 'vault' && this.inBattle) {
            if (confirm('Forfeit and leave the Vault?')) {
                this.endBattle(false);
            }
        }
    } else if (e.key === 'k' || e.key === 'K') {
        if (!this.skillTreeOpen && !this._skillTreeTransitioning) {
            this._skillTreeTransitioning = true;
            this.openSkillTree(0);
            setTimeout(() => {
                this._skillTreeTransitioning = false;
            }, 500);
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'k' || e.key === 'K') {
        this._skillTreeKeyPressed = false;
    }
});

                
// Setup fountain popup toggle
                const fountainPopupToggle = document.getElementById('show-fountain-popup');
                this.fountainPopupEnabled = fountainPopupToggle.checked; // Read initial state from checkbox
                fountainPopupToggle.addEventListener('change', (e) => {
                    this.fountainPopupEnabled = e.target.checked;
                });
                
                // Setup treasure popup toggle
                const treasurePopupToggle = document.getElementById('show-treasure-popup');
                this.treasurePopupEnabled = treasurePopupToggle.checked;
                treasurePopupToggle.addEventListener('change', (e) => {
                    this.treasurePopupEnabled = e.target.checked;
                });
                
                // Setup summary duration slider
                const slider = document.getElementById('summary-duration-slider');
                const valueDisplay = document.getElementById('summary-duration-value');
                slider.addEventListener('input', (e) => {
                    this.summaryDuration = parseInt(e.target.value);
                    valueDisplay.textContent = `${this.summaryDuration}s`;
                });
                
                // Setup loot filter checkboxes
                document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const rarity = checkbox.getAttribute('data-rarity');
                        this.lootFilter[rarity] = checkbox.checked;
                        
                        // Log the change
                        if (checkbox.checked) {
                            this.addLog(`Loot filter: ${rarity} items will be collected`, 'room');
                        } else {
                            this.addLog(`Loot filter: ${rarity} items will auto-sell`, 'room');
                        }
                    });
                });
                
                // Setup level filter input
                const levelFilter = document.getElementById('min-level-filter');
                if (levelFilter) {
                    levelFilter.addEventListener('input', (e) => {
                        const value = parseInt(e.target.value) || 1;
                        this.lootFilter.minLevel = Math.max(1, Math.min(999, value));
                        this.addLog(`Loot filter: Auto-selling items below level ${this.lootFilter.minLevel}`, 'room');
                    });
                }
                
// Setup party name inputs - dynamically match to party members by class
const nameInputs = {
    'tank': 'name-tank',
    'healer': 'name-healer',
    'mage': 'name-mage',
    'rogue': 'name-rogue',
    'archer': 'name-archer',
    'paladin': 'name-paladin'
};

Object.entries(nameInputs).forEach(([className, inputId]) => {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', (e) => {
            // Find the party member with this class
            const member = this.party.find(m => m.className.toLowerCase() === className);
            if (member) {
                member.name = e.target.value || member.className;
                this.rebuildUI();
            }
        });
    }
});
                
                // Setup tab navigation
                document.querySelectorAll('.tab-button').forEach(button => {
                    button.addEventListener('click', () => {
                        const tabName = button.getAttribute('data-tab');
                        this.switchTab(tabName);
                    });
                });
                
                // Setup keystone/rune sub-tab switching - INITIALIZE ON LOAD
                document.querySelectorAll('.keystone-sub-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        // Remove active from all tabs
                        document.querySelectorAll('.keystone-sub-tab').forEach(t => t.classList.remove('active'));
                        document.querySelectorAll('.keystone-section').forEach(s => s.style.display = 'none');
                        
                        // Activate clicked tab
                        tab.classList.add('active');
                        const targetSection = tab.getAttribute('data-keystone-tab');
                        document.getElementById(`keystone-${targetSection}-section`).style.display = 'block';
                        
                        // If switching to runes, generate tabs and show the first party character
                        if (targetSection === 'runes') {
                            this.generateRuneTabs();
                            const firstChar = this.party[0].className.toLowerCase();
                            this.showRunesForCharacter(firstChar);
                        }
                    });
                });
                
                // Setup cache sub-tab switching - INITIALIZE ON LOAD
                document.querySelectorAll('.cache-sub-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        // Remove active from all tabs
                        document.querySelectorAll('.cache-sub-tab').forEach(t => t.classList.remove('active'));
                        document.querySelectorAll('.cache-section').forEach(s => s.style.display = 'none');
                        
                        // Activate clicked tab
                        tab.classList.add('active');
                        const targetSection = tab.getAttribute('data-cache-tab');
                        document.getElementById(`cache-${targetSection}-section`).style.display = 'block';
                        
                        // Refresh display when switching tabs
                        this.showChests();
                    });
                });
                // Setup loot filter buttons
                document.querySelectorAll('.loot-filter-btn').forEach(btn => {
                    btn.onclick = () => {
                        const filter = btn.getAttribute('data-filter');
                        const index = this.lootSortBy.indexOf(filter);
                        
                        if (index === -1) {
                            this.lootSortBy.push(filter);
                            btn.classList.add('active');
                        } else {
                            this.lootSortBy.splice(index, 1);
                            btn.classList.remove('active');
                        }
                        
                        this.showLoot();
                    };
                });
                
                // Setup Auto-Equip All button
                
                // Setup inventory filter buttons
                document.querySelectorAll('.inventory-filter-btn').forEach(btn => {
                    btn.onclick = () => {
                        const filter = btn.getAttribute('data-filter');
                        const index = this.inventorySortBy.indexOf(filter);
                        
                        if (index === -1) {
                            this.inventorySortBy.push(filter);
                            btn.classList.add('active');
                        } else {
                            this.inventorySortBy.splice(index, 1);
                            btn.classList.remove('active');
                        }
                        
                        this.showInventory();
                    };
                });
                
                // Setup Sell All inventory button
                const sellAllBtn = document.getElementById('sell-all-inventory-btn');
                if (sellAllBtn) {
                    sellAllBtn.onclick = () => {
                        if (this.inventory.length === 0) {
                            this.addLog('Inventory is empty!', 'damage');
                            return;
                        }
                        const count = this.inventory.length;
                        const sellPrices = { common: 5, uncommon: 10, rare: 15, epic: 20, legendary: 25, mythic: 10000, pinnacle: 50000 };
                        let totalGold = 0;
                        this.inventory.forEach(item => {
                            totalGold += sellPrices[item.rarity] || 5;
                        });
                        if (confirm(`Sell all ${count} inventory items for ${totalGold}g?`)) {
                            this.gold += totalGold;
                            this.inventory = [];
                            this.addLog(`Sold ${count} items for ${totalGold}g!`, 'loot');
                            this.updateUI();
                            this.showInventory();
                        }
                    };
                }
                
                // Setup loot sub-tab switching
                document.querySelectorAll('.loot-sub-tab').forEach(tab => {
                    tab.onclick = () => {
                        const targetTab = tab.getAttribute('data-loot-tab');
                        
                        // Hide any visible tooltips when switching loot sub-tabs
                        const lootTooltip = document.getElementById('loot-tooltip');
                        if (lootTooltip) lootTooltip.classList.remove('show');
                        
                        // Update active states
                        document.querySelectorAll('.loot-sub-tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        
                        // Show correct section
                        document.querySelectorAll('.loot-section').forEach(s => s.style.display = 'none');
                        document.getElementById(`loot-${targetTab}-section`).style.display = 'block';
                    };
                });
                // Setup dungeon selection (both modal and tab versions)
                document.querySelectorAll('.dungeon-option, .dungeon-card').forEach(option => {
                    option.onclick = () => {
                        const dungeonType = option.getAttribute('data-dungeon');
                        
                        // Prevent changing dungeons while in Divine Arena
                        if (this.currentDungeon === 'endlessblessings') {
                            this.addLog('⚠️ Cannot change dungeons during Divine Arena run! Use End Run button.', 'damage');
                            return;
                        }
                        
                        this.selectDungeon(dungeonType);
                    };
                });
                
                // Hide tooltips on scroll in loot/inventory containers
                const lootContainer = document.getElementById('loot-container');
                const inventoryContainer = document.getElementById('inventory-container');
                const keystonesContainer = document.getElementById('keystones-collection-container');
                
                [lootContainer, inventoryContainer, keystonesContainer].forEach(container => {
                    if (container) {
                        container.addEventListener('scroll', () => {
                            const lootTooltip = document.getElementById('loot-tooltip');
                            if (lootTooltip) lootTooltip.classList.remove('show');
                            const equipTooltip = document.getElementById('equipment-tooltip');
                            if (equipTooltip) equipTooltip.classList.remove('show');
                        });
                    }
                });
            }

            switchTab(tabName) {
                // Hide any visible tooltips when switching tabs
                const lootTooltip = document.getElementById('loot-tooltip');
                if (lootTooltip) lootTooltip.classList.remove('show');
                const equipTooltip = document.getElementById('equipment-tooltip');
                if (equipTooltip) equipTooltip.classList.remove('show');
                
                // Remove active class from all buttons and panels
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                
                // Add active class to selected button and panel
                const button = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
                const panel = document.getElementById(`${tabName}-tab`);
                
                if (button) button.classList.add('active');
                if (panel) panel.classList.add('active');
                
// Update displays when switching to certain tabs
                if (tabName === 'inventory') {
                    this.showInventory();
                } else if (tabName === 'loot') {
                    this.showLoot();
                } else if (tabName === 'chests') {
                    this.showChests();
                } else if (tabName === 'keystones') {
                    this.showKeystones();
                } else if (tabName === 'pets') {
                    this.showPetsCollection();
                }
            }

            getFilteredLootTable(baseLootTable) {
                // Filter the loot table to only include items that can be equipped by party members
                const validWeaponTypes = new Set();
                
                // Get all weapon types that party members can use
                this.party.forEach(member => {
                    for (const [weaponType, className] of Object.entries(this.weaponClassMapping)) {
                        if (member.className === className) {
                            validWeaponTypes.add(weaponType);
                        }
                    }
                });
                
                // Filter the loot table
                return baseLootTable.filter(itemType => {
                    // If it's a weapon, only include it if someone can use it
                    if (this.weaponClassMapping[itemType]) {
                        return validWeaponTypes.has(itemType);
                    }
                    // Non-weapon items (armor, accessories) are always valid
                    return true;
                });
            }

            showStartupTip() {
                const tipHTML = `
                    <div id="startup-tip-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.95); display: flex; justify-content: center; align-items: center; z-index: 5000; backdrop-filter: blur(10px);">
                        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%); border: 3px solid rgba(99, 102, 241, 0.5); border-radius: 20px; padding: 40px; max-width: 1200px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9); position: relative;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h2 style="font-family: 'Orbitron', sans-serif; font-size: 32px; color: #f59e0b; text-shadow: 0 4px 20px rgba(245, 158, 11, 0.5); margin-bottom: 10px;">💡 Helpful Tip 💡</h2>
                                <div style="width: 100px; height: 3px; background: linear-gradient(90deg, transparent, #f59e0b, transparent); margin: 0 auto;"></div>
                            </div>
                            
                            <div style="text-align: center; margin-bottom: 30px;">
                                <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/helpful%20tip.png" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);">
                            </div>
                            
                            <button id="startup-tip-ok-btn" style="width: 100%; padding: 18px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
                                Got It! Let's Go! 🚀
                            </button>
                        </div>
                    </div>
                `;
                
                const div = document.createElement('div');
                div.innerHTML = tipHTML;
                document.body.appendChild(div.firstElementChild);
                
                document.getElementById('startup-tip-ok-btn').onclick = () => {
                    document.getElementById('startup-tip-overlay').remove();
                    this.showDungeonSelector();
                };
                
                // Add hover effect
                const btn = document.getElementById('startup-tip-ok-btn');
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'translateY(-3px)';
                    btn.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.6)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                });
            }

            showDungeonSelector() {
                // CRITICAL FIX: Hide any visible tooltips when showing dungeon selector
                const lootTooltip = document.getElementById('loot-tooltip');
                if (lootTooltip) {
                    lootTooltip.classList.remove('show');
                    lootTooltip.style.display = 'none';
                }
                
                // CLEANUP: Clear any leftover state from previous dungeon
                this.enemies = [];
                this.inBattle = false;
                
                // Clear enemy health bars
                const healthBarContainer = document.getElementById('enemy-health-bars');
                if (healthBarContainer) {
                    healthBarContainer.innerHTML = '';
                }
                
                // Show minimap (it may have been hidden in endless mode)
                const minimapCanvas = document.getElementById('map-canvas');
                if (minimapCanvas) {
                    minimapCanvas.style.display = 'block';
                }
                
                // Hide kill counter (it's only for endless mode)
                const killCounter = document.getElementById('kill-counter');
                if (killCounter) {
                    killCounter.style.display = 'none';
                }
                
                // Hide End Run button when returning to dungeon selector
                const endRunBtn = document.getElementById('end-run-btn');
                if (endRunBtn) {
                    endRunBtn.style.display = 'none';
                }
                
                // Hide combat stats container when returning to dungeon selector
                const combatStatsContainer = document.getElementById('combat-stats-container');
                if (combatStatsContainer) {
                    combatStatsContainer.style.display = 'none';
                }
                
                // Create the banner selector using individual banner images
                const selectorHTML = `
                    <div id="dungeon-banner-selector">
                        <div id="select-dungeon-title">SELECT YOUR DUNGEON</div>
                        <div id="dungeon-banner-container">
                            <div class="dungeon-banner everfall" data-dungeon="everfall" style="background: url('https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/everfall%20banner.png') center/cover;"></div>
                            <div class="dungeon-banner stoneforge" data-dungeon="stoneforge" style="background: url('https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/stoneforge%20banner.png') center/cover;"></div>
                            <div class="dungeon-banner umbral" data-dungeon="umbral" style="background: url('https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/umbral%20depths.png') center/cover;"></div>
                            <div class="dungeon-banner vault" data-dungeon="vault" style="background: url('https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/the%20vault.png') center/cover; ${this.vaultKeys.length === 0 ? 'filter: grayscale(100%) brightness(0.5); opacity: 0.6;' : ''}"></div>
                            <div class="dungeon-banner runetrial" data-dungeon="runetrial" style="background: url('https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/rune%20trials.png') center/cover; ${this.runeTrialKeys.length === 0 ? 'filter: grayscale(100%) brightness(0.5); opacity: 0.6;' : ''}"></div>
                        </div>
                    </div>
                `;
                
                // Add to document
                const div = document.createElement('div');
                div.innerHTML = selectorHTML;
                document.body.appendChild(div.firstElementChild);
                
               // Setup click handlers
document.querySelectorAll('.dungeon-banner').forEach(banner => {
    banner.onclick = () => {
        const dungeonType = banner.getAttribute('data-dungeon');
        
        // Check for required keys before closing selector
        if (dungeonType === 'vault' && this.vaultKeys.length === 0) {
            this.addLog('🔒 You need a Vault Key to enter! Keys drop from clearing floors (10% chance).', 'room');
            return;
        }
        
        if (dungeonType === 'runetrial' && this.runeTrialKeys.length === 0) {
            this.addLog('🔒 You need a Rune Trial Key to enter! Keys drop from floor 45+ (10% chance).', 'room');
            return;
        }
        
        document.getElementById('dungeon-banner-selector').remove();
        this.selectDungeon(dungeonType);
    };
});
                
                this.paused = true;
            }

            endDivineArenaRun() {
                // Only allow ending if we're actually in Divine Arena
                if (this.currentDungeon !== 'endlessblessings') {
                    return;
                }
                
                // Show the Divine Arena summary screen
                this.showEndlessSummary();
            }
            
            showEndlessSummary() {
                // CRITICAL FIX: Hide any visible tooltips immediately when showing summary
                const lootTooltip = document.getElementById('loot-tooltip');
                if (lootTooltip) {
                    lootTooltip.classList.remove('show');
                    lootTooltip.style.display = 'none';
                }
                
                const killCount = this.endlessKillCount || 0;
                const wave = this.endlessWave || 1;
                
                // Calculate blessings earned during this run
                const blessingsEarned = (this.blessingCurrency || 0) - (this.endlessRunStartBlessings || 0);
                
                // Get loot collected during this run
                const lootCollected = this.endlessRunLoot || [];
                
                // Calculate time taken (if tracking exists)
                let timeString = 'N/A';
                if (this.floorStats && this.floorStats.startTime) {
                    const timeElapsed = Math.floor((Date.now() - this.floorStats.startTime) / 1000);
                    const minutes = Math.floor(timeElapsed / 60);
                    const seconds = timeElapsed % 60;
                    timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
                
                // Determine performance tier based on kills
                let performanceTier = '';
                let tierColor = '';
                let tierGlow = '';
                if (killCount >= 200) {
                    performanceTier = '🌌 TRANSCENDENT';
                    tierColor = '#c084fc';
                    tierGlow = 'rgba(168, 85, 247, 0.6)';
                } else if (killCount >= 180) {
                    performanceTier = '👑 ULTIMATE';
                    tierColor = '#fbbf24';
                    tierGlow = 'rgba(251, 191, 36, 0.6)';
                } else if (killCount >= 160) {
                    performanceTier = '✨ GODLY';
                    tierColor = '#f472b6';
                    tierGlow = 'rgba(244, 114, 182, 0.6)';
                } else if (killCount >= 140) {
                    performanceTier = '🔮 MYTHIC';
                    tierColor = '#ec4899';
                    tierGlow = 'rgba(236, 72, 153, 0.6)';
                } else if (killCount >= 120) {
                    performanceTier = '💎 LEGENDARY';
                    tierColor = '#8b5cf6';
                    tierGlow = 'rgba(139, 92, 246, 0.6)';
                } else if (killCount >= 100) {
                    performanceTier = '🌟 MASTERWORK';
                    tierColor = '#6366f1';
                    tierGlow = 'rgba(99, 102, 241, 0.6)';
                } else if (killCount >= 80) {
                    performanceTier = '⭐ EXCEPTIONAL';
                    tierColor = '#fbbf24';
                    tierGlow = 'rgba(251, 191, 36, 0.5)';
                } else if (killCount >= 60) {
                    performanceTier = '💫 ELITE';
                    tierColor = '#ec4899';
                    tierGlow = 'rgba(236, 72, 153, 0.5)';
                } else if (killCount >= 40) {
                    performanceTier = '🔥 SUPERIOR';
                    tierColor = '#f59e0b';
                    tierGlow = 'rgba(245, 158, 11, 0.5)';
                } else if (killCount >= 20) {
                    performanceTier = '⚡ ENHANCED';
                    tierColor = '#a855f7';
                    tierGlow = 'rgba(168, 85, 247, 0.5)';
                } else {
                    performanceTier = '⚔️ WARRIOR';
                    tierColor = '#10b981';
                    tierGlow = 'rgba(16, 185, 129, 0.5)';
                }
                
                // Build character stats HTML
                let characterStatsHTML = '';
                if (this.characterStats) {
                    const sortedByDamage = Object.entries(this.characterStats)
                        .sort((a, b) => b[1].damageDealt - a[1].damageDealt);
                    
                    characterStatsHTML = `
                        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(99, 102, 241, 0.2);">
                            <div style="font-size: 18px; color: #e2e8f0; font-weight: 700; margin-bottom: 15px; text-align: center; font-family: 'Orbitron', sans-serif;">Character Performance</div>
                            ${sortedByDamage.map(([name, stats]) => `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                    <span style="color: #94a3b8; font-weight: 500;">${name}:</span>
                                    <div style="text-align: right;">
                                        <div style="color: #ef4444; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 13px;">
                                            💥 ${stats.damageDealt.toLocaleString()}
                                        </div>
                                        <div style="color: #10b981; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 13px;">
                                            💚 ${stats.healingDone.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                // Build loot HTML
                let lootHTML = '';
                if (lootCollected.length > 0) {
                    const rarityColors = {
                        common: '#9ca3af',
                        uncommon: '#10b981',
                        rare: '#3b82f6',
                        epic: '#a855f7',
                        legendary: '#f59e0b',
                        mythic: '#ec4899'
                    };
                    
                    lootHTML = `
                        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(99, 102, 241, 0.2);">
                            <div style="font-size: 18px; color: #f59e0b; font-weight: 700; margin-bottom: 15px; text-align: center; font-family: 'Orbitron', sans-serif; text-transform: uppercase; letter-spacing: 2px;">
                                Bonus Loot (${lootCollected.length} Items)
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">
                                ${lootCollected.map(item => `
                                    <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9)); border: 2px solid ${rarityColors[item.rarity]}; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 0 15px ${rarityColors[item.rarity]}40;">
                                        <div style="color: ${rarityColors[item.rarity]}; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">${item.rarity}</div>
                                        <div style="color: #e2e8f0; font-weight: 600; font-size: 13px; margin-bottom: 2px;">${item.name}</div>
                                        <div style="color: #94a3b8; font-size: 11px;">Lvl ${item.level}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                
                // Create custom Divine Arena summary overlay
                const overlay = document.createElement('div');
                overlay.id = 'divine-arena-summary-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: radial-gradient(ellipse at center, ${tierGlow} 0%, rgba(0, 0, 0, 0.95) 70%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 2000;
                    backdrop-filter: blur(20px);
                    animation: fadeIn 0.3s ease;
                `;
                
                const panel = document.createElement('div');
                panel.style.cssText = `
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%);
                    border: 3px solid ${tierColor};
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 700px;
                    width: 90%;
                    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 60px ${tierGlow}, inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    animation: slideUp 0.4s ease;
                `;
                
                panel.innerHTML = `
                    <div style="font-family: 'Orbitron', sans-serif; font-size: 48px; font-weight: 800; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 4px; color: ${tierColor}; text-shadow: 0 0 40px ${tierGlow}; animation: titlePulse 2s ease-in-out infinite;">
                        DIVINE ARENA
                    </div>
                    
                    <div style="text-align: center; font-size: 28px; color: ${tierColor}; font-weight: 800; margin-bottom: 25px; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px ${tierGlow};">
                        ${performanceTier}
                    </div>
                    
                    <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid rgba(99, 102, 241, 0.2);">
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                            <span style="color: #94a3b8; font-weight: 500;">Total Kills:</span>
                            <span style="color: ${tierColor}; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 20px;">${killCount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                            <span style="color: #94a3b8; font-weight: 500;">Waves Completed:</span>
                            <span style="color: #a855f7; font-weight: 700; font-family: 'Orbitron', sans-serif;">${wave}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                            <span style="color: #94a3b8; font-weight: 500;">Final Enemy Level:</span>
                            <span style="color: #ef4444; font-weight: 700; font-family: 'Orbitron', sans-serif;">${this.endlessEnemyLevel || 60}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                            <span style="color: #94a3b8; font-weight: 500;">Blessings Earned:</span>
                            <span style="color: #fbbf24; font-weight: 700; font-family: 'Orbitron', sans-serif;">${blessingsEarned.toLocaleString()} ✨</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                            <span style="color: #94a3b8; font-weight: 500;">Time Survived:</span>
                            <span style="color: #e2e8f0; font-weight: 700; font-family: 'Orbitron', sans-serif;">${timeString}</span>
                        </div>
                    </div>
                    
                    ${lootHTML}
                    
                    ${characterStatsHTML}
                    
                    <button id="divine-arena-summary-btn" style="width: 100%; padding: 18px; background: linear-gradient(135deg, ${tierColor}, rgba(99, 102, 241, 0.8)); color: white; border: none; border-radius: 12px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s ease; box-shadow: 0 4px 20px ${tierGlow}; position: relative; overflow: hidden;">
                        Return to Dungeon Selector
                    </button>
                `;
                
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
                
                // Add animations via style tag
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(50px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes titlePulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.8; }
                    }
                `;
                document.head.appendChild(style);
                
                // Button click handler
                const button = document.getElementById('divine-arena-summary-btn');
                button.onclick = () => {
                    // STEAM: Track Divine Arena kills for achievements
                    if (window.trackStat && this.endlessKillCount > 0) {
                        window.trackStat('endlessKills', this.endlessKillCount);
                    }
                    
                    // CRITICAL: Save kill count to localStorage BEFORE clearing it
                    localStorage.setItem(LS_KEYS.CURRENT_ENDLESS_KILLS, this.endlessKillCount.toString());
                    
                    // Submit to leaderboard immediately so stats are current
                    if (window.submitToLeaderboard) {
                        window.submitToLeaderboard();
                    }
                    
                    overlay.remove();
                    style.remove();
                    
                    // Clear Divine Arena specific state
                    this.endlessKillCount = 0;
                    this.endlessWave = 1;
                    this.endlessEnemyLevel = 70;
                    this.endlessEnemiesKilledThisWave = 0;
                    
                    // Clear current dungeon
                    this.currentDungeon = null;
                    this.dungeonFloor = 1;
                    
                    // Show dungeon selector (this will handle all cleanup)
                    this.showDungeonSelector();
                };
            }


            setDungeonBackground(dungeonType, imageUrl) {


    const mainView = document.getElementById('main-view');
    if (!mainView) {
        console.error('❌ main-view element not found!');
        return;
    }
    
    // Built-in backgrounds
    const backgrounds = {
    everfall: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Everfall%20HD.png',
    stoneforge: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Stoneforge%20HD.png',
    umbral: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/umbral%20depths1.png', // <- Change this line
    vault: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault.png',
    runetrial: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/runetrial.png'
};
    
    // Use provided imageUrl or fall back to dungeon-specific background
    const finalImageUrl = imageUrl || backgrounds[dungeonType];
    
    if (!finalImageUrl) {
        // No background - use default gradient
        
        mainView.style.backgroundImage = '';
        mainView.style.backgroundColor = 'linear-gradient(135deg, #0a0e27 0%, #151935 100%)';
        return;
    }
    
    // Set the background with dark overlay
    
    
    mainView.style.backgroundColor = '#0a0e27';
    
    // Special divine golden overlay for Divine Arena (toned down)
    if (dungeonType === 'endlessblessings') {
        mainView.style.backgroundImage = `
            linear-gradient(180deg, 
                rgba(184, 134, 11, 0.25) 0%,    /* Darker goldenrod at top */
                rgba(218, 165, 32, 0.2) 25%,    /* Muted goldenrod */
                rgba(160, 130, 50, 0.25) 50%,   /* Subdued gold middle */
                rgba(139, 115, 45, 0.3) 75%,    /* Dark muted gold */
                rgba(80, 70, 40, 0.4) 100%      /* Very dark gold-brown bottom */
            ),
            radial-gradient(ellipse at center, rgba(200, 160, 50, 0.15) 0%, transparent 70%),  /* Subtle golden glow from center */
            url('${finalImageUrl}')
        `;
        // Add gentle pulsing animation for divine effect (6s for better performance)
        mainView.style.animation = 'endlessBlessingsPulse 6s ease-in-out infinite';
    } else {
        mainView.style.backgroundImage = `
            linear-gradient(180deg, rgba(6, 9, 23, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%),
            url('${finalImageUrl}')
        `;
        mainView.style.animation = '';
    }
    
    mainView.style.backgroundSize = 'cover';
    mainView.style.backgroundPosition = 'center';
    mainView.style.backgroundRepeat = 'no-repeat';


}
openSkillTree(characterIndex) {
    if (this.skillTreeOpen) return;
    
    this.skillTreeOpen = true;
    this.currentSkillTreeCharacter = characterIndex;
    this.paused = true;
    
    // Store current game data
    // FIX: Use member.className.toLowerCase() instead of hardcoded party order
    const gameData = {
        characters: {},
        partyComposition: [] // NEW: Store which characters are in the party
    };
    
    this.party.forEach((member, idx) => {
        const charKey = member.className.toLowerCase();
        gameData.characters[charKey] = {
            allocatedNodes: Array.from(member.skillTreeData.allocatedNodes),
            usedPoints: member.skillTreeData.usedPoints,
            availablePoints: member.skillPoints
        };
        // Store the character class name and display info
        gameData.partyComposition.push({
            index: idx,
            key: charKey,
            name: member.className,
            classSymbol: member.classSymbol
        });
    });
    
    localStorage.setItem('gameSkillTreeData', JSON.stringify(gameData));
    localStorage.setItem('currentCharacterIndex', characterIndex.toString());
    
    // Create iframe with skill tree HTML
    const container = document.createElement('div');
    container.id = 'skill-tree-container';
    container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 3000; background: #000;';
    
    this.skillTreeFrame = document.createElement('iframe');
    this.skillTreeFrame.style.cssText = 'width: 100%; height: 100%; border: none;';
    
    // Load the skill tree HTML as a data URL
    const skillTreeHTML = this.getSkillTreeHTML();
    const blob = new Blob([skillTreeHTML], { type: 'text/html' });
    const dataUrl = URL.createObjectURL(blob);
    this.skillTreeFrame.src = dataUrl;
    
    // Clean up blob URL after load and monitor for close
    this.skillTreeFrame.onload = () => {
        URL.revokeObjectURL(dataUrl);
        
        // Poll for close request since postMessage doesn't work with blob URLs
        this._closeCheckInterval = setInterval(() => {
            if (localStorage.getItem('skillTreeCloseRequested') === 'true') {
                localStorage.removeItem('skillTreeCloseRequested');
                clearInterval(this._closeCheckInterval);
                this.closeSkillTree();
            }
        }, 100);
    };
    
    container.appendChild(this.skillTreeFrame);
    document.body.appendChild(container);
    
    // Listen for close messages (remove old listener first to prevent duplicates)
    if (this._skillTreeMessageHandler) {
        window.removeEventListener('message', this._skillTreeMessageHandler);
    }
    this._skillTreeMessageHandler = (e) => this.handleSkillTreeMessage(e);
    window.addEventListener('message', this._skillTreeMessageHandler);
}
            
            getSkillTreeHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skill Tree Viewer</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght=400;600;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Orbitron', sans-serif;
            background: linear-gradient(135deg, #0a0e27 0%, #151935 100%);
            color: #fff;
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        #header {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%);
            border-bottom: 2px solid rgba(99, 102, 241, 0.3);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            backdrop-filter: blur(10px);
            position: relative;
            z-index: 100;
        }
        
        #header-left {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        #header-right {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        #character-tabs {
            display: flex;
            gap: 5px;
            background: rgba(30, 41, 59, 0.5);
            padding: 5px;
            border-radius: 12px;
        }
        
        .character-tab {
            padding: 10px 20px;
            background: transparent;
            color: #94a3b8;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .character-tab:hover {
            background: rgba(99, 102, 241, 0.1);
            color: #e2e8f0;
        }
        
        .character-tab.active {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #fff;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        
        .character-tab .points-indicator {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #f59e0b;
            color: #000;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
        }
        
        #skill-points {
            font-size: 18px;
            color: #f59e0b;
            text-shadow: 0 2px 10px rgba(245, 158, 11, 0.5);
            min-width: 180px;
            text-align: center;
        }
        
        #stats-panel {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%);
    border: 2px solid rgba(99, 102, 241, 0.5);
    padding: 20px 24px;
    border-radius: 16px;
    width: 320px;
    min-height: 200px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    position: relative;
}

#rune-inventory-panel {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%);
    border: 2px solid rgba(168, 85, 247, 0.5);
    padding: 20px 24px;
    border-radius: 16px;
    width: 320px;
    min-height: 200px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 20px 60px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    position: relative;
    margin-left: 15px;
}

#rune-inventory-title {
    color: #a855f7;
    font-weight: 700;
    font-size: 16px;
    border-bottom: 1px solid rgba(168, 85, 247, 0.3);
    padding-bottom: 8px;
    margin-bottom: 6px;
    text-align: center;
    text-shadow: 0 2px 10px rgba(168, 85, 247, 0.3);
}

#rune-inventory-content {
    overflow-y: auto;
    flex: 1;
}

#no-runes {
    color: #64748b;
    font-style: italic;
    font-size: 12px;
    text-align: center;
    padding: 10px 0;
}

.rune-inventory-item {
    background: rgba(168, 85, 247, 0.1);
    border: 2px solid rgba(168, 85, 247, 0.3);
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.rune-inventory-item:hover {
    background: rgba(168, 85, 247, 0.2);
    border-color: rgba(168, 85, 247, 0.5);
    transform: translateX(3px);
}

.rune-inventory-item.selected {
    background: rgba(168, 85, 247, 0.3);
    border-color: #a855f7;
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
}

.rune-name {
    font-weight: 700;
    font-size: 13px;
    color: #c4b5fd;
    margin-bottom: 4px;
}

.rune-stats {
    font-size: 11px;
    color: #e2e8f0;
    line-height: 1.4;
}

.rune-level {
    font-size: 10px;
    color: #f59e0b;
    margin-top: 4px;
}

.rune-equipped-indicator {
    display: inline-block;
    background: #10b981;
    color: #fff;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 6px;
    font-weight: 600;
}
        
        #stats-title {
            color: #f59e0b;
            font-weight: 700;
            font-size: 16px;
            border-bottom: 1px solid rgba(99, 102, 241, 0.3);
            padding-bottom: 8px;
            margin-bottom: 6px;
            text-align: center;
            text-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
        }
        
        #stats-content {
            overflow-y: auto;
            flex: 1;
        }
        
        .stat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            margin-bottom: 6px;
            background: rgba(99, 102, 241, 0.05);
            border-radius: 8px;
            border-left: 3px solid transparent;
            transition: all 0.3s ease;
            font-size: 13px;
            color: #94a3b8;
        }
        
        .stat-row:hover {
            background: rgba(99, 102, 241, 0.1);
            border-left-color: #6366f1;
            transform: translateX(5px);
        }
        
        .stat-name {
            color: #cbd5e1;
            font-weight: 500;
        }
        
        .stat-value {
            color: #10b981;
            font-weight: 700;
            text-shadow: 0 1px 5px rgba(16, 185, 129, 0.3);
        }
        
        .stat-value.negative {
            color: #ef4444;
            text-shadow: 0 1px 5px rgba(239, 68, 68, 0.3);
        }
        
        #no-stats {
            color: #64748b;
            font-style: italic;
            font-size: 12px;
            text-align: center;
            padding: 10px 0;
        }
        
        .header-btn {
            padding: 14px 28px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
            position: relative;
            overflow: hidden;
        }
        
        .header-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }
        
        .header-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 30px rgba(16, 185, 129, 0.6);
        }
        
        .header-btn:hover::before {
            left: 100%;
        }
        
        .header-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 15px rgba(16, 185, 129, 0.4);
        }
        
        .header-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        

#close-circle-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.7);
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5);
    transform: scale(1.1);
}

#close-circle-btn:active {
    transform: scale(0.95);
}
        
        .save-notification {
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 15px 30px;
            border-radius: 12px;
            font-family: 'Orbitron', sans-serif;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 2000;
        }
        
        .save-notification.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        
        #canvas-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        
        #skill-tree-canvas {
            width: 100%;
            height: 100%;
            cursor: grab;
        }
        
        #skill-tree-canvas:active {
            cursor: grabbing;
        }
        
        #tooltip {
            position: absolute;
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%);
            border: 2px solid rgba(99, 102, 241, 0.5);
            border-radius: 12px;
            padding: 16px;
            font-size: 14px;
            pointer-events: none;
            display: none;
            z-index: 1000;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
            min-width: 200px;
        }
        
        #tooltip.show {
            display: block;
        }
        
        .tooltip-header {
            font-weight: 700;
            margin-bottom: 8px;
            font-size: 16px;
        }
        
        .tooltip-stats {
            color: #94a3b8;
            line-height: 1.6;
        }
        
        .tooltip-cost {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(99, 102, 241, 0.3);
            color: #f59e0b;
        }
        
        #controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            padding: 10px 20px;
            border-radius: 20px;
            border: 1px solid rgba(99, 102, 241, 0.3);
            display: flex;
            gap: 15px;
            backdrop-filter: blur(10px);
        }
        
        .control-info {
            font-size: 12px;
            color: #94a3b8;
        /* DELETE THESE - NOT NEEDED
@keyframes pulse-purple { ... }
@keyframes pulse-gold { ... }
*/
    </style>
</head>
<body>
    <div id="header">
        <div id="header-left">
            <div id="character-tabs">
                <!-- Character tabs will be dynamically generated based on party composition -->
            </div>
            <div id="skill-points">Skill Points: 1 / 1</div>
        </div>
        
<div id="header-right">
    <div id="stats-panel">
        <div id="stats-title">Stats Gained</div>
        <div id="stats-content"><div id="no-stats">No stats allocated</div></div>
    </div>
    <div id="rune-stats-panel" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 2px solid rgba(168, 85, 247, 0.5); padding: 20px 24px; border-radius: 16px; width: 320px; min-height: 200px; max-height: 400px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 20px 60px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); position: relative; margin-left: 15px;">
        <div id="rune-stats-title" style="color: #a855f7; font-weight: 700; font-size: 16px; border-bottom: 1px solid rgba(168, 85, 247, 0.3); padding-bottom: 8px; margin-bottom: 6px; text-align: center; text-shadow: 0 2px 10px rgba(168, 85, 247, 0.3);">Rune Stats</div>
        <div id="rune-stats-content" style="overflow-y: auto; flex: 1;"></div>
    </div>
    <button id="save-btn" class="header-btn">Save Tree</button>
</div>
    </div>
    <div id="canvas-container">
        <canvas id="skill-tree-canvas"></canvas>
        <div id="tooltip"></div>
    </div>
    <div id="controls">
        <span class="control-info">🖱️ Left Click: Allocate Node</span>
        <span class="control-info">🖱️ Right Click: Deallocate Node</span>
        <span class="control-info">🖱️ Drag: Pan View</span>
        <span class="control-info">🖱️ Scroll: Zoom</span>
    </div>
    <div class="save-notification" id="save-notification">Tree Saved!</div>
    
    <script>` + 
    // The entire skill tree JavaScript code goes here - I'll continue in next part due to length
    `
        class SkillTreeViewer {
            constructor() {
                this.canvas = document.getElementById('skill-tree-canvas');
                this.ctx = this.canvas.getContext('2d');
                this.tooltip = document.getElementById('tooltip');
                
                // Set canvas size after DOM is fully ready
                this.resizeCanvas();
                // Force another resize after a short delay to ensure proper sizing
                setTimeout(() => {
                    this.resizeCanvas();
                }, 50);
                setTimeout(() => {
                    this.resizeCanvas();
                }, 200);
                
                // Camera controls
                this.camera = {
                    x: 0,
                    y: 0,
                    zoom: 0.7
                };
                
                // Mouse state
                this.mouse = {
                    x: 0,
                    y: 0,
                    worldX: 0,
                    worldY: 0,
                    dragging: false,
                    dragStartX: 0,
                    dragStartY: 0
                };
                
                // Character data storage - initialize all possible characters
                this.characters = {
                    tank: {
                        allocatedNodes: new Set([0]),
                        usedPoints: 0,
                        availablePoints: 1
                    },
                    healer: {
                        allocatedNodes: new Set([0]),
                        usedPoints: 0,
                        availablePoints: 1
                    },
                    mage: {
                        allocatedNodes: new Set([0]),
                        usedPoints: 0,
                        availablePoints: 1
                    },
                    rogue: {
                        allocatedNodes: new Set([0]),
                        usedPoints: 0,
                        availablePoints: 1
                    },
                    archer: {
                        allocatedNodes: new Set([0]),
                        usedPoints: 0,
                        availablePoints: 1
                    },
                    paladin: {
                        allocatedNodes: new Set([0]),
                        usedPoints: 0,
                        availablePoints: 1
                    }
                };
                
                // Current character
                this.currentCharacter = 'tank';
                
                // Skill tree data
                this.nodes = [];
                this.connections = [];
                this.skillPoints = 1; // Default to 1 skill point
                
                // Initialize immediately to prevent display issues
                this.updatePointsDisplay();
                
                // Load from game data first if available
                const gameData = localStorage.getItem('gameSkillTreeData');
                const currentCharIndex = localStorage.getItem('currentCharacterIndex');
                
                if (gameData) {
                    const data = JSON.parse(gameData);
                    
                    // Override default characters data with real game data
                    for (const char in data.characters) {
                        if (data.characters[char]) {
                            // Recalculate used points to avoid counting bugs
                            const allocatedSet = new Set(data.characters[char].allocatedNodes || [0]);
                            let recalculatedPoints = 0;
                            allocatedSet.forEach(nodeId => {
                                if (nodeId !== 0) { // Don't count the start node
                                    recalculatedPoints += 1; // Each non-start node costs 1 point
                                }
                            });
                            
                            this.characters[char] = {
                                allocatedNodes: allocatedSet,
                                usedPoints: recalculatedPoints
                            };
                        }
                    }
                    
                    // Set initial character based on who opened the tree - FIX: Use partyComposition
                    if (currentCharIndex !== null && data.partyComposition) {
                        const charIndex = parseInt(currentCharIndex);
                        const charKey = data.partyComposition[charIndex] ? data.partyComposition[charIndex].key : null;
                        this.currentCharacter = charKey;
                        
                        // Use that character's level for total skill points
                        if (data.characters[charKey] && data.characters[charKey].level) {
                            this.skillPoints = data.characters[charKey].level; // Total skill points = level
                            // Ensure skill points is reasonable
                            if (this.skillPoints > 100 || this.skillPoints < 1) {
                                this.skillPoints = 1; // Reset to 1 if corrupted
                            }
                        }
                    }
                } else {
                    // Fall back to saved skillTreeData if no game data
                    const savedData = localStorage.getItem('skillTreeData');
                if (savedData) {
                    try {
                        const data = JSON.parse(savedData);
                        // Convert Arrays back to Sets
                        for (const char in data.characters) {
                            if (data.characters[char]) {
                                this.characters[char] = {
                                    allocatedNodes: new Set(data.characters[char].allocatedNodes || [0]),
                                    usedPoints: data.characters[char].usedPoints || 0
                                };
                                // If we have level data in saved data, use it to set skill points
                                if (char === this.currentCharacter && data.characters[char].level) {
                                    this.skillPoints = data.characters[char].level;
                                }
                            }
                        }
                    } catch (e) {
                        
                    }
                }
                }
                
                // Set current character's data
                this.allocatedNodes = this.characters[this.currentCharacter].allocatedNodes;
                this.usedPoints = this.characters[this.currentCharacter].usedPoints;
                
                // Final sanity check on skill points
                const gameDataValidation = localStorage.getItem('gameSkillTreeData');
                if (gameDataValidation) {
                    const dataValidation = JSON.parse(gameDataValidation);
                    if (dataValidation.characters[this.currentCharacter] && dataValidation.characters[this.currentCharacter].level) {
                        const maxAllowed = dataValidation.characters[this.currentCharacter].level;
                        if (this.skillPoints > maxAllowed) {
                            this.skillPoints = maxAllowed; // Cap at character's level
                        }
                    }
                }
                
                if (this.skillPoints > 100 || this.skillPoints < 1) {
                    this.skillPoints = Math.max(1, this.usedPoints + 1); // At least enough for allocated nodes + 1
                }
                
                this.updatePointsDisplay(); // Update display first
                this.generateTree();
                this.setupEventListeners();
                this.setupCharacterTabs();
                this.updateAllCharacterIndicators();
                this.updateStatsPanel();
                this.animate();
            }
            
            setupCharacterTabs() {
                // Generate character tabs dynamically based on party composition
                const gameData = localStorage.getItem('gameSkillTreeData');
                const tabsContainer = document.getElementById('character-tabs');
                
                if (gameData && tabsContainer) {
                    const data = JSON.parse(gameData);
                    
                    // Clear existing tabs
                    tabsContainer.innerHTML = '';
                    
                    // Generate tabs for each character in the party
                    if (data.partyComposition && data.partyComposition.length > 0) {
                        data.partyComposition.forEach((char, index) => {
                            const tab = document.createElement('button');
                            tab.className = 'character-tab' + (char.key === this.currentCharacter ? ' active' : '');
                            tab.setAttribute('data-character', char.key);
                            tab.innerHTML = \`
                                \${char.name}
                                <span class="points-indicator" style="display: none;">0</span>
                            \`;
                            tabsContainer.appendChild(tab);
                        });
                    } else {
                        // Fallback to original 4 characters if no party composition data
                        const defaultChars = [
                            { key: 'tank', name: 'Tank' },
                            { key: 'healer', name: 'Healer' },
                            { key: 'mage', name: 'Mage' },
                            { key: 'rogue', name: 'Rogue' }
                        ];
                        defaultChars.forEach(char => {
                            const tab = document.createElement('button');
                            tab.className = 'character-tab' + (char.key === this.currentCharacter ? ' active' : '');
                            tab.setAttribute('data-character', char.key);
                            tab.innerHTML = \`
                                \${char.name}
                                <span class="points-indicator" style="display: none;">0</span>
                            \`;
                            tabsContainer.appendChild(tab);
                        });
                    }
                }
                
                // Setup click listeners for the generated tabs
                document.querySelectorAll('.character-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const character = tab.getAttribute('data-character');
                        this.switchCharacter(character);
                    });
                });
            }
            
            resizeCanvas() {
                const rect = this.canvas.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
            }
            
            generateTree() {
                // Color schemes for different node types
                const nodeTypes = {
                    start: {
                        size: 20,
                        color: '#f59e0b',
                        activeColor: '#fbbf24',
                        borderColor: '#92400e'
                    },
                    small: {
                        size: 10,
                        color: '#4a5568',
                        activeColor: '#10b981',
                        borderColor: '#1f2937'
                    },
                    medium: {
                        size: 14,
                        color: '#6366f1',
                        activeColor: '#3b82f6',
                        borderColor: '#312e81'
                    },
                    large: {
                        size: 18,
                        color: '#8b5cf6',
                        activeColor: '#a855f7',
                        borderColor: '#581c87'
                    },
                    keystone: {
                        size: 24,
                        color: '#dc2626',
                        activeColor: '#ef4444',
                        borderColor: '#7f1d1d'
                    },
                    legendary: {
                        size: 16,
                        color: '#f59e0b',
                        activeColor: '#fbbf24',
                        borderColor: '#92400e'
                    }
                };
                
                // Stat definitions
                const smallStats = [
                    { stats: { dodge: 0.5 }, display: '+0.5% Dodge' },
                    { stats: { hp: 5 }, display: '+5 HP' },
                    { stats: { attack: 1 }, display: '+1 Attack' },
                    { stats: { defense: 1 }, display: '+1 Defense' },
                    { stats: { mana: 5 }, display: '+5 Mana' }
                ];
                
                const mediumStats = [
                    { stats: { attackSpeed: 2 }, display: '+2% Attack Speed' },
                    { stats: { attack: 5 }, display: '+5 Attack' },
                    { stats: { hp: 25 }, display: '+25 HP' },
                    { stats: { defense: 2.5 }, display: '+2.5 Defense' },
                    { stats: { mana: 25 }, display: '+25 Mana' },
                    { stats: { manaRegen: 2 }, display: '+2% Mana Regen' },
                    { stats: { hpRegen: 2 }, display: '+2% HP Regen' },
                    { stats: { lifesteal: 3 }, display: '+3% Lifesteal' },
                    { stats: { cdr: 2 }, display: '+2% CDR' },
                    { stats: { dodge: 1 }, display: '+1% Dodge' }
                ];
                
                const largeStats = [
                    { stats: { critChance: 5, critDamage: 6 }, display: '+5% Crit & +6% Crit DMG' },
                    { stats: { hp: 100, defense: 10 }, display: '+100 HP & +10 Defense' },
                    { stats: { mana: 100, manaRegen: 5 }, display: '+100 Mana & +5% Mana Regen' },
                    { stats: { attack: 10, attackSpeed: 5 }, display: '+10 Attack & +5% Atk Speed' },
                    { stats: { hp: 250 }, display: '+250 HP' },
                    { stats: { defense: 20 }, display: '+20 Defense' },
                    { stats: { dodge: 5 }, display: '+5% Dodge' },
                    { stats: { attack: 35 }, display: '+35 Attack' },
                    { stats: { critDamage: 25 }, display: '+25% Crit Damage' },
                    { stats: { critChance: 10 }, display: '+10% Crit Chance' },
                    { stats: { cdr: 10 }, display: '+10% CDR' },
                    { stats: { lifesteal: 8, attackSpeed: 8 }, display: '+8% Lifesteal & +8% Atk Spd' }
                ];
                
                const keystoneStats = [
                    { name: 'Tank Keystone Slot', stats: {}, display: 'Unlocks Tank Keystone Slot' },
                    { name: 'Healer Keystone Slot', stats: {}, display: 'Unlocks Healer Keystone Slot' },
                    { name: 'Mage Keystone Slot', stats: {}, display: 'Unlocks Mage Keystone Slot' },
                    { name: 'Rogue Keystone Slot', stats: {}, display: 'Unlocks Rogue Keystone Slot' }
                ];
                
                const legendaryStats = [
                    { name: 'Defensive Mastery', stats: { defPerEpic: 5 }, display: '+5 Def per Epic+ Item' },
                    { name: 'Offensive Mastery', stats: { attPerEpic: 5 }, display: '+5 Atk per Epic+ Item' },
                    { name: 'Critical Mastery', stats: { critDmgPerEpic: 5 }, display: '+5% Crit DMG per Epic+ Item' },
                    { name: 'Vitality Mastery', stats: { hpPerEpic: 25 }, display: '+25 HP per Epic+ Item' },
                    { name: 'Arcane Mastery', stats: { manaPerEpic: 25 }, display: '+25 Mana per Epic+ Item' }
                ];
                
                let nodeId = 0;
                
                // Create center start node
                this.nodes.push({
                    id: nodeId++,
                    x: 0,
                    y: 0,
                    type: 'start',
                    display: 'Start',
                    stats: {},
                    cost: 0,
                    ...nodeTypes.start
                });
                
                // Create 5 main branches with specific themes:
                // Branch 0 (Top): Balanced/Tank path
                // Branch 1 (Top-Right): Attack/DPS path  
                // Branch 2 (Bottom-Right): Speed/Crit path
                // Branch 3 (Bottom-Left): Defense/HP path
                // Branch 4 (Top-Left): Magic/Utility path
                
                const branches = 5;
                const branchAngleStep = (Math.PI * 2) / branches;
                const nodeSpacing = 50;
                
                for (let branch = 0; branch < branches; branch++) {
                    const baseAngle = branch * branchAngleStep - Math.PI / 2;
                    let currentRadius = 0;
                    let lastNodeId = 0;
                    
                    // First path: 5 small nodes from center - themed per branch
                    for (let i = 1; i <= 5; i++) {
                        currentRadius = i * nodeSpacing;
                        const x = Math.cos(baseAngle) * currentRadius;
                        const y = Math.sin(baseAngle) * currentRadius;
                        
                        // Branch-specific small stat progression
                        let stat;
                        if (branch === 0) { // Balanced
                            stat = [smallStats[2], smallStats[3], smallStats[1], smallStats[0], smallStats[2]][i-1]; // hp, def, atk, dodge, hp
                        } else if (branch === 1) { // Attack
                            stat = [smallStats[2], smallStats[2], smallStats[3], smallStats[2], smallStats[1]][i-1]; // atk, atk, def, atk, hp
                        } else if (branch === 2) { // Speed/Crit
                            stat = [smallStats[0], smallStats[2], smallStats[0], smallStats[3], smallStats[2]][i-1]; // dodge, atk, dodge, def, atk
                        } else if (branch === 3) { // Defense
                            stat = [smallStats[3], smallStats[1], smallStats[3], smallStats[1], smallStats[3]][i-1]; // def, hp, def, hp, def
                        } else { // Magic
                            stat = [smallStats[4], smallStats[1], smallStats[4], smallStats[2], smallStats[4]][i-1]; // mana, hp, mana, atk, mana
                        }
                        
                        const node = {
                            id: nodeId++,
                            x: x,
                            y: y,
                            type: 'small',
                            display: stat.display,
                            stats: stat.stats,
                            cost: 1,
                            ...nodeTypes.small
                        };
                        this.nodes.push(node);
                        this.connections.push({ from: lastNodeId, to: node.id });
                        lastNodeId = node.id;
                    }
                    
                    // Blue (medium) node at fork point - branch-themed
                    currentRadius += nodeSpacing;
                    let mediumStat;
                    if (branch === 0) mediumStat = mediumStats[2]; // hp+25
                    else if (branch === 1) mediumStat = mediumStats[1]; // attack+5
                    else if (branch === 2) mediumStat = mediumStats[0]; // attackSpeed+2%
                    else if (branch === 3) mediumStat = mediumStats[3]; // defense+2.5
                    else mediumStat = mediumStats[4]; // mana+25
                    
                    const forkMedium = {
                        id: nodeId++,
                        x: Math.cos(baseAngle) * currentRadius,
                        y: Math.sin(baseAngle) * currentRadius,
                        type: 'medium',
                        display: mediumStat.display,
                        stats: mediumStat.stats,
                        cost: 1,
                        ...nodeTypes.medium
                    };
                    this.nodes.push(forkMedium);
                    this.connections.push({ from: lastNodeId, to: forkMedium.id });
                    
                    // Left path (purple at end)
                    let leftLastId = forkMedium.id;
                    const leftAngle = baseAngle - 0.4;
                    for (let i = 1; i <= 5; i++) {
                        const radius = currentRadius + (i * nodeSpacing);
                        const x = Math.cos(leftAngle) * radius;
                        const y = Math.sin(leftAngle) * radius;
                        
                        // Left path small nodes - defensive focus
                        let stat;
                        if (branch === 0) stat = smallStats[i % 2 === 0 ? 3 : 1]; // def/hp alternating
                        else if (branch === 1) stat = smallStats[i % 2 === 0 ? 0 : 2]; // dodge/atk
                        else if (branch === 2) stat = smallStats[0]; // all dodge
                        else if (branch === 3) stat = smallStats[1]; // all hp
                        else stat = smallStats[4]; // all mana
                        
                        const node = {
                            id: nodeId++,
                            x: x,
                            y: y,
                            type: 'small',
                            display: stat.display,
                            stats: stat.stats,
                            cost: 1,
                            ...nodeTypes.small
                        };
                        this.nodes.push(node);
                        this.connections.push({ from: leftLastId, to: node.id });
                        leftLastId = node.id;
                    }
                    
                    // Left large node - branch-specific powerful node
                    let leftLargeStat;
                    if (branch === 0) leftLargeStat = largeStats[1]; // hp+100, def+10
                    else if (branch === 1) leftLargeStat = largeStats[11]; // lifesteal+10%, atkspd+10%
                    else if (branch === 2) leftLargeStat = largeStats[0]; // crit+5%, critdmg+10%
                    else if (branch === 3) leftLargeStat = largeStats[4]; // hp+250
                    else leftLargeStat = largeStats[2]; // mana+100, manaregen+5%
                    
                    const leftLarge = {
                        id: nodeId++,
                        x: Math.cos(leftAngle) * (currentRadius + 6 * nodeSpacing),
                        y: Math.sin(leftAngle) * (currentRadius + 6 * nodeSpacing),
                        type: 'large',
                        display: leftLargeStat.display,
                        stats: leftLargeStat.stats,
                        cost: 1,
                        ...nodeTypes.large
                    };
                    this.nodes.push(leftLarge);
                    this.connections.push({ from: leftLastId, to: leftLarge.id });
                    
                    // Middle path (keystone at end)
                    let middleLastId = forkMedium.id;
                    for (let i = 1; i <= 5; i++) {
                        const radius = currentRadius + (i * nodeSpacing);
                        const x = Math.cos(baseAngle) * radius;
                        const y = Math.sin(baseAngle) * radius;
                        
                        // Middle path - balanced progression
                        let stat = smallStats[(branch + i) % smallStats.length];
                        
                        const node = {
                            id: nodeId++,
                            x: x,
                            y: y,
                            type: 'small',
                            display: stat.display,
                            stats: stat.stats,
                            cost: 1,
                            ...nodeTypes.small
                        };
                        this.nodes.push(node);
                        this.connections.push({ from: middleLastId, to: node.id });
                        middleLastId = node.id;
                    }
                    
                    // Rune Slot - all 5 branches get one
const keystone = {
    id: nodeId++,
    x: Math.cos(baseAngle) * (currentRadius + 6 * nodeSpacing),
    y: Math.sin(baseAngle) * (currentRadius + 6 * nodeSpacing),
    type: 'keystone',
    name: 'Rune Slot',
    display: 'Unlocks Rune Slot',
    stats: {},
    cost: 1,
    isRuneSlot: true,
    runeSlotIndex: branch,
    keystoneType: branch < 6 ? ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'][branch] : 'universal',
    ...nodeTypes.keystone
};
this.nodes.push(keystone);
this.connections.push({ from: middleLastId, to: keystone.id });
                    
                    // Right path (purple at end)
                    let rightLastId = forkMedium.id;
                    const rightAngle = baseAngle + 0.4;
                    for (let i = 1; i <= 5; i++) {
                        const radius = currentRadius + (i * nodeSpacing);
                        const x = Math.cos(rightAngle) * radius;
                        const y = Math.sin(rightAngle) * radius;
                        
                        // Right path small nodes - offensive focus
                        let stat;
                        if (branch === 0) stat = smallStats[i % 2 === 0 ? 2 : 0]; // atk/dodge
                        else if (branch === 1) stat = smallStats[2]; // all attack
                        else if (branch === 2) stat = smallStats[i % 2 === 0 ? 2 : 0]; // atk/dodge
                        else if (branch === 3) stat = smallStats[3]; // all defense
                        else stat = smallStats[i % 2 === 0 ? 4 : 2]; // mana/atk
                        
                        const node = {
                            id: nodeId++,
                            x: x,
                            y: y,
                            type: 'small',
                            display: stat.display,
                            stats: stat.stats,
                            cost: 1,
                            ...nodeTypes.small
                        };
                        this.nodes.push(node);
                        this.connections.push({ from: rightLastId, to: node.id });
                        rightLastId = node.id;
                    }
                    
                    // Right large node - branch-specific powerful node
                    let rightLargeStat;
                    if (branch === 0) rightLargeStat = largeStats[3]; // atk+25, atkspd+5%
                    else if (branch === 1) rightLargeStat = largeStats[7]; // atk+40
                    else if (branch === 2) rightLargeStat = largeStats[9]; // crit+10%
                    else if (branch === 3) rightLargeStat = largeStats[5]; // def+20
                    else rightLargeStat = largeStats[10]; // cdr+10%
                    
                    const rightLarge = {
                        id: nodeId++,
                        x: Math.cos(rightAngle) * (currentRadius + 6 * nodeSpacing),
                        y: Math.sin(rightAngle) * (currentRadius + 6 * nodeSpacing),
                        type: 'large',
                        display: rightLargeStat.display,
                        stats: rightLargeStat.stats,
                        cost: 1,
                        ...nodeTypes.large
                    };
                    this.nodes.push(rightLarge);
                    this.connections.push({ from: rightLastId, to: rightLarge.id });
                }
                
                // Connect the keystones in a ring with consistent stats
                const keystones = this.nodes.filter(n => n.type === 'keystone');
                
                for (let i = 0; i < keystones.length; i++) {
                    const currentKeystone = keystones[i];
                    const nextKeystone = keystones[(i + 1) % keystones.length];
                    
                    const angle1 = Math.atan2(currentKeystone.y, currentKeystone.x);
                    const angle2 = Math.atan2(nextKeystone.y, nextKeystone.x);
                    let angleDiff = angle2 - angle1;
                    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    let lastId = currentKeystone.id;
                    const outerRadius = 700;
                    
                    // 5 gray nodes - consistent pattern
                    for (let j = 1; j <= 5; j++) {
                        const t = j / 12;
                        const angle = angle1 + angleDiff * t;
                        const x = Math.cos(angle) * outerRadius;
                        const y = Math.sin(angle) * outerRadius;
                        
                        // Outer ring uses simple pattern
                        const stat = smallStats[j % smallStats.length];
                        
                        const node = {
                            id: nodeId++,
                            x: x,
                            y: y,
                            type: 'small',
                            display: stat.display,
                            stats: stat.stats,
                            cost: 1,
                            ...nodeTypes.small
                        };
                        this.nodes.push(node);
                        this.connections.push({ from: lastId, to: node.id });
                        lastId = node.id;
                    }
                    
                    // Legendary orange node in middle
                    const midAngle = angle1 + angleDiff * 0.5;
                    const legendaryNode = {
                        id: nodeId++,
                        x: Math.cos(midAngle) * 750,
                        y: Math.sin(midAngle) * 750,
                        type: 'legendary',
                        name: legendaryStats[i].name,
                        display: legendaryStats[i].display,
                        stats: legendaryStats[i].stats,
                        cost: 1,
                        ...nodeTypes.legendary
                    };
                    this.nodes.push(legendaryNode);
                    this.connections.push({ from: lastId, to: legendaryNode.id });
                    lastId = legendaryNode.id;
                    
                    // 5 more gray nodes
                    for (let j = 7; j <= 11; j++) {
                        const t = j / 12;
                        const angle = angle1 + angleDiff * t;
                        const x = Math.cos(angle) * outerRadius;
                        const y = Math.sin(angle) * outerRadius;
                        
                        // Mirror the first set pattern
                        const stat = smallStats[(6 - j + 11) % smallStats.length];
                        
                        const node = {
                            id: nodeId++,
                            x: x,
                            y: y,
                            type: 'small',
                            display: stat.display,
                            stats: stat.stats,
                            cost: 1,
                            ...nodeTypes.small
                        };
                        this.nodes.push(node);
                        this.connections.push({ from: lastId, to: node.id });
                        lastId = node.id;
                    }
                    
                    this.connections.push({ from: lastId, to: nextKeystone.id });
                }
            }
            
            calculateStats() {
                const stats = {};
                let runeSlotCount = 0;
                
                for (const nodeId of this.allocatedNodes) {
                    const node = this.nodes.find(n => n.id === nodeId);
                    if (node) {
                        // Count rune slots
                        if (node.isRuneSlot) {
                            runeSlotCount++;
                        }
                        
                        // Add regular stats
                        if (node.stats) {
                            for (const [stat, value] of Object.entries(node.stats)) {
                                if (!stats[stat]) {
                                    stats[stat] = 0;
                                }
                                stats[stat] += value;
                            }
                        }
                    }
                }
                
                // Add rune slot count to stats
                if (runeSlotCount > 0) {
                    stats.runeSlots = runeSlotCount;
                }
                
                return stats;
            }
            
            updateStatsPanel() {
                const stats = this.calculateStats();
                const statsContent = document.getElementById('stats-content');
                
                statsContent.innerHTML = '';
                
                const statNames = {
                    hp: 'HP',
                    mana: 'Mana',
                    attack: 'Attack',
                    defense: 'Defense',
                    attackSpeed: 'Attack Speed',
                    critChance: 'Crit Chance',
                    critDamage: 'Crit Damage',
                    dodge: 'Dodge',
                    lifesteal: 'Lifesteal',
                    manaRegen: 'Mana Regen',
                    hpRegen: 'HP Regen',
                    cdr: 'CDR',
                    defPerEpic: 'Def per Epic+',
                    attPerEpic: 'Atk per Epic+',
                    critDmgPerEpic: 'Crit DMG per Epic+',
                    hpPerEpic: 'HP per Epic+',
                    manaPerEpic: 'Mana per Epic+'
                };
                
                const hasStats = Object.keys(stats).length > 0;
                
                if (!hasStats) {
                    statsContent.innerHTML = '<div id="no-stats">No stats allocated</div>';
                } else {
                    const sortedStats = Object.entries(stats).sort((a, b) => {
                        if (a[1] < 0 && b[1] >= 0) return 1;
                        if (a[1] >= 0 && b[1] < 0) return -1;
                        return 0;
                    });
                    
                    for (const [stat, value] of sortedStats) {
                        if (value === 0) continue;
                        
                        const row = document.createElement('div');
                        row.className = 'stat-row';
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'stat-name';
                        nameSpan.textContent = statNames[stat] || stat;
                        
                        const valueSpan = document.createElement('span');
                        valueSpan.className = 'stat-value';
                        if (value < 0) {
                            valueSpan.classList.add('negative');
                        }
                        
                        let displayValue = '';
                        if (stat.includes('PerEpic')) {
                            displayValue = '+' + value;
                        } else if (['attackSpeed', 'critChance', 'critDamage', 'dodge', 'lifesteal', 'manaRegen', 'hpRegen', 'cdr'].includes(stat)) {
                            displayValue = value > 0 ? '+' + value + '%' : value + '%';
                        } else {
                            displayValue = value > 0 ? '+' + value : '' + value;
                        }
                        
                        valueSpan.textContent = displayValue;
                        
                        row.appendChild(nameSpan);
                        row.appendChild(valueSpan);
                        statsContent.appendChild(row);
                    }
                }
                
                requestAnimationFrame(() => {
                    this.resizeCanvas();
                });
                
                // Update rune stats panel
                this.updateRuneStatsPanel();
            }
            
            updateRuneStatsPanel() {
                // Removed - rune slots tracked separately
            }
            
            canAllocate(nodeId) {
                if (this.allocatedNodes.has(nodeId)) return false;
                const node = this.nodes.find(n => n.id === nodeId);
                if (!node) return false;
                if (this.usedPoints + node.cost > this.skillPoints) return false;
                
                const hasPath = this.connections.some(c => 
                    (c.from === nodeId && this.allocatedNodes.has(c.to)) ||
                    (c.to === nodeId && this.allocatedNodes.has(c.from))
                );
                
                return hasPath;
            }
            
            allocateNode(nodeId) {
                if (!this.canAllocate(nodeId)) return false;
                
                const node = this.nodes.find(n => n.id === nodeId);
                this.allocatedNodes.add(nodeId);
                this.usedPoints += node.cost;
                this.updatePointsDisplay();
                this.updateStatsPanel();
                return true;
            }
            
            deallocateNode(nodeId) {
                if (nodeId === 0) return false;
                if (!this.allocatedNodes.has(nodeId)) return false;
                
                const tempAllocated = new Set(this.allocatedNodes);
                tempAllocated.delete(nodeId);
                
                const visited = new Set();
                const queue = [0];
                visited.add(0);
                
                while (queue.length > 0) {
                    const current = queue.shift();
                    this.connections.forEach(c => {
                        let neighbor = null;
                        if (c.from === current && tempAllocated.has(c.to)) neighbor = c.to;
                        if (c.to === current && tempAllocated.has(c.from)) neighbor = c.from;
                        
                        if (neighbor && !visited.has(neighbor)) {
                            visited.add(neighbor);
                            queue.push(neighbor);
                        }
                    });
                }
                
                if (visited.size === tempAllocated.size) {
                    const node = this.nodes.find(n => n.id === nodeId);
                    
                    // Check if this is a rune slot node being deallocated
                    if (node.isRuneSlot) {
                        // Get game data to unequip runes
                        const gameData = localStorage.getItem('gameSkillTreeData');
                        if (gameData) {
                            const data = JSON.parse(gameData);
                            
                            // FIX: Use partyComposition to get correct character class
                            const currentCharIndex = parseInt(localStorage.getItem('currentCharacterIndex') || '0');
                            const charKey = data.partyComposition && data.partyComposition[currentCharIndex] 
                                ? data.partyComposition[currentCharIndex].key 
                                : null;
                            
                            if (!charKey) {
                                console.error('Could not determine character class from party composition');
                                return;
                            }
                            
                            // Count how many rune slot nodes will remain allocated after this deallocation
                            let remainingRuneSlots = 0;
                            tempAllocated.forEach(allocNodeId => {
                                const allocNode = this.nodes.find(n => n.id === allocNodeId);
                                if (allocNode && allocNode.isRuneSlot) {
                                    remainingRuneSlots++;
                                }
                            });
                            
                            // Store info about which rune slots should be locked
                            const runeSlotLockInfo = {
                                character: charKey,
                                remainingSlots: remainingRuneSlots
                            };
                            localStorage.setItem('runeSlotLockInfo', JSON.stringify(runeSlotLockInfo));
                        }
                    }
                    
                    this.allocatedNodes.delete(nodeId);
                    this.usedPoints -= node.cost;
                    this.updatePointsDisplay();
                    this.updateStatsPanel();
                    return true;
                }
                
                return false;
            }
            
            switchCharacter(character) {
                // Save current character's data including available points
                this.characters[this.currentCharacter] = {
                    allocatedNodes: new Set(this.allocatedNodes),
                    usedPoints: this.usedPoints,
                    availablePoints: this.skillPoints - this.usedPoints
                };
                
                // Load new character's data
                this.currentCharacter = character;
                this.allocatedNodes = new Set(this.characters[character].allocatedNodes);
                this.usedPoints = this.characters[character].usedPoints;
                
                // Load the correct skill points for this character from game data
                const gameData = localStorage.getItem('gameSkillTreeData');
                if (gameData) {
                    const data = JSON.parse(gameData);
                    if (data.characters[character] && data.characters[character].level) {
                        // Total skill points should equal the character's level
                        this.skillPoints = data.characters[character].level;
                    } else {
                        // Fallback: if no level data, calculate from available + used (but cap it)
                        this.skillPoints = Math.min(100, (data.characters[character].availablePoints || 0) + this.usedPoints);
                    }
                }
                
                document.querySelectorAll('.character-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelector('[data-character="' + character + '"]').classList.add('active');
                
                this.updatePointsDisplay();
                this.updateStatsPanel();
                this.updateAllCharacterIndicators();
            }
            
            updateAllCharacterIndicators() {
                document.querySelectorAll('.character-tab').forEach(tab => {
                    const char = tab.getAttribute('data-character');
                    const indicator = tab.querySelector('.points-indicator');
                    const points = this.characters[char].usedPoints;
                    
                    if (points > 0) {
                        indicator.style.display = 'flex';
                        indicator.textContent = points;
                    } else {
                        indicator.style.display = 'none';
                    }
                });
            }
            
            saveToLocalStorage() {
                this.characters[this.currentCharacter] = {
                    allocatedNodes: new Set(this.allocatedNodes),
                    usedPoints: this.usedPoints,
                    availablePoints: this.skillPoints - this.usedPoints
                };
                
                // Get level data from game data
                const gameData = localStorage.getItem('gameSkillTreeData');
                let levelData = {};
                if (gameData) {
                    const data = JSON.parse(gameData);
                    for (const char in data.characters) {
                        if (data.characters[char] && data.characters[char].level) {
                            levelData[char] = data.characters[char].level;
                        }
                    }
                }
                
                const saveData = {
                    characters: {}
                };
                
                for (const char in this.characters) {
                    // Calculate the total stats for this character
const totalStats = {};
let runeSlotCount = 0;
for (const nodeId of this.characters[char].allocatedNodes) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
        // Count rune slots
        if (node.isRuneSlot) {
            runeSlotCount++;
        }
        // Count regular stats
        if (node.stats) {
            for (const [stat, value] of Object.entries(node.stats)) {
                totalStats[stat] = (totalStats[stat] || 0) + value;
            }
        }
    }
}
totalStats.runeSlots = runeSlotCount;
                    
                    saveData.characters[char] = {
                        allocatedNodes: Array.from(this.characters[char].allocatedNodes),
                        usedPoints: this.characters[char].usedPoints,
                        availablePoints: this.characters[char].availablePoints || (this.skillPoints - this.characters[char].usedPoints),
                        totalStats: totalStats, // Store the calculated stats
                        level: levelData[char] || null // Store character level
                    };
                }
                
                localStorage.setItem('skillTreeData', JSON.stringify(saveData));
                
                const notification = document.getElementById('save-notification');
                notification.classList.add('show');
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 2000);
            }
            
            updatePointsDisplay() {
                document.getElementById('skill-points').textContent = 
                    'Skill Points: ' + (this.skillPoints - this.usedPoints) + ' / ' + this.skillPoints;
            }
            
            setupEventListeners() {
                this.canvas.addEventListener('mousemove', (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    this.mouse.x = e.clientX - rect.left;
                    this.mouse.y = e.clientY - rect.top;
                    
                    this.mouse.worldX = (this.mouse.x - this.canvas.width/2) / this.camera.zoom - this.camera.x;
                    this.mouse.worldY = (this.mouse.y - this.canvas.height/2) / this.camera.zoom - this.camera.y;
                    
                    if (this.mouse.dragging) {
                        this.camera.x = (this.mouse.x - this.mouse.dragStartX) / this.camera.zoom + this.camera.startX;
                        this.camera.y = (this.mouse.y - this.mouse.dragStartY) / this.camera.zoom + this.camera.startY;
                    } else {
                        let hoveredNode = null;
                        for (const node of this.nodes) {
                            const dist = Math.sqrt(
                                Math.pow(node.x - this.mouse.worldX, 2) + 
                                Math.pow(node.y - this.mouse.worldY, 2)
                            );
                            if (dist < node.size) {
                                hoveredNode = node;
                                break;
                            }
                        }
                        
                        if (hoveredNode) {
                            this.showTooltip(hoveredNode, e.clientX, e.clientY);
                        } else {
                            this.tooltip.classList.remove('show');
                        }
                    }
                });
                
                this.canvas.addEventListener('mousedown', (e) => {
                    if (e.button === 0) {
                        let clickedNode = null;
                        for (const node of this.nodes) {
                            const dist = Math.sqrt(
                                Math.pow(node.x - this.mouse.worldX, 2) + 
                                Math.pow(node.y - this.mouse.worldY, 2)
                            );
                            if (dist < node.size) {
                                clickedNode = node;
                                break;
                            }
                        }
                        
                        if (clickedNode) {
                            this.allocateNode(clickedNode.id);
                        } else {
                            this.mouse.dragging = true;
                            this.mouse.dragStartX = this.mouse.x;
                            this.mouse.dragStartY = this.mouse.y;
                            this.camera.startX = this.camera.x;
                            this.camera.startY = this.camera.y;
                            this.canvas.style.cursor = 'grabbing';
                        }
                    }
                });
                
                this.canvas.addEventListener('mouseup', (e) => {
                    if (e.button === 0) {
                        this.mouse.dragging = false;
                        this.canvas.style.cursor = 'grab';
                    }
                });
                
                this.canvas.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    
                    for (const node of this.nodes) {
                        const dist = Math.sqrt(
                            Math.pow(node.x - this.mouse.worldX, 2) + 
                            Math.pow(node.y - this.mouse.worldY, 2)
                        );
                        if (dist < node.size) {
                            this.deallocateNode(node.id);
                            break;
                        }
                    }
                });
                
                this.canvas.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const zoomSpeed = 0.1;
                    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
                    this.camera.zoom = Math.max(0.3, Math.min(2, this.camera.zoom + delta));
                });
                
               document.getElementById('save-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    viewer.saveToLocalStorage();
                    
                    // Show save notification
                    const notification = document.getElementById('save-notification');
                    if (notification) {
                        notification.classList.add('show');
                        setTimeout(() => {
                            notification.classList.remove('show');
                        }, 2000);
                    }
                });
                
                // Use direct onclick instead of addEventListener for reliability
                const closeButton = document.getElementById('close-circle-btn');
if (closeButton) {
    closeButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        viewer.saveToLocalStorage();
        localStorage.setItem('skillTreeCloseRequested', 'true');
        return false;
    };
}
                
                window.addEventListener('resize', () => {
                    this.resizeCanvas();
                });
            }
            
            showTooltip(node, clientX, clientY) {
                let html = '<div class="tooltip-header" style="color: ' + node.activeColor + '">' + (node.name || node.display) + '</div>';
                html += '<div class="tooltip-stats">' + node.display + '</div>';
                if (node.cost > 0) {
                    html += '<div class="tooltip-cost">Cost: ' + node.cost + ' point' + (node.cost > 1 ? 's' : '') + '</div>';
                }
                
                this.tooltip.innerHTML = html;
                this.tooltip.classList.add('show');
                
                // Get canvas position to calculate relative coordinates
                const canvasRect = this.canvas.getBoundingClientRect();
                const tooltipRect = this.tooltip.getBoundingClientRect();
                
                // Calculate position relative to the canvas container
                const x = clientX - canvasRect.left;
                const y = clientY - canvasRect.top;
                
                const maxX = canvasRect.width - tooltipRect.width - 10;
                const maxY = canvasRect.height - tooltipRect.height - 10;
                
                this.tooltip.style.left = Math.min(Math.max(x + 10, 10), maxX) + 'px';
                this.tooltip.style.top = Math.min(Math.max(y + 10, 10), maxY) + 'px';
            }
            
            draw() {
                const ctx = this.ctx;
                const width = this.canvas.width;
                const height = this.canvas.height;
                
                ctx.fillStyle = '#0a0e27';
                ctx.fillRect(0, 0, width, height);
                
                ctx.save();
                ctx.translate(width/2, height/2);
                ctx.scale(this.camera.zoom, this.camera.zoom);
                ctx.translate(this.camera.x, this.camera.y);
                
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
                ctx.lineWidth = 1;
                for (let x = -1000; x <= 1000; x += 100) {
                    ctx.beginPath();
                    ctx.moveTo(x, -1000);
                    ctx.lineTo(x, 1000);
                    ctx.stroke();
                }
                for (let y = -1000; y <= 1000; y += 100) {
                    ctx.beginPath();
                    ctx.moveTo(-1000, y);
                    ctx.lineTo(1000, y);
                    ctx.stroke();
                }
                
                ctx.lineCap = 'round';
                this.connections.forEach(conn => {
                    const fromNode = this.nodes.find(n => n.id === conn.from);
                    const toNode = this.nodes.find(n => n.id === conn.to);
                    
                    if (!fromNode || !toNode) return;
                    
                    const fromAllocated = this.allocatedNodes.has(fromNode.id);
                    const toAllocated = this.allocatedNodes.has(toNode.id);
                    const pathActive = fromAllocated && toAllocated;
                    
                    ctx.strokeStyle = pathActive ? 'rgba(16, 185, 129, 0.8)' : 'rgba(71, 85, 105, 0.3)';
                    ctx.lineWidth = pathActive ? 3 : 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(fromNode.x, fromNode.y);
                    ctx.lineTo(toNode.x, toNode.y);
                    ctx.stroke();
                });
                
                this.nodes.forEach(node => {
                    const allocated = this.allocatedNodes.has(node.id);
                    const canAllocate = this.canAllocate(node.id);
                    
                    if (allocated || canAllocate) {
                        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 2);
                        gradient.addColorStop(0, allocated ? node.activeColor + '40' : 'rgba(99, 102, 241, 0.2)');
                        gradient.addColorStop(1, 'transparent');
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    ctx.strokeStyle = allocated ? node.activeColor : node.borderColor;
                    ctx.lineWidth = allocated ? 3 : 2;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    ctx.fillStyle = allocated ? node.activeColor : node.color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.size - 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    if (node.type === 'keystone') {
                        ctx.strokeStyle = allocated ? '#fff' : 'rgba(255, 255, 255, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.size - 6, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                });
                
                ctx.restore();
            }
            
            animate() {
                if (this.destroyed) return;
                this.draw();
                this._animFrameId = requestAnimationFrame(() => this.animate());
            }
            
            stopAnimation() {
                this.destroyed = true;
                if (this._animFrameId) {
                    cancelAnimationFrame(this._animFrameId);
                    this._animFrameId = null;
                }
            }
        }
        
        const viewer = new SkillTreeViewer();
        
        // Position the invisible overlay button exactly over the close button
        setTimeout(() => {
            const closeBtn = document.getElementById('close-btn');
            const overlay = document.getElementById('close-overlay');
            
            if (closeBtn && overlay) {
                const rect = closeBtn.getBoundingClientRect();
                overlay.style.position = 'fixed';
                overlay.style.left = rect.left + 'px';
                overlay.style.top = rect.top + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
                overlay.style.border = 'none';
                overlay.style.background = 'transparent';
                
                // Add the working close function to the overlay
                overlay.onclick = function(e) {
                    e.preventDefault();
                    viewer.saveToLocalStorage();
                    localStorage.setItem('skillTreeCloseRequested', 'true');
                };
            }
        }, 100);
        
        // Update position if window resizes
        window.addEventListener('resize', () => {
            const closeBtn = document.getElementById('close-btn');
            const overlay = document.getElementById('close-overlay');
            
            if (closeBtn && overlay) {
                const rect = closeBtn.getBoundingClientRect();
                overlay.style.left = rect.left + 'px';
                overlay.style.top = rect.top + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
            }
        });
        
        // Ensure DOM is fully loaded before attaching events
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupButtonEvents);
        } else {
            setupButtonEvents();
        }
        
        function setupButtonEvents() {
            const saveBtn = document.getElementById('save-btn');
            const closeBtn = document.getElementById('close-btn');
            
            if (saveBtn) {
                saveBtn.onclick = function(e) {
                    e.preventDefault();
                    viewer.saveToLocalStorage();
                    
                    const notification = document.getElementById('save-notification');
                    if (notification) {
                        notification.classList.add('show');
                        setTimeout(() => {
                            notification.classList.remove('show');
                        }, 2000);
                    }
                };
            }
            
            const closeCircleBtn = document.getElementById('close-circle-btn');
if (closeCircleBtn) {
    closeCircleBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        viewer.saveToLocalStorage();
        localStorage.setItem('skillTreeCloseRequested', 'true');
    };
}
        }
    </` + `script>
</body>
</html>`;
}
            
            handleSkillTreeMessage(event) {
                if (event.data && event.data.action === 'closeSkillTree') {
                    this.closeSkillTree();
                }
            }
            
            openSkillTree(characterIndex) {
    if (this.skillTreeOpen) return;
    
    this.skillTreeOpen = true;
    this.currentSkillTreeCharacter = characterIndex;
    this.paused = true;
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'skill-tree-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.95);
        z-index: 3000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    // Create modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
        width: 90%;
        height: 90%;
        max-width: 1400px;
        max-height: 900px;
        background: linear-gradient(135deg, #0a0e27 0%, #151935 100%);
        border-radius: 20px;
        border: 2px solid rgba(99, 102, 241, 0.5);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
    `;
    
    // Create close button
const closeBtn = document.createElement('button');
closeBtn.textContent = '✕';
closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 54px;
    height: 54px;
    background: rgba(239, 68, 68, 0.2);
    border: 2px solid #ef4444;
    border-radius: 50%;
    color: #ef4444;
    font-size: 28px;
    cursor: pointer;
    z-index: 3001;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
`;
    closeBtn.onmouseover = () => {
        closeBtn.style.background = 'rgba(239, 68, 68, 0.4)';
        closeBtn.style.transform = 'scale(1.1)';
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        closeBtn.style.transform = 'scale(1)';
    };
    closeBtn.onclick = () => this.closeSkillTree();
    
    modal.appendChild(closeBtn);
    
// Create iframe for the actual skill tree
    const iframe = document.createElement('iframe');
    iframe.id = 'skill-tree-iframe';
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        background: #0a0e27;
    `;
    
    // Store game data for skill tree
    // FIX: Use member.className.toLowerCase() instead of hardcoded party order
    const charDisplayNames = { 
        tank: 'Tank', 
        healer: 'Healer', 
        mage: 'Mage', 
        rogue: 'Rogue', 
        archer: 'Archer', 
        paladin: 'Paladin' 
    };
    
    const gameData = {
        characters: {},
        partyComposition: []
    };
    
    this.party.forEach((member, idx) => {
        const charKey = member.className.toLowerCase();
        gameData.characters[charKey] = {
            allocatedNodes: Array.from(member.skillTreeData?.allocatedNodes || new Set([0])),
            usedPoints: member.skillTreeData?.usedPoints || 0,
            availablePoints: member.skillPoints,
            level: member.level // Add character level for proper skill point calculation
        };
        
        // Add to party composition with proper display name
        gameData.partyComposition.push({
            key: charKey,
            name: member.name || charDisplayNames[charKey] || member.className
        });
    });
    
    localStorage.setItem('gameSkillTreeData', JSON.stringify(gameData));
    localStorage.setItem('currentCharacterIndex', characterIndex.toString());
    
    // Set up message handler for iframe communication
    this._messageHandler = (event) => {
        if (event.data === 'closeSkillTree') {
            this.closeSkillTree();
        } else if (event.data && event.data.type === 'updateSkillTree') {
            // Update character data from skill tree
            const updatedData = JSON.parse(localStorage.getItem('skillTreeData'));
            if (updatedData && updatedData.characters) {
                this.party.forEach((member, idx) => {
                    const charKey = charNames[idx];
                    if (updatedData.characters[charKey]) {
                        member.skillTreeData = {
                            allocatedNodes: new Set(updatedData.characters[charKey].allocatedNodes || [0]),
                            usedPoints: updatedData.characters[charKey].usedPoints || 0
                        };
                        member.skillPoints = updatedData.characters[charKey].availablePoints || 0;
                    }
                });
            }
        }
    };
    window.addEventListener('message', this._messageHandler);
    
    // Add iframe to modal first
    modal.appendChild(iframe);
    
    // Add modal to overlay and overlay to document
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Now write the content after iframe is in the DOM
    setTimeout(() => {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(this.getSkillTreeHTML());
        doc.close();
        
        // Set up close monitoring after content is loaded
        this._closeCheckInterval = setInterval(() => {
            if (localStorage.getItem('skillTreeCloseRequested') === 'true') {
                localStorage.removeItem('skillTreeCloseRequested');
                this.closeSkillTree();
            }
        }, 100);
    }, 10);


    // Add ESC key listener
    this._escKeyHandler = (e) => {
        if (e.key === 'Escape') {
            this.closeSkillTree();
        }
    };
    document.addEventListener('keydown', this._escKeyHandler);
}
            
            closeSkillTree() {
    const overlay = document.getElementById('skill-tree-overlay');
    if (overlay) {
        // Clean up iframe properly to prevent memory leak
        const iframe = overlay.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.document.write('');
                iframe.contentWindow.close();
            } catch (e) {
                // Cross-origin restriction, just remove
            }
        }
        overlay.remove();
    }
    
    this.skillTreeOpen = false;
    this.paused = false;
    
    // Load updated skill tree data and apply stats
    // FIX: Use member.className.toLowerCase() instead of hardcoded party order
    const savedData = localStorage.getItem('skillTreeData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            this.party.forEach((member, idx) => {
                const charKey = member.className.toLowerCase();
                if (data.characters && data.characters[charKey]) {
                    member.skillTreeData = {
                        allocatedNodes: new Set(data.characters[charKey].allocatedNodes || [0]),
                        usedPoints: data.characters[charKey].usedPoints || 0
                    };
                    member.skillPoints = data.characters[charKey].availablePoints || 0;
                    
                    // Apply skill tree stats - this now properly recalculates max HP/Mana
                    this.applySkillTreeStats(member);
                    
                    // Count and unlock rune slots based on allocated nodes
                    let runeSlotCount = 0;
                    if (data.characters[charKey].totalStats) {
                        runeSlotCount = data.characters[charKey].totalStats.runeSlots || 0;
                    }
                    
                    // Update rune slots for this character
                    for (let i = 0; i < 5; i++) {
                        if (i < runeSlotCount) {
                            this.runeSlots[charKey][i] = true;
                        } else {
                            // Lock slot and unequip if needed
                            if (this.runeSlots[charKey][i] && this.equippedRunes[charKey][i]) {
                                const rune = this.equippedRunes[charKey][i];
                                this.equippedRunes[charKey][i] = null;
                                this.runes.push(rune);
                                this.addLog(`${rune.name} unequipped due to skill tree change`, 'loot');
                                
                                // Remove rune stats from character
                                if (rune.stats) {
                                    const hpPercent = member.hp / member.maxHp;
                                    const manaPercent = member.mana / member.maxMana;
                                    
                                    for (const [stat, value] of Object.entries(rune.stats)) {
                                        if (stat === 'hp') member.maxHp -= value;
                                        else if (stat === 'mana') member.maxMana -= value;
                                        else if (stat === 'attack') member.attack -= value;
                                        else if (stat === 'defense') member.defense -= value;
                                        else if (stat === 'attackSpeed') member.attackSpeed -= value / 100;
                                        else if (stat === 'critChance') member.critChance -= value;
                                        else if (stat === 'critDamage') member.critDamage -= value;
                                        else if (stat === 'dodge') member.dodgeChance -= value;
                                        else if (stat === 'lifesteal') member.lifesteal -= value;
                                        else if (stat === 'hpRegen') member.hpRegen -= value;
                                        else if (stat === 'manaRegen') member.manaRegen -= value;
                                        else if (stat === 'cdr') member.cdr -= value;
                                    }
                                    
                                    member.hp = Math.floor(member.maxHp * hpPercent);
                                    member.mana = Math.floor(member.maxMana * manaPercent);
                                }
                            }
                            this.runeSlots[charKey][i] = false;
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error loading skill tree data:', e);
        }
    }
                
                // Remove ESC key listener
                if (this._escKeyHandler) {
                    document.removeEventListener('keydown', this._escKeyHandler);
                    this._escKeyHandler = null;
                }
                
                // Remove message handler
                if (this._messageHandler) {
                    window.removeEventListener('message', this._messageHandler);
                    this._messageHandler = null;
                }
                
                // Clear any intervals
                if (this._closeCheckInterval) {
                    clearInterval(this._closeCheckInterval);
                    this._closeCheckInterval = null;
                }
                
                // Clean up localStorage
                localStorage.removeItem('skillTreeCloseRequested');
                localStorage.removeItem('gameSkillTreeData');
                localStorage.removeItem('currentCharacterIndex');
                
                // Update UI to reflect any changes
                this.updateUI();
                this.rebuildUI();
            }
            
            initializeSkillTree(canvas, tooltip, characterIndex) {
                const ctx = canvas.getContext('2d');
                const member = this.party[characterIndex];
                
                // Set canvas size
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                
                // Camera state
                const camera = {
                    x: 0,
                    y: 0,
                    zoom: 0.8
                };
                
                // Mouse state
                const mouse = {
                    x: 0,
                    y: 0,
                    worldX: 0,
                    worldY: 0,
                    dragging: false,
                    dragStartX: 0,
                    dragStartY: 0
                };
                
                // Initialize allocated nodes from member
                if (!member.allocatedNodes) {
                    member.allocatedNodes = new Set([0]);
                }
                const allocatedNodes = member.allocatedNodes;
                
                // Generate skill tree structure
                const nodes = [];
                const connections = [];
                
                // Node types with visual properties
                const nodeTypes = {
                    start: { size: 20, color: '#f59e0b', activeColor: '#fbbf24', borderColor: '#92400e' },
                    small: { size: 12, color: '#4a5568', activeColor: '#10b981', borderColor: '#1f2937' },
                    medium: { size: 16, color: '#6366f1', activeColor: '#3b82f6', borderColor: '#312e81' },
                    large: { size: 20, color: '#8b5cf6', activeColor: '#a855f7', borderColor: '#581c87' },
                    keystone: { size: 24, color: '#dc2626', activeColor: '#ef4444', borderColor: '#7f1d1d' }
                };
                
                // Create center start node
                nodes.push({
                    id: 0,
                    x: 0,
                    y: 0,
                    type: 'start',
                    display: 'Start',
                    stats: {},
                    cost: 0,
                    ...nodeTypes.start
                });
                
                // Generate branches
                const branches = 5;
                const angleStep = (Math.PI * 2) / branches;
                let nodeId = 1;
                
                for (let branch = 0; branch < branches; branch++) {
                    const angle = branch * angleStep - Math.PI / 2;
                    let lastNodeId = 0;
                    
                    // Create branch path
                    for (let i = 1; i <= 8; i++) {
                        const radius = i * 60;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        
                        let nodeType = 'small';
                        let stats = {};
                        let display = '';
                        
                        if (i === 4) {
                            nodeType = 'medium';
                            stats = { attack: 5 };
                            display = '+5 Attack';
                        } else if (i === 8) {
                            nodeType = 'keystone';
                            stats = { attack: 10, defense: -5 };
                            display = '+10 Atk, -5 Def';
                        } else {
                            stats = { hp: 10 };
                            display = '+10 HP';
                        }
                        
                        const node = {
                            id: nodeId++,
                            x: x,
                            y: y,
                            type: nodeType,
                            display: display,
                            stats: stats,
                            cost: 1,
                            ...nodeTypes[nodeType]
                        };
                        
                        nodes.push(node);
                        connections.push({ from: lastNodeId, to: node.id });
                        lastNodeId = node.id;
                    }
                }
                
                // Draw function
                const draw = () => {
                    ctx.fillStyle = '#0a0e27';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.save();
                    ctx.translate(canvas.width/2, canvas.height/2);
                    ctx.scale(camera.zoom, camera.zoom);
                    ctx.translate(camera.x, camera.y);
                    
                    // Draw connections
                    connections.forEach(conn => {
                        const fromNode = nodes.find(n => n.id === conn.from);
                        const toNode = nodes.find(n => n.id === conn.to);
                        
                        if (!fromNode || !toNode) return;
                        
                        const fromAllocated = allocatedNodes.has(fromNode.id);
                        const toAllocated = allocatedNodes.has(toNode.id);
                        const pathActive = fromAllocated && toAllocated;
                        
                        ctx.strokeStyle = pathActive ? 'rgba(16, 185, 129, 0.8)' : 'rgba(71, 85, 105, 0.3)';
                        ctx.lineWidth = pathActive ? 3 : 2;
                        
                        ctx.beginPath();
                        ctx.moveTo(fromNode.x, fromNode.y);
                        ctx.lineTo(toNode.x, toNode.y);
                        ctx.stroke();
                    });
                    
                    // Draw nodes
                    nodes.forEach(node => {
                        const allocated = allocatedNodes.has(node.id);
                        const canAllocate = member.skillPoints > 0 && connections.some(c => 
                            (c.from === node.id && allocatedNodes.has(c.to)) ||
                            (c.to === node.id && allocatedNodes.has(c.from))
                        ) && !allocated;
                        
                        // Glow effect
                        if (allocated || canAllocate) {
                            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 2);
                            gradient.addColorStop(0, allocated ? node.activeColor + '40' : 'rgba(99, 102, 241, 0.2)');
                            gradient.addColorStop(1, 'transparent');
                            ctx.fillStyle = gradient;
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        // Node border
                        ctx.strokeStyle = allocated ? node.activeColor : node.borderColor;
                        ctx.lineWidth = allocated ? 3 : 2;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                        ctx.stroke();
                        
                        // Node fill
                        ctx.fillStyle = allocated ? node.activeColor : node.color;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.size - 2, 0, Math.PI * 2);
                        ctx.fill();
                    });
                    
                    ctx.restore();
                };
                
                // Update stats display
                const updateStatsDisplay = () => {
                    const statsEl = document.getElementById('stats-list');
                    const pointsEl = document.getElementById('skill-points-display');
                    
                    pointsEl.textContent = member.skillPoints;
                    
                    const totalStats = {};
                    allocatedNodes.forEach(nodeId => {
                        const node = nodes.find(n => n.id === nodeId);
                        if (node && node.stats) {
                            Object.entries(node.stats).forEach(([stat, value]) => {
                                totalStats[stat] = (totalStats[stat] || 0) + value;
                            });
                        }
                    });
                    
                    if (Object.keys(totalStats).length === 0) {
                        statsEl.innerHTML = 'No nodes allocated';
                    } else {
                        const statNames = { hp: 'HP', attack: 'Attack', defense: 'Defense' };
                        statsEl.innerHTML = Object.entries(totalStats)
                            .map(([stat, value]) => `
                                <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                                    <span>${statNames[stat] || stat}:</span>
                                    <span style="color: ${value >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
                                        ${value >= 0 ? '+' : ''}${value}
                                    </span>
                                </div>
                            `).join('');
                    }
                };
                
                // Mouse event handlers
                canvas.addEventListener('mousemove', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    mouse.x = e.clientX - rect.left;
                    mouse.y = e.clientY - rect.top;
                    
                    mouse.worldX = (mouse.x - canvas.width/2) / camera.zoom - camera.x;
                    mouse.worldY = (mouse.y - canvas.height/2) / camera.zoom - camera.y;
                    
                    if (mouse.dragging) {
                        camera.x = (mouse.x - mouse.dragStartX) / camera.zoom + camera.startX;
                        camera.y = (mouse.y - mouse.dragStartY) / camera.zoom + camera.startY;
                        canvas.style.cursor = 'grabbing';
                    } else {
                        // Check for hovered node
                        let hoveredNode = null;
                        for (const node of nodes) {
                            const dist = Math.sqrt(
                                Math.pow(node.x - mouse.worldX, 2) + 
                                Math.pow(node.y - mouse.worldY, 2)
                            );
                            if (dist < node.size) {
                                hoveredNode = node;
                                break;
                            }
                        }
                        
                        if (hoveredNode) {
                            tooltip.innerHTML = `
                                <div style="font-weight: 700; margin-bottom: 8px; color: ${hoveredNode.activeColor}">
                                    ${hoveredNode.display}
                                </div>
                                ${hoveredNode.cost > 0 ? `<div style="color: #f59e0b;">Cost: ${hoveredNode.cost} point</div>` : ''}
                            `;
                            tooltip.style.display = 'block';
                            tooltip.style.left = `${mouse.x + 15}px`;
                            tooltip.style.top = `${mouse.y + 15}px`;
                            canvas.style.cursor = 'pointer';
                        } else {
                            tooltip.style.display = 'none';
                            canvas.style.cursor = 'grab';
                        }
                    }
                });
                
                canvas.addEventListener('mousedown', (e) => {
                    if (e.button === 0) { // Left click
                        let clickedNode = null;
                        for (const node of nodes) {
                            const dist = Math.sqrt(
                                Math.pow(node.x - mouse.worldX, 2) + 
                                Math.pow(node.y - mouse.worldY, 2)
                            );
                            if (dist < node.size) {
                                clickedNode = node;
                                break;
                            }
                        }
                        
                        if (clickedNode) {
                            // Try to allocate node
                            if (!allocatedNodes.has(clickedNode.id) && member.skillPoints >= clickedNode.cost) {
                                const hasPath = connections.some(c => 
                                    (c.from === clickedNode.id && allocatedNodes.has(c.to)) ||
                                    (c.to === clickedNode.id && allocatedNodes.has(c.from))
                                );
                                
                                if (hasPath) {
                                    allocatedNodes.add(clickedNode.id);
                                    member.skillPoints -= clickedNode.cost;
                                    
                                    // Apply stats to member
                                    if (clickedNode.stats) {
                                        Object.entries(clickedNode.stats).forEach(([stat, value]) => {
                                            if (stat === 'hp') member.maxHp += value;
                                            else if (stat === 'attack') member.attack += value;
                                            else if (stat === 'defense') member.defense += value;
                                        });
                                    }
                                    
                                    updateStatsDisplay();
                                }
                            }
                        } else {
                            // Start dragging
                            mouse.dragging = true;
                            mouse.dragStartX = mouse.x;
                            mouse.dragStartY = mouse.y;
                            camera.startX = camera.x;
                            camera.startY = camera.y;
                        }
                    }
                });
                
                canvas.addEventListener('mouseup', () => {
                    mouse.dragging = false;
                    canvas.style.cursor = 'grab';
                });
                
                canvas.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    
                    // Right click to deallocate
                    for (const node of nodes) {
                        const dist = Math.sqrt(
                            Math.pow(node.x - mouse.worldX, 2) + 
                            Math.pow(node.y - mouse.worldY, 2)
                        );
                        if (dist < node.size) {
                            if (node.id !== 0 && allocatedNodes.has(node.id)) {
                                // Check if removing would break the tree
                                const tempAllocated = new Set(allocatedNodes);
                                tempAllocated.delete(node.id);
                                
                                // Simple connectivity check
                                let canRemove = true;
                                tempAllocated.forEach(nodeId => {
                                    if (nodeId === 0) return;
                                    const hasConnection = connections.some(c => 
                                        (c.from === nodeId && tempAllocated.has(c.to)) ||
                                        (c.to === nodeId && tempAllocated.has(c.from))
                                    );
                                    if (!hasConnection) canRemove = false;
                                });
                                
                                if (canRemove) {
                                    allocatedNodes.delete(node.id);
                                    member.skillPoints += node.cost;
                                    
                                    // Remove stats from member
                                    if (node.stats) {
                                        Object.entries(node.stats).forEach(([stat, value]) => {
                                            if (stat === 'hp') member.maxHp -= value;
                                            else if (stat === 'attack') member.attack -= value;
                                            else if (stat === 'defense') member.defense -= value;
                                        });
                                    }
                                    
                                    updateStatsDisplay();
                                }
                            }
                            break;
                        }
                    }
                });
                
                canvas.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const zoomSpeed = 0.1;
                    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
                    camera.zoom = Math.max(0.3, Math.min(2, camera.zoom + delta));
                });
                
                canvas.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
                
                // Animation loop
                const animate = () => {
                    draw();
                    this._skillTreeAnimationFrame = requestAnimationFrame(animate);
                };
                
                updateStatsDisplay();
                animate();
            }
            
            checkKeystoneSlots() {
                // Sync rune slots from skill tree data
                // FIX: Use party member classes instead of hardcoded array
                const savedData = localStorage.getItem('skillTreeData');
                
                if (savedData) {
                    const data = JSON.parse(savedData);
                    
                    this.party.forEach((member, idx) => {
                        const charKey = member.className.toLowerCase();
                        if (data.characters && data.characters[charKey] && data.characters[charKey].totalStats) {
                            const runeSlotCount = data.characters[charKey].totalStats.runeSlots || 0;


                            // Update slots based on skill tree count
                            for (let i = 0; i < 5; i++) {
                                const shouldBeUnlocked = i < runeSlotCount;
                                const wasUnlocked = this.runeSlots[charKey][i];
                                
                                if (shouldBeUnlocked && !wasUnlocked) {
                                    // Unlock slot
                                    this.runeSlots[charKey][i] = true;
                                    
                                } else if (!shouldBeUnlocked && wasUnlocked) {
                                    // Lock slot and unequip if needed
                                    if (this.equippedRunes[charKey][i]) {
                                        const rune = this.equippedRunes[charKey][i];
                                        this.equippedRunes[charKey][i] = null;
                                        this.runes.push(rune);
                                        this.addLog(`${rune.name} unequipped due to skill tree change`, 'loot');
                                        
                                        // Remove rune stats
                                        const member = this.party[idx];
                                        if (member && rune.stats) {
                                            const hpPercent = member.hp / member.maxHp;
                                            const manaPercent = member.mana / member.maxMana;
                                            
                                            for (const [stat, value] of Object.entries(rune.stats)) {
                                                if (stat === 'hp') member.maxHp -= value;
                                                else if (stat === 'mana') member.maxMana -= value;
                                                else if (stat === 'attack') member.attack -= value;
                                                else if (stat === 'defense') member.defense -= value;
                                                else if (stat === 'attackSpeed') member.attackSpeed -= value / 100;
                                                else if (stat === 'critChance') member.critChance -= value;
                                                else if (stat === 'critDamage') member.critDamage -= value;
                                                else if (stat === 'dodge') member.dodgeChance -= value;
                                                else if (stat === 'lifesteal') member.lifesteal -= value;
                                                else if (stat === 'hpRegen') member.hpRegen -= value;
                                                else if (stat === 'manaRegen') member.manaRegen -= value;
                                                else if (stat === 'cdr') member.cdr -= value;
                                            }
                                            
                                            member.hp = Math.floor(member.maxHp * hpPercent);
                                            member.mana = Math.floor(member.maxMana * manaPercent);
                                        }
                                    }
                                    this.runeSlots[charKey][i] = false;
                                    
                                }
                            }
                        }
                    });
                }
                
                
            }
            
            applySkillTreeStats(member) {
                if (!member.skillTreeData || !member.skillTreeData.allocatedNodes) return;
                
                // Store current HP/Mana percentages BEFORE changing maxHp/maxMana
                const oldMaxHp = member.getTotalMaxHp();
                const oldMaxMana = member.getTotalMaxMana();
                const hpPercent = member.hp / oldMaxHp;
                const manaPercent = member.mana / oldMaxMana;
                
                // Reset skill tree bonuses to base
                member.skillTreeAttack = 0;
                member.skillTreeDefense = 0;
                member.skillTreeHP = 0;
                member.skillTreeMana = 0;
                member.skillTreeAttackSpeed = 0;
                member.skillTreeCritChance = 0;
                member.skillTreeCritDamage = 0;
                member.skillTreeDodge = 0;
                member.skillTreeLifesteal = 0;
                member.skillTreeHPRegen = 0;
                member.skillTreeManaRegen = 0;
                member.skillTreeCDR = 0;
                
                // Try to get stats from saved data first
                const savedData = localStorage.getItem('skillTreeData');
                if (savedData) {
                    try {
                        const data = JSON.parse(savedData);
                        // FIX: Use member.className.toLowerCase() instead of hardcoded party order
                        const charKey = member.className.toLowerCase();
                        
                        if (data.characters && data.characters[charKey] && data.characters[charKey].totalStats) {
                            const stats = data.characters[charKey].totalStats;
                            member.skillTreeAttack = stats.attack || 0;
                            member.skillTreeDefense = stats.defense || 0;
                            member.skillTreeHP = stats.hp || 0;
                            member.skillTreeMana = stats.mana || 0;
                            member.skillTreeAttackSpeed = stats.attackSpeed || 0;
                            member.skillTreeCritChance = stats.critChance || 0;
                            member.skillTreeCritDamage = stats.critDamage || 0;
                            member.skillTreeDodge = stats.dodge || 0;
                            member.skillTreeLifesteal = stats.lifesteal || 0;
                            member.skillTreeHPRegen = stats.hpRegen || 0;
                            member.skillTreeManaRegen = stats.manaRegen || 0;
                            member.skillTreeCDR = stats.cdr || 0;
                            
                            // Calculate bonuses from perEpic stats based on equipped epic+ items
                            const epicCount = Object.values(member.equipment).filter(item => 
                                item && (item.rarity === 'epic' || item.rarity === 'legendary' || item.rarity === 'mythic' || item.rarity === 'pinnacle')
                            ).length;
                            
                            if (epicCount > 0) {
                                if (stats.attPerEpic) {
                                    member.skillTreeAttack += stats.attPerEpic * epicCount;
                                }
                                if (stats.defPerEpic) {
                                    member.skillTreeDefense += stats.defPerEpic * epicCount;
                                }
                                if (stats.hpPerEpic) {
                                    member.skillTreeHP += stats.hpPerEpic * epicCount;
                                }
                                if (stats.manaPerEpic) {
                                    member.skillTreeMana += stats.manaPerEpic * epicCount;
                                }
                                if (stats.critDmgPerEpic) {
                                    member.skillTreeCritDamage += stats.critDmgPerEpic * epicCount;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error loading skill tree stats:', e);
                    }
                }
                
                // Calculate base max values
                const baseMaxHP = member.className === 'Tank' ? 100 : 
                                 member.className === 'Rogue' ? 80 :
                                 member.className === 'Mage' ? 70 : 
                                 member.className === 'Healer' ? 75 :
                                 member.className === 'Archer' ? 85 :
                                 member.className === 'Paladin' ? 90 : 100;
                const baseMaxMana = member.className === 'Tank' ? 50 :
                                   member.className === 'Rogue' ? 60 :
                                   member.className === 'Mage' ? 100 :
                                   member.className === 'Healer' ? 80 :
                                   member.className === 'Archer' ? 70 :
                                   member.className === 'Paladin' ? 65 : 50;
                
                // Recalculate max HP and Mana (base + level scaling only - equipment handled by getTotal functions)
member.maxHp = Math.round(baseMaxHP + (10 * (member.level - 1)));
member.maxMana = Math.round(baseMaxMana);

// Restore HP/Mana based on percentage using TOTAL max values (which include equipment)
const newMaxHp = member.getTotalMaxHp();
const newMaxMana = member.getTotalMaxMana();
member.hp = Math.round(newMaxHp * hpPercent);
member.mana = Math.round(newMaxMana * manaPercent);
                
                // Check and unlock rune slots based on skill tree
                this.checkKeystoneSlots();
            }
hideDungeonSelector() {
                document.getElementById('dungeon-selector').style.display = 'none';
                this.paused = false;
            }


rollRuneFromTrial(tier) {
    // Step 1: Determine if ability or stat rune (40% ability, 60% stat)
    const isAbilityRune = Math.random() < RUNE_TRIAL_CONFIG.ABILITY_RUNE_CHANCE;
    
    let runeType;
    
    if (isAbilityRune) {
        // Step 2: If ability rune, pick from abilities based on party composition
        const abilityMap = {
            'tank': 'taunt',
            'healer': 'heal',
            'mage': 'fireball',
            'rogue': 'doublestrike',
            'archer': 'multishot',
            'paladin': 'divineshield'
        };
        
        // Get abilities for classes in party
        const partyAbilities = this.party.map(m => abilityMap[m.className.toLowerCase()]).filter(a => a);
        runeType = partyAbilities[Math.floor(Math.random() * partyAbilities.length)];
    } else {
        // Step 2: If stat rune, pick one of 9 stat types (equal ~11.1% each)
        const statTypes = ['attack', 'attackspeed', 'defense', 'crit', 'dodge', 'lifesteal', 'time', 'health', 'mana'];
        runeType = statTypes[Math.floor(Math.random() * statTypes.length)];
    }
    
    // Create the rune (no level or rarity for runes)
    const rune = new RuneItem(tier, runeType);
    this.runes.push(rune);
    
    this.addLog(`Found ${rune.name}!`, 'loot');
    
    return rune;
}

rollPetRarity() {
                const roll = Math.random() * 100;
                
                if (roll < 50) return 'common';        // 50%
                if (roll < 75) return 'uncommon';      // 25%
                if (roll < 90) return 'rare';          // 15%
                if (roll < 99) return 'epic';          // 9%
                return 'legendary';                     // 1%
            }

            showPetsCollection() {
                const container = document.getElementById('pet-collection-container');
                
                // Comprehensive pet image mapping for migration
                const petImageMap = {
                    // Everfall (Air)
                    'Plumee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/plumee.png',
                    'Tuffit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/tuffit.png',
                    'Zeffi': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zeffi.png',
                    'Loofin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/loofin.png',
                    'Flitta': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/flitta.png',
                    'Preep': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/preep.png',
                    'Skibbin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/skibbin.png',
                    'Fandrel': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/fandrel.png',
                    'Yuralon': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/yuralon.png',
                    'Zenth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zenth.png',
                    'Arvent': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/arvent.png',
                    'Quist': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/quist.png',
                    'Whisbit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/whisbit.png',
                    'Siroth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/siroth.png',
                    // Stoneforge (Fire)
                    'Crimbee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/crimbee.png',
                    'Pikkit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/pikkit.png',
                    'Gritbun': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/gritbun.png',
                    'Fennix': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/fennix.png',
                    'Varnowl': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/varnowl.png',
                    'Bristlepup': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/bristlepup.png',
                    'Ignishade': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ignishade.png',
                    'Wiskit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/wiskit.png',
                    'Quenra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/quenra.png',
                    'Cindor': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/cindor.png',
                    'Solmere': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/solmere.png',
                    'Moltara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/moltara.png',
                    'Braxen': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/braxen.png',
                    'Ashkara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ashkara.png',
                    // Umbral Depths (Water)
                    'Pepple': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/pepple.png',
                    'Nymbark': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/nymbark.png',
                    'Moondra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/moondra.png',
                    'Typharos': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/typharos.png'
                };
                
                // Fix old pets without images
                this.pets.forEach(pet => {
                    if (!pet.image) {
                        pet.image = petImageMap[pet.name] || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png';
                    }
                });
                
                // Fix equipped pets without images
                ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'].forEach(charKey => {
                    const pet = this.equippedPets[charKey];
                    if (pet && !pet.image) {
                        pet.image = petImageMap[pet.name] || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png';
                    }
                });
                
                const rarityColors = {
                    common: '#94a3b8',
                    uncommon: '#10b981',
                    rare: '#3b82f6',
                    epic: '#a855f7',
                    legendary: '#f59e0b'
                };
                
                // FIX: Use actual party order instead of hardcoded array
                
                // Build compact equipped pets grid
                const equippedPetsHTML = `
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; text-align: center; font-weight: 600;">Equipped Pets</div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 15px;">
                            ${this.party.map((member, idx) => {
                                const charKey = member.className.toLowerCase();
                                const pet = this.equippedPets[charKey];
                                const charName = member.name;
                                
                                if (pet) {
                                    return `
                                        <div style="background: rgba(15, 23, 42, 0.5); border: 2px solid ${rarityColors[pet.rarity]}; border-radius: 6px; padding: 6px; text-align: center;">
                                            <img src="${pet.image}" 
                                                style="width: 32px; height: 32px; border-radius: 4px; margin-bottom: 3px;">
                                            <div style="font-size: 8px; color: ${rarityColors[pet.rarity]}; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pet.name}</div>
                                            <div style="font-size: 7px; color: #64748b;">${charName}</div>
                                        </div>
                                    `;
                                } else {
                                    return `
                                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px dashed rgba(100, 116, 139, 0.3); border-radius: 6px; padding: 6px; text-align: center;">
                                            <div style="font-size: 20px; color: #475569; margin-bottom: 2px;">🐾</div>
                                            <div style="font-size: 7px; color: #64748b;">${charName}</div>
                                        </div>
                                    `;
                                }
                            }).join('')}
                        </div>
                        <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(99, 102, 241, 0.3), transparent); margin: 10px 0;"></div>
                        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; text-align: center; font-weight: 600;">Pet Collection (${this.pets.length})</div>
                    </div>
                `;
                
                if (this.pets.length === 0) {
                    container.innerHTML = equippedPetsHTML + `
                        <div style="color: #64748b; font-style: italic; font-size: 12px; text-align: center; padding: 40px;">
                            No pets found yet<br>
                            <span style="font-size: 10px; color: #52525b;">Defeat enemies to collect pets!</span>
                        </div>
                    `;
                    return;
                }
                
                // Sort pets by rarity then level
                const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
                const sortedPets = [...this.pets].sort((a, b) => {
                    if (rarityOrder[b.rarity] !== rarityOrder[a.rarity]) {
                        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
                    }
                    return b.level - a.level;
                });
                
                const charIcons = { tank: '🛡️', healer: '💊', mage: '🔮', rogue: '🗡️' };
                
                container.innerHTML = equippedPetsHTML + `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">` + sortedPets.map(pet => {
                    const upgradeCost = pet.getUpgradeCost();
                    const bonus = pet.getCurrentBonus();
                    const bonusDisplay = ['attackSpeed', 'critChance', 'dodge', 'critDamage'].includes(pet.bonusType) 
                        ? `+${bonus}%` 
                        : `+${bonus}`;
                    
                    // Find which character has this pet equipped - FIX: Use Object.entries
                    let equippedTo = null;
                    for (const [charType, equippedPet] of Object.entries(this.equippedPets)) {
                        if (equippedPet === pet) {
                            equippedTo = charType;
                            break;
                        }
                    }
                    
                    return `
                        <div class="pet-collection-card" style="
                            background: linear-gradient(135deg, rgba(${pet.rarity === 'legendary' ? '245, 158, 11' : 
                                            pet.rarity === 'epic' ? '168, 85, 247' : 
                                            pet.rarity === 'rare' ? '59, 130, 246' : 
                                            pet.rarity === 'uncommon' ? '16, 185, 129' : '148, 163, 184'}, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%);
                            border: 2px solid ${rarityColors[pet.rarity]};
                            border-radius: 8px;
                            padding: 10px;
                            position: relative;
                            ${equippedTo ? 'box-shadow: 0 0 15px ' + rarityColors[pet.rarity] + ';' : ''}
                        ">
                            ${equippedTo ? `
                                <div style="position: absolute; top: 4px; right: 4px; background: rgba(99, 102, 241, 0.9); 
                                    color: white; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700;">
                                    ${charIcons[equippedTo]}
                                </div>
                            ` : ''}
                            
                            <div style="text-align: center; margin-bottom: 8px;">
                                <img src="${pet.image}" 
                                    style="width: 60px; height: 60px; border-radius: 8px; border: 2px solid ${rarityColors[pet.rarity]};">
                            </div>
                            
                            <div style="text-align: center; margin-bottom: 8px;">
                                <div style="font-weight: 700; color: ${rarityColors[pet.rarity]}; font-size: 12px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${pet.name}
                                </div>
                                <div style="font-size: 9px; color: #94a3b8;">
                                    ${pet.rarity.toUpperCase()} • Lv${pet.level}
                                </div>
                            </div>
                            
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 6px; border-radius: 6px; margin-bottom: 8px;">
                                <div style="color: #10b981; font-size: 10px; text-align: center; font-weight: 600;">
                                    ${pet.bonusType === 'attackSpeed' ? 'ATK SPD' :
                                      pet.bonusType === 'critChance' ? 'CRIT' :
                                      pet.bonusType === 'critDamage' ? 'CRIT DMG' :
                                      pet.bonusType === 'lifesteal' ? 'LIFESTEAL' :
                                      pet.bonusType === 'manaRegen' ? 'MANA REGEN' :
                                      pet.bonusType === 'hpRegen' ? 'HP REGEN' :
                                      pet.bonusType === 'cdr' ? 'CDR' :
                                      pet.bonusType.toUpperCase()}: ${bonusDisplay}
                                </div>
                            </div>
                            
                            ${equippedTo ? `
                                <button onclick="window.game.unequipPet('${equippedTo}')" 
                                    style="width: 100%; padding: 6px; background: rgba(239, 68, 68, 0.2); 
                                    color: #ef4444; border: 2px solid #ef4444; border-radius: 6px; cursor: pointer; 
                                    font-size: 9px; font-weight: 700; margin-bottom: 4px;">
                                    UNEQUIP
                                </button>
                            ` : `
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px;">
                                    <button onclick="window.game.showEquipPetModal(${pet.id})" 
                                        style="padding: 6px; background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                                        color: white; border: none; border-radius: 6px; cursor: pointer; 
                                        font-size: 9px; font-weight: 700;">
                                        EQUIP
                                    </button>
                                    <button onclick="window.game.showUpgradePetModal(${pet.id})" 
                                        ${pet.level >= 20 ? 'disabled' : ''}
                                        style="padding: 6px; background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                                        color: #000; border: none; border-radius: 6px; cursor: pointer; font-size: 9px; font-weight: 700;
                                        ${pet.level >= 20 ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                                        ${pet.level >= 20 ? 'MAX' : 'UPGRADE'}
                                    </button>
                                </div>
                            `}
                            
                            <button onclick="window.game.showReleasePetModal(${pet.id})" 
                                ${equippedTo ? 'disabled' : ''}
                                style="width: 100%; padding: 5px; background: linear-gradient(135deg, #ef4444, #dc2626); 
                                color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 9px; font-weight: 700;
                                ${equippedTo ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                                RELEASE
                            </button>
                        </div>
                    `;
                }).join('') + `</div>`;
            }

            showEquipPetModal(petId) {
                const pet = this.pets.find(p => p.id === petId);
                if (!pet) return;
                
                // Fix pet image if missing (migration)
                if (!pet.image) {
                    const petImageMap = {
                        'Plumee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/plumee.png',
                        'Tuffit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/tuffit.png',
                        'Zeffi': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zeffi.png',
                        'Loofin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/loofin.png',
                        'Flitta': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/flitta.png',
                        'Preep': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/preep.png',
                        'Skibbin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/skibbin.png',
                        'Fandrel': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/fandrel.png',
                        'Yuralon': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/yuralon.png',
                        'Zenth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zenth.png',
                        'Arvent': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/arvent.png',
                        'Quist': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/quist.png',
                        'Whisbit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/whisbit.png',
                        'Siroth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/siroth.png',
                        'Crimbee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/crimbee.png',
                        'Pikkit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/pikkit.png',
                        'Gritbun': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/gritbun.png',
                        'Fennix': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/fennix.png',
                        'Varnowl': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/varnowl.png',
                        'Bristlepup': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/bristlepup.png',
                        'Ignishade': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ignishade.png',
                        'Wiskit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/wiskit.png',
                        'Quenra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/quenra.png',
                        'Cindor': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/cindor.png',
                        'Solmere': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/solmere.png',
                        'Moltara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/moltara.png',
                        'Braxen': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/braxen.png',
                        'Ashkara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ashkara.png',
                        'Pepple': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/pepple.png',
                        'Nymbark': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/nymbark.png',
                        'Moondra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/moondra.png',
                        'Typharos': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/typharos.png'
                    };
                    pet.image = petImageMap[pet.name] || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png';
                }
                
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 5000;';
                
                const panel = document.createElement('div');
                panel.style.cssText = 'background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 3px solid #6366f1; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9); max-width: 400px;';
                
                const rarityColors = {
                    common: '#94a3b8',
                    uncommon: '#10b981',
                    rare: '#3b82f6',
                    epic: '#a855f7',
                    legendary: '#f59e0b'
                };
                
                // Get only the active party members (4 characters)
                const activeCharKeys = this.party.map(member => member.className.toLowerCase());
                
                const charIcons = { 
                    tank: '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/tank.png" alt="Tank" style="width: 16px; height: 16px; vertical-align: middle;">', 
                    healer: '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/healer.png" alt="Healer" style="width: 16px; height: 16px; vertical-align: middle;">', 
                    mage: '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/mage.png" alt="Mage" style="width: 16px; height: 16px; vertical-align: middle;">', 
                    rogue: '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/rogue.png" alt="Rogue" style="width: 16px; height: 16px; vertical-align: middle;">',
                    archer: '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/archer.png" alt="Archer" style="width: 16px; height: 16px; vertical-align: middle;">',
                    paladin: '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/paladin.png" alt="Paladin" style="width: 16px; height: 16px; vertical-align: middle;">'
                };
                const charDisplayNames = { tank: 'Tank', healer: 'Healer', mage: 'Mage', rogue: 'Rogue', archer: 'Archer', paladin: 'Paladin' };
                
                panel.innerHTML = `
                    <img src="${pet.image || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png'}" 
                        style="width: 100px; height: 100px; border-radius: 16px; border: 3px solid ${rarityColors[pet.rarity]}; margin-bottom: 20px;">
                    <div style="font-family: 'Orbitron', sans-serif; font-size: 24px; font-weight: 800; color: ${rarityColors[pet.rarity]}; margin-bottom: 20px;">
                        EQUIP ${pet.name.toUpperCase()}
                    </div>
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 30px;">Select a character:</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                        ${activeCharKeys.map(char => `
                            <button onclick="window.game.equipPetToCharacterFromModal(${pet.id}, '${char}'); this.closest('[style*=fixed]').remove();" 
                                style="padding: 15px; background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                                color: white; border: none; border-radius: 10px; cursor: pointer; 
                                font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700;">
                                ${charIcons[char]} ${charDisplayNames[char]}
                            </button>
                        `).join('')}
                    </div>
                    <button onclick="this.closest('[style*=fixed]').remove();" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #ef4444, #dc2626); 
                        color: white; border: none; border-radius: 10px; cursor: pointer; 
                        font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700;">
                        CANCEL
                    </button>
                `;
                
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
            }
            equipPetToCharacterFromModal(petId, charKey) {
                this.equipPetToCharacter(petId, charKey);
                this.showPetsCollection();
            }

            showUpgradePetModal(petId) {
                const pet = this.pets.find(p => p.id === petId);
                if (!pet || pet.level >= 20) return;
                
                // Fix pet image if missing (migration)
                if (!pet.image) {
                    const petImageMap = {
                        'Plumee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/plumee.png',
                        'Tuffit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/tuffit.png',
                        'Zeffi': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zeffi.png',
                        'Loofin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/loofin.png',
                        'Flitta': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/flitta.png',
                        'Preep': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/preep.png',
                        'Skibbin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/skibbin.png',
                        'Fandrel': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/fandrel.png',
                        'Yuralon': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/yuralon.png',
                        'Zenth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zenth.png',
                        'Arvent': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/arvent.png',
                        'Quist': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/quist.png',
                        'Whisbit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/whisbit.png',
                        'Siroth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/siroth.png',
                        'Crimbee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/crimbee.png',
                        'Pikkit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/pikkit.png',
                        'Gritbun': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/gritbun.png',
                        'Fennix': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/fennix.png',
                        'Varnowl': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/varnowl.png',
                        'Bristlepup': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/bristlepup.png',
                        'Ignishade': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ignishade.png',
                        'Wiskit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/wiskit.png',
                        'Quenra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/quenra.png',
                        'Cindor': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/cindor.png',
                        'Solmere': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/solmere.png',
                        'Moltara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/moltara.png',
                        'Braxen': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/braxen.png',
                        'Ashkara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ashkara.png',
                        'Pepple': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/pepple.png',
                        'Nymbark': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/nymbark.png',
                        'Moondra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/moondra.png',
                        'Typharos': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/typharos.png'
                    };
                    pet.image = petImageMap[pet.name] || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png';
                }
                
                const upgradeCost = pet.getUpgradeCost();
                const currentBonus = pet.getCurrentBonus();
                const nextBonus = pet.baseValue + (pet.upgradeValue * pet.level); // Next level bonus
                
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 5000;';
                
                const panel = document.createElement('div');
                panel.style.cssText = 'background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 3px solid #f59e0b; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9); max-width: 400px;';
                
                const rarityColors = {
                    common: '#94a3b8',
                    uncommon: '#10b981',
                    rare: '#3b82f6',
                    epic: '#a855f7',
                    legendary: '#f59e0b'
                };
                
                const statName = pet.bonusType === 'attackSpeed' ? 'Attack Speed' :
                                pet.bonusType === 'critChance' ? 'Crit Chance' :
                                pet.bonusType === 'critDamage' ? 'Crit Damage' :
                                pet.bonusType === 'lifesteal' ? 'Lifesteal' :
                                pet.bonusType === 'manaRegen' ? 'Mana Regen' :
                                pet.bonusType === 'hpRegen' ? 'HP Regen' :
                                pet.bonusType === 'cdr' ? 'CDR' :
                                pet.bonusType.charAt(0).toUpperCase() + pet.bonusType.slice(1);
                
                const isPercent = ['attackSpeed', 'critChance', 'critDamage', 'dodge', 'lifesteal', 'cdr'].includes(pet.bonusType);
                const currentDisplay = isPercent ? `${currentBonus}%` : currentBonus;
                const nextDisplay = isPercent ? `${nextBonus}%` : nextBonus;
                
                panel.innerHTML = `
                    <img src="${pet.image || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png'}" 
                        style="width: 100px; height: 100px; border-radius: 16px; border: 3px solid ${rarityColors[pet.rarity]}; margin-bottom: 20px;">
                    <div style="font-family: 'Orbitron', sans-serif; font-size: 24px; font-weight: 800; color: #f59e0b; margin-bottom: 20px;">
                        UPGRADE ${pet.name.toUpperCase()}
                    </div>
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Level ${pet.level} → ${pet.level + 1}</div>
                    <div style="background: rgba(0, 0, 0, 0.4); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 10px;">${statName}</div>
                        <div style="font-size: 20px; color: #10b981; font-weight: 700; font-family: 'Orbitron', sans-serif;">
                            ${currentDisplay} → ${nextDisplay}
                        </div>
                    </div>
                    <div style="font-size: 16px; color: #fbbf24; font-weight: 700; margin-bottom: 20px; font-family: 'Orbitron', sans-serif;">
                        Cost: ${upgradeCost.toLocaleString()}g
                    </div>
                    <button onclick="window.game.upgradePetFromModal(${pet.id}); this.closest('[style*=fixed]').remove();" 
                        ${this.gold < upgradeCost ? 'disabled' : ''}
                        style="width: 100%; padding: 15px; background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                        color: #000; border: none; border-radius: 10px; cursor: pointer; 
                        font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 10px;
                        ${this.gold < upgradeCost ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                        ${this.gold < upgradeCost ? 'NOT ENOUGH GOLD' : 'UPGRADE'}
                    </button>
                    <button onclick="this.closest('[style*=fixed]').remove();" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #ef4444, #dc2626); 
                        color: white; border: none; border-radius: 10px; cursor: pointer; 
                        font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700;">
                        CANCEL
                    </button>
                `;
                
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
            }

            upgradePetFromModal(petId) {
                this.upgradePet(petId);
                this.showPetsCollection();
            }

            showReleasePetModal(petId) {
                const pet = this.pets.find(p => p.id === petId);
                if (!pet) return;
                
                // Check if equipped - don't show modal if equipped
                const equippedPetsList = Object.values(this.equippedPets);
                if (equippedPetsList.includes(pet)) {
                    this.addLog('Cannot release equipped pet!', 'damage');
                    return;
                }
                
                // Fix pet image if missing (migration)
                if (!pet.image) {
                    const petImageMap = {
                        'Plumee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/plumee.png',
                        'Tuffit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/tuffit.png',
                        'Zeffi': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zeffi.png',
                        'Loofin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/loofin.png',
                        'Flitta': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/flitta.png',
                        'Preep': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/preep.png',
                        'Skibbin': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/skibbin.png',
                        'Fandrel': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/fandrel.png',
                        'Yuralon': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/yuralon.png',
                        'Zenth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zenth.png',
                        'Arvent': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/arvent.png',
                        'Quist': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/quist.png',
                        'Whisbit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/whisbit.png',
                        'Siroth': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/siroth.png',
                        'Crimbee': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/crimbee.png',
                        'Pikkit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/pikkit.png',
                        'Gritbun': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/gritbun.png',
                        'Fennix': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/fennix.png',
                        'Varnowl': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/varnowl.png',
                        'Bristlepup': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/bristlepup.png',
                        'Ignishade': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ignishade.png',
                        'Wiskit': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/wiskit.png',
                        'Quenra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/quenra.png',
                        'Cindor': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/cindor.png',
                        'Solmere': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/solmere.png',
                        'Moltara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/moltara.png',
                        'Braxen': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/braxen.png',
                        'Ashkara': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ashkara.png',
                        'Pepple': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/pepple.png',
                        'Nymbark': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/nymbark.png',
                        'Moondra': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/moondra.png',
                        'Typharos': 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/typharos.png'
                    };
                    pet.image = petImageMap[pet.name] || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png';
                }
                
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 5000;';
                
                const panel = document.createElement('div');
                panel.style.cssText = 'background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 3px solid #ef4444; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9); max-width: 400px;';
                
                const rarityColors = {
                    common: '#94a3b8',
                    uncommon: '#10b981',
                    rare: '#3b82f6',
                    epic: '#a855f7',
                    legendary: '#f59e0b'
                };
                
                const currentBonus = pet.getCurrentBonus();
                const statName = pet.bonusType === 'attackSpeed' ? 'Attack Speed' :
                                pet.bonusType === 'critChance' ? 'Crit Chance' :
                                pet.bonusType === 'critDamage' ? 'Crit Damage' :
                                pet.bonusType === 'lifesteal' ? 'Lifesteal' :
                                pet.bonusType === 'manaRegen' ? 'Mana Regen' :
                                pet.bonusType === 'hpRegen' ? 'HP Regen' :
                                pet.bonusType === 'cdr' ? 'CDR' :
                                pet.bonusType.charAt(0).toUpperCase() + pet.bonusType.slice(1);
                
                const isPercent = ['attackSpeed', 'critChance', 'critDamage', 'dodge', 'lifesteal', 'cdr'].includes(pet.bonusType);
                const bonusDisplay = isPercent ? `${currentBonus}%` : currentBonus;
                
                panel.innerHTML = `
                    <img src="${pet.image || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png'}" 
                        style="width: 100px; height: 100px; border-radius: 16px; border: 3px solid ${rarityColors[pet.rarity]}; margin-bottom: 20px;">
                    <div style="font-family: 'Orbitron', sans-serif; font-size: 24px; font-weight: 800; color: #ef4444; margin-bottom: 20px;">
                        RELEASE ${pet.name.toUpperCase()}?
                    </div>
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 20px;">
                        ${pet.rarity.charAt(0).toUpperCase() + pet.rarity.slice(1)} · Level ${pet.level}
                    </div>
                    <div style="background: rgba(0, 0, 0, 0.4); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 10px;">${statName}</div>
                        <div style="font-size: 20px; color: #10b981; font-weight: 700; font-family: 'Orbitron', sans-serif;">
                            +${bonusDisplay}
                        </div>
                    </div>
                    <div style="font-size: 13px; color: #ef4444; margin-bottom: 20px; font-weight: 600;">
                        ⚠️ This action cannot be undone!
                    </div>
                    <button onclick="window.game.releasePetFromModal(${pet.id}); this.closest('[style*=fixed]').remove();" 
                        style="width: 100%; padding: 15px; background: linear-gradient(135deg, #ef4444, #dc2626); 
                        color: white; border: none; border-radius: 10px; cursor: pointer; 
                        font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 10px;">
                        RELEASE PET
                    </button>
                    <button onclick="this.closest('[style*=fixed]').remove();" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #64748b, #475569); 
                        color: white; border: none; border-radius: 10px; cursor: pointer; 
                        font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700;">
                        CANCEL
                    </button>
                `;
                
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
            }

            releasePetFromModal(petId) {
                this.releasePet(petId);
            }

            releasePet(petId) {
                const pet = this.pets.find(p => p.id === petId);
                if (!pet) return;
                
                // Check if equipped - FIX: Use Object.values instead of hardcoded array
                const equippedPetsList = Object.values(this.equippedPets);
                if (equippedPetsList.includes(pet)) {
                    this.addLog('Cannot release equipped pet!', 'damage');
                    return;
                }
                
                // No gold given for releasing pets
                
                const petIndex = this.pets.indexOf(pet);
                this.pets.splice(petIndex, 1);
                
                this.addLog(`Released ${pet.name}`, 'loot');
                this.showPetsCollection();
                this.updateUI();
            }

            updatePetDisplay(memberIndex) {
                // FIX: Use member.className.toLowerCase() instead of hardcoded array
                const member = this.party[memberIndex];
                if (!member) return;
                
                const charKey = member.className.toLowerCase();
                
                // Find the pet view for this character
                const memberCard = document.querySelectorAll('.member-card')[memberIndex];
                if (!memberCard) return;
                
                const petView = memberCard.querySelector('.pet-view');
                if (!petView) return;
                
                const petSlotDisplay = petView.querySelector('.pet-slot-display');
                const petInventoryList = petView.querySelector('.pet-inventory-list');
                
                // Show equipped pet
                const equippedPet = this.equippedPets[charKey];
                if (equippedPet) {
                    const bonus = equippedPet.getCurrentBonus();
                    const bonusDisplay = ['attackSpeed', 'critChance', 'dodge', 'critDamage'].includes(equippedPet.bonusType) 
                        ? `+${bonus}%` 
                        : `+${bonus}`;
                    
                    const rarityColors = {
                        common: '#94a3b8',
                        uncommon: '#10b981',
                        rare: '#3b82f6',
                        epic: '#a855f7',
                        legendary: '#f59e0b'
                    };
                    
                    const upgradeCost = equippedPet.getUpgradeCost();
                    const canUpgrade = equippedPet.level < 20;
                    
                    petSlotDisplay.innerHTML = `
                        <div style="background: rgba(${equippedPet.rarity === 'legendary' ? '245, 158, 11' : 
                                        equippedPet.rarity === 'epic' ? '168, 85, 247' : 
                                        equippedPet.rarity === 'rare' ? '59, 130, 246' : 
                                        equippedPet.rarity === 'uncommon' ? '16, 185, 129' : '148, 163, 184'}, 0.15);
                            border: 2px solid ${rarityColors[equippedPet.rarity]};
                            border-radius: 8px;
                            padding: 12px;
                            box-shadow: 0 0 10px ${rarityColors[equippedPet.rarity]};">
                            <img src="https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png" 
                                style="width: 60px; height: 60px; border-radius: 8px; display: block; margin: 0 auto 8px;">
                            <div style="font-weight: 700; font-size: 13px; text-align: center; color: ${rarityColors[equippedPet.rarity]};">
                                ${equippedPet.name}
                            </div>
                            <div style="font-size: 10px; text-align: center; color: #94a3b8; margin: 3px 0;">
                                Level ${equippedPet.level}
                            </div>
                            <div style="text-align: center; color: #10b981; font-size: 11px; margin-top: 5px;">
                                ${equippedPet.bonusType.toUpperCase()}: ${bonusDisplay}
                            </div>
                            ${canUpgrade ? `
                                <button onclick="window.game.upgradePet(${equippedPet.id})" 
                                    style="width: 100%; margin-top: 8px; padding: 6px; background: rgba(245, 158, 11, 0.2); 
                                    color: #fbbf24; border: 1px solid #f59e0b; border-radius: 6px; cursor: pointer; 
                                    font-size: 10px; font-weight: 600;">
                                    UPGRADE (💰 ${upgradeCost.toLocaleString()})
                                </button>
                            ` : `
                                <div style="width: 100%; margin-top: 8px; padding: 6px; background: rgba(100, 116, 139, 0.2); 
                                    color: #64748b; border: 1px solid #64748b; border-radius: 6px; text-align: center;
                                    font-size: 10px; font-weight: 600;">
                                    MAX LEVEL
                                </div>
                            `}
                            <button onclick="window.game.unequipPet('${charKey}')" 
                                style="width: 100%; margin-top: 8px; padding: 6px; background: rgba(239, 68, 68, 0.2); 
                                color: #ef4444; border: 1px solid #ef4444; border-radius: 6px; cursor: pointer; 
                                font-size: 10px; font-weight: 600;">
                                UNEQUIP
                            </button>
                        </div>
                    `;
                } else {
                    petSlotDisplay.innerHTML = `
                        <div style="color: #64748b; font-style: italic; font-size: 11px; padding: 20px;">
                            No pet equipped
                        </div>
                    `;
                }
                
                // Show available pets
                if (this.pets.length === 0) {
                    petInventoryList.innerHTML = `
                        <div style="color: #64748b; font-style: italic; font-size: 10px; text-align: center; padding: 15px;">
                            No pets found<br>
                            <span style="font-size: 9px;">Defeat enemies!</span>
                        </div>
                    `;
                    return;
                }
                
                // Filter out equipped pets from other characters
                const availablePets = this.pets.filter(pet => {
                    const equippedChars = Object.values(this.equippedPets);
                    return !equippedChars.includes(pet) || pet === equippedPet;
                });
                
                // Sort pets by rarity then level
                const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
                const sortedPets = [...availablePets].sort((a, b) => {
                    if (rarityOrder[b.rarity] !== rarityOrder[a.rarity]) {
                        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
                    }
                    return b.level - a.level;
                });
                
                const rarityColors = {
                    common: '#94a3b8',
                    uncommon: '#10b981',
                    rare: '#3b82f6',
                    epic: '#a855f7',
                    legendary: '#f59e0b'
                };
                
                petInventoryList.innerHTML = sortedPets.map(pet => {
                    const upgradeCost = pet.getUpgradeCost();
                    const bonus = pet.getCurrentBonus();
                    const bonusDisplay = ['attackSpeed', 'critChance', 'dodge', 'critDamage'].includes(pet.bonusType) 
                        ? `+${bonus}%` 
                        : `+${bonus}`;
                    
                    return `
                        <div style="
                            background: rgba(${pet.rarity === 'legendary' ? '245, 158, 11' : 
                                            pet.rarity === 'epic' ? '168, 85, 247' : 
                                            pet.rarity === 'rare' ? '59, 130, 246' : 
                                            pet.rarity === 'uncommon' ? '16, 185, 129' : '148, 163, 184'}, 0.1);
                            border: 1px solid ${rarityColors[pet.rarity]};
                            border-radius: 6px;
                            padding: 8px;
                            margin-bottom: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <img src="https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png" 
                                    style="width: 40px; height: 40px; border-radius: 6px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 700; color: ${rarityColors[pet.rarity]}; font-size: 11px;">
                                        ${pet.name}
                                    </div>
                                    <div style="font-size: 9px; color: #94a3b8;">
                                        ${pet.rarity.toUpperCase()} • Lv.${pet.level}
                                    </div>
                                </div>
                            </div>
                            <div style="background: rgba(0, 0, 0, 0.2); padding: 5px; border-radius: 4px; margin-bottom: 6px;">
                                <div style="color: #10b981; font-size: 10px; text-align: center;">
                                    ${pet.bonusType.toUpperCase()}: ${bonusDisplay}
                                </div>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <button onclick="window.game.equipPetToCharacter(${pet.id}, '${charKey}')" 
                                    style="flex: 1; padding: 5px; background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                                    color: white; border: none; border-radius: 4px; cursor: pointer; 
                                    font-size: 9px; font-weight: 600;">
                                    EQUIP
                                </button>
                                <button onclick="window.game.upgradePet(${pet.id})" 
                                    ${this.gold < upgradeCost ? 'disabled' : ''}
                                    style="flex: 1; padding: 5px; background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                                    color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600;
                                    ${this.gold < upgradeCost ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                                    ${upgradeCost}g
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            equipPetToCharacter(petId, charKey) {
                const pet = this.pets.find(p => p.id === petId);
                if (!pet) return;
                
                const memberIndex = ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'].indexOf(charKey);
                const member = this.party[memberIndex];
                
                // Unequip current pet from this character if any
                if (this.equippedPets[charKey]) {
                    const oldPet = this.equippedPets[charKey];
                    this.removePetBonus(oldPet, member);
                    // Add old pet back to inventory
                    this.pets.push(oldPet);
                }
                
                // Remove new pet from inventory
                const petIndex = this.pets.indexOf(pet);
                if (petIndex > -1) {
                    this.pets.splice(petIndex, 1);
                }
                
                // Equip new pet
                this.equippedPets[charKey] = pet;
                this.applyPetBonus(pet, member);
                
                this.addLog(`${member.name} equipped ${pet.name}!`, 'loot');
                this.rebuildUI();
                this.showPetsCollection();
            }

            unequipPet(charKey) {
                // Find the party member with this className (case-insensitive match)
                const member = this.party.find(m => m.className.toLowerCase() === charKey.toLowerCase());
                const pet = this.equippedPets[charKey];
                
                if (!pet || !member) return;
                
                this.removePetBonus(pet, member);
                this.equippedPets[charKey] = null;
                
                // CRITICAL FIX: Add pet back to inventory when unequipping
                this.pets.push(pet);
                
                this.addLog(`${member.name} unequipped ${pet.name}`, 'loot');
                this.rebuildUI();
                this.showPetsCollection();
            }

            upgradePet(petId) {
                // Search in both unequipped pets and equipped pets
                let pet = this.pets.find(p => p.id === petId);
                
                // If not found in unequipped, search in equipped pets - FIX: Use Object.values
                if (!pet) {
                    pet = Object.values(this.equippedPets).find(p => p && p.id === petId);
                }
                
                if (!pet) return;
                
                const cost = pet.getUpgradeCost();
                if (this.gold < cost) {
                    this.addLog('Not enough gold!', 'damage');
                    return;
                }
                
                this.gold -= cost;
                
                // Find which character has this pet equipped - FIX: Use proper lookup
                let equippedMember = null;
                let equippedCharIndex = -1;
                for (const [charType, equippedPet] of Object.entries(this.equippedPets)) {
                    if (equippedPet === pet) {
                        // Find the party member with this class
                        equippedMember = this.party.find(m => m.className.toLowerCase() === charType);
                        equippedCharIndex = this.party.indexOf(equippedMember);
                        break;
                    }
                }
                
                // Remove old bonus if equipped
                if (equippedMember) {
                    this.removePetBonus(pet, equippedMember);
                }
                
                pet.upgrade();
                
                // Reapply new bonus if equipped
                if (equippedMember) {
                    this.applyPetBonus(pet, equippedMember);
                    this.updatePetDisplay(equippedCharIndex);
                }
                
                this.addLog(`${pet.name} upgraded to level ${pet.level}!`, 'loot');
                this.updateUI();
                this.showPetsCollection(); // Refresh the pets display
            }

            applyPetBonus(pet, member) {
                const bonus = pet.getCurrentBonus();
                const bonusType = pet.bonusType;
                
                // Track the exact applied bonus so removePetBonus always removes the correct amount
                if (!member._appliedPetBonus) member._appliedPetBonus = {};
                const appliedAmount = bonusType === 'attackSpeed' ? bonus / 100 : bonus;
                member._appliedPetBonus[bonusType] = appliedAmount;
                    
                    if (bonusType === 'attack') {
                        member.attack += bonus;
                    }
                    else if (bonusType === 'defense') {
                        member.defense += bonus;
                    }
                    else if (bonusType === 'hp') {
                        const hpPercent = member.hp / member.getTotalMaxHp();
                        member.maxHp += bonus;
                        member.hp = Math.min(member.getTotalMaxHp(), Math.round(member.getTotalMaxHp() * hpPercent));
                    }
                    else if (bonusType === 'mana') {
                        const manaPercent = member.mana / member.getTotalMaxMana();
                        member.maxMana += bonus;
                        member.mana = Math.min(member.getTotalMaxMana(), Math.round(member.getTotalMaxMana() * manaPercent));
                    }
                    else if (bonusType === 'attackSpeed') {
                        member.attackSpeed += bonus / 100;
                    }
                    else if (bonusType === 'critChance') {
                        member.critChance += bonus;
                    }
                    else if (bonusType === 'critDamage') {
                        member.critDamage += bonus;
                    }
                    else if (bonusType === 'dodge') {
                        member.dodgeChance += bonus;
                    }
                    else if (bonusType === 'lifesteal') {
                        member.lifesteal += bonus;
                    }
                    else if (bonusType === 'manaRegen') {
                        member.manaRegen += bonus;
                    }
                    else if (bonusType === 'hpRegen') {
                        member.hpRegen += bonus;
                    }
                    else if (bonusType === 'cdr') {
                        member.cdr += bonus;
                    }
                    
            }

            removePetBonus(pet, member) {
                const bonusType = pet.bonusType;
                
                // Use the tracked applied amount if available, otherwise fall back to getCurrentBonus
                let bonus;
                let appliedAmount;
                if (member._appliedPetBonus && member._appliedPetBonus[bonusType] !== undefined) {
                    appliedAmount = member._appliedPetBonus[bonusType];
                    bonus = bonusType === 'attackSpeed' ? appliedAmount * 100 : appliedAmount;
                    delete member._appliedPetBonus[bonusType];
                } else {
                    bonus = pet.getCurrentBonus();
                }
                
                    if (bonusType === 'attack') {
                        member.attack = Math.max(1, member.attack - bonus);
                    }
                    else if (bonusType === 'defense') {
                        member.defense = Math.max(0, member.defense - bonus);
                    }
                    else if (bonusType === 'hp') {
                        const hpPercent = member.hp / member.getTotalMaxHp();
                        member.maxHp = Math.max(10, member.maxHp - bonus);
                        member.hp = Math.round(member.getTotalMaxHp() * hpPercent);
                    }
                    else if (bonusType === 'mana') {
                        const manaPercent = member.mana / member.getTotalMaxMana();
                        member.maxMana = Math.max(10, member.maxMana - bonus);
                        member.mana = Math.round(member.getTotalMaxMana() * manaPercent);
                    }
                    else if (bonusType === 'attackSpeed') {
                        member.attackSpeed = Math.max(0.1, member.attackSpeed - (bonus / 100));
                    }
                    else if (bonusType === 'critChance') {
                        member.critChance = Math.max(0, member.critChance - bonus);
                    }
                    else if (bonusType === 'critDamage') {
                        member.critDamage = Math.max(100, member.critDamage - bonus);
                    }
                    else if (bonusType === 'dodge') {
                        member.dodgeChance = Math.max(0, member.dodgeChance - bonus);
                    }
                    else if (bonusType === 'lifesteal') {
                        member.lifesteal = Math.max(0, member.lifesteal - bonus);
                    }
                    else if (bonusType === 'manaRegen') {
                        member.manaRegen = Math.max(0, member.manaRegen - bonus);
                    }
                    else if (bonusType === 'hpRegen') {
                        member.hpRegen = Math.max(0, member.hpRegen - bonus);
                    }
                    else if (bonusType === 'cdr') {
                        member.cdr = Math.max(0, member.cdr - bonus);
                    }
            }

            rollKeystoneFromVault(vaultLevel) {
                // Rarity roll
                const roll = Math.random() * 100;
                let rarity;
                
                if (roll < 60) rarity = 'common';
                else if (roll < 85) rarity = 'uncommon';
                else if (roll < 95) rarity = 'rare';
                else if (roll < 99) rarity = 'epic';
                else rarity = 'legendary';
                
                // Random type - only from classes in party
                const partyClasses = this.party.map(m => m.className.toLowerCase());
                const type = partyClasses[Math.floor(Math.random() * partyClasses.length)];
                
                // Create keystone
                const keystone = new KeystoneItem(type, rarity, vaultLevel);
                this.keystones.push(keystone);
                
                const typeIcons = { tank: '🛡️', healer: '💊', mage: '🔮', rogue: '🗡️', archer: '🏹', paladin: '⚔️' };
                const typeNames = { tank: 'Tank', healer: 'Healer', mage: 'Mage', rogue: 'Rogue', archer: 'Archer', paladin: 'Paladin' };
                this.addLog(`Found ${typeIcons[type]} ${typeNames[type]} keystone: ${keystone.name}!`, 'loot');
                
                return keystone;
            }


showVaultKeyConfirmDialog(key, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 3500;';
    
    const panel = document.createElement('div');
    panel.style.cssText = 'background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 3px solid #f59e0b; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9); max-width: 400px;';
    
    panel.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🔑</div>
        <div style="font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 800; color: #f59e0b; margin-bottom: 20px;">ENTER VAULT?</div>
<div style="font-size: 18px; color: #fbbf24; margin-bottom: 10px; font-weight: 600;">Level ${key.level} Vault Key</div>
        <div style="font-size: 14px; color: #10b981; margin-bottom: 8px; font-weight: 600;">Recommended: Floor ${key.level * 5}</div>
        <div style="font-size: 14px; color: #94a3b8; margin-bottom: 30px;">This key will be consumed</div>
        <div style="display: flex; gap: 15px;">
            <button id="vault-confirm-enter" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 10px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700;">ENTER</button>
            <button id="vault-confirm-cancel" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 10px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700;">CANCEL</button>
        </div>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    document.getElementById('vault-confirm-enter').onclick = () => {
        overlay.remove();
        onConfirm();
    };
    
    document.getElementById('vault-confirm-cancel').onclick = () => {
        overlay.remove();
    };
}
showRuneTrialConfirmation(key) {
    const onConfirm = () => this.enterRuneTrialWithKey(key.id);
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 3500;';
    
    const panel = document.createElement('div');
    panel.style.cssText = 'background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 3px solid #3b82f6; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9); max-width: 400px;';
    
    panel.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🔑</div>
        <div style="font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 800; color: #f59e0b; margin-bottom: 20px;">ENTER RUNE TRIAL?</div>
        <div style="font-size: 18px; color: #fbbf24; margin-bottom: 10px; font-weight: 600;">Tier ${key.tier} Rune Trial Key</div>
        <div style="font-size: 14px; color: #10b981; margin-bottom: 8px; font-weight: 600;">Recommended: Level ${40 + key.tier * 10}</div>
        <div style="font-size: 14px; color: #94a3b8; margin-bottom: 30px;">This key will be consumed</div>
        <div style="display: flex; gap: 15px;">
            <button id="rune-trial-confirm-enter" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 10px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700;">ENTER</button>
            <button id="rune-trial-confirm-cancel" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 10px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700;">CANCEL</button>
        </div>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    document.getElementById('rune-trial-confirm-enter').onclick = () => {
        overlay.remove();
        onConfirm();
    };
    
    document.getElementById('rune-trial-confirm-cancel').onclick = () => {
        overlay.remove();
    };
}
enterRuneTrialWithKey(keyId) {
    // Prevent spam clicking (shared with Vault)
    const now = Date.now();
    if (this._lastSpecialDungeonUse && now - this._lastSpecialDungeonUse < 5000) {
        const remainingSeconds = Math.ceil((5000 - (now - this._lastSpecialDungeonUse)) / 1000);
        this.addLog(`Wait ${remainingSeconds}s before using another key`, 'damage');
        return;
    }
    
    const keyIndex = this.runeTrialKeys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) return;
    
    this._lastSpecialDungeonUse = now;
    
    const key = this.runeTrialKeys[keyIndex];
    this.runeTrialKeys.splice(keyIndex, 1);
    
    this.currentDungeon = 'runetrial';
    this.runeTrialTier = key.tier;
    this.dungeonFloor = 1;
    this.lastDungeonChangeTime = Date.now();
    
    // Clear any existing dungeon layout and rooms
    this.hallways = [];
    this.adjacentRooms = [];
    this.enemies = [];
    
    // Reset character stats for Rune Trial
    if (!this.characterStats) this.characterStats = {};
    this.party.forEach(member => {
        if (!this.characterStats[member.name]) {
            this.characterStats[member.name] = {
                damageDealt: 0,
                healingDone: 0
            };
        } else {
            this.characterStats[member.name].damageDealt = 0;
            this.characterStats[member.name].healingDone = 0;
        }
    });
    
    // Create isolated Rune Trial room data
    this.currentRoomData = {
        type: ROOM_TYPES.BOSS,
        x: 0,
        y: 0,
        visited: true,
        cleared: false,
        connections: []
    };
    
    // Set dungeonLayout to NULL for Rune Trial
    this.dungeonLayout = null;
    
    // Create large Rune Trial room (30x30 for big boss arena) with icy blue floor
    this.room = new DungeonRoom(30, 30, ROOM_TYPES.BOSS, 'runetrial');
    
    // Override floor color to icy blue
    if (this.room && this.room.tiles) {
        this.room.tiles.forEach(tile => {
            tile.color = '#4a7c8a'; // Darker icy blue to match background
        });
    }
    
    // Clear the minimap
    this.mapCtx.fillStyle = '#000';
    this.mapCtx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    
    // Show room label with blue theme
    const roomLabel = document.getElementById('room-label');
    roomLabel.style.display = 'block';
    roomLabel.textContent = `🔮 Rune Trial - Tier ${key.tier}`;
    roomLabel.style.color = '#60a5fa'; // Blue color for Rune Trials
    
    // Restore party for Rune Trial fight - full heal and revive
this.party.forEach(member => {
    member.isAlive = true;
    member.hp = Math.round(member.getTotalMaxHp());
    member.mana = Math.round(member.getTotalMaxMana());
    // Force clean the base values too
    member.maxHp = Math.round(member.maxHp);
    member.maxMana = Math.round(member.maxMana);
    member.cooldown = 0;
    member.attackCooldown = 0;
    if (member.keystoneCooldown) member.keystoneCooldown = 0;
    member.shieldAmount = 0;
    member.phoenixUsedThisBattle = false;
    
    // Reset ability-specific cooldowns/buffs
    if (member.tauntActive) member.tauntActive = false;
    if (member.tauntTimer) member.tauntTimer = 0;
    if (member.sacredBarrierDefense) member.sacredBarrierDefense = 0;
    if (member.sacredBarrierTimer) member.sacredBarrierTimer = 0;
    if (member.berserkerActive) member.berserkerActive = false;
    if (member.berserkerTimer) member.berserkerTimer = 0;
});
    
    // Unpause the game
    this.paused = false;
    
    // Hide dungeon selector if it's open
    const selector = document.getElementById('dungeon-selector');
    if (selector) selector.style.display = 'none';
    
    // Set Rune Trial background
    
    this.setDungeonBackground('runetrial', 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/runetrial.png');
    
    
    // Position party in a circle around the pillar (15, 15)
    const formations = {
        0: {x: 15, y: 13},  // Tank - north of pillar
        1: {x: 13, y: 15},  // Healer - west of pillar
        2: {x: 17, y: 15},  // Mage - east of pillar
        3: {x: 15, y: 17}   // Rogue - south of pillar
    };
    
    this.party.forEach((member, i) => {
        if (member.sprite) {
            const pos = formations[i];
            member.sprite.moveTo(pos.x, pos.y, true);
            member.sprite.setCombatPosition(pos.x, pos.y);
        }
    });
    
    // DIRECTLY create pillar and boss setup
    
    // Initialize floor stats for Rune Trial
    this.floorStats = {
        startTime: Date.now(),
        damageDealt: 0,
        enemiesKilled: 0,
        goldEarned: 0,
        lootObtained: 0
    };
    
    // Initialize Rune Trial mechanics
    this.runeTrialPillarCharging = true;
    this.runeTrialPillarCharge = 0;
    this.runeTrialPillarMaxCharge = 3000; // 50 seconds at 60fps (10x longer)
    this.runeTrialBomberSpawnTimer = 120; // Start at max so first bomber spawns immediately
    this.runeTrialBomberSpawnRate = 120; // 2 seconds at 60fps
    this.runeTrialBossEnraged = false;
    this.runeTrialNextBomberId = 1;
    
    // Create pillar object
    this.runeTrialPillar = {
        gridX: 15,
        gridY: 15
    };        
    
    // Create boss
    const boss = new Boss(this.runeTrialTier * 10, 'night_herald', 'umbral');
    boss.name = 'Rune Guardian';
    
    // Custom HP scaling per tier
    const hpByTier = {
        1: 500000,
        2: 600000,
        3: 700000,
        4: 800000,
        5: 1000000
    };
    
    // Custom Attack scaling per tier
    const atkByTier = {
        1: 100,
        2: 150,
        3: 200,
        4: 220,
        5: 300
    };
    
    // Defense: Use floor-based scaling for consistency
    const equivalentFloor = 40 + (this.runeTrialTier * 10);
    const defScaling = Math.min(Math.floor((4 + (equivalentFloor * 1.0) + (equivalentFloor * equivalentFloor * 0.005)) * 1.5), 200);
    
    boss.hp = hpByTier[this.runeTrialTier];
    boss.maxHp = hpByTier[this.runeTrialTier];
    boss.attack = atkByTier[this.runeTrialTier];
    boss.defense = defScaling;
    boss.attackSpeed = 0.6;
    boss.color = '#1e1b4b'; // Dark purple/black - menacing
    boss.xpReward = Math.floor(500 * this.runeTrialTier);
    boss.goldReward = this.runeTrialTier * 100;
    boss.isRuneTrialBoss = true;
    boss.isAlive = true;
    boss.isBig = true; // Mark as big boss
    boss.hasRedEyes = true; // Mark for red eye rendering
    boss.sprite = new CharacterSprite(15, 10, boss.color, 'enemy');
    boss.sprite.setCombatPosition(15, 10);
    boss.sprite.scale = 2.0; // Make it twice as big!
    
    // Store boss
    this.runeTrialBoss = boss;
    
    // Create pillar UI
    this.createRuneTrialPillarUI();
    
    // Mark room as not cleared
    this.currentRoomData.cleared = false;
    
    // DON'T START BATTLE - pillar must be charged first
    // Battle will start automatically when pillar is fully charged
    this.inBattle = false;
    
    this.addLog(`Entering Tier ${key.tier} Rune Trial! Activate the pillar to begin!`, 'room');
    
    // Update UI
    this.updateUI();
    
    // Update the chests display to remove the used key
    this.showChests();
}

enterVaultWithKeyConfirmed(keyId) {
    
    // Prevent spam clicking with 5 second cooldown (shared with Rune Trial)
    const now = Date.now();
    if (this._lastSpecialDungeonUse && now - this._lastSpecialDungeonUse < 5000) {
        const remainingSeconds = Math.ceil((5000 - (now - this._lastSpecialDungeonUse)) / 1000);
        this.addLog(`Wait ${remainingSeconds}s before using another key`, 'damage');
        return;
    }
    
    const keyIndex = this.vaultKeys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) return;
    
    this._lastSpecialDungeonUse = now;
    
    const key = this.vaultKeys[keyIndex];
    this.vaultKeys.splice(keyIndex, 1);
    
    this.currentDungeon = 'vault';
    this.vaultLevel = key.level;
    this.dungeonFloor = 1;
    this.lastDungeonChangeTime = Date.now();
    
// Clear any existing dungeon layout and rooms FIRST
this.hallways = [];
this.adjacentRooms = [];
this.enemies = []; // Clear any existing enemies

// Reset character stats for Vault fight
if (!this.characterStats) this.characterStats = {};
this.party.forEach(member => {
    if (!this.characterStats[member.name]) {
        this.characterStats[member.name] = {
            damageDealt: 0,
            healingDone: 0
        };
    } else {
        this.characterStats[member.name].damageDealt = 0;
        this.characterStats[member.name].healingDone = 0;
    }
});

// Create isolated Vault room data
this.currentRoomData = {
    type: ROOM_TYPES.BOSS,
    x: 0,
    y: 0,
    visited: true,
    cleared: false,
    connections: []
};

// Set dungeonLayout to NULL for Vault - it's not a normal dungeon
this.dungeonLayout = null;

// Create large Vault room (30x30 for big boss arena) BEFORE unpausing
this.room = new DungeonRoom(30, 30, ROOM_TYPES.BOSS, 'vault');

// Clear the minimap since Vault has no dungeon layout
this.mapCtx.fillStyle = '#000';
this.mapCtx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);

// Show room label
document.getElementById('room-label').style.display = 'block';
document.getElementById('room-label').textContent = `🔒 Vault - Lvl ${key.level} Key`;

// Restore party for Vault fight - full heal and revive
this.party.forEach(member => {
    member.isAlive = true;
    member.hp = member.getTotalMaxHp();
    member.mana = member.getTotalMaxMana();
    member.cooldown = 0;
    member.attackCooldown = 0;
    if (member.keystoneCooldown) member.keystoneCooldown = 0;
    member.shieldAmount = 0;
    member.phoenixUsedThisBattle = false;
    
    // Reset ability-specific cooldowns/buffs
    if (member.tauntActive) member.tauntActive = false;
    if (member.tauntTimer) member.tauntTimer = 0;
    if (member.sacredBarrierDefense) member.sacredBarrierDefense = 0;
    if (member.sacredBarrierTimer) member.sacredBarrierTimer = 0;
    if (member.berserkerActive) member.berserkerActive = false;
    if (member.berserkerTimer) member.berserkerTimer = 0;
});

// Unpause the game AFTER everything is set up
this.paused = false;
    
// Hide dungeon selector if it's open
const selector = document.getElementById('dungeon-selector');
if (selector) selector.style.display = 'none';

// Set Vault background

this.setDungeonBackground('vault', 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault%20room.png');

    
    const formations = {
        0: {x: 15, y: 20},  // Tank front center
        1: {x: 13, y: 21},  // Healer back left
        2: {x: 14, y: 22},  // Mage back center
        3: {x: 16, y: 22}   // Rogue back right
    };
    
    this.party.forEach((member, i) => {
        if (member.sprite) {
            const pos = formations[i];
            member.sprite.moveTo(pos.x, pos.y, true);
            member.sprite.setCombatPosition(pos.x, pos.y);
        }
    });
    
    this.spawnVaultBoss();
    
    // Mark room as not cleared so battle triggers properly
    this.currentRoomData.cleared = false;
    
    // Ensure enemies array is populated before battle
this.updateUI();

// Start battle immediately - boss should already be spawned
if (this.enemies.length > 0 && this.enemies[0].isAlive) {
    setTimeout(() => this.startBattle(), 500);
} else {
    console.error('Vault boss failed to spawn!');
    this.addLog('ERROR: Vault boss failed to spawn!', 'damage');
}
    
    this.addLog(`Using Level ${key.level} Vault Key! Entering boss fight...`, 'room');
    
    // Update UI
    this.updateUI();
    
    // Update the chests display to remove the used key
    this.showChests();
}

            showKeystoneSelector() {
                const overlay = document.createElement('div');
                overlay.id = 'keystone-selector-overlay';
                overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 3000;';
                
                const panel = document.createElement('div');
                panel.style.cssText = 'background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 2px solid #f59e0b; border-radius: 20px; padding: 40px; max-width: 600px;';
                
                let html = '<h2 style="font-family: Orbitron; color: #f59e0b; text-align: center; margin-bottom: 20px;">🔑 Select Keystone</h2>';
                
                this.keystones.forEach(keystone => {
                    const difficulty = Math.floor(keystone.level * KEYSTONE_CONFIG.DIFFICULTY_MULTIPLIER);
                    html += `
                        <div class="keystone-option" data-keystone-id="${keystone.id}" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9)); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 15px 0; cursor: pointer; transition: all 0.3s ease;">
                            <div style="font-weight: 700; font-size: 16px; color: #f59e0b;">Level ${keystone.level} Keystone</div>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Vault Difficulty: ~Floor ${difficulty}</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Guaranteed: ${KEYSTONE_CONFIG.RARITY_BOOST.rare}% Rare, ${KEYSTONE_CONFIG.RARITY_BOOST.epic}% Epic, ${KEYSTONE_CONFIG.RARITY_BOOST.legendary}% Legendary</div>
                        </div>
                    `;
                });
                
                html += '<button onclick="document.getElementById(\'keystone-selector-overlay\').remove()" style="width: 100%; margin-top: 20px; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>';
                
                panel.innerHTML = html;
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
                
                document.querySelectorAll('.keystone-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        const keystoneId = parseInt(opt.getAttribute('data-keystone-id'));
                        this.enterVault(keystoneId);
                        overlay.remove();
                    });
                    
                    opt.addEventListener('mouseenter', (e) => {
                        e.target.style.background = 'linear-gradient(135deg, rgba(51, 65, 85, 0.9), rgba(30, 41, 59, 0.9))';
                        e.target.style.transform = 'translateX(10px)';
                    });
                    
                    opt.addEventListener('mouseleave', (e) => {
                        e.target.style.background = 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))';
                        e.target.style.transform = 'translateX(0)';
                    });
                });
            }

            enterVault(keystoneId) {
                
                const keystoneIndex = this.keystones.findIndex(k => k.id === keystoneId);
                if (keystoneIndex === -1) return;
                
                const keystone = this.keystones[keystoneIndex];
                this.keystones.splice(keystoneIndex, 1);
                
                this.currentDungeon = 'vault';
                this.vaultLevel = keystone.level;
                this.dungeonFloor = 1;
                this.lastDungeonChangeTime = Date.now();
                
                this.hideDungeonSelector();
                document.getElementById('room-label').style.display = 'block';
                
                this.currentRoomData = {
                    type: ROOM_TYPES.BOSS,
                    x: 0,
                    y: 0,
                    visited: true,
                    cleared: false,
                    connections: []
                };
                
                this.room = new DungeonRoom(20, 20, ROOM_TYPES.BOSS, 'vault');
                document.getElementById('room-label').textContent = `🔑 Keystone Vault - Level ${this.vaultLevel}`;
                
                const formations = {
                    0: {x: 10, y: 14},
                    1: {x: 8, y: 14},
                    2: {x: 9, y: 15},
                    3: {x: 11, y: 15}
                };
                
                this.party.forEach((member, i) => {
                    if (member.sprite) {
                        const pos = formations[i];
                        member.sprite.moveTo(pos.x, pos.y, true);
                        member.sprite.setCombatPosition(pos.x, pos.y);
                    }
                });
                
                // Set Vault background IMMEDIATELY (no timeout needed)
                
                this.setDungeonBackground('vault', 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault%20room.png');
                
                
                this.spawnVaultBoss();
                setTimeout(() => this.startBattle(), 1500);
                this.addLog(`Entering Level ${keystone.level} Keystone Vault!`, 'room');
            }

// Show demo locked message
showDemoLockedMessage(dungeonType) {
    const dungeonNames = {
        'vault': 'The Vault',
        'runetrial': 'Rune Trials',
        'pinnacle': 'Pinnacle Boss',
        'endlessblessings': 'Divine Arena'
    };
    
    const name = dungeonNames[dungeonType] || dungeonType;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'demo-locked-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    overlay.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
            border: 2px solid rgba(168, 85, 247, 0.6);
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 0 50px rgba(168, 85, 247, 0.3);
        ">
            <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
            <h2 style="
                font-family: 'Orbitron', sans-serif;
                font-size: 24px;
                color: #a855f7;
                margin-bottom: 15px;
                text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
            ">${name}</h2>
            <p style="
                font-family: 'Rajdhani', sans-serif;
                font-size: 16px;
                color: #94a3b8;
                line-height: 1.6;
                margin-bottom: 25px;
            ">
                This dungeon is available in the full version of Heroes of Jormiah.
            </p>
            <button onclick="this.closest('#demo-locked-modal').remove()" style="
                background: linear-gradient(135deg, #a855f7, #7c3aed);
                border: none;
                border-radius: 8px;
                padding: 12px 30px;
                font-family: 'Orbitron', sans-serif;
                font-size: 14px;
                font-weight: 700;
                color: white;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(168, 85, 247, 0.6)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(168, 85, 247, 0.4)';">
                Got it!
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    this.addLog(`🔒 ${name} requires the full version.`, 'room');
}

selectDungeon(dungeonType) {
    // DEMO MODE RESTRICTION
    if (DEMO_MODE && !DEMO_ALLOWED_DUNGEONS.includes(dungeonType)) {
        this.showDemoLockedMessage(dungeonType);
        return;
    }
    
    // Special handling for vault/rune trial - just show keys tab, don't actually select dungeon
    if (dungeonType === 'vault') {
        this.hideDungeonSelector();
        this.switchTab('chests');
        
        // Switch to vault keys sub-tab
        document.querySelectorAll('.cache-sub-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cache-section').forEach(s => s.style.display = 'none');
        document.querySelector('[data-cache-tab="keys"]').classList.add('active');
        document.getElementById('cache-keys-section').style.display = 'block';
        
        // Just show a message about selecting a key
        if (this.vaultKeys.length === 0) {
            this.addLog('No Vault Keys! Find keys by clearing dungeon floors (10% chance).', 'room');
        } else {
            this.addLog('Select a Vault Key to enter the Vault', 'room');
        }
        return; // Exit - don't do anything else!
    }
    
    if (dungeonType === 'runetrial') {
        this.hideDungeonSelector();
        this.switchTab('chests');
        
        // Switch to rune keys sub-tab
        document.querySelectorAll('.cache-sub-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cache-section').forEach(s => s.style.display = 'none');
        document.querySelector('[data-cache-tab="rune-keys"]').classList.add('active');
        document.getElementById('cache-rune-keys-section').style.display = 'block';
        
        // Just show a message about selecting a key
        if (this.runeTrialKeys.length === 0) {
            this.addLog('No Rune Trial Keys! Keys drop from floor 45+ (10% chance).', 'room');
        } else {
            this.addLog('Select a Rune Trial Key to enter the Rune Trial', 'room');
        }
        return; // Exit - don't do anything else!
    }
    
    // Handle Pinnacle Boss
    if (dungeonType === 'pinnacle') {
        // Check if party total level is 300+
        const totalLevel = this.party.reduce((sum, m) => sum + m.level, 0);
        if (totalLevel < 300) {
            this.addLog(`⚠️ Pinnacle Boss requires 300+ Total Team Level! (Current: ${totalLevel})`, 'damage');
            return;
        }
        
        this.enterPinnacle();
        return;
    }
    
    // Handle Divine Arena dungeon
    if (dungeonType === 'endlessblessings') {
        
        
        // CHECK COOLDOWN FIRST - same as other dungeons
        if (this.currentDungeon) {
            const now = Date.now();
            const timeSinceLastChange = now - this.lastDungeonChangeTime;
            
            if (timeSinceLastChange < this.dungeonChangeCooldown) {
                const remainingSeconds = Math.ceil((this.dungeonChangeCooldown - timeSinceLastChange) / 1000);
                this.addLog(`Please wait ${remainingSeconds} seconds before changing dungeons.`, 'room');
                return;
            }
        }
        
        // COMPREHENSIVE STATE CLEANUP
        // 1. CRITICAL: Clear ALL enemies FIRST - prevent any carryover from previous dungeons
        // Do this multiple times to ensure complete cleanup
        this.enemies = [];
        
        // Force clear any lingering enemy sprites
        if (this.enemies.length > 0) {
            
            this.enemies.forEach(e => {
                if (e.sprite) e.sprite = null;
            });
            this.enemies = [];
        }
        
        this.inBattle = false;
        this.battleStartTime = 0;
        this.battleTimer = 0;
        
        // 2. CRITICAL: Reset kill tracking IMMEDIATELY
        this.endlessKillCount = 0;
        this.endlessWave = 1;
        this.endlessEnemyLevel = 70;
        this.endlessEnemiesKilledThisWave = 0;
        this.endlessEnemiesPerWave = 4;
        this.endlessMinEnemies = 2;
        this.endlessMaxEnemies = 3;
        
        // 3. Reset and hide kill counter display (will be shown after full setup)
        const killCounterElement = document.getElementById('kill-counter');
        if (killCounterElement) {
            killCounterElement.textContent = '0 Kills';
            killCounterElement.style.display = 'none';
        }
        
        // 4. CRITICAL: Clear enemy health bars UI completely
        const healthBarContainer = document.getElementById('enemy-health-bars');
        if (healthBarContainer) {
            healthBarContainer.innerHTML = '';
            healthBarContainer.style.display = 'none';
            // Force a reflow to ensure the DOM updates
            void healthBarContainer.offsetHeight;
            healthBarContainer.style.display = 'flex';
        }
        
        // 3. Clear any previous dungeon-specific state
        this.runeTrialBoss = null;
        this.runeTrialPillarCharging = false;
        this.runeTrialPillarCharge = 0;
        this.runeTrialBossEnraged = false;
        this.vaultBoss = null;
        
        // 4. Clear rooms and dungeon layout - NO MAP for endless mode
        if (this.room) {
            this.room = null;
        }
        this.hallways = [];
        this.adjacentRooms = [];
        this.currentRoomData = null;
        this.dungeonLayout = null; // No dungeon layout - just single arena
        
        // Hide minimap for endless mode
        const minimapCanvas = document.getElementById('map-canvas');
        if (minimapCanvas) {
            minimapCanvas.style.display = 'none';
            // Clear the canvas
            const ctx = minimapCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
            }
        }
        
        // 5. Reset visual effects
        this.visualEffects = [];
        this._unitPositionsChanged = true;
        
        // 6. CRITICAL: Set dungeon BEFORE doing anything else
        this.currentDungeon = 'endlessblessings';
        this.dungeonFloor = 70; // Start at floor 70 (level 70 enemies)
        
        // 7. CRITICAL: Fully heal and revive all party members (like Vault)
        this.party.forEach(member => {
            // Revive all members
            member.isAlive = true;
            member.hp = member.getTotalMaxHp();
            member.mana = member.getTotalMaxMana();
            member.cooldown = 0;
            member.attackCooldown = 0;
            member.keystoneCooldown = 0;
            member.tauntActive = false;
            member.tauntTimer = 0;
            member.shieldAmount = 0;
            member.phoenixUsedThisBattle = false;
            
            // Reset ability-specific cooldowns/buffs (like Vault)
            if (member.sacredBarrierDefense) member.sacredBarrierDefense = 0;
            if (member.sacredBarrierTimer) member.sacredBarrierTimer = 0;
            if (member.berserkerActive) member.berserkerActive = false;
            if (member.berserkerTimer) member.berserkerTimer = 0;
            
            // Reset sprite if it exists
            if (member.sprite) {
                member.sprite.attacking = false;
                member.sprite.moving = false;
            }
        });
        
        this.hideDungeonSelector();
        
        // 8. Initialize endless dungeon specific variables - CONTINUOUS WAVE SYSTEM
        this.endlessKillCount = 0;
        this.endlessWave = 1; // Start at wave 1
        this.endlessEnemyLevel = 70; // Wave 1 = level 70
        this.endlessMinEnemies = 2; // Always keep at least 2 enemies alive
        this.endlessMaxEnemies = 3; // Maximum 3 enemies at once
        this.endlessEnemiesKilledThisWave = 0;
        this.endlessEnemiesPerWave = 4; // 4 kills = 1 wave = 1 blessing
        
        // Initialize character combat statistics tracking for endless arena
        this.characterStats = {};
        this.party.forEach(member => {
            this.characterStats[member.name] = {
                damageDealt: 0,
                healingDone: 0
            };
        });
        this.characterStatsDisplayMode = 'damage'; // 'damage' or 'healing'
        
        // 9. Set background
        const dungeonBackgrounds = {
            everfall: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Everfall%20HD.png',
            stoneforge: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Stoneforge%20HD.png',
            umbral: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/umbral%20depths1.png',
            vault: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault%20room.png',
            runetrial: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault%20room.png',
            endlessblessings: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Everfall%20HD.png'
        };
        
        this.setDungeonBackground('endlessblessings', dungeonBackgrounds.endlessblessings);
        
        // 10. Create large open world room (20x20 instead of 10x10) - AFTER setting currentDungeon
        this.room = new DungeonRoom(20, 20, 'normal', this.currentDungeon);
        
        // 11. Position party members in the center-left of the open world
        this.party.forEach((member, i) => {
            if (member.sprite) {
                const startX = 5;
                const startY = 8 + (i % 3);
                // Set position directly - no setGridPosition method exists
                member.sprite.gridX = startX;
                member.sprite.gridY = startY;
                member.sprite.targetX = startX;
                member.sprite.targetY = startY;
                member.sprite.combatX = startX;
                member.sprite.combatY = startY;
            }
        });
        
        // 12. Show room label - simple arena name
        document.getElementById('room-label').style.display = 'block';
        this.updateRoomLabel({ 
            type: 'normal',
            name: `Divine Arena`
        });
        
        // 13. Update UI to show healed stats
        this.rebuildUI();
        
        // 14. Set cooldown timestamp
        this.lastDungeonChangeTime = Date.now();
        
        // 15. NOW set battle mode and spawn enemies
        this.inBattle = true;
        this.battleStartTime = Date.now();
        
        // Show kill counter
        const killCounter = document.getElementById('kill-counter');
        if (killCounter) {
            killCounter.style.display = 'flex';
            killCounter.textContent = '0 Kills';
        }
        
        // Show End Run button for Divine Arena
        const endRunBtn = document.getElementById('end-run-btn');
        if (endRunBtn) {
            endRunBtn.style.display = 'block';
        }
        
        // Show damage stats display
        const combatStatsContainer = document.getElementById('combat-stats-container');
        const damageStatsDisplay = document.getElementById('damage-stats-display');
        if (combatStatsContainer) {
            combatStatsContainer.style.display = 'flex';
        }
        if (damageStatsDisplay) {
            this.updateCharacterStatsDisplay();
        }
        
        // Spawn initial 3 enemies immediately
        
        
        // CRITICAL SAFETY CHECK: Enemies array MUST be completely empty
        if (this.enemies.length > 0) {
            console.error(`⚠️ CRITICAL: Found ${this.enemies.length} enemies in array before spawn! Force clearing...`);
            this.enemies.forEach(e => {
                if (e.sprite) e.sprite = null;
            });
            this.enemies = [];
        }
        
        this.spawnEndlessEnemyBatch(3);
        
        this.addLog('⚔️ Divine Arena! Survive endless waves!', 'room');
        this.addLog('💎 Blessing Rewards: 1/kill (1-19), 2/kill (20-29), 3/kill (30-39), 4/kill (40-49), 5/kill (50+)', 'loot');


        return;
    }
    
    // For NORMAL dungeons (everfall, stoneforge, umbral), check cooldown before doing anything
    if (this.currentDungeon) {
        const now = Date.now();
        const timeSinceLastChange = now - this.lastDungeonChangeTime;
        
        if (timeSinceLastChange < this.dungeonChangeCooldown) {
            const remainingSeconds = Math.ceil((this.dungeonChangeCooldown - timeSinceLastChange) / 1000);
            this.addLog(`⏳ Cannot change dungeon yet. Wait ${remainingSeconds}s`, 'room');
            return; // Exit WITHOUT clearing any state
        }
    }
    
    // ONLY clear state if we're actually changing dungeons (not vault/rune trial)
    this.enemies = [];
    this.inBattle = false;
    this.battleStartTime = 0;
    if (this.room) {
        this.room = null;
    }
    
    // Block dungeon selection if currently in Vault or Rune Trial
    if (this.currentDungeon === 'vault') {
        this.addLog('You are locked in the Vault! Defeat the boss or die to leave.', 'damage');
        return;
    }
    
    if (this.currentDungeon === 'runetrial') {
        this.addLog('You are locked in the Rune Trial! Defeat the boss or die to leave.', 'damage');
        return;
    }
                
                // Normal dungeon changes - cooldown already checked at start of function
                const now = Date.now();
                
                // Set dungeon type AND floor together immediately
                this.currentDungeon = dungeonType;
                
                // Use the dungeon-specific start floor from progress
                if (this.dungeonProgress[dungeonType]) {
                    this.dungeonFloor = this.dungeonProgress[dungeonType].startFloor;
                } else {
                    // Fallback for non-tracked dungeons
                    this.dungeonFloor = Math.max(1, this.globalStats.farthestFloor - 9);
                }


                this.lastDungeonChangeTime = now;
                this.hideDungeonSelector();

                // Set dungeon background image
                const dungeonBackgrounds = {
                    everfall: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Everfall%20HD.png',
                    stoneforge: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Stoneforge%20HD.png',
                    umbral: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/umbral%20depths1.png',
                    vault: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault%20room.png',
                    runetrial: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault%20room.png' // Using same for now
                };
                
                this.setDungeonBackground(dungeonType, dungeonBackgrounds[dungeonType]);

                // Clear previous dungeon rooms and enemies
                this.hallways = [];
                this.adjacentRooms = [];
                this.enemies = []; // Ensure enemies array is cleared again
                
                // Show room label now that dungeon is selected
                document.getElementById('room-label').style.display = 'block';
                
                // Update current dungeon display
                const dungeonNames = {
                    umbral: '🔮 The Whispering Spires',
                    everfall: '🌿 The Hollowed Wilds',
                    stoneforge: '🛡️ The Iron Vaults'
                };
                document.getElementById('current-dungeon-display').textContent = dungeonNames[dungeonType] || 'Unknown';
                document.getElementById('current-floor-display').textContent = this.dungeonFloor;
                
                // Full heal, revive, and reset party for new dungeon
this.party.forEach((member, i) => {
    member.isAlive = true;
    member.hp = member.getTotalMaxHp();
    member.mana = member.getTotalMaxMana();
    member.cooldown = 0;
    if (member.keystoneCooldown) member.keystoneCooldown = 0;
    
    // Reset ability-specific cooldowns/buffs
    if (member.tauntActive) member.tauntActive = false;
    if (member.tauntTimer) member.tauntTimer = 0;
    
    // Reset party positions to starting formation
    if (member.sprite) {
        const formations = {
            0: {x: 5, y: 7}, // Tank
            1: {x: 3, y: 7}, // Healer
            2: {x: 4, y: 8}, // Mage
            3: {x: 6, y: 8}  // Rogue
        };
        const pos = formations[i];
        member.sprite.moveTo(pos.x, pos.y, true); // instant move
        member.sprite.setCombatPosition(pos.x, pos.y);
    }
});

this.generateDungeon();
            }

generateDungeon() {
                // Ensure clean slate for new dungeon - clear all flags and state
                this.enemies = [];
                this.inBattle = false;
                this.movingToNextRoom = false;  // Reset room movement flag
                this.battleTimer = 0;
                
                // FLOOR JUMPING FIX: Reset guards when new dungeon floor is generated
                this._floorCompletionHandled = false;
                this.floorCompleteQueued = false;
                if (this._completeDungeonTimeout) {
                    clearTimeout(this._completeDungeonTimeout);
                    this._completeDungeonTimeout = null;
                }
                if (this._moveNextRoomTimeout) {
                    clearTimeout(this._moveNextRoomTimeout);
                    this._moveNextRoomTimeout = null;
                }


                this.dungeonLayout = new DungeonLayout(this.dungeonFloor);
                const startRoom = this.dungeonLayout.getCurrentRoom();
                
                // Clear previous dungeon rooms
                this.hallways = [];
                this.adjacentRooms = [];
                
                // Reset floor stats when starting a new floor
                this.floorStats = {
                    startTime: Date.now(),
                    damageDealt: 0,
                    enemiesKilled: 0,
                    goldEarned: 0,
                    lootObtained: 0
                };
                
                // Reset character stats at the start of each floor
                if (!this.characterStats) this.characterStats = {};
                this.party.forEach(member => {
                    if (!this.characterStats[member.name]) {
                        this.characterStats[member.name] = {
                            damageDealt: 0,
                            healingDone: 0
                        };
                    } else {
                        // Reset stats for new floor - stats will accumulate across all rooms in this floor
                        this.characterStats[member.name].damageDealt = 0;
                        this.characterStats[member.name].healingDone = 0;
                    }
                });
                
                this.enterRoom(startRoom);
                this.drawMinimap();
                this.updateRoomLabel(startRoom);
            }

enterRoom(roomData) {
                // Safety check for null roomData
                if (!roomData) {
                    console.error('enterRoom called with null roomData');
                    return;
                }


                // Clear any existing enemies from previous room
                this.enemies = [];
                this.inBattle = false;
                
                // Generate hallway connections and adjacent rooms
                this.currentRoomData = roomData;
                this.hallways = [];
                this.adjacentRooms = [];
                
                // Real-time regen now happens during combat, no need for between-room burst
                
                // Create main room
                this.room = new DungeonRoom(10, 10, roomData.type, this.currentDungeon);
                this.updateRoomLabel(roomData);
                
                // Create visible hallways and adjacent rooms based on actual connections
                if (roomData.connections && roomData.connections.length > 0) {
                    roomData.connections.forEach((connection, index) => {
                        const connectedRoom = this.dungeonLayout.rooms.find(r => r.x === connection.x && r.y === connection.y);
                        if (connectedRoom) {
                            // Determine direction based on grid position difference
                            const dx = connection.x - roomData.x;
                            const dy = connection.y - roomData.y;
                            
                            // Create hallway and adjacent room preview
                            if (dx === 1 && dy === 0) { // Right
                                // Hallway to the right
                                this.hallways.push({
                                    room: new DungeonRoom(4, 10, ROOM_TYPES.PATHWAY, this.currentDungeon),
                                    offsetX: 10,
                                    offsetY: 0,
                                    direction: 'right'
                                });
                                
                                // Adjacent room preview (darkened)
                                if (!connectedRoom.visited) {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, ROOM_TYPES.EMPTY, this.currentDungeon),
                                        offsetX: 14,
                                        offsetY: 1,
                                        alpha: 0.3
                                    });
                                } else {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, connectedRoom.type, this.currentDungeon),
                                        offsetX: 14,
                                        offsetY: 1,
                                        alpha: connectedRoom.cleared ? 0.5 : 0.4
                                    });
                                }
                            } else if (dx === -1 && dy === 0) { // Left
                                // Hallway to the left
                                this.hallways.push({
                                    room: new DungeonRoom(4, 10, ROOM_TYPES.PATHWAY, this.currentDungeon),
                                    offsetX: -4,
                                    offsetY: 0,
                                    direction: 'left'
                                });
                                
                                // Adjacent room preview
                                if (!connectedRoom.visited) {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, ROOM_TYPES.EMPTY, this.currentDungeon),
                                        offsetX: -12,
                                        offsetY: 1,
                                        alpha: 0.3
                                    });
                                } else {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, connectedRoom.type, this.currentDungeon),
                                        offsetX: -12,
                                        offsetY: 1,
                                        alpha: connectedRoom.cleared ? 0.5 : 0.4
                                    });
                                }
                            } else if (dx === 0 && dy === 1) { // Down (in grid = up-right in isometric)
                                // Hallway down-right in isometric view
                                this.hallways.push({
                                    room: new DungeonRoom(10, 4, ROOM_TYPES.PATHWAY, this.currentDungeon),
                                    offsetX: 0,
                                    offsetY: 10,
                                    direction: 'down'
                                });
                                
                                // Adjacent room preview
                                if (!connectedRoom.visited) {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, ROOM_TYPES.EMPTY, this.currentDungeon),
                                        offsetX: 1,
                                        offsetY: 14,
                                        alpha: 0.3
                                    });
                                } else {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, connectedRoom.type, this.currentDungeon),
                                        offsetX: 1,
                                        offsetY: 14,
                                        alpha: connectedRoom.cleared ? 0.5 : 0.4
                                    });
                                }
                            } else if (dx === 0 && dy === -1) { // Up (in grid = down-left in isometric)
                                // Hallway up-left in isometric view
                                this.hallways.push({
                                    room: new DungeonRoom(10, 4, ROOM_TYPES.PATHWAY, this.currentDungeon),
                                    offsetX: 0,
                                    offsetY: -4,
                                    direction: 'up'
                                });
                                
                                // Adjacent room preview
                                if (!connectedRoom.visited) {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, ROOM_TYPES.EMPTY, this.currentDungeon),
                                        offsetX: 1,
                                        offsetY: -12,
                                        alpha: 0.3
                                    });
                                } else {
                                    this.adjacentRooms.push({
                                        room: new DungeonRoom(8, 8, connectedRoom.type, this.currentDungeon),
                                        offsetX: 1,
                                        offsetY: -12,
                                        alpha: connectedRoom.cleared ? 0.5 : 0.4
                                    });
                                }
                            }
                        }
                    });
                }
                
                // Reset party positions to formation - bottom center of room
                const formations = {
                    0: {x: 5, y: 7}, // Tank - front line center bottom
                    1: {x: 3, y: 7}, // Healer - back line left
                    2: {x: 4, y: 8}, // Mage - back line center
                    3: {x: 6, y: 8}  // Rogue - back line right
                };
                
                this.party.forEach((member, i) => {
                    if (member.sprite && member.isAlive) {
                        const pos = formations[i];
                        member.sprite.moveTo(pos.x, pos.y, true); // instant move
                        member.sprite.setCombatPosition(pos.x, pos.y);
                    }
                });
                
// Spawn enemies based on room type
if (roomData.type === ROOM_TYPES.NORMAL && !roomData.cleared) {
    this.spawnEnemies('normal');
    this.inBattle = false; // Ensure battle flag is reset
    this.movingToNextRoom = false; // Reset movement flag
    
    // Initialize character stats if needed
    if (!this.characterStats) this.characterStats = {};
    this.party.forEach(member => {
        if (!this.characterStats[member.name]) {
            this.characterStats[member.name] = { damageDealt: 0, healingDone: 0 };
        }
    });
    if (!this.characterStatsDisplayMode) this.characterStatsDisplayMode = 'damage';
    
    setTimeout(() => this.startBattle(), 1000);
} else if (roomData.type === ROOM_TYPES.TREASURE && !roomData.cleared) {
    // Show treasure room popup if enabled
    if (this.treasurePopupEnabled) {
        this.showTreasurePopup();
    }
    this.spawnEnemies('treasure');
    this.inBattle = false; // Ensure battle flag is reset
    this.movingToNextRoom = false; // Reset movement flag
    
    // Initialize character stats if needed
    if (!this.characterStats) this.characterStats = {};
    this.party.forEach(member => {
        if (!this.characterStats[member.name]) {
            this.characterStats[member.name] = { damageDealt: 0, healingDone: 0 };
        }
    });
    if (!this.characterStatsDisplayMode) this.characterStatsDisplayMode = 'damage';
    
    setTimeout(() => this.startBattle(), 1000);
} else if (roomData.type === ROOM_TYPES.BOSS && !roomData.cleared) {
    this.spawnBoss();
    this.inBattle = false; // Ensure battle flag is reset
    this.movingToNextRoom = false; // Reset movement flag
    
    // Initialize character stats if needed
    if (!this.characterStats) this.characterStats = {};
    this.party.forEach(member => {
        if (!this.characterStats[member.name]) {
            this.characterStats[member.name] = { damageDealt: 0, healingDone: 0 };
        }
    });
    if (!this.characterStatsDisplayMode) this.characterStatsDisplayMode = 'damage';
    
    setTimeout(() => this.startBattle(), 1500);
} else if (roomData.type === ROOM_TYPES.FOUNTAIN && !roomData.cleared) {
    // Fountain of Youth - revive and heal 40% (only once)
    roomData.cleared = true; // Mark as used immediately
    this.addLog('Fountain of Youth! Party is recovering...', 'heal');
    
    // Show fountain popup if enabled
    if (this.fountainPopupEnabled) {
        this.showFountainPopup();
    }
    
    // Apply healing immediately
    this.party.forEach(member => {
        // Revive dead members
        member.isAlive = true;
        
        // Restore 40% of MAX HP/Mana (including equipment bonuses)
        const maxHp = member.getTotalMaxHp();
        const maxMana = member.getTotalMaxMana();
        
        member.hp = Math.min(maxHp, member.hp + Math.floor(maxHp * 0.4));
        member.mana = Math.min(maxMana, member.mana + Math.floor(maxMana * 0.4));
        
        // Ensure HP is at least 1 for revived members
        if (member.hp <= 0) {
            member.hp = Math.floor(maxHp * 0.4);
        }
    });
    
    this.addLog('Party restored 40% HP and Mana!', 'heal');
    this.updateUI();
    
    // Auto-progress after healing (with delay for popup if enabled)
    const delay = this.fountainPopupEnabled ? 2000 : 1000;
    if (this.hasUnvisitedRooms()) {
        setTimeout(() => {
            if (!this.inBattle && !this.movingToNextRoom) {
                this.moveToNextRoom();
            }
        }, delay);
    }
} else if (roomData.type === ROOM_TYPES.ENTRANCE || roomData.cleared) {
                    // No enemies, auto-progress after short delay
                    this.addLog('Room is clear', 'room');
                    // Only auto-progress if not in Vault (Vault has no dungeon layout)
                    if (this.hasUnvisitedRooms() && this.currentDungeon !== 'vault') {
                        setTimeout(() => {
                            if (!this.inBattle && !this.movingToNextRoom) {
                                this.moveToNextRoom();
                            }
                        }, 2000);
                    }
                }
                
                this.drawMinimap();
            }


updateRoomLabel(roomData) {
                const roomTypes = {
                    [ROOM_TYPES.ENTRANCE]: 'Entrance',
                    [ROOM_TYPES.NORMAL]: 'Chamber',
                    [ROOM_TYPES.TREASURE]: 'Treasury',
                    [ROOM_TYPES.BOSS]: 'Boss Lair',
                    [ROOM_TYPES.FOUNTAIN]: 'Fountain of Youth'
                };
                
                const dungeonNames = {
                    umbral: 'The Whispering Spires',
                    everfall: 'The Hollowed Wilds',
                    stoneforge: 'The Iron Vaults',
                    endlessblessings: 'Divine Arena'
                };
                
                // Check if roomData has a custom name (for endless dungeon)
                if (roomData.name) {
                    document.getElementById('room-label').textContent = roomData.name;
                } else {
                    const dungeonName = dungeonNames[this.currentDungeon] || 'Unknown';
                    document.getElementById('room-label').textContent = 
                        `${dungeonName} - Floor ${this.dungeonFloor} - ${roomTypes[roomData.type] || 'Unknown'}`;
                }
            }

spawnEnemies(roomType) {
    
    
    // Reset phoenix flag at the start of each battle
    this.party.forEach(member => {
        if (member.phoenixUsedThisBattle !== undefined) {
            member.phoenixUsedThisBattle = false;
        }
    });
    
    // Enemy pools by dungeon
    const dungeonPools = {
        everfall: ['forest_wolf', 'bandit_cutthroat', 'moss_boar', 'hollow_stag', 'rotting_treant', 'briar_spider', 'fallen_scout', 'autumn_wisp'],
        stoneforge: ['forge_golem', 'ember_sprite', 'tunnel_rat', 'quarry_brute', 'anvil_guard', 'smelter_imp', 'oreback_beetle', 'molten_slime'],
        umbral: ['shade', 'gloomling', 'night_stalker', 'void_mite', 'abyssal_leech', 'umbral_wisp', 'dread_bat', 'hollow_cultist']
    };
    
    const types = dungeonPools[this.currentDungeon] || dungeonPools.everfall;
    
    // Enemy count based on floor level and room type
    let count;
    if (roomType === 'treasure') {
        // Treasure rooms scale with floor level
        if (this.dungeonFloor <= 5) {
            count = 1;
        } else if (this.dungeonFloor <= 20) {
            count = 2;
        } else if (this.dungeonFloor <= 60) {
            count = 3;
        } else {
            count = 4;
        }
        
        // Spawn Treasure Guardians instead of normal enemies
        this.enemies = [];
        this._unitPositionsChanged = true;
        
        for (let i = 0; i < count; i++) {
            const enemy = new Enemy('treasure_guardian', this.dungeonFloor, this.currentDungeon, true);
            
            // Position enemies in formation on the right side
            const xPos = 6 - Math.floor(i / 2);
            const yPos = 3 + (i % 3);
            
            enemy.sprite = new CharacterSprite(xPos, yPos, enemy.color, 'enemy');
            enemy.sprite.setCombatPosition(xPos, yPos);
            this.enemies.push(enemy);
        }
        
        this.addLog(`${count} Treasure Guardians appear!`, 'room');
        return;
    } else {
        // Normal rooms have variable counts
        let minEnemies, maxEnemies;
        if (this.dungeonFloor <= 5) {
            minEnemies = 2;
            maxEnemies = 3;
        } else if (this.dungeonFloor <= 10) {
            minEnemies = 2;
            maxEnemies = 4;
        } else {
            minEnemies = 2;
            maxEnemies = 5;
        }
        
        count = minEnemies + Math.floor(Math.random() * (maxEnemies - minEnemies + 1));
        
        // Umbral spawns more enemies
        if (this.currentDungeon === 'umbral') {
            count += Math.floor(2 + Math.random() * 4); // +2 to +5 enemies
        }
    }
                
    this.enemies = [];
    this._unitPositionsChanged = true; // New enemies spawned
    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const enemy = new Enemy(type, this.dungeonFloor, this.currentDungeon, false);
        
        // Position enemies in formation on the right side
        const xPos = 6 - Math.floor(i / 2);
        const yPos = 3 + (i % 3);
        
        enemy.sprite = new CharacterSprite(xPos, yPos, enemy.color, 'enemy');
        enemy.sprite.setCombatPosition(xPos, yPos);
        this.enemies.push(enemy);
    }
    
    this.addLog(`${count} enemies appear!`, 'room');
}

spawnRuneTrialBoss() {
    
    
    const tier = this.runeTrialTier;
    
    this._unitPositionsChanged = true;


    // Initialize Rune Trial mechanics
    this.runeTrialPillarCharging = true;
    this.runeTrialPillarCharge = 0;
    this.runeTrialPillarMaxCharge = 300; // 5 seconds at 60fps
    this.runeTrialBomberSpawnTimer = 0;
    this.runeTrialBomberSpawnRate = 120; // 2 seconds at 60fps
    this.runeTrialBossEnraged = false;
    this.runeTrialNextBomberId = 1;
    
    // Create pillar object at center of arena
    this.runeTrialPillar = {
        gridX: 15,
        gridY: 15
    };


    // Position boss in center (spawns when pillar is charged)
    boss.sprite = new CharacterSprite(15, 10, boss.color, 'enemy');
    boss.sprite.setCombatPosition(15, 10);
    
    // Store boss for later spawning
    this.runeTrialBoss = boss;
    
    // Start with empty enemies array - boss spawns after pillar charges
    this.enemies = [];
    
    this.addLog(`Activate the pillar to begin the Rune Trial!`, 'room');
    
    // Create pillar UI
    this.createRuneTrialPillarUI();
    
    
}

spawnEndlessEnemies() {
    // Calculate how many enemies to spawn to reach the target
    const currentCount = this.enemies.length;
    
    // If below minimum, spawn up to max
    if (currentCount < this.endlessMinEnemies) {
        const toSpawn = this.endlessMaxEnemies - currentCount;
        this.spawnEndlessEnemyBatch(toSpawn);
    }
    // If below max, spawn one to maintain flow
    else if (currentCount < this.endlessMaxEnemies) {
        this.spawnEndlessEnemyBatch(1);
    }
}

spawnEndlessEnemyBatch(count) {
    // NEW: Epic Endless Monsters - Large treasure guardian-style enemies
    const endlessEnemyTypes = [
        'titan_colossus', 'infernal_behemoth', 'frost_leviathan', 'chaos_juggernaut',
        'void_dreadnought', 'storm_ravager', 'plague_abomination', 'crimson_tyrant',
        'arcane_devastator', 'shadow_overlord', 'molten_destroyer', 'crystal_sentinel'
    ];
    
    // Helper function to check if a position is too close to existing enemies
    const isPositionValid = (x, y, minDistance = 4) => {
        for (const enemy of this.enemies) {
            if (!enemy.sprite) continue;
            const dx = Math.abs(enemy.sprite.gridX - x);
            const dy = Math.abs(enemy.sprite.gridY - y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                return false; // Too close to another enemy
            }
        }
        // Also check party members to avoid spawning on top of them
        for (const member of this.party) {
            if (!member.sprite) continue;
            const dx = Math.abs(member.sprite.gridX - x);
            const dy = Math.abs(member.sprite.gridY - y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 3) {
                return false; // Too close to party
            }
        }
        return true;
    };
    
    // Helper function to find a valid spawn position
    const findValidPosition = (side) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            let xPos, yPos;
            
            switch(side) {
                case 0: // Right side
                    xPos = 14 + Math.floor(Math.random() * 5); // 14-18
                    yPos = 6 + Math.floor(Math.random() * 8); // 6-13
                    break;
                case 1: // Left side  
                    xPos = 2 + Math.floor(Math.random() * 3); // 2-4
                    yPos = 6 + Math.floor(Math.random() * 8); // 6-13
                    break;
                case 2: // Top
                    xPos = 5 + Math.floor(Math.random() * 10); // 5-14
                    yPos = 2 + Math.floor(Math.random() * 3); // 2-4
                    break;
                case 3: // Bottom
                    xPos = 5 + Math.floor(Math.random() * 10); // 5-14
                    yPos = 15 + Math.floor(Math.random() * 3); // 15-17
                    break;
            }
            
            if (isPositionValid(xPos, yPos)) {
                return { xPos, yPos };
            }
            
            attempts++;
        }
        
        // If we couldn't find a valid position after many attempts, return a random one anyway
        // (this is a fallback to prevent infinite loops)
        switch(side) {
            case 0: return { xPos: 14 + Math.floor(Math.random() * 5), yPos: 6 + Math.floor(Math.random() * 8) };
            case 1: return { xPos: 2 + Math.floor(Math.random() * 3), yPos: 6 + Math.floor(Math.random() * 8) };
            case 2: return { xPos: 5 + Math.floor(Math.random() * 10), yPos: 2 + Math.floor(Math.random() * 3) };
            case 3: return { xPos: 5 + Math.floor(Math.random() * 10), yPos: 15 + Math.floor(Math.random() * 3) };
        }
    };
    
    let spawned = 0;
    for (let i = 0; i < count; i++) {
        const type = endlessEnemyTypes[Math.floor(Math.random() * endlessEnemyTypes.length)];
        const enemy = new Enemy(type, this.endlessEnemyLevel, 'endlessblessings', false);
        
        // CRITICAL: Validate enemy HP - endless arena should only have strong enemies
        // If enemy has less than 5000 HP, it's not properly scaled - skip it
        if (enemy.maxHp < 5000) {
            i--; // Retry this spawn
            continue;
        }
        
        // Spawn enemies from ALL SIDES to surround the team with collision detection
        const side = Math.floor(Math.random() * 4); // 0=right, 1=left, 2=top, 3=bottom
        const position = findValidPosition(side);
        
        enemy.sprite = new CharacterSprite(position.xPos, position.yPos, enemy.color, 'enemy');
        enemy.sprite.setCombatPosition(position.xPos, position.yPos);
        this.enemies.push(enemy);
        spawned++;
    }
    
    this._unitPositionsChanged = true;
}

updateEndlessDungeon() {
    // PERIODIC CLEANUP: Remove any weak enemies that shouldn't be here
    // Only check every 3 seconds to avoid FPS drops
    if (!this._lastEndlessCleanupTime) this._lastEndlessCleanupTime = 0;
    const now = Date.now();
    
    if (now - this._lastEndlessCleanupTime > 3000) {
        const weakEnemies = this.enemies.filter(e => e.maxHp < 5000);
        if (weakEnemies.length > 0) {
            this.enemies = this.enemies.filter(e => e.maxHp >= 5000);
            this._unitPositionsChanged = true;
        }
        this._lastEndlessCleanupTime = now;
    }
    
    // Continuously maintain 3-5 enemies - spawn immediately when below threshold
    this.spawnEndlessEnemies();
}

// Call this when enemies are killed to track progression and award blessings
updateEndlessWave() {
    // Increment kill count FIRST
    this.endlessKillCount++;
    this.endlessEnemiesKilledThisWave++;
    
    // Submit to leaderboard on endless kill milestones (every 25 kills)
    if (this.endlessKillCount % 25 === 0 && window.submitToLeaderboard) {
        localStorage.setItem(LS_KEYS.CURRENT_ENDLESS_KILLS, this.endlessKillCount.toString());
        window.submitToLeaderboard();
    }
    
    // Calculate blessing reward based on total kills
    let blessingsToAward = 0;
    if (this.endlessKillCount < 20) {
        blessingsToAward = 1; // 1 blessing per kill
    } else if (this.endlessKillCount < 30) {
        blessingsToAward = 2; // 2 blessings per kill
    } else if (this.endlessKillCount < 40) {
        blessingsToAward = 3; // 3 blessings per kill
    } else if (this.endlessKillCount < 50) {
        blessingsToAward = 4; // 4 blessings per kill
    } else {
        blessingsToAward = 5; // 5 blessings per kill (50+)
    }
    
    // Award blessings
    this.blessingCurrency = (this.blessingCurrency || 0) + blessingsToAward;
    
    // Update kill counter display
    const killCounter = document.getElementById('kill-counter');
    if (killCounter) {
        killCounter.textContent = `${this.endlessKillCount} Kills`;
    }
    
    // Log the reward
    if (blessingsToAward > 1) {
        this.addLog(`⚔️ Kill #${this.endlessKillCount}! +${blessingsToAward} Blessings!`, 'loot');
    }
    
    // Every 4 kills, increase enemy level by 8 (faster scaling)
    if (this.endlessEnemiesKilledThisWave >= 4) {
        this.endlessWave++;
        this.endlessEnemyLevel += 8;
        this.dungeonFloor = Math.floor(this.endlessEnemyLevel);
        this.endlessEnemiesKilledThisWave = 0;
        
        this.updateRoomLabel({ 
            type: 'normal', 
            name: `Divine Arena`
        });
        
        this.addLog(`💀 Enemies now Level ${this.endlessEnemyLevel}!`, 'room');
    }
}

// Update endless arena stats display showing damage or healing per character
updateCharacterStatsDisplay() {
    const display = document.getElementById('damage-stats-display');
    const panel = document.getElementById('character-stats-panel');
    if (!display || !panel || !this.characterStats) return;
    
    const mode = this.characterStatsDisplayMode || 'damage';
    let totalStat = 0;
    let characterStats = [];
    
    // Calculate total and create breakdown for each character
    this.party.forEach(member => {
        const stats = this.characterStats[member.name];
        if (stats) {
            const value = mode === 'damage' ? stats.damageDealt : stats.healingDone;
            totalStat += value;
            characterStats.push({
                name: member.name,
                value: value,
                className: member.className
            });
        }
    });
    
    // Sort by value descending
    characterStats.sort((a, b) => b.value - a.value);
    
    // Check if display needs updating (change detection for performance)
    const icon = mode === 'damage' ? '⚔️' : '💚';
    const label = mode === 'damage' ? 'DMG' : 'HEAL+SHIELD';
    const dragHandle = '<span style="opacity: 0.5; margin-right: 4px;">⋮⋮</span>';
    const newDisplayText = `${dragHandle}${icon} ${label}: ${totalStat.toLocaleString()}`;
    
    if (display.innerHTML !== newDisplayText) {
        display.innerHTML = newDisplayText;
    }
    
    // Only update panel if data has changed (cache last update)
    const cacheKey = JSON.stringify({ mode, stats: characterStats.map(c => ({ n: c.name, v: c.value })) });
    if (this._lastStatsCache === cacheKey) return;
    this._lastStatsCache = cacheKey;
    
    // Build character breakdown HTML
    const title = mode === 'damage' ? '⚔️ Damage Dealt' : '💚 Healing & Shielding';
    let panelHTML = `<div style="font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; color: #93c5fd; margin-bottom: 8px; text-align: center; letter-spacing: 1px;">${title}</div>`;
    
    if (characterStats.length === 0 || totalStat === 0) {
        panelHTML += `<div style="text-align: center; color: #64748b; font-size: 12px; padding: 8px 0;">No stats yet</div>`;
    } else {
        characterStats.forEach(char => {
            const percentage = totalStat > 0 ? Math.round((char.value / totalStat) * 100) : 0;
            const barWidth = percentage;
            
            // Class-specific colors
            const classColors = {
                'Tank': '#71717a',
                'Healer': '#22c55e',
                'Mage': '#a855f7',
                'Rogue': '#ef4444',
                'Archer': '#f59e0b',
                'Paladin': '#fbbf24'
            };
            const color = classColors[char.className] || '#3b82f6';
            
            panelHTML += `
                <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 12px; font-weight: 600; color: ${color};">${char.name}</span>
                        <span style="font-size: 12px; font-weight: 700; color: #e2e8f0;">${char.value.toLocaleString()} (${percentage}%)</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(15, 23, 42, 0.8); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, ${color}, ${color}99); transition: width 0.3s ease;"></div>
                    </div>
                </div>
            `;
        });
    }
    
    panel.innerHTML = panelHTML;
}

// Toggle between damage and healing stats display
toggleCharacterStatsDisplay() {
    if (!this.characterStatsDisplayMode) return;
    
    this.characterStatsDisplayMode = this.characterStatsDisplayMode === 'damage' ? 'healing' : 'damage';
    this.updateCharacterStatsDisplay();
}


createRuneTrialPillarUI() {
    // Remove existing UI if any
    let existingUI = document.getElementById('rune-trial-pillar-ui');
    if (existingUI) existingUI.remove();
    
    const pillarUI = document.createElement('div');
    pillarUI.id = 'rune-trial-pillar-ui';
    pillarUI.style.cssText = `
        position: fixed;
        top: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
        border: 3px solid #3b82f6;
        border-radius: 12px;
        padding: 20px 30px;
        z-index: 1000;
        box-shadow: 0 10px 40px rgba(59, 130, 246, 0.4);
    `;
    
    pillarUI.innerHTML = `
        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; color: #3b82f6; margin-bottom: 10px; text-align: center; font-weight: 700;">
            ⚡ CHARGING PILLAR ⚡
        </div>
        <div style="width: 300px; height: 24px; background: rgba(15, 23, 42, 0.8); border: 2px solid #1e293b; border-radius: 12px; overflow: hidden; position: relative;">
            <div id="pillar-charge-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.1s linear; box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);"></div>
            <div id="pillar-charge-text" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 12px; color: white; text-shadow: 0 0 4px black;">0%</div>
        </div>
        <div style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 8px; font-style: italic;">
            Stand near pillar to charge
        </div>
    `;
    
    document.body.appendChild(pillarUI);
}

updateRuneTrialPillarUI() {
    const bar = document.getElementById('pillar-charge-bar');
    const text = document.getElementById('pillar-charge-text');
    
    if (bar && text) {
        const percent = Math.floor((this.runeTrialPillarCharge / this.runeTrialPillarMaxCharge) * 100);
        bar.style.width = percent + '%';
        text.textContent = percent + '%';
    }
}

spawnRuneTrialBomber() {
    const tier = this.runeTrialTier;
    
    // Create bomber
    const bomber = new Enemy('shade', tier * 10, 'umbral');
    bomber.name = `Bomber #${this.runeTrialNextBomberId++}`;
    bomber.hp = 100; // Takes multiple hits to kill
    bomber.maxHp = 100;
    bomber.attack = 0; // Doesn't attack normally
    bomber.defense = 0;
    bomber.color = '#ef4444';
    bomber.isBomber = true;
    bomber.bombTimer = 0;
    bomber.spawnTime = Date.now(); // Track when bomber spawned
    
    // Spawn at random edge position
    const edges = [
        {x: 5, y: 5}, {x: 25, y: 5}, {x: 5, y: 25}, {x: 25, y: 25},
        {x: 15, y: 3}, {x: 3, y: 15}, {x: 27, y: 15}, {x: 15, y: 27}
    ];
    const spawnPos = edges[Math.floor(Math.random() * edges.length)];
    
    bomber.sprite = new CharacterSprite(spawnPos.x, spawnPos.y, bomber.color, 'enemy');
    bomber.sprite.setCombatPosition(spawnPos.x, spawnPos.y);
    
    // Pick random party member as target
    const aliveParty = this.party.filter(m => m.isAlive);
    if (aliveParty.length > 0) {
        bomber.bomberTarget = aliveParty[Math.floor(Math.random() * aliveParty.length)];
    }
    
    this.enemies.push(bomber);
    this.addLog(`Bomber spawned!`, 'damage');
}

updateBomber(bomber) {
    if (!bomber.isAlive || !bomber.bomberTarget || !bomber.bomberTarget.isAlive) {
        bomber.isAlive = false;
        return;
    }
    
    // Move towards target
    const target = bomber.bomberTarget;
    const dx = target.sprite.gridX - bomber.sprite.gridX;
    const dy = target.sprite.gridY - bomber.sprite.gridY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Initialize movement counter if needed
    if (!bomber.moveCounter) bomber.moveCounter = 0;
    bomber.moveCounter++;
    
    // Only move every 10 frames (makes them VERY slow)
    if (bomber.moveCounter % 10 === 0 && distance > 0.5) {
        const speed = 0.01;
        bomber.sprite.gridX += (dx / distance) * speed;
        bomber.sprite.gridY += (dy / distance) * speed;
    }
    
    // Flash red more frequently as it gets closer
    bomber.bombTimer++;
    const flashRate = Math.max(15, 60 - Math.floor((1 - distance / 20) * 45));
    if (bomber.bombTimer % flashRate < flashRate / 2) {
        bomber.color = '#ff0000';
    } else {
        bomber.color = '#ef4444';
    }
    bomber.sprite.color = bomber.color;
    
    // Explode if close enough to ANY party member
    const aliveParty = this.party.filter(m => m.isAlive);
    let shouldExplode = false;
    
    for (const partyMember of aliveParty) {
        if (!partyMember.sprite) continue;
        const dx = partyMember.sprite.gridX - bomber.sprite.gridX;
        const dy = partyMember.sprite.gridY - bomber.sprite.gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 2) {
            shouldExplode = true;
            break;
        }
    }
    
    if (shouldExplode) {
        // Explosion effect
        this.createBombExplosionEffect(bomber.sprite);
        
        const timeAlive = ((Date.now() - bomber.spawnTime) / 1000).toFixed(1);        
        
        // Deal AOE damage to ALL party members within explosion radius
        let hitCount = 0;
        aliveParty.forEach(partyMember => {
            if (!partyMember.sprite) return;
            
            const dx = partyMember.sprite.gridX - bomber.sprite.gridX;
            const dy = partyMember.sprite.gridY - bomber.sprite.gridY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Explosion radius of 3 tiles
            if (dist < 3) {
                const damage = Math.floor(partyMember.maxHp * 0.2);
                partyMember.takeDamage(damage);
                this.createFloatingText(partyMember.sprite, `-${damage} BOMB!`, 'damage-text');
                hitCount++;
            }
        });
        
        bomber.isAlive = false;
        this.addLog(`Bomber explodes, hitting ${hitCount} party member(s)!`, 'damage');
    }
}

createBombExplosionEffect(sprite) {
    if (!sprite) return;
    const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
    
    // Large red explosion ring
    this.visualEffects.push({
        type: 'ring',
        x: pos.x + this.offsetX,
        y: pos.y + this.offsetY,
        radius: 10,
        maxRadius: 80,
        color: 'rgba(239, 68, 68, 0.8)',
        lineWidth: 8,
        life: 30
    });
    
    // Fire particles - REDUCED for performance
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        this.visualEffects.push({
            type: 'spark',
            x: pos.x + this.offsetX,
            y: pos.y + this.offsetY,
            vx: Math.cos(angle) * 6,
            vy: Math.sin(angle) * 6,
            color: 'rgba(251, 146, 60, 0.9)',
            size: 5,
            life: 35
        });
    }
}

showBossEnrageEffect(boss) {
    if (!boss || !boss.sprite) return;
    
    // Create large enrage notification overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Orbitron', sans-serif;
        font-size: 72px;
        font-weight: 900;
        color: #ef4444;
        text-shadow: 0 0 40px #ef4444, 0 0 80px #dc2626;
        z-index: 5000;
        pointer-events: none;
        animation: enrage-pulse 0.5s ease-in-out 3;
    `;
    overlay.textContent = 'ENRAGED!';
    
    // Add animation keyframes
    if (!document.getElementById('enrage-animation')) {
        const style = document.createElement('style');
        style.id = 'enrage-animation';
        style.textContent = `
            @keyframes enrage-pulse {
                0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(overlay);
    
    // Remove after 1.5 seconds
    setTimeout(() => overlay.remove(), 1500);
    
    // Boss visual effect
    const pos = ISO.toScreen(boss.sprite.gridX, boss.sprite.gridY);
    
    // Massive red explosion
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            this.visualEffects.push({
                type: 'ring',
                x: pos.x + this.offsetX,
                y: pos.y + this.offsetY,
                radius: 20,
                maxRadius: 150 + i * 30,
                color: 'rgba(220, 38, 38, 0.8)',
                lineWidth: 12,
                life: 50
            });
        }, i * 150);
    }
    
    // Rage particles - REDUCED for performance
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        this.visualEffects.push({
            type: 'spark',
            x: pos.x + this.offsetX,
            y: pos.y + this.offsetY,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            color: 'rgba(220, 38, 38, 0.9)',
            size: 8,
            life: 50
        });
    }
}
spawnVaultBoss() {
    const L = this.vaultLevel;
    this._unitPositionsChanged = true; // Boss spawning
    
    // Create boss with scaled stats - use any valid boss type since we'll override everything
    const boss = new Boss(L, 'night_herald', 'umbral');
    boss.name = 'Keystone Warden';
    boss.hp = VAULT_SCALER.bossHP(L);
    boss.maxHp = VAULT_SCALER.bossHP(L);
    boss.attack = VAULT_SCALER.bossATK(L);
    boss.defense = VAULT_SCALER.bossDEF(L);
    boss.attackSpeed = 0.5;
    boss.color = '#f59e0b';
    boss.xpReward = Math.floor(1000 * L);
    boss.goldReward = L * 25;
    boss.isVaultBoss = true;
    boss.isAlive = true;  // Explicitly set alive
    
    // Position in center of large room (30x30)
    boss.sprite = new CharacterSprite(15, 10, boss.color, 'enemy');
    boss.sprite.setCombatPosition(15, 10);
    
    this.enemies = [boss];

    if (this.enemies.length === 0) {
        console.error('No enemies spawned!');
        return;
    }
    
    this.addLog(`Keystone Warden appears! HP: ${boss.maxHp}`, 'damage');
    
    // Start summoning timer - first summon at 2.0s
    this.vaultSummonTimeout = setTimeout(() => {
        this.summonHound();
        
        // Then repeat every SI(L) seconds (Math.max(2.4, 4.0 - 0.08*L))
        const summonInterval = Math.max(2.4, 4.0 - 0.08 * L);
        const intervalMs = summonInterval * 1000;
        this.vaultSummonInterval = setInterval(() => {
            this.summonHound();
        }, intervalMs);
    }, 2000);
    
    this.addLog(`Keystone Warden appears!`, 'room');
}

spawnRuneTrialBoss() {
    const tier = this.runeTrialTier;
    this._unitPositionsChanged = true;
    
    // Create boss with scaled stats
    const boss = new Boss(tier * 10, 'night_herald', 'umbral');
    boss.name = 'Rune Guardian';
    
    // Custom HP scaling per tier
    const hpByTier = {
        1: 500000,
        2: 600000,
        3: 700000,
        4: 800000,
        5: 1000000
    };
    
    // Custom Attack scaling per tier
    const atkByTier = {
        1: 135,
        2: 200,
        3: 270,
        4: 295,
        5: 400
    };
    
    // Defense: Use floor-based scaling for consistency (CALCULATE FIRST)
    const equivalentFloor = 40 + (tier * 10);
    const defScaling = Math.min(Math.floor((4 + (equivalentFloor * 1.0) + (equivalentFloor * equivalentFloor * 0.005)) * 1.5), 200);
    
    // NOW set all stats after calculating defScaling
    boss.hp = hpByTier[tier];
    boss.maxHp = hpByTier[tier];
    boss.attack = atkByTier[tier];
    boss.defense = defScaling;
    boss.attackSpeed = 0.6;
    boss.color = '#3b82f6'; // Blue theme for Rune Trials
    boss.xpReward = Math.floor(500 * tier);
    boss.goldReward = tier * 100;
    boss.isRuneTrialBoss = true;
    boss.isAlive = true;
    boss.isBig = true; // Make it 2x size like other bosses
    boss.hasRedEyes = true; // Add red eyes for menacing look
    
    // Position in center of large room (30x30)
    boss.sprite = new CharacterSprite(15, 10, boss.color, 'enemy');
    boss.sprite.setCombatPosition(15, 10);
    boss.sprite.scale = 2.0; // Make it twice as big
    
    this.enemies = [boss];
    
    this.addLog(`Rune Guardian appears! HP: ${boss.maxHp.toLocaleString()}`, 'damage');
}

// ========================================
// PINNACLE BOSS - Ultimate Boss Fight
// ========================================
enterPinnacle() {
    // Prevent spam clicking with 5 second cooldown (shared with Vault/Rune Trial)
    const now = Date.now();
    if (this._lastSpecialDungeonUse && now - this._lastSpecialDungeonUse < 5000) {
        const remainingSeconds = Math.ceil((5000 - (now - this._lastSpecialDungeonUse)) / 1000);
        this.addLog(`Wait ${remainingSeconds}s before entering`, 'damage');
        return;
    }
    
    this._lastSpecialDungeonUse = now;
    
    this.currentDungeon = 'pinnacle';
    this.dungeonFloor = 1;
    this.lastDungeonChangeTime = Date.now();
    
    // Clear any existing dungeon layout and rooms FIRST
    this.hallways = [];
    this.adjacentRooms = [];
    this.enemies = []; // Clear any existing enemies
    
    // Reset character stats for Pinnacle fight
    if (!this.characterStats) this.characterStats = {};
    this.party.forEach(member => {
        if (!this.characterStats[member.name]) {
            this.characterStats[member.name] = {
                damageDealt: 0,
                healingDone: 0
            };
        } else {
            this.characterStats[member.name].damageDealt = 0;
            this.characterStats[member.name].healingDone = 0;
        }
    });
    
    // Create isolated Pinnacle room data
    this.currentRoomData = {
        type: ROOM_TYPES.BOSS,
        x: 0,
        y: 0,
        visited: true,
        cleared: false,
        connections: []
    };
    
    // Set dungeonLayout to NULL for Pinnacle - it's not a normal dungeon
    this.dungeonLayout = null;
    
    // Create large Pinnacle room (30x30 for big boss arena)
    this.room = new DungeonRoom(30, 30, ROOM_TYPES.BOSS, 'pinnacle');
    
    // Clear the minimap since Pinnacle has no dungeon layout
    this.mapCtx.fillStyle = '#000';
    this.mapCtx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    
    // Show room label
    document.getElementById('room-label').style.display = 'block';
    document.getElementById('room-label').textContent = `👑 Pinnacle Boss`;
    
    // Restore party for Pinnacle fight - full heal and revive
    this.party.forEach(member => {
        member.isAlive = true;
        member.hp = member.getTotalMaxHp();
        member.mana = member.getTotalMaxMana();
        member.cooldown = 0;
        member.attackCooldown = 0;
        if (member.keystoneCooldown) member.keystoneCooldown = 0;
        member.shieldAmount = 0;
        member.phoenixUsedThisBattle = false;
        
        // Reset ability-specific cooldowns/buffs
        if (member.tauntActive) member.tauntActive = false;
        if (member.tauntTimer) member.tauntTimer = 0;
        if (member.sacredBarrierDefense) member.sacredBarrierDefense = 0;
        if (member.sacredBarrierTimer) member.sacredBarrierTimer = 0;
        if (member.berserkerActive) member.berserkerActive = false;
        if (member.berserkerTimer) member.berserkerTimer = 0;
    });
    
    // Unpause the game AFTER everything is set up
    this.paused = false;
    
    // Hide dungeon selector if it's open
    const selector = document.getElementById('dungeon-selector');
    if (selector) selector.style.display = 'none';
    
    // Set Pinnacle background (use vault background)
    this.setDungeonBackground('pinnacle', 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault%20room.png');
    
    const formations = {
        0: {x: 15, y: 20},  // Tank front center
        1: {x: 13, y: 21},  // Healer back left
        2: {x: 14, y: 22},  // Mage back center
        3: {x: 16, y: 22}   // Rogue back right
    };
    
    this.party.forEach((member, i) => {
        if (member.sprite) {
            const pos = formations[i];
            member.sprite.moveTo(pos.x, pos.y, true);
            member.sprite.setCombatPosition(pos.x, pos.y);
        }
    });
    
    this.spawnPinnacleBoss();
    
    // Mark room as not cleared so battle triggers properly
    this.currentRoomData.cleared = false;
    
    // Ensure enemies array is populated before battle
    this.updateUI();
    
    // Start battle immediately - boss should already be spawned
    if (this.enemies.length > 0 && this.enemies[0].isAlive) {
        setTimeout(() => this.startBattle(), 500);
    } else {
        console.error('Pinnacle boss failed to spawn!');
        this.addLog('ERROR: Pinnacle boss failed to spawn!', 'damage');
    }
    
    this.addLog(`👑 You challenge the Pinnacle Boss!`, 'legendary');
    this.addLog(`⚔️ Defeat the boss to claim a Best-in-Slot weapon!`, 'room');
    
    // Update UI
    this.updateUI();
}

spawnPinnacleBoss() {
    this._unitPositionsChanged = true; // Boss spawning
    
    // Create boss with stats
    const boss = new Boss(100, 'night_herald', 'umbral');
    boss.name = 'Pinnacle Boss';
    boss.hp = 15000000; // 15 million HP
    boss.maxHp = 15000000;
    boss.attack = 800;
    boss.defense = 200; // Lowered from 300
    boss.attackSpeed = 0.7;
    boss.color = '#ec4899'; // Pink
    boss.xpReward = 100000;
    boss.goldReward = 50000;
    boss.isPinnacleBoss = true;
    boss.isAlive = true;
    boss.isBig = true;
    boss.hasRedEyes = true;
    
    // Position in center of large room (30x30)
    boss.sprite = new CharacterSprite(15, 10, boss.color, 'enemy');
    boss.sprite.setCombatPosition(15, 10);
    boss.sprite.scale = 2.0; // Same size as Rune Trial boss
    
    this.enemies = [boss];
    
    if (this.enemies.length === 0) {
        console.error('No enemies spawned!');
        return;
    }
    
    this.addLog(`Pinnacle Boss appears! HP: ${boss.maxHp.toLocaleString()}`, 'damage');
    
    // Enrage mechanic - boss gains stacking attack buff over time
    boss.pinnacleEnrageStacks = 0;
    boss.pinnacleBaseAttack = boss.attack;
    this.pinnacleEnrageInterval = setInterval(() => {
        if (!boss || !boss.isAlive) {
            clearInterval(this.pinnacleEnrageInterval);
            this.pinnacleEnrageInterval = null;
            return;
        }
        boss.pinnacleEnrageStacks++;
        const enrageBonus = boss.pinnacleBaseAttack * 0.15 * boss.pinnacleEnrageStacks; // +15% ATK per stack
        boss.attack = Math.round(boss.pinnacleBaseAttack + enrageBonus);
        
        if (boss.pinnacleEnrageStacks <= 5) {
            this.addLog(`👑 Pinnacle Boss enrages! (+${boss.pinnacleEnrageStacks * 15}% ATK)`, 'damage');
        } else if (boss.pinnacleEnrageStacks % 3 === 0) {
            this.addLog(`👑 Pinnacle Boss fury intensifies! (+${boss.pinnacleEnrageStacks * 15}% ATK)`, 'damage');
        }
    }, 8000);
    
    // Start spawning mini bosses every 10 seconds
    this.pinnacleMiniSpawnInterval = setInterval(() => {
        this.summonPinnacleMini();
    }, 10000);
    
    // Spawn first mini after 5 seconds
    this.pinnacleMiniSpawnTimeout = setTimeout(() => {
        this.summonPinnacleMini();
    }, 5000);
}

summonPinnacleMini() {
    const boss = this.enemies.find(e => e.isPinnacleBoss);
    if (!boss || !boss.isAlive) {
        // Main boss is dead, stop summoning
        if (this.pinnacleMiniSpawnInterval) clearInterval(this.pinnacleMiniSpawnInterval);
        if (this.pinnacleMiniSpawnTimeout) clearTimeout(this.pinnacleMiniSpawnTimeout);
        return;
    }
    
    // Max 5 minis at once
    const aliveMinis = this.enemies.filter(e => e.isPinnacleMini && e.isAlive).length;
    if (aliveMinis >= 5) {
        return;
    }
    
    // Create mini boss (smaller version)
    const mini = new Enemy('shade', 100, 'umbral');
    mini.name = 'Pinnacle Spawn';
    mini.color = '#f472b6'; // Lighter pink
    mini.hp = 100000; // 100k HP
    mini.maxHp = 100000;
    mini.attack = 200;
    mini.defense = 200;
    mini.attackSpeed = 0.8;
    mini.isPinnacleMini = true;
    mini.isAlive = true;
    
    const spawnPositions = [
        {x: 8, y: 8}, {x: 22, y: 8}, {x: 8, y: 12}, {x: 22, y: 12},
        {x: 10, y: 6}, {x: 20, y: 6}, {x: 15, y: 5}, {x: 12, y: 10}, {x: 18, y: 10}
    ];
    const pos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
    
    mini.sprite = new CharacterSprite(pos.x, pos.y, mini.color, 'enemy');
    mini.sprite.setCombatPosition(pos.x, pos.y);
    
    this.enemies.push(mini);
    this.addLog('⚔️ Pinnacle Spawn emerges!', 'damage');
}

createPinnacleItem(weaponType) {
    // Pinnacle item configuration
    const pinnacleWeapons = {
        dagger: {
            name: 'Pinnacle Dagger',
            subtitle: "The Assassin's Apex",
            stats: ['attack', 'attackSpeed', 'critChance', 'lifesteal']
        },
        greatsword: {
            name: 'Pinnacle Greatsword',
            subtitle: "The Titan's Edge",
            stats: ['attack', 'hp', 'defense', 'lifesteal']
        },
        wand: {
            name: 'Pinnacle Wand',
            subtitle: "The Archmage's Pride",
            stats: ['attack', 'manaRegen', 'critChance', 'cdr']
        },
        staff: {
            name: 'Pinnacle Staff',
            subtitle: "The Divine Conduit",
            stats: ['attack', 'mana', 'manaRegen', 'cdr']
        },
        bow: {
            name: 'Pinnacle Bow',
            subtitle: "The Sky Piercer",
            stats: ['attack', 'attackSpeed', 'critChance', 'critDamage']
        },
        warhammer: {
            name: 'Pinnacle Warhammer',
            subtitle: "The Mountain's Wrath",
            stats: ['attack', 'hp', 'mana', 'lifesteal']
        }
    };
    
    const config = pinnacleWeapons[weaponType];
    
    // Create the item object
    const item = {
        id: Date.now() + Math.random(),
        type: 'weapon',
        weaponType: weaponType,
        name: config.name,
        subtitle: config.subtitle,
        rarity: 'pinnacle',
        level: 100,
        isPinnacle: true,
        pinnacleStats: config.stats
    };
    
    // Calculate perfect stats (level 100 mythic-equivalent values * 2 for all 4 stats)
    const levelScaling = Math.pow(1.018, 100); // ~6x multiplier at level 100
    const mythicBonus = 2.0; // 200% of base
    
    const baseStats = {
        attack: 15,
        hp: 50,
        mana: 30,
        defense: 8,
        attackSpeed: 0.05,
        critChance: 3,
        critDamage: 15,
        lifesteal: 2,
        cdr: 3,
        manaRegen: 2
    };
    
    config.stats.forEach(stat => {
        const base = baseStats[stat] || 10;
        item[stat] = base * levelScaling * mythicBonus;
    });
    
    // Add getStatsDisplay method so the item renders correctly in inventory/loot UI
    item.getStatsDisplay = function() {
        const statLabels = {
            attack: 'ATK', hp: 'HP', mana: 'MANA', defense: 'DEF',
            attackSpeed: 'ATK SPD', critChance: 'CRIT', critDamage: 'CRIT DMG',
            lifesteal: 'LIFESTEAL', cdr: 'CDR', manaRegen: 'MANA REGEN'
        };
        const percentStats = ['critChance', 'critDamage', 'lifesteal', 'cdr'];
        const parts = [];
        for (const s of config.stats) {
            if (this[s]) {
                const suffix = percentStats.includes(s) ? '%' : '';
                parts.push(`${statLabels[s] || s} +${Math.round(this[s] * 100) / 100}${suffix}`);
            }
        }
        return parts.join(', ');
    };
    
    return item;
}

showPinnacleVictoryScreen(goldReward, xpReward, pinnacleItem) {
    // Clean up spawn intervals
    if (this.pinnacleMiniSpawnInterval) clearInterval(this.pinnacleMiniSpawnInterval);
    if (this.pinnacleMiniSpawnTimeout) clearTimeout(this.pinnacleMiniSpawnTimeout);
    if (this.pinnacleEnrageInterval) { clearInterval(this.pinnacleEnrageInterval); this.pinnacleEnrageInterval = null; }
    
    // Create victory overlay
    let overlay = document.getElementById('pinnacle-victory-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pinnacle-victory-overlay';
        document.body.appendChild(overlay);
    }
    
    // Build stat display
    const statNames = {
        attack: 'Attack', hp: 'HP', mana: 'Mana', defense: 'Defense',
        attackSpeed: 'Attack Speed', critChance: 'Crit Chance', critDamage: 'Crit Damage',
        lifesteal: 'Lifesteal', cdr: 'Cooldown Reduction', manaRegen: 'Mana Regen'
    };
    
    let statDisplay = '';
    if (pinnacleItem.pinnacleStats) {
        pinnacleItem.pinnacleStats.forEach(stat => {
            if (pinnacleItem[stat]) {
                const value = pinnacleItem[stat];
                const displayValue = stat === 'attackSpeed' ? `+${(value * 100).toFixed(1)}%` :
                                    ['critChance', 'critDamage', 'lifesteal', 'cdr', 'manaRegen'].includes(stat) ? `+${value.toFixed(1)}%` :
                                    `+${Math.floor(value)}`;
                statDisplay += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #ec4899;">👑 ${statNames[stat] || stat}</span>
                    <span style="color: #f472b6; font-weight: bold;">${displayValue}</span>
                </div>`;
            }
        });
    }
    
    overlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 10002;">
            <div style="text-align: center; max-width: 600px; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">👑</div>
                <h1 style="font-family: 'Orbitron', sans-serif; font-size: 36px; margin-bottom: 10px; color: #ec4899;">
                    PINNACLE BOSS DEFEATED!
                </h1>
                <p style="color: #e9d5ff; font-size: 18px; margin-bottom: 30px;">
                    You have conquered the ultimate challenge!
                </p>
                
                <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(147, 51, 234, 0.2)); 
                    border: 3px solid #ec4899; border-radius: 20px; padding: 30px; margin-bottom: 30px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">⚔️</div>
                    <div style="font-family: 'Orbitron', sans-serif; font-size: 24px; color: #f472b6; margin-bottom: 5px;">
                        ${pinnacleItem.name}
                    </div>
                    <div style="font-size: 14px; color: #c084fc; margin-bottom: 10px; font-style: italic;">
                        "${pinnacleItem.subtitle}"
                    </div>
                    <div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; text-align: left;">
                        <div style="color: #fbbf24; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
                            Perfect Stats (Level 100)
                        </div>
                        ${statDisplay}
                    </div>
                </div>
                
                <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 30px;">
                    <div style="text-align: center;">
                        <div style="font-size: 28px;">💰</div>
                        <div style="color: #fbbf24; font-size: 24px; font-weight: bold;">${goldReward.toLocaleString()}</div>
                        <div style="color: #94a3b8; font-size: 12px;">GOLD</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px;">✨</div>
                        <div style="color: #a855f7; font-size: 24px; font-weight: bold;">${xpReward.toLocaleString()}</div>
                        <div style="color: #94a3b8; font-size: 12px;">XP</div>
                    </div>
                </div>
                
                <button onclick="window.game.closePinnacleVictory()" style="
                    padding: 18px 50px;
                    background: linear-gradient(135deg, #ec4899, #9333ea);
                    color: white;
                    border: none;
                    border-radius: 15px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                ">
                    CLAIM REWARD
                </button>
            </div>
        </div>
    `;
    
    overlay.style.display = 'block';
}

closePinnacleVictory() {
    const overlay = document.getElementById('pinnacle-victory-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Return to dungeon selector
    this.showDungeonSelector();
}

summonHound() {
    const boss = this.enemies.find(e => e.isVaultBoss);
    if (!boss || !boss.isAlive) {
        // Boss is dead, stop summoning
        if (this.vaultSummonInterval) clearInterval(this.vaultSummonInterval);
        if (this.vaultSummonTimeout) clearTimeout(this.vaultSummonTimeout);
        return;
    }
    
    const L = this.vaultLevel;
    const maxHounds = 4 + Math.floor(L / 7); // cap(L) formula embedded
    const aliveHounds = this.enemies.filter(e => e.name === 'Warden Hound' && e.isAlive).length;
    
    if (aliveHounds >= maxHounds) {
        return; // At cap, skip this summon
    }
    
   // Create hound with scaled stats
const hound = new Enemy('shade', L, 'umbral'); // Use any valid enemy type with theme
hound.name = 'Warden Hound';
    hound.color = '#8b4513';
    // HP: 100 per level (keep tanky)
    hound.hp = 100 * L;
    hound.maxHp = 100 * L;
    // Attack: Match floor enemy scaling (same formula as regular enemies)
    const equivalentFloor = L * 5;
    let houndAtkScaling;
    if (equivalentFloor <= 4) {
        // Floors 1-4: Very gentle linear scaling
        houndAtkScaling = Math.floor(3 + (equivalentFloor * 1.2));
    } else {
        // Floor 5+: Moderate scaling
        const adjustedLevel = equivalentFloor - 4;
        houndAtkScaling = Math.floor(8 + (adjustedLevel * 1.2) + (adjustedLevel * adjustedLevel * 0.012));
    }
    hound.attack = houndAtkScaling;
    // Defense: 5 per level
    hound.defense = 7 * L;
    hound.attackSpeed = 1.0;
    
    // Spawn at random positions around the boss
    const spawnPositions = [
        {x: 7, y: 8}, {x: 13, y: 8}, {x: 7, y: 4}, {x: 13, y: 4},
        {x: 10, y: 9}, {x: 10, y: 3}, {x: 6, y: 6}, {x: 14, y: 6}
    ];
    const pos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
    
    hound.sprite = new CharacterSprite(pos.x, pos.y, hound.color, 'enemy');
    hound.sprite.setCombatPosition(pos.x, pos.y);
    
    this.enemies.push(hound);
    this.addLog(`Keystone Warden summons a Warden Hound!`, 'damage');
}

spawnBoss() {
    // Boss selection by dungeon and floor
    const bossSelection = {
        everfall: ['red_stag', 'elder_treant'],
        stoneforge: ['foundry_master', 'colossus_of_iron'],
        umbral: ['night_herald', 'maw_of_deep']
    };
    
    const bossList = bossSelection[this.currentDungeon] || bossSelection.everfall;
    const bossType = bossList[Math.floor(Math.random() * bossList.length)];
    
    const boss = new Boss(this.dungeonFloor, bossType, this.currentDungeon);
    boss.sprite = new CharacterSprite(6, 4, boss.color, 'enemy');
    boss.sprite.setCombatPosition(6, 4);
    
    // Minion pools by dungeon - use same pools as regular enemies
    const minionPools = {
        everfall: ['forest_wolf', 'fallen_scout'],
        stoneforge: ['tunnel_rat', 'smelter_imp'],
        umbral: ['shade', 'void_mite']
    };
    
    const minionList = minionPools[this.currentDungeon] || minionPools.everfall;
    
    // Add minions for the boss
    const minion1Type = minionList[Math.floor(Math.random() * minionList.length)];
    const minion1 = new Enemy(minion1Type, this.dungeonFloor, this.currentDungeon);
    minion1.sprite = new CharacterSprite(5, 3, minion1.color, 'enemy');
    minion1.sprite.setCombatPosition(5, 3);
    
    const minion2Type = minionList[Math.floor(Math.random() * minionList.length)];
    const minion2 = new Enemy(minion2Type, this.dungeonFloor, this.currentDungeon);
    minion2.sprite = new CharacterSprite(5, 5, minion2.color, 'enemy');
    minion2.sprite.setCombatPosition(5, 5);
    
    this.enemies = [boss, minion1, minion2];
    
    this.addLog(`${boss.name} appears with minions!`, 'room');
}

            hasUnvisitedRooms() {
                if (!this.dungeonLayout || !this.dungeonLayout.rooms) {
                    return false;
                }
                return this.dungeonLayout.rooms.some(r => !r.visited);
            }

            moveToNextRoom() {
                // Prevent multiple simultaneous room transitions
                if (this.movingToNextRoom || this.transitioningFloor) {
                    
                    return;
                }
                
                if (!this.dungeonLayout || !this.dungeonLayout.getCurrentRoom) {
                    
                    return;
                }
                
                this.movingToNextRoom = true;
                
                const currentRoom = this.dungeonLayout.getCurrentRoom();
                if (!currentRoom) {
                    
                    this.movingToNextRoom = false;
                    return;
                }
                
                // Find next unvisited connected room
                let nextRoom = null;
                let nextDirection = null;
                for (const connection of currentRoom.connections) {
                    const room = this.dungeonLayout.rooms.find(r => r.x === connection.x && r.y === connection.y);
                    if (room && !room.visited) {
                        nextRoom = room;
                        // Determine direction
                        const dx = connection.x - currentRoom.x;
                        const dy = connection.y - currentRoom.y;
                        if (dx === 1) nextDirection = 'right';
                        else if (dx === -1) nextDirection = 'left';
                        else if (dy === 1) nextDirection = 'down';
                        else if (dy === -1) nextDirection = 'up';
                        break;
                    }
                }
                
                // If no unvisited connected rooms, find any unvisited room
                if (!nextRoom) {
                    nextRoom = this.dungeonLayout.rooms.find(r => !r.visited);
                    if (nextRoom) {
                        // Calculate direction for any room
                        const dx = nextRoom.x - currentRoom.x;
                        const dy = nextRoom.y - currentRoom.y;
                        if (Math.abs(dx) >= Math.abs(dy)) {
                            nextDirection = dx > 0 ? 'right' : 'left';
                        } else {
                            nextDirection = dy > 0 ? 'down' : 'up';
                        }
                    }
                }
                
                if (nextRoom) {
                    // Animate party walking through hallway
                    this.animateRoomTransition(nextDirection, () => {
                        try {
                            this.dungeonLayout.moveToRoom(nextRoom.x, nextRoom.y);
                            this.enterRoom(nextRoom);
                        } finally {
                            this.movingToNextRoom = false;
                        }
                    });
                } else {
                    // Dungeon complete! Move to next floor
                    try {
                        this.completeDungeon();
                    } finally {
                        this.movingToNextRoom = false;
                    }
                }
            }

animateRoomTransition(direction, callback) {
                // Just call the callback immediately - room repositioning happens in enterRoom
                callback();
            }

completeDungeon() {
    // FLOOR JUMPING FIX: Clear any queued transition timers at the start
    if (this._completeDungeonTimeout) {
        clearTimeout(this._completeDungeonTimeout);
        this._completeDungeonTimeout = null;
    }
    if (this._moveNextRoomTimeout) {
        clearTimeout(this._moveNextRoomTimeout);
        this._moveNextRoomTimeout = null;
    }
    
    // FLOOR JUMPING FIX: Idempotency guard - only run once per floor
    if (this._floorCompletionHandled) {
        console.log('⚠️ completeDungeon() already handled for this floor, skipping');
        return;
    }
    this._floorCompletionHandled = true;
    this.transitioningFloor = true;  // Block any further room/floor transitions
    
    this.addLog(`Floor ${this.dungeonFloor} complete!`, 'room');
    
    // Floor will be incremented in showSummary
    
    if (this.currentDungeon === 'vault') {
        this.addLog(`Vault conquered!`, 'loot');
        this.successfulRuns++;
        this.globalStats.totalFloorsCleared++;
        this.globalStats.totalGoldEarned += this.floorStats.goldEarned;
        this.updateUI();
        this.showSummary(true);
        return;
    }
    
    // Roll for Vault Key drop (10% chance, capped at level 20)
    if (Math.random() < VAULT_KEY_CONFIG.DROP_CHANCE) {
        // Determine key level based on current floor
        let keyLevel = 1;
        if (this.dungeonFloor >= 100) {
            keyLevel = 20; // Floor 100+ always drops level 20
        } else {
            // Calculate key level from floor ranges
            for (let kl = 19; kl >= 1; kl--) {
                const minFloor = (kl - 1) * 5 + 1;
                const maxFloor = kl === 19 ? 100 : kl * 5 + 5;
                if (this.dungeonFloor >= minFloor && this.dungeonFloor <= maxFloor) {
                    keyLevel = kl;
                    break;
                }
            }
        }
        const key = {
            id: this.nextVaultKeyId++,
            level: keyLevel
        };
        this.vaultKeys.push(key);
        this.addLog(`Found Level ${keyLevel} Vault Key! Access Vault in Cache tab.`, 'loot');
    }
    
    // Roll for Rune Trial Key drop (10% chance, floor 45+, capped at tier 5)
    if (this.dungeonFloor >= RUNE_TRIAL_KEY_CONFIG.MIN_DROP_FLOOR && Math.random() < RUNE_TRIAL_KEY_CONFIG.DROP_CHANCE) {
        // Determine key tier based on current floor
        let keyTier = 1;
        if (this.dungeonFloor >= 90) keyTier = 5;
        else if (this.dungeonFloor >= 80) keyTier = 4;
        else if (this.dungeonFloor >= 70) keyTier = 3;
        else if (this.dungeonFloor >= 60) keyTier = 2;
        else keyTier = 1;
        
        const key = {
            id: this.nextRuneTrialKeyId++,
            tier: keyTier
        };
        this.runeTrialKeys.push(key);
        this.addLog(`Found Tier ${keyTier} Rune Trial Key! Access in Cache tab.`, 'loot');
    }
    
    // Increment successful runs counter
    this.successfulRuns++;
    
// Update global stats
if (this.dungeonFloor >= this.globalStats.farthestFloor) {
    this.globalStats.farthestFloor = this.dungeonFloor;
    
    // STEAM: Track floor progression achievements
    if (window.trackStat) {
        window.trackStat('floorReached', this.dungeonFloor);
    }
}

// STEAM: Track dungeon completion
if (window.trackStat && this.currentDungeon) {
    window.trackStat('dungeonCompleted', this.currentDungeon);
}

// Update dungeon-specific progress
if (this.currentDungeon !== 'vault' && this.currentDungeon !== 'runetrial') {
    // Track farthest floor in THIS dungeon
    if (this.dungeonFloor > this.dungeonProgress[this.currentDungeon].farthestFloor) {
        this.dungeonProgress[this.currentDungeon].farthestFloor = this.dungeonFloor;
    }
    
    // REMOVED: Automatic startFloor update - player now has full control via dropdown
    // Start floor remains as player selected via the dropdown selector
}

// Force UI update to reflect new farthest floor
this.updateUI();

// Track floor time
    
    // Track floor time with validation
    const floorTime = this.floorStats.startTime ? 
        Math.floor((Date.now() - this.floorStats.startTime) / 1000) : 
        null;
    
    // Only update fastest floor time if valid AND reasonable (at least 3 seconds)
    if (floorTime !== null && floorTime >= 3) {
        if (this.globalStats.fastestFloorTime === null || floorTime < this.globalStats.fastestFloorTime) {
            this.globalStats.fastestFloorTime = floorTime;
        }
    }
    
    this.globalStats.totalFloorsCleared++;
    this.globalStats.totalGoldEarned += this.floorStats.goldEarned;
    
    // Roll for chest drop (5% chance)
if (Math.random() < CHEST_CONFIG.DROP_CHANCE) {
    // 5% of chests are mythic
    const isMythic = Math.random() < CHEST_CONFIG.MYTHIC_CHEST_CHANCE;
    
    const chest = {
        id: this.nextChestId++,
        level: this.dungeonFloor,
        isMythic: isMythic,
        openCost: isMythic ? 
            CHEST_CONFIG.MYTHIC_OPEN_COST_MULTIPLIER * this.dungeonFloor : 
            CHEST_CONFIG.OPEN_COST_MULTIPLIER * this.dungeonFloor,
        sellValue: isMythic ? 
            CHEST_CONFIG.MYTHIC_SELL_VALUE_MULTIPLIER * this.dungeonFloor : 
            CHEST_CONFIG.SELL_VALUE_MULTIPLIER * this.dungeonFloor,
        sourceDungeon: this.currentDungeon,
        foundAtFloor: this.dungeonFloor,
        rarityOdds: isMythic ? 
            { ...CHEST_CONFIG.MYTHIC_RARITY_DISTRIBUTION } : 
            { ...CHEST_CONFIG.RARITY_DISTRIBUTION }
    };
    
    this.playerChests.push(chest);
                    this.globalStats.chestsFound++;
                    
                    if (isMythic) {
                        this.globalStats.mythicChestsFound++;
                        this.addLog(`Found a ✨ MYTHIC CHEST (Level ${chest.level})! ✨`, 'loot');
                    }

const dungeonNames = {
                        umbral: 'The Whispering Spires',
                        everfall: 'The Hollowed Wilds',
                        stoneforge: 'The Iron Vaults'
                    };
                    
                    this.addLog(
                        `Found a Level ${chest.level} Chest from ${dungeonNames[chest.sourceDungeon]}! (Open: ${chest.openCost}g, Sell: ${chest.sellValue}g). See Chests tab.`,
                        'loot'
                    );
                }
                
                // Update stats display immediately
                this.updateUI();
                
                // Show summary screen
                this.showSummary(true);
            }
showFountainPopup() {
                // Check if popups are disabled
                if (!this.fountainPopupEnabled) return;
                
                // Create overlay if it doesn't exist
                let overlay = document.getElementById('fountain-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = 'fountain-overlay';
                    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 2500; opacity: 0; transition: opacity 0.3s ease;';
                    
                    const panel = document.createElement('div');
                    panel.style.cssText = 'background: linear-gradient(135deg, rgba(26, 58, 74, 0.98) 0%, rgba(42, 74, 90, 0.98) 100%); border: 3px solid #3b82f6; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9);';
                    
                    panel.innerHTML = `
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 42px; font-weight: 800; color: #60a5fa; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 4px; text-shadow: 0 0 20px rgba(59, 130, 246, 0.8);">
                            FOUNTAIN OF YOUTH
                        </div>
                        <div style="font-size: 24px; color: #10b981; font-weight: 600; font-family: 'Rajdhani', sans-serif;">
                             PARTY RESTORED 40% HP & MANA
                        </div>
                    `;
                    
                    overlay.appendChild(panel);
                    document.body.appendChild(overlay);
                }
                
                // Show with fade-in
                overlay.style.display = 'flex';
                setTimeout(() => overlay.style.opacity = '1', 10);
                
                // Auto-hide after 2 seconds with fade-out
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.style.display = 'none';
                        // Remove from DOM to prevent memory leak
                        overlay.remove();
                    }, 300);
                }, 2000);
            }

           showTreasurePopup() {
    // Check if popups are disabled
    if (!this.treasurePopupEnabled) return;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'treasure-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 2500; opacity: 0; transition: opacity 0.3s ease;';
    
    const panel = document.createElement('div');
    panel.style.cssText = 'background: linear-gradient(135deg, rgba(102, 85, 0, 0.98) 0%, rgba(153, 102, 0, 0.98) 100%); border: 3px solid #f59e0b; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9);';
    
    const goldPerEnemy = this.dungeonFloor * 200;
    
    panel.innerHTML = `
        <div style="font-family: 'Orbitron', sans-serif; font-size: 42px; font-weight: 800; color: #fbbf24; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 4px; text-shadow: 0 0 20px rgba(251, 191, 36, 0.8);">
            🏆 TREASURE ROOM 🏆
        </div>
        <div style="font-size: 24px; color: #f59e0b; font-weight: 600; font-family: 'Rajdhani', sans-serif; margin-bottom: 10px;">
            Treasure Guardians Protect This Room!
        </div>
        <div style="font-size: 18px; color: #fbbf24; font-weight: 500; font-family: 'Rajdhani', sans-serif;">
            Each guardian drops ${goldPerEnemy} gold!
        </div>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    // Show with fade-in
    setTimeout(() => overlay.style.opacity = '1', 10);
    
    // Auto-hide after 2 seconds with fade-out
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }, 2000);
}
            showSummary(victory) {
    // CRITICAL FIX: Hide any visible tooltips immediately when showing summary
    const lootTooltip = document.getElementById('loot-tooltip');
    if (lootTooltip) {
        lootTooltip.classList.remove('show');
        lootTooltip.style.display = 'none';
    }
    
    // Calculate time taken
    const timeElapsed = Math.floor((Date.now() - this.floorStats.startTime) / 1000);
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Find the guaranteed boss loot item if victory
    let bossLootItem = null;
    if (victory && this.loot.length > 0) {
        // Get the most recent item (boss always drops last)
        bossLootItem = this.loot[this.loot.length - 1];
    }
    
    // Create custom victory/defeat overlay
    const overlay = document.createElement('div');
    overlay.id = 'floor-summary-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: ${victory ? 
            'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%)' : 
            'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%)'};
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        backdrop-filter: blur(20px);
        animation: fadeIn 0.3s ease;
    `;
    
    const panel = document.createElement('div');
    panel.style.cssText = `
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%);
        border: 3px solid ${victory ? '#10b981' : '#ef4444'};
        border-radius: 20px;
        padding: 40px;
        max-width: 700px;
        width: 90%;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        animation: slideUp 0.4s ease;
    `;
    
    let itemDisplayHTML = '';
    if (victory && bossLootItem) {
        const rarityColors = {
            common: '#94a3b8',
            uncommon: '#10b981',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b',
            mythic: '#ef4444',
            pinnacle: '#ec4899'
        };
        
        const itemColor = rarityColors[bossLootItem.rarity] || '#94a3b8';
        const itemGlow = victory ? `0 0 30px ${itemColor}80` : '';
        
        itemDisplayHTML = `
            <div style="margin: 30px 0; padding: 25px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05)); border: 2px solid ${itemColor}; border-radius: 16px; box-shadow: ${itemGlow}; animation: itemPulse 2s ease-in-out infinite;">
                <div style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; text-align: center;">Boss Loot Acquired</div>
                <div style="font-size: 22px; font-weight: 800; color: ${itemColor}; text-align: center; font-family: 'Orbitron', sans-serif; text-shadow: 0 2px 10px ${itemColor}80; margin-bottom: 8px;">
                    ${bossLootItem.name}
                </div>
                <div style="font-size: 13px; color: #cbd5e1; text-align: center; line-height: 1.6;">
                    ${bossLootItem.getStatsDisplay ? bossLootItem.getStatsDisplay() : ''}
                </div>
            </div>
        `;
    }
    
    panel.innerHTML = `
        <div style="font-family: 'Orbitron', sans-serif; font-size: 48px; font-weight: 800; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 4px; ${victory ? 
            'background: linear-gradient(135deg, #10b981, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 40px rgba(16, 185, 129, 0.5);' : 
            'background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 40px rgba(239, 68, 68, 0.5);'} animation: titlePulse 2s ease-in-out infinite;">
            ${victory ? '⚔️ VICTORY! ⚔️' : '💀 DEFEAT 💀'}
        </div>
        
        <div style="text-align: center; font-size: 20px; color: #f59e0b; font-weight: 700; margin-bottom: 25px; font-family: 'Orbitron', sans-serif;">
            Floor ${this.dungeonFloor} ${victory ? 'Complete' : 'Failed'}
        </div>
        
        ${itemDisplayHTML}
        
        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid rgba(99, 102, 241, 0.2);">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                <span style="color: #94a3b8; font-weight: 500;">Time Taken:</span>
                <span style="color: #e2e8f0; font-weight: 700; font-family: 'Orbitron', sans-serif;">${timeString}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                <span style="color: #94a3b8; font-weight: 500;">Damage Dealt:</span>
                <span style="color: #ef4444; font-weight: 700; font-family: 'Orbitron', sans-serif;">${this.floorStats.damageDealt.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                <span style="color: #94a3b8; font-weight: 500;">Enemies Defeated:</span>
                <span style="color: #a855f7; font-weight: 700; font-family: 'Orbitron', sans-serif;">${this.floorStats.enemiesKilled}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                <span style="color: #94a3b8; font-weight: 500;">Gold Earned:</span>
                <span style="color: #f59e0b; font-weight: 700; font-family: 'Orbitron', sans-serif;">${this.floorStats.goldEarned}g</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span style="color: #94a3b8; font-weight: 500;">Loot Obtained:</span>
                <span style="color: #3b82f6; font-weight: 700; font-family: 'Orbitron', sans-serif;">${this.floorStats.lootObtained} items</span>
            </div>
        </div>
        
        <button id="floor-summary-btn" style="width: 100%; padding: 18px; background: ${victory ? 
            'linear-gradient(135deg, #10b981, #059669)' : 
            'linear-gradient(135deg, #71717a, #52525b)'}; color: white; border: none; border-radius: 12px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s ease; box-shadow: 0 4px 20px ${victory ? 
            'rgba(16, 185, 129, 0.4)' : 
            'rgba(99, 102, 241, 0.4)'}; position: relative; overflow: hidden;">
            ${victory ? `Continue to Floor ${this.dungeonFloor + 1}` : 'Respawn'} (${this.summaryDuration}s)
        </button>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    // Add animations via style tag
    const style = document.createElement('style');
    style.textContent = `
        @keyframes itemPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }
        @keyframes titlePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
    `;
    document.head.appendChild(style);
    
    // Countdown logic
    let countdown = this.summaryDuration;
    const button = document.getElementById('floor-summary-btn');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        button.textContent = `${victory ? `Continue to Floor ${this.dungeonFloor + 1}` : 'Respawn'} (${countdown}s)`;
    }, 1000);
    
    // FLOOR JUMPING FIX: Guard to prevent continue action running twice (timeout + click)
    let didContinue = false;
    
    const continueAction = () => {
        // FLOOR JUMPING FIX: Only allow continue to run once
        if (didContinue) {
            console.log('⚠️ continueAction already executed, skipping');
            return;
        }
        didContinue = true;
        
        clearInterval(countdownInterval);
        overlay.remove();
        style.remove();
        
        // CRITICAL FIX: Hide any visible tooltips when completing floor
        const lootTooltip = document.getElementById('loot-tooltip');
        if (lootTooltip) {
            lootTooltip.classList.remove('show');
            lootTooltip.style.display = 'none';
        }
        
        // Set transition flag to prevent other operations
        this.transitioningFloor = true;
        
        // Check if this was a Vault run
        if (this.currentDungeon === 'vault') {
            this.currentDungeon = null;
            this.vaultLevel = null;
            this.dungeonFloor = 1;
            this.room = null;
            this.dungeonLayout = null;
            this.enemies = [];
            this.hallways = [];  // Clear visual elements
            this.adjacentRooms = [];  // Clear visual elements
            this.transitioningFloor = false;
            this.movingToNextRoom = false;
            document.getElementById('room-label').style.display = 'none';
            this.showDungeonSelector();
            return;
        }
        
        if (victory) {
            // Clear any pending operations
            this.movingToNextRoom = false;
            
            // Increment floor
            this.dungeonFloor++;
            document.getElementById('current-floor-display').textContent = this.dungeonFloor;
            
            // Submit to leaderboard on milestone floors (every 10 floors)
            if (this.dungeonFloor % 10 === 0 && window.submitToLeaderboard) {
                window.submitToLeaderboard();
            }
            
            // Save game every 5 floors
            if (this.dungeonFloor % 5 === 0 && window.saveGame) {
                window.saveGame();
            }
            
            // Award blessing currency for Divine Arena dungeon
            if (this.currentDungeon === 'endlessblessings') {
                const blessingReward = Math.floor(this.dungeonFloor / 2); // 1 per 2 floors
                this.blessingCurrency = (this.blessingCurrency || 0) + blessingReward;
                if (blessingReward > 0) {
                    this.addLog(`✨ Earned ${blessingReward} Blessing Currency!`, 'loot');
                }
            }
            
            // Clear old state before generating new dungeon - INCLUDING visual elements
            this.enemies = [];
            this.room = null;
            this.dungeonLayout = null;
            this.hallways = [];  // Clear old hallways to prevent ghost floors
            this.adjacentRooms = [];  // Clear old adjacent rooms to prevent invisible floors
            
            // Generate new dungeon with proper delay
            setTimeout(() => {
                try {
                    this.generateDungeon();
                } finally {
                    this.transitioningFloor = false;
                }
            }, 300);
        } else {
            this.transitioningFloor = false;
            this.respawnParty();
        }
    };
    
    setTimeout(continueAction, this.summaryDuration * 1000);
    button.onclick = continueAction;
}

            showRuneTrialVictoryScreen(goldReward, xpReward, rune, lootItems) {
    // CRITICAL FIX: Hide any visible tooltips immediately when showing victory screen
    const lootTooltip = document.getElementById('loot-tooltip');
    if (lootTooltip) {
        lootTooltip.classList.remove('show');
        lootTooltip.style.display = 'none';
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'runetrial-victory-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 3000;
        opacity: 0;
        transition: opacity 0.5s ease;
    `;
    
    const panel = document.createElement('div');
    panel.style.cssText = `
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
        border: 3px solid #3b82f6;
        border-radius: 20px;
        padding: 40px;
        max-width: 700px;
        width: 90%;
        box-shadow: 0 30px 80px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        transform: scale(0.8);
        transition: transform 0.5s ease;
    `;
    
    const tierColors = {
        1: '#94a3b8',
        2: '#10b981',
        3: '#3b82f6',
        4: '#a855f7',
        5: '#f59e0b'
    };
    
    panel.innerHTML = `
        <div style="font-family: 'Orbitron', sans-serif; font-size: 48px; font-weight: 800; text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #3b82f6, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase; letter-spacing: 4px;">
            TRIAL COMPLETE
        </div>
        
        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid rgba(168, 85, 247, 0.3);">
            <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Gold Earned</div>
                    <div style="font-size: 32px; font-weight: 800; color: #f59e0b; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(245, 158, 11, 0.5);">💰 ${goldReward}g</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">XP Per Member</div>
                    <div style="font-size: 32px; font-weight: 800; color: #ffffff; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);">⭐ ${xpReward}</div>
                </div>
            </div>
        </div>
        
        <div style="border-top: 2px solid rgba(59, 130, 246, 0.3); padding-top: 20px; margin-top: 10px;">
            <div style="font-size: 16px; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 15px; font-weight: 700;">🔮 Rune Reward 🔮</div>
            <div style="display: flex; align-items: center; gap: 20px; background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 12px; border: 2px solid #3b82f6;">
                <div style="width: 80px; height: 80px; flex-shrink: 0; background: radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.1) 70%, transparent 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; box-shadow: 0 0 20px rgba(251, 191, 36, 0.4), inset 0 0 20px rgba(251, 191, 36, 0.2); border: 3px solid rgba(251, 191, 36, 0.5);">
                    ${rune.emoji}
                </div>
                <div style="flex: 1; text-align: left;">
                    <div style="font-size: 18px; font-weight: 700; color: #3b82f6; margin-bottom: 5px; font-family: 'Orbitron', sans-serif;">${rune.name}</div>
                    <div style="font-size: 12px; color: #e2e8f0; line-height: 1.5;">${rune.description}</div>
                </div>
            </div>
        </div>
        
        <div style="border-top: 2px solid rgba(59, 130, 246, 0.3); padding-top: 20px; margin-top: 20px;">
            <div style="font-size: 14px; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 12px; font-weight: 700;">Bonus Loot (3 Items)</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                ${lootItems.map((item, idx) => `
                    <div class="runetrial-loot-item" data-loot-index="${idx}" style="background: rgba(30, 41, 59, 0.8); border: 2px solid ${this.getRarityColor(item.rarity)}; border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; transition: all 0.2s ease;">
                        <div style="font-size: 11px; font-weight: 700; color: ${this.getRarityColor(item.rarity)}; margin-bottom: 3px;">${item.rarity.toUpperCase()}</div>
                        <div style="font-size: 10px; color: #e2e8f0; margin-top: 4px;">${item.name}</div>
                        <div style="font-size: 9px; color: #94a3b8;">Lvl ${item.level}</div>
                    </div>
                `).join('')}
            </div>
            <div style="font-size: 9px; color: #64748b; text-align: center; margin-top: 8px; font-style: italic;">Loot odds: 10% Legendary, 40% Epic, 50% Rare</div>
        </div>
        
        <button class="summary-button" id="runetrial-continue-btn" style="width: 100%; margin-top: 20px; padding: 18px; background: linear-gradient(135deg, #3b82f6, #60a5fa); color: #fff; border: none; border-radius: 12px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4); transition: all 0.3s ease;">
            Continue
        </button>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    // Fade in
    setTimeout(() => {
        overlay.style.opacity = '1';
        panel.style.transform = 'scale(1)';
    }, 10);
    
    // Add tooltip event listeners for loot items - with proper cleanup
setTimeout(() => {
    // Clean up old listeners first
    const oldItems = document.querySelectorAll('.runetrial-loot-item');
    oldItems.forEach(item => {
        const clone = item.cloneNode(true);
        item.parentNode?.replaceChild(clone, item);
    });
    
    // Now add fresh listeners
    document.querySelectorAll('.runetrial-loot-item').forEach((itemDiv, idx) => {
        itemDiv.addEventListener('mouseenter', (e) => {
            const index = parseInt(itemDiv.getAttribute('data-loot-index'));
            const item = lootItems[index];
            
            if (!item) return;
            
            itemDiv.style.transform = 'scale(1.05)';
            itemDiv.style.boxShadow = `0 0 20px ${this.getRarityColor(item.rarity)}`;
            
            const tooltip = document.getElementById('equipment-tooltip');
            if (!tooltip) return;
            
            let tooltipHTML = `
                <div class="tooltip-header ${item.rarity}">${item.name}</div>
                <div class="tooltip-stats">
            `;
            
            const slotNames = {
                helmet: 'Helmet', gloves: 'Gloves', belt: 'Belt', chest: 'Chestplate',
                boots: 'Boots', amulet: 'Amulet', ring: 'Ring', wand: 'Wand',
                dagger: 'Dagger', greatsword: 'Greatsword', staff: 'Staff', bow: 'Bow', warhammer: 'Warhammer', weapon: 'Weapon'
            };
            
            const itemType = item.weaponType || item.type;
            tooltipHTML += `<div class="tooltip-stat" style="color: #3b82f6; font-weight: 600;">${slotNames[itemType] || itemType}</div>`;
            
            if (item.attack) tooltipHTML += `<div class="tooltip-stat">+${item.attack} Attack ${this.getStatRollPercent(item, 'attack')}</div>`;
            if (item.attackSpeed) tooltipHTML += `<div class="tooltip-stat">+${item.attackSpeed} Attack Speed ${this.getStatRollPercent(item, 'attackSpeed')}</div>`;
            if (item.hp) tooltipHTML += `<div class="tooltip-stat">+${item.hp} HP ${this.getStatRollPercent(item, 'hp')}</div>`;
            if (item.mana) tooltipHTML += `<div class="tooltip-stat">+${item.mana} Mana ${this.getStatRollPercent(item, 'mana')}</div>`;
            if (item.defense) tooltipHTML += `<div class="tooltip-stat">+${item.defense} Defense ${this.getStatRollPercent(item, 'defense')}</div>`;
            if (item.critChance) tooltipHTML += `<div class="tooltip-stat">+${item.critChance}% Crit Chance ${this.getStatRollPercent(item, 'critChance')}</div>`;
            if (item.critDamage) tooltipHTML += `<div class="tooltip-stat">+${item.critDamage}% Crit Damage ${this.getStatRollPercent(item, 'critDamage')}</div>`;
            if (item.dodgeChance) tooltipHTML += `<div class="tooltip-stat">+${item.dodgeChance}% Dodge ${this.getStatRollPercent(item, 'dodgeChance')}</div>`;
            if (item.lifesteal) tooltipHTML += `<div class="tooltip-stat">+${item.lifesteal}% Lifesteal ${this.getStatRollPercent(item, 'lifesteal')}</div>`;
            if (item.hpRegen) tooltipHTML += `<div class="tooltip-stat">+${item.hpRegen}% HP Regen ${this.getStatRollPercent(item, 'hpRegen')}</div>`;
            if (item.manaRegen) tooltipHTML += `<div class="tooltip-stat">+${item.manaRegen}% Mana Regen ${this.getStatRollPercent(item, 'manaRegen')}</div>`;
            if (item.cdr) tooltipHTML += `<div class="tooltip-stat">+${item.cdr}% CDR ${this.getStatRollPercent(item, 'cdr')}</div>`;
            
            tooltipHTML += `</div>`;
            
            tooltip.innerHTML = tooltipHTML;
            tooltip.classList.add('show');
            tooltip.style.display = 'block';
            tooltip.style.zIndex = '10000';
            
            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - 125}px`;
            tooltip.style.top = `${rect.top - 100}px`;
            tooltip.style.transform = 'translateY(-100%)';
        });
        
        itemDiv.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('equipment-tooltip');
            if (tooltip) {
                tooltip.classList.remove('show');
                tooltip.style.display = 'none';
            }
            itemDiv.style.transform = 'scale(1)';
            itemDiv.style.boxShadow = 'none';
        });
    });
}, 100);
                
                const btn = document.getElementById('runetrial-continue-btn');
    
    const closeVictoryScreen = () => {
        overlay.style.opacity = '0';
        panel.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            overlay.remove();
            
            // Reset trial state
            this.currentDungeon = null;
            this.runeTrialTier = null;
            this.dungeonFloor = 1;
            this.room = null;
            this.dungeonLayout = null;
            this.enemies = [];
            
            // Hide room label
            document.getElementById('room-label').style.display = 'none';
            
            // Go directly to dungeon selector (banner page) without showing keystones first
            this.addLog('Rune Trial complete! Select your next dungeon...', 'room');
            setTimeout(() => {
                this.showDungeonSelector();
            }, 100);
        }, 500);
    };
    
    btn.onclick = closeVictoryScreen;
}

showVaultVictoryScreen(goldReward, xpReward, keystone, lootItems) {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.id = 'vault-victory-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 3000;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                `;
                
                const panel = document.createElement('div');
                panel.style.cssText = `
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
                    border: 3px solid #f59e0b;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 700px;
                    width: 90%;
                    box-shadow: 0 30px 80px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transform: scale(0.8);
                    transition: transform 0.5s ease;
                `;
                
                // Get keystone icon class
                const keystoneIconClass = keystone.internalName;
                const keystoneRarityClass = `rarity-${keystone.rarity}`;
                
                panel.innerHTML = `
    <div style="font-family: 'Orbitron', sans-serif; font-size: 48px; font-weight: 800; text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #f59e0b, #fbbf24); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase; letter-spacing: 4px; animation: pulse 2s ease-in-out infinite;">
        VAULT CONQUERED
    </div>
                    
                    <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid rgba(245, 158, 11, 0.3);">
                        <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
                            <div style="text-align: center;">
                                <div style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Gold Earned</div>
                                <div style="font-size: 32px; font-weight: 800; color: #f59e0b; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(245, 158, 11, 0.5);">💰 ${goldReward}g</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">XP Per Member</div>
                                <div style="font-size: 32px; font-weight: 800; color: #ffffff; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);">⭐ ${xpReward}</div>
                            </div>
                        </div>
</div>
                        </div>
                        
                        <div style="border-top: 2px solid rgba(245, 158, 11, 0.3); padding-top: 20px; margin-top: 10px;">
                            <div style="font-size: 16px; color: #f59e0b; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 15px; font-weight: 700;">🔑 Keystone Reward 🔑</div>
                            <div style="display: flex; align-items: center; gap: 20px; background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 12px; border: 2px solid #f59e0b;">
                                <div class="keystone-icon ${keystoneIconClass} ${keystoneRarityClass}" style="width: 80px; height: 80px; flex-shrink: 0; animation: float 3s ease-in-out infinite;"></div>
                                <div style="flex: 1;">
                                    <div style="font-size: 18px; font-weight: 700; color: ${this.getRarityColor(keystone.rarity)}; margin-bottom: 5px; font-family: 'Orbitron', sans-serif;">${keystone.name}</div>
                                    <div style="font-size: 12px; color: #f59e0b; margin-bottom: 5px; font-weight: 600;">${keystone.ability.name} (${keystone.ability.cooldown}s CD | ${keystone.ability.manaCost === 0 ? '<span style="color: #10b981;">Free</span>' : keystone.ability.manaCost + ' Mana'})</div>
                                    <div style="font-size: 11px; color: #94a3b8;">${keystone.ability.description}</div>
                                    <div style="font-size: 10px; color: #e2e8f0; margin-top: 5px;">${keystone.getStatsDisplay()}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="border-top: 2px solid rgba(245, 158, 11, 0.3); padding-top: 20px; margin-top: 20px;">
    <div style="font-size: 14px; color: #f59e0b; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 12px; font-weight: 700;">Bonus Loot (3 Items)</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                                ${lootItems.map((item, idx) => `
                                    <div class="vault-loot-item" data-loot-index="${idx}" style="background: rgba(30, 41, 59, 0.8); border: 2px solid ${this.getRarityColor(item.rarity)}; border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; transition: all 0.2s ease;">
                                        <div style="font-size: 11px; font-weight: 700; color: ${this.getRarityColor(item.rarity)}; margin-bottom: 3px;">${item.rarity.toUpperCase()}</div>
                                        <div style="font-size: 10px; color: #e2e8f0; margin-top: 4px;">${item.name}</div>
                                        <div style="font-size: 9px; color: #94a3b8;">Lvl ${item.level}</div>
                                    </div>
                                `).join('')}
                            </div>
    <div style="font-size: 9px; color: #64748b; text-align: center; margin-top: 8px; font-style: italic;">Loot odds: 25% Legendary, 20% Epic, 55% Rare</div>
</div>
                    </div>
                    
                    <button id="vault-continue-btn" style="width: 100%; padding: 18px; background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #000; border: none; border-radius: 12px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4); transition: all 0.3s ease;">
                        Continue (3s)
                    </button>
                `;
                
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
                
                // Add floating animation keyframes if not already present
                if (!document.getElementById('vault-victory-styles')) {
                    const style = document.createElement('style');
                    style.id = 'vault-victory-styles';
                    style.textContent = `
                        @keyframes float {
                            0%, 100% { transform: translateY(0px); }
                            50% { transform: translateY(-10px); }
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.8; transform: scale(1.05); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Fade in
                setTimeout(() => {
                    overlay.style.opacity = '1';
                    panel.style.transform = 'scale(1)';
                }, 10);
                
                // Manual continue only - no auto-continue
const btn = document.getElementById('vault-continue-btn');
btn.textContent = 'Continue';

const closeVictoryScreen = () => {
                    // CRITICAL FIX: Hide any visible tooltips before closing
                    const equipTooltip = document.getElementById('equipment-tooltip');
                    if (equipTooltip) {
                        equipTooltip.classList.remove('show');
                        equipTooltip.style.display = 'none';
                    }
                    const lootTooltip = document.getElementById('loot-tooltip');
                    if (lootTooltip) {
                        lootTooltip.classList.remove('show');
                        lootTooltip.style.display = 'none';
                    }
                    
                    overlay.style.opacity = '0';
                    panel.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        overlay.remove();
                        
                        // Reset vault state completely
                        this.currentDungeon = null;
                        this.vaultLevel = null;
                        this.dungeonFloor = 1;
                        this.room = null;
                        this.dungeonLayout = null;
                        this.enemies = [];
                        
                        // Hide room label
                        document.getElementById('room-label').style.display = 'none';
                        
                        // Go directly to dungeon selector (banner page) without showing keystones first
                        this.addLog('Vault conquered! Select your next dungeon...', 'room');
                        setTimeout(() => {
                            this.showDungeonSelector();
                        }, 100);
                    }, 500);
                };
                
                // Add tooltip event listeners for loot items
                setTimeout(() => {
                    document.querySelectorAll('.vault-loot-item').forEach((itemDiv, idx) => {
                        itemDiv.addEventListener('mouseenter', (e) => {
                            const index = parseInt(itemDiv.getAttribute('data-loot-index'));
                            const item = lootItems[index];
                            
                            if (!item) {
                                return;
                            }
                            
                            // Add scale effect
                            itemDiv.style.transform = 'scale(1.05)';
                            itemDiv.style.boxShadow = `0 0 20px ${this.getRarityColor(item.rarity)}`;
                            
                            const tooltip = document.getElementById('equipment-tooltip');
                            
                            if (!tooltip) {
                                return;
                            }
                            
                            let tooltipHTML = `
                                <div class="tooltip-header ${item.rarity}">${item.name}</div>
                                <div class="tooltip-stats">
                            `;
                            
                            // Get weapon type display
                            const slotNames = {
                                helmet: 'Helmet',
                                gloves: 'Gloves',
                                belt: 'Belt',
                                chest: 'Chestplate',
                                boots: 'Boots',
                                amulet: 'Amulet',
                                ring: 'Ring',
                                wand: 'Wand',
                                dagger: 'Dagger',
                                greatsword: 'Greatsword',
                                staff: 'Staff',
                                bow: 'Bow',
                                warhammer: 'Warhammer',
                                weapon: 'Weapon'
                            };
                            
                            const itemType = item.weaponType || item.type;
                            tooltipHTML += `<div class="tooltip-stat" style="color: #f59e0b; font-weight: 600;">${slotNames[itemType] || itemType}</div>`;
                            
                            if (item.attack) tooltipHTML += `<div class="tooltip-stat">+${item.attack} Attack ${this.getStatRollPercent(item, 'attack')}</div>`;
            if (item.attackSpeed) tooltipHTML += `<div class="tooltip-stat">+${item.attackSpeed} Attack Speed ${this.getStatRollPercent(item, 'attackSpeed')}</div>`;
            if (item.hp) tooltipHTML += `<div class="tooltip-stat">+${item.hp} HP ${this.getStatRollPercent(item, 'hp')}</div>`;
            if (item.mana) tooltipHTML += `<div class="tooltip-stat">+${item.mana} Mana ${this.getStatRollPercent(item, 'mana')}</div>`;
            if (item.defense) tooltipHTML += `<div class="tooltip-stat">+${item.defense} Defense ${this.getStatRollPercent(item, 'defense')}</div>`;
            if (item.critChance) tooltipHTML += `<div class="tooltip-stat">+${item.critChance}% Crit Chance ${this.getStatRollPercent(item, 'critChance')}</div>`;
            if (item.critDamage) tooltipHTML += `<div class="tooltip-stat">+${item.critDamage}% Crit Damage ${this.getStatRollPercent(item, 'critDamage')}</div>`;
            if (item.dodgeChance) tooltipHTML += `<div class="tooltip-stat">+${item.dodgeChance}% Dodge Chance ${this.getStatRollPercent(item, 'dodgeChance')}</div>`;
            if (item.lifesteal) tooltipHTML += `<div class="tooltip-stat">+${item.lifesteal}% Lifesteal ${this.getStatRollPercent(item, 'lifesteal')}</div>`;
            if (item.hpRegen) tooltipHTML += `<div class="tooltip-stat">+${item.hpRegen}% HP Regen ${this.getStatRollPercent(item, 'hpRegen')}</div>`;
            if (item.manaRegen) tooltipHTML += `<div class="tooltip-stat">+${item.manaRegen}% Mana Regen ${this.getStatRollPercent(item, 'manaRegen')}</div>`;
            if (item.cdr) tooltipHTML += `<div class="tooltip-stat">+${item.cdr}% CDR ${this.getStatRollPercent(item, 'cdr')}</div>`;
                            
                            tooltipHTML += `</div>`;
                            
                            tooltip.innerHTML = tooltipHTML;
                            tooltip.classList.add('show');
                            tooltip.style.display = 'block';
                            tooltip.style.zIndex = '10000';
                            
                            const rect = e.target.getBoundingClientRect();
							tooltip.style.left = `${rect.left + rect.width / 2 - 125}px`;
							tooltip.style.top = `${rect.top - 100}px`;
							tooltip.style.transform = 'translateY(-100%)';
                            
                            
                        });
                        
                        itemDiv.addEventListener('mouseleave', () => {
                            const tooltip = document.getElementById('equipment-tooltip');
                            if (tooltip) {
                                tooltip.classList.remove('show');
                                tooltip.style.display = 'none';
                            }
                            itemDiv.style.transform = 'scale(1)';
                            itemDiv.style.boxShadow = 'none';
                        });
                    });
                }, 100);
                
                btn.onclick = closeVictoryScreen;
            }

showEndlessBlessingsResults() {
    // Calculate total blessings earned based on kills
    let totalBlessings = 0;
    for (let i = 1; i <= this.endlessKillCount; i++) {
        if (i < 20) {
            totalBlessings += 1;
        } else if (i < 30) {
            totalBlessings += 2;
        } else if (i < 40) {
            totalBlessings += 3;
        } else if (i < 50) {
            totalBlessings += 4;
        } else {
            totalBlessings += 5;
        }
    }
    
    // Determine loot based on kill count
    const kills = this.endlessKillCount;
    let itemLevel, rarityRolls;
    
    // NEW: 1-9 kills = DEFEAT (no loot items)
    if (kills < 10) {
        itemLevel = null;
        rarityRolls = null;
    } else if (kills <= 20) {
        // 10-20 kills = Basic rarity table
        itemLevel = this.endlessEnemyLevel; // 70-100 (starts at 70, +6 per 4 kills)
        rarityRolls = [
            { rarity: 'rare', chance: 50 },
            { rarity: 'epic', chance: 85 },
            { rarity: 'legendary', chance: 100 }
        ];
    } else if (kills < 40) {
        itemLevel = this.endlessEnemyLevel; // 80-100
        rarityRolls = [
            { rarity: 'rare', chance: 35 },
            { rarity: 'epic', chance: 79.9 },
            { rarity: 'legendary', chance: 99.9 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 60) {
        itemLevel = this.endlessEnemyLevel; // 100-120
        rarityRolls = [
            { rarity: 'rare', chance: 20 },
            { rarity: 'epic', chance: 69.8 },
            { rarity: 'legendary', chance: 99.8 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 80) {
        itemLevel = this.endlessEnemyLevel; // 120-140
        rarityRolls = [
            { rarity: 'rare', chance: 10 },
            { rarity: 'epic', chance: 59.7 },
            { rarity: 'legendary', chance: 99.7 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 100) {
        itemLevel = this.endlessEnemyLevel; // 140-160
        rarityRolls = [
            { rarity: 'rare', chance: 5 },
            { rarity: 'epic', chance: 49.5 },
            { rarity: 'legendary', chance: 99.5 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 120) {
        itemLevel = this.endlessEnemyLevel; // 160-180
        rarityRolls = [
            { rarity: 'epic', chance: 34 },
            { rarity: 'legendary', chance: 99 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 140) {
        itemLevel = this.endlessEnemyLevel; // 180-200
        rarityRolls = [
            { rarity: 'epic', chance: 23 },
            { rarity: 'legendary', chance: 98 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 160) {
        itemLevel = this.endlessEnemyLevel; // 200-220
        rarityRolls = [
            { rarity: 'epic', chance: 12 },
            { rarity: 'legendary', chance: 97 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 180) {
        itemLevel = this.endlessEnemyLevel; // 220-240
        rarityRolls = [
            { rarity: 'epic', chance: 5 },
            { rarity: 'legendary', chance: 95 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else if (kills < 200) {
        itemLevel = this.endlessEnemyLevel; // 240-260
        rarityRolls = [
            { rarity: 'epic', chance: 3 },
            { rarity: 'legendary', chance: 93 },
            { rarity: 'mythic', chance: 100 }
        ];
    } else {
        itemLevel = this.endlessEnemyLevel; // 260+
        rarityRolls = [
            { rarity: 'epic', chance: 2 },
            { rarity: 'legendary', chance: 90 },
            { rarity: 'mythic', chance: 100 }
        ];
    }
    
    // Generate 3 items ONLY if player got 10+ kills (victory threshold)
    const lootTable = ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'];
    const rewardItems = [];
    
    // Only generate loot if rarityRolls exist (10+ kills)
    if (rarityRolls) {
        for (let i = 0; i < 3; i++) {
            const itemType = lootTable[Math.floor(Math.random() * lootTable.length)];
            const roll = Math.random() * 100;
            let rarity = 'rare';
            
            for (const tier of rarityRolls) {
                if (roll < tier.chance) {
                    rarity = tier.rarity;
                    break;
                }
            }
            
            const item = new Item(itemType, rarity, itemLevel);
            rewardItems.push(item);
            this.inventory.push(item);
        }
    }
    
    // Build loot display HTML
    const rarityColors = {
        common: '#94a3b8',
        uncommon: '#10b981',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b',
        mythic: '#ef4444',
        pinnacle: '#ec4899'
    };
    
    let lootHTML = '';
    
    // Show different message based on kills
    if (kills < 10) {
        // DEFEAT - less than 10 kills
        lootHTML = '<div style="margin: 30px 0;">';
        lootHTML += '<div style="font-size: 22px; color: #ef4444; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; text-align: center; font-weight: 700; text-shadow: 0 0 20px rgba(239, 68, 68, 0.6);">💀 DEFEAT 💀</div>';
        lootHTML += '<div style="font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 10px;">Reach 10 kills for arena rewards!</div>';
        lootHTML += '</div>';
    } else {
        // VICTORY - 10+ kills, show loot
        lootHTML = '<div style="margin: 30px 0;">';
        lootHTML += '<div style="font-size: 16px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; text-align: center; font-weight: 600;">⚔️ ARENA REWARDS ⚔️</div>';
        
        rewardItems.forEach(item => {
            const itemColor = rarityColors[item.rarity] || '#94a3b8';
            lootHTML += `
                <div style="margin: 15px 0; padding: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05)); border: 2px solid ${itemColor}; border-radius: 12px; box-shadow: 0 0 20px ${itemColor}40;">
                    <div style="font-size: 18px; font-weight: 800; color: ${itemColor}; text-align: center; font-family: 'Orbitron', sans-serif; text-shadow: 0 2px 10px ${itemColor}80; margin-bottom: 6px;">
                        ${item.name}
                    </div>
                    <div style="font-size: 12px; color: #cbd5e1; text-align: center; line-height: 1.4;">
                        ${item.getStatsDisplay ? item.getStatsDisplay() : ''}
                    </div>
                </div>
            `;
        });
        lootHTML += '</div>';
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'endless-summary-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(ellipse at center, rgba(168, 85, 247, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        backdrop-filter: blur(20px);
        animation: fadeIn 0.3s ease;
    `;
    
    const panel = document.createElement('div');
    panel.style.cssText = `
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%);
        border: 3px solid ${kills >= 10 ? '#10b981' : '#ef4444'};
        border-radius: 20px;
        padding: 40px;
        max-width: 700px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(${kills >= 10 ? '16, 185, 129' : '239, 68, 68'}, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        animation: slideUp 0.4s ease;
    `;
    
    panel.innerHTML = `
        <div style="font-family: 'Orbitron', sans-serif; font-size: 48px; font-weight: 800; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 4px; ${kills >= 10 ? 
            'background: linear-gradient(135deg, #10b981, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 40px rgba(16, 185, 129, 0.5);' : 
            'background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 40px rgba(239, 68, 68, 0.5);'} animation: titlePulse 2s ease-in-out infinite;">
            ${kills >= 10 ? '⚔️ VICTORY ⚔️' : '💀 DEFEAT 💀'}
        </div>
        
        <div style="text-align: center; font-size: 32px; color: ${kills >= 10 ? '#10b981' : '#ef4444'}; font-weight: 800; margin-bottom: 30px; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(${kills >= 10 ? '16, 185, 129' : '239, 68, 68'}, 0.6);">
            ${this.endlessKillCount} KILLS
        </div>
        
        ${lootHTML}
        
        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid rgba(16, 185, 129, 0.3);">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(168, 85, 247, 0.1);">
                <span style="color: #94a3b8; font-weight: 500;">💀 Final Enemy Level:</span>
                <span style="color: #a855f7; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 20px;">${this.endlessEnemyLevel}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(168, 85, 247, 0.1);">
                <span style="color: #94a3b8; font-weight: 500;">💰 Gold Earned:</span>
                <span style="color: #f59e0b; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 20px;">${this.floorStats.goldEarned}g</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(168, 85, 247, 0.1);">
                <span style="color: #94a3b8; font-weight: 500;">🔥 Damage Dealt:</span>
                <span style="color: #ef4444; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 20px;">${this.floorStats.damageDealt.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span style="color: #94a3b8; font-weight: 500;">✨ Blessings Earned:</span>
                <span style="color: #e9d5ff; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 28px; text-shadow: 0 0 10px rgba(168, 85, 247, 0.8);">${totalBlessings}</span>
            </div>
        </div>
        
        <button id="endless-summary-btn" style="width: 100%; padding: 18px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s ease; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);">
            Return to Dungeon Selection (5s)
        </button>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes titlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
    `;
    document.head.appendChild(style);
    
    let countdown = 5;
    const button = document.getElementById('endless-summary-btn');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            button.textContent = `Return to Dungeon Selection (${countdown}s)`;
        } else {
            button.textContent = 'Return to Dungeon Selection';
        }
    }, 1000);
    
    const returnAction = () => {
        clearInterval(countdownInterval);
        overlay.remove();
        style.remove();
        
        // Save the kill count for leaderboard tracking
        localStorage.setItem(LS_KEYS.CURRENT_ENDLESS_KILLS, this.endlessKillCount.toString());
        
        this.currentDungeon = null;
        this.dungeonFloor = 1;
        this.room = null;
        this.dungeonLayout = null;
        this.enemies = [];
        this.hallways = [];
        this.adjacentRooms = [];
        this.endlessKillCount = 0;
        this.endlessWave = 1;
        this.endlessEnemyLevel = 70;
        
        // Show minimap again
        const minimapCanvas = document.getElementById('map-canvas');
        if (minimapCanvas) {
            minimapCanvas.style.display = 'block';
        }
        
        // Hide kill counter
        const killCounter = document.getElementById('kill-counter');
        if (killCounter) {
            killCounter.style.display = 'none';
        }
        
        // Hide damage stats display
        const combatStatsContainer = document.getElementById('combat-stats-container');
        if (combatStatsContainer) {
            combatStatsContainer.style.display = 'none';
        }
        
        document.getElementById('room-label').style.display = 'none';
        this.showDungeonSelector();
    };
    
    button.onclick = returnAction;
    setTimeout(returnAction, 5000);
}


drawMinimap() {
    // Don't draw minimap for endless mode - it's a single arena
    if (this.currentDungeon === 'endlessblessings') {
        return;
    }
    
    // Only redraw minimap every 500ms
    const now = Date.now();
    if (now - this._lastMinimapUpdate < 500) return;
    this._lastMinimapUpdate = now;
    
    const ctx = this.mapCtx;
    const canvasWidth = this.mapCanvas.width;
    const canvasHeight = this.mapCanvas.height;
    
    // Disable anti-aliasing for crisp pixels
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    // Calculate cell size - use FULL canvas
    const gridSize = this.dungeonLayout.gridSize;
    const padding = 5; // Minimal padding
    const maxCellSize = Math.min(
        (canvasWidth - padding * 2) / gridSize,
        (canvasHeight - padding * 2) / gridSize
    );
    const cellSize = Math.floor(maxCellSize);
    
    // Calculate total grid dimensions
    const totalWidth = gridSize * cellSize;
    const totalHeight = gridSize * cellSize;
    
    // Center the grid in the canvas
    const offsetX = (canvasWidth - totalWidth) / 2;
    const offsetY = (canvasHeight - totalHeight) / 2;
    
    // Store room positions for hover detection
    this.minimapRooms = [];
    
    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(6, 9, 23, 0.95)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw grid lines for structure
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 1;
    for (let x = offsetX; x <= offsetX + totalWidth; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, offsetY);
        ctx.lineTo(x, offsetY + totalHeight);
        ctx.stroke();
    }
    for (let y = offsetY; y <= offsetY + totalHeight; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + totalWidth, y);
        ctx.stroke();
    }
    
    // Draw connections FIRST (under rooms)
    for (const room of this.dungeonLayout.rooms) {
        const x = offsetX + room.x * cellSize + cellSize/2;
        const y = offsetY + room.y * cellSize + cellSize/2;
        
        for (const connection of room.connections) {
            const x2 = offsetX + connection.x * cellSize + cellSize/2;
            const y2 = offsetY + connection.y * cellSize + cellSize/2;
            
            // Connection color based on status
            const connectedRoom = this.dungeonLayout.rooms.find(r => r.x === connection.x && r.y === connection.y);
            if (room.cleared && connectedRoom?.cleared) {
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
            } else if (room.visited || connectedRoom?.visited) {
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
            } else {
                ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
            }
            
            ctx.lineWidth = Math.max(4, cellSize * 0.15);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    // Draw rooms AFTER connections (on top)
    for (const room of this.dungeonLayout.rooms) {
        const x = offsetX + room.x * cellSize;
        const y = offsetY + room.y * cellSize;
        const roomPadding = 2;
        const roomSize = cellSize - roomPadding * 2;
        
        // Store room position for hover
        this.minimapRooms.push({
            room: room,
            x: x + roomPadding,
            y: y + roomPadding,
            width: roomSize,
            height: roomSize
        });
        
        // Determine room color
        let fillColor, borderColor;
        
        if (room === this.dungeonLayout.getCurrentRoom()) {
            // Current room - bright orange with pulse
            const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
            fillColor = `rgba(245, 158, 11, ${pulse})`;
            borderColor = '#f59e0b';
        } else if (room.type === ROOM_TYPES.BOSS) {
            fillColor = '#dc2626';  // Red for boss
            borderColor = '#ef4444';
        } else if (room.type === ROOM_TYPES.FOUNTAIN && room.visited) {
            fillColor = '#3b82f6';  // Blue for fountain
            borderColor = '#60a5fa';
        } else if (room.type === ROOM_TYPES.TREASURE) {
            fillColor = '#f59e0b';  // Gold for treasure
            borderColor = '#fbbf24';
        } else if (room.cleared) {
            fillColor = '#10b981';  // Green for cleared
            borderColor = '#34d399';
        } else if (room.visited) {
            fillColor = '#f87171';  // Light red for visited/has enemies
            borderColor = '#fca5a5';
        } else {
            fillColor = '#4b5563';  // Gray for unexplored
            borderColor = '#6b7280';
        }
        
        // Draw room fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(x + roomPadding, y + roomPadding, roomSize, roomSize);
        
        // Draw room border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = room === this.dungeonLayout.getCurrentRoom() ? 2 : 1;
        ctx.strokeRect(x + roomPadding, y + roomPadding, roomSize, roomSize);
    }
    
    
}

            startBattle() {
                this.inBattle = true;
                this.battleTimer = 0;
                this.battleStartTime = Date.now();
                
                // Reset room regen tracking for new battle
                this._roomRegenTicks = 0;
                this._roomStartTick = 0;
                
                // Initialize visual effects arrays
                if (!this.visualEffects) this.visualEffects = [];
                
                // Initialize character combat statistics tracking (but don't reset - that happens per floor)
                if (!this.characterStats) this.characterStats = {};
                this.party.forEach(member => {
                    if (!this.characterStats[member.name]) {
                        this.characterStats[member.name] = {
                            damageDealt: 0,
                            healingDone: 0
                        };
                    }
                    // Stats accumulate across rooms in the same floor
                });
                
                // Initialize stats display mode if not set
                if (!this.characterStatsDisplayMode) {
                    this.characterStatsDisplayMode = 'damage';
                }
                
                // Show combat stats display for all dungeons - CRITICAL FOR ALL DUNGEONS
                const combatStatsContainer = document.getElementById('combat-stats-container');
                if (combatStatsContainer) {
                    combatStatsContainer.style.display = 'flex';
                    
                    this.updateCharacterStatsDisplay();
                } else {
                    
                }
                
                // Initialize attack timers for all units
                [...this.party, ...this.enemies].forEach(unit => {
                    unit.attackTimer = Math.random() * 50; // Stagger initial attacks
                    unit.hasEngaged = false; // Track if unit has engaged in this battle
                });
            }
            
            createTauntEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Create expanding red ring for taunt
                this.visualEffects.push({
                    type: 'ring',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 10,
                    maxRadius: 120,
                    color: 'rgba(239, 68, 68, 0.6)',
                    lineWidth: 6,
                    life: 30
                });
                
                // Add intimidation lines
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    this.visualEffects.push({
                        type: 'line',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        angle: angle,
                        length: 0,
                        maxLength: 60,
                        color: 'rgba(239, 68, 68, 0.8)',
                        width: 4,
                        life: 25
                    });
                }
            }
            
            createDoubleStrikeEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Create two crossing slash marks
                this.visualEffects.push({
                    type: 'slash',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    angle: -Math.PI / 4,
                    length: 0,
                    maxLength: 80,
                    color: 'rgba(239, 68, 68, 0.9)',
                    width: 3,
                    life: 20
                });
                
                setTimeout(() => {
                    this.visualEffects.push({
                        type: 'slash',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        angle: Math.PI / 4,
                        length: 0,
                        maxLength: 80,
                        color: 'rgba(239, 68, 68, 0.9)',
                        width: 3,
                        life: 20
                    });
                }, 100);
            }
            
            createFireballEffect(casterSprite, targets) {
                if (!casterSprite) return;
                const startPos = ISO.toScreen(casterSprite.gridX, casterSprite.gridY);
                
                targets.forEach((target, index) => {
                    if (!target.sprite) return;
                    const endPos = ISO.toScreen(target.sprite.gridX, target.sprite.gridY);
                    
                    // Stagger fireballs slightly
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'projectile',
                            x: startPos.x + this.offsetX,
                            y: startPos.y + this.offsetY - 20,
                            targetX: endPos.x + this.offsetX,
                            targetY: endPos.y + this.offsetY,
                            speed: 8,
                            color: 'rgba(255, 100, 0, 0.9)',
                            size: 12,
                            trail: [],
                            life: 60
                        });
                    }, index * 50);
                });
            }
            createInvulnerabilityEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Golden shield dome
                this.visualEffects.push({
                    type: 'dome',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 20,
                    maxRadius: 50,
                    color: 'rgba(245, 158, 11, 0.4)',
                    life: 60
                });
                
                // Rotating shield rings
                for (let i = 0; i < 3; i++) {
                    this.visualEffects.push({
                        type: 'rotating-ring',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        radius: 30 + i * 10,
                        angle: i * 60,
                        color: 'rgba(245, 158, 11, 0.6)',
                        life: 180 // 3 seconds at 60fps
                    });
                }
            }

            createBloodFrenzyEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Blood explosion - REDUCED for performance
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    this.visualEffects.push({
                        type: 'blood-drop',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        vx: Math.cos(angle) * 5,
                        vy: Math.sin(angle) * 5,
                        color: 'rgba(220, 38, 38, 0.8)',
                        size: 5,
                        life: 30
                    });
                }
                
                // Red aura
                this.visualEffects.push({
                    type: 'aura',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 25,
                    maxRadius: 40,
                    color: 'rgba(220, 38, 38, 0.3)',
                    life: 480 // 8 seconds
                });
            }

            createSeismicSlamEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Ground shockwave
                this.visualEffects.push({
                    type: 'shockwave',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 10,
                    maxRadius: 150,
                    color: 'rgba(251, 146, 60, 0.6)',
                    lineWidth: 8,
                    life: 40
                });
                
                // Earth spikes
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'spike',
                            x: pos.x + this.offsetX + Math.cos(angle) * 60,
                            y: pos.y + this.offsetY + Math.sin(angle) * 60,
                            height: 0,
                            maxHeight: 40,
                            color: 'rgba(168, 162, 158, 0.9)',
                            life: 30
                        });
                    }, i * 50);
                }
            }

            createBlizzardEffect(targets) {
                // Icy storm over whole battlefield - REDUCED for performance
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'ice-shard',
                            x: this.canvas.width / 2 + (Math.random() - 0.5) * 400,
                            y: 100,
                            vy: 5,
                            vx: (Math.random() - 0.5) * 2,
                            color: 'rgba(186, 230, 253, 0.9)',
                            size: 8,
                            life: 60
                        });
                    }, i * 100);
                }
                
                // Freeze effect on each target
                targets.forEach(target => {
                    if (!target.sprite) return;
                    const pos = ISO.toScreen(target.sprite.gridX, target.sprite.gridY);
                    this.visualEffects.push({
                        type: 'freeze',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        radius: 30,
                        color: 'rgba(125, 211, 252, 0.5)',
                        life: 120 // 2 seconds frozen
                    });
                });
            }

            createVoidSurgeEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Purple void energy
                this.visualEffects.push({
                    type: 'void-portal',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 15,
                    maxRadius: 45,
                    color: 'rgba(139, 92, 246, 0.6)',
                    life: 300 // 5 attacks
                });
                
                // Void tendrils
                for (let i = 0; i < 6; i++) {
                    this.visualEffects.push({
                        type: 'tendril',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        angle: (Math.PI * 2 * i) / 6,
                        length: 0,
                        maxLength: 60,
                        color: 'rgba(124, 58, 237, 0.8)',
                        life: 300
                    });
                }
            }

            createTemporalRewindEffect() {
                // Clockwise spiral effect across whole screen
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 3;
                
                for (let i = 0; i < 6; i++) {
                    setTimeout(() => {
                        const angle = (Math.PI * 2 * i) / 6;
                        this.visualEffects.push({
                            type: 'time-ripple',
                            x: centerX,
                            y: centerY,
                            angle: angle,
                            radius: 0,
                            maxRadius: 300,
                            color: 'rgba(245, 158, 11, 0.4)',
                            life: 40
                        });
                    }, i * 50);
                }
            }

            createCrippleEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Dark red slash mark
                this.visualEffects.push({
                    type: 'cripple-slash',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    angle: -Math.PI / 3,
                    length: 0,
                    maxLength: 70,
                    color: 'rgba(127, 29, 29, 0.9)',
                    width: 6,
                    life: 25
                });
                
                // Debuff aura
                this.visualEffects.push({
                    type: 'debuff',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 25,
                    color: 'rgba(127, 29, 29, 0.3)',
                    life: 300 // 5 seconds
                });
            }

            createShadowStepEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Shadow clone afterimages
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'afterimage',
                            x: pos.x + this.offsetX + (Math.random() - 0.5) * 40,
                            y: pos.y + this.offsetY + (Math.random() - 0.5) * 40,
                            alpha: 0.6,
                            color: 'rgba(0, 0, 0, 0.6)',
                            life: 20
                        });
                    }, i * 100);
                }
                
                // Shadow veil
                this.visualEffects.push({
                    type: 'shadow-veil',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 35,
                    color: 'rgba(0, 0, 0, 0.5)',
                    life: 240 // 4 seconds
                });
            }

            createToxicCascadeEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Poison cloud
                this.visualEffects.push({
                    type: 'poison-cloud',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 20,
                    maxRadius: 50,
                    color: 'rgba(16, 185, 129, 0.4)',
                    life: 600 // 10 seconds
                });
                
                // Poison bubbles
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'poison-bubble',
                            x: pos.x + this.offsetX + (Math.random() - 0.5) * 30,
                            y: pos.y + this.offsetY,
                            vy: -2,
                            size: 4,
                            color: 'rgba(16, 185, 129, 0.7)',
                            life: 40
                        });
                    }, i * 150);
                }
            }
            createHealEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Create ascending green sparkles
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const offsetX = (Math.random() - 0.5) * 30;
                        this.visualEffects.push({
                            type: 'sparkle',
                            x: pos.x + this.offsetX + offsetX,
                            y: pos.y + this.offsetY + 10,
                            vy: -2,
                            vx: offsetX * 0.02,
                            color: 'rgba(16, 185, 129, 0.8)',
                            size: 6,
                            life: 40
                        });
                    }, i * 50);
                }
                
                // Add a gentle green glow
                this.visualEffects.push({
                    type: 'glow',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 20,
                    maxRadius: 60,
                    color: 'rgba(16, 185, 129, 0.3)',
                    life: 30
                });
            }
            
            createMultiShotEffect(casterSprite, targets) {
                if (!casterSprite) return;
                const startPos = ISO.toScreen(casterSprite.gridX, casterSprite.gridY);
                
                // Fire 3 arrows at different targets with stagger
                const arrowTargets = targets.slice(0, 3);
                arrowTargets.forEach((target, index) => {
                    if (!target.sprite) return;
                    const endPos = ISO.toScreen(target.sprite.gridX, target.sprite.gridY);
                    
                    // Stagger arrows slightly
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'arrow-projectile',
                            x: startPos.x + this.offsetX,
                            y: startPos.y + this.offsetY - 20,
                            targetX: endPos.x + this.offsetX,
                            targetY: endPos.y + this.offsetY,
                            speed: 12, // Arrows are fast!
                            angle: 0,
                            color: 'rgba(132, 204, 22, 0.9)', // Green arrow
                            size: 8,
                            trail: [],
                            life: 60
                        });
                    }, index * 100); // 100ms between arrows
                });
                
                // Bow flash effect
                this.visualEffects.push({
                    type: 'glow',
                    x: startPos.x + this.offsetX,
                    y: startPos.y + this.offsetY - 20,
                    radius: 15,
                    maxRadius: 35,
                    color: 'rgba(132, 204, 22, 0.4)',
                    life: 15
                });
            }
            
            createDivineShieldEffect(casterSprite) {
                if (!casterSprite) return;
                const pos = ISO.toScreen(casterSprite.gridX, casterSprite.gridY);
                
                // Holy light pillar from above
                this.visualEffects.push({
                    type: 'holy-pillar',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY - 100,
                    targetY: pos.y + this.offsetY,
                    height: 0,
                    maxHeight: 100,
                    color: 'rgba(251, 191, 36, 0.6)',
                    width: 40,
                    life: 20
                });
                
                // Golden shield dome for ALL party members
                if (this.party) {
                    this.party.forEach(member => {
                        if (member.sprite && member.isAlive) {
                            const memberPos = ISO.toScreen(member.sprite.gridX, member.sprite.gridY);
                            
                            // Shield dome
                            this.visualEffects.push({
                                type: 'dome',
                                x: memberPos.x + this.offsetX,
                                y: memberPos.y + this.offsetY,
                                radius: 20,
                                maxRadius: 45,
                                color: 'rgba(251, 191, 36, 0.35)',
                                life: 240 // 4 seconds
                            });
                            
                            // Holy sparkles
                            for (let i = 0; i < 6; i++) {
                                setTimeout(() => {
                                    const angle = (Math.PI * 2 * i) / 6;
                                    this.visualEffects.push({
                                        type: 'sparkle',
                                        x: memberPos.x + this.offsetX + Math.cos(angle) * 30,
                                        y: memberPos.y + this.offsetY + Math.sin(angle) * 20,
                                        vy: -1.5,
                                        vx: 0,
                                        color: 'rgba(254, 243, 199, 0.9)',
                                        size: 5,
                                        life: 30
                                    });
                                }, i * 80);
                            }
                        }
                    });
                }
                
                // Radiant burst from caster
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i) / 12;
                    this.visualEffects.push({
                        type: 'spark',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        vx: Math.cos(angle) * 4,
                        vy: Math.sin(angle) * 4,
                        color: 'rgba(251, 191, 36, 0.8)',
                        size: 4,
                        life: 25
                    });
                }
            }
            
            // ARCHER KEYSTONE VISUAL EFFECTS
            createPerfectShotEffect(casterSprite, targetSprite) {
                if (!casterSprite || !targetSprite) return;
                const startPos = ISO.toScreen(casterSprite.gridX, casterSprite.gridY);
                const endPos = ISO.toScreen(targetSprite.gridX, targetSprite.gridY);
                
                // Golden arrow trail
                this.visualEffects.push({
                    type: 'line',
                    x: startPos.x + this.offsetX,
                    y: startPos.y + this.offsetY - 10,
                    targetX: endPos.x + this.offsetX,
                    targetY: endPos.y + this.offsetY - 10,
                    color: 'rgba(251, 191, 36, 0.9)',
                    width: 4,
                    life: 15
                });
                
                // Impact sparkles
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    this.visualEffects.push({
                        type: 'spark',
                        x: endPos.x + this.offsetX,
                        y: endPos.y + this.offsetY - 10,
                        vx: Math.cos(angle) * 3,
                        vy: Math.sin(angle) * 3,
                        color: 'rgba(251, 191, 36, 0.9)',
                        size: 4,
                        life: 20
                    });
                }
            }
            
            createArrowEffect(casterSprite, targetSprite) {
                if (!casterSprite || !targetSprite) return;
                const startPos = ISO.toScreen(casterSprite.gridX, casterSprite.gridY);
                const endPos = ISO.toScreen(targetSprite.gridX, targetSprite.gridY);
                
                // Arrow trail
                this.visualEffects.push({
                    type: 'line',
                    x: startPos.x + this.offsetX,
                    y: startPos.y + this.offsetY - 10,
                    targetX: endPos.x + this.offsetX,
                    targetY: endPos.y + this.offsetY - 10,
                    color: 'rgba(132, 204, 22, 0.7)',
                    width: 2,
                    life: 10
                });
            }
            
            createMarkEffect(sprite) {
                if (!sprite) return;
                const pos = ISO.toScreen(sprite.gridX, sprite.gridY);
                
                // Red target marker
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'ring',
                            x: pos.x + this.offsetX,
                            y: pos.y + this.offsetY - 15,
                            radius: 5,
                            maxRadius: 35,
                            color: 'rgba(239, 68, 68, 0.6)',
                            width: 2,
                            life: 30
                        });
                    }, i * 100);
                }
            }
            
            // PALADIN KEYSTONE VISUAL EFFECTS
            createDivineWrathEffect(casterSprite) {
                if (!casterSprite) return;
                const pos = ISO.toScreen(casterSprite.gridX, casterSprite.gridY);
                
                // Holy explosion from caster
                this.visualEffects.push({
                    type: 'ring',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 10,
                    maxRadius: 120,
                    color: 'rgba(251, 191, 36, 0.5)',
                    width: 3,
                    life: 25
                });
                
                // Divine sparks - REDUCED for performance
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    this.visualEffects.push({
                        type: 'spark',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY - 20,
                        vx: Math.cos(angle) * 4,
                        vy: Math.sin(angle) * 4 - 2,
                        color: 'rgba(254, 243, 199, 0.9)',
                        size: 5,
                        life: 30
                    });
                }
            }
            
            createSacredBarrierEffect(casterSprite) {
                if (!casterSprite) return;
                
                // Golden shields for all party members
                if (this.party) {
                    this.party.forEach(member => {
                        if (member.sprite && member.isAlive) {
                            const memberPos = ISO.toScreen(member.sprite.gridX, member.sprite.gridY);
                            
                            // Shield barrier
                            this.visualEffects.push({
                                type: 'dome',
                                x: memberPos.x + this.offsetX,
                                y: memberPos.y + this.offsetY,
                                radius: 15,
                                maxRadius: 40,
                                color: 'rgba(59, 130, 246, 0.4)',
                                life: 360 // 6 seconds
                            });
                        }
                    });
                }
            }
            
            createHolyFireEffect(casterSprite) {
                if (!casterSprite) return;
                const pos = ISO.toScreen(casterSprite.gridX, casterSprite.gridY);
                
                // Fire wave expanding from caster
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        this.visualEffects.push({
                            type: 'ring',
                            x: pos.x + this.offsetX,
                            y: pos.y + this.offsetY,
                            radius: 20 + i * 15,
                            maxRadius: 100 + i * 15,
                            color: 'rgba(249, 115, 22, 0.5)',
                            width: 4,
                            life: 30
                        });
                    }, i * 100);
                }
                
                // Fire sparks
                for (let i = 0; i < 20; i++) {
                    const angle = (Math.PI * 2 * i) / 20;
                    this.visualEffects.push({
                        type: 'spark',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        vx: Math.cos(angle) * 3,
                        vy: Math.sin(angle) * 3 - 1,
                        color: 'rgba(251, 146, 60, 0.9)',
                        size: 4,
                        life: 25
                    });
                }
            }
            
            updateVisualEffects() {
                if (!this.visualEffects) return;
                
                // Cap effects for performance
                // Cap effects efficiently (in-place removal instead of slice)
                if (this.visualEffects.length > 15) {
                    this.visualEffects.splice(0, this.visualEffects.length - 15);
                }
                
                for (let i = this.visualEffects.length - 1; i >= 0; i--) {
                    const effect = this.visualEffects[i];
                    effect.life--;
                    
                    // Update based on type
                    switch(effect.type) {
                        case 'ring':
                            effect.radius += (effect.maxRadius - effect.radius) * 0.15;
                            break;
                        case 'line':
                            effect.length += (effect.maxLength - effect.length) * 0.2;
                            break;
                        case 'slash':
                            effect.length += (effect.maxLength - effect.length) * 0.3;
                            break;
                        case 'projectile': {
                            const dx = effect.targetX - effect.x;
                            const dy = effect.targetY - effect.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > 5) {
                                // Store trail positions
                                effect.trail.push({x: effect.x, y: effect.y, life: 10});
                                if (effect.trail.length > 5) effect.trail.shift();
                                
                                effect.x += (dx / dist) * effect.speed;
                                effect.y += (dy / dist) * effect.speed;
                            } else {
                                // Hit target - create explosion
                                for (let j = 0; j < 6; j++) {
                                    const angle = (Math.PI * 2 * j) / 6;
                                    this.visualEffects.push({
                                        type: 'spark',
                                        x: effect.x,
                                        y: effect.y,
                                        vx: Math.cos(angle) * 3,
                                        vy: Math.sin(angle) * 3,
                                        color: 'rgba(255, 100, 0, 0.8)',
                                        size: 2,
                                        life: 15
                                    });
                                }
                                effect.life = 0;
                            }
                            break;
                        }
                        case 'arrow-projectile': {
                            const dx = effect.targetX - effect.x;
                            const dy = effect.targetY - effect.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > 5) {
                                // Store trail positions
                                effect.trail.push({x: effect.x, y: effect.y, life: 10});
                                if (effect.trail.length > 8) effect.trail.shift();
                                
                                effect.x += (dx / dist) * effect.speed;
                                effect.y += (dy / dist) * effect.speed;
                            } else {
                                // Hit target - create green impact
                                for (let j = 0; j < 4; j++) {
                                    const angle = (Math.PI * 2 * j) / 4;
                                    this.visualEffects.push({
                                        type: 'spark',
                                        x: effect.x,
                                        y: effect.y,
                                        vx: Math.cos(angle) * 2,
                                        vy: Math.sin(angle) * 2,
                                        color: 'rgba(132, 204, 22, 0.8)',
                                        size: 3,
                                        life: 12
                                    });
                                }
                                effect.life = 0;
                            }
                            break;
                        }
                        case 'sparkle':
                            effect.y += effect.vy;
                            effect.x += effect.vx;
                            effect.vy *= 0.98;
                            effect.size *= 0.97;
                            break;
                        case 'spark':
                            effect.x += effect.vx;
                            effect.y += effect.vy;
                            effect.vx *= 0.95;
                            effect.vy *= 0.95;
                            effect.size *= 0.95;
                            break;
                        case 'dome':
                        case 'aura':
                        case 'void-portal':
                        case 'freeze':
                        case 'shadow-veil':
                        case 'poison-cloud':
                            effect.radius += (effect.maxRadius - effect.radius) * 0.1;
                            break;
                        case 'rotating-ring':
                            effect.angle += 3; // Rotate
                            break;
                        case 'shockwave':
                            effect.radius += (effect.maxRadius - effect.radius) * 0.25;
                            break;
                        case 'spike':
                            effect.height += (effect.maxHeight - effect.height) * 0.35;
                            break;
                        case 'holy-pillar':
                            effect.height += (effect.maxHeight - effect.height) * 0.4;
                            break;
                        case 'blood-drop':
                        case 'ice-shard':
                        case 'poison-bubble':
                            effect.x += effect.vx || 0;
                            effect.y += effect.vy || 0;
                            if (effect.vy) effect.vy += 0.3; // Gravity
                            if (effect.vx) effect.vx *= 0.95; // Friction
                            effect.size *= 0.97;
                            break;
                        case 'tendril':
                        case 'cripple-slash':
                            effect.length += (effect.maxLength - effect.length) * 0.3;
                            break;
                        case 'time-ripple':
                            effect.radius += (effect.maxRadius - effect.radius) * 0.2;
                            break;
                        case 'afterimage':
                            effect.alpha *= 0.9;
                            break;
                        case 'debuff':
                            // Just persist
                            break;
                        case 'ice-orbit':
                            effect.angle += 0.1;
                            effect.x = effect.x + Math.cos(effect.angle) * 0.5;
                            effect.y = effect.y + Math.sin(effect.angle) * 0.5;
                            break;
                        case 'lightning-bolt':
                            // Just display briefly
                            break;
                    }
                    
                    if (effect.life <= 0) {
                        this.visualEffects.splice(i, 1);
                    }
                }
            }
            drawRuneTrialPillar(ctx) {
                if (!this.runeTrialPillar || !this.currentDungeon === 'runetrial') return;
                
                const pillar = this.runeTrialPillar;
                const pos = ISO.toScreen(pillar.gridX, pillar.gridY);
                const x = pos.x + this.offsetX;
                const y = pos.y + this.offsetY;
                
                // Draw pillar base (larger circle)
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(x, y, 25, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw pillar body (vertical rectangle in isometric)
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(x - 15, y - 40, 30, 40);
                
                // Draw pillar top (smaller circle)
                ctx.fillStyle = '#60a5fa';
                ctx.beginPath();
                ctx.arc(x, y - 40, 18, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw charging effect
                if (this.runeTrialPillarCharging) {
                    const chargePercent = this.runeTrialPillarCharge / this.runeTrialPillarMaxCharge;
                    
                    // Pulsing glow
                    const pulseAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;
                    const gradient = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, 50 * chargePercent);
                    gradient.addColorStop(0, `rgba(59, 130, 246, ${pulseAlpha})`);
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(x, y - 20, 50 * chargePercent, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Floating particles
                    if (Math.random() < 0.3) {
                        this.visualEffects.push({
                            type: 'sparkle',
                            x: x + (Math.random() - 0.5) * 30,
                            y: y + 10,
                            vy: -1,
                            vx: (Math.random() - 0.5) * 0.5,
                            color: 'rgba(59, 130, 246, 0.8)',
                            size: 4,
                            life: 40
                        });
                    }
                }
                
                // Draw "Activate" text above pillar
                if (this.runeTrialPillarCharging) {
                    ctx.font = 'bold 14px Orbitron';
                    ctx.fillStyle = '#3b82f6';
                    ctx.textAlign = 'center';
                    ctx.fillText('⚡ PILLAR ⚡', x, y - 55);
                }
            }
			drawRuneTrialPillar(ctx) {
                if (!this.runeTrialPillar || this.currentDungeon !== 'runetrial') return;
                
                // Initialize visual effects array if it doesn't exist
                if (!this.visualEffects) this.visualEffects = [];
                
                const pillar = this.runeTrialPillar;
                const pos = ISO.toScreen(pillar.gridX, pillar.gridY);
                const x = pos.x + this.offsetX;
                const y = pos.y + this.offsetY;
                
                const chargePercent = this.runeTrialPillarCharging ? 
                    this.runeTrialPillarCharge / this.runeTrialPillarMaxCharge : 1;
                
                // Draw base platform (isometric diamond)
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y - 5);
                ctx.lineTo(x + 20, y + 5);
                ctx.lineTo(x, y + 15);
                ctx.lineTo(x - 20, y + 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Draw pillar shaft (isometric style)
                const pillarHeight = 50;
                ctx.fillStyle = '#475569';
                ctx.beginPath();
                ctx.moveTo(x - 8, y - 5);
                ctx.lineTo(x + 8, y - 5);
                ctx.lineTo(x + 8, y - pillarHeight);
                ctx.lineTo(x - 8, y - pillarHeight);
                ctx.closePath();
                ctx.fill();
                
                // Right side shading
                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.moveTo(x + 8, y - 5);
                ctx.lineTo(x + 12, y - 2);
                ctx.lineTo(x + 12, y - pillarHeight + 3);
                ctx.lineTo(x + 8, y - pillarHeight);
                ctx.closePath();
                ctx.fill();
                
                // Glowing crystal on top
                const crystalPulse = 0.8 + Math.sin(Date.now() / 300) * 0.2;
                const crystalGlow = ctx.createRadialGradient(x, y - pillarHeight - 10, 0, x, y - pillarHeight - 10, 25);
                crystalGlow.addColorStop(0, `rgba(59, 130, 246, ${crystalPulse * 0.8})`);
                crystalGlow.addColorStop(0.5, `rgba(59, 130, 246, ${crystalPulse * 0.4})`);
                crystalGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
                ctx.fillStyle = crystalGlow;
                ctx.beginPath();
                ctx.arc(x, y - pillarHeight - 10, 25, 0, Math.PI * 2);
                ctx.fill();
                
                // Crystal itself (diamond shape)
                ctx.fillStyle = `rgba(59, 130, 246, ${0.6 + crystalPulse * 0.4})`;
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y - pillarHeight - 20);
                ctx.lineTo(x + 10, y - pillarHeight - 10);
                ctx.lineTo(x, y - pillarHeight);
                ctx.lineTo(x - 10, y - pillarHeight - 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Charging effect - energy rings
                if (this.runeTrialPillarCharging && chargePercent > 0) {
                    for (let i = 0; i < 3; i++) {
                        const ringOffset = ((Date.now() / 800) + i * 0.33) % 1;
                        const ringY = y - 10 - (ringOffset * pillarHeight);
                        const ringAlpha = (1 - ringOffset) * 0.6;
                        
                        ctx.strokeStyle = `rgba(59, 130, 246, ${ringAlpha})`;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.ellipse(x, ringY, 15, 8, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    
                    // Floating runes
                    if (Math.random() < 0.1) {
                        this.visualEffects.push({
                            type: 'sparkle',
                            x: x + (Math.random() - 0.5) * 40,
                            y: y + 5,
                            vy: -2,
                            vx: (Math.random() - 0.5) * 0.3,
                            color: 'rgba(59, 130, 246, 0.9)',
                            size: 5,
                            life: 50
                        });
                    }
                }
                
                // Charge percentage text above crystal
                if (this.runeTrialPillarCharging) {
                    const percent = Math.floor(chargePercent * 100);
                    ctx.font = 'bold 16px Orbitron';
                    ctx.fillStyle = '#60a5fa';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 3;
                    ctx.textAlign = 'center';
                    ctx.strokeText(`${percent}%`, x, y - pillarHeight - 30);
                    ctx.fillText(`${percent}%`, x, y - pillarHeight - 30);
                }
            }
            drawVisualEffects(ctx) {
                if (!this.visualEffects || this.visualEffects.length === 0) return;
                
                this.visualEffects.forEach(effect => {
                    ctx.save();
                    const alpha = effect.life / 30;
                    
                    switch(effect.type) {
                        case 'ring':
                            ctx.strokeStyle = effect.color.replace('0.6', alpha * 0.6);
                            ctx.lineWidth = effect.lineWidth;
                            ctx.beginPath();
                            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                            ctx.stroke();
                            break;
                        case 'line':
                            ctx.strokeStyle = effect.color.replace('0.8', alpha * 0.8);
                            ctx.lineWidth = effect.width;
                            ctx.beginPath();
                            ctx.moveTo(effect.x, effect.y);
                            ctx.lineTo(
                                effect.x + Math.cos(effect.angle) * effect.length,
                                effect.y + Math.sin(effect.angle) * effect.length
                            );
                            ctx.stroke();
                            break;
                        case 'slash':
                            const gradient = ctx.createLinearGradient(
                                effect.x - Math.cos(effect.angle) * effect.length / 2,
                                effect.y - Math.sin(effect.angle) * effect.length / 2,
                                effect.x + Math.cos(effect.angle) * effect.length / 2,
                                effect.y + Math.sin(effect.angle) * effect.length / 2
                            );
                            gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
                            gradient.addColorStop(0.5, effect.color.replace('0.9', alpha * 0.9));
                            gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
                            ctx.strokeStyle = gradient;
                            ctx.lineWidth = effect.width;
                            ctx.beginPath();
                            ctx.moveTo(
                                effect.x - Math.cos(effect.angle) * effect.length / 2,
                                effect.y - Math.sin(effect.angle) * effect.length / 2
                            );
                            ctx.lineTo(
                                effect.x + Math.cos(effect.angle) * effect.length / 2,
                                effect.y + Math.sin(effect.angle) * effect.length / 2
                            );
                            ctx.stroke();
                            break;
                        case 'projectile': {
                            // Draw trail (use effect color)
                            effect.trail.forEach((pos, i) => {
                                ctx.fillStyle = effect.color.replace(/[\d.]+\)$/, `${i * 0.1 * alpha})`);
                                ctx.beginPath();
                                ctx.arc(pos.x, pos.y, effect.size * (i / 5), 0, Math.PI * 2);
                                ctx.fill();
                            });
                            // Draw projectile with its specified color
                            ctx.fillStyle = effect.color;
                            ctx.shadowColor = effect.color;
                            ctx.beginPath();
                            ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                        }
                        case 'arrow-projectile': {
                            // Calculate arrow angle based on direction
                            const dx = effect.targetX - effect.x;
                            const dy = effect.targetY - effect.y;
                            effect.angle = Math.atan2(dy, dx);
                            
                            // Draw arrow trail
                            effect.trail.forEach((pos, i) => {
                                ctx.fillStyle = effect.color.replace(/[\d.]+\)$/, `${i * 0.1 * alpha})`);
                                ctx.beginPath();
                                ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                                ctx.fill();
                            });
                            
                            // Draw arrow
                            ctx.save();
                            ctx.translate(effect.x, effect.y);
                            ctx.rotate(effect.angle);
                            
                            // Arrow shaft
                            ctx.fillStyle = effect.color;
                            ctx.fillRect(-10, -1, 20, 2);
                            
                            // Arrow head
                            ctx.beginPath();
                            ctx.moveTo(10, 0);
                            ctx.lineTo(5, -3);
                            ctx.lineTo(5, 3);
                            ctx.closePath();
                            ctx.fill();
                            
                            // Fletching
                            ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
                            ctx.beginPath();
                            ctx.moveTo(-10, 0);
                            ctx.lineTo(-13, -3);
                            ctx.lineTo(-13, 3);
                            ctx.closePath();
                            ctx.fill();
                            
                            ctx.restore();
                            break;
                        }
                        case 'sparkle':
                        case 'spark':
                            ctx.fillStyle = effect.color.replace('0.8', alpha * 0.8);
                            ctx.beginPath();
                            ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                        case 'glow':
                            if (isFinite(effect.radius) && effect.radius > 0) {
                                const glowGradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius);
                                glowGradient.addColorStop(0, effect.color.replace('0.3', alpha * 0.3));
                                glowGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                                ctx.fillStyle = glowGradient;
                                ctx.beginPath();
                                ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            break;
							case 'dome':
                        case 'aura':
                        case 'void-portal':
                        case 'freeze':
                        case 'shadow-veil':
                        case 'poison-cloud':
                            if (isFinite(effect.radius) && effect.radius > 0) {
                                const auraGradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius);
                                auraGradient.addColorStop(0, effect.color);
                                auraGradient.addColorStop(1, effect.color.replace(/[\d.]+\)/, '0)'));
                                ctx.fillStyle = auraGradient;
                                ctx.beginPath();
                                ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            break;
                        case 'rotating-ring':
                            ctx.save();
                            ctx.translate(effect.x, effect.y);
                            ctx.rotate(effect.angle * Math.PI / 180);
                            ctx.strokeStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.6 + ')');
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(0, 0, effect.radius, 0, Math.PI * 2);
                            ctx.stroke();
                            // Add some gaps for visual interest
                            ctx.strokeStyle = 'rgba(0,0,0,1)';
                            ctx.lineWidth = 5;
                            for (let i = 0; i < 4; i++) {
                                ctx.beginPath();
                                ctx.arc(0, 0, effect.radius, i * Math.PI/2 - 0.1, i * Math.PI/2 + 0.1);
                                ctx.stroke();
                            }
                            ctx.restore();
                            break;
                        case 'shockwave':
                            ctx.strokeStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.8 + ')');
                            ctx.lineWidth = effect.lineWidth * (1 - effect.radius / effect.maxRadius);
                            ctx.beginPath();
                            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                            ctx.stroke();
                            break;
                        case 'spike':
                            ctx.fillStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.9 + ')');
                            ctx.beginPath();
                            ctx.moveTo(effect.x - 5, effect.y);
                            ctx.lineTo(effect.x, effect.y - effect.height);
                            ctx.lineTo(effect.x + 5, effect.y);
                            ctx.closePath();
                            ctx.fill();
                            break;
                        case 'holy-pillar':
                            // Divine light pillar from above
                            const pillarGradient = ctx.createLinearGradient(
                                effect.x, 
                                effect.y, 
                                effect.x, 
                                effect.targetY
                            );
                            pillarGradient.addColorStop(0, effect.color);
                            pillarGradient.addColorStop(1, effect.color.replace(/[\d.]+\)/, '0)'));
                            
                            ctx.fillStyle = pillarGradient;
                            ctx.fillRect(
                                effect.x - effect.width / 2,
                                effect.y,
                                effect.width,
                                effect.height
                            );
                            
                            // Bright core
                            ctx.fillStyle = 'rgba(254, 243, 199, 0.8)';
                            ctx.fillRect(
                                effect.x - 4,
                                effect.y,
                                8,
                                effect.height
                            );
                            break;
                        case 'blood-drop':
                        case 'ice-shard':
                        case 'poison-bubble':
                            ctx.fillStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.8 + ')');
                            ctx.beginPath();
                            ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                        case 'tendril':
                        case 'cripple-slash':
                            const tendrilGradient = ctx.createLinearGradient(
                                effect.x,
                                effect.y,
                                effect.x + Math.cos(effect.angle) * effect.length,
                                effect.y + Math.sin(effect.angle) * effect.length
                            );
                            tendrilGradient.addColorStop(0, effect.color);
                            tendrilGradient.addColorStop(1, effect.color.replace(/[\d.]+\)/, '0)'));
                            ctx.strokeStyle = tendrilGradient;
                            ctx.lineWidth = effect.width || 3;
                            ctx.beginPath();
                            ctx.moveTo(effect.x, effect.y);
                            ctx.lineTo(
                                effect.x + Math.cos(effect.angle) * effect.length,
                                effect.y + Math.sin(effect.angle) * effect.length
                            );
                            ctx.stroke();
                            break;
                        case 'time-ripple':
                            ctx.strokeStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.5 + ')');
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(effect.x, effect.y, effect.radius, effect.angle, effect.angle + Math.PI/3);
                            ctx.stroke();
                            break;
                        case 'afterimage':
                            ctx.fillStyle = effect.color.replace(/[\d.]+\)/, effect.alpha + ')');
                            ctx.fillRect(effect.x - 10, effect.y - 15, 20, 30);
                            break;
                        case 'dagger-stab':
    // Animate the stab
    const stabProgress = 1 - (effect.life / 10);
    
    if (stabProgress < 0.5) {
        // Stab forward
        effect.currentX = effect.startX + (effect.endX - effect.startX) * (stabProgress * 2);
    } else {
        // Pull back
        effect.currentX = effect.endX - (effect.endX - effect.startX) * ((stabProgress - 0.5) * 2);
    }
    
    const stabEndX = effect.x + effect.currentX;
    const stabEndY = effect.y + effect.offsetY;
    
    // Draw dagger line
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(stabEndX, stabEndY);
    ctx.stroke();
    
    // Draw dagger tip (triangle)
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.moveTo(stabEndX, stabEndY);
    ctx.lineTo(stabEndX + 4, stabEndY - 2);
    ctx.lineTo(stabEndX + 4, stabEndY + 2);
    ctx.closePath();
    ctx.fill();
    break;
case 'arm-swing':
                            // Animate the arm swing
                            const progress = 1 - (effect.life / (effect.startAngle === -45 ? 12 : 15));
                            effect.currentAngle = effect.startAngle + (effect.endAngle - effect.startAngle) * progress;
                            
                            const radians = (effect.currentAngle * Math.PI) / 180;
                            const armEndX = effect.x + Math.cos(radians) * effect.armLength;
                            const armEndY = effect.y - 10 + Math.sin(radians) * effect.armLength;
                            
                            // Draw arm
                            ctx.strokeStyle = effect.color;
                            ctx.lineWidth = 3;
                            ctx.lineCap = 'round';
                            ctx.beginPath();
                            ctx.moveTo(effect.x, effect.y - 10);
                            ctx.lineTo(armEndX, armEndY);
                            ctx.stroke();
                            
                            // Draw weapon at end
                            ctx.fillStyle = effect.color;
                            ctx.fillRect(armEndX - 2, armEndY - 2, 4, 4);
                            break;
                        case 'debuff':
                            ctx.strokeStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.5 + ')');
                            ctx.lineWidth = 2;
                            ctx.setLineDash([5, 5]);
                            ctx.beginPath();
                            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            break;
                        case 'ice-orbit':
                            ctx.fillStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.9 + ')');
                            const orbitX = effect.x + Math.cos(effect.angle) * effect.radius;
                            const orbitY = effect.y + Math.sin(effect.angle) * effect.radius;
                            ctx.beginPath();
                            ctx.arc(orbitX, orbitY, effect.size, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                        case 'lightning-bolt':
                            ctx.strokeStyle = effect.color.replace(/[\d.]+\)/, alpha * 0.9 + ')');
                            ctx.lineWidth = effect.width;
                            ctx.shadowColor = effect.color;
                            ctx.beginPath();
                            ctx.moveTo(effect.x, effect.y);
                            // Jagged lightning path
                            const dx = effect.targetX - effect.x;
                            const dy = effect.targetY - effect.y;
                            const segments = 5;
                            for (let i = 1; i < segments; i++) {
                                const t = i / segments;
                                const jitter = (Math.random() - 0.5) * 20;
                                ctx.lineTo(
                                    effect.x + dx * t + jitter,
                                    effect.y + dy * t + jitter
                                );
                            }
                            ctx.lineTo(effect.targetX, effect.targetY);
                            ctx.stroke();
                            break;
                    }
                    
                    ctx.restore();
                });


            }


            battleTick() {
    // REMOVED OLD CHECK - this was blocking Rune Trial pillar phase!
    // The old code had: if (this.paused || !this.inBattle) return;
    // This prevented pillar charging from working!
    
    if (this.paused) return; // Only check paused, not inBattle

    const aliveParty = this.party.filter(m => m.isAlive);
    const aliveEnemies = this.enemies.filter(e => e.isAlive);

    // Handle Rune Trial pillar charging phase
    if (this.currentDungeon === 'runetrial' && this.runeTrialPillarCharging) {
        // Check if any party member is near pillar
        const pillar = this.runeTrialPillar;
        let anyoneNearPillar = false;
        
        this.party.forEach(member => {
            if (!member.isAlive || !member.sprite) return;
            
           const dx = pillar.gridX - member.sprite.gridX;
                    const dy = pillar.gridY - member.sprite.gridY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Automatically move all party members towards pillar
            if (distance > 2) {
                // Move towards pillar
                const moveSpeed = 0.08;
                member.sprite.gridX += (dx / distance) * moveSpeed;
                member.sprite.gridY += (dy / distance) * moveSpeed;
            } else {
                // Close enough to charge
                anyoneNearPillar = true;
            }
        });
        
        // Only charge if someone is near
        if (anyoneNearPillar) {
            this.runeTrialPillarCharge++;
            
            // Charging visual effect
            if (this.runeTrialPillarCharge % 10 === 0) {
                const pos = ISO.toScreen(pillar.gridX, pillar.gridY);
                this.visualEffects.push({
                    type: 'ring',
                    x: pos.x + this.offsetX,
                    y: pos.y + this.offsetY,
                    radius: 20,
                    maxRadius: 50,
                    color: 'rgba(59, 130, 246, 0.6)',
                    lineWidth: 3,
                    life: 20
                });
            }
        }
        
        // Update pillar UI
        this.updateRuneTrialPillarUI();
        
        // When pillar fully charged, spawn boss
        if (this.runeTrialPillarCharge >= this.runeTrialPillarMaxCharge) {
            this.runeTrialPillarCharging = false;
            this.runeTrialPillar = null; // Remove pillar
            
            // Spawn the boss
            if (this.runeTrialBoss) {
                this.enemies.push(this.runeTrialBoss);
                this.addLog(`${this.runeTrialBoss.name} awakens!`, 'damage');
                
                // Boss spawn effect
                const pos = ISO.toScreen(this.runeTrialBoss.sprite.gridX, this.runeTrialBoss.sprite.gridY);
                for (let i = 0; i < 24; i++) {
                    const angle = (Math.PI * 2 * i) / 24;
                    this.visualEffects.push({
                        type: 'spark',
                        x: pos.x + this.offsetX,
                        y: pos.y + this.offsetY,
                        vx: Math.cos(angle) * 10,
                        vy: Math.sin(angle) * 10,
                        color: 'rgba(59, 130, 246, 0.9)',
                        size: 6,
                        life: 40
                    });
                }
                
                // START THE BATTLE!
                this.inBattle = true;
                this.battleTimer = 0;
                this.battleStartTime = Date.now();
                
                // Also initialize floor stats start time if not set
                if (!this.floorStats.startTime) {
                    this.floorStats.startTime = Date.now();
                }
            }
            
            // Hide pillar UI
            const pillarUI = document.getElementById('rune-trial-pillar-ui');
            if (pillarUI) pillarUI.remove();
        }
        
        // DON'T return here - we need to process bomber spawning!
    }
    
    // Handle Rune Trial bomber spawning - ONLY while boss is alive
    if (this.currentDungeon === 'runetrial') {
        const boss = this.enemies.find(e => e.isRuneTrialBoss && e.isAlive);
        
        // Only spawn bombers if boss is alive OR pillar is still charging
        if (boss || this.runeTrialPillarCharging) {
            // Check for enrage at 25% boss HP (only when boss exists)
            if (boss && !this.runeTrialBossEnraged && boss.hp <= boss.maxHp * 0.25) {
                this.runeTrialBossEnraged = true;
                this.runeTrialBomberSpawnRate = 60; // Double spawn rate (1 per second)
                this.showBossEnrageEffect(boss);
                this.addLog(`${boss.name} ENRAGES! Bombers spawn 2x faster!`, 'damage');
            }
            
            // Only spawn bombers after pillar is 10% charged
            const pillarPercent = this.runeTrialPillarCharging ? 
                (this.runeTrialPillarCharge / this.runeTrialPillarMaxCharge) : 1;
            
            if (pillarPercent >= 0.1) {
                // Spawn bombers
                this.runeTrialBomberSpawnTimer++;
                if (this.runeTrialBomberSpawnTimer >= this.runeTrialBomberSpawnRate) {
                    this.runeTrialBomberSpawnTimer = 0;
                    this.spawnRuneTrialBomber();
                }
            }
        }
        
        // Update all bombers
        this.enemies.filter(e => e.isBomber && e.isAlive).forEach(bomber => {
            this.updateBomber(bomber);
        });
    }

    if (aliveParty.length === 0) {
        // In endless dungeon, party defeat ends the run
        if (this.currentDungeon === 'endlessblessings') {
            this.showEndlessBlessingsResults();
        }
        this.endBattle(false);
        return;
    }

    // Don't end battle if no enemies during Rune Trial (pillar charging or bombers only)
    if (aliveEnemies.length === 0) {
        // Special check for Divine Arena - never end, just keep spawning
        if (this.currentDungeon === 'endlessblessings') {
            // Don't end battle - enemies will keep spawning
            return;
        }
        // Special check for Rune Trial - don't end until boss is dead
        else if (this.currentDungeon === 'runetrial') {
            // Only end if pillar is done charging AND boss was spawned and died
            if (!this.runeTrialPillarCharging && this.runeTrialBoss && !this.runeTrialBoss.isAlive) {
                this.endBattle(true);
                return;
            }
            // Otherwise, continue - more bombers will spawn or boss hasn't spawned yet
        } else {
            this.endBattle(true);
            return;
        }
    }

                // Update all units independently based on their attack speed using real delta time
                
                [...this.party, ...this.enemies].forEach(unit => {
    if (!unit.isAlive || !unit.sprite) return;
                    
                    // Initialize attack timer if needed
                    if (!unit.attackTimer) unit.attackTimer = 0;
                    
                    // Increment attack timer based on attack speed (attacks per second)
                    const attackSpeed = unit.getTotalAttackSpeed ? unit.getTotalAttackSpeed() : unit.attackSpeed;
                    unit.attackTimer += attackSpeed * this.deltaTime * 100;
                    
// Update Tank taunt buff
if (unit.tauntTimer && unit.tauntTimer > 0) {
    unit.tauntTimer -= this.deltaTime * 60;
    if (unit.tauntTimer <= 0) {
        unit.tauntTimer = 0;
        unit.tauntActive = false;
    }
}

// Update Berserker's Pact buff
if (unit.berserkerTimer && unit.berserkerTimer > 0) {
    unit.berserkerTimer -= this.deltaTime * 60;
    if (unit.berserkerTimer <= 0) {
        unit.berserkerTimer = 0;
        unit.berserkerActive = false;
    }
}

// Update Warden's Aegis invulnerability
if (unit.invulnerableTimer && unit.invulnerableTimer > 0) {
    unit.invulnerableTimer -= this.deltaTime * 60;
    if (unit.invulnerableTimer <= 0) {
        unit.invulnerableTimer = 0;
        unit.invulnerable = false;
    }
}

// Update defense debuff (Assassin's Mark)
if (unit.defenseDebuffTimer && unit.defenseDebuffTimer > 0) {
    unit.defenseDebuffTimer -= this.deltaTime * 60;
    if (unit.defenseDebuffTimer <= 0) {
        unit.defenseDebuffTimer = 0;
        unit.defenseDebuff = 0;
    }
}

// Update attack debuff (Earthshaker's Resolve)
if (unit.attackDebuffTimer && unit.attackDebuffTimer > 0) {
    unit.attackDebuffTimer -= this.deltaTime * 60;
    if (unit.attackDebuffTimer <= 0) {
        unit.attackDebuffTimer = 0;
        unit.attackDebuff = 0;
    }
}

// Update Arrow Storm (Rapid Quiver)
if (unit.arrowStormActive && unit.arrowStormArrows > 0) {
    unit.arrowStormTimer = (unit.arrowStormTimer || 0) + 1;
    if (unit.arrowStormTimer >= unit.arrowStormInterval) {
        unit.arrowStormTimer = 0;
        unit.arrowStormArrows--;
        
        // Fire an arrow at a random enemy
        const aliveEnemies = this.enemies.filter(e => e.isAlive);
        if (aliveEnemies.length > 0) {
            const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const dealt = target.takeDamage(unit.arrowStormDamage);
            this.createFloatingText(target.sprite, `-${dealt}`, 'damage-text');
            this.floorStats.damageDealt += dealt;
            
            // Track character-specific damage for all dungeons
            if (this.characterStats && this.characterStats[unit.name]) {
                this.characterStats[unit.name].damageDealt += dealt;
            }
            
            this.createArrowEffect(unit.sprite, target.sprite);
        }
        
        if (unit.arrowStormArrows === 0) {
            unit.arrowStormActive = false;
        }
    }
}

// Update Marked for Death
if (unit.markedTimer && unit.markedTimer > 0) {
    unit.markedTimer -= this.deltaTime * 60;
    if (unit.markedTimer <= 0) {
        unit.markedTimer = 0;
        unit.markedBy = null;
        unit.markedDamageBonus = 0;
        unit.markedLifesteal = 0;
    }
}

// Update Sacred Barrier defense buff
if (unit.sacredBarrierTimer && unit.sacredBarrierTimer > 0) {
    unit.sacredBarrierTimer -= this.deltaTime * 60;
    if (unit.sacredBarrierTimer <= 0) {
        unit.sacredBarrierTimer = 0;
        unit.sacredBarrierDefense = 0;
    }
}

// Update Righteous Fury attack speed buff
if (unit.righteousFuryTimer && unit.righteousFuryTimer > 0) {
    unit.righteousFuryTimer -= this.deltaTime * 60;
    if (unit.righteousFuryTimer <= 0) {
        unit.righteousFuryTimer = 0;
        unit.righteousFuryAS = 0;
    }
}

// Update Shield - check if shield has expired using real time
if (unit.shieldAmount > 0 && unit.shieldEndTime) {
    const now = Date.now();
    if (now >= unit.shieldEndTime) {
        unit.shieldAmount = 0;
        unit.shieldEndTime = null;
    }
}

// Reduce cooldowns using real time (like regen) - only when NOT paused
if (!unit.lastCooldownTime) unit.lastCooldownTime = Date.now();
if (unit.cooldown > 0 && !this.paused) {
    const now = Date.now();
    const elapsed = (now - unit.lastCooldownTime) / 1000; // Convert to seconds
    unit.lastCooldownTime = now;
    
    const cdr = unit.getTotalCDR ? unit.getTotalCDR() : 0;
    const cooldownMultiplier = 1 + (cdr / 100); // Faster reduction with CDR
    unit.cooldown -= elapsed * cooldownMultiplier;
    if (unit.cooldown < 0) unit.cooldown = 0;
} else if (this.paused) {
    // Reset cooldown timer when paused to prevent incorrect elapsed time when unpausing
    unit.lastCooldownTime = Date.now();
}
                    
// HP/Mana regeneration - every 3 seconds (real time)
// Simple flat regen: stat value ÷ 2 = regen per 3 seconds
if (!this.lastRegenTime) this.lastRegenTime = Date.now();
const now = Date.now();
if (now - this.lastRegenTime >= 3000) {
    this.lastRegenTime = now;
    this.party.forEach(member => {
        if (member.isAlive) {
            const rawHpRegen = member.getTotalHpRegen();
            const rawManaRegen = member.getTotalManaRegen();
            
            // Simple formula: regen stat ÷ 2 = actual regen per 3 seconds
            const hpRegenAmount = Math.floor(rawHpRegen / 2);
            const manaRegenAmount = Math.floor(rawManaRegen / 2);
            
            const totalMaxMana = member.getTotalMaxMana();
            
            if (hpRegenAmount > 0) {
                member.heal(hpRegenAmount);
                
                // Track HP regen in stats
                if (this.characterStats && this.characterStats[member.name]) {
                    this.characterStats[member.name].healingDone += hpRegenAmount;
                    
                }
            }
            if (manaRegenAmount > 0 && member.mana < totalMaxMana) {
                member.mana = Math.min(totalMaxMana, member.mana + manaRegenAmount);
            }
        }
    });
}
                    
                    // Check if ready to attack (100 = ready)
                    if (unit.attackTimer >= 100) {
                        unit.attackTimer = 0;
                        
                        // Determine if this is a party member or enemy
                        const isPartyMember = this.party.includes(unit);
                        
                        if (isPartyMember) {
                            this.performPartyAttack(unit, aliveEnemies);
                        } else {
                            this.performEnemyAttack(unit, aliveParty);
                        }
                    }
});

                // Update ability indicators every tick (lightweight)
                // Only log if at least one keystone is on cooldown
                const keystonesOnCD = this.party.filter(m => m.keystoneCooldown > 0).length;
                if (keystonesOnCD > 0) {
                    const cdDetails = this.party.filter(m => m.keystoneCooldown > 0).map(m => `${m.name}:${m.keystoneCooldown.toFixed(1)}s`).join(', ');
                    
                }
                this.updateAbilityIndicators();

// Only update UI every 3 ticks for performance
if (!this._tickCounter) this._tickCounter = 0;
this._tickCounter++;
if (this._tickCounter % 5 === 0) {
    this.updateUI();
}
            }

performPartyAttack(member, aliveEnemies) {
    if (aliveEnemies.length === 0 || !member.sprite) return;
    
    // Check battle timing for non-tank melee
    const battleTime = (Date.now() - this.battleStartTime) / 1000; // Time in seconds
    const tank = this.party.find(m => m.className === 'Tank' && m.isAlive);
    const tankHasEngaged = tank && tank.hasEngaged;
    
    // Rogue now attacks immediately - tank has taunt to pull aggro
    
    // Filter out enemies with null sprites first
    let validEnemies = aliveEnemies.filter(e => e.sprite && e.sprite.gridX !== undefined);
    if (validEnemies.length === 0) return;
    
    let target = null;
    
    // PRIORITY TARGETING FOR RUNE TRIAL BOMBERS
    // Mage ALWAYS prioritizes bombers first (absolute priority), then boss
    if (this.currentDungeon === 'runetrial' && member.className === 'Mage') {
        const bombers = validEnemies.filter(e => e.isBomber);
        if (bombers.length > 0) {
            // ONLY attack bombers, ignore everything else
            target = bombers.sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.sprite.gridX - member.sprite.gridX, 2) + Math.pow(a.sprite.gridY - member.sprite.gridY, 2));
                const distB = Math.sqrt(Math.pow(b.sprite.gridX - member.sprite.gridX, 2) + Math.pow(b.sprite.gridY - member.sprite.gridY, 2));
                return distA - distB;
            })[0];
        }
    }
    
    // Healer targets bombers if no one needs healing urgently
    if (this.currentDungeon === 'runetrial' && member.className === 'Healer' && !target) {
        const aliveParty = this.party.filter(m => m.isAlive);
        const criticalAlly = aliveParty.find(m => m.hp < m.getTotalMaxHp() * 0.5);
        
        // Only target bombers if no one is below 50% HP
        if (!criticalAlly) {
            const bombers = validEnemies.filter(e => e.isBomber);
            if (bombers.length > 0) {
                target = bombers.sort((a, b) => {
                    const distA = Math.sqrt(Math.pow(a.sprite.gridX - member.sprite.gridX, 2) + Math.pow(a.sprite.gridY - member.sprite.gridY, 2));
                    const distB = Math.sqrt(Math.pow(b.sprite.gridX - member.sprite.gridX, 2) + Math.pow(b.sprite.gridY - member.sprite.gridY, 2));
                    return distA - distB;
                })[0];
            }
        }
    }
    
    // Default targeting if no special target was set
    if (!target) {
        // Tank and Rogue ignore bombers - only target boss in Rune Trial
        if (this.currentDungeon === 'runetrial' && (member.className === 'Tank' || member.className === 'Rogue')) {
            const nonBombers = validEnemies.filter(e => !e.isBomber);
            if (nonBombers.length > 0) {
                target = member.className === 'Tank' ? 
                    nonBombers.reduce((closest, enemy) => 
                        enemy.sprite.gridX < closest.sprite.gridX ? enemy : closest
                    ) : nonBombers[0];
            } else {
                // Fallback if only bombers exist
                target = validEnemies[0];
            }
        } else {
            target = member.className === 'Tank' ? 
                validEnemies.reduce((closest, enemy) => 
                    enemy.sprite.gridX < closest.sprite.gridX ? enemy : closest
                ) : validEnemies[0];
        }
    }
                
                if (!target || !target.sprite) return;

                let damage = 0;
                let performedAction = false;
                
                // Smart ability usage based on class and situation
                if (member.className === 'Healer') {
                    const aliveParty = this.party.filter(m => m.isAlive);
                    const injured = aliveParty.filter(m => m.hp < m.getTotalMaxHp())
                        .sort((a, b) => a.hp/a.getTotalMaxHp() - b.hp/b.getTotalMaxHp())[0]; // Prioritize lowest HP%
                    
                    // Heal if anyone is at 70% HP or less (using total max HP including all bonuses)
                    if (injured && injured.hp <= injured.getTotalMaxHp() * 0.7 && member.mana >= member.skillCost && member.cooldown === 0) {
                        const healAmount = member.useSkill(injured);
                        if (healAmount > 0) {
                            // Move briefly towards injured ally
                            const originalX = member.sprite.gridX;
                            const originalY = member.sprite.gridY;
                            member.sprite.moveTo(injured.sprite.gridX - 0.5, injured.sprite.gridY);
                            
                            const healed = injured.heal(healAmount);
                            this.createFloatingText(injured.sprite, `+${healed}`, 'heal-text');
                            this.createHealEffect(injured.sprite);
                            
                            // Track character-specific healing for all dungeons
                            if (this.characterStats && this.characterStats[member.name]) {
                                this.characterStats[member.name].healingDone += healed;
                            }
                            
                            this.addLog(`${member.name} heals ${injured.name} for ${healed}`, 'heal');
                            performedAction = true;
                            
                            // Return to position
                            setTimeout(() => {
                                member.sprite.moveTo(originalX, originalY);
                            }, 600);
                        }
                    }
                } else if (member.className === 'Mage' && member.mana >= member.skillCost && member.cooldown === 0) {
                    // Use Fireball if 2+ enemies or if single enemy has high HP
                    const shouldAOE = aliveEnemies.length >= 2 || 
                                     (aliveEnemies.length === 1 && aliveEnemies[0].hp > aliveEnemies[0].maxHp * 0.5);
                    
                    if (shouldAOE) {
                        const aoeDamage = member.useSkill(aliveEnemies);
                        if (aoeDamage > 0) {
                            // Create fireball projectile
                            this.createFireballEffect(member.sprite, aliveEnemies);
                            
                            aliveEnemies.forEach(enemy => {
                                const dealt = enemy.takeDamage(aoeDamage);
                                
                                if (dealt !== 'DODGE') {
                                    // Check for critical hit on each enemy
                                    const isCrit = Math.random() * 100 < member.getTotalCritChance();
                                    let finalDamage = dealt;
                                    
                                    if (isCrit) {
                                        const critMultiplier = member.getTotalCritDamage() / 100;
                                        finalDamage = Math.floor(dealt * critMultiplier);
                                        enemy.hp = Math.max(0, enemy.hp - (finalDamage - dealt));
                                        if (enemy.hp === 0) enemy.isAlive = false;
                                        this.createFloatingText(enemy.sprite, `-${finalDamage} CRIT!`, 'damage-text');
                                    } else {
                                        this.createFloatingText(enemy.sprite, `-${dealt}`, 'damage-text');
                                    }
                                    
                                    // Track damage
                                    this.floorStats.damageDealt += finalDamage;
                                    
                                    // Track character-specific damage for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].damageDealt += finalDamage;
                                    }
                                } else {
                                    this.createFloatingText(enemy.sprite, 'DODGE', 'heal-text');
                                }
                            });
                            member.sprite.attacking = true;
                            this.addLog(`${member.name} casts Fireball!`, 'damage');
                            performedAction = true;
                        }
                    }
                } else if (member.className === 'Tank' && member.mana >= member.skillCost && member.cooldown === 0) {
                    // Use Taunt if not currently taunting and enemies aren't already targeting tank
                    const enemiesTargetingOthers = aliveEnemies.filter(e => {
                        // Check if enemy would target someone else
                        const otherTargets = this.party.filter(m => m.isAlive && m.className !== 'Tank');
                        return otherTargets.length > 0 && Math.random() > 0.85; // 15% chance they'd target others
                    });
                    
                    if (!member.tauntActive && (aliveEnemies.length >= 2 || enemiesTargetingOthers.length > 0)) {
                        damage = member.useSkill(target);
                        if (damage >= 0) { // Taunt returns 0 but still succeeds
                            performedAction = true;
                            this.createTauntEffect(member.sprite);
                            this.addLog(`${member.name} taunts all enemies!`, 'damage');
                        }
                    }
                } else if (member.className === 'Rogue' && member.mana >= member.skillCost && member.cooldown === 0) {
                    // NEVER use Double Strike on bombers (they have 1 HP, waste of mana)
                    if (!target.isBomber) {
                        // Use Double Strike on high HP targets or when it would kill
                        const potentialDamage = member.getTotalAttack() * 1.5;
                        const wouldKill = target.hp <= potentialDamage;
                        const highValueTarget = target.isBoss || target.hp > 100;
                        
                        if (wouldKill || highValueTarget) {
                            damage = member.useSkill(target);
                            if (damage > 0) {
                                performedAction = true;
                                this.createDoubleStrikeEffect(target.sprite);
                            }
                        }
                    }
                } else if (member.className === 'Archer' && member.mana >= member.skillCost && member.cooldown === 0) {
                    // Use Multi-Shot when there are 2+ enemies (AOE ability)
                    if (aliveEnemies.length >= 2) {
                        const multiShotDamage = member.useSkill(aliveEnemies);
                        if (multiShotDamage > 0) {
                            // Create multi-shot arrow effect
                            this.createMultiShotEffect(member.sprite, aliveEnemies);
                            
                            // Damage each enemy hit (up to 3)
                            const targets = aliveEnemies.slice(0, 3);
                            targets.forEach(enemy => {
                                const dealt = enemy.takeDamage(multiShotDamage / 3); // Divide by 3 since total damage is 3x
                                
                                if (dealt !== 'DODGE') {
                                    // Check for critical hit
                                    const isCrit = Math.random() * 100 < member.getTotalCritChance();
                                    let finalDamage = dealt;
                                    
                                    if (isCrit) {
                                        const critMultiplier = member.getTotalCritDamage() / 100;
                                        finalDamage = Math.floor(dealt * critMultiplier);
                                        enemy.hp = Math.max(0, enemy.hp - (finalDamage - dealt));
                                        if (enemy.hp === 0) enemy.isAlive = false;
                                        this.createFloatingText(enemy.sprite, `-${finalDamage} CRIT!`, 'damage-text');
                                    } else {
                                        this.createFloatingText(enemy.sprite, `-${dealt}`, 'damage-text');
                                    }
                                    
                                    // Track damage
                                    this.floorStats.damageDealt += finalDamage;
                                    
                                    // Track character-specific damage for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].damageDealt += finalDamage;
                                    }
                                } else {
                                    this.createFloatingText(enemy.sprite, 'DODGE', 'heal-text');
                                }
                            });
                            
                            member.sprite.attacking = true;
                            this.addLog(`${member.name} fires Multi-Shot at ${targets.length} enemies!`, 'damage');
                            performedAction = true;
                        }
                    }
                } else if (member.className === 'Paladin' && member.mana >= member.skillCost && member.cooldown === 0) {
                    // Use Divine Shield more proactively:
                    // - When any ally below 80% HP
                    // - OR when facing 1+ enemies
                    // - OR when facing a boss
                    const injuredParty = this.party.filter(m => m.isAlive && m.hp < m.getTotalMaxHp() * 0.8);
                    const facingEnemies = aliveEnemies.length >= 1;
                    const facingBoss = aliveEnemies.some(e => e.isBoss);
                    
                    if (injuredParty.length > 0 || facingEnemies || facingBoss) {
                        member.useSkill(member); // Divine Shield doesn't return damage
                        this.createDivineShieldEffect(member.sprite);
                        member.sprite.attacking = true;
                        this.addLog(`${member.name} casts Divine Shield! All allies gain shields!`, 'heal');
                        performedAction = true;
                    }
                }

                // Check for keystone ability usage
                // FIX: Use member.className.toLowerCase() instead of hardcoded party order
                const keystoneType = member.className.toLowerCase();
                const equippedKeystone = this.equippedKeystones[keystoneType];

                // Allow healer support keystones (like Mana Feed) to trigger even after healing
                const isHealerSupportKeystone = equippedKeystone && (
                    equippedKeystone.internalName === 'arcanists-conduit' ||
                    equippedKeystone.internalName === 'martyrs-blessing' ||
                    equippedKeystone.internalName === 'phoenix-heart'
                );
                if (equippedKeystone && (!performedAction || isHealerSupportKeystone)) {
                    // Initialize keystone cooldown if needed
                    if (member.keystoneCooldown === undefined) member.keystoneCooldown = 0;
                    if (member.keystoneMaxCooldown === undefined) member.keystoneMaxCooldown = equippedKeystone.ability.cooldown;
                    
                    // Check if keystone is off cooldown AND member has enough mana
                    const keystoneManaCost = equippedKeystone.ability.manaCost;
                    if (member.keystoneCooldown === 0 && member.mana >= keystoneManaCost) {
                        let shouldUseKeystone = false;
                        
                        // Tank keystones
                        if (equippedKeystone.internalName === 'wardens-aegis') {
                            // Use if below 40% HP or facing boss
                            shouldUseKeystone = member.hp < member.getTotalMaxHp() * 0.4 || aliveEnemies.some(e => e.isBoss);
                        } else if (equippedKeystone.internalName === 'berserkers-pact') {
                            // Use if above 40% HP and (facing boss OR 2+ enemies)
                            shouldUseKeystone = member.hp > member.getTotalMaxHp() * 0.4 && (target.isBoss || aliveEnemies.length >= 2);
                        } else if (equippedKeystone.internalName === 'earthshakers-resolve') {
                            // Use on bosses OR when 2+ enemies
                            shouldUseKeystone = target.isBoss || aliveEnemies.length >= 2;
                        }
                        
                        // Healer keystones
                        else if (equippedKeystone.internalName === 'arcanists-conduit') {
                            // Mana Feed: Use if ANY ally is below 70% mana (not just mage/healer, and more generous threshold)
                            const lowManaAlly = this.party.find(m => m.isAlive && 
                                m.mana < m.getTotalMaxMana() * 0.7);
                            shouldUseKeystone = lowManaAlly !== undefined;
                        } else if (equippedKeystone.internalName === 'martyrs-blessing') {
                            // Use if any party member (including healer) below 80% HP and healer above 30% HP
                            const lowHpAllies = this.party.filter(m => m.isAlive && m.hp < m.getTotalMaxHp() * 0.8);
                            shouldUseKeystone = lowHpAllies.length >= 1 && member.hp > member.getTotalMaxHp() * 0.3;
                        } else if (equippedKeystone.internalName === 'phoenix-heart') {
                            // Use if an ally is dead (only once per battle)
                            const deadAlly = this.party.find(m => !m.isAlive);
                            shouldUseKeystone = deadAlly !== undefined && !member.phoenixUsedThisBattle;
                        }
                        
                        // Mage keystones
                        else if (equippedKeystone.internalName === 'winters-wrath') {
                            // Use on bosses OR when 2+ enemies
                            shouldUseKeystone = target.isBoss || aliveEnemies.length >= 2;
                        } else if (equippedKeystone.internalName === 'voidwalkers-gift') {
                            // Use against bosses or high defense enemies
                            const highDefEnemy = aliveEnemies.find(e => e.defense > 15 || e.isBoss);
                            shouldUseKeystone = highDefEnemy !== undefined;
                        } else if (equippedKeystone.internalName === 'timeweavers-paradox') {
                            // Use if 2+ allies have abilities on cooldown OR 2+ allies below 50% HP
                            const alliesOnCooldown = this.party.filter(m => m.isAlive && m.cooldown > 0);
                            const alliesLowHp = this.party.filter(m => m.isAlive && m.hp < m.getTotalMaxHp() * 0.5);
                            shouldUseKeystone = alliesOnCooldown.length >= 2 || alliesLowHp.length >= 2;
                        }
                        
                        // Rogue keystones
                        else if (equippedKeystone.internalName === 'assassins-mark') {
                            // Use on bosses or high HP targets
                            shouldUseKeystone = target.isBoss || target.hp > target.maxHp * 0.7;
                        } else if (equippedKeystone.internalName === 'shadow-dancer') {
                            // Use when below 60% HP or against 2+ enemies
                            shouldUseKeystone = member.hp < member.getTotalMaxHp() * 0.6 || aliveEnemies.length >= 2;
                        } else if (equippedKeystone.internalName === 'serpents-venom') {
                            // Use on any enemy that doesn't have poison yet
                            shouldUseKeystone = !target.poisonStacks || target.poisonStacks < 3;
                        }
                        
                        // Archer keystones
                        else if (equippedKeystone.internalName === 'hawkeyes-precision') {
                            // Use on bosses or high HP targets for maximum impact
                            shouldUseKeystone = target.isBoss || (target.hp > target.maxHp * 0.6 && aliveEnemies.length <= 2);
                        } else if (equippedKeystone.internalName === 'rapid-quiver') {
                            // Use on bosses OR when 2+ enemies for AOE value
                            shouldUseKeystone = target.isBoss || aliveEnemies.length >= 2;
                        } else if (equippedKeystone.internalName === 'hunters-focus') {
                            // Use on bosses or when facing tough enemies
                            shouldUseKeystone = target.isBoss || (target.hp > target.maxHp * 0.7 && target.defense > 10);
                        }
                        
                        // Paladin keystones
                        else if (equippedKeystone.internalName === 'holy-avenger') {
                            // Use on bosses OR when 2+ enemies, AND party needs healing
                            const injuredCount = this.party.filter(m => m.isAlive && m.hp < m.getTotalMaxHp() * 0.7).length;
                            shouldUseKeystone = (target.isBoss || aliveEnemies.length >= 2) && injuredCount >= 1;
                        } else if (equippedKeystone.internalName === 'divine-guardian') {
                            // Use when 2+ allies are injured or facing boss
                            const injuredCount = this.party.filter(m => m.isAlive && m.hp < m.getTotalMaxHp() * 0.6).length;
                            shouldUseKeystone = injuredCount >= 2 || (target.isBoss && injuredCount >= 1);
                        } else if (equippedKeystone.internalName === 'righteous-fury') {
                            // Use on bosses OR when 2+ enemies for AOE damage + team AS buff
                            shouldUseKeystone = target.isBoss || aliveEnemies.length >= 2;
                        }
                        
                        if (shouldUseKeystone) {
                            // Ensure keystoneMaxCooldown is properly set before using ability
                            if (!member.keystoneMaxCooldown || member.keystoneMaxCooldown !== equippedKeystone.ability.cooldown) {
                                member.keystoneMaxCooldown = equippedKeystone.ability.cooldown;
                            }
                            
                            // Use the keystone ability
                            member.keystoneCooldown = member.keystoneMaxCooldown;
                            member.lastKeystoneCooldownTime = Date.now(); // Reset the time tracker when keystone activates
                            
                            
                            if (keystoneManaCost > 0) {
                                member.mana -= keystoneManaCost; // Deduct mana cost only if > 0
                            }
                            performedAction = true;
                            
                            // Execute keystone effects
                            if (equippedKeystone.internalName === 'wardens-aegis') {
                                this.createInvulnerabilityEffect(member.sprite);
                                member.invulnerable = true;
                                member.invulnerableTimer = 180; // 3 seconds
                                this.addLog(`${member.name} becomes invulnerable!`, 'heal');
                                
                            } else if (equippedKeystone.internalName === 'berserkers-pact') {
                                this.createBloodFrenzyEffect(member.sprite);
                                const hpCost = Math.floor(member.hp * 0.3);
                                member.hp -= hpCost;
                                member.berserkerActive = true;
                                member.berserkerTimer = 480; // 8 seconds
                                this.addLog(`${member.name} enters blood frenzy!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'earthshakers-resolve') {
                                this.createSeismicSlamEffect(member.sprite);
                                aliveEnemies.forEach(enemy => {
                                    enemy.stunned = true;
                                    enemy.stunnedTimer = 150; // 2.5 seconds
                                    enemy.attackDebuff = 0.6; // -40% attack
                                    enemy.attackDebuffTimer = 300; // 5 seconds
                                });
                                this.addLog(`${member.name} slams the ground!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'arcanists-conduit') {
                                const lowestManaAlly = this.party.filter(m => m.isAlive)
                                    .sort((a, b) => (a.mana / a.getTotalMaxMana()) - (b.mana / b.getTotalMaxMana()))[0];
                                if (lowestManaAlly) {
                                    const manaRestored = Math.floor(lowestManaAlly.getTotalMaxMana() * 0.75);
                                    lowestManaAlly.mana = Math.min(lowestManaAlly.getTotalMaxMana(), lowestManaAlly.mana + manaRestored);
                                    this.createHealEffect(lowestManaAlly.sprite);
                                    this.addLog(`${member.name} restores ${manaRestored} mana to ${lowestManaAlly.name}!`, 'heal');
                                }
                                
                            } else if (equippedKeystone.internalName === 'martyrs-blessing') {
                                const hpSacrificed = Math.floor(member.hp * 0.4);
                                member.hp -= hpSacrificed;
                                const healPerAlly = Math.floor((hpSacrificed * 2) / this.party.filter(m => m.isAlive).length);
                                this.party.filter(m => m.isAlive).forEach(ally => {
                                    ally.heal(healPerAlly);
                                    this.createHealEffect(ally.sprite);
                                    this.createFloatingText(ally.sprite, `+${healPerAlly}`, 'heal-text');
                                    
                                    // Track character-specific healing for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].healingDone += healPerAlly;
                                    }
                                });
                                this.addLog(`${member.name} sacrifices HP to heal the party!`, 'heal');
                                
                            } else if (equippedKeystone.internalName === 'phoenix-heart') {
                                const deadAlly = this.party.find(m => !m.isAlive);
                                if (deadAlly) {
                                    deadAlly.isAlive = true;
                                    deadAlly.hp = Math.floor(deadAlly.getTotalMaxHp() * 0.4);
                                    deadAlly.mana = Math.floor(deadAlly.getTotalMaxMana() * 0.3);
                                    this.createHealEffect(deadAlly.sprite);
                                    member.phoenixUsedThisBattle = true;
                                    this.addLog(`${member.name} resurrects ${deadAlly.name}!`, 'heal');
                                }
                                
                            } else if (equippedKeystone.internalName === 'winters-wrath') {
                                this.createBlizzardEffect(aliveEnemies);
                                aliveEnemies.forEach(enemy => {
                                    enemy.frozen = true;
                                    enemy.frozenTimer = 120; // 2 seconds
                                    const damage = member.getTotalAttack() * 1.2;
                                    const dealt = enemy.takeDamage(damage);
                                    this.createFloatingText(enemy.sprite, `-${dealt}`, 'damage-text');
                                    this.floorStats.damageDealt += dealt;
                                    
                                    // Track character-specific damage for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].damageDealt += dealt;
                                    }
                                });
                                this.addLog(`${member.name} casts Blizzard!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'voidwalkers-gift') {
                                this.createVoidSurgeEffect(member.sprite);
                                member.voidSurgeActive = true;
                                member.voidSurgeStacks = 5;
                                this.addLog(`${member.name} channels void energy!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'timeweavers-paradox') {
                                this.createTemporalRewindEffect();
                                this.party.filter(m => m.isAlive).forEach(ally => {
                                    // Reset cooldowns for everyone EXCEPT the caster
                                    if (ally !== member) {
                                        ally.cooldown = 0;
                                        if (ally.keystoneCooldown) ally.keystoneCooldown = 0;
                                    }
                                    const healAmount = Math.floor(ally.getTotalMaxHp() * 0.25);
                                    ally.heal(healAmount);
                                    this.createHealEffect(ally.sprite);
                                    
                                    // Track character-specific healing for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].healingDone += healAmount;
                                    }
                                });
                                this.addLog(`${member.name} rewinds time for allies!`, 'heal');
                                
                            } else if (equippedKeystone.internalName === 'assassins-mark') {
                                this.createCrippleEffect(target.sprite);
                                const damage = member.getTotalAttack() * 1.5;
                                const dealt = target.takeDamage(damage);
                                this.createFloatingText(target.sprite, `-${dealt}`, 'damage-text');
                                this.floorStats.damageDealt += dealt;
                                
                                // Track character-specific damage for all dungeons
                                if (this.characterStats && this.characterStats[member.name]) {
                                    this.characterStats[member.name].damageDealt += dealt;
                                }
                                
                                target.defenseDebuff = 20;
                                target.defenseDebuffTimer = 300; // 5 seconds
                                this.addLog(`${member.name} cripples ${target.name}!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'shadow-dancer') {
                                this.createShadowStepEffect(member.sprite);
                                member.shadowDancerActive = true;
                                member.shadowDancerStacks = 3;
                                this.addLog(`${member.name} enters the shadows!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'serpents-venom') {
                                this.createToxicCascadeEffect(target.sprite);
                                if (!target.poisonStacks) target.poisonStacks = 0;
                                if (!target.poisonDamage) target.poisonDamage = 0;
                                target.poisonStacks = Math.min(3, target.poisonStacks + 1);
                                target.poisonDamage = member.getTotalAttack() * 0.4;
                                target.poisonTimer = 600; // 10 seconds
                                target.poisonAttackSpeedDebuff = 0.85; // -15% attack speed
                                this.addLog(`${member.name} poisons ${target.name}!`, 'damage');
                            }
                            
                            // ARCHER KEYSTONES
                            else if (equippedKeystone.internalName === 'hawkeyes-precision') {
                                // Perfect Shot - 250% attack, 100% crit, ignores defense
                                member.sprite.attacking = true;
                                this.createPerfectShotEffect(member.sprite, target.sprite);
                                
                                const baseDamage = member.getTotalAttack() * 2.5;
                                const critMultiplier = member.getTotalCritDamage() / 100;
                                const finalDamage = Math.floor(baseDamage * critMultiplier);
                                
                                // Bypass defense completely
                                target.hp = Math.max(0, target.hp - finalDamage);
                                if (target.hp === 0) target.isAlive = false;
                                
                                this.createFloatingText(target.sprite, `-${finalDamage} PERFECT!`, 'damage-text');
                                this.floorStats.damageDealt += finalDamage;
                                
                                // Track character-specific damage for all dungeons
                                if (this.characterStats && this.characterStats[member.name]) {
                                    this.characterStats[member.name].damageDealt += finalDamage;
                                }
                                
                                this.addLog(`${member.name} fires a Perfect Shot at ${target.name}!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'rapid-quiver') {
                                // Arrow Storm - 8 arrows over 2 seconds
                                member.sprite.attacking = true;
                                member.arrowStormActive = true;
                                member.arrowStormArrows = 8;
                                member.arrowStormTimer = 0;
                                member.arrowStormInterval = 15; // Fire arrow every 15 frames (0.25s)
                                member.arrowStormDamage = Math.floor(member.getTotalAttack() * 0.6);
                                this.addLog(`${member.name} unleashes Arrow Storm!`, 'damage');
                                
                            } else if (equippedKeystone.internalName === 'hunters-focus') {
                                // Marked for Death - +80% damage, +30% lifesteal for 6s
                                this.createMarkEffect(target.sprite);
                                target.markedBy = member;
                                target.markedTimer = 360; // 6 seconds
                                target.markedDamageBonus = 0.8; // +80% damage
                                target.markedLifesteal = 0.3; // +30% lifesteal
                                this.addLog(`${member.name} marks ${target.name} for death!`, 'damage');
                            }
                            
                            // PALADIN KEYSTONES
                            else if (equippedKeystone.internalName === 'holy-avenger') {
                                // Divine Wrath - 160% AOE damage + 15% heal to all allies
                                member.sprite.attacking = true;
                                this.createDivineWrathEffect(member.sprite);
                                
                                const aoeDamage = Math.floor(member.getTotalAttack() * 1.6);
                                aliveEnemies.forEach(enemy => {
                                    const dealt = enemy.takeDamage(aoeDamage);
                                    this.createFloatingText(enemy.sprite, `-${dealt}`, 'damage-text');
                                    this.floorStats.damageDealt += dealt;
                                    
                                    // Track character-specific damage for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].damageDealt += dealt;
                                    }
                                });
                                
                                this.party.filter(m => m.isAlive).forEach(ally => {
                                    const healAmount = Math.floor(ally.getTotalMaxHp() * 0.15);
                                    ally.heal(healAmount);
                                    this.createHealEffect(ally.sprite);
                                    this.createFloatingText(ally.sprite, `+${healAmount}`, 'heal-text');
                                    
                                    // Track character-specific healing for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].healingDone += healAmount;
                                    }
                                });
                                
                                this.addLog(`${member.name} smites all enemies with Divine Wrath!`, 'heal');
                                
                            } else if (equippedKeystone.internalName === 'divine-guardian') {
                                // Sacred Barrier - 20% max HP shields + 30% defense for 6s
                                this.createSacredBarrierEffect(member.sprite);
                                
                                let totalShieldAmount = 0;
                                this.party.filter(m => m.isAlive).forEach(ally => {
                                    const now = Date.now();
                                    const shieldAmount = Math.floor(ally.getTotalMaxHp() * 0.2);
                                    ally.shieldAmount = (ally.shieldAmount || 0) + shieldAmount;
                                    ally.shieldEndTime = now + 6000; // 6 seconds
                                    ally.sacredBarrierDefense = 0.3; // +30% defense
                                    ally.sacredBarrierTimer = 360;
                                    this.createFloatingText(ally.sprite, `+${shieldAmount} SHIELD`, 'heal-text');
                                    totalShieldAmount += shieldAmount;
                                });
                                
                                // Track total shields granted in stats
                                if (this.characterStats && this.characterStats[member.name]) {
                                    this.characterStats[member.name].healingDone += totalShieldAmount;
                                    
                                } else {
                                    
                                }
                                
                                this.addLog(`${member.name} grants Sacred Barrier to all allies!`, 'heal');
                                
                            } else if (equippedKeystone.internalName === 'righteous-fury') {
                                // Holy Fire - 150% AOE damage + 35% AS to all allies for 5s
                                member.sprite.attacking = true;
                                this.createHolyFireEffect(member.sprite);
                                
                                const aoeDamage = Math.floor(member.getTotalAttack() * 1.5);
                                aliveEnemies.forEach(enemy => {
                                    const dealt = enemy.takeDamage(aoeDamage);
                                    this.createFloatingText(enemy.sprite, `-${dealt}`, 'damage-text');
                                    this.floorStats.damageDealt += dealt;
                                    
                                    // Track character-specific damage for all dungeons
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].damageDealt += dealt;
                                    }
                                });
                                
                                this.party.filter(m => m.isAlive).forEach(ally => {
                                    ally.righteousFuryAS = 0.35; // +35% attack speed
                                    ally.righteousFuryTimer = 300; // 5 seconds
                                });
                                
                                this.addLog(`${member.name} ignites Holy Fire! Allies gain +35% Attack Speed!`, 'damage');
                            }
                        }
                    }
                    
                    // Log before checking cooldown to verify we reach this code
                    if (member.keystoneCooldown !== undefined && member.keystoneCooldown !== 0) {
                        
                    }
                    
                    // Reduce keystone cooldown using real time (consistent with regular abilities)
                    if (member.keystoneCooldown > 0) {
                        if (!member.lastKeystoneCooldownTime) member.lastKeystoneCooldownTime = Date.now();
                        
                        const now = Date.now();
                        const elapsed = (now - member.lastKeystoneCooldownTime) / 1000;
                        member.lastKeystoneCooldownTime = now;
                        
                        const cdr = member.getTotalCDR ? member.getTotalCDR() : 0;
                        const cooldownMultiplier = 1 + (cdr / 100);
                        const reduction = elapsed * cooldownMultiplier;
                        
                        // Log every reduction to see if it's happening
                        
                        
                        member.keystoneCooldown -= reduction;
                        
                        if (member.keystoneCooldown <= 0) {
                            
                            member.keystoneCooldown = 0;
                            member.lastKeystoneCooldownTime = undefined; // Reset tracker when cooldown completes
                            member._lastCDLog = undefined;
                        }
                    }
                }

                // Regular attack if no skill
if (!performedAction) {
    damage = member.getTotalAttack();
}

                // Deal damage and handle movement
                if (damage > 0 && target) {
                    // Store original position
                    const originalX = member.sprite.gridX;
                    const originalY = member.sprite.gridY;
                    
                    // Don't move during Rune Trial pillar charging - stay at pillar!
                    const stayAtPillar = this.currentDungeon === 'runetrial' && this.runeTrialPillarCharging;
                    
                    // Don't move towards bombers in Rune Trial - Tank/Rogue stay put
                    const dontChase = this.currentDungeon === 'runetrial' && target.isBomber && (member.className === 'Tank' || member.className === 'Rogue');
                    
                    // Move based on class
                    if (member.className === 'Tank' && !stayAtPillar && !dontChase) {
                        // Tank moves close but keeps distance from large bosses
                        const isBigBoss = target.isRuneTrialBoss || target.isPinnacleBoss || target.name === 'Keystone Warden' || target.name === 'Rune Guardian' || target.name === 'Pinnacle Boss';
                        const offset = isBigBoss ? 3 : 1; // Keep more distance from big bosses
                        member.sprite.moveTo(target.sprite.gridX - offset, target.sprite.gridY);
                        member.hasEngaged = true;
                    } else if (member.className === 'Paladin' && !stayAtPillar && !dontChase) {
                        // Paladin moves close to engage in melee like Tank
                        const isBigBoss = target.isRuneTrialBoss || target.isPinnacleBoss || target.name === 'Keystone Warden' || target.name === 'Rune Guardian' || target.name === 'Pinnacle Boss';
                        const offset = isBigBoss ? 3 : 1;
                        member.sprite.moveTo(target.sprite.gridX - offset, target.sprite.gridY);
                        member.hasEngaged = true;
                    } else if (member.className === 'Rogue' && !stayAtPillar && !dontChase) {
                        // Rogue only moves in if tank has engaged or after initial period
                        if (tankHasEngaged || battleTime > 2) {
                            // Attacks from flank
                            member.sprite.moveTo(target.sprite.gridX - 1, target.sprite.gridY + 0.5);
                        } else {
                            // Throws daggers from range
                            damage = Math.floor(damage * 0.7);
                            member.sprite.attacking = true;
                        }
                    } else {
                        // Ranged stays in place
                        member.sprite.attacking = true;
                    }
                    
                    // Create subtle basic attack animation
if (member.className === 'Healer') {
    // Only show animation if attack is ready
    if (!member._lastAttackTime || Date.now() - member._lastAttackTime >= 1000 / member.getTotalAttackSpeed()) {
        member._lastAttackTime = Date.now();
        
        // Small light bolt
        const startPos = ISO.toScreen(member.sprite.gridX, member.sprite.gridY);
        const endPos = ISO.toScreen(target.sprite.gridX, target.sprite.gridY);
        this.visualEffects.push({
            type: 'projectile',
            x: startPos.x + this.offsetX,
            y: startPos.y + this.offsetY - 20,
            targetX: endPos.x + this.offsetX,
            targetY: endPos.y + this.offsetY,
            speed: 12,
            color: 'rgba(16, 185, 129, 0.4)',
            size: 4,
            trail: [],
            life: 60
        });
    }
} else if (member.className === 'Mage') {
    // Only show animation if attack is ready
    if (!member._lastAttackTime || Date.now() - member._lastAttackTime >= 1000 / member.getTotalAttackSpeed()) {
        member._lastAttackTime = Date.now();
        
        // Small purple arcane bolt
        const startPos = ISO.toScreen(member.sprite.gridX, member.sprite.gridY);
        const endPos = ISO.toScreen(target.sprite.gridX, target.sprite.gridY);
        this.visualEffects.push({
            type: 'projectile',
            x: startPos.x + this.offsetX,
            y: startPos.y + this.offsetY - 20,
            targetX: endPos.x + this.offsetX,
            targetY: endPos.y + this.offsetY,
            speed: 14,
            color: 'rgba(168, 85, 247, 0.6)',
            size: 5,
            trail: [],
            life: 60
        });
    }
} else if (member.className === 'Rogue') {
    // Double dagger stab animation - positioned at target level
    const pos = ISO.toScreen(member.sprite.gridX, member.sprite.gridY);
    
    // Only show animation if not on cooldown (matches attack speed)
    if (!member._lastAttackTime || Date.now() - member._lastAttackTime >= 1000 / member.getTotalAttackSpeed()) {
        member._lastAttackTime = Date.now();
        
        // Hide weapons during animation
        member.sprite.hideWeapons = true;
        
        // Left dagger stab
        this.visualEffects.push({
            type: 'dagger-stab',
            x: pos.x + this.offsetX + 18,  // Right side
            y: pos.y + this.offsetY - 5,   // At target level (lowered from -25)
            startX: 0,
            endX: 15,
            currentX: 0,
            offsetY: -3,
            color: '#d4d4d8',  // Silver weapon color
            life: 10,
            delay: 0
        });
        
        // Right dagger stab (slightly delayed)
        setTimeout(() => {
            this.visualEffects.push({
                type: 'dagger-stab',
                x: pos.x + this.offsetX + 18,
                y: pos.y + this.offsetY - 5,  // At target level (lowered from -25)
                startX: 0,
                endX: 15,
                currentX: 0,
                offsetY: 3,
                color: '#d4d4d8',  // Silver weapon color
                life: 10,
                delay: 0
            });
        }, 100);
        
        // Show weapons again after animation
        setTimeout(() => {
            member.sprite.hideWeapons = false;
        }, 300);
    }
    
} else if (member.className === 'Tank') {
    // Arm swing animation (heavier) - positioned on far right and high
    const pos = ISO.toScreen(member.sprite.gridX, member.sprite.gridY);
    this.visualEffects.push({
        type: 'arm-swing',
        x: pos.x + this.offsetX + 22,  // Much further right
        y: pos.y + this.offsetY - 15,  // Much higher
        startAngle: -60,
        endAngle: 60,
        currentAngle: -60,
        armLength: 18,
        color: '#d4d4d8',
        life: 15
    });
} else if (member.className === 'Paladin') {
    // Holy weapon swing animation - similar to Tank but with golden glow
    const pos = ISO.toScreen(member.sprite.gridX, member.sprite.gridY);
    this.visualEffects.push({
        type: 'arm-swing',
        x: pos.x + this.offsetX + 22,
        y: pos.y + this.offsetY - 15,
        startAngle: -60,
        endAngle: 60,
        currentAngle: -60,
        armLength: 18,
        color: '#fbbf24',  // Golden color for holy effect
        life: 15
    });
    // Add holy light flash effect
    this.visualEffects.push({
        type: 'flash',
        x: pos.x + this.offsetX + 25,
        y: pos.y + this.offsetY - 10,
        color: 'rgba(251, 191, 36, 0.6)',
        radius: 20,
        life: 8
    });
}
                
                // Deal damage after short delay
                    setTimeout(() => {
                        // Voidwalker's Gift: Ignore defense and boost crit
                        let tempDefense = null;
                        let critBonus = 0;
                        if (member.voidSurgeActive && member.voidSurgeStacks > 0) {
                            tempDefense = target.defense;
                            target.defense = 0; // Ignore 100% defense
                            critBonus = 50; // +50% crit chance
                            member.voidSurgeStacks--;
                            if (member.voidSurgeStacks === 0) {
                                member.voidSurgeActive = false;
                            }
                        }
                        
                        // Apply Marked for Death damage bonus
                        if (target.markedBy && target.markedDamageBonus) {
                            damage = Math.floor(damage * (1 + target.markedDamageBonus));
                        }
                        
                        const dealt = target.takeDamage(damage);
                        
                        // Restore defense if it was modified
                        if (tempDefense !== null) {
                            target.defense = tempDefense;
                        }
                        
                        if (dealt === 'DODGE') {
                            this.createFloatingText(target.sprite, 'DODGE', 'heal-text');
                        } else if (dealt === 0 && target.invulnerable) {
                            this.createFloatingText(target.sprite, 'INVULNERABLE', 'gold-text');
                        } else {
                            // Check for critical hit (with void surge bonus)
                            const isCrit = Math.random() * 100 < (member.getTotalCritChance() + critBonus);
                            let finalDamage = dealt;
                            
                            if (isCrit) {
                                const critMultiplier = member.getTotalCritDamage() / 100;
                                finalDamage = Math.floor(dealt * critMultiplier);
                                target.hp = Math.max(0, target.hp - (finalDamage - dealt));
                                if (target.hp === 0) target.isAlive = false;
                                this.createFloatingText(target.sprite, `-${finalDamage} CRIT!`, 'damage-text');
                            } else {
                                this.createFloatingText(target.sprite, `-${dealt}`, 'damage-text');
                            }
                            
                            // Track damage dealt
                            this.floorStats.damageDealt += finalDamage;
                            
                            // Track character-specific damage for all dungeons
                            if (this.characterStats && this.characterStats[member.name]) {
                                this.characterStats[member.name].damageDealt += finalDamage;
                            }
                            
                            // Apply lifesteal (base + marked bonus)
                            let lifesteal = member.getTotalLifesteal();
                            if (target.markedBy === member && target.markedLifesteal) {
                                lifesteal += target.markedLifesteal * 100; // Convert 0.3 to 30%
                            }
                            if (lifesteal > 0) {
                                const healAmount = Math.floor(finalDamage * (lifesteal / 100));
                                if (healAmount > 0) {     
                                    member.heal(healAmount);
                                    this.createFloatingText(member.sprite, `+${healAmount}`, 'heal-text');
                                    
                                    // Track lifesteal healing in stats
                                    if (this.characterStats && this.characterStats[member.name]) {
                                        this.characterStats[member.name].healingDone += healAmount;
                                        
                                    }
                                }
                            }
                            
                            member.sprite.attacking = true;
                        }
                        
                        if (!target.isAlive) {
                            this._unitPositionsChanged = true; // Mark for re-sort
                            this.addLog(`${member.name} defeats ${target.name}!`, 'damage');
                            
                            // Track kills for endless dungeon
                            // CRITICAL: Only count kills for legitimate strong enemies (>= 5000 HP)
                            // This prevents counting glitched weak enemies that shouldn't exist
                            if (this.currentDungeon === 'endlessblessings' && this.updateEndlessWave) {
                                if (target.maxHp >= 5000) {
                                    this.updateEndlessWave();
                                } else {
                                    
                                }
                            }
                            
                            // Track kills
                            this.floorStats.enemiesKilled++;
                            
                            // Share XP equally among all living party members
                            const aliveParty = this.party.filter(m => m.isAlive);
                            const xpPerMember = Math.max(1, Math.floor(target.xpReward / aliveParty.length));
                            aliveParty.forEach(partyMember => {
                                partyMember.gainXP(xpPerMember);
                            });
                            
                            // Track gold earned
                            this.floorStats.goldEarned += target.goldReward;
                            this.gold += target.goldReward;
                            this.createFloatingText(target.sprite, `+${target.goldReward}g`, 'gold-text');
                            
                            // Individual enemy loot drop
                            this.rollEnemyLoot(target);
                        }
                        
                        // Return to position for melee
                        if (member.className === 'Tank' || 
                            member.className === 'Paladin' ||
                            (member.className === 'Rogue' && (tankHasEngaged || battleTime > 2))) {
                            setTimeout(() => {
                                member.sprite.moveTo(originalX, originalY);
                            }, 400);
                        }
                    }, 200);
                }
            }

performEnemyAttack(enemy, aliveParty) {
    if (!enemy || !enemy.sprite || aliveParty.length === 0) return;
    
    // Rune Trial Boss - Simple tank and spank, no special mechanics
    // All challenge comes from managing bomber minions
    
    // Enemies target based on threat - tank first if alive
    const tank = aliveParty.find(m => m.className === 'Tank');
    let target;
    
    // If tank has taunt active, 100% target tank, otherwise 85% chance
    if (tank && tank.isAlive && tank.tauntActive) {
        target = tank;
    } else if (tank && tank.isAlive && Math.random() > 0.15) {
        target = tank;
    } else {
        target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
    }
                
    if (target && target.sprite) {
        let damage = enemy.getTotalAttack();
        
        // Rune Trial Boss phase modifiers
        if (enemy.isRuneTrialBoss) {
            if (enemy.elementalPhase === 'fire') {
                damage = Math.floor(damage * 1.3);
            } else if (enemy.elementalPhase === 'ice') {
                // Ice phase slows attack speed (handled in attack timer)
            } else if (enemy.elementalPhase === 'lightning') {
                // Lightning phase increases attack speed (handled in attack timer)
            }
        }
        
        // Store original position
        const originalX = enemy.sprite.gridX;
        const originalY = enemy.sprite.gridY;
        
        // Find an available position around the target to prevent stacking
        const findAttackPosition = () => {
            // Try positions around the target in order of preference
            const offsets = [
                {x: 1, y: 0},   // Right
                {x: -1, y: 0},  // Left
                {x: 0, y: 1},   // Below
                {x: 0, y: -1},  // Above
                {x: 1, y: 1},   // Diagonal bottom-right
                {x: -1, y: 1},  // Diagonal bottom-left
                {x: 1, y: -1},  // Diagonal top-right
                {x: -1, y: -1}  // Diagonal top-left
            ];
            
            for (const offset of offsets) {
                const testX = target.sprite.gridX + offset.x;
                const testY = target.sprite.gridY + offset.y;
                
                // Check if this position is occupied by another enemy
                let occupied = false;
                for (const otherEnemy of this.enemies) {
                    if (otherEnemy === enemy || !otherEnemy.sprite) continue;
                    const dx = Math.abs(otherEnemy.sprite.targetX - testX);
                    const dy = Math.abs(otherEnemy.sprite.targetY - testY);
                    if (dx < 0.5 && dy < 0.5) {
                        occupied = true;
                        break;
                    }
                }
                
                if (!occupied) {
                    return {x: testX, y: testY};
                }
            }
            
            // Fallback if all positions are occupied
            return {x: target.sprite.gridX + 1, y: target.sprite.gridY};
        };
        
        const attackPos = findAttackPosition();
        
        // Move towards target
        enemy.sprite.moveTo(attackPos.x, attackPos.y);
        
        // Deal damage after delay
        setTimeout(() => {
            const dealt = target.takeDamage(damage);
            enemy.sprite.attacking = true;
            this.createFloatingText(target.sprite, `-${dealt}`, 'damage-text');
            
            // Return to position
            setTimeout(() => {
                enemy.sprite.moveTo(originalX, originalY);
            }, 400);
        }, 200);
    }
}


endBattle(victory) {
    this.inBattle = false;
    
    // Clean up vault summoning timers
    if (this.vaultSummonInterval) {
        clearInterval(this.vaultSummonInterval);
        this.vaultSummonInterval = null;
    }
    if (this.vaultSummonTimeout) {
        clearTimeout(this.vaultSummonTimeout);
        this.vaultSummonTimeout = null;
    }
    
    // Immediately clear enemy health bars
    const healthBarContainer = document.getElementById('enemy-health-bars');
    if (healthBarContainer) healthBarContainer.innerHTML = '';
    
    // Ensure dead party members show 0 HP
    this.party.forEach(member => {
        if (!member.isAlive) {
            member.hp = 0;
        }
    });
    
    // Update UI immediately to reflect death state
    this.updateUI();
    
    // Remove dead enemies immediately - no delay needed
    this.enemies = this.enemies.filter(e => e.isAlive);
   
                
if (victory && this.currentDungeon !== 'endlessblessings') {
                    this.addLog('Victory!', 'room');
                    
// Handle Rune Trial victory
                if (this.currentDungeon === 'runetrial') {
                    this.addLog('Rune Trial conquered!', 'loot');
                    
                    // Award gold and XP
                    const goldReward = this.runeTrialTier * 100;
                    this.gold += goldReward;
                    this.floorStats.goldEarned += goldReward;
                    
                    const xpReward = this.runeTrialTier * 500;
                    this.party.forEach(member => {
                        member.gainXP(xpReward);
                    });
                    
                    // Drop 1 guaranteed rune
                    const rune = this.rollRuneFromTrial(this.runeTrialTier);
                    
                    // Drop 3 guaranteed loot items
                    const baseLootTable = ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'];
                    const lootTable = this.getFilteredLootTable(baseLootTable);
                    const runeTrialLoot = [];
                    for (let i = 0; i < 3; i++) {
                        // Skip if no valid items
                        if (lootTable.length === 0) continue;
                        
                        const type = lootTable[Math.floor(Math.random() * lootTable.length)];
                        
                        let rarity;
                        const roll = Math.random() * 100;
                        
                        if (roll < 10) rarity = 'legendary';
                        else if (roll < 50) rarity = 'epic';
                        else rarity = 'rare';
                        
                        // Loot level based on tier
                        const levelRange = RUNE_TRIAL_CONFIG.LOOT_LEVEL_RANGE[this.runeTrialTier];
                        const minLevel = levelRange.min;
                        const maxLevel = levelRange.max;
                        const itemLevel = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
                        const item = new Item(type, rarity, itemLevel);
                        runeTrialLoot.push(item);
                        
                        if (!this.lootFilter[rarity] || item.level < this.lootFilter.minLevel) {
                            const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
                            const sellPrice = sellPrices[rarity] || 15;
                            this.gold += sellPrice;
                            this.floorStats.goldEarned += sellPrice;
                        } else {
                            this.loot.push(item);
                            this.floorStats.lootObtained++;
                            if (rarity === 'legendary') {
                                this.globalStats.legendariesFound++;
                                if (window.trackStat) window.trackStat('legendaryObtained');
                            }
                            if (rarity === 'mythic') {
                                if (window.trackStat) window.trackStat('mythicObtained');
                            }
                            
                            // Auto-sell lowest gear score item if loot exceeds 50 items
                            if (this.loot.length > 50) {
                                this.autoSellLowestGearScore();
                            }
                        }
                    }
                    
                    // Show victory screen
                    setTimeout(() => {
                        this.showRuneTrialVictoryScreen(goldReward, xpReward, rune, runeTrialLoot);
                    }, 2000);
                    
                    // STEAM: Track rune trial completion achievements
                    if (window.trackStat) {
                        window.trackStat('runeTrialCompleted');
                        window.trackStat('runeObtained');
                        window.trackStat('goldEarned', goldReward);
                    }
                    
                    // Track rune trial boss kill for leaderboard
                    if (!this.dungeonProgress) this.dungeonProgress = {};
                    if (!this.dungeonProgress.runetrial) this.dungeonProgress.runetrial = { bossKills: 0 };
                    this.dungeonProgress.runetrial.bossKills++;
                    
                    // Update stats
                    this.successfulRuns++;
                    this.globalStats.totalFloorsCleared++;
                    this.globalStats.totalGoldEarned += this.floorStats.goldEarned;
                    
                    return;
                }
                
                // Handle Vault victory differently (no dungeon layout)
                if (this.currentDungeon === 'vault') {
                    // Vault victory - award gold and XP
                    this.addLog('Vault conquered!', 'loot');
                    
                    // Award gold (200 per vault level)
                    const goldReward = this.vaultLevel * VAULT_KEY_CONFIG.GOLD_PER_LEVEL;
                    this.gold += goldReward;
                    this.floorStats.goldEarned += goldReward;
                    
                    // Award XP (200 per vault level, to ALL party members dead or alive)
                    const xpReward = this.vaultLevel * 200;
                    this.party.forEach(member => {
                        member.gainXP(xpReward);
                    });
                    
                    // Drop keystone at vault level
                    const keystone = this.rollKeystoneFromVault(this.vaultLevel);
                    
                    // Drop 3 guaranteed loot items at vault level
                    const vaultLoot = [];
                    const baseLootTable = ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'];
                    const lootTable = this.getFilteredLootTable(baseLootTable);
                    
                    for (let i = 0; i < 3; i++) {
                        // Skip if no valid items
                        if (lootTable.length === 0) continue;
                        
                        const type = lootTable[Math.floor(Math.random() * lootTable.length)];
                        
                        let rarity;
                        const roll = Math.random() * 100;
                        
                        if (roll < KEYSTONE_CONFIG.RARITY_BOOST.legendary) rarity = 'legendary';
                        else if (roll < KEYSTONE_CONFIG.RARITY_BOOST.legendary + KEYSTONE_CONFIG.RARITY_BOOST.epic) rarity = 'epic';
                        else rarity = 'rare';
                        
                        // Loot level in range: (vaultLevel * 5 + 3) to (vaultLevel * 5 + 5)
                        const minLevel = this.vaultLevel * 5 + 3;
                        const maxLevel = this.vaultLevel * 5 + 5;
                        const itemLevel = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
                        const item = new Item(type, rarity, itemLevel);
                        vaultLoot.push(item);
                        
                        if (!this.lootFilter[rarity] || item.level < this.lootFilter.minLevel) {
                            const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
                            const sellPrice = sellPrices[rarity] || 15;
                            this.gold += sellPrice;
                            this.floorStats.goldEarned += sellPrice;
                        } else {
                            this.loot.push(item);
                            this.floorStats.lootObtained++;
                            if (rarity === 'legendary') {
                                this.globalStats.legendariesFound++;
                                if (window.trackStat) window.trackStat('legendaryObtained');
                            }
                            if (rarity === 'mythic') {
                                if (window.trackStat) window.trackStat('mythicObtained');
                            }
                        }
                    }
                    
                    // Show epic vault victory screen
                    this.showVaultVictoryScreen(goldReward, xpReward, keystone, vaultLoot);
                    
                    // STEAM: Track vault completion achievements
                    if (window.trackStat) {
                        window.trackStat('vaultCompleted');
                        window.trackStat('keystoneObtained');
                        window.trackStat('goldEarned', goldReward);
                    }
                    
                    // Track vault boss kill for leaderboard
                    if (!this.dungeonProgress) this.dungeonProgress = {};
                    if (!this.dungeonProgress.vault) this.dungeonProgress.vault = { bossKills: 0 };
                    this.dungeonProgress.vault.bossKills++;
                    
                    // Update stats
                    this.successfulRuns++;
                    this.globalStats.totalFloorsCleared++;
                    this.globalStats.totalGoldEarned += this.floorStats.goldEarned;
                    
                    return;
                }
                    
                    // Only try to clear room if we have a dungeon layout (not in Vault)
                    let currentRoom = null;
                    if (this.dungeonLayout && this.dungeonLayout.getCurrentRoom) {
                        try {
                            currentRoom = this.dungeonLayout.getCurrentRoom();
                            if (currentRoom) {
                                currentRoom.cleared = true;
                            }
                        } catch (e) {
                            
                        }
                    }
                    
                    // Show loot if any was collected during battle
                    if (this.loot.length > 0) {
                        this.showLoot();
                    }
                    
                    // Only do room progression for normal dungeons (not Vault and only if we have a valid dungeon layout)
if (this.currentDungeon && this.currentDungeon !== 'vault' && this.dungeonLayout && currentRoom) {
    // Check if boss was defeated
    if (currentRoom.type === ROOM_TYPES.BOSS) {
        this.addLog('Boss defeated! Floor complete!', 'room');
        // FLOOR JUMPING FIX: Only schedule once guard
        if (!this._completeDungeonTimeout && !this._floorCompletionHandled) {
            this._completeDungeonTimeout = setTimeout(() => {
                this._completeDungeonTimeout = null;
                this.completeDungeon();
            }, 2000);
        }
    } else {
        // Auto-progress to next room after a delay ONLY if not moving already
        if (this.hasUnvisitedRooms() && !this.movingToNextRoom) {
            // FLOOR JUMPING FIX: Only schedule once guard
            if (!this._moveNextRoomTimeout) {
                this._moveNextRoomTimeout = setTimeout(() => {
                    this._moveNextRoomTimeout = null;
                    if (!this.movingToNextRoom && !this.inBattle && !this.transitioningFloor) {
                        this.moveToNextRoom();
                    }
                }, 2000);
            }
        } else if (!this.hasUnvisitedRooms()) {
            // All rooms cleared, go to next floor
            // FLOOR JUMPING FIX: Only schedule once guard
            if (!this._completeDungeonTimeout && !this._floorCompletionHandled) {
                this._completeDungeonTimeout = setTimeout(() => {
                    this._completeDungeonTimeout = null;
                    this.completeDungeon();
                }, 2000);
            }
        }
    }
    
    this.drawMinimap();
}
                } else {
                    // Show defeat for endless dungeon with custom summary
                    if (this.currentDungeon === 'endlessblessings') {
                        this.addLog('Party defeated!', 'damage');
                        // Show endless-specific summary after a delay
                        setTimeout(() => this.showEndlessSummary(), 2000);
                        return;
                    }
                    
                    // Show defeat for Pinnacle Boss
                    if (this.currentDungeon === 'pinnacle') {
                        this.addLog('Party defeated by the Pinnacle Boss!', 'damage');
                        // Clean up pinnacle timers
                        if (this.pinnacleMiniSpawnInterval) {
                            clearInterval(this.pinnacleMiniSpawnInterval);
                            this.pinnacleMiniSpawnInterval = null;
                        }
                        if (this.pinnacleMiniSpawnTimeout) {
                            clearTimeout(this.pinnacleMiniSpawnTimeout);
                            this.pinnacleMiniSpawnTimeout = null;
                        }
                        if (this.pinnacleEnrageInterval) {
                            clearInterval(this.pinnacleEnrageInterval);
                            this.pinnacleEnrageInterval = null;
                        }
                        setTimeout(() => this.showSummary(false), 2000);
                        return;
                    }
                    
                    this.addLog('Party defeated!', 'damage');
                    
                    // Update dungeon-specific progress based on gear score
                    if (this.currentDungeon && ['everfall', 'stoneforge', 'umbral'].includes(this.currentDungeon)) {
                        const progress = this.dungeonProgress[this.currentDungeon];
                        
                        // Calculate combined gear score (total level of all equipped items across all 4 characters)
                        const totalGearScore = this.party.reduce((total, member) => {
                            let memberGearScore = 0;
                            for (const slot in member.equipment) {
                                if (member.equipment[slot]) {
                                    memberGearScore += member.equipment[slot].level || 0;
                                }
                            }
                            return total + memberGearScore;
                        }, 0);
                        
                        // Update farthest floor reached
                        if (this.dungeonFloor > progress.farthestFloor) {
                            progress.farthestFloor = this.dungeonFloor;
                        }
                        
                        // Start floor remains as player selected (no automatic changes)
                        this.addLog(`💎 Gear Score: ${totalGearScore} - Best floor reached: ${progress.farthestFloor}`, 'heal');
                    }
                    
                    // Show defeat summary
                    setTimeout(() => this.showSummary(false), 2000);
                }
            }

respawnParty() {
    // Clean up vault timers first
    if (this.vaultSummonInterval) {
        clearInterval(this.vaultSummonInterval);
        this.vaultSummonInterval = null;
    }
    if (this.vaultSummonTimeout) {
        clearTimeout(this.vaultSummonTimeout);
        this.vaultSummonTimeout = null;
    }
    
    // Reset room label color
    const roomLabel = document.getElementById('room-label');
    if (roomLabel) {
        roomLabel.style.color = '';
    }
    
    // Track death
    this.globalStats.totalDeaths++;
    
    // Track gold earned even on failed floors
    this.globalStats.totalGoldEarned += this.floorStats.goldEarned;
    
    // Restore all party members to life with full HP and Mana
    this.party.forEach(member => {
        member.isAlive = true;
        member.hp = member.getTotalMaxHp();
        member.mana = member.getTotalMaxMana();
    });
    
    // On death, reset to dungeon's start floor (don't lose all progress)
    if (this.currentDungeon && this.dungeonProgress[this.currentDungeon]) {
        this.dungeonFloor = this.dungeonProgress[this.currentDungeon].startFloor;
    } else {
        this.dungeonFloor = 1;
    }
    document.getElementById('current-floor-display').textContent = this.dungeonFloor;
                
// If in Vault, show dungeon selector
                if (this.currentDungeon === 'vault') {
                    this.addLog('Party defeated in Vault!', 'damage');
                    
                    // Reset vault state and all flags
                    this.currentDungeon = null;
                    this.vaultLevel = null;
                    this.dungeonFloor = 1;
                    this.inBattle = false;
                    this.movingToNextRoom = false;
                    this.transitioningFloor = false;
                    
                    // Clear the current room and visual elements
                    this.room = null;
                    this.dungeonLayout = null;
                    this.enemies = [];
                    this.hallways = [];  // Clear ghost floors
                    this.adjacentRooms = [];  // Clear invisible rooms
                    
                    // Hide room label and reset color
                    const roomLabel = document.getElementById('room-label');
                    roomLabel.style.display = 'none';
                    roomLabel.style.color = '';
                    
                    // Show dungeon selector
                    setTimeout(() => {
                        this.showDungeonSelector();
                    }, 500);
                    return;
                }
                
                // If in Pinnacle, show dungeon selector
                if (this.currentDungeon === 'pinnacle') {
                    this.addLog('Party defeated by the Pinnacle Boss!', 'damage');
                    
                    // Clean up pinnacle timers
                    if (this.pinnacleMiniSpawnInterval) {
                        clearInterval(this.pinnacleMiniSpawnInterval);
                        this.pinnacleMiniSpawnInterval = null;
                    }
                    if (this.pinnacleMiniSpawnTimeout) {
                        clearTimeout(this.pinnacleMiniSpawnTimeout);
                        this.pinnacleMiniSpawnTimeout = null;
                    }
                    if (this.pinnacleEnrageInterval) {
                        clearInterval(this.pinnacleEnrageInterval);
                        this.pinnacleEnrageInterval = null;
                    }
                    
                    // Reset pinnacle state and all flags
                    this.currentDungeon = null;
                    this.dungeonFloor = 1;
                    this.inBattle = false;
                    this.movingToNextRoom = false;
                    this.transitioningFloor = false;
                    
                    // Clear the current room and visual elements
                    this.room = null;
                    this.dungeonLayout = null;
                    this.enemies = [];
                    this.hallways = [];
                    this.adjacentRooms = [];
                    
                    // Hide room label and reset color
                    const roomLabel2 = document.getElementById('room-label');
                    roomLabel2.style.display = 'none';
                    roomLabel2.style.color = '';
                    
                    // Show dungeon selector
                    setTimeout(() => {
                        this.showDungeonSelector();
                    }, 500);
                    return;
                }
                
                // If in Rune Trial, show dungeon selector
                if (this.currentDungeon === 'runetrial') {
                    this.addLog('Party defeated in Rune Trial!', 'damage');
                    
                    // Reset trial state and all flags
                    this.currentDungeon = null;
                    this.runeTrialTier = null;
                    this.dungeonFloor = 1;
                    this.inBattle = false;
                    this.movingToNextRoom = false;
                    this.transitioningFloor = false;
                    
                    // Clear the current room and visual elements
                    this.room = null;
                    this.dungeonLayout = null;
                    this.enemies = [];
                    this.hallways = [];  // Clear ghost floors
                    this.adjacentRooms = [];  // Clear invisible rooms
                    
                    // Hide room label and reset color
                    const roomLabel = document.getElementById('room-label');
                    roomLabel.style.display = 'none';
                    roomLabel.style.color = '';
                    
                    // Show dungeon selector
                    setTimeout(() => {
                        this.showDungeonSelector();
                    }, 500);
                    return;
                }
                
                this.addLog('Party respawns...', 'room');
                
                // Reset transition flag before generating new dungeon
                this.transitioningFloor = false;
                
                // Continue with the same dungeon automatically
                setTimeout(() => {
                    this.generateDungeon();
                }, 500);
            }

rollEnemyLoot(enemy) {
    // Bombers don't drop loot
    if (enemy.isBomber) return [];
    
    const isBoss = enemy.isBoss;
                const isVaultBoss = enemy.isVaultBoss;
                
                if (isVaultBoss) {
                    const baseLootTable = ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'];
                    const lootTable = this.getFilteredLootTable(baseLootTable);
                    
                    for (let i = 0; i < 3; i++) {
                        // Skip if no valid items
                        if (lootTable.length === 0) continue;
                        
                        const type = lootTable[Math.floor(Math.random() * lootTable.length)];
                        
                        let rarity;
                        const roll = Math.random() * 100;
                        
                        if (roll < KEYSTONE_CONFIG.RARITY_BOOST.legendary) rarity = 'legendary';
                        else if (roll < KEYSTONE_CONFIG.RARITY_BOOST.legendary + KEYSTONE_CONFIG.RARITY_BOOST.epic) rarity = 'epic';
                        else rarity = 'rare';
                        
                        // Loot level in range: (vaultLevel * 5 + 3) to (vaultLevel * 5 + 5)
                        const minLevel = this.vaultLevel * 5 + 3;
                        const maxLevel = this.vaultLevel * 5 + 5;
                        const itemLevel = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
                        const item = new Item(type, rarity, itemLevel);
                        
                        if (!this.lootFilter[rarity]) {
                            const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
                            const sellPrice = sellPrices[rarity] || 5;
                            this.gold += sellPrice;
                            this.floorStats.goldEarned += sellPrice;
                            this.updateUI();
                            this.addLog(`Auto-sold ${rarity} item for ${sellPrice}g (filtered)`, 'loot');
                            continue;
                        }
                        
                        this.loot.push(item);
                        this.floorStats.lootObtained++;
                        
                        // Show exciting loot popup!
                        this.showLootPopup(item);
                        
                        if (rarity === 'legendary') {
                            this.globalStats.legendariesFound++;
                            if (window.trackStat) window.trackStat('legendaryObtained');
                        }
                        if (rarity === 'mythic') {
                            if (window.trackStat) window.trackStat('mythicObtained');
                        }
                        this.addLog(`Vault Guardian drops ${item.name}!`, 'loot');
                    }
                    return;
                }
                
                // Handle Pinnacle Boss death
                if (enemy.isPinnacleBoss) {
                    // Create a Pinnacle weapon drop
                    const weaponTypes = ['dagger', 'greatsword', 'wand', 'staff', 'bow', 'warhammer'];
                    const randomWeapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                    
                    // Create the Pinnacle item
                    const pinnacleItem = this.createPinnacleItem(randomWeapon);
                    
                    // Add to inventory
                    this.inventory.push(pinnacleItem);
                    
                    // Awards
                    const goldReward = 50000;
                    const xpReward = 100000;
                    
                    this.gold += goldReward;
                    this.floorStats.goldEarned += goldReward;
                    
                    // Grant XP to party
                    this.party.forEach(member => {
                        if (member && member.isAlive) {
                            member.gainXP(Math.floor(xpReward / this.party.length));
                        }
                    });
                    
                    // Show victory screen
                    setTimeout(() => {
                        this.showPinnacleVictoryScreen(goldReward, xpReward, pinnacleItem);
                    }, 1500);
                    
                    this.addLog(`👑 PINNACLE BOSS DEFEATED! You obtained ${pinnacleItem.name}!`, 'legendary');
                    return;
                }
                
                let shouldDrop = false;
                
                if (isBoss) {
                    // Bosses always drop exactly 1 item
                    shouldDrop = true;
                } else {
                    // Non-boss enemies have 5% drop chance
                    shouldDrop = Math.random() < 0.05;
            }
            
            if (shouldDrop) {
                // Check for Mythic drop from Treasure Guardian (0.1% chance)
                const isMythicDrop = enemy.name === 'Treasure Guardian' && Math.random() < 0.001;
                
                // Get loot table for current dungeon
                const baseLootTable = this.dungeonLootTables[this.currentDungeon];
                const lootTable = this.getFilteredLootTable(baseLootTable);
                
                // If no valid items can drop, skip loot generation
                if (lootTable.length === 0) return;
                
                const type = lootTable[Math.floor(Math.random() * lootTable.length)];
                
                let rarity;
                const roll = Math.random() * 100; // 0-100 for percentage
                
                // Determine item level - bosses drop +1 level items, mythics drop +5 levels
                const itemLevel = isMythicDrop ? this.dungeonFloor + 5 : (isBoss ? this.dungeonFloor + 1 : this.dungeonFloor);
                
                if (isMythicDrop) {
                    // Force mythic rarity
                    rarity = 'mythic';
                } else if (isBoss) {
                        // Boss rarity distribution
                        if (roll < 30) rarity = 'common';
                        else if (roll < 60) rarity = 'uncommon';
                        else if (roll < 90) rarity = 'rare';
                        else if (roll < 99) rarity = 'epic';
                        else rarity = 'legendary'; // 1%
                    } else {
    // Non-boss rarity distribution - improves slightly with floor
    const floorBonus = Math.min(this.dungeonFloor * 0.2, 20); // Up to +20% at floor 100
    
    // Common drops less, uncommon drops more
    if (roll < (69.9 - floorBonus)) rarity = 'common';
    else if (roll < 89.9) rarity = 'uncommon';
    else if (roll < 97.9) rarity = 'rare';
    else if (roll < 99.9) rarity = 'epic';
    else rarity = 'legendary';
}
                    
                    // Check if this rarity is filtered out
                    if (!this.lootFilter[rarity]) {
                        // Auto-sell filtered items
                        const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
                        const sellPrice = sellPrices[rarity] || 5;
                        this.gold += sellPrice;
                        this.floorStats.goldEarned += sellPrice;
                        this.updateUI();
                        this.addLog(`Auto-sold ${rarity} item for ${sellPrice}g (rarity filtered)`, 'loot');
                        return;
                    }
                    
const item = new Item(type, rarity, itemLevel);

// Check if item level is below minimum
if (item.level < this.lootFilter.minLevel) {
    const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
    const sellPrice = sellPrices[rarity] || 5;
    this.gold += sellPrice;
    this.floorStats.goldEarned += sellPrice;
    this.updateUI();
    this.addLog(`Auto-sold level ${item.level} item for ${sellPrice}g (level filtered)`, 'loot');
    return;
}

this.loot.push(item);
this.floorStats.lootObtained++; // Track loot

// Show exciting loot popup!
this.showLootPopup(item);

if (rarity === 'legendary') {
    this.globalStats.legendariesFound++;
    // STEAM: Track legendary find achievement
    if (window.trackStat) window.trackStat('legendaryObtained');
}
if (rarity === 'mythic') {
    // STEAM: Track mythic find achievement
    if (window.trackStat) window.trackStat('mythicObtained');
    // Submit to leaderboard on mythic find (rare event)
    if (window.submitToLeaderboard) window.submitToLeaderboard();
}

// Track loot for Divine Arena summary
if (this.currentDungeon === 'endlessblessings' && this.endlessRunLoot) {
    this.endlessRunLoot.push(item);
}

// Auto-sell lowest gear score item if loot exceeds 50 items
if (this.loot.length > 50) {
    this.autoSellLowestGearScore();
}

this.addLog(`${enemy.name} drops ${item.name}!`, 'loot');
                }
            }

            showLoot() {
    // Hide any visible tooltips
    const lootTooltip = document.getElementById('loot-tooltip');
    if (lootTooltip) lootTooltip.classList.remove('show');
    
    const container = document.getElementById('loot-container');
    
    // Create array with items and their original indices
    let sortedLoot = this.loot.map((item, index) => ({ item, index }));
    
    if (this.lootSortBy.length > 0) {
        sortedLoot.sort((a, b) => {
            const rarityOrder = { 'common': 0, 'uncommon': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'mythic': 5, 'pinnacle': 6 };
            const typeOrder = { 'weapon': 0, 'helmet': 1, 'chest': 2, 'gloves': 3, 'boots': 4, 'belt': 5, 'amulet': 6, 'ring': 7 };
            
            // Helper to get rarity score (perfect mythics get higher score)
            const getRarityScore = (item) => {
                let score = rarityOrder[item.rarity] || 0;
                if (item.rarity === 'mythic' && item.mythicStats && item.mythicStats.length === 4) {
                    score += 0.5; // Perfect mythics rank higher
                }
                return score;
            };
            
            // Apply sorts in priority order based on which are active
            for (const filter of this.lootSortBy) {
                if (filter === 'type') {
                    const diff = (typeOrder[a.item.type] !== undefined ? typeOrder[a.item.type] : 99) - (typeOrder[b.item.type] !== undefined ? typeOrder[b.item.type] : 99);
                    if (diff !== 0) return diff;
                } else if (filter === 'rarity') {
                    const diff = getRarityScore(b.item) - getRarityScore(a.item);
                    if (diff !== 0) return diff;
                } else if (filter === 'level') {
                    const diff = b.item.level - a.item.level;
                    if (diff !== 0) return diff;
                }
            }
            
            return 0;
        });
    }
    
    if (sortedLoot.length === 0) {
        container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No loot available</div>';
        return;
    }
    
    // Proper cleanup of old elements and listeners
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
                
                sortedLoot.forEach(({ item, index: i }) => {
                    const div = document.createElement('div');
                    div.className = `loot-item ${item.rarity}`;
                    div.style.borderColor = this.getRarityColor(item.rarity);
                    
                    const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
                    const sellPrice = sellPrices[item.rarity] || 5;
                    
                    div.innerHTML = `
                        <div style="font-size: 13px; font-weight: 600; margin-bottom: 3px; line-height: 1.2;">${item.name}</div>
                        <div style="font-size: 10px; color: #e2e8f0; line-height: 1.4; margin-bottom: 6px; font-weight: 500;">${item.getStatsDisplay()}</div>
                        <div class="loot-item-actions">
                            <select class="loot-item-select" style="flex: 2; padding: 4px 6px; background: rgba(30, 41, 59, 0.9); color: #e2e8f0; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; font-family: 'Rajdhani', sans-serif; font-size: 10px; cursor: pointer;">
                                <option value="auto">Auto-Equip Best</option>
                                ${this.party.map((m, idx) => `<option value="${idx}">${m.name}${!m.isAlive ? ' (Dead)' : ''}</option>`).join('')}
                            </select>
                            <button class="loot-item-btn equip-btn" style="flex: 1;">Equip</button>
                            <button class="loot-item-btn sell-btn" style="flex: 1;">Sell ${sellPrice}g</button>
                        </div>
                    `;
                    
                    
// Track dropdown changes for tooltip stability
                    div.querySelector('.loot-item-select').addEventListener('change', (e) => {
                        div._lastSelectedValue = e.target.value;
                    });
                    
// Equip button
div.querySelector('.equip-btn').onclick = (e) => {
    e.stopPropagation();
    const selectedChar = div._lastSelectedValue || div.querySelector('.loot-item-select').value;
    if (selectedChar === 'auto') {
        this.equipItem(item, i);
    } else {
        this.equipItemToCharacter(item, i, parseInt(selectedChar));
    }
};
                    
                    // Sell button
                    div.querySelector('.sell-btn').onclick = (e) => {
                        e.stopPropagation();
                        this.sellItem(item, i, 'loot');
                    };
                    
                    // Add comparison tooltip
                    div.addEventListener('mouseenter', (e) => {
                        this.showLootComparison(item, e);
                    });
                    
                    div.addEventListener('mouseleave', () => {
                        document.getElementById('loot-tooltip').classList.remove('show');
                    });
                    
                    container.appendChild(div);
                });
                
                // Add event listeners to equip buttons
                document.querySelectorAll('[data-keystone-index]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const index = parseInt(btn.getAttribute('data-keystone-index'));
                        this.equipKeystone(index);
                    });
                });
                
                // Add event listeners to sell buttons
        document.querySelectorAll('[data-sell-keystone]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-sell-keystone'));
                this.sellKeystone(index);
            });
        });

        // Add tooltip event listeners for all keystone icons
        document.querySelectorAll('.keystone-icon[data-keystone-info]').forEach(icon => {
            icon.addEventListener('mouseenter', (e) => {
                const data = JSON.parse(icon.getAttribute('data-keystone-info'));
                this.showKeystoneTooltip(data, e);
            });

            icon.addEventListener('mouseleave', () => {
                document.getElementById('equipment-tooltip').classList.remove('show');
            });
        });
    }calculateGearScore(item) {
                let score = 0;
                
                // Base score from item level (1 point per level)
                score += item.level;
                
                // Rarity multipliers
                const rarityScores = {
                    common: 1,
                    uncommon: 2,
                    rare: 3,
                    epic: 4,
                    legendary: 6,
                    mythic: 10,
                    pinnacle: 15
                };
                score *= (rarityScores[item.rarity] || 1);
                
                // Add stat values
                const statProps = ['attack', 'attackSpeed', 'hp', 'mana', 'defense', 'critChance', 'critDamage', 'dodgeChance', 'lifesteal', 'hpRegen', 'manaRegen', 'cdr'];
                statProps.forEach(stat => {
                    if (item[stat]) {
                        score += item[stat];
                    }
                });
                
                return Math.floor(score);
            }
            
            autoSellLowestGearScore() {
                if (this.loot.length === 0) return;
                
                // Calculate gear scores for all items
                const itemsWithScores = this.loot.map((item, index) => ({
                    item: item,
                    index: index,
                    score: this.calculateGearScore(item)
                }));
                
                // Sort by gear score (lowest first)
                itemsWithScores.sort((a, b) => a.score - b.score);
                
                // Get the lowest gear score item
                const lowestItem = itemsWithScores[0];
                const sellPrices = {
                    common: 5,
                    uncommon: 10,
                    rare: 15,
                    epic: 20,
                    legendary: 25,
                    mythic: 10000
                };
                const sellPrice = sellPrices[lowestItem.item.rarity] || 5;
                
                // Remove from loot array
                this.loot.splice(lowestItem.index, 1);
                
                // Add gold
                this.gold += sellPrice;
                
                this.addLog(`Auto-sold ${lowestItem.item.name} for ${sellPrice}g (lowest gear score: ${lowestItem.score})`, 'loot');
                this.updateUI();
            }
generateRuneTabs() {
    const container = document.getElementById('rune-char-tabs-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const charImages = {
        tank: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/tank.png',
        healer: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/healer.png',
        mage: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/mage.png',
        rogue: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/rogue.png',
        archer: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/archer.png',
        paladin: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/paladin.png'
    };
    
    // Generate tabs for each party member
    this.party.forEach((char, index) => {
        const charType = char.className.toLowerCase();
        const button = document.createElement('button');
        button.className = 'rune-char-tab' + (index === 0 ? ' active' : '');
        button.setAttribute('data-rune-char', charType);
        button.innerHTML = `<img src="${charImages[charType]}" alt="${char.className}">`;
        container.appendChild(button);
    });
    
    // Setup event listeners for the new tabs
    document.querySelectorAll('.rune-char-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            document.querySelectorAll('.rune-char-tab').forEach(t => t.classList.remove('active'));
            
            // Activate clicked tab
            tab.classList.add('active');
            const charType = tab.getAttribute('data-rune-char');
            this.showRunesForCharacter(charType);
        });
    });
}
showKeystones() {
    // Hide any visible tooltips
    const lootTooltip = document.getElementById('loot-tooltip');
    if (lootTooltip) lootTooltip.classList.remove('show');
    const equipTooltip = document.getElementById('equipment-tooltip');
    if (equipTooltip) equipTooltip.classList.remove('show');
    
    // Update slots display
    const slotsGrid = document.getElementById('keystone-slots-grid');
    if (slotsGrid) {
        slotsGrid.innerHTML = '';
        
        // Only show slots for characters in the party
        const slotTypes = this.party.map(char => char.className.toLowerCase());
        const slotIcons = { tank: '🛡️', healer: '💊', mage: '🔮', rogue: '🗡️', archer: '🏹', paladin: '⚔️' };
        const slotNames = { tank: 'Tank', healer: 'Healer', mage: 'Mage', rogue: 'Rogue', archer: 'Archer', paladin: 'Paladin' };
        
        slotTypes.forEach(type => {
            const slotDiv = document.createElement('div');
            const isUnlocked = this.keystoneSlots[type];
            const equipped = this.equippedKeystones[type];

            slotDiv.style.cssText = 'background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 10px; text-align: center;';

            if (!equipped) {
                slotDiv.innerHTML = `
                    <div class="keystone-icon empty"></div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 5px;">${slotNames[type]}</div>
                    <div style="font-size: 9px; color: #64748b;">Empty</div>
                `;
            } else {
                const keystoneData = {
                    name: equipped.name,
                    ability: equipped.ability.name,
                    description: equipped.ability.description,
                    cooldown: equipped.ability.cooldown,
                    manaCost: equipped.ability.manaCost,
                    stats: equipped.getStatsDisplay(),
                    rarity: equipped.rarity
                };
                
                // Helper to derive internalName from keystoneName if missing
                const getInternalNameEquipped = (ks) => {
                    if (ks.internalName) return ks.internalName;
                    const nameMap = {
                        "Warden's Aegis": 'wardens-aegis',
                        "Berserker's Pact": 'berserkers-pact',
                        "Earthshaker's Resolve": 'earthshakers-resolve',
                        "Arcanist's Conduit": 'arcanists-conduit',
                        "Martyr's Blessing": 'martyrs-blessing',
                        "Phoenix Heart": 'phoenix-heart',
                        "Winter's Wrath": 'winters-wrath',
                        "Voidwalker's Gift": 'voidwalkers-gift',
                        "Timeweaver's Paradox": 'timeweavers-paradox',
                        "Assassin's Mark": 'assassins-mark',
                        "Shadow Dancer": 'shadow-dancer',
                        "Serpent's Venom": 'serpents-venom',
                        "Hawkeye's Precision": 'hawkeyes-precision',
                        "Rapid Quiver": 'rapid-quiver',
                        "Hunter's Focus": 'hunters-focus',
                        "Holy Avenger": 'holy-avenger',
                        "Divine Guardian": 'divine-guardian',
                        "Righteous Fury": 'righteous-fury'
                    };
                    return nameMap[ks.keystoneName] || 'empty';
                };
                const safeInternalName = getInternalNameEquipped(equipped);
                
                slotDiv.innerHTML = `
                    <div class="keystone-icon ${safeInternalName} rarity-${equipped.rarity}"></div>
                    <div style="font-size: 10px; color: #f59e0b; font-weight: 600;">Lvl ${equipped.level}</div>
                    <div style="font-size: 9px; color: #94a3b8;">${equipped.ability.name}</div>
                    <button class="unequip-keystone-btn" data-keystone-type="${type}" style="margin-top: 5px; padding: 3px 8px; font-size: 9px; background: #ef4444; border: none; border-radius: 4px; color: white; cursor: pointer;">Unequip</button>
                `;
                
                // Add tooltip listener directly to the icon after adding to DOM
                const icon = slotDiv.querySelector('.keystone-icon');
                icon.addEventListener('mouseenter', (e) => {
                    this.showKeystoneTooltip(keystoneData, e);
                });
                icon.addEventListener('mouseleave', () => {
                    document.getElementById('equipment-tooltip').classList.remove('show');
                });
            }
            
            slotsGrid.appendChild(slotDiv);
        });
        
        // Add unequip event listeners
        document.querySelectorAll('.unequip-keystone-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-keystone-type');
                this.unequipKeystone(type);
            });
        });
    }
    
    // Update inventory display
    const container = document.getElementById('keystone-list');
    if (!container) return;
    
    // Proper cleanup of old elements and listeners
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Initialize keystone filter state if needed
    if (!this._keystoneFilterClass) this._keystoneFilterClass = 'all';
    if (!this._keystoneFilterRarity) this._keystoneFilterRarity = 'all';
    
    // Add filter/sort controls (always visible, even with empty inventory)
    const filterBar = document.createElement('div');
    filterBar.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;';
    
    const selectStyle = 'background: rgba(30, 41, 59, 0.9); color: #e2e8f0; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-family: inherit; cursor: pointer; outline: none;';
    
    filterBar.innerHTML = `
        <select id="keystone-filter-class" style="${selectStyle}">
            <option value="all" ${this._keystoneFilterClass === 'all' ? 'selected' : ''}>All Classes</option>
            <option value="tank" ${this._keystoneFilterClass === 'tank' ? 'selected' : ''}>Tank</option>
            <option value="healer" ${this._keystoneFilterClass === 'healer' ? 'selected' : ''}>Healer</option>
            <option value="mage" ${this._keystoneFilterClass === 'mage' ? 'selected' : ''}>Mage</option>
            <option value="rogue" ${this._keystoneFilterClass === 'rogue' ? 'selected' : ''}>Rogue</option>
            <option value="archer" ${this._keystoneFilterClass === 'archer' ? 'selected' : ''}>Archer</option>
            <option value="paladin" ${this._keystoneFilterClass === 'paladin' ? 'selected' : ''}>Paladin</option>
        </select>
        <select id="keystone-filter-rarity" style="${selectStyle}">
            <option value="all" ${this._keystoneFilterRarity === 'all' ? 'selected' : ''}>All Rarities</option>
            <option value="common" ${this._keystoneFilterRarity === 'common' ? 'selected' : ''}>Common</option>
            <option value="uncommon" ${this._keystoneFilterRarity === 'uncommon' ? 'selected' : ''}>Uncommon</option>
            <option value="rare" ${this._keystoneFilterRarity === 'rare' ? 'selected' : ''}>Rare</option>
            <option value="epic" ${this._keystoneFilterRarity === 'epic' ? 'selected' : ''}>Epic</option>
            <option value="legendary" ${this._keystoneFilterRarity === 'legendary' ? 'selected' : ''}>Legendary</option>
        </select>
        <span style="font-size: 9px; color: #64748b; margin-left: auto;">Sort: Class › Type › Rarity › Level</span>
    `;
    container.appendChild(filterBar);
    
    // Add filter event listeners
    const classFilter = filterBar.querySelector('#keystone-filter-class');
    const rarityFilter = filterBar.querySelector('#keystone-filter-rarity');
    classFilter.addEventListener('change', () => {
        this._keystoneFilterClass = classFilter.value;
        this.showKeystones();
    });
    rarityFilter.addEventListener('change', () => {
        this._keystoneFilterRarity = rarityFilter.value;
        this.showKeystones();
    });
    
    if (this.keystones.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'color: #888; text-align: center; padding: 20px;';
        emptyMsg.textContent = 'No keystones found';
        container.appendChild(emptyMsg);
        return;
    }
    
    // Filter keystones
    let filteredKeystones = this.keystones.map((ks, i) => ({ keystone: ks, originalIndex: i }));
    
    if (this._keystoneFilterClass !== 'all') {
        filteredKeystones = filteredKeystones.filter(k => k.keystone.type === this._keystoneFilterClass);
    }
    if (this._keystoneFilterRarity !== 'all') {
        filteredKeystones = filteredKeystones.filter(k => k.keystone.rarity === this._keystoneFilterRarity);
    }
    
    // Sort: Class > Type (ability name) > Rarity > Level
    const classOrder = ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'];
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    
    filteredKeystones.sort((a, b) => {
        const classA = classOrder.indexOf(a.keystone.type);
        const classB = classOrder.indexOf(b.keystone.type);
        if (classA !== classB) return classA - classB;
        
        const typeA = (a.keystone.ability?.name || a.keystone.keystoneName || '').toLowerCase();
        const typeB = (b.keystone.ability?.name || b.keystone.keystoneName || '').toLowerCase();
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        
        const rarA = rarityOrder.indexOf(a.keystone.rarity);
        const rarB = rarityOrder.indexOf(b.keystone.rarity);
        if (rarA !== rarB) return rarB - rarA; // Higher rarity first
        
        return (b.keystone.level || 0) - (a.keystone.level || 0); // Higher level first
    });
    
    if (filteredKeystones.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'color: #888; text-align: center; padding: 20px;';
        emptyDiv.textContent = 'No keystones match filters';
        container.appendChild(emptyDiv);
    }
    
    filteredKeystones.forEach(({ keystone, originalIndex }) => {
        const index = originalIndex;
        const div = document.createElement('div');
        div.className = `loot-item ${keystone.rarity}`;
        div.setAttribute('data-keystone-id', keystone.name + keystone.level + keystone.type); // Unique ID
        
        const typeIcons = { tank: '🛡️', healer: '💊', mage: '🔮', rogue: '🗡️', archer: '🏹', paladin: '⚔️' };
        const typeNames = { tank: 'Tank', healer: 'Healer', mage: 'Mage', rogue: 'Rogue', archer: 'Archer', paladin: 'Paladin' };
        const typeColors = {
            tank: '#6b7280',
            healer: '#10b981',
            mage: '#52525b',
            rogue: '#ef4444',
            archer: '#f59e0b',
            paladin: '#3b82f6'
        };
        
        // Helper to derive internalName from keystoneName if missing
        const getInternalName = (ks) => {
            if (ks.internalName) return ks.internalName;
            // Try to derive from keystoneName
            const nameMap = {
                "Warden's Aegis": 'wardens-aegis',
                "Berserker's Pact": 'berserkers-pact',
                "Earthshaker's Resolve": 'earthshakers-resolve',
                "Arcanist's Conduit": 'arcanists-conduit',
                "Martyr's Blessing": 'martyrs-blessing',
                "Phoenix Heart": 'phoenix-heart',
                "Winter's Wrath": 'winters-wrath',
                "Voidwalker's Gift": 'voidwalkers-gift',
                "Timeweaver's Paradox": 'timeweavers-paradox',
                "Assassin's Mark": 'assassins-mark',
                "Shadow Dancer": 'shadow-dancer',
                "Serpent's Venom": 'serpents-venom',
                "Hawkeye's Precision": 'hawkeyes-precision',
                "Rapid Quiver": 'rapid-quiver',
                "Hunter's Focus": 'hunters-focus',
                "Holy Avenger": 'holy-avenger',
                "Divine Guardian": 'divine-guardian',
                "Righteous Fury": 'righteous-fury'
            };
            return nameMap[ks.keystoneName] || 'empty';
        };
        
        const safeInternalName = getInternalName(keystone);
        
        div.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
                <div class="keystone-icon ${safeInternalName} rarity-${keystone.rarity}" style="width: 50px; height: 50px; flex-shrink: 0;" data-keystone-info='${JSON.stringify({
                    name: keystone.name,
                    ability: keystone.ability.name,
                    description: keystone.ability.description,
                    cooldown: keystone.ability.cooldown,
                    manaCost: keystone.ability.manaCost,
                    stats: keystone.getStatsDisplay(),
                    rarity: keystone.rarity
                })}'></div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: ${this.getRarityColor(keystone.rarity)};">
                        ${keystone.name}
                    </div>
                    <div style="display: inline-block; padding: 2px 8px; background: ${typeColors[keystone.type]}; border-radius: 4px; font-size: 10px; font-weight: 600; color: #fff; margin-top: 4px;">
                        ${typeIcons[keystone.type]} ${typeNames[keystone.type]}
                    </div>
                </div>
            </div>
            <div style="font-size: 11px; color: #f59e0b; margin-bottom: 6px; font-weight: 600;">
                ${keystone.ability.name} (${keystone.ability.cooldown}s CD | ${keystone.ability.manaCost === 0 ? '<span style="color: #10b981;">Free</span>' : keystone.ability.manaCost + ' Mana'})
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px;">
                ${keystone.ability.description}
            </div>
            <div style="font-size: 11px; color: #e2e8f0; margin-bottom: 8px;">
                ${keystone.getStatsDisplay()}
            </div>
            <div class="loot-item-actions">
                <button class="loot-item-btn equip-btn" data-keystone-index="${index}" ${this.equippedKeystones[keystone.type] ? 'disabled' : ''}>
                    Equip
                </button>
                <button class="loot-item-btn sell-btn" data-sell-keystone="${index}">
                    Sell ${keystone.getSellPrice()}g
                </button>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    // Add event listeners to equip buttons
    document.querySelectorAll('[data-keystone-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-keystone-index'));
            this.equipKeystone(index);
        });
    });
    
    // Add event listeners to sell buttons
    document.querySelectorAll('[data-sell-keystone]').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-sell-keystone'));
            this.sellKeystone(index);
        });
    });
    
    // Add hover tooltips to keystone icons in inventory
    document.querySelectorAll('.keystone-icon[data-keystone-info]').forEach(icon => {
        icon.addEventListener('mouseenter', (e) => {
            const keystoneData = JSON.parse(icon.getAttribute('data-keystone-info'));
            this.showKeystoneTooltip(keystoneData, e);
        });
        icon.addEventListener('mouseleave', () => {
            document.getElementById('equipment-tooltip').classList.remove('show');
        });
    });
}

showKeystoneTooltip(data, event) {
                const tooltip = document.getElementById('equipment-tooltip');
                
                let tooltipHTML = `
                    <div class="tooltip-header ${data.rarity}">${data.name}</div>
                    <div class="tooltip-stats">
                        <div style="font-weight: 700; color: #f59e0b; margin-bottom: 8px; font-size: 13px;">
                            ${data.ability}
                        </div>
                        <div style="color: #94a3b8; margin-bottom: 8px; font-size: 12px; line-height: 1.4;">
                            ${data.description}
                        </div>
                        <div style="color: #a855f7; margin-bottom: 8px; font-size: 11px;">
                            Cooldown: ${data.cooldown}s | Mana Cost: ${data.manaCost === 0 ? '<span style="color: #10b981;">Free</span>' : data.manaCost}
                        </div>
                `;
                
                if (data.stats && data.stats !== 'No stats') {
                    tooltipHTML += `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(99, 102, 241, 0.3);">
                            <div style="color: #e2e8f0; font-size: 11px;">
                                ${data.stats}
                            </div>
                        </div>
                    `;
                }
                
                tooltipHTML += `</div>`;
                
                tooltip.innerHTML = tooltipHTML;
                tooltip.classList.add('show');
                
                // Position tooltip
                const rect = event.target.getBoundingClientRect();
                const tooltipWidth = 300;
                const tooltipHeight = 200;
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;

                if (rect.right + tooltipWidth + 10 > screenWidth) {
                    tooltip.style.left = `${rect.left - tooltipWidth - 10}px`;
                } else {
                    tooltip.style.left = `${rect.right + 10}px`;
                }

                if (rect.bottom + tooltipHeight + 10 > screenHeight) {
                    tooltip.style.top = `${rect.top - tooltipHeight - 10}px`;
                } else {
                    tooltip.style.top = `${rect.top}px`;
                }
            }

            equipKeystone(index) {
                const keystone = this.keystones[index];
                if (!keystone) return;
                
                // ... rest of equipKeystone function continues here
    
    // Check if slot already has keystone
    if (this.equippedKeystones[keystone.type]) {
        this.addLog(`${keystone.type} slot already has a keystone equipped!`, 'damage');
        return;
    }
    
    // Equip keystone
    this.equippedKeystones[keystone.type] = keystone;
    this.keystones.splice(index, 1);
    
    // Apply keystone stats to the corresponding character
    const member = this.party.find(m => m.className.toLowerCase() === keystone.type);
    if (member && keystone.stats) {
        // Store current HP/Mana percentages
        const hpPercent = member.hp / member.maxHp;
        const manaPercent = member.mana / member.maxMana;
        
        // Apply stats
        for (const [stat, value] of Object.entries(keystone.stats)) {
            if (stat === 'hp') {
                member.maxHp += value;
            } else if (stat === 'mana') {
                member.maxMana += value;
            } else if (stat === 'attack') {
                member.attack += value;
            } else if (stat === 'defense') {
                member.defense += value;
            } else if (stat === 'attackSpeed') {
                member.attackSpeed += value / 100;
            } else if (stat === 'critChance') {
                member.critChance += value;
            } else if (stat === 'critDamage') {
                member.critDamage += value;
            } else if (stat === 'dodge') {
                member.dodgeChance += value;
            } else if (stat === 'lifesteal') {
                member.lifesteal += value;
            } else if (stat === 'hpRegen') {
                member.hpRegen += value;
            } else if (stat === 'manaRegen') {
                member.manaRegen += value;
            } else if (stat === 'cdr') {
                member.cdr += value;
            }
        }
        
        // Restore HP/Mana percentages
        member.hp = Math.floor(member.maxHp * hpPercent);
        member.mana = Math.floor(member.maxMana * manaPercent);
    }
    
    this.addLog(`Equipped ${keystone.name}!`, 'loot');
    this.rebuildUI();
    this.showKeystones();
}            
            
            showRunesForCharacter(charType) {
                const slotsGrid = document.getElementById('rune-slots-grid');
                const runeList = document.getElementById('rune-list');
                
                if (!slotsGrid || !runeList) return;
                
                // Debug: Log current state
                
                
                // Clear existing content
                slotsGrid.innerHTML = '';
                runeList.innerHTML = '';
                
                // Show equipped rune slots
                for (let i = 0; i < 5; i++) {
                    const slotDiv = document.createElement('div');
                    const isUnlocked = this.runeSlots[charType][i];
                    const equippedRune = this.equippedRunes[charType][i];
                    
                    if (i === 4) {
                        slotDiv.style.gridColumn = '1 / -1';
                    }
                    
                    if (!isUnlocked) {
                        slotDiv.style.cssText = (i === 4 ? 'grid-column: 1 / -1; ' : '') + 'background: rgba(30, 41, 59, 0.6); border: 2px dashed rgba(100, 116, 139, 0.3); border-radius: 8px; padding: 12px; text-align: center;';
                        slotDiv.innerHTML = `
                            <div style="font-size: 28px; margin-bottom: 5px; opacity: 0.3;">?</div>
                            <div style="font-size: 9px; color: #64748b;">Slot ${i + 1}</div>
                            <div style="font-size: 8px; color: #475569; margin-top: 3px;">Unlock in Skill Tree</div>
                        `;
                    } else if (!equippedRune) {
                        slotDiv.style.cssText = (i === 4 ? 'grid-column: 1 / -1; ' : '') + 'background: rgba(30, 41, 59, 0.6); border: 2px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 12px; text-align: center; cursor: pointer;';
                        slotDiv.innerHTML = `
                            <div style="font-size: 28px; margin-bottom: 5px; color: #a855f7;">💎</div>
                            <div style="font-size: 9px; color: #a855f7;">Slot ${i + 1}</div>
                            <div style="font-size: 8px; color: #94a3b8; margin-top: 3px;">Empty</div>
                        `;
                    } else {
                        slotDiv.style.cssText = (i === 4 ? 'grid-column: 1 / -1; ' : '') + 'background: rgba(168, 85, 247, 0.15); border: 2px solid #a855f7; border-radius: 8px; padding: 10px; text-align: center;';
                        slotDiv.innerHTML = `
                            <div style="font-size: 11px; font-weight: 700; color: ${this.getRarityColor(equippedRune.rarity)}; margin-bottom: 3px;">${equippedRune.name}</div>
                            <div style="font-size: 9px; color: #e2e8f0; margin-bottom: 5px;">${equippedRune.getStatsDisplay()}</div>
                            <button class="unequip-rune-btn" data-char="${charType}" data-slot="${i}" style="padding: 3px 10px; font-size: 8px; background: #ef4444; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: 600;">Unequip</button>
                        `;
                    }
                    
                    slotsGrid.appendChild(slotDiv);
                }
                
                // Add unequip event listeners
                document.querySelectorAll('.unequip-rune-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const char = btn.getAttribute('data-char');
                        const slot = parseInt(btn.getAttribute('data-slot'));
                        this.unequipRune(char, slot);
                    });
                });
                
                // Show rune inventory
                if (this.runes.length === 0) {
                    runeList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 30px; font-size: 12px; font-style: italic;">No Runes found<br><span style="font-size: 10px;">Unlock Rune Slots in the Skill Tree</span></div>';
                    return;
                }
                
                this.runes.forEach((rune, index) => {
                    const div = document.createElement('div');
                    div.className = `loot-item ${rune.rarity}`;
                    
                    // Check if rune is already equipped
                    const isEquipped = this.equippedRunes[charType].some(r => r === rune);
                    
                    div.innerHTML = `
                        <div style="font-weight: 700; font-size: 13px; color: #3b82f6; margin-bottom: 5px;">
                            ${rune.emoji} ${rune.name}
                            ${isEquipped ? '<span class="rune-equipped-indicator">EQUIPPED</span>' : ''}
                        </div>
                        <div style="font-size: 11px; color: #e2e8f0; margin-bottom: 8px;">
                            ${rune.getStatsDisplay()}
                        </div>
                        <div class="loot-item-actions">
                            <button class="loot-item-btn equip-btn" data-rune-index="${index}" ${isEquipped ? 'disabled' : ''} ${!this.runeSlots[charType].some(s => s) ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                ${this.runeSlots[charType].some(s => s) ? 'Equip' : 'No Slots'}
                            </button>
                            <button class="loot-item-btn sell-btn" data-sell-rune="${index}">
                                Sell ${rune.getSellPrice()}g
                            </button>
                        </div>
                    `;
                    
                    runeList.appendChild(div);
                });
                
                // Add equip event listeners
                document.querySelectorAll('[data-rune-index]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const index = parseInt(btn.getAttribute('data-rune-index'));
                        this.equipRune(charType, index);
                    });
                });
                
                // Add sell event listeners
                document.querySelectorAll('[data-sell-rune]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const index = parseInt(btn.getAttribute('data-sell-rune'));
                        this.sellRune(index);
                    });
                });
            }
            
            equipRune(charType, runeIndex) {
                const rune = this.runes[runeIndex];
                if (!rune) return;
                
                // Check if character has any unlocked slots
                const hasUnlockedSlot = this.runeSlots[charType].some(slot => slot === true);
                if (!hasUnlockedSlot) {
                    this.addLog(`No rune slots unlocked for ${charType}! Unlock slots in the Skill Tree.`, 'damage');
                    return;
                }
                
                // Find first available unlocked slot
                let slotIndex = -1;
                for (let i = 0; i < 5; i++) {
                    if (this.runeSlots[charType][i] && !this.equippedRunes[charType][i]) {
                        slotIndex = i;
                        break;
                    }
                }
                
                if (slotIndex === -1) {
                    this.addLog('All rune slots are full!', 'damage');
                    return;
                }
                
                // Equip the rune
                this.equippedRunes[charType][slotIndex] = rune;
                this.runes.splice(runeIndex, 1);
                
                // Apply rune stats to character
                const member = this.party.find(m => m.className.toLowerCase() === charType);
                if (member) {
                    // Store current HP/Mana percentages
                    const hpPercent = member.hp / member.maxHp;
                    const manaPercent = member.mana / member.maxMana;
                    
                    // Ability runes don't modify stats - they enhance abilities during use
                    if (rune.isAbilityRune) {
                        // No stat changes needed
                    } else if (rune.statType) {
                        // Stat runes apply percentage bonuses - store the bonus on the member
                        if (!member.runePercentBonuses) member.runePercentBonuses = {};
                        
                        // Track the bonus (we'll recalculate in getTotalX functions)
                        if (!member.runePercentBonuses[rune.statType]) {
                            member.runePercentBonuses[rune.statType] = 0;
                        }
                        member.runePercentBonuses[rune.statType] += rune.percentBonus;
                        
                        // Handle secondary stat for crit runes
                        if (rune.secondaryStatType) {
                            if (!member.runePercentBonuses[rune.secondaryStatType]) {
                                member.runePercentBonuses[rune.secondaryStatType] = 0;
                            }
                            member.runePercentBonuses[rune.secondaryStatType] += rune.secondaryPercentBonus;
                        }
                    }
                    
                    // Restore HP/Mana percentages
                    member.hp = Math.floor(member.maxHp * hpPercent);
                    member.mana = Math.floor(member.maxMana * manaPercent);
                }
                
                this.addLog(`Equipped ${rune.name} to ${charType}!`, 'loot');
                this.rebuildUI();
                this.showRunesForCharacter(charType);
            }
            
            unequipRune(charType, slotIndex) {
                const rune = this.equippedRunes[charType][slotIndex];
                if (!rune) return;
                
                // Remove rune stats from character
                const member = this.party.find(m => m.className.toLowerCase() === charType);
                if (member) {
                    // Store current HP/Mana percentages
                    const hpPercent = member.hp / member.maxHp;
                    const manaPercent = member.mana / member.maxMana;
                    
                    // Ability runes don't modify stats
                    if (rune.isAbilityRune) {
                        // No stat changes needed
                    } else if (rune.statType && member.runePercentBonuses) {
                        // Remove percentage bonus
                        if (member.runePercentBonuses[rune.statType]) {
                            member.runePercentBonuses[rune.statType] -= rune.percentBonus;
                            if (member.runePercentBonuses[rune.statType] <= 0) {
                                delete member.runePercentBonuses[rune.statType];
                            }
                        }
                        
                        // Handle secondary stat for crit runes
                        if (rune.secondaryStatType && member.runePercentBonuses[rune.secondaryStatType]) {
                            member.runePercentBonuses[rune.secondaryStatType] -= rune.secondaryPercentBonus;
                            if (member.runePercentBonuses[rune.secondaryStatType] <= 0) {
                                delete member.runePercentBonuses[rune.secondaryStatType];
                            }
                        }
                    }
                    
                    // Restore HP/Mana percentages
                    member.hp = Math.floor(member.maxHp * hpPercent);
                    member.mana = Math.floor(member.maxMana * manaPercent);
                }
                
                // Unequip and return to inventory
                this.equippedRunes[charType][slotIndex] = null;
                this.runes.push(rune);
                
                this.addLog(`Unequipped ${rune.name}`, 'loot');
                this.rebuildUI();
                this.showRunesForCharacter(charType);
            }
            
            sellRune(index) {
                const rune = this.runes[index];
                if (!rune) return;
                
                const sellPrice = rune.getSellPrice();
                this.gold += sellPrice;
                this.runes.splice(index, 1);
                
                this.addLog(`Sold ${rune.name} for ${sellPrice}g`, 'loot');
                
                // Refresh the current character's rune view
                const activeTab = document.querySelector('.rune-char-tab.active');
                if (activeTab) {
                    const charType = activeTab.getAttribute('data-rune-char');
                    this.showRunesForCharacter(charType);
                }
                
                this.updateUI();
            }
            
            unequipKeystone(type) {
                const keystone = this.equippedKeystones[type];
                if (!keystone) return;
                
                // Remove keystone stats from the corresponding character
                const member = this.party.find(m => m.className.toLowerCase() === type);
                if (member && keystone.stats) {
                    // Store current HP/Mana percentages
                    const hpPercent = member.hp / member.maxHp;
                    const manaPercent = member.mana / member.maxMana;
                    
                    // Remove stats
                    for (const [stat, value] of Object.entries(keystone.stats)) {
                        if (stat === 'hp') {
                            member.maxHp -= value;
                        } else if (stat === 'mana') {
                            member.maxMana -= value;
                        } else if (stat === 'attack') {
                            member.attack -= value;
                        } else if (stat === 'defense') {
                            member.defense -= value;
                        } else if (stat === 'attackSpeed') {
                            member.attackSpeed -= value / 100;
                        } else if (stat === 'critChance') {
                            member.critChance -= value;
                        } else if (stat === 'critDamage') {
                            member.critDamage -= value;
                        } else if (stat === 'dodge') {
                            member.dodgeChance -= value;
                        } else if (stat === 'lifesteal') {
                            member.lifesteal -= value;
                        } else if (stat === 'hpRegen') {
                            member.hpRegen -= value;
                        } else if (stat === 'manaRegen') {
                            member.manaRegen -= value;
                        } else if (stat === 'cdr') {
                            member.cdr -= value;
                        }
                    }
                    
                    // Restore HP/Mana percentages
                    member.hp = Math.floor(member.maxHp * hpPercent);
                    member.mana = Math.floor(member.maxMana * manaPercent);
                }
                
                // Unequip and return to inventory
                this.equippedKeystones[type] = null;
                this.keystones.push(keystone);
                
                this.addLog(`Unequipped ${keystone.name}`, 'loot');
                this.rebuildUI();
                this.showKeystones();
            }


            sellKeystone(index) {
                
                const keystone = this.keystones[index];
                if (!keystone) {
                    console.error(`No keystone found at index ${index}!`);
                    return;
                }


                // Double-check this keystone is not equipped
                if (this.equippedKeystones[keystone.type] === keystone) {
                    console.error(`Attempted to sell equipped keystone!`);
                    this.addLog(`Cannot sell equipped keystone!`, 'damage');
                    return;
                }
                
                const sellPrice = keystone.getSellPrice();
                this.gold += sellPrice;
                this.keystones.splice(index, 1);
                
                
                this.addLog(`Sold ${keystone.name} for ${sellPrice}g`, 'loot');
                this.showKeystones();
                this.updateUI();
            }

            showChests() {
    // === RUNE TRIAL KEYS ===
    const runeKeysGrid = document.getElementById('rune-trial-keys-grid');
    const noRuneKeysMsg = document.getElementById('no-rune-keys');
    
    if (runeKeysGrid) {
        runeKeysGrid.innerHTML = '';
        
        if (this.runeTrialKeys.length === 0) {
            if (noRuneKeysMsg) noRuneKeysMsg.style.display = 'block';
        } else {
            if (noRuneKeysMsg) noRuneKeysMsg.style.display = 'none';
            
            this.runeTrialKeys.forEach(key => {
                const keyCard = document.createElement('div');
                keyCard.className = 'vault-key-card';
                keyCard.style.borderColor = '#3b82f6';
                keyCard.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))';
                
                keyCard.innerHTML = `
                    <div style="font-size: 20px; margin-bottom: 3px; filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.5));"></div>
                    <div style="font-size: 11px; font-weight: 800; color: #60a5fa; font-family: 'Orbitron', sans-serif; margin-bottom: 4px;">TIER ${key.tier}</div>
                    <button class="vault-enter-btn" style="width: 100%; padding: 3px; font-size: 7px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 3px; color: #fff; font-weight: 700; cursor: pointer; font-family: 'Orbitron', sans-serif; margin-bottom: 2px;">GO</button>
                    <button class="vault-sell-btn" style="width: 100%; padding: 3px; font-size: 7px; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 3px; color: #fff; font-weight: 700; cursor: pointer; font-family: 'Orbitron', sans-serif;">SELL</button>
                `;
                
                keyCard.querySelector('.vault-enter-btn').onclick = (e) => {
                    e.stopPropagation();
                    this.showRuneTrialConfirmation(key);
                };
                
                keyCard.querySelector('.vault-sell-btn').onclick = (e) => {
                    e.stopPropagation();
                    this.sellRuneTrialKey(key.id);
                };
                
                runeKeysGrid.appendChild(keyCard);
            });
        }
    }
    
    // === VAULT KEYS ===
    const vaultKeysGrid = document.getElementById('vault-keys-grid');
    const noVaultKeysMsg = document.getElementById('no-keys');
    
    vaultKeysGrid.innerHTML = '';
    
    if (this.vaultKeys.length === 0) {
        noVaultKeysMsg.style.display = 'block';
    } else {
        noVaultKeysMsg.style.display = 'none';
        
        this.vaultKeys.forEach(key => {
            const vaultCard = document.createElement('div');
            vaultCard.className = 'vault-key-card';
            vaultCard.setAttribute('title', 'Vault is 5x harder!\nDefeat boss to earn Keystone');

            vaultCard.innerHTML = `
                <div style="font-size: 11px; font-weight: 800; color: #fbbf24; font-family: 'Orbitron', sans-serif; margin-bottom: 4px;">LVL ${key.level}</div>
                <button class="vault-enter-btn" style="width: 100%; padding: 3px; font-size: 7px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 3px; color: #fff; font-weight: 700; cursor: pointer; font-family: 'Orbitron', sans-serif; margin-bottom: 2px;">GO</button>
                <button class="vault-sell-btn" style="width: 100%; padding: 3px; font-size: 7px; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 3px; color: #fff; font-weight: 700; cursor: pointer; font-family: 'Orbitron', sans-serif;">SELL</button>
            `;

            vaultCard.querySelector('.vault-enter-btn').onclick = (e) => {
                e.stopPropagation();
                this.showVaultKeyConfirmDialog(key, () => {
                    this.enterVaultWithKeyConfirmed(key.id);
                });
            };

            vaultCard.querySelector('.vault-sell-btn').onclick = (e) => {
                e.stopPropagation();
                this.sellVaultKey(key.id);
            };
            
            vaultKeysGrid.appendChild(vaultCard);
        });
    }
    
    // === CHESTS ===
    const chestsGrid = document.getElementById('chests-grid');
    const noChestsMsg = document.getElementById('no-chests');
    
    chestsGrid.innerHTML = '';
    
    if (this.playerChests.length === 0) {
        noChestsMsg.style.display = 'block';
    } else {
        noChestsMsg.style.display = 'none';
        
        const dungeonNames = {
            umbral: 'Whispering Spires',
            everfall: 'Hollowed Wilds',
            stoneforge: 'Iron Vaults'
        };
        
        this.playerChests.forEach(chest => {
    const chestCard = document.createElement('div');
    chestCard.className = chest.isMythic ? 'chest-card mythic-chest' : 'chest-card';
    const canAfford = this.gold >= chest.openCost;
    
    // Build odds display based on chest type
    // Format numbers with commas
function formatGold(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

let oddsHTML = '';
if (chest.isMythic) {
    oddsHTML = '<span style="color: #d8b4fe;">E ' + chest.rarityOdds.epic + '%</span> • <span style="color: #fbbf24;">L ' + chest.rarityOdds.legendary + '%</span> • <span style="color: #f0abfc;">M ' + chest.rarityOdds.mythic + '%</span>';
} else {
    oddsHTML = '<span style="color: #60a5fa;">R ' + chest.rarityOdds.rare + '%</span> • <span style="color: #c084fc;">E ' + chest.rarityOdds.epic + '%</span> • <span style="color: #fbbf24;">L ' + chest.rarityOdds.legendary + '%</span>';
}

let chestImage = chest.isMythic ? 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/chest%20mythic.png' : 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/chest.png';

let imageBackgroundStyle = chest.isMythic ? 'background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 100%); padding: 8px; border-radius: 8px;' : '';

chestCard.innerHTML = '<div style="margin-bottom: 4px; ' + imageBackgroundStyle + '"><img src="' + chestImage + '" style="width: 48px; height: 48px;"></div><div class="chest-level">LVL ' + chest.level + '</div><div class="chest-odds">' + oddsHTML + '</div><div class="chest-actions"><button class="chest-btn open" ' + (!canAfford ? 'disabled' : '') + '>OPEN<br>' + formatGold(chest.openCost) + '</button><button class="chest-btn sell">SELL<br>' + formatGold(chest.sellValue) + '</button></div>';
    
    chestCard.querySelector('.chest-btn.open').onclick = () => this.openChest(chest.id);
    chestCard.querySelector('.chest-btn.sell').onclick = () => this.sellChest(chest.id);
    
    chestsGrid.appendChild(chestCard);
});
    }
}

            openChest(chestId) {
    const chestIndex = this.playerChests.findIndex(c => c.id === chestId);
    if (chestIndex === -1) return;
    
    const chest = this.playerChests[chestIndex];
    
    // Check if player has enough gold
    if (this.gold < chest.openCost) {
        this.addLog('Not enough gold to open chest', 'damage');
        return;
    }
    
    // Deduct gold
    this.gold -= chest.openCost;
    this.updateUI();
    
    // Show opening animation
    this.showChestOpeningAnimation(chest, chestIndex);
}

showChestOpeningAnimation(chest, chestIndex) {
    // Roll rarity based on chest's odds
const roll = Math.random() * 100;
let rarity;

if (chest.isMythic) {
    // Mythic chest: epic 50%, legendary 49.9%, mythic 0.1%
    if (roll < chest.rarityOdds.mythic) {
        rarity = 'mythic';
    } else if (roll < chest.rarityOdds.mythic + chest.rarityOdds.legendary) {
        rarity = 'legendary';
    } else {
        rarity = 'epic';
    }
} else {
    // Regular chest: rare 75%, epic 20%, legendary 5%
    if (roll < chest.rarityOdds.legendary) {
        rarity = 'legendary';
    } else if (roll < chest.rarityOdds.legendary + chest.rarityOdds.epic) {
        rarity = 'epic';
    } else {
        rarity = 'rare';
    }

}
                
                // All possible gear slots (ignore dungeon restrictions for chests)
                const allSlots = ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'];
                const filteredSlots = this.getFilteredLootTable(allSlots);
                
                // If no valid items, use a random armor piece as fallback
                const slotType = filteredSlots.length > 0 
                    ? filteredSlots[Math.floor(Math.random() * filteredSlots.length)]
                    : ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring'][Math.floor(Math.random() * 7)];
                
                // Generate item at chest's level
const item = new Item(slotType, rarity, chest.level);

// Create opening animation overlay
const overlay = document.createElement('div');
overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
    opacity: 0;
    transition: opacity 0.3s ease;
`;

const chestImage = chest.isMythic ? 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/chest%20open%20mythic.png' : 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/open%20chest.png';
const rarityColors = {
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
    mythic: '#c910a7'
};

overlay.innerHTML = `
    <div style="text-align: center;">
        <div id="chest-emoji" style="margin-bottom: 20px; animation: chest-shake 0.5s ease-in-out;"><img src="${chestImage}" style="width: 160px; height: 160px;"></div>
        <div id="item-reveal" style="opacity: 0; transform: scale(0.5); transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <div style="font-size: 48px; margin-bottom: 15px; color: ${rarityColors[rarity]}; font-weight: 800; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px ${rarityColors[rarity]};">${item.name}</div>
            <div style="font-size: 18px; color: #e2e8f0; font-weight: 600;">${item.getStatsDisplay()}</div>
        </div>
    </div>
`;

document.body.appendChild(overlay);

// Trigger animations
setTimeout(() => overlay.style.opacity = '1', 10);

// Chest shake and open
setTimeout(() => {
    const chestElem = document.getElementById('chest-emoji');
    chestElem.style.animation = 'chest-open 0.6s ease-out forwards';
}, 500);

// Item reveal
setTimeout(() => {
    const itemReveal = document.getElementById('item-reveal');
    itemReveal.style.opacity = '1';
    itemReveal.style.transform = 'scale(1)';
}, 1200);

// Close and cleanup
setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.remove();
        
        // Add to loot
        this.loot.push(item);
        
        // Remove chest from inventory
        this.playerChests.splice(chestIndex, 1);
        
        // Log the result
        const chestType = chest.isMythic ? '✨ Mythic Chest' : 'Chest';
        this.addLog(`Opened Level ${chest.level} ${chestType} → ${item.name}`, 'loot');
        
        // Refresh displays
        this.showChests();
        this.showLoot();
     }, 300);
}, 3500);
}

            sellChest(chestId) {
    const chestIndex = this.playerChests.findIndex(c => c.id === chestId);
    if (chestIndex === -1) return;
    
    const chest = this.playerChests[chestIndex];
    
    // Add gold
    this.gold += chest.sellValue;
    
    // Remove chest
    this.playerChests.splice(chestIndex, 1);
    
    // Log with mythic indicator if applicable
    const chestType = chest.isMythic ? '✨ Mythic Chest' : 'Chest';
    this.addLog(`Sold Level ${chest.level} ${chestType} for ${chest.sellValue}g`, 'loot');
    
    // Refresh displays
    this.showChests();
    this.updateUI();
}

sellVaultKey(keyId) {
    const keyIndex = this.vaultKeys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) return;
    
    const key = this.vaultKeys[keyIndex];
    const sellPrice = key.level * 100;
    
    // Add gold
    this.gold += sellPrice;
    
    // Remove key
    this.vaultKeys.splice(keyIndex, 1);
    
    // Log
    this.addLog(`Sold Level ${key.level} Vault Key for ${sellPrice}g`, 'loot');
    
    // Refresh displays
    this.showChests();
    this.updateUI();
}

sellRuneTrialKey(keyId) {
    const keyIndex = this.runeTrialKeys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) return;
    
    const key = this.runeTrialKeys[keyIndex];
    const sellPrice = key.tier * 150;
    
    // Add gold
    this.gold += sellPrice;
    
    // Remove key
    this.runeTrialKeys.splice(keyIndex, 1);
    
    // Log
    this.addLog(`Sold Tier ${key.tier} Rune Trial Key for ${sellPrice}g`, 'loot');
    
    // Refresh displays
    this.showChests();
    this.updateUI();
}

showLootComparison(newItem, event) {
    const tooltip = document.getElementById('loot-tooltip');
    
    // Find which character would equip this and what they currently have
    let bestMember = null;
    let currentItem = null;
    
    // Check if there's a dropdown selection on the loot item
    const lootItemElement = event.target.closest('.loot-item');
    const dropdown = lootItemElement?.querySelector('.loot-item-select');
    const selectedValue = dropdown?.value;
    
    // Store the last selected value to prevent flickering
    if (!lootItemElement._lastSelectedValue) {
        lootItemElement._lastSelectedValue = selectedValue;
    }
    
    // Use stored value for stability
    const valueToUse = lootItemElement._lastSelectedValue || selectedValue;
    
    // If user selected a specific character, use that
    if (valueToUse && valueToUse !== 'auto') {
        bestMember = this.party[parseInt(valueToUse)];
    } else {
    // Otherwise use auto-equip logic to find best match
    
    // For weapons, directly match to class
    if (newItem.weaponType) {
        const weaponToClass = {
            'wand': 'Mage',
            'dagger': 'Rogue',
            'greatsword': 'Tank',
            'staff': 'Healer',
            'bow': 'Archer',
            'warhammer': 'Paladin'
        };
        
        const targetClass = weaponToClass[newItem.weaponType];
        if (targetClass) {
            bestMember = this.party.find(m => m.isAlive && m.className === targetClass);
        }
    }
    
    // For non-weapons or if no match found, find best upgrade
    if (!bestMember) {
        let worstCurrentScore = Infinity;
        
        this.party.forEach(member => {
            if (!member.isAlive) return;
            
            // Get current item in slot
            let currentSlotItem = null;
            if (newItem.type === 'ring') {
                if (!member.equipment.ring1) {
                    currentSlotItem = null;
                } else if (!member.equipment.ring2) {
                    currentSlotItem = null;
                } else {
                    const ring1Score = this.calculateItemScore(member.equipment.ring1);
                    const ring2Score = this.calculateItemScore(member.equipment.ring2);
                    currentSlotItem = ring1Score < ring2Score ? member.equipment.ring1 : member.equipment.ring2;
                }
            } else {
                currentSlotItem = member.equipment[newItem.type];
            }
            
            const currentScore = this.calculateItemScore(currentSlotItem);
            const newScore = this.calculateItemScore(newItem);
            
            // Only consider if new item is better
            if (newScore > currentScore && currentScore < worstCurrentScore) {
                worstCurrentScore = currentScore;
                bestMember = member;
            }
        });
    }
}
                
                if (bestMember) {
                    if (newItem.type === 'ring') {
                        // Get the weaker ring (same logic as selection)
                        if (!bestMember.equipment.ring1) {
                            currentItem = null;
                        } else if (!bestMember.equipment.ring2) {
                            currentItem = null;
                        } else {
                            const ring1Score = this.calculateItemScore(bestMember.equipment.ring1);
                            const ring2Score = this.calculateItemScore(bestMember.equipment.ring2);
                            currentItem = ring1Score < ring2Score ? bestMember.equipment.ring1 : bestMember.equipment.ring2;
                        }
                    } else {
                        currentItem = bestMember.equipment[newItem.type];
                    }
                }
                
                // Build comparison tooltip
                let tooltipHTML = '<div class="comparison-container">';
                
                // Current item side
                tooltipHTML += '<div class="comparison-side">';
                if (currentItem) {
    tooltipHTML += `<div class="tooltip-header ${currentItem.rarity}">CURRENT: ${currentItem.name}</div>`;
    tooltipHTML += '<div class="tooltip-stats">';
    
    // Add mythic stat indicator for current item
if (currentItem.rarity === 'mythic' && (currentItem.mythicStat || currentItem.mythicStats)) {
    const mythicStatNames = currentItem.mythicStats ? currentItem.mythicStats.map(s => s.toUpperCase()).join(', ') : currentItem.mythicStat.toUpperCase();
    const isPerfect = currentItem.mythicStats && currentItem.mythicStats.length === 4;
    const prefix = isPerfect ? '✨ PERFECT MYTHIC' : '⚡ MYTHIC';
    const color = isPerfect ? '#ffd700' : '#c910a7';
    const borderColor = isPerfect ? '#ffd700' : '#c910a7';
    const bgColor = isPerfect ? 'rgba(255, 215, 0, 0.15)' : 'rgba(201, 16, 167, 0.1)';
    
    tooltipHTML += `<div style="color: ${color}; font-size: 11px; font-weight: 700; margin-bottom: 8px; text-align: center; border: 1px solid ${borderColor}; border-radius: 4px; padding: 4px; background: ${bgColor};">${prefix}: ${mythicStatNames} (200%) ✨</div>`;
}
    
if (currentItem.attack) tooltipHTML += `<div class="tooltip-stat">+${currentItem.attack} Attack ${this.getStatRollPercent(currentItem, 'attack')}</div>`;
                if (currentItem.attackSpeed) tooltipHTML += `<div class="tooltip-stat">+${currentItem.attackSpeed} Attack Speed ${this.getStatRollPercent(currentItem, 'attackSpeed')}</div>`;
                if (currentItem.hp) tooltipHTML += `<div class="tooltip-stat">+${currentItem.hp} HP ${this.getStatRollPercent(currentItem, 'hp')}</div>`;
                if (currentItem.mana) tooltipHTML += `<div class="tooltip-stat">+${currentItem.mana} Mana ${this.getStatRollPercent(currentItem, 'mana')}</div>`;
                if (currentItem.defense) tooltipHTML += `<div class="tooltip-stat">+${currentItem.defense} Defense ${this.getStatRollPercent(currentItem, 'defense')}</div>`;
                if (currentItem.critChance) tooltipHTML += `<div class="tooltip-stat">+${currentItem.critChance}% Crit Chance ${this.getStatRollPercent(currentItem, 'critChance')}</div>`;
                if (currentItem.critDamage) tooltipHTML += `<div class="tooltip-stat">+${currentItem.critDamage}% Crit Damage ${this.getStatRollPercent(currentItem, 'critDamage')}</div>`;
                if (currentItem.dodgeChance) tooltipHTML += `<div class="tooltip-stat">+${currentItem.dodgeChance}% Dodge ${this.getStatRollPercent(currentItem, 'dodgeChance')}</div>`;
                if (currentItem.lifesteal) tooltipHTML += `<div class="tooltip-stat">+${currentItem.lifesteal}% Lifesteal ${this.getStatRollPercent(currentItem, 'lifesteal')}</div>`;
                if (currentItem.hpRegen) tooltipHTML += `<div class="tooltip-stat">+${currentItem.hpRegen} HP Regen ${this.getStatRollPercent(currentItem, 'hpRegen')}</div>`;
if (currentItem.manaRegen) tooltipHTML += `<div class="tooltip-stat">+${currentItem.manaRegen} Mana Regen ${this.getStatRollPercent(currentItem, 'manaRegen')}</div>`;
                if (currentItem.cdr) tooltipHTML += `<div class="tooltip-stat">+${currentItem.cdr}% CDR ${this.getStatRollPercent(currentItem, 'cdr')}</div>`;
                tooltipHTML += '</div>';
                } else {
                    tooltipHTML += '<div class="tooltip-header">CURRENT: None</div>';
                    tooltipHTML += '<div class="tooltip-stats"><div style="color: #888;">Empty Slot</div></div>';
                }
                tooltipHTML += '</div>';
                
                // Arrow
                tooltipHTML += '<div class="comparison-divider"></div>';
                
                // New item side
tooltipHTML += '<div class="comparison-side">';
tooltipHTML += `<div class="tooltip-header ${newItem.rarity}">NEW: ${newItem.name}</div>`;
tooltipHTML += '<div class="tooltip-stats">';

// Add mythic stat indicator for new item
if (newItem.rarity === 'mythic' && (newItem.mythicStat || newItem.mythicStats)) {
    const mythicStatNames = newItem.mythicStats ? newItem.mythicStats.map(s => s.toUpperCase()).join(', ') : newItem.mythicStat.toUpperCase();
    const isPerfect = newItem.mythicStats && newItem.mythicStats.length === 4;
    const prefix = isPerfect ? '✨ PERFECT MYTHIC' : '⚡ MYTHIC';
    const color = isPerfect ? '#ffd700' : '#c910a7';
    const borderColor = isPerfect ? '#ffd700' : '#c910a7';
    const bgColor = isPerfect ? 'rgba(255, 215, 0, 0.15)' : 'rgba(201, 16, 167, 0.1)';
    
    tooltipHTML += `<div style="color: ${color}; font-size: 11px; font-weight: 700; margin-bottom: 8px; text-align: center; border: 1px solid ${borderColor}; border-radius: 4px; padding: 4px; background: ${bgColor};">${prefix}: ${mythicStatNames} (200%) ✨</div>`;
}

if (newItem.attack) tooltipHTML += `<div class="tooltip-stat">+${newItem.attack} Attack ${this.getStatRollPercent(newItem, 'attack')}</div>`;
                if (newItem.attackSpeed) tooltipHTML += `<div class="tooltip-stat">+${newItem.attackSpeed} Attack Speed ${this.getStatRollPercent(newItem, 'attackSpeed')}</div>`;
                if (newItem.hp) tooltipHTML += `<div class="tooltip-stat">+${newItem.hp} HP ${this.getStatRollPercent(newItem, 'hp')}</div>`;
                if (newItem.mana) tooltipHTML += `<div class="tooltip-stat">+${newItem.mana} Mana ${this.getStatRollPercent(newItem, 'mana')}</div>`;
                if (newItem.defense) tooltipHTML += `<div class="tooltip-stat">+${newItem.defense} Defense ${this.getStatRollPercent(newItem, 'defense')}</div>`;
                if (newItem.critChance) tooltipHTML += `<div class="tooltip-stat">+${newItem.critChance}% Crit Chance ${this.getStatRollPercent(newItem, 'critChance')}</div>`;
                if (newItem.critDamage) tooltipHTML += `<div class="tooltip-stat">+${newItem.critDamage}% Crit Damage ${this.getStatRollPercent(newItem, 'critDamage')}</div>`;
                if (newItem.dodgeChance) tooltipHTML += `<div class="tooltip-stat">+${newItem.dodgeChance}% Dodge ${this.getStatRollPercent(newItem, 'dodgeChance')}</div>`;
                if (newItem.lifesteal) tooltipHTML += `<div class="tooltip-stat">+${newItem.lifesteal}% Lifesteal ${this.getStatRollPercent(newItem, 'lifesteal')}</div>`;
                if (newItem.hpRegen) tooltipHTML += `<div class="tooltip-stat">+${newItem.hpRegen}% HP Regen ${this.getStatRollPercent(newItem, 'hpRegen')}</div>`;
                if (newItem.manaRegen) tooltipHTML += `<div class="tooltip-stat">+${newItem.manaRegen}% Mana Regen ${this.getStatRollPercent(newItem, 'manaRegen')}</div>`;
                if (newItem.cdr) tooltipHTML += `<div class="tooltip-stat">+${newItem.cdr}% CDR ${this.getStatRollPercent(newItem, 'cdr')}</div>`;
                tooltipHTML += '</div>';
                tooltipHTML += '</div>';
                
                tooltipHTML += '</div>';
                
                // Add who will equip it - determine correct member based on same logic as equipItem
                let displayMember = null;
                if (newItem.weaponType) {
                    const validWeapons = {
                        'Tank': 'greatsword',
                        'Healer': 'staff',
                        'Mage': 'wand',
                        'Rogue': 'dagger',
                        'Archer': 'bow',
                        'Paladin': 'warhammer'
                    };
                    
                    // Find the class that matches this weapon
                    for (const [className, weaponType] of Object.entries(validWeapons)) {
                        if (weaponType === newItem.weaponType) {
                            displayMember = this.party.find(m => m.className === className);
                            break;
                        }
                    }
                } else {
                    displayMember = bestMember;
                }
                
                if (displayMember) {
                    tooltipHTML += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444; text-align: center; color: #888;">Will equip to: ${displayMember.name}</div>`;
                }
                
                tooltip.innerHTML = tooltipHTML;
                tooltip.classList.add('show');
                
                // Position tooltip on the LEFT SIDE over the gameplay area
                // Fixed position relative to the viewport
                tooltip.style.left = '20px';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translateY(-50%)';
            }

            equipItem(item, index) {
    // Hide loot tooltip immediately
    document.getElementById('loot-tooltip').classList.remove('show');
    
    const newItemScore = this.calculateItemScore(item);
    let bestMember = null;
    
    // For weapons, directly match to class but check gear score
    if (item.weaponType) {
        const validWeapons = {
            'Tank': 'greatsword',
            'Healer': 'staff',
            'Mage': 'wand',
            'Rogue': 'dagger',
            'Archer': 'bow',
            'Paladin': 'warhammer'
        };
        
        // Find the class that matches this weapon
        for (const [className, weaponType] of Object.entries(validWeapons)) {
            if (weaponType === item.weaponType) {
                bestMember = this.party.find(m => m.className === className);
                break;
            }
        }
        
        if (bestMember) {
    const currentWeapon = bestMember.equipment.weapon;
    const currentScore = this.calculateItemScore(currentWeapon);
    
    // Mythics always equip (they're always upgrades)
    // Only equip if new item has higher gear score
    if (item.rarity === 'mythic' || newItemScore > currentScore) {
        this.equipItemToMember(item, index, bestMember);
        return;
    } else {
                // Not an upgrade - send to inventory
                this.loot.splice(index, 1);
                this.inventory.push(item);
                this.addLog(`${item.name} sent to inventory (not an upgrade)`, 'loot');
                this.showLoot();
                this.showInventory();
                return;
            }
        }
    }
    
    // For non-weapons, find character where item is best upgrade
    let bestUpgradeValue = 0;
    
    this.party.forEach(member => {
        // Get current item in slot
        let currentItem = null;
        if (item.type === 'ring') {
            if (!member.equipment.ring1) {
                currentItem = null;
            } else if (!member.equipment.ring2) {
                currentItem = null;
            } else {
                // Compare with weaker ring
                const ring1Score = this.calculateItemScore(member.equipment.ring1);
                const ring2Score = this.calculateItemScore(member.equipment.ring2);
                currentItem = ring1Score < ring2Score ? member.equipment.ring1 : member.equipment.ring2;
            }
        } else {
            currentItem = member.equipment[item.type];
        }
        
        const currentScore = this.calculateItemScore(currentItem);
        const upgradeValue = newItemScore - currentScore;
        
        // Only consider if new item is better AND it's the best upgrade we've found
        if (upgradeValue > 0 && upgradeValue > bestUpgradeValue) {
            bestUpgradeValue = upgradeValue;
            bestMember = member;
        }
    });
    
    if (bestMember) {
        this.equipItemToMember(item, index, bestMember);
    } else {
        // Not an upgrade for anyone - send to inventory
        this.loot.splice(index, 1);
        this.inventory.push(item);
        this.addLog(`${item.name} sent to inventory (not an upgrade)`, 'loot');
        this.showLoot();
        this.showInventory();
    }
}

            equipItemToCharacter(item, index, characterIndex) {
                // Hide loot tooltip immediately
                document.getElementById('loot-tooltip').classList.remove('show');
                
                const member = this.party[characterIndex];
                if (!member) {
                    this.addLog('Character not available', 'loot');
                    return;
                }
                
                this.equipItemToMember(item, index, member);
            }

equipItemToMember(item, index, member) {  // Fix typo first!
    // Validate weapon type for class
    if (item.weaponType) {
        const validWeapons = {
            'Tank': 'greatsword',
            'Healer': 'staff',
            'Mage': 'wand',
            'Rogue': 'dagger',
            'Archer': 'bow',
            'Paladin': 'warhammer'
        };
        if (validWeapons[member.className] !== item.weaponType) {
            this.addLog(`${member.className} cannot equip ${item.weaponType}!`, 'damage');
            return;
        }
    }
    
    // ✅ USE CORRECT FUNCTION NAMES
    const oldMaxHP = member.getTotalMaxHp();
    const oldMaxMana = member.getTotalMaxMana();
    const hpPercent = member.hp / oldMaxHP;
    const manaPercent = member.mana / oldMaxMana;
    
    let replacedItem = null;
    
    // Equip the item
    if (item.type === 'ring') {
        if (!member.equipment.ring1) {
            member.equipment.ring1 = item;
        } else if (!member.equipment.ring2) {
            member.equipment.ring2 = item;
        } else {
            const ring1Score = this.calculateItemScore(member.equipment.ring1);
            const ring2Score = this.calculateItemScore(member.equipment.ring2);
            if (ring1Score < ring2Score) {
                replacedItem = member.equipment.ring1;
                member.equipment.ring1 = item;
            } else {
                replacedItem = member.equipment.ring2;
                member.equipment.ring2 = item;
            }
        }
    } else {
        replacedItem = member.equipment[item.type];
        member.equipment[item.type] = item;
    }
    
    // ✅ USE CORRECT FUNCTION NAMES
    const newMaxHP = member.getTotalMaxHp();
    const newMaxMana = member.getTotalMaxMana();
    
    member.hp = Math.floor(newMaxHP * hpPercent);
    member.mana = Math.floor(newMaxMana * manaPercent);
    
    // Clamp to valid ranges
    member.hp = Math.max(1, Math.min(member.hp, newMaxHP));
    member.mana = Math.max(0, Math.min(member.mana, newMaxMana));
    
    // Add replaced item to inventory
    if (replacedItem) {
        this.inventory.push(replacedItem);
    }
    
    this.loot.splice(index, 1);
    
    // Recalculate skill tree stats (including perEpic bonuses) after equipment change
    this.applySkillTreeStats(member);
    
    // Update UI AFTER all HP/Mana changes
    this.showLoot();
    this.showInventory();
    this.rebuildUI();
    
    this.addLog(`${member.name} equips ${item.name}`, 'loot');
    
    // STEAM: Check for full legendary achievement
    this.checkFullLegendaryAchievement(member);
}

checkFullLegendaryAchievement(member) {
    if (!member || !member.equipment) return;
    const requiredSlots = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet'];
    const legendaryPlus = ['legendary', 'mythic', 'pinnacle'];
    const allLegendary = requiredSlots.every(slot => {
        const item = member.equipment[slot];
        return item && legendaryPlus.includes(item.rarity);
    });
    if (allLegendary && window.trackStat) {
        window.trackStat('fullLegendaryEquipped', member.className);
    }
}

equipItemToMemberFromInventory(item, member) {
    // Validate weapon type for class
    if (item.weaponType) {
        const validWeapons = {
            'Tank': 'greatsword',
            'Healer': 'staff',
            'Mage': 'wand',
            'Rogue': 'dagger',
            'Archer': 'bow',
            'Paladin': 'warhammer'
        };
        if (validWeapons[member.className] !== item.weaponType) {
            this.addLog(`${member.className} cannot equip ${item.weaponType}!`, 'damage');
            return false;
        }
    }
    
    // Store percentages BEFORE equipping
    const oldMaxHP = member.getTotalMaxHp();
    const oldMaxMana = member.getTotalMaxMana();
    const hpPercent = member.hp / oldMaxHP;
    const manaPercent = member.mana / oldMaxMana;
    
    let replacedItem = null;
    
    // Equip the item
    if (item.type === 'ring') {
        if (!member.equipment.ring1) {
            member.equipment.ring1 = item;
        } else if (!member.equipment.ring2) {
            member.equipment.ring2 = item;
        } else {
            // Replace weaker ring
            const ring1Score = this.calculateItemScore(member.equipment.ring1);
            const ring2Score = this.calculateItemScore(member.equipment.ring2);
            if (ring1Score < ring2Score) {
                replacedItem = member.equipment.ring1;
                member.equipment.ring1 = item;
            } else {
                replacedItem = member.equipment.ring2;
                member.equipment.ring2 = item;
            }
        }
    } else {
        replacedItem = member.equipment[item.type];
        member.equipment[item.type] = item;
    }
    
   // Restore HP/Mana as PERCENTAGES after equipping
const newMaxHp = Math.round(member.getTotalMaxHp());
const newMaxMana = Math.round(member.getTotalMaxMana());

member.hp = Math.round(newMaxHp * hpPercent);
member.mana = Math.round(newMaxMana * manaPercent);

// Clamp to valid ranges
member.hp = Math.max(1, Math.min(member.hp, newMaxHp));
member.mana = Math.max(0, Math.min(member.mana, newMaxMana));
    
    // Add replaced item to inventory
    if (replacedItem) {
        this.inventory.push(replacedItem);
    }
    
    // Recalculate skill tree stats (including perEpic bonuses) after equipment change
    this.applySkillTreeStats(member);
    
    this.addLog(`${member.name} equips ${item.name}`, 'loot');
    
    // STEAM: Check for full legendary achievement
    this.checkFullLegendaryAchievement(member);
    return true;
}
            
            showInventory() {
    // Hide any visible tooltips
    const lootTooltip = document.getElementById('loot-tooltip');
    if (lootTooltip) lootTooltip.classList.remove('show');
    
    const container = document.getElementById('inventory-container');
    
    if (this.inventory.length === 0) {
        container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Inventory is empty</div>';
        return;
    }
    
    // Proper cleanup of old elements and listeners
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Sort inventory based on active filters
    let sortedInventory = [...this.inventory];
    
    if (this.inventorySortBy.length > 0) {
        sortedInventory.sort((a, b) => {
            const typeOrder = { 'weapon': 0, 'helmet': 1, 'chest': 2, 'gloves': 3, 'boots': 4, 'belt': 5, 'amulet': 6, 'ring': 7 };
            for (const filter of this.inventorySortBy) {
                if (filter === 'rarity') {
                    const rarityOrder = { pinnacle: 7, mythic: 6, legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
                    const diff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                    if (diff !== 0) return diff;
                } else if (filter === 'level') {
                    const diff = b.level - a.level;
                    if (diff !== 0) return diff;
                } else if (filter === 'type') {
                    const diff = (typeOrder[a.type] !== undefined ? typeOrder[a.type] : 99) - (typeOrder[b.type] !== undefined ? typeOrder[b.type] : 99);
                    if (diff !== 0) return diff;
                }
            }
            return 0;
        });
    }
                
                sortedInventory.forEach((item, displayIndex) => {
                    const div = document.createElement('div');
                    div.className = `loot-item ${item.rarity}`;
                    div.style.borderColor = this.getRarityColor(item.rarity);
                    
                    const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
                    const sellPrice = sellPrices[item.rarity] || 5;
                    
                    div.innerHTML = `
                        <div class="equipment-name ${item.rarity}" style="font-size: 13px; font-weight: 600; margin-bottom: 3px; line-height: 1.2;">${item.name}</div>
                       <div style="font-size: 10px; color: #e2e8f0; line-height: 1.4; margin-bottom: 6px; font-weight: 500;">${item.getStatsDisplay()}</div>
                        <div class="loot-item-actions">
                            <select class="loot-item-select" style="flex: 2; padding: 4px 6px; background: rgba(30, 41, 59, 0.9); color: #e2e8f0; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; font-family: 'Rajdhani', sans-serif; font-size: 10px; cursor: pointer;">
                                <option value="auto">Auto-Equip Best</option>
                                ${this.party.filter(m => m.isAlive).map((m, idx) => `<option value="${idx}">${m.name}</option>`).join('')}
                            </select>
                            <button class="loot-item-btn equip-btn" style="flex: 1;">Equip</button>
                            <button class="loot-item-btn sell-btn" style="flex: 1;">Sell ${sellPrice}g</button>
                        </div>
                    `;
                    
// Track dropdown changes for tooltip stability
                    div.querySelector('.loot-item-select').addEventListener('change', (e) => {
                        div._lastSelectedValue = e.target.value;
                    });
                    
                    // Equip button - CRITICAL FIX: Find actual inventory index at click time
                    div.querySelector('.equip-btn').onclick = (e) => {
                        e.stopPropagation();
                        const selectedChar = div.querySelector('.loot-item-select').value;
                        // Find actual index in current inventory state (not cached)
                        const actualIndex = this.inventory.findIndex(invItem => invItem === item);
                        if (actualIndex === -1) {
                            this.addLog('Item no longer in inventory', 'damage');
                            this.showInventory();
                            return;
                        }
                        if (selectedChar === 'auto') {
                            this.equipFromInventory(item, actualIndex);
                        } else {
                            this.equipFromInventoryToCharacter(item, actualIndex, parseInt(selectedChar));
                        }
                    };
                    
                    // Sell button - CRITICAL FIX: Find actual inventory index at click time
                    div.querySelector('.sell-btn').onclick = (e) => {
                        e.stopPropagation();
                        // Find actual index in current inventory state (not cached)
                        const actualIndex = this.inventory.findIndex(invItem => invItem === item);
                        if (actualIndex === -1) {
                            this.addLog('Item no longer in inventory', 'damage');
                            this.showInventory();
                            return;
                        }
                        this.sellItem(item, actualIndex, 'inventory');
                    };
                    
                    // Add comparison tooltip for inventory items too
                    div.addEventListener('mouseenter', (e) => {
                        this.showLootComparison(item, e);
                    });
                    
                    div.addEventListener('mouseleave', () => {
                        document.getElementById('loot-tooltip').classList.remove('show');
                    });
                    
                    container.appendChild(div);
                });
            }

            sellItem(item, index, source) {
    const sellPrices = {
    common: 5,
    uncommon: 10,
    rare: 15,
    epic: 20,
    legendary: 25,
    mythic: 10000
};
    const sellPrice = sellPrices[item.rarity] || 5;
    
    // Add gold and track it
    this.gold += sellPrice;
    this.floorStats.goldEarned += sellPrice;
    this.globalStats.totalGoldEarned += sellPrice;
                
                // Remove item from loot or inventory
                if (source === 'loot') {
                    this.loot.splice(index, 1);
                    this.showLoot();
                } else if (source === 'inventory') {
                    this.inventory.splice(index, 1);
                    this.showInventory();
                }
                
                // Update UI and log
                this.updateUI();
                this.addLog(`Sold ${item.name} for ${sellPrice}g`, 'loot');
            }

equipFromInventory(item, index) {
    // Hide tooltip
    document.getElementById('loot-tooltip').classList.remove('show');
    
    const newItemScore = this.calculateItemScore(item);
    let bestMember = null;
    
    // For weapons, directly match to class but check gear score
    if (item.weaponType) {
        const validWeapons = {
            'Tank': 'greatsword',
            'Healer': 'staff',
            'Mage': 'wand',
            'Rogue': 'dagger',
            'Archer': 'bow',
            'Paladin': 'warhammer'
        };
        
        // Find the class that matches this weapon
        for (const [className, weaponType] of Object.entries(validWeapons)) {
            if (weaponType === item.weaponType) {
                bestMember = this.party.find(m => m.className === className);
                break;
            }
        }
        
        if (bestMember) {
            const currentWeapon = bestMember.equipment.weapon;
            const currentScore = this.calculateItemScore(currentWeapon);
            
            // Only equip if new item has higher gear score
            if (newItemScore > currentScore) {
                const success = this.equipItemToMemberFromInventory(item, bestMember);
                if (success) {
                    this.inventory.splice(index, 1);
                } else {
                    this.addLog('Failed to equip item', 'damage');
                }
            } else {
                // Not an upgrade
                this.addLog(`${item.name} is not an upgrade`, 'loot');
            }
            this.rebuildUI();
            this.showInventory();
            return;
        }
    }
    
    // For non-weapons, find character where item is best upgrade
    let bestUpgradeValue = 0;
    
    this.party.forEach(member => {
        // Get current item in slot
        let currentItem = null;
        if (item.type === 'ring') {
            if (!member.equipment.ring1) {
                currentItem = null;
            } else if (!member.equipment.ring2) {
                currentItem = null;
            } else {
                const ring1Score = this.calculateItemScore(member.equipment.ring1);
                const ring2Score = this.calculateItemScore(member.equipment.ring2);
                currentItem = ring1Score < ring2Score ? member.equipment.ring1 : member.equipment.ring2;
            }
        } else {
            currentItem = member.equipment[item.type];
        }
        
        const currentScore = this.calculateItemScore(currentItem);
        const upgradeValue = newItemScore - currentScore;
        
        // Only consider if new item is better AND it's the best upgrade we've found
        if (upgradeValue > 0 && upgradeValue > bestUpgradeValue) {
            bestUpgradeValue = upgradeValue;
            bestMember = member;
        }
    });
    
    if (bestMember) {
        const success = this.equipItemToMemberFromInventory(item, bestMember);
        if (success) {
            this.inventory.splice(index, 1);
        } else {
            this.addLog('Failed to equip item', 'damage');
        }
    } else {
        this.addLog(`${item.name} is not an upgrade for any character`, 'loot');
    }

    // Force full rebuild BEFORE showing inventory to ensure fresh data
    this.rebuildUI();
    this.showInventory();
}

            equipFromInventoryToCharacter(item, index, characterIndex) {
    // Hide tooltip
    document.getElementById('loot-tooltip').classList.remove('show');
    
    const member = this.party[characterIndex];
    if (!member) {
        this.addLog('Character not available', 'loot');
        return;
    }
    
    const success = this.equipItemToMemberFromInventory(item, member);
    
    if (success) {
        this.inventory.splice(index, 1);  // ← Remove AFTER equipping
    }
    
    // Update displays - rebuild UI to refresh equipment names/descriptions on character cards
    this.rebuildUI();
    this.showInventory();
    this.updateUI();
}
			

            equipItemToMember(item, index, member) {
    // Validate weapon type for class
    if (item.weaponType) {
        const validWeapons = {
            'Tank': 'greatsword',
            'Healer': 'staff',
            'Mage': 'wand',
            'Rogue': 'dagger',
            'Archer': 'bow',
            'Paladin': 'warhammer'
        };
        if (validWeapons[member.className] !== item.weaponType) {
            this.addLog(`${member.className} cannot equip ${item.weaponType}!`, 'damage');
            return;
        }
    }
    
    // Store HP/Mana as PERCENTAGES before equipping
    const hpPercent = member.hp / member.getTotalMaxHp();
    const manaPercent = member.mana / member.getTotalMaxMana();
    
    let replacedItem = null;
    
    // Equip the item
    if (item.type === 'ring') {
        if (!member.equipment.ring1) {
            member.equipment.ring1 = item;
        } else if (!member.equipment.ring2) {
            member.equipment.ring2 = item;
        } else {
            // Replace weaker ring
            const ring1Score = this.calculateItemScore(member.equipment.ring1);
            const ring2Score = this.calculateItemScore(member.equipment.ring2);
            if (ring1Score < ring2Score) {
                replacedItem = member.equipment.ring1;
                member.equipment.ring1 = item;
            } else {
                replacedItem = member.equipment.ring2;
                member.equipment.ring2 = item;
            }
        }
    } else {
        replacedItem = member.equipment[item.type];
        member.equipment[item.type] = item;
    }
    
    // Restore HP/Mana as PERCENTAGES after equipping
const newMaxHp = Math.round(member.getTotalMaxHp());
const newMaxMana = Math.round(member.getTotalMaxMana());

member.hp = Math.round(newMaxHp * hpPercent);
member.mana = Math.round(newMaxMana * manaPercent);

// Clamp to valid ranges
member.hp = Math.max(1, Math.min(member.hp, newMaxHp));
member.mana = Math.max(0, Math.min(member.mana, newMaxMana));
    
    // Add replaced item to inventory
    if (replacedItem) {
        this.inventory.push(replacedItem);
    }
    
    this.loot.splice(index, 1);
    
    // Recalculate skill tree stats (including perEpic bonuses) after equipment change
    this.applySkillTreeStats(member);
    
    // Update UI AFTER all HP/Mana changes
    this.showLoot();
    this.showInventory();
    this.rebuildUI();
    
    this.addLog(`${member.name} equips ${item.name}`, 'loot');
}


equipFromInventory(item, index) {
    // Hide tooltip
    document.getElementById('loot-tooltip').classList.remove('show');
    
    const newItemScore = this.calculateItemScore(item);
    let bestMember = null;
    
    // For weapons, directly match to class but check gear score
    if (item.weaponType) {
        const validWeapons = {
            'Tank': 'greatsword',
            'Healer': 'staff',
            'Mage': 'wand',
            'Rogue': 'dagger',
            'Archer': 'bow',
            'Paladin': 'warhammer'
        };
        
        // Find the class that matches this weapon
        for (const [className, weaponType] of Object.entries(validWeapons)) {
            if (weaponType === item.weaponType) {
                bestMember = this.party.find(m => m.className === className);
                break;
            }
        }
        
        if (bestMember) {
            const currentWeapon = bestMember.equipment.weapon;
            const currentScore = this.calculateItemScore(currentWeapon);
            
            // Only equip if new item has higher gear score
            if (newItemScore > currentScore) {
                const success = this.equipItemToMemberFromInventory(item, bestMember);
                if (success) {
                    this.inventory.splice(index, 1);  // ← Remove AFTER equipping
                }
            } else {
                this.addLog(`${item.name} is not an upgrade`, 'loot');
            }
            this.rebuildUI();
            this.showInventory();
            return;
        }
    }
    
    // For non-weapons, find character where item is best upgrade
    let bestUpgradeValue = 0;
    
    this.party.forEach(member => {
        let currentItem = null;
        if (item.type === 'ring') {
            if (!member.equipment.ring1) {
                currentItem = null;
            } else if (!member.equipment.ring2) {
                currentItem = null;
            } else {
                const ring1Score = this.calculateItemScore(member.equipment.ring1);
                const ring2Score = this.calculateItemScore(member.equipment.ring2);
                currentItem = ring1Score < ring2Score ? member.equipment.ring1 : member.equipment.ring2;
            }
        } else {
            currentItem = member.equipment[item.type];
        }
        
        const currentScore = this.calculateItemScore(currentItem);
        const upgradeValue = newItemScore - currentScore;
        
        if (upgradeValue > 0 && upgradeValue > bestUpgradeValue) {
            bestUpgradeValue = upgradeValue;
            bestMember = member;
        }
    });
    
    if (bestMember) {
        const success = this.equipItemToMemberFromInventory(item, bestMember);
        if (success) {
            this.inventory.splice(index, 1);  // ← Remove AFTER equipping
        }
    } else {
        this.addLog(`${item.name} is not an upgrade for any character`, 'loot');
    }

    this.rebuildUI();
    this.showInventory();
}
            calculateItemScore(item) {
    if (!item) return 0;
    // Score based on actual stat values (primary factor) plus rarity/level baseline
    let score = 0;
    
    // Add actual stat contributions (weighted by impact)
    const statWeights = {
        attack: 1.0,
        hp: 0.3,
        mana: 0.2,
        defense: 0.8,
        attackSpeed: 50, // attackSpeed values are small decimals, weight up
        critChance: 2.0,
        critDamage: 0.5,
        dodgeChance: 2.0,
        lifesteal: 3.0,
        hpRegen: 1.0,
        manaRegen: 1.0,
        cdr: 2.0
    };
    
    for (const [stat, weight] of Object.entries(statWeights)) {
        if (item[stat]) {
            score += item[stat] * weight;
        }
    }
    
    // Small rarity baseline to break ties (not dominant)
    const rarityPoints = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 8, pinnacle: 12 };
    score += (rarityPoints[item.rarity] || 0) * 2;
    
    return score;
}

createFloatingText(sprite, text, className) {
    if (!sprite) return;
    
    const mainView = document.getElementById('main-view');
    const elem = document.createElement('div');
    elem.className = `floating-text ${className}`;
    
    // Round numbers properly
    if (typeof text === 'string' && (text.includes('-') || text.includes('+'))) {
        const match = text.match(/^([+-]?)(\d+\.?\d*)(.*)/);
        if (match) {
            const sign = match[1];
            const number = parseFloat(match[2]);
            const suffix = match[3];
            elem.textContent = sign + Math.round(number) + suffix;
        } else {
            elem.textContent = text;
        }
    } else {
        elem.textContent = text;
    }
    
    elem.style.left = `${sprite.screenX + this.offsetX}px`;
    elem.style.top = `${sprite.screenY + this.offsetY - 30}px`;
    mainView.appendChild(elem);
    
    setTimeout(() => {
        elem.remove(); // Simple removal
    }, 1000);
}

createBlessingParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = '8px';
    particle.style.height = '8px';
    particle.style.borderRadius = '50%';
    particle.style.background = 'radial-gradient(circle, #e9d5ff, #a855f7)';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '10000';
    particle.style.boxShadow = '0 0 10px rgba(168, 85, 247, 0.8)';
    
    // Random direction
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 50;
    const endX = x + Math.cos(angle) * distance;
    const endY = y + Math.sin(angle) * distance - 50; // Bias upward
    
    particle.style.transition = 'all 0.8s ease-out';
    document.body.appendChild(particle);
    
    // Trigger animation
    setTimeout(() => {
        particle.style.left = endX + 'px';
        particle.style.top = endY + 'px';
        particle.style.opacity = '0';
        particle.style.transform = 'scale(0)';
    }, 10);
    
    setTimeout(() => {
        particle.remove();
    }, 900);
}

addLog(message, type = '') {
    const container = document.getElementById('log-container');
    
    // Remove oldest if we're at limit BEFORE adding new
    if (container.children.length >= 15) {
        container.removeChild(container.firstChild);
    }
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    container.appendChild(entry);
}

            togglePause() {
                this.paused = !this.paused;
                document.getElementById('pause-btn').textContent = this.paused ? '▶️ Resume' : '⏸️ Pause';
            }

            updateAbilityIndicators() {
                // REMOVED: Early return that prevented cooldown display outside of battle
                // Cooldowns should always be visible so players can see when abilities are ready
                
                // Only log if keystones are actually on cooldown
                const keystonesOnCD = this.party.filter(m => m.keystoneCooldown > 0);
                if (keystonesOnCD.length > 0) {
                    const cdDetails = keystonesOnCD.map(m => `${m.name}:${m.keystoneCooldown.toFixed(1)}s`).join(', ');
                    
                }
                
                this.party.forEach((member, index) => {
                    const container = document.querySelector(`.ability-status[data-member-index="${index}"]`);
                    if (!container) return;
                    
                    // Update ability 1 (class skill)
                    const ability1 = container.querySelector('.ability-indicator[data-ability="1"]');
                    if (ability1) {
                        const cooldownPercent = member.maxCooldown > 0 ? ((member.maxCooldown - member.cooldown) / member.maxCooldown) * 100 : 100;
                        const fill = ability1.querySelector('.ability-cooldown-fill');
                        const text = ability1.querySelector('.ability-cooldown-text');
                        
                        if (fill) fill.setAttribute('stroke-dasharray', `${cooldownPercent}, 100`);
                        
                        if (member.cooldown > 0) {
    ability1.className = 'ability-indicator on-cooldown';
} else if (member.mana >= member.skillCost) {
    ability1.className = 'ability-indicator ready';
} else {
    ability1.className = 'ability-indicator no-mana';
}
                    }
                    
                    // Update ability 2 (keystone)
                    const ability2 = container.querySelector('.ability-indicator[data-ability="2"]');
                    if (ability2) {
                        const keystoneType = member.className.toLowerCase();
                        const equippedKeystone = this.equippedKeystones[keystoneType];
                        
                        // Log if this member has a keystone on cooldown
                        if (member.keystoneCooldown > 0) {
                            
                        }
                        
                        if (equippedKeystone) {
                            const fill = ability2.querySelector('.ability-cooldown-fill');
                            const text = ability2.querySelector('.ability-cooldown-text');
                            
                            // Initialize keystone cooldown tracking if needed
                            if (member.keystoneCooldown === undefined) member.keystoneCooldown = 0;
                            if (member.keystoneMaxCooldown === undefined || member.keystoneMaxCooldown !== equippedKeystone.ability.cooldown) {
                                member.keystoneMaxCooldown = equippedKeystone.ability.cooldown;
                                
                            }
                            
                            const cooldownPercent = member.keystoneMaxCooldown > 0 ? ((member.keystoneMaxCooldown - member.keystoneCooldown) / member.keystoneMaxCooldown) * 100 : 100;
                            
                            // ALWAYS log state on first run, then once per second
                            const now = Date.now();
                            const shouldLog = !member._lastUILog || now - member._lastUILog > 1000;
                            
                            if (member.keystoneCooldown > 0 && shouldLog) {
                                
                                member._lastUILog = now;
                            }
                            
                            if (fill) {
                                const oldDashArray = fill.getAttribute('stroke-dasharray');
                                fill.setAttribute('stroke-dasharray', `${cooldownPercent}, 100`);
                                const newDashArray = fill.getAttribute('stroke-dasharray');
                                
                                if (member.keystoneCooldown > 0 && shouldLog) {
                                    
                                }
                            } else {
                                if (member.keystoneCooldown > 0 && shouldLog) {
                                    
                                }
                            }
                            
                            // Debug logging for cooldown state
                            if (member.keystoneCooldown > 0 && member.keystoneCooldown === member.keystoneMaxCooldown) {
                                
                            }
                            
                            const newClassName = member.keystoneCooldown > 0 ? 'ability-indicator on-cooldown' : 'ability-indicator ready';
                            
                            // Always log class state when on cooldown (for debugging)
                            if (member.keystoneCooldown > 0 && shouldLog) {
                                
                            }
                            
                            if (ability2.className !== newClassName) {
                                
                                ability2.className = newClassName;
                            }
                            
                            // Track if we were on cooldown for next frame
                            member._wasOnCooldown = member.keystoneCooldown > 0;
                        } else {
                            ability2.className = 'ability-indicator no-rune';
                        }
                    }
                });
            }

            updateUI() {
                // Check if battle just ended - force update even if throttled
                const forceUpdate = !this.inBattle && this._wasInBattle;
                this._wasInBattle = this.inBattle;
    
    // Prevent excessive UI updates (unless forced)
    if (!forceUpdate && this._lastUIUpdate && Date.now() - this._lastUIUpdate < 100) {
        return; // Skip if updated less than 100ms ago
    }
    this._lastUIUpdate = Date.now();
    
    // Update enemy health bars
    this.updateEnemyHealthBars();
    
    const container = document.getElementById('party-container');
    
    // If party container is empty, do full rebuild
    if (container.children.length === 0) {
        this.rebuildUI();
        return;
    }
    
    // Otherwise, just update the dynamic values (bars, stats) without rebuilding
    this.party.forEach((member, index) => {
        const card = container.children[index];
        if (!card) return;
        
        // Update HP bar
const hpBar = card.querySelector('.hp-bar .bar-fill');
const hpText = card.querySelector('.hp-bar .bar-text');
if (hpBar && hpText) {
    hpBar.style.width = `${(member.hp / member.getTotalMaxHp()) * 100}%`;
    // Show shield in HP text if present
    if (member.shieldAmount && member.shieldAmount > 0) {
        hpText.textContent = `${Math.round(member.hp + member.shieldAmount)}/${Math.round(member.getTotalMaxHp())} HP (🛡️${Math.round(member.shieldAmount)})`;
    } else {
        hpText.textContent = `${Math.round(member.hp)}/${Math.round(member.getTotalMaxHp())} HP`;
    }
}
        
        // Update Mana bar
const manaBar = card.querySelector('.mana-bar .bar-fill');
const manaText = card.querySelector('.mana-bar .bar-text');
if (manaBar && manaText) {
    manaBar.style.width = `${(member.mana / member.getTotalMaxMana()) * 100}%`;
    manaText.textContent = `${Math.round(member.mana)}/${Math.round(member.getTotalMaxMana())} MANA`;
}
        
        // Update XP bar
        const xpBar = card.querySelector('.xp-bar .bar-fill');
        const xpText = card.querySelector('.xp-bar .bar-text');
        if (xpBar && xpText) {
            xpBar.style.width = `${(member.xp / member.maxXp) * 100}%`;
            xpText.textContent = `${member.xp}/${member.maxXp} XP`;
        }
        
        // Update level
        const levelDisplay = card.querySelector('.member-level');
        if (levelDisplay) {
            levelDisplay.textContent = `Lvl ${member.level}`;
        }
    });
    
    // Update gold display
    const goldDisplay = document.getElementById('gold-display');
    if (goldDisplay) goldDisplay.textContent = this.gold;
    
    const topGoldDisplay = document.getElementById('gold-display-top');
    if (topGoldDisplay) topGoldDisplay.textContent = this.gold.toLocaleString() + 'g';
    
    // Update blessing currency display
    const blessingDisplay = document.getElementById('blessing-display-top');
    if (blessingDisplay) {
        if (this.currentDungeon === 'endlessblessings' || (this.blessingCurrency && this.blessingCurrency > 0)) {
            blessingDisplay.style.display = 'flex';
            blessingDisplay.textContent = (this.blessingCurrency || 0).toLocaleString() + ' ✨';
        } else {
            blessingDisplay.style.display = 'none';
        }
    }
    
    // Update blessing currency in bless tab if open
    const blessCurrencyDisplay = document.getElementById('blessing-currency-display');
    if (blessCurrencyDisplay) {
        blessCurrencyDisplay.textContent = this.blessingCurrency || 0;
    }
    
    // Update global stats displays
    const farthestFloorDisplay = document.getElementById('farthest-floor-display');
    if (farthestFloorDisplay) farthestFloorDisplay.textContent = this.globalStats.farthestFloor;
    
    const fastestFloorDisplay = document.getElementById('fastest-floor-display');
    if (fastestFloorDisplay) {
        if (this.globalStats.fastestFloorTime === null) {
            fastestFloorDisplay.textContent = '--';
        } else {
            const minutes = Math.floor(this.globalStats.fastestFloorTime / 60);
            const seconds = this.globalStats.fastestFloorTime % 60;
            fastestFloorDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    const legendariesDisplay = document.getElementById('legendaries-display');
    if (legendariesDisplay) legendariesDisplay.textContent = this.globalStats.legendariesFound;
    
    const chestsDisplay = document.getElementById('chests-display');
    if (chestsDisplay) chestsDisplay.textContent = this.globalStats.chestsFound;
    
    const mythicChestsDisplay = document.getElementById('mythic-chests-display');
    if (mythicChestsDisplay) mythicChestsDisplay.textContent = this.globalStats.mythicChestsFound;
    
    const floorsClearedDisplay = document.getElementById('floors-cleared-display');
    if (floorsClearedDisplay) floorsClearedDisplay.textContent = this.globalStats.totalFloorsCleared;
    
    const totalGoldDisplay = document.getElementById('total-gold-display');
    if (totalGoldDisplay) totalGoldDisplay.textContent = this.globalStats.totalGoldEarned + 'g';
    
    const deathsDisplay = document.getElementById('deaths-display');
    if (deathsDisplay) deathsDisplay.textContent = this.globalStats.totalDeaths;
}

updateEnemyHealthBars() {
                const container = document.getElementById('enemy-health-bars');
                if (!container) return;
                
                // Clear existing bars
                container.innerHTML = '';
                
                // Get alive enemies
                const aliveEnemies = this.enemies.filter(e => e.isAlive);
                
                // Only show during battle and when there are alive enemies
                if (!this.inBattle || aliveEnemies.length === 0) {
                    return;
                }
                
                // Create health bar for each alive enemy
                aliveEnemies.forEach(enemy => {
                    const barDiv = document.createElement('div');
                    const hpPercent = (enemy.hp / enemy.maxHp) * 100;
                    
                    // Determine elite tier
                    let eliteTier = 'normal';
                    let borderColor = 'rgba(239, 68, 68, 0.5)';
                    let bgGradient = 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)';
                    let hpBarGradient = 'linear-gradient(90deg, #dc2626, #ef4444)';
                    let glowEffect = '';
                    let prefix = '';
                    let borderWidth = '1px';
                    
                    // TIER 1: Treasure Guardians & Regular Floor Bosses
                    if (enemy.isTreasureGuardian || enemy.isBoss) {
                        eliteTier = 'elite';
                        borderColor = 'rgba(234, 179, 8, 0.8)';
                        bgGradient = 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(40, 35, 20, 0.98) 100%)';
                        hpBarGradient = 'linear-gradient(90deg, #854d0e, #ca8a04, #fbbf24)';
                        glowEffect = 'box-shadow: 0 0 20px rgba(234, 179, 8, 0.4), inset 0 0 20px rgba(234, 179, 8, 0.1);';
                        prefix = enemy.isTreasureGuardian ? '⚜️ ELITE: ' : '👑 BOSS: ';
                        borderWidth = '2px';
                    }
                    
                    // TIER 2: Vault Bosses (Keystone Wardens)
                    if (this.currentDungeon === 'vault' && enemy.isBoss) {
                        eliteTier = 'legendary';
                        borderColor = 'rgba(255, 215, 0, 1)';
                        bgGradient = 'linear-gradient(135deg, rgba(40, 30, 10, 0.98) 0%, rgba(60, 45, 15, 0.98) 100%)';
                        hpBarGradient = 'linear-gradient(90deg, #b45309, #f59e0b, #fbbf24, #fde047)';
                        glowEffect = 'box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), inset 0 0 30px rgba(255, 215, 0, 0.3);';
                        prefix = '💎 BOSS: ';
                        borderWidth = '3px';
                    }
                    
                    // TIER 3: Rune Trial Bosses (HIGHEST TIER)
                    if (this.currentDungeon === 'runetrial' && enemy.isBoss) {
                        eliteTier = 'mythic';
                        borderColor = 'rgba(168, 85, 247, 0.9)';
                        bgGradient = 'linear-gradient(135deg, rgba(30, 20, 40, 0.98) 0%, rgba(50, 30, 60, 0.98) 100%)';
                        hpBarGradient = 'linear-gradient(90deg, #6b21a8, #a855f7, #c084fc)';
                        glowEffect = 'box-shadow: 0 0 50px rgba(168, 85, 247, 0.7), inset 0 0 40px rgba(168, 85, 247, 0.3);';
                        prefix = '✨ BOSS: ';
                        borderWidth = '4px';
                    }
                    
                    barDiv.style.cssText = `background: ${bgGradient}; border: ${borderWidth} solid ${borderColor}; border-radius: 12px; padding: ${eliteTier === 'normal' ? '8px 12px' : '12px 16px'}; min-width: ${eliteTier === 'normal' ? '250px' : '320px'}; backdrop-filter: blur(10px); ${glowEffect}`;
                    
                    barDiv.innerHTML = `
                        <div style="font-size: ${eliteTier === 'normal' ? '11px' : '13px'}; font-weight: ${eliteTier === 'normal' ? '600' : '700'}; color: ${eliteTier === 'mythic' ? '#e9d5ff' : (eliteTier === 'normal' ? '#f87171' : enemy.color)}; margin-bottom: 6px; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 10px ${eliteTier === 'mythic' ? '#e9d5ff' : (eliteTier === 'normal' ? '#f87171' : enemy.color)}, 0 2px 8px rgba(0,0,0,0.9);">${prefix}${enemy.name}</div>
                        <div style="display: flex; gap: 12px; font-size: ${eliteTier === 'normal' ? '10px' : '11px'}; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">
                            <span>⚔️ ${enemy.getTotalAttack ? enemy.getTotalAttack() : enemy.attack}</span>
                            <span>🛡️ ${enemy.getTotalDefense ? enemy.getTotalDefense() : enemy.defense}</span>
                            ${eliteTier !== 'normal' ? `<span style="color: ${borderColor};">💀 ELITE</span>` : ''}
                        </div>
                        <div style="height: ${eliteTier === 'normal' ? '14px' : '18px'}; background: rgba(15, 23, 42, 0.8); border: 1px solid ${borderColor}; border-radius: 9px; overflow: hidden; position: relative;">
                            <div style="height: 100%; width: ${hpPercent}%; background: ${hpBarGradient}; transition: width 0.3s ease; ${eliteTier !== 'normal' ? 'box-shadow: 0 0 15px currentColor;' : ''}"></div>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: ${eliteTier === 'normal' ? '9px' : '11px'}; font-weight: 700; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.9);">${Math.floor(enemy.hp).toLocaleString()}/${enemy.maxHp.toLocaleString()}</div>
                        </div>
                    `;
                    
                    container.appendChild(barDiv);
                });
            }

            
			rebuildUI() {
    
    
    // ... rest of rebuildUI code
                const container = document.getElementById('party-container');
    
    // Store current view states before clearing
    const viewStates = {};
    container.querySelectorAll('.party-member').forEach((card, index) => {
                    const activeView = card.querySelector('.view-btn.active');
                    if (activeView) {
                        viewStates[index] = activeView.getAttribute('data-view');
                    }
                });
                
                // Proper cleanup of old elements and listeners
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
                
// Update gold display
const goldDisplay = document.getElementById('gold-display');
if (goldDisplay) goldDisplay.textContent = this.gold;

// Update global stats displays
const farthestFloorDisplay = document.getElementById('farthest-floor-display');
if (farthestFloorDisplay) farthestFloorDisplay.textContent = this.globalStats.farthestFloor;

// Update dungeon progress displays with selectors
// Read farthest floor directly from the stats display

const dungeonProgressEverfallDisplay = document.getElementById('everfall-progress-display');
if (dungeonProgressEverfallDisplay) {
    // Read current start floor
    const everfallStartFloor = this.dungeonProgress.everfall.startFloor;
    
    dungeonProgressEverfallDisplay.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <span style="color: #94a3b8; font-size: 11px;">Start Floor:</span>
            <select id="everfall-start-selector" style="padding: 4px 8px; background: rgba(30, 41, 59, 0.9); color: #e2e8f0; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 11px; cursor: pointer;">
                ${Array.from({length: 200}, (_, i) => i + 1).map(floor => 
                    `<option value="${floor}" ${floor === everfallStartFloor ? 'selected' : ''}>${floor}</option>`
                ).join('')}
            </select>
        </div>
    `;
    
    document.getElementById('everfall-start-selector').addEventListener('change', (e) => {
        this.dungeonProgress.everfall.startFloor = parseInt(e.target.value);
        this.addLog(`Hollowed Wilds start floor set to ${e.target.value}`, 'room');
    });
}

const dungeonProgressStoneforgeDisplay = document.getElementById('stoneforge-progress-display');
if (dungeonProgressStoneforgeDisplay) {
    // Read current start floor
    const stoneforgeStartFloor = this.dungeonProgress.stoneforge.startFloor;
    
    dungeonProgressStoneforgeDisplay.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <span style="color: #94a3b8; font-size: 11px;">Start Floor:</span>
            <select id="stoneforge-start-selector" style="padding: 4px 8px; background: rgba(30, 41, 59, 0.9); color: #e2e8f0; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 11px; cursor: pointer;">
                ${Array.from({length: 200}, (_, i) => i + 1).map(floor => 
                    `<option value="${floor}" ${floor === stoneforgeStartFloor ? 'selected' : ''}>${floor}</option>`
                ).join('')}
            </select>
        </div>
    `;
    
    document.getElementById('stoneforge-start-selector').addEventListener('change', (e) => {
        this.dungeonProgress.stoneforge.startFloor = parseInt(e.target.value);
        this.addLog(`Iron Vaults start floor set to ${e.target.value}`, 'room');
    });
}
const dungeonProgressUmbralDisplay = document.getElementById('umbral-progress-display');
if (dungeonProgressUmbralDisplay) {
    // Read current start floor
    const umbralStartFloor = this.dungeonProgress.umbral.startFloor;
    
    dungeonProgressUmbralDisplay.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <span style="color: #94a3b8; font-size: 11px;">Start Floor:</span>
            <select id="umbral-start-selector" style="padding: 4px 8px; background: rgba(30, 41, 59, 0.9); color: #e2e8f0; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 11px; cursor: pointer;">
                ${Array.from({length: 200}, (_, i) => i + 1).map(floor => 
                    `<option value="${floor}" ${floor === umbralStartFloor ? 'selected' : ''}>${floor}</option>`
                ).join('')}
            </select>
        </div>
    `;
    
    document.getElementById('umbral-start-selector').addEventListener('change', (e) => {
        this.dungeonProgress.umbral.startFloor = parseInt(e.target.value);
        this.addLog(`Whispering Spires start floor set to ${e.target.value}`, 'room');
    });
}


this.party.forEach((member, index) => {
        const currentView = viewStates[index] || 'stats';
        
        const div = document.createElement('div');
        div.className = 'party-member';
                    div.className = 'party-member';
                    // Calculate gear score
                    let gearScore = 0;
                    const rarityPoints = { common: 2, uncommon: 4, rare: 6, epic: 8, legendary: 12, mythic: 16 };
                    Object.values(member.equipment).forEach(item => {
                        if (item) {
                            let basePoints = rarityPoints[item.rarity] || 0;
                            // Perfect mythics get 25 points instead of 16
                            if (item.rarity === 'mythic' && item.mythicStats && item.mythicStats.length === 4) {
                                basePoints = 25;
                            }
                            const multiplier = 1 + (item.level - 1) * 0.1;
                            gearScore += basePoints * multiplier;
                        }
                    });
                    
                    // Add equipped keystone to gear score
                    const keystoneType = member.className.toLowerCase();
                    const equippedKeystone = this.equippedKeystones[keystoneType];
                    if (equippedKeystone) {
                        const basePoints = rarityPoints[equippedKeystone.rarity] || 0;
                        const multiplier = 1 + (equippedKeystone.level - 1) * 0.1;
                        gearScore += basePoints * multiplier;
                    }
                    
                    gearScore = Math.round(gearScore);
                    
                    div.innerHTML = `
    <div class="member-header">
        <span class="member-name">${member.name}</span>
        <div class="ability-status" data-member-index="${index}">
            <div class="ability-indicator" data-ability="1">
                <div class="ability-icon">1</div>
                <svg class="ability-cooldown-ring" viewBox="0 0 36 36">
                    <path class="ability-cooldown-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path class="ability-cooldown-fill" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
            </div>
            <div class="ability-indicator" data-ability="2">
                <div class="ability-icon">2</div>
                <svg class="ability-cooldown-ring" viewBox="0 0 36 36">
                    <path class="ability-cooldown-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path class="ability-cooldown-fill" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
            </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
            <span style="font-size: 11px; color: #f59e0b; font-weight: 600; font-family: 'Orbitron', sans-serif; white-space: nowrap;">GS: ${gearScore}</span>
            <span class="member-level" style="cursor: pointer; background: rgba(99, 102, 241, 0.2); padding: 2px 8px; border-radius: 6px;" onclick="window.game.openSkillTree(${index})" title="Open Skill Tree (K)">Lvl ${member.level} ${member.skillPoints > 0 ? '(+' + member.skillPoints + ')' : ''}</span>
        </div>
    </div>
<div class="view-toggle">
                            <button class="view-btn active" data-view="stats">STATS</button>
                            <button class="view-btn" data-view="abilities">ABILITIES</button>
                            <button class="view-btn" data-view="equipment">GEAR</button>
                            <button class="view-btn" data-view="pet">PET</button>
                        </div>
                        <div class="stat-bars">
    <div class="stat-bar hp-bar">
    <div class="bar-fill" style="width: ${Math.min(100, Math.max(0, (member.hp / member.getTotalMaxHp()) * 100))}%"></div>
    <div class="bar-text">${member.shieldAmount && member.shieldAmount > 0 ? `${Math.round(member.hp + member.shieldAmount)}/${Math.round(member.getTotalMaxHp())} HP (🛡️${Math.round(member.shieldAmount)})` : `${Math.round(member.hp)}/${Math.round(member.getTotalMaxHp())} HP`}</div>
</div>
    <div class="stat-bar mana-bar">
    <div class="bar-fill" style="width: ${Math.min(100, Math.max(0, (member.mana / member.getTotalMaxMana()) * 100))}%"></div>
    <div class="bar-text">${Math.round(member.mana)}/${Math.round(member.getTotalMaxMana())} MANA</div>
</div>
   <div class="stat-bar xp-bar">
    <div class="bar-fill" style="width: ${(member.xp / member.maxXp) * 100}%"></div>
    <div class="bar-text">${member.xp}/${member.maxXp} XP</div>
</div>
</div>
                        <div class="view-content">
    <div class="member-stats-view ${currentView === 'stats' ? 'active' : ''}">
                                <div class="member-stats">
    <div class="stat" title="Damage Per Second - Your total damage output per second (ATK × ATK SPD)">
        <span class="stat-label" data-stat="dps">DPS:</span>
        <span class="stat-value" style="color: #f59e0b;">${Math.round(member.getTotalAttack() * (member.getTotalAttackSpeed ? member.getTotalAttackSpeed() : member.attackSpeed) * 100) / 100}</span>
    </div>
    <div class="stat" title="Attack - Base damage dealt per hit before defense reduction">
        <span class="stat-label" data-stat="attack">ATK:</span>
        <span class="stat-value attack">${member.getTotalAttack()}</span>
    </div>
    <div class="stat" title="Attack Speed - Number of attacks per second (higher = faster attacks)">
        <span class="stat-label" data-stat="attackspeed">ATK SPD:</span>
        <span class="stat-value speed">${(member.getTotalAttackSpeed ? member.getTotalAttackSpeed() : member.attackSpeed).toFixed(2)}/s</span>
    </div>
    <div class="stat" title="Defense - Reduces incoming damage. Formula: Damage Taken = Attack × (100 / (100 + Defense))">
        <span class="stat-label" data-stat="defense">DEF:</span>
        <span class="stat-value defense">${member.getTotalDefense()}</span>
    </div>
    <div class="stat" title="Critical Hit Chance - Percentage chance for attacks to deal critical damage">
        <span class="stat-label" data-stat="crit">CRIT:</span>
        <span class="stat-value" style="color: #f59e0b;">${member.getTotalCritChance().toFixed(2)}%</span>
    </div>
    <div class="stat" title="Critical Hit Damage - Damage multiplier when landing a critical hit (e.g., 200% = 2× damage)">
        <span class="stat-label" data-stat="critdmg">CRIT DMG:</span>
        <span class="stat-value" style="color: #ef4444;">${member.getTotalCritDamage().toFixed(2)}%</span>
    </div>
    <div class="stat" title="Dodge Chance - Percentage chance to completely avoid incoming attacks">
        <span class="stat-label" data-stat="dodge">DODGE:</span>
        <span class="stat-value" style="color: #10b981;">${member.getTotalDodgeChance().toFixed(2)}%</span>
    </div>
    <div class="stat" title="Lifesteal - Percentage of damage dealt that is restored as HP (e.g., 10% lifesteal on 100 damage = 10 HP healed)">
        <span class="stat-label" data-stat="lifesteal">LIFESTEAL:</span>
        <span class="stat-value" style="color: #a1a1aa;">${member.getTotalLifesteal()}%</span>
    </div>
    <div class="stat" title="Cooldown Reduction - Reduces ability cooldowns (e.g., 20% CDR makes 10s cooldown → 8s)">
        <span class="stat-label" data-stat="cdr">CDR:</span>
        <span class="stat-value" style="color: #52525b;">${member.getTotalCDR().toFixed(2)}%</span>
    </div>
    <div class="stat" title="HP Regeneration - Restores stat ÷ 2 HP every 3 seconds during combat">
    <span class="stat-label" data-stat="hpregen">HP REGEN:</span>
    <span class="stat-value" style="color: #a1a1aa;">${member.getTotalHpRegen()}</span>
</div>
<div class="stat" title="Mana Regeneration - Restores stat ÷ 2 mana every 3 seconds during combat">
    <span class="stat-label" data-stat="manaregen">MANA REGEN:</span>
    <span class="stat-value" style="color: #3b82f6;">${member.getTotalManaRegen()}</span>
</div>
</div>
                            </div>
<div class="abilities-view ${currentView === 'abilities' ? 'active' : ''}">
    <div style="padding: 10px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.1);">
        ${(() => {
            const charKey = member.className.toLowerCase();
            
            // Check for equipped ability rune
            let abilityRune = null;
            for (let i = 0; i < 5; i++) {
                const rune = this.equippedRunes[charKey][i];
                if (rune && rune.isAbilityRune) {
                    // Check if this rune matches the character's ability
                    const abilityMatch = {
                        'Tank': 'taunt',
                        'Healer': 'heal',
                        'Mage': 'fireball',
                        'Rogue': 'doublestrike',
                        'Archer': 'multishot',
                        'Paladin': 'divineshield'
                    };
                    if (rune.runeType === abilityMatch[member.className]) {
                        abilityRune = rune;
                        break;
                    }
                }
            }
            
            const abilityName = abilityRune ? abilityRune.name : member.skillName;
const abilityDescription = abilityRune ? abilityRune.description : 
    (member.className === 'Tank' ? 'Taunts all enemies for <span style="color: #f59e0b; font-weight: 600;">5 seconds</span>, forcing them to attack the Tank. Grants <span style="color: #3b82f6; font-weight: 600;">+10 flat defense + 2% of total defense</span> during taunt (scales <span style="color: #a855f7; font-weight: 600;">+4% per rune tier</span>).' :
    member.className === 'Rogue' ? 'Strikes twice, dealing <span style="color: #ef4444; font-weight: 600;">150%</span> total attack damage (scales <span style="color: #a855f7; font-weight: 600;">+50% per rune tier</span>).' :
    member.className === 'Mage' ? 'Blasts all enemies for <span style="color: #ef4444; font-weight: 600;">80%</span> attack damage each (AOE) (scales <span style="color: #a855f7; font-weight: 600;">+20% per rune tier</span>).' :
    member.className === 'Healer' ? 'Heals an injured ally for <span style="color: #10b981; font-weight: 600;">5% of target max HP + (Bonus Mana × 0.4) + 10 flat</span> HP (scales <span style="color: #a855f7; font-weight: 600;">+2% max HP per rune tier</span>).' :
    member.className === 'Archer' ? 'Fires <span style="color: #f59e0b; font-weight: 600;">3 arrows</span> at enemies, each dealing <span style="color: #ef4444; font-weight: 600;">70%</span> attack damage (scales <span style="color: #a855f7; font-weight: 600;">+15% per rune tier</span>).' :
    member.className === 'Paladin' ? 'Grants all allies a shield equal to <span style="color: #3b82f6; font-weight: 600;">15% of their max HP</span> for <span style="color: #f59e0b; font-weight: 600;">4 seconds</span> (scales <span style="color: #a855f7; font-weight: 600;">+5% per rune tier</span>).' : '');
            
            return `
                <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(99, 102, 241, 0.2);">
                    <div style="font-weight: 700; color: ${abilityRune ? '#a855f7' : '#71717a'}; font-size: 14px; margin-bottom: 4px; font-family: 'Orbitron', sans-serif;">
                        1. ${abilityName}${abilityRune ? ' ' + abilityRune.emoji : ''}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Mana Cost: <span style="color: #3b82f6; font-weight: 600;">${member.skillCost}</span></div>
                    <div style="font-size: 11px; color: #94a3b8;">Cooldown: <span style="color: #52525b; font-weight: 600;">${member.maxCooldown}s</span></div>
                </div>
                <div style="font-size: 11px; color: #e2e8f0; line-height: 1.4; margin-bottom: 10px;">
                    ${abilityDescription}
                </div>
            `;
        })()}
        ${(() => {
            const keystoneType = member.className.toLowerCase();
            const equippedKeystone = this.equippedKeystones[keystoneType];
            
            if (equippedKeystone) {
                return `
                    <div style="border-top: 1px solid rgba(99, 102, 241, 0.2); padding-top: 15px;">
                        <div style="font-weight: 700; color: #f59e0b; font-size: 14px; margin-bottom: 5px; font-family: 'Orbitron', sans-serif;">2. ${equippedKeystone.ability.name}</div>
                        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
                            Cooldown: <span style="color: #52525b; font-weight: 600;">${equippedKeystone.ability.cooldown}s</span> | 
                            Mana Cost: <span style="color: ${equippedKeystone.ability.manaCost === 0 ? '#10b981' : '#52525b'}; font-weight: 600;">${equippedKeystone.ability.manaCost === 0 ? 'Free' : equippedKeystone.ability.manaCost}</span>
                        </div>
                        <div style="font-size: 12px; color: #e2e8f0; line-height: 1.5;">
                            ${equippedKeystone.ability.description}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div style="border-top: 1px solid rgba(99, 102, 241, 0.2); padding-top: 15px;">
                        <div style="font-weight: 700; color: #64748b; font-size: 14px; margin-bottom: 5px; font-family: 'Orbitron', sans-serif;">2. No Keystone Equipped</div>
                        <div style="font-size: 11px; color: #64748b; font-style: italic; line-height: 1.5;">
                            Equip a ${member.className} Keystone from the Keystones tab to unlock a powerful second ability!
                        </div>
                    </div>
                `;
            }
        })()}
    </div>
</div>
<div class="pet-view ${currentView === 'pet' ? 'active' : ''}">
    <div style="padding: 15px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.1); height: 100%; display: flex; flex-direction: column;">
        ${(() => {
            const charKey = member.className.toLowerCase();
            const pet = this.equippedPets[charKey];
            const rarityColors = {
                common: '#94a3b8',
                uncommon: '#10b981',
                rare: '#3b82f6',
                epic: '#a855f7',
                legendary: '#f59e0b'
            };
            
            if (pet) {
                const bonus = pet.getCurrentBonus();
                // Format stat name properly
                const statName = pet.bonusType === 'attackSpeed' ? 'Attack Speed' :
                                pet.bonusType === 'critChance' ? 'Crit Chance' :
                                pet.bonusType === 'critDamage' ? 'Crit Damage' :
                                pet.bonusType.charAt(0).toUpperCase() + pet.bonusType.slice(1);
                
                const bonusDisplay = ['attackSpeed', 'critChance', 'dodge', 'critDamage'].includes(pet.bonusType) 
                    ? `+${bonus}%` 
                    : `+${bonus}`;
                
                return `
                    <div style="text-align: center; margin-bottom: 20px; flex-shrink: 0;">
                        <img src="${pet.image}" 
                            style="width: 140px; height: 140px; border-radius: 16px; border: 4px solid ${rarityColors[pet.rarity]}; display: block; margin: 0 auto;">
                    </div>
                    <div style="text-align: center; margin-bottom: 15px; flex-shrink: 0;">
                        <div style="font-weight: 700; color: ${rarityColors[pet.rarity]}; font-size: 20px; margin-bottom: 6px;">
                            ${pet.name}
                        </div>
                        <div style="font-size: 13px; color: #94a3b8;">
                            ${pet.rarity.charAt(0).toUpperCase() + pet.rarity.slice(1)} • Level ${pet.level}
                        </div>
                    </div>
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 14px; border-radius: 8px; margin-bottom: auto; flex-shrink: 0;">
                        <div style="color: #10b981; font-size: 15px; text-align: center; font-weight: 600;">
                            ${pet.bonusType === 'attackSpeed' ? 'Attack Speed' :
                              pet.bonusType === 'critChance' ? 'Crit Chance' :
                              pet.bonusType === 'critDamage' ? 'Crit Damage' :
                              pet.bonusType === 'lifesteal' ? 'Lifesteal' :
                              pet.bonusType === 'manaRegen' ? 'Mana Regen' :
                              pet.bonusType === 'hpRegen' ? 'HP Regen' :
                              pet.bonusType === 'cdr' ? 'CDR' :
                              statName}: ${bonusDisplay}
                        </div>
                    </div>
                    <button onclick="window.game.unequipPet('${charKey}')" 
                        style="width: 100%; padding: 14px; background: rgba(239, 68, 68, 0.2); 
                        color: #ef4444; border: 2px solid #ef4444; border-radius: 8px; cursor: pointer; 
                        font-size: 14px; font-weight: 700; font-family: 'Orbitron', sans-serif; transition: all 0.2s ease; margin-top: 15px; flex-shrink: 0;">
                        UNEQUIP PET
                    </button>
                `;
            } else {
                return `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 64px; color: #475569; margin-bottom: 15px;">🐾</div>
                        <div style="color: #64748b; font-style: italic; font-size: 14px;">
                            No pet equipped
                        </div>
                        <div style="font-size: 11px; color: #52525b; margin-top: 8px;">
                            Visit the Pet Collection tab to equip a pet
                        </div>
                    </div>
                `;
            }
        })()}
    </div>
</div>
<div class="equipment-view ${currentView === 'equipment' ? 'active' : ''}">
    <div class="equipment">
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="weapon">
                                        <span>Weapon:</span>
                                        <span class="equipment-name ${member.equipment.weapon?.rarity || ''}">${member.equipment.weapon?.blessed ? '✨ ' : ''}${member.equipment.weapon?.name || 'None'}</span>
                                    </div>
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="chest">
                                        <span>Chest:</span>
                                        <span class="equipment-name ${member.equipment.chest?.rarity || ''}">${member.equipment.chest?.blessed ? '✨ ' : ''}${member.equipment.chest?.name || 'None'}</span>
                                    </div>
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="helmet">
                                        <span>Helmet:</span>
                                        <span class="equipment-name ${member.equipment.helmet?.rarity || ''}">${member.equipment.helmet?.blessed ? '✨ ' : ''}${member.equipment.helmet?.name || 'None'}</span>
                                    </div>
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="gloves">
                                        <span>Gloves:</span>
                                        <span class="equipment-name ${member.equipment.gloves?.rarity || ''}">${member.equipment.gloves?.blessed ? '✨ ' : ''}${member.equipment.gloves?.name || 'None'}</span>
                                    </div>
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="boots">
                                        <span>Boots:</span>
                                        <span class="equipment-name ${member.equipment.boots?.rarity || ''}">${member.equipment.boots?.blessed ? '✨ ' : ''}${member.equipment.boots?.name || 'None'}</span>
                                    </div>
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="amulet">
                                        <span>Amulet:</span>
                                        <span class="equipment-name ${member.equipment.amulet?.rarity || ''}">${member.equipment.amulet?.blessed ? '✨ ' : ''}${member.equipment.amulet?.name || 'None'}</span>
                                    </div>
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="belt">
                                        <span>Belt:</span>
                                        <span class="equipment-name ${member.equipment.belt?.rarity || ''}">${member.equipment.belt?.blessed ? '✨ ' : ''}${member.equipment.belt?.name || 'None'}</span>
                                    </div>
                                    <div class="equipment-slot" data-member-index="${index}" data-slot="ring1">
                                        <span>Ring 1:</span>
                                        <span class="equipment-name ${member.equipment.ring1?.rarity || ''}">${member.equipment.ring1?.blessed ? '✨ ' : ''}${member.equipment.ring1?.name || 'None'}</span>
                                    </div>
<div class="equipment-slot" data-member-index="${index}" data-slot="ring2">
                                        <span>Ring 2:</span>
                                        <span class="equipment-name ${member.equipment.ring2?.rarity || ''}">${member.equipment.ring2?.blessed ? '✨ ' : ''}${member.equipment.ring2?.name || 'None'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    container.appendChild(div);
                });
                
                // Add view toggle functionality with immediate response
                document.querySelectorAll('.view-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const memberIndex = btn.getAttribute('data-member');
                        const view = btn.getAttribute('data-view');
                        const memberCard = btn.closest('.party-member');
                        
                        // Check if mirror mode is enabled
                        const mirrorEnabled = document.getElementById('mirror-toggle')?.checked;
                        
                        if (mirrorEnabled) {
                            // Mirror mode: switch all characters to the same view
                            document.querySelectorAll('.party-member').forEach(card => {
                                // Toggle buttons
                                card.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                                const targetBtn = card.querySelector(`.view-btn[data-view="${view}"]`);
                                if (targetBtn) targetBtn.classList.add('active');
                                
                                // Toggle views
                                card.querySelectorAll('.member-stats-view, .abilities-view, .equipment-view, .pet-view').forEach(v => v.classList.remove('active'));
                                if (view === 'stats') {
                                    card.querySelector('.member-stats-view')?.classList.add('active');
                                } else if (view === 'abilities') {
                                    card.querySelector('.abilities-view')?.classList.add('active');
                                } else if (view === 'equipment') {
                                    card.querySelector('.equipment-view')?.classList.add('active');
                                } else if (view === 'pet') {
                                    card.querySelector('.pet-view')?.classList.add('active');
                                }
                            });
                        } else {
                            // Normal mode: only switch the clicked character's view
                            // Toggle buttons
                            memberCard.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            
                            // Toggle views
                            memberCard.querySelectorAll('.member-stats-view, .abilities-view, .equipment-view, .pet-view').forEach(v => v.classList.remove('active'));
                            if (view === 'stats') {
                                memberCard.querySelector('.member-stats-view').classList.add('active');
                            } else if (view === 'abilities') {
                                memberCard.querySelector('.abilities-view').classList.add('active');
                            } else if (view === 'equipment') {
                                memberCard.querySelector('.equipment-view').classList.add('active');
                            } else if (view === 'pet') {
                                memberCard.querySelector('.pet-view').classList.add('active');
                            }
                        }
                    }, { capture: true });
                });
                
                // Add synchronized scrolling when mirror mode is enabled
                const partyMembers = document.querySelectorAll('.party-member');
                partyMembers.forEach((card, index) => {
                    card.addEventListener('scroll', (e) => {
                        const mirrorEnabled = document.getElementById('mirror-toggle')?.checked;
                        if (mirrorEnabled) {
                            const scrollTop = card.scrollTop;
                            // Sync scroll position to all other party member cards
                            partyMembers.forEach((otherCard, otherIndex) => {
                                if (otherIndex !== index) {
                                    otherCard.scrollTop = scrollTop;
                                }
                            });
                        }
                    });
                });
                
                // Add loot filter checkbox event listeners
                document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const rarity = checkbox.getAttribute('data-rarity');
                        this.lootFilter[rarity] = checkbox.checked;
                        
                        // Log the change
                        if (checkbox.checked) {
                            this.addLog(`Loot filter: ${rarity} items will be collected`, 'room');
                        } else {
                            this.addLog(`Loot filter: ${rarity} items will auto-sell`, 'room');
                        }
                    });
                });
                
                // Add tooltip event listeners to equipment slots
                this.addEquipmentTooltips();
            }

            handleCanvasMouseMove(e) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const tooltip = document.getElementById('enemy-tooltip');
                let hoveredEnemy = null;
                
                // Check if mouse is over any enemy
                this.enemies.forEach(enemy => {
                    if (!enemy.isAlive || !enemy.sprite || enemy.sprite.screenDrawX === undefined) return;
                    
                    const dx = mouseX - enemy.sprite.screenDrawX;
                    const dy = mouseY - enemy.sprite.screenDrawY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 25) { // Hit radius
                        hoveredEnemy = enemy;
                    }
                });
                
if (hoveredEnemy) {
    // Show enemy tooltip
    const attack = hoveredEnemy.getTotalAttack ? hoveredEnemy.getTotalAttack() : hoveredEnemy.attack;
    const defense = hoveredEnemy.getTotalDefense ? hoveredEnemy.getTotalDefense() : hoveredEnemy.defense;
    
    // Calculate drop chance and rarity odds based on actual game code
    let dropChance = '5%';
    let rarityOdds = '';
    
    // Check if we're in Divine Arena dungeon
    if (this.currentDungeon === 'endlessblessings' && this.endlessKillCount !== undefined) {
        const kills = this.endlessKillCount;
        dropChance = 'No individual drops';
        
        // Show detailed loot system breakdown
        rarityOdds = `
            <div style="color: #a855f7; font-weight: 700; font-size: 12px; margin-top: 4px; margin-bottom: 6px; border-top: 1px solid rgba(168, 85, 247, 0.3); padding-top: 6px;">
                📊 Endless Arena Loot System
            </div>
            <div style="font-size: 10px; line-height: 1.6;">
                <div style="color: ${kills < 10 ? '#ef4444' : '#94a3b8'}; ${kills < 10 ? 'font-weight: 600;' : ''}">
                    🔒 Kills 1-9: No loot (Survive to 10!)
                </div>
                <div style="color: ${kills >= 10 && kills <= 20 ? '#10b981' : '#94a3b8'}; ${kills >= 10 && kills <= 20 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 10-20: Item Lvl ~60-80 | 50% <span style="color: #3b82f6;">Rare</span>, 35% <span style="color: #a855f7;">Epic</span>, 15% <span style="color: #f59e0b;">Legendary</span>
                </div>
                <div style="color: ${kills >= 21 && kills < 40 ? '#10b981' : '#94a3b8'}; ${kills >= 21 && kills < 40 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 21-39: Item Lvl ~80-100 | 35% <span style="color: #3b82f6;">Rare</span>, 45% <span style="color: #a855f7;">Epic</span>, 20% <span style="color: #f59e0b;">Legendary</span>, 0.1% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 40 && kills < 60 ? '#10b981' : '#94a3b8'}; ${kills >= 40 && kills < 60 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 40-59: Item Lvl ~100-120 | 20% <span style="color: #3b82f6;">Rare</span>, 50% <span style="color: #a855f7;">Epic</span>, 30% <span style="color: #f59e0b;">Legendary</span>, 0.2% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 60 && kills < 80 ? '#10b981' : '#94a3b8'}; ${kills >= 60 && kills < 80 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 60-79: Item Lvl ~120-140 | 10% <span style="color: #3b82f6;">Rare</span>, 50% <span style="color: #a855f7;">Epic</span>, 40% <span style="color: #f59e0b;">Legendary</span>, 0.3% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 80 && kills < 100 ? '#10b981' : '#94a3b8'}; ${kills >= 80 && kills < 100 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 80-99: Item Lvl ~140-160 | 5% <span style="color: #3b82f6;">Rare</span>, 45% <span style="color: #a855f7;">Epic</span>, 50% <span style="color: #f59e0b;">Legendary</span>, 0.5% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 100 && kills < 120 ? '#10b981' : '#94a3b8'}; ${kills >= 100 && kills < 120 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 100-119: Item Lvl ~160-180 | 34% <span style="color: #a855f7;">Epic</span>, 65% <span style="color: #f59e0b;">Legendary</span>, 1% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 120 && kills < 140 ? '#10b981' : '#94a3b8'}; ${kills >= 120 && kills < 140 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 120-139: Item Lvl ~180-200 | 23% <span style="color: #a855f7;">Epic</span>, 75% <span style="color: #f59e0b;">Legendary</span>, 2% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 140 && kills < 160 ? '#10b981' : '#94a3b8'}; ${kills >= 140 && kills < 160 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 140-159: Item Lvl ~200-220 | 12% <span style="color: #a855f7;">Epic</span>, 85% <span style="color: #f59e0b;">Legendary</span>, 3% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 160 && kills < 180 ? '#10b981' : '#94a3b8'}; ${kills >= 160 && kills < 180 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 160-179: Item Lvl ~220-240 | 5% <span style="color: #a855f7;">Epic</span>, 90% <span style="color: #f59e0b;">Legendary</span>, 5% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 180 && kills < 200 ? '#10b981' : '#94a3b8'}; ${kills >= 180 && kills < 200 ? 'font-weight: 600;' : ''}">
                    ✓ Kills 180-199: Item Lvl ~240-260 | 3% <span style="color: #a855f7;">Epic</span>, 90% <span style="color: #f59e0b;">Legendary</span>, 7% <span style="color: #ec4899;">Mythic</span>
                </div>
                <div style="color: ${kills >= 200 ? '#10b981' : '#94a3b8'}; ${kills >= 200 ? 'font-weight: 600;' : ''}">
                    ⭐ Kills 200+: Item Lvl ~260+ | 2% <span style="color: #a855f7;">Epic</span>, 88% <span style="color: #f59e0b;">Legendary</span>, 10% <span style="color: #ec4899;">Mythic</span>
                </div>
            </div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(168, 85, 247, 0.3); color: #fbbf24; font-weight: 700; font-size: 11px;">
                💀 Current Progress: ${kills} kills
            </div>
        `;
    } else if (hoveredEnemy.isBoss) {
        dropChance = '100% (Boss Loot)';
        rarityOdds = '<span style="color: #94a3b8;">Common: 30%</span>, <span style="color: #10b981;">Uncommon: 30%</span>, <span style="color: #3b82f6;">Rare: 30%</span>, <span style="color: #a855f7;">Epic: 9%</span>, <span style="color: #f59e0b;">Legendary: 1%</span>';
    } else if (hoveredEnemy.name === 'Treasure Guardian') {
        dropChance = '100%';
        rarityOdds = '<span style="color: #94a3b8;">Common: ~50-70%</span>, <span style="color: #10b981;">Uncommon: 20%</span>, <span style="color: #3b82f6;">Rare: 8%</span>, <span style="color: #a855f7;">Epic: 2%</span>, <span style="color: #f59e0b;">Legendary: 0.1%</span>, <span style="color: #ef4444;">Mythic: 0.1%</span>';
    } else {
        // Regular enemies - 5% drop chance with floor scaling
        const floorBonus = Math.min(this.dungeonFloor * 0.2, 20);
        const commonChance = Math.max(0, 69.9 - floorBonus);
        rarityOdds = `<span style="color: #94a3b8;">Common: ${commonChance.toFixed(1)}%</span>, <span style="color: #10b981;">Uncommon: 20%</span>, <span style="color: #3b82f6;">Rare: 8%</span>, <span style="color: #a855f7;">Epic: 2%</span>, <span style="color: #f59e0b;">Legendary: 0.1%</span>`;
    }
    
    let tooltipHTML = `
        <div class="tooltip-header" style="color: ${hoveredEnemy.color}">${hoveredEnemy.name}</div>
        <div class="tooltip-stats">
            <div class="tooltip-stat">HP: ${Math.floor(hoveredEnemy.hp)}/${hoveredEnemy.maxHp}</div>
            <div class="tooltip-stat">Attack: ${attack}</div>
            <div class="tooltip-stat">Defense: ${defense}</div>
            <div class="tooltip-stat">Attack Speed: ${hoveredEnemy.attackSpeed.toFixed(1)}/s</div>
            <div class="tooltip-stat" style="border-top: 1px solid rgba(99, 102, 241, 0.2); margin-top: 8px; padding-top: 8px; color: #f59e0b;">Loot Drop: ${dropChance}</div>
            <div class="tooltip-stat" style="font-size: 11px; color: #94a3b8; line-height: 1.4;">${rarityOdds}</div>
        </div>
    `;
                    
                    tooltip.innerHTML = tooltipHTML;
                    tooltip.classList.add('show');
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;
                } else {
                    tooltip.classList.remove('show');
                }
            }

addEquipmentTooltips() {
    const tooltip = document.getElementById('equipment-tooltip');
    
    // Get all equipment slots and replace them with clones (removes old listeners)
    const slots = Array.from(document.querySelectorAll('.equipment-slot'));
    const newSlots = [];
    
    slots.forEach(slot => {
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);
        newSlots.push(newSlot);
    });
    
    // Now add fresh listeners to the new slots
    newSlots.forEach(slot => {
        slot.addEventListener('mouseenter', (e) => {
            const memberIndex = parseInt(slot.getAttribute('data-member-index'));
            const slotName = slot.getAttribute('data-slot');
            
            if (memberIndex === undefined || !slotName) return;
            
            const member = this.party[memberIndex];
            if (!member) return;
            
            const item = member.equipment[slotName];
            if (!item || !item.name) return;
            
            let tooltipHTML = `
                <div class="tooltip-header ${item.rarity}">${item.name}</div>
                <div class="tooltip-stats">
            `;
            
            // Add mythic stat indicator if mythic item
if (item.rarity === 'mythic' && (item.mythicStat || item.mythicStats)) {
    const mythicStatNames = item.mythicStats ? item.mythicStats.map(s => s.toUpperCase()).join(', ') : item.mythicStat.toUpperCase();
    const isPerfect = item.mythicStats && item.mythicStats.length === 4;
    const statWord = (item.mythicStats && item.mythicStats.length > 1) ? 'STATS' : 'STAT';
    const prefix = isPerfect ? '✨ PERFECT MYTHIC' : '⚡ MYTHIC';
    const bgColor = isPerfect ? 'rgba(255, 215, 0, 0.15)' : 'rgba(201, 16, 167, 0.1)';
    const borderColor = isPerfect ? '#ffd700' : '#c910a7';
    
    tooltipHTML += `<div style="color: ${isPerfect ? '#ffd700' : '#c910a7'}; font-size: 11px; font-weight: 700; margin-bottom: 8px; text-align: center; border: 1px solid ${borderColor}; border-radius: 4px; padding: 4px; background: ${bgColor}; ${isPerfect ? 'animation: legendary-pulse 2s ease-in-out infinite;' : ''}">${prefix} ${statWord}: ${mythicStatNames} ✨</div>`;
}
            
            if (item.attack) tooltipHTML += `<div class="tooltip-stat">+${item.attack} Attack ${this.getStatRollPercent(item, 'attack')}</div>`;
            if (item.attackSpeed) tooltipHTML += `<div class="tooltip-stat">+${item.attackSpeed} Attack Speed ${this.getStatRollPercent(item, 'attackSpeed')}</div>`;
            if (item.hp) tooltipHTML += `<div class="tooltip-stat">+${item.hp} HP ${this.getStatRollPercent(item, 'hp')}</div>`;
            if (item.mana) tooltipHTML += `<div class="tooltip-stat">+${item.mana} Mana ${this.getStatRollPercent(item, 'mana')}</div>`;
            if (item.defense) tooltipHTML += `<div class="tooltip-stat">+${item.defense} Defense ${this.getStatRollPercent(item, 'defense')}</div>`;
            if (item.critChance) tooltipHTML += `<div class="tooltip-stat">+${item.critChance}% Crit Chance ${this.getStatRollPercent(item, 'critChance')}</div>`;
            if (item.critDamage) tooltipHTML += `<div class="tooltip-stat">+${item.critDamage}% Crit Damage ${this.getStatRollPercent(item, 'critDamage')}</div>`;
            if (item.dodgeChance) tooltipHTML += `<div class="tooltip-stat">+${item.dodgeChance}% Dodge Chance ${this.getStatRollPercent(item, 'dodgeChance')}</div>`;
            if (item.lifesteal) tooltipHTML += `<div class="tooltip-stat">+${item.lifesteal}% Lifesteal ${this.getStatRollPercent(item, 'lifesteal')}</div>`;
            if (item.hpRegen) tooltipHTML += `<div class="tooltip-stat">+${item.hpRegen} HP Regen ${this.getStatRollPercent(item, 'hpRegen')}</div>`;
if (item.manaRegen) tooltipHTML += `<div class="tooltip-stat">+${item.manaRegen} Mana Regen ${this.getStatRollPercent(item, 'manaRegen')}</div>`;
            if (item.cdr) tooltipHTML += `<div class="tooltip-stat">+${item.cdr}% CDR ${this.getStatRollPercent(item, 'cdr')}</div>`;
            
            // Add blessed status indicator
            if (item.blessed) {
                tooltipHTML += `<div style="color: #a855f7; font-size: 11px; font-weight: 700; margin-top: 8px; text-align: center; border: 1px solid #a855f7; border-radius: 4px; padding: 4px; background: rgba(168, 85, 247, 0.1);">✨ BLESSED - One stat increased by 50%</div>`;
            }
            
            tooltipHTML += `</div>`;
            
            tooltip.innerHTML = tooltipHTML;
            tooltip.classList.add('show');
            
            const rect = slot.getBoundingClientRect();
            const tooltipWidth = 250;
            const tooltipHeight = 200;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            if (rect.right + tooltipWidth + 10 > screenWidth) {
                tooltip.style.left = `${rect.left - tooltipWidth - 10}px`;
            } else {
                tooltip.style.left = `${rect.right + 10}px`;
            }

            if (rect.bottom + tooltipHeight + 10 > screenHeight) {
                tooltip.style.top = `${rect.top - tooltipHeight - 10}px`;
            } else {
                tooltip.style.top = `${rect.top}px`;
            }
        });
        
        slot.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
        
        // Add click handler for gear context menu
        slot.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const memberIndex = parseInt(slot.getAttribute('data-member-index'));
            const slotName = slot.getAttribute('data-slot');
            
            if (memberIndex === undefined || !slotName) return;
            
            const member = this.party[memberIndex];
            if (!member) return;
            
            const item = member.equipment[slotName];
            if (!item || !item.name) return;
            
            // Hide tooltip when clicking
            tooltip.classList.remove('show');
            
            // Show context menu
            this.showGearContextMenu(e, memberIndex, slotName, item);
        });
    });
}
                        

showGearContextMenu(e, memberIndex, slotName, item) {
    e.preventDefault();
    e.stopPropagation();
    
    const contextMenu = document.getElementById('gear-context-menu');
    const game = this; // Capture this reference
    
    // Calculate blessing cost based on item level
    const blessingCost = item.level || 25;
    
    contextMenu.innerHTML = `
        <div class="gear-context-menu-item unequip" data-action="unequip">
            Unequip
        </div>
        <div class="gear-context-menu-item bless" data-action="bless">
            ⭐ Bless Item (${blessingCost})
        </div>
    `;
    
    // Position the context menu
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 100;
    
    let left = e.clientX;
    let top = e.clientY;
    
    if (left + menuWidth > screenWidth) {
        left = screenWidth - menuWidth - 10;
    }
    
    if (top + menuHeight > screenHeight) {
        top = screenHeight - menuHeight - 10;
    }
    
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
    contextMenu.classList.add('show');
    
    // Add click handlers to menu items
    contextMenu.querySelectorAll('.gear-context-menu-item').forEach(menuItem => {
        menuItem.addEventListener('click', (clickEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
            
            const action = menuItem.getAttribute('data-action');
            
            if (action === 'unequip') {
                game.unequipItem(memberIndex, slotName);
            } else if (action === 'bless') {
                game.openBlessTab(memberIndex, slotName, item);
            }
            
            contextMenu.classList.remove('show');
        });
    });
    
    // Close menu when clicking outside
    const closeMenu = (event) => {
        if (!contextMenu.contains(event.target)) {
            contextMenu.classList.remove('show');
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

unequipItem(memberIndex, slotName) {
    const member = this.party[memberIndex];
    if (!member) return;
    
    const item = member.equipment[slotName];
    if (!item) return;
    
    // Hide context menu
    const contextMenu = document.getElementById('gear-context-menu');
    if (contextMenu) contextMenu.classList.remove('show');
    
    // Add to inventory
    this.inventory.push(item);
    
    // Remove from equipment
    member.equipment[slotName] = null;
    
    // Recalculate stats for ALL party members to ensure everything updates
    this.party.forEach(m => {
        if (m.updateStats) {
            m.updateStats();
        }
    });
    
    this.addLog(`Unequipped ${item.name} from ${member.name}`, 'loot');
    this.rebuildUI(); // Force full UI rebuild to update equipment display
    
    // Refresh inventory display if user is viewing it
    const inventorySection = document.getElementById('loot-inventory-section');
    if (inventorySection && inventorySection.style.display !== 'none') {
        this.showInventory();
    }
    
    saveGame();
}

openBlessTab(memberIndex, slotName, item) {
    // Switch to bless tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    document.querySelector('[data-tab="bless"]').classList.add('active');
    document.getElementById('bless-tab').classList.add('active');
    
    // Show the selected item in the bless tab
    const blessItemSelected = document.getElementById('bless-item-selected');
    const blessCurrencyDisplay = document.getElementById('blessing-currency-display');
    
    blessCurrencyDisplay.textContent = this.blessingCurrency || 0;
    
    // Calculate blessing cost based on item level
    const blessingCost = item.level || 25;
    
    blessItemSelected.style.display = 'block';
    blessItemSelected.innerHTML = `
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px;">
            <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: ${this.getRarityColor(item.rarity)}; margin-bottom: 10px; font-family: 'Orbitron', sans-serif;">${item.name}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 15px;">Equipped on ${this.party[memberIndex].name} • ${slotName}</div>
                <div style="font-size: 13px; color: #e2e8f0; line-height: 1.8; max-height: 200px; overflow-y: auto;">
                    ${item.attack ? `<div>⚔️ +${item.attack} Attack</div>` : ''}
                    ${item.hp ? `<div>❤️ +${item.hp} HP</div>` : ''}
                    ${item.mana ? `<div>💙 +${item.mana} Mana</div>` : ''}
                    ${item.defense ? `<div>🛡️ +${item.defense} Defense</div>` : ''}
                    ${item.attackSpeed ? `<div>⚡ +${item.attackSpeed} Attack Speed</div>` : ''}
                    ${item.critChance ? `<div>💥 +${item.critChance}% Crit Chance</div>` : ''}
                    ${item.critDamage ? `<div>💢 +${item.critDamage}% Crit Damage</div>` : ''}
                    ${item.dodgeChance ? `<div>🌀 +${item.dodgeChance}% Dodge</div>` : ''}
                    ${item.lifesteal ? `<div>🩸 +${item.lifesteal}% Lifesteal</div>` : ''}
                    ${item.hpRegen ? `<div>💚 +${item.hpRegen} HP Regen</div>` : ''}
                    ${item.manaRegen ? `<div>💜 +${item.manaRegen} Mana Regen</div>` : ''}
                    ${item.cdr ? `<div>⏱️ +${item.cdr}% CDR</div>` : ''}
                </div>
            </div>
        </div>
        
        <button id="bless-button-${memberIndex}-${slotName}" onclick="window.game.blessItem(${memberIndex}, '${slotName}')" 
            style="width: 100%; padding: 16px; background: linear-gradient(135deg, #a855f7, #8b5cf6); 
            color: white; border: none; border-radius: 10px; cursor: pointer; 
            font-size: 16px; font-weight: 700; font-family: 'Orbitron', sans-serif; 
            box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4); transition: all 0.3s ease;">
            ✨ Bless (${blessingCost} 💎)
        </button>
        
        <div style="margin-top: 15px; padding: 15px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">
            <div style="font-size: 12px; color: #c4b5fd; line-height: 1.6;">
                <strong>Blessing Effects:</strong><br>
                • +50% to ONE random stat on this item<br>
                • Adds a purple blessing glow<br>
                • Permanent upgrade (cannot be removed)<br>
                • Works on all rarities, including Mythic!<br>
                ${item.rarity === 'mythic' ? '<br><strong style="color: #c910a7;">⚡ MYTHIC BONUS:</strong><br>• Can boost a 200% stat to 250%!' : ''}
            </div>
        </div>
    `;
}

blessItem(memberIndex, slotName) {
    const member = this.party[memberIndex];
    if (!member) return;
    
    const item = member.equipment[slotName];
    if (!item) return;
    
    // Calculate blessing cost based on item level
    const blessingCost = item.level || 25;
    
    // Check if player has enough currency
    if ((this.blessingCurrency || 0) < blessingCost) {
        this.addLog(`Not enough Blessing Currency! Need ${blessingCost}.`, 'loot');
        return;
    }
    
    // Check if already blessed
    if (item.blessed) {
        this.addLog(`${item.name} is already blessed!`, 'loot');
        return;
    }
    
    // Trigger blessing animation
    const buttonId = `bless-button-${memberIndex}-${slotName}`;
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.add('blessing-animation');
        button.style.pointerEvents = 'none';
        
        // Create particle effect
        const buttonRect = button.getBoundingClientRect();
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createBlessingParticle(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
            }, i * 30);
        }
    }
    
    // Deduct currency
    this.blessingCurrency -= blessingCost;
    
    // Capture stats BEFORE blessing
    const statsBefore = {
        attack: item.attack || 0,
        hp: item.hp || 0,
        mana: item.mana || 0,
        defense: item.defense || 0,
        attackSpeed: item.attackSpeed || 0,
        critChance: item.critChance || 0,
        critDamage: item.critDamage || 0,
        dodgeChance: item.dodgeChance || 0,
        lifesteal: item.lifesteal || 0,
        hpRegen: item.hpRegen || 0,
        manaRegen: item.manaRegen || 0,
        cdr: item.cdr || 0,
        rarity: item.rarity
    };
    
    // Apply blessing
    item.blessed = true;
    
    // Collect all non-zero stats from the item
    const possibleStats = [];
    const statList = ['attack', 'hp', 'mana', 'defense', 'attackSpeed', 'critChance', 
                      'critDamage', 'dodgeChance', 'lifesteal', 'hpRegen', 'manaRegen', 'cdr'];
    
    statList.forEach(stat => {
        if (item[stat] && item[stat] > 0) {
            possibleStats.push(stat);
        }
    });
    
    // Pick one random stat to bless
    let blessedStat = null;
    let blessedStatIncrease = 0;
    
    if (possibleStats.length > 0) {
        blessedStat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
        const oldValue = item[blessedStat];
        // Preserve decimal precision - round to 2 decimal places
        const newValue = Math.round(oldValue * 1.5 * 100) / 100;
        blessedStatIncrease = newValue - oldValue;
        item[blessedStat] = newValue;
        
        // Store which stat was blessed on the item
        item.blessedStat = blessedStat;
        
        this.addLog(`✨ Blessed ${item.name}! ${blessedStat.toUpperCase()} increased by 50%!`, 'loot');
    }
    
    // Recalculate stats for ALL party members to ensure everything updates
    this.party.forEach(m => {
        if (m.updateStats) {
            m.updateStats();
        }
    });
    
    // Delay UI update to allow animation to play
    setTimeout(() => {
        // Capture stats AFTER blessing
        const statsAfter = {
            attack: item.attack || 0,
            hp: item.hp || 0,
            mana: item.mana || 0,
            defense: item.defense || 0,
            attackSpeed: item.attackSpeed || 0,
            critChance: item.critChance || 0,
            critDamage: item.critDamage || 0,
            dodgeChance: item.dodgeChance || 0,
            lifesteal: item.lifesteal || 0,
            hpRegen: item.hpRegen || 0,
            manaRegen: item.manaRegen || 0,
            cdr: item.cdr || 0,
            rarity: item.rarity
        };
        
        // Show blessing results popup with blessed stat info
        this.showBlessingResultsPopup(item.name, item.rarity, statsBefore, statsAfter, blessedStat);
        
        // Full UI rebuild to update equipment display immediately
        this.rebuildUI();
        document.getElementById('blessing-currency-display').textContent = this.blessingCurrency;
        document.getElementById('bless-item-selected').style.display = 'none';
        
        // Switch back to loot/inventory tab so user can see their updated character
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.querySelector('[data-tab="loot"]').classList.add('active');
        document.getElementById('loot-tab').classList.add('active');
        
        // Switch to inventory sub-tab
        document.querySelectorAll('.loot-sub-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.loot-section').forEach(section => section.style.display = 'none');
        document.querySelector('[data-loot-tab="inventory"]').classList.add('active');
        document.getElementById('loot-inventory-section').style.display = 'block';
        this.showInventory();
        
        // Re-enable button for future blessings
        if (button) {
            button.classList.remove('blessing-animation');
            button.style.pointerEvents = '';
        }
        
        saveGame();
    }, 800); // Wait for animation to complete
}

showBlessingResultsPopup(itemName, itemRarity, statsBefore, statsAfter, blessedStat) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.animation = 'fadeIn 0.3s ease';
    
    // Create popup
    const popup = document.createElement('div');
    popup.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)';
    popup.style.border = '3px solid rgba(168, 85, 247, 0.8)';
    popup.style.borderRadius = '16px';
    popup.style.padding = '30px';
    popup.style.maxWidth = '500px';
    popup.style.width = '90%';
    popup.style.maxHeight = '80vh';
    popup.style.overflowY = 'auto';
    popup.style.boxShadow = '0 0 40px rgba(168, 85, 247, 0.4), 0 20px 60px rgba(0, 0, 0, 0.8)';
    popup.style.fontFamily = 'Rajdhani, sans-serif';
    popup.style.animation = 'blessing-burst 0.5s ease-out';
    
    // Rarity colors
    const rarityColors = {
        common: '#94a3b8',
        uncommon: '#10b981',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b',
        mythic: '#ec4899'
    };
    
    const itemColor = rarityColors[itemRarity] || '#e2e8f0';
    
    // Helper to format stat names
    const statNames = {
        attack: '⚔️ Attack',
        hp: '❤️ HP',
        mana: '💙 Mana',
        defense: '🛡️ Defense',
        attackSpeed: '⚡ Attack Speed',
        critChance: '💥 Crit Chance',
        critDamage: '💢 Crit Damage',
        dodgeChance: '🌀 Dodge',
        lifesteal: '🩸 Lifesteal',
        hpRegen: '💚 HP Regen',
        manaRegen: '💜 Mana Regen',
        cdr: '⏱️ CDR'
    };
    
    // Calculate the blessed stat change
    let blessedStatInfo = '';
    if (blessedStat && statsBefore[blessedStat] !== undefined) {
        const before = statsBefore[blessedStat];
        const after = statsAfter[blessedStat];
        const increase = after - before;
        const percentIncrease = before > 0 ? Math.round((increase / before) * 100) : 0;
        
        blessedStatInfo = `
            <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%); border-radius: 12px; padding: 20px; border: 2px solid #a855f7; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 16px; font-weight: 700; color: #e9d5ff; margin-bottom: 12px; font-family: 'Orbitron', sans-serif;">✨ BLESSED STAT ✨</div>
                <div style="font-size: 32px; font-weight: 800; color: #a855f7; margin-bottom: 8px; font-family: 'Orbitron', sans-serif;">${statNames[blessedStat]}</div>
                <div style="display: flex; justify-content: center; align-items: center; gap: 12px; font-size: 24px; font-weight: 700;">
                    <span style="color: #94a3b8;">${before}</span>
                    <span style="color: #a855f7;">→</span>
                    <span style="color: #22c55e;">${after}</span>
                </div>
                <div style="font-size: 18px; font-weight: 700; color: #22c55e; margin-top: 8px;">
                    +${increase} (+${percentIncrease}%)
                </div>
            </div>
        `;
    }
    
    // Build content
    let content = `
        <div style="text-align: center; margin-bottom: 25px;">
            <div style="font-size: 32px; margin-bottom: 10px;">✨ BLESSED! ✨</div>
            <div style="font-size: 24px; font-weight: 700; color: ${itemColor}; font-family: 'Orbitron', sans-serif;">${itemName}</div>
            <div style="font-size: 16px; color: #22c55e; margin-top: 8px; font-weight: 700;">+50% ${blessedStat ? statNames[blessedStat] : 'to random stat'}!</div>
        </div>
        
        ${blessedStatInfo}
        
        <div style="background: rgba(168, 85, 247, 0.1); border-radius: 10px; padding: 20px; border: 1px solid rgba(168, 85, 247, 0.3);">
            <div style="font-size: 16px; font-weight: 700; color: #e9d5ff; margin-bottom: 15px; font-family: 'Orbitron', sans-serif;">ALL STATS</div>
    `;
    
    // Show all stats
    let hasStats = false;
    for (const stat in statsAfter) {
        if (stat === 'rarity') continue;
        
        const value = statsAfter[stat];
        
        if (value > 0) {
            hasStats = true;
            const isBlessedStat = stat === blessedStat;
            content += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(168, 85, 247, 0.2); ${isBlessedStat ? 'background: rgba(168, 85, 247, 0.15); padding-left: 8px; padding-right: 8px; border-radius: 4px;' : ''}">
                    <div style="color: ${isBlessedStat ? '#a855f7' : '#e2e8f0'}; font-size: 14px; ${isBlessedStat ? 'font-weight: 700;' : ''}">${statNames[stat] || stat} ${isBlessedStat ? '✨' : ''}</div>
                    <div style="color: ${isBlessedStat ? '#22c55e' : '#e2e8f0'}; font-size: 14px; font-weight: ${isBlessedStat ? '700' : '500'};">${value}</div>
                </div>
            `;
        }
    }
    
    if (!hasStats) {
        content += '<div style="color: #94a3b8; text-align: center; padding: 10px;">No stats</div>';
    }
    
    content += `
        </div>
        
        <button onclick="this.parentElement.parentElement.remove()" 
            style="width: 100%; margin-top: 20px; padding: 14px; background: linear-gradient(135deg, #a855f7, #8b5cf6); 
            color: white; border: none; border-radius: 10px; cursor: pointer; 
            font-size: 16px; font-weight: 700; font-family: 'Orbitron', sans-serif; 
            box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4); transition: all 0.3s ease;">
            AWESOME!
        </button>
    `;
    
    popup.innerHTML = content;
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

gameLoop() {
                // Track last game loop time for background detection
                this._lastGameLoopTime = Date.now();
                
                // Calculate delta time for real-time combat
                const currentTime = performance.now();
                this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
                this.lastFrameTime = currentTime;
                this.deltaTime = Math.min(this.deltaTime, 0.1); // Cap at 100ms to prevent huge jumps
                
                // Add frame skipping - run at 30 FPS instead of 60
if (!this._frameSkip) this._frameSkip = 0;
this._frameSkip = (this._frameSkip + 1) % 1000; // Keep counter small

// Periodic cleanup every 10 seconds (600 frames at 60fps)
if (this._frameSkip % 600 === 0) {
    this.floatingTextPool = this.floatingTextPool.slice(0, 10);
    // Clean up old visual effects - more aggressive to prevent 8hr+ memory leak
if (this.visualEffects && this.visualEffects.length > 10) {
    this.visualEffects = this.visualEffects.filter(e => e.life > 0).slice(-10);
}
    
    // Clean up dead enemies from memory
    this.enemies = this.enemies.filter(e => e.isAlive);
    // Clean up any orphaned fountain overlays
    const fountainOverlay = document.getElementById('fountain-overlay');
    if (fountainOverlay && fountainOverlay.style.display === 'none') {
        fountainOverlay.remove();
    }
}
                
                // Only draw every other frame (30 FPS rendering)
                if (this._frameSkip % 2 === 0) {
                    // Clear canvas (transparent so background shows through)
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    // Draw adjacent rooms (darkened, in background)
                if (this.adjacentRooms) {
                    this.adjacentRooms.forEach(adjRoom => {
                        const adjOffsetX = this.offsetX + adjRoom.offsetX * ISO.tileWidth/2 - adjRoom.offsetY * ISO.tileWidth/2;
                        const adjOffsetY = this.offsetY + adjRoom.offsetX * ISO.tileHeight/2 + adjRoom.offsetY * ISO.tileHeight/2;
                        
                        // Save context and apply transparency
                        this.ctx.save();
                        this.ctx.globalAlpha = adjRoom.alpha;
                        adjRoom.room.draw(this.ctx, adjOffsetX, adjOffsetY, true);
                        this.ctx.restore();
                    });
                }
                
                // Draw hallways (on top of adjacent rooms but below main room)
                if (this.hallways) {
                    this.hallways.forEach(hallway => {
                        const hallwayOffsetX = this.offsetX + hallway.offsetX * ISO.tileWidth/2 - hallway.offsetY * ISO.tileWidth/2;
                        const hallwayOffsetY = this.offsetY + hallway.offsetX * ISO.tileHeight/2 + hallway.offsetY * ISO.tileHeight/2;
                        hallway.room.draw(this.ctx, hallwayOffsetX, hallwayOffsetY, false);
                    });
                }
                
                // Draw main room (on top)
                if (this.room) {
                    this.room.draw(this.ctx, this.offsetX, this.offsetY);
                }
                
                // Update and draw sprites - ALWAYS update positions before drawing
                const allUnits = [...this.party, ...this.enemies]
                    .filter(u => u.sprite && u.isAlive)
                    .sort((a, b) => {
                        const aY = a.sprite.gridX + a.sprite.gridY;
                        const bY = b.sprite.gridX + b.sprite.gridY;
                        return aY - bY;
                    });
                
                allUnits.forEach(unit => {
                    if (unit.sprite) {
                        unit.sprite.update(); // This MUST run before draw
                        unit.sprite.draw(this.ctx, this.offsetX, this.offsetY);
                    }
                });
                
                // Update and draw visual effects
                this.updateVisualEffects();
                this.drawVisualEffects(this.ctx);
				this.drawRuneTrialPillar(this.ctx);
                } // Close the if statement for frame skipping
                
                // Battle tick - continuous real-time combat (runs every frame regardless)
// Also run during Rune Trial pillar charging phase
// Only run during Rune Trial pillar charging phase
const shouldRunBattleTick = !this.paused && (this.inBattle || (this.currentDungeon === 'runetrial' && this.runeTrialPillarCharging));

if (shouldRunBattleTick) {
    if (!this.battleTimer) this.battleTimer = 0;
    this.battleTimer++;
    // Battle ticks every frame now for smooth real-time combat
    for (let i = 0; i < this.speed; i++) {
        this.battleTick();
    }
    
    // Update endless dungeon if active (throttled to once per second for performance)
    if (this.currentDungeon === 'endlessblessings' && !this.paused) {
        if (!this._endlessUpdateCounter) this._endlessUpdateCounter = 0;
        this._endlessUpdateCounter++;
        if (this._endlessUpdateCounter >= 60) { // Run once per second (60 frames)
            this.updateEndlessDungeon();
            this._endlessUpdateCounter = 0;
        }
    }
    
    // Update character stats display for all dungeons during battle (throttled to every 30 frames for performance - ~0.5s at 60fps)
    if (this.inBattle && this.characterStats && !this.paused) {
        if (!this._statsUpdateCounter) this._statsUpdateCounter = 0;
        this._statsUpdateCounter++;
        if (this._statsUpdateCounter >= 30) {
            this.updateCharacterStatsDisplay();
            this._statsUpdateCounter = 0;
        }
    }
}
                
                if (!this.destroyed) {
                    this.gameLoopFrameId = this.animationManager.request(() => this.gameLoop());
                }
            }
            
            cleanup() {
                if (this.destroyed) return;
                
                
                this.destroyed = true;
                this.paused = true;
                
                // Stop animations
                if (this.gameLoopFrameId) {
                    this.animationManager.cancel(this.gameLoopFrameId);
                    this.gameLoopFrameId = null;
                }
                
                if (this.animationManager) {
                    this.animationManager.cancelAll();
                }
                
                // Clear timers
                if (this.timerManager) {
                    this.timerManager.clearAll();
                }
                
                // Remove event listeners
                if (this.eventManager) {
                    this.eventManager.removeAll();
                }
                
                // Clear arrays to free memory
                if (this.visualEffects) this.visualEffects.length = 0;
                if (this.loot) this.loot.length = 0;
                
                
            }

            getRarityColor(rarity) {
    const colors = {
        common: '#94a3b8',
        uncommon: '#10b981',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b',
        mythic: '#c910a7'
    };
    return colors[rarity] || '#94a3b8';
}

            showLootPopup(item) {
    const container = document.getElementById('loot-popup-container');
    if (!container) return;
    
    // Limit max popups to prevent lag (remove oldest if too many)
    while (container.children.length >= 5) {
        container.removeChild(container.firstChild);
    }
    
    // Duration based on rarity (in ms)
    const durations = {
        common: 1500,
        uncommon: 2000,
        rare: 3000,
        epic: 4000,
        legendary: 5000,
        mythic: 6000
    };
    
    // Item type icons
    const typeIcons = {
        weapon: '⚔️',
        armor: '🛡️',
        accessory: '💍',
        helmet: '⛑️'
    };
    
    const duration = durations[item.rarity] || 1500;
    const icon = typeIcons[item.type] || '✨';
    
    // Create popup element
    const popup = document.createElement('div');
    popup.className = `loot-popup ${item.rarity}`;
    popup.innerHTML = `
        <div class="loot-popup-icon">${icon}</div>
        <div class="loot-popup-rarity">${item.rarity.toUpperCase()}</div>
        <div class="loot-popup-name">${item.name}</div>
    `;
    
    container.appendChild(popup);
    
    // Store timeout IDs on the element for cleanup
    const fadeTimeout = setTimeout(() => {
        popup.classList.add('fade-out');
    }, duration - 500);
    
    const removeTimeout = setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, duration);
    
    // Store for potential cleanup
    popup._timeouts = [fadeTimeout, removeTimeout];
}
            
            getStatRollPercent(item, statName) {
    if (!item || !item[statName]) return '';
    
    // Check if this stat was blessed
    const isBlessedStat = item.blessed && item.blessedStat === statName;
    
    // Mythic items show 200% for mythic stat(s), 100% for others
if (item.rarity === 'mythic') {
    // Check if this stat is mythic (handle both single and multiple)
    const isMythicStat = item.mythicStat === statName || (item.mythicStats && item.mythicStats.includes(statName));
    
    if (isMythicStat && isBlessedStat) {
        // Blessed mythic stat: 200% * 1.5 = 300% (showing as 250% because it's 2.5x base)
        return '<span style="color: #c910a7;">(250%)</span>';
    } else if (isMythicStat) {
        return '<span style="color: #c910a7;">(200%)</span>';
    } else if (isBlessedStat) {
        // Blessed non-mythic stat on mythic item: 100% * 1.5 = 150%
        return '<span style="color: #a855f7;">(150%)</span>';
    } else {
        return '<span style="color: #f59e0b;">(100%)</span>';
    }
}
    
    // Legendary items always show 100% (or 150% if blessed)
    if (item.rarity === 'legendary') {
        if (isBlessedStat) {
            return '<span style="color: #a855f7;">(150%)</span>';
        }
        return '<span style="color: #f59e0b;">(100%)</span>';
    }
                
                // For other rarities, check if blessed
                if (isBlessedStat) {
                    return '<span style="color: #a855f7;">(150%)</span>';
                }
                
                // Stat ranges from Item class (with weapon-specific overrides)
                const statRanges = {
                    attack: { min: 0.5, max: 3 },
                    hp: { min: 4, max: 12.5 },
                    mana: { min: 2.5, max: 7.5 },
                    defense: { min: 1, max: 4 },
                    attackSpeed: { min: 0.025, max: 0.09 },
                    critChance: { min: 0.5, max: 3 },
                    critDamage: { min: 2, max: 8 },
                    dodgeChance: { min: 1, max: 3 },
                    lifesteal: { min: 0.5, max: 2 },
                    cdr: { min: 0.5, max: 3 },
                    hpRegen: { min: 2.5, max: 15 },
                    manaRegen: { min: 5, max: 25 }
                };
                
                // Apply weapon-specific stat range overrides
                if (item.type === 'dagger' && statName === 'attack') {
                    statRanges.attack = { min: 1, max: 9 };
                }
                if (item.type === 'greatsword' && statName === 'attack') {
                    statRanges.attack = { min: 1, max: 7 };
                }
                if (item.type === 'greatsword' && statName === 'hp') {
                    statRanges.hp = { min: 8, max: 40 };
                }
                if (item.type === 'bow' && statName === 'attack') {
                    statRanges.attack = { min: 1, max: 8.5 };
                }
                if (item.type === 'wand' && statName === 'attack') {
                    statRanges.attack = { min: 1, max: 8 };
                }
                if (item.type === 'staff' && statName === 'attack') {
                    statRanges.attack = { min: 1, max: 7 };
                }
                if (item.type === 'staff' && statName === 'mana') {
                    statRanges.mana = { min: 5, max: 25 };
                }
                if (item.type === 'warhammer' && statName === 'attack') {
                    statRanges.attack = { min: 1, max: 7.5 };
                }
                if (item.type === 'warhammer' && statName === 'hp') {
                    statRanges.hp = { min: 7, max: 35 };
                }
                if (item.type === 'warhammer' && statName === 'mana') {
                    statRanges.mana = { min: 3.5, max: 12.5 };
                }
                if ((item.type === 'staff' || item.type === 'wand' || item.type === 'amulet') && statName === 'manaRegen') {
                    statRanges.manaRegen = { min: 4, max: 20 };
                }
                
                const range = statRanges[statName];
                if (!range) return '';
                
                // Calculate the scaled range for this item's level
                // MUST match the scaling in Item constructor!
                const levelScaling = Math.pow(1.018, item.level);
                const scaledMin = range.min * levelScaling;
                const scaledMax = range.max * levelScaling;
                
                // Calculate roll percentage
                const rollPercent = Math.round(((item[statName] - scaledMin) / (scaledMax - scaledMin)) * 100);
                
                // Color based on roll quality
                let color = '#64748b'; // Gray for low rolls
                if (rollPercent >= 90) color = '#f59e0b'; // Gold for 90%+
                else if (rollPercent >= 75) color = '#a855f7'; // Purple for 75%+
                else if (rollPercent >= 50) color = '#3b82f6'; // Blue for 50%+
                
                return `<span style="color: ${color};">(${Math.max(0, Math.min(100, rollPercent))}%)</span>`;
            }
        }
