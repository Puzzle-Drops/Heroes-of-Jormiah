        // ========================================
        // CHARACTER SELECT SYSTEM - 4 CHARACTER PARTY
        // ========================================
        let selectedParty = [null, null, null, null]; // Array of 4 character classes
        
        // Character icon mapping
        const charIcons = {
            'tank': '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/tank.png" alt="Tank">',
            'healer': '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/healer.png" alt="Healer">',
            'mage': '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/mage.png" alt="Mage">',
            'rogue': '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/rogue.png" alt="Rogue">',
            'archer': '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/archer.png" alt="Archer">',
            'paladin': '<img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/paladin.png" alt="Paladin">'
        };
        
        const charNames = {
            'tank': 'Tank',
            'healer': 'Healer',
            'mage': 'Mage',
            'rogue': 'Rogue',
            'archer': 'Archer',
            'paladin': 'Paladin'
        };
        
// =================================================================
// STEAM ACHIEVEMENT TRACKING SYSTEM
// =================================================================
// Works with steamworks.js via window.steamapi (set up in preload.js)

// Achievement IDs - must match Steamworks configuration
window.ACHIEVEMENTS = {
    FIRST_VICTORY: 'ACH_FIRST_VICTORY',
    GOLD_HOARDER_1K: 'ACH_GOLD_1K',
    GOLD_HOARDER_10K: 'ACH_GOLD_10K',
    GOLD_HOARDER_100K: 'ACH_GOLD_100K',
    FLOOR_10: 'ACH_FLOOR_10',
    FLOOR_25: 'ACH_FLOOR_25',
    FLOOR_50: 'ACH_FLOOR_50',
    FLOOR_100: 'ACH_FLOOR_100',
    FIRST_KEYSTONE: 'ACH_FIRST_KEYSTONE',
    FIRST_RUNE: 'ACH_FIRST_RUNE',
    FIRST_LEGENDARY: 'ACH_FIRST_LEGENDARY',
    FIRST_MYTHIC: 'ACH_FIRST_MYTHIC',
    ENDLESS_10: 'ACH_ENDLESS_10',
    ENDLESS_50: 'ACH_ENDLESS_50',
    ENDLESS_100: 'ACH_ENDLESS_100',
    ENDLESS_200: 'ACH_ENDLESS_200',
    ALL_DUNGEONS: 'ACH_ALL_DUNGEONS',
    VAULT_MASTER: 'ACH_VAULT_5',
    RUNE_COLLECTOR: 'ACH_RUNE_10',
    KEYSTONE_MASTER: 'ACH_KEYSTONE_10',
    MAX_LEVEL: 'ACH_MAX_LEVEL',
    FULL_LEGENDARY: 'ACH_FULL_LEGENDARY'
};

// Helper to unlock achievement via steamworks.js (async)
window.unlockAchievement = async (achievementId) => {
    if (window.steamapi) {
        try {
            const isLoaded = await window.steamapi.isLoaded();
            if (isLoaded) {
                await window.steamapi.activateAchievement(achievementId);
                console.log('🏆 Achievement unlocked:', achievementId);
            }
        } catch (e) {
            console.error('Achievement error:', e);
        }
    }
};

// Steam Cloud save helper
window.steamCloudSave = async (data) => {
    if (window.steamapi) {
        try {
            const isLoaded = await window.steamapi.isLoaded();
            if (isLoaded) {
                await window.steamapi.cloudSave(SAVE_FILE_NAME, data);
                console.log('☁️ Steam Cloud: Save uploaded' + (DEMO_MODE ? ' (DEMO)' : ''));
                return true;
            }
        } catch (e) {
            console.error('Steam Cloud save error:', e);
        }
    }
    return false;
};

// Steam Cloud load helper
window.steamCloudLoad = async () => {
    if (window.steamapi && window.steamapi.cloudLoad) {
        try {
            const isLoaded = await window.steamapi.isLoaded();
            if (isLoaded) {
                const data = await window.steamapi.cloudLoad(SAVE_FILE_NAME);
                if (data) {
                    console.log('☁️ Steam Cloud: Save downloaded' + (DEMO_MODE ? ' (DEMO)' : ''));
                    return data;
                }
            }
        } catch (e) {
            console.error('Steam Cloud load error:', e);
        }
    }
    return null;
};

// ============================================
// STEAM LEADERBOARDS
// ============================================
// Leaderboard names - must match what you create in Steamworks
// Demo uses separate leaderboards with _demo suffix
window.STEAM_LEADERBOARDS = {
    HIGHEST_FLOOR: 'highest_floor' + DEMO_SUFFIX,
    GEAR_SCORE: 'gear_score' + DEMO_SUFFIX,
    ENDLESS_KILLS: 'endless_high_score' + DEMO_SUFFIX,
    VAULT_KILLS: 'vault_completions' + DEMO_SUFFIX,
    RUNE_TRIAL_KILLS: 'rune_trials_completed' + DEMO_SUFFIX,
    PETS_FOUND: 'pets_found' + DEMO_SUFFIX,
    MYTHICS_FOUND: 'mythics_found' + DEMO_SUFFIX
};

// Submit all scores to Steam leaderboards
window.submitToSteamLeaderboards = async (scores) => {
    if (!window.steamapi) return;
    
    try {
        const isLoaded = await window.steamapi.isLoaded();
        if (!isLoaded) return;
        
        console.log('📊 Submitting to Steam Leaderboards...');
        
        // Submit each score
        if (scores.highestFloor > 0) {
            await window.steamapi.uploadLeaderboardScore(
                window.STEAM_LEADERBOARDS.HIGHEST_FLOOR, 
                scores.highestFloor
            );
        }
        
        if (scores.gearScore > 0) {
            await window.steamapi.uploadLeaderboardScore(
                window.STEAM_LEADERBOARDS.GEAR_SCORE, 
                scores.gearScore
            );
        }
        
        if (scores.endlessKills > 0) {
            await window.steamapi.uploadLeaderboardScore(
                window.STEAM_LEADERBOARDS.ENDLESS_KILLS, 
                scores.endlessKills
            );
        }
        
        if (scores.vaultKills > 0) {
            await window.steamapi.uploadLeaderboardScore(
                window.STEAM_LEADERBOARDS.VAULT_KILLS, 
                scores.vaultKills
            );
        }
        
        if (scores.runeTrialKills > 0) {
            await window.steamapi.uploadLeaderboardScore(
                window.STEAM_LEADERBOARDS.RUNE_TRIAL_KILLS, 
                scores.runeTrialKills
            );
        }
        
        if (scores.petsFound > 0) {
            await window.steamapi.uploadLeaderboardScore(
                window.STEAM_LEADERBOARDS.PETS_FOUND, 
                scores.petsFound
            );
        }
        
        if (scores.mythicsFound > 0) {
            await window.steamapi.uploadLeaderboardScore(
                window.STEAM_LEADERBOARDS.MYTHICS_FOUND, 
                scores.mythicsFound
            );
        }
        
        console.log('✅ Steam Leaderboards updated');
    } catch (e) {
        console.error('Steam Leaderboard error:', e);
    }
};

// Persistent stats tracking (survives page reload)
// Demo mode uses separate localStorage key
const STEAM_STATS_KEY = LOCALSTORAGE_PREFIX + 'steamStats';
window.steamStats = JSON.parse(localStorage.getItem(STEAM_STATS_KEY) || '{}');
if (!window.steamStats.totalGoldEarned) window.steamStats.totalGoldEarned = 0;
if (!window.steamStats.highestFloor) window.steamStats.highestFloor = 0;
if (!window.steamStats.vaultCompletions) window.steamStats.vaultCompletions = 0;
if (!window.steamStats.runeTrialCompletions) window.steamStats.runeTrialCompletions = 0;
if (!window.steamStats.endlessHighScore) window.steamStats.endlessHighScore = 0;
if (!window.steamStats.dungeonsCompleted) window.steamStats.dungeonsCompleted = {};

// Save stats to localStorage
window.saveSteamStats = () => {
    localStorage.setItem(STEAM_STATS_KEY, JSON.stringify(window.steamStats));
};

// Track stat and check achievements
window.trackStat = (statName, value) => {
    const stats = window.steamStats;
    
    switch (statName) {
        case 'goldEarned':
            stats.totalGoldEarned += value;
            if (stats.totalGoldEarned >= 1000) window.unlockAchievement(window.ACHIEVEMENTS.GOLD_HOARDER_1K);
            if (stats.totalGoldEarned >= 10000) window.unlockAchievement(window.ACHIEVEMENTS.GOLD_HOARDER_10K);
            if (stats.totalGoldEarned >= 100000) window.unlockAchievement(window.ACHIEVEMENTS.GOLD_HOARDER_100K);
            break;
        case 'floorReached':
            if (value > stats.highestFloor) {
                stats.highestFloor = value;
                if (value >= 10) window.unlockAchievement(window.ACHIEVEMENTS.FLOOR_10);
                if (value >= 25) window.unlockAchievement(window.ACHIEVEMENTS.FLOOR_25);
                if (value >= 50) window.unlockAchievement(window.ACHIEVEMENTS.FLOOR_50);
                if (value >= 100) window.unlockAchievement(window.ACHIEVEMENTS.FLOOR_100);
            }
            break;
        case 'vaultCompleted':
            stats.vaultCompletions = (stats.vaultCompletions || 0) + 1;
            if (stats.vaultCompletions >= 5) window.unlockAchievement(window.ACHIEVEMENTS.VAULT_MASTER);
            break;
        case 'runeTrialCompleted':
            stats.runeTrialCompletions = (stats.runeTrialCompletions || 0) + 1;
            break;
        case 'endlessKills':
            if (value > stats.endlessHighScore) {
                stats.endlessHighScore = value;
                if (value >= 10) window.unlockAchievement(window.ACHIEVEMENTS.ENDLESS_10);
                if (value >= 50) window.unlockAchievement(window.ACHIEVEMENTS.ENDLESS_50);
                if (value >= 100) window.unlockAchievement(window.ACHIEVEMENTS.ENDLESS_100);
                if (value >= 200) window.unlockAchievement(window.ACHIEVEMENTS.ENDLESS_200);
            }
            break;
        case 'dungeonCompleted':
            stats.dungeonsCompleted[value] = true;
            window.unlockAchievement(window.ACHIEVEMENTS.FIRST_VICTORY);
            if (Object.keys(stats.dungeonsCompleted).length >= 3) {
                window.unlockAchievement(window.ACHIEVEMENTS.ALL_DUNGEONS);
            }
            break;
        case 'keystoneObtained':
            window.unlockAchievement(window.ACHIEVEMENTS.FIRST_KEYSTONE);
            if (window.game && window.game.keystones && window.game.keystones.length >= 10) {
                window.unlockAchievement(window.ACHIEVEMENTS.KEYSTONE_MASTER);
            }
            break;
        case 'runeObtained':
            window.unlockAchievement(window.ACHIEVEMENTS.FIRST_RUNE);
            if (window.game && window.game.runes && window.game.runes.length >= 10) {
                window.unlockAchievement(window.ACHIEVEMENTS.RUNE_COLLECTOR);
            }
            break;
        case 'legendaryObtained':
            window.unlockAchievement(window.ACHIEVEMENTS.FIRST_LEGENDARY);
            break;
        case 'mythicObtained':
            window.unlockAchievement(window.ACHIEVEMENTS.FIRST_MYTHIC);
            break;
        case 'maxLevelReached':
            window.unlockAchievement(window.ACHIEVEMENTS.MAX_LEVEL);
            break;
        case 'fullLegendaryEquipped':
            window.unlockAchievement(window.ACHIEVEMENTS.FULL_LEGENDARY);
            break;
    }
    
    window.saveSteamStats();
};

console.log('✅ Steam achievement tracking loaded');
// =================================================================
// END STEAM ACHIEVEMENT TRACKING
// =================================================================

        // ========================================
        // TEST MODE - Set to true to bypass character select with level 100 party
        // ========================================
        const TEST_MODE = false;
        
        // Graphics Version: 1 = Original, 2 = Enhanced
        let GRAPHICS_VERSION = parseInt(localStorage.getItem('graphicsVersion') || '2');
        
        if (TEST_MODE) {
            // Set fake party selection
            selectedParty = ['tank', 'healer', 'mage', 'rogue'];
            localStorage.setItem(LS_KEYS.SELECTED_PARTY, JSON.stringify(selectedParty));
            
            // Hide character select
            document.getElementById('character-select-overlay').classList.add('hidden');
            
            // Initialize game
            window.game = new Game();
            
            // Create level 100 test party after short delay
            setTimeout(() => {
                if (!window.game) return;
                
                window.game.party = [];
                
                const templates = [
                    { name: 'TestTank', className: 'Tank', hp: 5000, mana: 200, attack: 150, defense: 200, speed: 0.8 },
                    { name: 'TestHealer', className: 'Healer', hp: 2500, mana: 500, attack: 100, defense: 80, speed: 1.0 },
                    { name: 'TestMage', className: 'Mage', hp: 2000, mana: 400, attack: 250, defense: 60, speed: 1.2 },
                    { name: 'TestRogue', className: 'Rogue', hp: 2200, mana: 150, attack: 300, defense: 70, speed: 1.5 }
                ];
                
                const weaponsByClass = { Tank: 'greatsword', Healer: 'staff', Mage: 'wand', Rogue: 'dagger' };
                const colorMap = { Tank: '#6b7280', Healer: '#10b981', Mage: '#52525b', Rogue: '#ef4444' };
                const symbolMap = { Tank: '🛡', Healer: '💊', Mage: '🔮', Rogue: '🗡' };
                const formations = [
                    {x: 5, y: 7},  // Tank - front
                    {x: 3, y: 7},  // Healer - back left
                    {x: 4, y: 8},  // Mage - back center
                    {x: 6, y: 8}   // Rogue - back right
                ];
                
                templates.forEach((t, index) => {
                    const char = new Character(t.name, t.className, 100, t.hp, t.mana, t.attack, t.defense, t.speed);
                    char.xp = 0;
                    char.maxXp = 999999;
                    char.skillPoints = 100;
                    
                    // Epic gear at level 100
                    ['helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet'].forEach(slot => {
                        char.equipment[slot] = new Item(slot, 'epic', 100);
                    });
                    char.equipment.weapon = new Item(weaponsByClass[t.className], 'epic', 100);
                    char.equipment.ring1 = new Item('ring', 'epic', 100);
                    char.equipment.ring2 = new Item('ring', 'epic', 100);
                    
                    // Create sprite properly like the game does
                    const pos = formations[index];
                    char.sprite = new CharacterSprite(pos.x, pos.y, colorMap[t.className], 'party');
                    char.sprite.classSymbol = symbolMap[t.className];
                    char.sprite.setCombatPosition(pos.x, pos.y);
                    
                    window.game.party.push(char);
                });
                
                window.game.gold = 100000;
                window.game.party.forEach(m => m.recalculateStats && m.recalculateStats());
                window.game.updateUI();
                window.game.addLog('🧪 TEST MODE: Level 100 party ready!', 'legendary');
                window.game.addLog('👑 Go to Pinnacle Boss to test!', 'room');
            }, 500);
        }
        // ========================================
        // END TEST MODE
        // ========================================

        // Check if there's a saved party selection (skipped in TEST_MODE)
        if (!TEST_MODE) {
        const savedParty = localStorage.getItem(LS_KEYS.SELECTED_PARTY);
        if (savedParty) {
            try {
                selectedParty = JSON.parse(savedParty);
                // Validate that we have 4 characters
                if (selectedParty.length === 4 && selectedParty.every(c => c !== null)) {
                    // Hide character select and show game
                    document.getElementById('character-select-overlay').classList.add('hidden');
                    // Initialize game - Steam Cloud load will happen in main startup
                    window.game = new Game();
                } else {
                    // Invalid save, start fresh
                    selectedParty = [null, null, null, null];
                    setupCharacterSelect();
                }
            } catch (e) {
                selectedParty = [null, null, null, null];
                setupCharacterSelect();
            }
        } else {
            // Show character select screen
            setupCharacterSelect();
        }
        }
        
        function updatePartySlots() {
            const slots = document.querySelectorAll('.party-slot');
            slots.forEach((slot, index) => {
                const charClass = selectedParty[index];
                if (charClass) {
                    slot.classList.add('filled');
                    slot.querySelector('.slot-icon').innerHTML = charIcons[charClass];
                    slot.querySelector('.slot-name').textContent = charNames[charClass];
                } else {
                    slot.classList.remove('filled');
                    slot.querySelector('.slot-icon').textContent = '?';
                    slot.querySelector('.slot-name').textContent = 'Empty';
                }
            });
            
            // Update character cards to show which are used
            const cards = document.querySelectorAll('.char-select-card');
            cards.forEach(card => {
                const charClass = card.dataset.charClass;
                if (selectedParty.includes(charClass)) {
                    card.classList.add('used');
                } else {
                    card.classList.remove('used');
                }
            });
            
            // Update start button
            const startBtn = document.getElementById('start-adventure-btn');
            const filledCount = selectedParty.filter(c => c !== null).length;
            if (filledCount === 4) {
                startBtn.disabled = false;
                startBtn.textContent = `START ADVENTURE`;
            } else {
                startBtn.disabled = true;
                startBtn.textContent = `SELECT ${4 - filledCount} MORE HERO${4 - filledCount === 1 ? '' : 'ES'}`;
            }
        }
        
        function setupCharacterSelect() {
            const cards = document.querySelectorAll('.char-select-card');
            const startBtn = document.getElementById('start-adventure-btn');
            const slots = document.querySelectorAll('.party-slot');
            
            // Make slots clickable to change selection
            slots.forEach((slot, index) => {
                slot.addEventListener('click', function() {
                    // If slot is filled, clear it
                    if (selectedParty[index]) {
                        selectedParty[index] = null;
                        updatePartySlots();
                    }
                });
            });
            
            cards.forEach(card => {
                card.addEventListener('click', function() {
                    const charClass = this.dataset.charClass;
                    
                    // Check if this character is already in party
                    if (selectedParty.includes(charClass)) {
                        return; // Can't select same character twice
                    }
                    
                    // Find first empty slot
                    const emptySlot = selectedParty.findIndex(c => c === null);
                    if (emptySlot !== -1) {
                        selectedParty[emptySlot] = charClass;
                        updatePartySlots();
                    }
                });
            });
            
            startBtn.addEventListener('click', function() {
                // Check if all 4 slots are filled
                if (selectedParty.every(c => c !== null)) {
                    // Save selection
                    localStorage.setItem(LS_KEYS.SELECTED_PARTY, JSON.stringify(selectedParty));
                    
                    // Hide character select
                    document.getElementById('character-select-overlay').classList.add('hidden');
                    
                    // Initialize game
                    window.game = new Game();
                }
            });
            
            // Initial update
            updatePartySlots();
        }

        // Reference game for backwards compatibility
        const game = window.game || null;
		
// Save notification element
        const saveNotification = document.createElement('div');
        saveNotification.id = 'save-notification';
        saveNotification.style.cssText = 'position: fixed; top: 10px; left: 10px; color: white; font-size: 10px; opacity: 0; transition: opacity 0.3s; z-index: 9999; pointer-events: none;';
        saveNotification.textContent = 'Game saved';
        document.body.appendChild(saveNotification);
        
        // ============================================================================
        // STEAM-READY SAVE SYSTEM with Migration Support
        // ============================================================================
        // Supports both Electron (Steam) and Browser (testing)
        // - Electron: Uses file system (AppData directory)
        // - Browser: Falls back to localStorage
        // - Migration: v2.0.0+ saves work with all future versions
        // ============================================================================
        
        const CURRENT_VERSION = '2.0.0';
        const MIN_SUPPORTED_VERSION = '1.0.0'; // Support older saves - we'll migrate them
        
        // ========================================
        // VERSION UTILITIES
        // ========================================
        
        function compareVersions(v1, v2) {
            // Handle edge cases
            if (!v1 || !v2) return 0;
            
            const parts1 = v1.split('.').map(n => parseInt(n) || 0);
            const parts2 = v2.split('.').map(n => parseInt(n) || 0);
            
            // Pad arrays to length 3
            while (parts1.length < 3) parts1.push(0);
            while (parts2.length < 3) parts2.push(0);
            
            for (let i = 0; i < 3; i++) {
                if (parts1[i] > parts2[i]) return 1;
                if (parts1[i] < parts2[i]) return -1;
            }
            return 0;
        }
        
        function isSupportedVersion(version) {
            // Legacy saves without version are supported - we'll migrate them
            if (!version) return true;
            return compareVersions(version, MIN_SUPPORTED_VERSION) >= 0;
        }
        
        // ========================================
        // MIGRATION FUNCTIONS
        // ========================================
        // Add new migration functions as you create new versions
        
        // Migrate legacy saves (no version or pre-2.0.0) to 2.0.0
        function migrateLegacyToV2_0(data) {
            console.log('🔄 Migrating legacy save to v2.0.0...');
            
            // Legacy saves might have different structure - normalize it
            const migrated = {
                ...data,
                version: '2.0.0',
                // Ensure all required fields exist with defaults
                gold: data.gold || 0,
                dungeonFloor: data.dungeonFloor || 1,
                currentDungeon: data.currentDungeon || null,
                successfulRuns: data.successfulRuns || 0,
                party: data.party || [],
                loot: data.loot || [],
                inventory: data.inventory || [],
                playerChests: data.playerChests || [],
                vaultKeys: data.vaultKeys || [],
                runeTrialKeys: data.runeTrialKeys || [],
                keystones: data.keystones || [],
                equippedKeystones: data.equippedKeystones || {
                    tank: null, healer: null, mage: null, rogue: null, archer: null, paladin: null
                },
                runeSlots: data.runeSlots || {},
                equippedRunes: data.equippedRunes || {},
                runes: data.runes || [],
                pets: data.pets || [],
                equippedPets: data.equippedPets || {},
                dungeonProgress: data.dungeonProgress || {},
                globalStats: data.globalStats || {},
                lootFilter: data.lootFilter || {},
                nextChestId: data.nextChestId || 1,
                nextVaultKeyId: data.nextVaultKeyId || 1,
                nextRuneTrialKeyId: data.nextRuneTrialKeyId || 1
            };
            
            console.log('✅ Legacy save migrated to v2.0.0');
            return migrated;
        }
        
        function migrateV2_0ToV2_1(data) {
            
            return {
                ...data,
                version: '2.1.0'
                // Add new v2.1.0 fields here with defaults
            };
        }
        
        // Add more migrations as needed:
        // function migrateV2_1ToV2_2(data) { ... }
        // function migrateV2_2ToV2_3(data) { ... }
        
        function migrateSaveData(data) {
            let currentData = data;
            const startVersion = data.version || 'legacy';
            
            // First, migrate legacy/versionless saves to 2.0.0
            if (!currentData.version || compareVersions(currentData.version, '2.0.0') < 0) {
                currentData = migrateLegacyToV2_0(currentData);
            }
            
            // Chain migrations for future versions
            if (currentData.version === '2.0.0' && compareVersions(CURRENT_VERSION, '2.0.0') > 0) {
                currentData = migrateV2_0ToV2_1(currentData);
            }
            
            // Add more migration chains here as versions increase
            // if (currentData.version === '2.1.0' && compareVersions(CURRENT_VERSION, '2.1.0') > 0) {
            //     currentData = migrateV2_1ToV2_2(currentData);
            // }
            
            if (startVersion !== currentData.version) {
                console.log(`📦 Save migrated from ${startVersion} to ${currentData.version}`);
            }
            
            return currentData;
        }
        
        function saveToDisk(saveString) {
            // Validate JSON before saving
            try {
                JSON.parse(saveString);
            } catch (e) {
                console.error('❌ CRITICAL: Attempted to save invalid JSON! Aborting save.');
                return false;
            }
            
            // STEAM CLOUD ONLY - no local saves
            if (window.steamCloudSave) {
                window.steamCloudSave(saveString)
                    .then(() => console.log('☁️ Saved to Steam Cloud'))
                    .catch(e => console.error('❌ Steam Cloud save failed:', e));
            } else {
                console.warn('⚠️ Steam Cloud not available - save not persisted!');
            }
            return true;
        }
        
        // Pre-loaded Steam Cloud save data (loaded before game starts)
        let preloadedCloudSave = null;
        
        function loadFromDisk() {
            // STEAM CLOUD ONLY - return pre-loaded data
            if (preloadedCloudSave) {
                console.log('☁️ Loading from Steam Cloud');
                const data = preloadedCloudSave;
                preloadedCloudSave = null; // Clear after use
                return data;
            }
            
            console.log('📂 No Steam Cloud save found - starting fresh');
            return null;
        }
        
        function deleteSave() {
            // Steam Cloud: Delete cloud save
            if (window.steamapi && window.steamapi.cloudSave) {
                // Save empty data to effectively "delete" the cloud save
                window.steamapi.cloudSave(SAVE_FILE_NAME, '{}')
                    .then(() => console.log('☁️ Steam Cloud save cleared' + (DEMO_MODE ? ' (DEMO)' : '')))
                    .catch(e => console.error('Failed to clear Steam Cloud:', e));
            }
            // Clear any cached stats
            localStorage.removeItem(LS_KEYS.HIGHEST_FLOOR);
            localStorage.removeItem(LS_KEYS.HIGHEST_GEAR_SCORE);
            localStorage.removeItem(LS_KEYS.HIGHEST_PETS);
            localStorage.removeItem(LS_KEYS.HIGHEST_MYTHICS);
            localStorage.removeItem(LS_KEYS.HIGHEST_ENDLESS);
            localStorage.removeItem(LS_KEYS.CURRENT_ENDLESS_KILLS);
            console.log('🗑️ Save data cleared');
        }
        
        // ========================================
        // SAVE GAME FUNCTION
        // ========================================
        
        window.saveGame = () => {
            if (!window.game) return false;
            
            try {
                // Build save data with null checks to prevent serialization errors
                const safeGet = (obj, prop, defaultVal) => {
                    try { return obj && obj[prop] !== undefined ? obj[prop] : defaultVal; }
                    catch (e) { return defaultVal; }
                };
                
                const saveData = {
                    version: CURRENT_VERSION,
                    timestamp: Date.now(),
                    gold: safeGet(window.game, 'gold', 0),
                    dungeonFloor: safeGet(window.game, 'dungeonFloor', 1),
                    currentDungeon: safeGet(window.game, 'currentDungeon', null),
                    successfulRuns: safeGet(window.game, 'successfulRuns', 0),
                    party: (window.game.party || []).map((m, mIdx) => {
                        if (!m) return null;
                        try {
                            // Calculate pet bonus to subtract from saved stats
                            // This prevents double-application when pet bonuses are reapplied on load
                            const petTypes = ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'];
                            const charKey = petTypes[mIdx];
                            const equippedPet = window.game.equippedPets && charKey ? window.game.equippedPets[charKey] : null;
                            let petBonus = 0;
                            let petBonusType = null;
                            if (equippedPet) {
                                petBonus = equippedPet.getCurrentBonus();
                                petBonusType = equippedPet.bonusType;
                            }
                            
                            return {
                                name: m.name,
                                className: m.className,
                                level: m.level || 1,
                                xp: m.xp || 0,
                                maxXp: m.maxXp || 100,
                                hp: m.hp || 100,
                                maxHp: petBonusType === 'hp' ? Math.max(10, (m.maxHp || 100) - petBonus) : (m.maxHp || 100),
                                mana: m.mana || 50,
                                maxMana: petBonusType === 'mana' ? Math.max(10, (m.maxMana || 50) - petBonus) : (m.maxMana || 50),
                                attack: petBonusType === 'attack' ? Math.max(1, (m.attack || 10) - petBonus) : (m.attack || 10),
                                defense: petBonusType === 'defense' ? Math.max(0, (m.defense || 5) - petBonus) : (m.defense || 5),
                                attackSpeed: petBonusType === 'attackSpeed' ? Math.max(0.1, (m.attackSpeed || 1) - (petBonus / 100)) : (m.attackSpeed || 1),
                                critChance: petBonusType === 'critChance' ? Math.max(0, (m.critChance || 5) - petBonus) : (m.critChance || 5),
                                critDamage: petBonusType === 'critDamage' ? Math.max(100, (m.critDamage || 150) - petBonus) : (m.critDamage || 150),
                                dodgeChance: petBonusType === 'dodge' ? Math.max(0, (m.dodgeChance || 0) - petBonus) : (m.dodgeChance || 0),
                                lifesteal: petBonusType === 'lifesteal' ? Math.max(0, (m.lifesteal || 0) - petBonus) : (m.lifesteal || 0),
                                hpRegen: petBonusType === 'hpRegen' ? Math.max(0, (m.hpRegen || 0) - petBonus) : (m.hpRegen || 0),
                                manaRegen: petBonusType === 'manaRegen' ? Math.max(0, (m.manaRegen || 0) - petBonus) : (m.manaRegen || 0),
                                cdr: petBonusType === 'cdr' ? Math.max(0, (m.cdr || 0) - petBonus) : (m.cdr || 0),
                                isAlive: m.isAlive !== undefined ? m.isAlive : true,
                                skillPoints: m.skillPoints || 0,
                                skillTree: m.skillTree || {},
                                equipment: m.equipment || {},
                                runePercentBonuses: m.runePercentBonuses || {}
                            };
                        } catch (e) {
                            console.warn('⚠️ Error serializing party member:', e);
                            return null;
                        }
                    }).filter(m => m !== null),
                    loot: Array.isArray(window.game.loot) ? window.game.loot : [],
                    inventory: Array.isArray(window.game.inventory) ? window.game.inventory : [],
                    playerChests: window.game.playerChests || [],
                    vaultKeys: window.game.vaultKeys || [],
                    runeTrialKeys: window.game.runeTrialKeys || [],
                    keystones: window.game.keystones || [],
                    equippedKeystones: window.game.equippedKeystones || {
                        tank: null, healer: null, mage: null, rogue: null, archer: null, paladin: null
                    },
                    runeSlots: window.game.runeSlots || {},
                    equippedRunes: window.game.equippedRunes || {},
                    runes: window.game.runes || [],
                    pets: (window.game.pets || []).filter(pet => {
                        if (!pet) return false;
                        for (const charType of ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin']) {
                            if (window.game.equippedPets && window.game.equippedPets[charType] && window.game.equippedPets[charType] === pet) {
                                return false;
                            }
                        }
                        return true;
                    }),
                    equippedPets: window.game.equippedPets || {},
                    dungeonProgress: window.game.dungeonProgress || {},
                    globalStats: window.game.globalStats || {},
                    lootFilter: window.game.lootFilter || {},
                    nextChestId: window.game.nextChestId || 1,
                    nextVaultKeyId: window.game.nextVaultKeyId || 1,
                    nextRuneTrialKeyId: window.game.nextRuneTrialKeyId || 1,
                    blessingCurrency: window.game.blessingCurrency || 0,
                    fountainPopupEnabled: window.game.fountainPopupEnabled !== undefined ? window.game.fountainPopupEnabled : true,
                    treasurePopupEnabled: window.game.treasurePopupEnabled !== undefined ? window.game.treasurePopupEnabled : true
                };
                
                // Stringify with error catching
                let saveString;
                try {
                    saveString = JSON.stringify(saveData);
                } catch (stringifyErr) {
                    console.error('❌ JSON.stringify failed:', stringifyErr);
                    // Try again with circular reference handling
                    const seen = new WeakSet();
                    saveString = JSON.stringify(saveData, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) return undefined;
                            seen.add(value);
                        }
                        if (typeof value === 'function') return undefined;
                        return value;
                    });
                }
                
                // Validate the string is valid JSON before saving
                try {
                    JSON.parse(saveString);
                } catch (validateErr) {
                    console.error('❌ Save string validation failed:', validateErr);
                    return false;
                }
                
                saveToDisk(saveString);
                
                // Show save notification
                saveNotification.style.opacity = '1';
                setTimeout(() => {
                    saveNotification.style.opacity = '0';
                }, 2000);
                
                
                return true;
            } catch (e) {
                console.error('❌ Save error:', e);
                return false;
            }
        };
        
        // ========================================
        // LOAD GAME FUNCTION
        // ========================================
        
        window.loadGame = () => {
            if (!window.game) {
                return false;
            }
            
            let saveString;
            let data;
            let recoveryMode = false;
            let recoveredSections = [];
            let failedSections = [];
            
            // Step 1: Try to get save string
            try {
                saveString = loadFromDisk();
                if (!saveString) {
                    return false;
                }
            } catch (e) {
                console.error('❌ Could not read save file:', e);
                return false;
            }
            
            // Step 2: Try to parse JSON (loadFromDisk already attempted repair)
            try {
                data = JSON.parse(saveString);
            } catch (e) {
                console.error('❌ Save file is not valid JSON even after repair:', e);
                
                // Show detailed error and options
                const errorMsg = `Save file could not be recovered.

Error: ${e.message}

Your save file appears to be corrupted. Before deleting, you can try:
1. Check %APPDATA%/everfall-idle-dungeon-rpg/saves/ for backup files
2. Report this issue to the developer with your save file

Click OK to start fresh, or Cancel to try manually recovering.`;
                
                const shouldReset = confirm(errorMsg);
                if (shouldReset) {
                    deleteSave();
                    localStorage.removeItem(LS_KEYS.SELECTED_PARTY);
                    location.reload();
                }
                return false;
            }
            
            // Step 3: Version check and migration
            try {
                const saveVersion = data.version || 'legacy';
                console.log('📦 Save version:', saveVersion);
                
                // Migrate if needed (handles legacy and older versions)
                if (!data.version || data.version !== CURRENT_VERSION) {
                    console.log('🔄 Migrating save data...');
                    data = migrateSaveData(data);
                }
            } catch (e) {
                console.warn('⚠️ Version check/migration failed, attempting recovery mode:', e);
                recoveryMode = true;
                // Still try to load the data even if migration failed
            }
            
            // Step 4: Load each section independently (defensive loading)
            
            // ========================================
            // HELPER FUNCTIONS FOR RESTORING OBJECTS
            // ========================================
            
            // Helper function to restore items with ALL properties
            function restoreItem(itemData) {
                if (!itemData) return null;
                try {
                    const item = {
                        type: itemData.type,
                        weaponType: itemData.weaponType,
                        rarity: itemData.rarity,
                        level: itemData.level,
                        levelReq: itemData.levelReq || Math.max(1, (itemData.level || 1) - 1),
                        name: itemData.name,
                        // All possible stat properties
                        attack: itemData.attack,
                        defense: itemData.defense,
                        hp: itemData.hp,
                        mana: itemData.mana,
                        attackSpeed: itemData.attackSpeed,
                        critChance: itemData.critChance,
                        critDamage: itemData.critDamage,
                        dodgeChance: itemData.dodgeChance,
                        lifesteal: itemData.lifesteal,
                        hpRegen: itemData.hpRegen,
                        manaRegen: itemData.manaRegen,
                        cdr: itemData.cdr,
                        // Mythic properties
                        mythicStat: itemData.mythicStat,
                        mythicStats: itemData.mythicStats,
                        isPerfectMythic: itemData.isPerfectMythic,
                        // Blessed properties
                        blessed: itemData.blessed,
                        blessedStat: itemData.blessedStat,
                        // Pinnacle properties
                        isPinnacle: itemData.isPinnacle,
                        pinnacleStats: itemData.pinnacleStats,
                        subtitle: itemData.subtitle,
                        _statsCapped: itemData._statsCapped,
                        
                        // Restore the getStatsDisplay method
                        getStatsDisplay: function() {
                            const stats = [];
                            if (this.attack) stats.push(`ATK +${this.attack}`);
                            if (this.attackSpeed) stats.push(`ATK SPD +${this.attackSpeed}`);
                            if (this.hp) stats.push(`HP +${this.hp}`);
                            if (this.mana) stats.push(`MANA +${this.mana}`);
                            if (this.defense) stats.push(`DEF +${this.defense}`);
                            if (this.critChance) stats.push(`CRIT +${this.critChance}%`);
                            if (this.critDamage) stats.push(`CRIT DMG +${this.critDamage}%`);
                            if (this.dodgeChance) stats.push(`DODGE +${this.dodgeChance}%`);
                            if (this.lifesteal) stats.push(`LIFESTEAL +${this.lifesteal}%`);
                            if (this.hpRegen) stats.push(`HP REGEN +${this.hpRegen}`);
                            if (this.manaRegen) stats.push(`MANA REGEN +${this.manaRegen}`);
                            if (this.cdr) stats.push(`CDR +${this.cdr}%`);
                            if (this.blessed) stats.push(`✨ BLESSED`);
                            return stats.join(', ');
                        }
                    };
                    
                    // Remove undefined properties to keep object clean
                    Object.keys(item).forEach(key => {
                        if (item[key] === undefined && key !== 'getStatsDisplay') {
                            delete item[key];
                        }
                    });
                    
                    // Fix pre-patch Pinnacle items that have type='dagger'/'warhammer'/etc instead of type='weapon'
                    if (item.isPinnacle && item.type !== 'weapon') {
                        const weaponTypes = ['wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'];
                        if (weaponTypes.includes(item.type)) {
                            item.weaponType = item.type;
                            item.type = 'weapon';
                            console.log('🔧 Fixed Pinnacle item type: ' + item.name);
                        }
                    }
                    
                    return item;
                } catch (e) {
                    console.warn('⚠️ Failed to restore item:', e);
                    return null;
                }
            }
            
            // Basic game state
            try {
                window.game.gold = data.gold || 0;
                window.game.dungeonFloor = data.dungeonFloor || 1;
                window.game.currentDungeon = data.currentDungeon || null;
                window.game.successfulRuns = data.successfulRuns || 0;
                window.game.nextChestId = data.nextChestId || 1;
                window.game.nextVaultKeyId = data.nextVaultKeyId || 1;
                window.game.nextRuneTrialKeyId = data.nextRuneTrialKeyId || 1;
                recoveredSections.push('Basic Stats');
            } catch (e) {
                console.warn('⚠️ Failed to load basic stats:', e);
                failedSections.push('Basic Stats');
                recoveryMode = true;
            }
            
            // Party
            try {
                if (data.party && Array.isArray(data.party)) {
                    data.party.forEach((saved, i) => {
                        try {
                            const member = window.game.party[i];
                            if (!member || !saved) return;
                            
                            member.level = saved.level || member.level;
                            member.xp = saved.xp || 0;
                            member.maxXp = saved.maxXp || member.maxXp;
                            member.hp = saved.hp || member.hp;
                            member.maxHp = saved.maxHp || member.maxHp;
                            member.mana = saved.mana || member.mana;
                            member.maxMana = saved.maxMana || member.maxMana;
                            member.attack = saved.attack || member.attack;
                            member.defense = saved.defense || member.defense;
                            member.attackSpeed = saved.attackSpeed || member.attackSpeed;
                            member.critChance = saved.critChance || member.critChance;
                            member.critDamage = saved.critDamage || member.critDamage;
                            member.dodgeChance = saved.dodgeChance || 0;
                            member.lifesteal = saved.lifesteal || 0;
                            member.hpRegen = saved.hpRegen || 0;
                            member.manaRegen = saved.manaRegen || 0;
                            member.cdr = saved.cdr || 0;
                            member.isAlive = saved.isAlive !== undefined ? saved.isAlive : true;
                            member.skillPoints = saved.skillPoints || 0;
                            
                            if (saved.skillTree) {
                                member.skillTree = saved.skillTree;
                            }
                            
                            if (saved.runePercentBonuses) {
                                member.runePercentBonuses = saved.runePercentBonuses;
                            }
                            
                            // Restore equipment using improved restoreItem
                            if (saved.equipment) {
                                member.equipment = {};
                                Object.keys(saved.equipment).forEach(slot => {
                                    try {
                                        const itemData = saved.equipment[slot];
                                        if (itemData && itemData.name) {
                                            member.equipment[slot] = restoreItem(itemData);
                                        } else {
                                            member.equipment[slot] = null;
                                        }
                                    } catch (slotErr) {
                                        console.warn(`⚠️ Failed to load equipment slot ${slot}:`, slotErr);
                                        member.equipment[slot] = null;
                                    }
                                });
                                
                                // Fix pre-patch Pinnacle items stuck in wrong equipment slots
                                // Old saves stored them in e.g. equipment.warhammer instead of equipment.weapon
                                const wrongSlots = ['wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'];
                                wrongSlots.forEach(badSlot => {
                                    const item = member.equipment[badSlot];
                                    if (item && item.isPinnacle && item.type === 'weapon') {
                                        // Move from wrong slot to correct weapon slot
                                        if (member.equipment.weapon && !member.equipment.weapon.isPinnacle) {
                                            // Push existing weapon to inventory
                                            window.game.inventory.push(member.equipment.weapon);
                                        }
                                        member.equipment.weapon = item;
                                        delete member.equipment[badSlot];
                                        console.log('🔧 Moved Pinnacle item from equipment.' + badSlot + ' to equipment.weapon');
                                    }
                                });
                            }
                        } catch (memberErr) {
                            console.warn(`⚠️ Failed to load party member ${i}:`, memberErr);
                        }
                    });
                    
                    window.game.party.forEach(member => {
                        if (member && window.game.applySkillTreeStats) {
                            try {
                                window.game.applySkillTreeStats(member);
                            } catch (e) {}
                        }
                    });
                    recoveredSections.push('Party');
                }
            } catch (e) {
                console.warn('⚠️ Failed to load party:', e);
                failedSections.push('Party');
                recoveryMode = true;
            }
            
            // Loot
            try {
                if (data.loot && Array.isArray(data.loot)) {
                    window.game.loot = data.loot.map(restoreItem).filter(i => i !== null);
                    recoveredSections.push('Loot');
                }
            } catch (e) {
                console.warn('⚠️ Failed to load loot:', e);
                failedSections.push('Loot');
                recoveryMode = true;
            }
            
            // Inventory
            try {
                if (data.inventory && Array.isArray(data.inventory)) {
                    window.game.inventory = data.inventory.map(restoreItem).filter(i => i !== null);
                    recoveredSections.push('Inventory');
                }
            } catch (e) {
                console.warn('⚠️ Failed to load inventory:', e);
                failedSections.push('Inventory');
                recoveryMode = true;
            }
            
            // Other data (each wrapped separately)
            try { if (data.playerChests) window.game.playerChests = data.playerChests; } catch(e) { console.warn('⚠️ Failed: playerChests'); }
            try { if (data.vaultKeys) window.game.vaultKeys = data.vaultKeys; } catch(e) { console.warn('⚠️ Failed: vaultKeys'); }
            try { if (data.runeTrialKeys) window.game.runeTrialKeys = data.runeTrialKeys; } catch(e) { console.warn('⚠️ Failed: runeTrialKeys'); }
            
            // ========================================
            // PET RESTORATION - Rebuild Pet class instances
            // ========================================
            function restorePet(petData) {
                if (!petData || !petData.name) return null;
                try {
                    // Create a pet-like object with all necessary methods
                    const pet = {
                        id: petData.id || Date.now() + Math.random(),
                        name: petData.name,
                        emoji: petData.emoji || '🐾',
                        rarity: petData.rarity || 'common',
                        level: Math.min(petData.level || 1, 20),
                        bonusType: petData.bonusType || 'hp',
                        baseValue: petData.baseValue || 10,
                        upgradeValue: petData.upgradeValue || 5,
                        isActive: petData.isActive || false,
                        dungeonType: petData.dungeonType || null,
                        image: petData.image || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png',
                        upgradeCosts: petData.upgradeCosts || [
                            50000, 200000, 500000, 1000000, 2000000, 5000000, 10000000, 
                            20000000, 30000000, 40000000, 50000000, 50000000, 50000000, 
                            50000000, 50000000, 50000000, 50000000, 50000000, 50000000, 50000000
                        ],
                        
                        // Restore methods
                        getUpgradeCost: function() {
                            if (this.level >= 20) return null;
                            return this.upgradeCosts[this.level - 1];
                        },
                        getCurrentBonus: function() {
                            return this.baseValue + (this.upgradeValue * (this.level - 1));
                        },
                        getDungeonDamageBonus: function() {
                            const bonuses = { common: 5, uncommon: 6, rare: 7, epic: 8, legendary: 10 };
                            return bonuses[this.rarity] || 0;
                        },
                        upgrade: function() {
                            if (this.level < 20) this.level++;
                        },
                        getDisplayName: function() {
                            return `${this.emoji} ${this.name} (Lv.${this.level})`;
                        }
                    };
                    return pet;
                } catch (e) {
                    console.warn('⚠️ Failed to restore pet:', petData.name, e);
                    return null;
                }
            }
            
            // ========================================
            // KEYSTONE RESTORATION - Rebuild KeystoneItem instances
            // ========================================
            function restoreKeystone(keystoneData) {
                if (!keystoneData) return null;
                try {
                    // Rebuild the ability object (UI expects keystone.ability.name, etc.)
                    const ability = keystoneData.ability || {
                        name: keystoneData.abilityName || 'Unknown',
                        description: keystoneData.description || '',
                        cooldown: keystoneData.cooldown || 30,
                        manaCost: keystoneData.manaCost || 40
                    };
                    
                    const keystone = {
                        type: keystoneData.type,
                        rarity: keystoneData.rarity,
                        level: keystoneData.level || 1,
                        name: keystoneData.name,
                        keystoneName: keystoneData.keystoneName,
                        internalName: keystoneData.internalName,
                        // Store ability as an object (this is what the UI expects)
                        ability: ability,
                        // Also keep flat properties for backward compatibility
                        abilityName: ability.name,
                        description: ability.description,
                        cooldown: ability.cooldown,
                        manaCost: ability.manaCost,
                        stats: keystoneData.stats || {},
                        
                        // Restore methods
                        getStatsDisplay: function() {
                            if (!this.stats) return 'No stats';
                            const statNames = {
                                attack: 'ATK', attackSpeed: 'ATK SPD', critDamage: 'CRIT DMG',
                                critChance: 'CRIT', defense: 'DEF', cdr: 'CDR', dodge: 'DODGE',
                                hpRegen: 'HP REGEN', manaRegen: 'MANA REGEN', mana: 'MANA',
                                hp: 'HP', lifesteal: 'LIFESTEAL'
                            };
                            const percentStats = ['attackSpeed', 'critDamage', 'critChance', 'cdr', 'dodge', 'hpRegen', 'manaRegen', 'lifesteal'];
                            const stats = [];
                            for (const [stat, value] of Object.entries(this.stats)) {
                                const displayName = statNames[stat] || stat;
                                const suffix = percentStats.includes(stat) ? '%' : '';
                                stats.push(`${displayName} +${value}${suffix}`);
                            }
                            return stats.join(', ');
                        },
                        getSellPrice: function() {
                            const rarityMultipliers = { common: 50, uncommon: 100, rare: 200, epic: 400, legendary: 1000 };
                            return (rarityMultipliers[this.rarity] || 50) * (this.level || 1);
                        }
                    };
                    return keystone;
                } catch (e) {
                    console.warn('⚠️ Failed to restore keystone:', e);
                    return null;
                }
            }
            
            // ========================================
            // RUNE RESTORATION - Rebuild RuneItem instances  
            // ========================================
            function restoreRune(runeData) {
                if (!runeData) return null;
                try {
                    const rune = {
                        tier: runeData.tier,
                        runeType: runeData.runeType,
                        name: runeData.name,
                        emoji: runeData.emoji,
                        description: runeData.description,
                        isAbilityRune: runeData.isAbilityRune,
                        // Ability rune properties
                        abilityName: runeData.abilityName,
                        effectivenessBonus: runeData.effectivenessBonus,
                        // Stat rune properties
                        statName: runeData.statName,
                        statType: runeData.statType,
                        percentBonus: runeData.percentBonus,
                        secondaryStatType: runeData.secondaryStatType,
                        secondaryPercentBonus: runeData.secondaryPercentBonus,
                        
                        // Restore methods
                        getStatsDisplay: function() {
                            return this.description || 'No description';
                        },
                        getDisplayName: function() {
                            return this.name;
                        },
                        getSellPrice: function() {
                            return (this.tier || 1) * 200;
                        }
                    };
                    return rune;
                } catch (e) {
                    console.warn('⚠️ Failed to restore rune:', e);
                    return null;
                }
            }
            
            // KEYSTONE LOADING - Fixed to properly restore equipped keystones
            try {
                // Load inventory keystones with method restoration
                if (data.keystones && Array.isArray(data.keystones)) {
                    window.game.keystones = data.keystones.map(restoreKeystone).filter(k => k !== null);
                    recoveredSections.push('Keystones');
                }
                
                // Load equipped keystones with method restoration
                if (data.equippedKeystones) {
                    window.game.equippedKeystones = {};
                    const keystoneTypes = ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'];
                    keystoneTypes.forEach(type => {
                        if (data.equippedKeystones[type]) {
                            window.game.equippedKeystones[type] = restoreKeystone(data.equippedKeystones[type]);
                        } else {
                            window.game.equippedKeystones[type] = null;
                        }
                    });
                }
                console.log('✅ Keystones loaded:', (window.game.keystones || []).length, 'inventory,', 
                    Object.values(window.game.equippedKeystones || {}).filter(k => k).length, 'equipped');
            } catch(e) { 
                console.warn('⚠️ Failed to load keystones:', e);
                failedSections.push('Keystones');
                window.game.keystones = window.game.keystones || [];
                window.game.equippedKeystones = window.game.equippedKeystones || {
                    tank: null, healer: null, mage: null, rogue: null, archer: null, paladin: null
                };
            }
            
            // RUNE LOADING - With proper restoration
            try { 
                if (data.runeSlots) window.game.runeSlots = data.runeSlots; 
                recoveredSections.push('Rune Slots');
            } catch(e) { 
                console.warn('⚠️ Failed: runeSlots'); 
                failedSections.push('Rune Slots');
            }
            
            try { 
                if (data.equippedRunes) {
                    // equippedRunes is an object keyed by character type
                    window.game.equippedRunes = {};
                    for (const [charType, charRunes] of Object.entries(data.equippedRunes)) {
                        if (Array.isArray(charRunes)) {
                            window.game.equippedRunes[charType] = charRunes.map(r => r ? restoreRune(r) : null);
                        } else {
                            window.game.equippedRunes[charType] = charRunes;
                        }
                    }
                }
                recoveredSections.push('Equipped Runes');
            } catch(e) { 
                console.warn('⚠️ Failed: equippedRunes', e); 
                failedSections.push('Equipped Runes');
            }
            
            try { 
                if (data.runes && Array.isArray(data.runes)) {
                    window.game.runes = data.runes.map(restoreRune).filter(r => r !== null);
                    recoveredSections.push('Runes');
                }
            } catch(e) { 
                console.warn('⚠️ Failed: runes', e); 
                failedSections.push('Runes');
            }
            
            // PET LOADING - With proper restoration
            try { 
                if (data.pets && Array.isArray(data.pets)) {
                    window.game.pets = data.pets.map(restorePet).filter(p => p !== null);
                    recoveredSections.push('Pets');
                    console.log('✅ Pets loaded:', window.game.pets.length);
                }
            } catch(e) { 
                console.warn('⚠️ Failed: pets', e); 
                failedSections.push('Pets');
            }
            
            try { 
                if (data.equippedPets) {
                    window.game.equippedPets = {};
                    const petTypes = ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'];
                    petTypes.forEach(type => {
                        if (data.equippedPets[type]) {
                            window.game.equippedPets[type] = restorePet(data.equippedPets[type]);
                        } else {
                            window.game.equippedPets[type] = null;
                        }
                    });
                    recoveredSections.push('Equipped Pets');
                    console.log('✅ Equipped pets loaded:', Object.values(window.game.equippedPets).filter(p => p).length);
                    
                    // Reapply pet bonuses to party members after load
                    // (Save now strips pet bonuses from base stats to prevent double-application)
                    const petTypes2 = ['tank', 'healer', 'mage', 'rogue', 'archer', 'paladin'];
                    petTypes2.forEach((type, idx) => {
                        const pet = window.game.equippedPets[type];
                        const member = window.game.party[idx];
                        if (pet && member) {
                            window.game.applyPetBonus(pet, member);
                        }
                    });
                }
            } catch(e) { 
                console.warn('⚠️ Failed: equippedPets', e); 
                failedSections.push('Equipped Pets');
            }
            
            try { 
                if (data.dungeonProgress) window.game.dungeonProgress = data.dungeonProgress; 
                recoveredSections.push('Dungeon Progress');
            } catch(e) { 
                console.warn('⚠️ Failed: dungeonProgress'); 
                failedSections.push('Dungeon Progress');
            }
            
            try { 
                if (data.globalStats) window.game.globalStats = data.globalStats; 
                recoveredSections.push('Global Stats');
            } catch(e) { 
                console.warn('⚠️ Failed: globalStats'); 
                failedSections.push('Global Stats');
            }
            
            try { 
                if (data.lootFilter) window.game.lootFilter = data.lootFilter; 
            } catch(e) { 
                console.warn('⚠️ Failed: lootFilter'); 
            }
            
            try {
                if (data.blessingCurrency !== undefined) {
                    window.game.blessingCurrency = data.blessingCurrency;
                    console.log('✅ Blessing currency loaded:', window.game.blessingCurrency);
                }
            } catch(e) {
                console.warn('⚠️ Failed: blessingCurrency');
            }
            
            try {
                // Restore popup settings
                if (data.fountainPopupEnabled !== undefined) {
                    window.game.fountainPopupEnabled = data.fountainPopupEnabled;
                    const fountainToggle = document.getElementById('show-fountain-popup');
                    if (fountainToggle) fountainToggle.checked = data.fountainPopupEnabled;
                }
                if (data.treasurePopupEnabled !== undefined) {
                    window.game.treasurePopupEnabled = data.treasurePopupEnabled;
                    const treasureToggle = document.getElementById('show-treasure-popup');
                    if (treasureToggle) treasureToggle.checked = data.treasurePopupEnabled;
                }
                
                // Sync loot filter checkboxes with loaded data
                if (data.lootFilter) {
                    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                        const rarity = checkbox.getAttribute('data-rarity');
                        if (rarity && data.lootFilter[rarity] !== undefined) {
                            checkbox.checked = data.lootFilter[rarity];
                        }
                    });
                    const minLevelInput = document.getElementById('min-level-filter');
                    if (minLevelInput && data.lootFilter.minLevel !== undefined) {
                        minLevelInput.value = data.lootFilter.minLevel;
                    }
                }
                console.log('✅ Settings restored');
            } catch(e) {
                console.warn('⚠️ Failed: settings restore', e);
            }
            
            // Update UI
            try {
                if (window.game.updateUI) window.game.updateUI();
                if (window.game.updateInventoryDisplay) window.game.updateInventoryDisplay();
            } catch (e) {
                console.warn('⚠️ Failed to update UI:', e);
            }
            
            // STEAM: Retroactive achievement scan for players who already qualify
            try {
                if (window.trackStat && window.game.party) {
                    const legendaryPlus = ['legendary', 'mythic', 'pinnacle'];
                    const requiredSlots = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'amulet'];
                    
                    window.game.party.forEach(member => {
                        if (!member) return;
                        // Check max level
                        if (member.level >= 100) {
                            window.trackStat('maxLevelReached', member.level);
                        }
                        // Check full legendary
                        if (member.equipment) {
                            const allLeg = requiredSlots.every(slot => {
                                const item = member.equipment[slot];
                                return item && legendaryPlus.includes(item.rarity);
                            });
                            if (allLeg) {
                                window.trackStat('fullLegendaryEquipped', member.className);
                            }
                        }
                    });
                    
                    // Check mythic in inventory/equipment
                    const hasMythic = (window.game.inventory || []).some(i => i && i.rarity === 'mythic') ||
                        (window.game.loot || []).some(i => i && i.rarity === 'mythic') ||
                        window.game.party.some(m => m && m.equipment && Object.values(m.equipment).some(i => i && i.rarity === 'mythic'));
                    if (hasMythic) {
                        window.trackStat('mythicObtained', 1);
                    }
                    
                    console.log('✅ Retroactive achievement scan complete');
                }
            } catch (e) {
                console.warn('⚠️ Failed: achievement scan', e);
            }
            
            // BALANCE FIX: Retroactively nerf items with level > 100
            // Previously, Divine Arena items scaled exponentially past level 100
            // New items are capped at level 100 scaling, but existing saves need correction
            try {
                const nerfItem = (item) => {
                    if (!item || !item.level || item.level <= 100) return false;
                    if (item.isPinnacle) return false; // Don't nerf pinnacle items
                    if (item._statsCapped) return false; // Already nerfed in a previous load
                    
                    const statProps = ['attack', 'hp', 'mana', 'defense', 'attackSpeed', 'critChance', 'critDamage', 'dodgeChance', 'lifesteal', 'hpRegen', 'manaRegen', 'cdr'];
                    const oldScaling = Math.pow(1.018, item.level);
                    const newScaling = Math.pow(1.018, 100); // Cap at level 100
                    const ratio = newScaling / oldScaling;
                    
                    let nerfed = false;
                    statProps.forEach(stat => {
                        if (item[stat] && item[stat] > 0) {
                            item[stat] = Math.round(item[stat] * ratio * 100) / 100;
                            nerfed = true;
                        }
                    });
                    
                    // Mark as capped so it won't be nerfed again on future loads
                    if (nerfed) {
                        item._statsCapped = true;
                    }
                    return nerfed;
                };
                
                let nerfCount = 0;
                
                // Nerf items in loot
                (window.game.loot || []).forEach(item => { if (nerfItem(item)) nerfCount++; });
                
                // Nerf items in inventory
                (window.game.inventory || []).forEach(item => { if (nerfItem(item)) nerfCount++; });
                
                // Nerf equipped items
                (window.game.party || []).forEach(member => {
                    if (!member || !member.equipment) return;
                    Object.values(member.equipment).forEach(item => { if (nerfItem(item)) nerfCount++; });
                });
                
                if (nerfCount > 0) {
                    console.log(`⚖️ Balance: Rescaled ${nerfCount} items above level 100 to use capped stat scaling`);
                }
            } catch (e) {
                console.warn('⚠️ Failed: item balance pass', e);
            }
            
            // ========================================
            // LOAD SUMMARY - Detailed diagnostics
            // ========================================
            console.log('═══════════════════════════════════════════');
            console.log('📊 SAVE LOAD SUMMARY');
            console.log('═══════════════════════════════════════════');
            console.log('Version:', data.version || 'unknown');
            console.log('Timestamp:', data.timestamp ? new Date(data.timestamp).toLocaleString() : 'unknown');
            console.log('───────────────────────────────────────────');
            console.log('💰 Gold:', window.game.gold);
            console.log('🏰 Dungeon Floor:', window.game.dungeonFloor);
            console.log('✅ Successful Runs:', window.game.successfulRuns);
            console.log('───────────────────────────────────────────');
            console.log('👥 Party Members:', window.game.party ? window.game.party.length : 0);
            if (window.game.party) {
                window.game.party.forEach((m, i) => {
                    if (m) console.log(`   ${i+1}. ${m.name || m.className} - Level ${m.level}`);
                });
            }
            console.log('───────────────────────────────────────────');
            console.log('🎒 Inventory Items:', (window.game.inventory || []).length);
            console.log('💎 Loot Items:', (window.game.loot || []).length);
            console.log('📦 Chests:', (window.game.playerChests || []).length);
            console.log('🔑 Vault Keys:', (window.game.vaultKeys || []).length);
            console.log('───────────────────────────────────────────');
            console.log('🔷 Keystones (inventory):', (window.game.keystones || []).length);
            console.log('🔷 Keystones (equipped):', Object.values(window.game.equippedKeystones || {}).filter(k => k).length);
            console.log('💠 Runes (inventory):', (window.game.runes || []).length);
            console.log('🐾 Pets (inventory):', (window.game.pets || []).length);
            console.log('🐾 Pets (equipped):', Object.values(window.game.equippedPets || {}).filter(p => p).length);
            console.log('───────────────────────────────────────────');
            console.log('✅ Recovered:', recoveredSections.length, 'sections');
            if (failedSections.length > 0) {
                console.log('❌ Failed:', failedSections.join(', '));
            }
            console.log('═══════════════════════════════════════════');
            
            // Show recovery message if we had to skip some data
            if (recoveryMode && failedSections.length > 0) {
                console.log('🔧 Recovery mode - Recovered:', recoveredSections.join(', '));
                console.log('🔧 Recovery mode - Failed:', failedSections.join(', '));
                
                setTimeout(() => {
                    if (window.game && window.game.addLog) {
                        window.game.addLog(`⚠️ Save partially recovered. Failed: ${failedSections.join(', ')}`, 'orange');
                    }
                }, 1000);
            } else {
                setTimeout(() => {
                    if (window.game && window.game.addLog) {
                        window.game.addLog('✅ Save loaded successfully!', 'green');
                    }
                }, 1000);
            }
            
            // Save immediately to fix any corruption
            setTimeout(() => {
                try {
                    saveGame();
                    console.log('✅ Save repaired and saved');
                } catch (e) {
                    console.warn('⚠️ Could not save repaired data:', e);
                }
            }, 2000);
            
            return true;
        };
        
        // Auto-save every 30 seconds
        if (window.game && window.game.timerManager) {
            window.game.autoSaveInterval = window.game.timerManager.setInterval(() => saveGame(), 10000);
        } else {
            setInterval(saveGame, 10000);
        }
        
        // ========================================
        // STEAM LEADERBOARD SYSTEM (Firebase removed)
        // ========================================

        // ========================================
        // CUSTOM NAME INPUT MODAL (replaces prompt)
        // ========================================
        
        function createNameModal() {
            const modal = document.createElement('div');
            modal.id = 'name-input-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100000;
                font-family: 'Rajdhani', sans-serif;
            `;
            
            modal.innerHTML = `
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid rgba(245,158,11,0.5);">
                    <h2 style="color: #f59e0b; text-align: center; margin-bottom: 10px; font-size: 28px; font-weight: 900;">🏆 JOIN THE LEADERBOARD</h2>
                    <p style="color: #94a3b8; text-align: center; margin-bottom: 25px; font-size: 14px;">Enter a unique name to track your progress</p>
                    
                    <input type="text" id="leaderboard-name-input" placeholder="Enter your name..." maxlength="20" style="
                        width: 100%;
                        padding: 15px 20px;
                        font-size: 18px;
                        border: 2px solid rgba(99, 102, 241, 0.5);
                        border-radius: 10px;
                        background: rgba(30, 41, 59, 0.8);
                        color: white;
                        outline: none;
                        margin-bottom: 15px;
                        font-family: 'Rajdhani', sans-serif;
                        box-sizing: border-box;
                    ">
                    
                    <p id="name-error-msg" style="color: #ef4444; text-align: center; margin-bottom: 15px; font-size: 14px; display: none;"></p>
                    
                    <div style="display: flex; gap: 15px;">
                        <button id="name-submit-btn" style="
                            flex: 1;
                            padding: 15px;
                            font-size: 16px;
                            font-weight: 900;
                            border: none;
                            border-radius: 10px;
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            color: white;
                            cursor: pointer;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">Submit</button>
                        <button id="name-skip-btn" style="
                            flex: 1;
                            padding: 15px;
                            font-size: 16px;
                            font-weight: 700;
                            border: 2px solid rgba(100,116,139,0.5);
                            border-radius: 10px;
                            background: rgba(30, 41, 59, 0.8);
                            color: #94a3b8;
                            cursor: pointer;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">Play Anonymous</button>
                    </div>
                </div>
            `;
            
            return modal;
        }
        
        // Show modal and return a Promise with the name
        function showNameInputModal() {
            return new Promise((resolve) => {
                const modal = createNameModal();
                document.body.appendChild(modal);
                
                const input = document.getElementById('leaderboard-name-input');
                const submitBtn = document.getElementById('name-submit-btn');
                const skipBtn = document.getElementById('name-skip-btn');
                const errorMsg = document.getElementById('name-error-msg');
                
                // Focus the input
                setTimeout(() => input.focus(), 100);
                
                // Submit button click
                submitBtn.addEventListener('click', async () => {
                    const name = input.value.trim();
                    if (!name) {
                        errorMsg.textContent = 'Please enter a name';
                        errorMsg.style.display = 'block';
                        return;
                    }
                    
                    // Check if name exists
                    submitBtn.textContent = 'Checking...';
                    submitBtn.disabled = true;
                    
                    try {
                        const nameCheck = await db.collection(LEADERBOARD_COLLECTION).doc(name).get();
                        if (nameCheck.exists) {
                            errorMsg.textContent = 'This name is already taken. Please choose another.';
                            errorMsg.style.display = 'block';
                            submitBtn.textContent = 'Submit';
                            submitBtn.disabled = false;
                            return;
                        }
                        
                        // Name is available
                        modal.remove();
                        resolve(name);
                    } catch (error) {
                        console.error('Error checking name:', error);
                        errorMsg.textContent = 'Error checking name. Try again.';
                        errorMsg.style.display = 'block';
                        submitBtn.textContent = 'Submit';
                        submitBtn.disabled = false;
                    }
                });
                
                // Skip button - play anonymous
                skipBtn.addEventListener('click', () => {
                    modal.remove();
                    resolve('Anonymous_' + Math.floor(Math.random() * 10000));
                });
                
                // Enter key to submit
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        submitBtn.click();
                    }
                });
            });
        }

        // Calculate total gear score using same formula as party bar display
        window.calculateGearScore = function() {
            let totalGearScore = 0;
            const rarityPoints = { common: 2, uncommon: 4, rare: 6, epic: 8, legendary: 12, mythic: 16 };
            
            game.party.forEach(member => {
                if (!member.equipment) return;
                
                // Calculate gear score for each equipment piece
                Object.values(member.equipment).forEach(item => {
                    if (!item) return;
                    
                    let basePoints = rarityPoints[item.rarity] || 0;
                    // Perfect mythics get 25 points instead of 16
                    if (item.rarity === 'mythic' && item.mythicStats && item.mythicStats.length === 4) {
                        basePoints = 25;
                    }
                    const multiplier = 1 + (item.level - 1) * 0.1;
                    totalGearScore += basePoints * multiplier;
                });
                
                // Add equipped keystone
                const keystoneType = member.className.toLowerCase();
                const equippedKeystone = game.equippedKeystones ? game.equippedKeystones[keystoneType] : null;
                if (equippedKeystone) {
                    const basePoints = rarityPoints[equippedKeystone.rarity] || 0;
                    const multiplier = 1 + (equippedKeystone.level - 1) * 0.1;
                    totalGearScore += basePoints * multiplier;
                }
            });
            
            return Math.round(totalGearScore);
        };
        
        // Flag to prevent multiple modals
        let isShowingNameModal = false;
        
        // Submit score to Steam leaderboard only
        window.submitToLeaderboard = async function() {
            // Track all-time highest stats (never go down)
            let highestFloor = parseInt(localStorage.getItem(LS_KEYS.HIGHEST_FLOOR)) || 1;
            if (game.dungeonFloor > highestFloor) {
                highestFloor = game.dungeonFloor;
                localStorage.setItem(LS_KEYS.HIGHEST_FLOOR, highestFloor);
            }
            
            let highestGearScore = parseInt(localStorage.getItem(LS_KEYS.HIGHEST_GEAR_SCORE)) || 0;
            const currentGearScore = calculateGearScore();
            if (currentGearScore > highestGearScore) {
                highestGearScore = currentGearScore;
                localStorage.setItem(LS_KEYS.HIGHEST_GEAR_SCORE, highestGearScore);
            }
            
            // Count pets (inventory + equipped) - filter out null/undefined
            const inventoryPets = game.pets ? game.pets.filter(p => p && p.type).length : 0;
            const equippedPets = game.equippedPets ? Object.values(game.equippedPets).filter(p => p && p.type).length : 0;
            const currentPets = inventoryPets + equippedPets;
            let highestPets = parseInt(localStorage.getItem(LS_KEYS.HIGHEST_PETS)) || 0;
            if (currentPets > highestPets) {
                highestPets = currentPets;
                localStorage.setItem(LS_KEYS.HIGHEST_PETS, highestPets);
            }
            
            // Count mythics (inventory + all equipped on party members)
            let currentMythics = 0;
            game.party.forEach(member => {
                if (member.equipment) {
                    Object.values(member.equipment).forEach(item => {
                        if (item && item.rarity === 'mythic') currentMythics++;
                    });
                }
            });
            game.inventory.forEach(item => {
                if (item && item.rarity === 'mythic') currentMythics++;
            });
            game.loot.forEach(item => {
                if (item && item.rarity === 'mythic') currentMythics++;
            });
            
            let highestMythics = parseInt(localStorage.getItem(LS_KEYS.HIGHEST_MYTHICS)) || 0;
            if (currentMythics > highestMythics) {
                highestMythics = currentMythics;
                localStorage.setItem(LS_KEYS.HIGHEST_MYTHICS, highestMythics);
            }
            
            // Get dungeon progress for boss kills (these already track totals and never go down)
            const vaultKills = game.dungeonProgress && game.dungeonProgress.vault ? game.dungeonProgress.vault.bossKills || 0 : 0;
            const runeTrialKills = game.dungeonProgress && game.dungeonProgress.runetrial ? game.dungeonProgress.runetrial.bossKills || 0 : 0;
            
            // Track highest endless dungeon kill count
            let highestEndlessKills = parseInt(localStorage.getItem(LS_KEYS.HIGHEST_ENDLESS)) || 0;
            const currentEndlessKills = parseInt(localStorage.getItem(LS_KEYS.CURRENT_ENDLESS_KILLS)) || 0;
            if (currentEndlessKills > highestEndlessKills) {
                highestEndlessKills = currentEndlessKills;
                localStorage.setItem(LS_KEYS.HIGHEST_ENDLESS, highestEndlessKills);
            }
            
            const floor = highestFloor;
            const gearScore = highestGearScore;
            
            // STEAM ONLY: Submit to Steam leaderboards
            if (window.submitToSteamLeaderboards) {
                window.submitToSteamLeaderboards({
                    highestFloor: floor,
                    gearScore: gearScore,
                    petsFound: highestPets,
                    mythicsFound: highestMythics,
                    vaultKills: vaultKills,
                    runeTrialKills: runeTrialKills,
                    endlessKills: highestEndlessKills
                });
                console.log('✅ Steam Leaderboard updated - Floor:', floor, 'GearScore:', gearScore);
            }
        };
        
        // View leaderboard - now Steam only
        window.viewLeaderboard = async function(category = 'highest_floor') {
            // Show Steam leaderboard modal with actual data
            let modal = document.getElementById('leaderboard-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'leaderboard-modal';
                modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); display: flex; justify-content: center; align-items: center; z-index: 10001; overflow-y: auto; padding: 20px;';
                document.body.appendChild(modal);
            }
            
            // All available leaderboards
            let leaderboards = [
                { id: 'highest_floor', name: 'Highest Floor', icon: '' },
                { id: 'gear_score', name: 'Gear Score', icon: '' },
                { id: 'endless_high_score', name: 'Divine Arena', icon: '' },
                { id: 'vault_completions', name: 'Vault', icon: '' },
                { id: 'rune_trials_completed', name: 'Rune Trials', icon: '' },
                { id: 'pets_found', name: 'Pets', icon: '' },
                { id: 'mythics_found', name: 'Mythics', icon: '' }
            ];
            
            // Filter out locked leaderboards in demo mode
            if (DEMO_MODE) {
                const demoLockedIds = ['endless_high_score', 'vault_completions', 'rune_trials_completed'];
                leaderboards = leaderboards.filter(lb => !demoLockedIds.includes(lb.id));
            }
            
            modal.innerHTML = `
                <div style="color: white; background: linear-gradient(135deg, #1a1a2e 0%, #0f0a1e 100%); padding: 25px; border-radius: 20px; width: 800px; max-width: 95vw; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.8); border: 2px solid #f59e0b;">
                    <h2 style="background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 15px; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center;">🏆 LEADERBOARDS 🏆</h2>
                    
                    <!-- Leaderboard Type Tabs - Horizontal -->
                    <div id="lb-type-tabs" style="display: flex; flex-wrap: nowrap; gap: 6px; margin-bottom: 12px; justify-content: center;">
                        ${leaderboards.map(lb => `
                            <button onclick="window.switchLeaderboard('${lb.id}')" 
                                class="lb-tab-btn" 
                                data-lb="${lb.id}"
                                style="padding: 8px 12px; background: ${lb.id === category ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)'}; 
                                       border: 1px solid ${lb.id === category ? '#f59e0b' : 'rgba(255,255,255,0.2)'}; 
                                       border-radius: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 11px;
                                       transition: all 0.2s; white-space: nowrap;">
                                ${lb.name}
                            </button>
                        `).join('')}
                    </div>
                    
                    <!-- Leaderboard Content -->
                    <div id="lb-content" style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; min-height: 250px; max-height: 350px; overflow-y: auto;">
                        <div style="text-align: center; color: #94a3b8; padding: 40px;">
                            <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
                            Loading leaderboard...
                        </div>
                    </div>
                    
                    <!-- Your Stats -->
                    <div id="lb-your-stats" style="margin-top: 12px; background: rgba(168,85,247,0.2); border: 2px solid rgba(168,85,247,0.4); border-radius: 10px; padding: 10px; text-align: center; display: flex; justify-content: center; align-items: center; gap: 15px;">
                        <span style="color: #a855f7; font-weight: 700; font-size: 14px;">YOUR SCORE:</span>
                        <span id="lb-your-score" style="color: #fbbf24; font-size: 22px; font-weight: 900;">--</span>
                    </div>
                    
                    <button onclick="document.getElementById('leaderboard-modal').style.display='none'" 
                        style="margin-top: 15px; padding: 12px 40px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 900; width: 100%; text-transform: uppercase; letter-spacing: 2px;">
                        CLOSE
                    </button>
                </div>
            `;
            modal.style.display = 'flex';
            
            // Store current state
            window.currentLeaderboard = category;
            window.currentLeaderboardMode = 'Global';
            window.currentLeaderboardPage = 1;
            
            // Load initial data
            window.loadLeaderboardData(category, 'Global');
        };
        
        window.switchLeaderboard = function(lbId) {
            window.currentLeaderboard = lbId;
            window.currentLeaderboardPage = 1; // Reset to page 1
            
            // Update tab styling
            document.querySelectorAll('.lb-tab-btn').forEach(btn => {
                const isActive = btn.dataset.lb === lbId;
                btn.style.background = isActive ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)';
                btn.style.borderColor = isActive ? '#f59e0b' : 'rgba(255,255,255,0.2)';
            });
            
            window.loadLeaderboardData(lbId, window.currentLeaderboardMode);
        };
        
        window.switchLeaderboardMode = function(mode) {
            window.currentLeaderboardMode = mode;
            window.currentLeaderboardPage = 1; // Reset to page 1
            
            // Update button styling
            const globalBtn = document.getElementById('lb-global-btn');
            const friendsBtn = document.getElementById('lb-friends-btn');
            
            if (mode === 'Global') {
                globalBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                globalBtn.style.borderColor = '#10b981';
                friendsBtn.style.background = 'rgba(255,255,255,0.1)';
                friendsBtn.style.borderColor = 'rgba(255,255,255,0.2)';
            } else {
                friendsBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
                friendsBtn.style.borderColor = '#3b82f6';
                globalBtn.style.background = 'rgba(255,255,255,0.1)';
                globalBtn.style.borderColor = 'rgba(255,255,255,0.2)';
            }
            
            window.loadLeaderboardData(window.currentLeaderboard, mode);
        };
        
        window.loadLeaderboardData = async function(lbId, mode = 'Global') {
            const content = document.getElementById('lb-content');
            const yourScore = document.getElementById('lb-your-score');
            
            const modeLabel = mode === 'Friends' ? 'friends' : 'global';
            content.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px;">
                    <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
                    Loading ${modeLabel} leaderboard...
                </div>
            `;
            
            // Get your current score
            let myScore = 0;
            if (window.game) {
                const scoreMap = {
                    'highest_floor': window.game.dungeonFloor || 0,
                    'gear_score': window.calculateGearScore ? window.calculateGearScore() : 0,
                    'endless_high_score': window.game.endlessHighScore || 0,
                    'vault_completions': window.game.dungeonProgress?.vault?.bossKills || 0,
                    'rune_trials_completed': window.game.dungeonProgress?.runetrial?.bossKills || 0,
                    'pets_found': window.game.pets ? window.game.pets.length : 0,
                    'mythics_found': window.game.mythicsFound || 0
                };
                myScore = scoreMap[lbId] || 0;
            }
            yourScore.textContent = myScore.toLocaleString();
            
            // Pagination settings
            const perPage = 10;
            const page = window.currentLeaderboardPage || 1;
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            
            // Apply demo suffix for actual Steam API call
            const steamLeaderboardName = lbId + DEMO_SUFFIX;
            
            // Try to fetch from Steam with the specified mode (Global or Friends)
            let entries = [];
            
            if (window.steamapi && window.steamapi.getLeaderboardScores) {
                try {
                    // Fetch more than we need to know if there's a next page
                    entries = await window.steamapi.getLeaderboardScores(steamLeaderboardName, startIndex, endIndex + 1, mode);
                } catch (e) {
                    console.error('❌ Leaderboard fetch error:', e);
                }
            }
            
            if (!entries || entries.length === 0) {
                const emptyMsg = mode === 'Friends' 
                    ? 'No friends on this leaderboard yet!<br><span style="font-size: 12px; color: #64748b;">Invite friends to play Everfall 2!</span>'
                    : 'No entries yet!<br><span style="font-size: 12px; color: #64748b;">Be the first to set a score!</span>';
                content.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; padding: 40px;">
                        <div style="font-size: 50px; margin-bottom: 15px;">${mode === 'Friends' ? '👥' : '📭'}</div>
                        <div style="font-size: 16px; font-weight: 700; margin-bottom: 10px;">${emptyMsg}</div>
                    </div>
                `;
                return;
            }
            
            // Check if there's a next page
            const hasNextPage = entries.length > perPage;
            const displayEntries = entries.slice(0, perPage);
            const hasPrevPage = page > 1;
            
            // Build leaderboard table
            let html = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid rgba(255,255,255,0.2);">
                            <th style="padding: 12px; text-align: center; color: #f59e0b; font-size: 14px; width: 60px;">RANK</th>
                            <th style="padding: 12px; text-align: left; color: #f59e0b; font-size: 14px;">PLAYER</th>
                            <th style="padding: 12px; text-align: right; color: #f59e0b; font-size: 14px;">SCORE</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            displayEntries.forEach((entry, index) => {
                const rank = entry.rank || (startIndex + index + 1);
                const isTop3 = rank <= 3;
                const rankColors = { 1: '#fbbf24', 2: '#94a3b8', 3: '#cd7f32' };
                const rankIcons = { 1: '🥇', 2: '🥈', 3: '🥉' };
                
                html += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); ${isTop3 ? 'background: rgba(255,255,255,0.05);' : ''}">
                        <td style="padding: 12px; text-align: center; font-weight: 900; font-size: ${isTop3 ? '18px' : '14px'}; color: ${rankColors[rank] || '#94a3b8'};">
                            ${rankIcons[rank] || '#' + rank}
                        </td>
                        <td style="padding: 12px; text-align: left; color: ${isTop3 ? '#ffffff' : '#e2e8f0'}; font-weight: ${isTop3 ? '700' : '400'};">
                            ${entry.name || 'Unknown Player'}
                        </td>
                        <td style="padding: 12px; text-align: right; color: ${isTop3 ? '#fbbf24' : '#10b981'}; font-weight: 700; font-size: ${isTop3 ? '18px' : '14px'};">
                            ${(entry.score || 0).toLocaleString()}
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            
            // Add pagination controls
            html += `
                <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button onclick="window.leaderboardPrevPage()" 
                        style="padding: 8px 16px; background: ${hasPrevPage ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.1)'}; 
                               border: none; border-radius: 6px; color: ${hasPrevPage ? 'white' : '#64748b'}; font-weight: 700; cursor: ${hasPrevPage ? 'pointer' : 'not-allowed'};"
                        ${hasPrevPage ? '' : 'disabled'}>
                        ◀ Prev
                    </button>
                    <span style="color: #94a3b8; font-size: 14px;">Page ${page}</span>
                    <button onclick="window.leaderboardNextPage()" 
                        style="padding: 8px 16px; background: ${hasNextPage ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.1)'}; 
                               border: none; border-radius: 6px; color: ${hasNextPage ? 'white' : '#64748b'}; font-weight: 700; cursor: ${hasNextPage ? 'pointer' : 'not-allowed'};"
                        ${hasNextPage ? '' : 'disabled'}>
                        Next ▶
                    </button>
                </div>
            `;
            
            content.innerHTML = html;
        };
        
        // Pagination functions
        window.leaderboardPrevPage = function() {
            if (window.currentLeaderboardPage > 1) {
                window.currentLeaderboardPage--;
                window.loadLeaderboardData(window.currentLeaderboard, window.currentLeaderboardMode);
            }
        };
        
        window.leaderboardNextPage = function() {
            window.currentLeaderboardPage = (window.currentLeaderboardPage || 1) + 1;
            window.loadLeaderboardData(window.currentLeaderboard, window.currentLeaderboardMode);
        };
        
        // Auto-submit when floor increases
        let lastSubmittedFloor = 0;
        
        // First submit after 2 minutes, then auto-submit every 5 minutes
        setTimeout(() => {
            submitToLeaderboard(); // First submit at 2 minutes
            if (window.game && window.game.timerManager) {
            window.game.leaderboardInterval = window.game.timerManager.setInterval(() => submitToLeaderboard(), 300000);
        } else {
            setInterval(() => submitToLeaderboard(), 300000);
        } // Then every 5 minutes
        }, 120000);
        
        // Save on unload
        window.addEventListener('beforeunload', saveGame);
        
        // Load on start - preload from Steam Cloud first
        setTimeout(async () => {
            if (window.game) {
                // Try to load from Steam Cloud first
                if (window.steamCloudLoad) {
                    try {
                        console.log('☁️ Checking Steam Cloud for save...');
                        const cloudData = await window.steamCloudLoad();
                        if (cloudData) {
                            try {
                                JSON.parse(cloudData);
                                preloadedCloudSave = cloudData;
                                console.log('☁️ Steam Cloud save found!');
                            } catch (e) {
                                console.warn('⚠️ Steam Cloud save was corrupted');
                            }
                        } else {
                            console.log('☁️ No Steam Cloud save exists');
                        }
                    } catch (e) {
                        console.warn('⚠️ Steam Cloud load failed:', e);
                    }
                }
                loadGame();
            }
        }, 100);
        
        window.addEventListener('resize', () => {
            if (window.game && window.game.canvas) {
                window.game.canvas.width = window.game.canvas.offsetWidth;
                window.game.canvas.height = window.game.canvas.offsetHeight;
                window.game.offsetX = window.game.canvas.width / 2;
                window.game.offsetY = window.game.canvas.height / 3;
            }
        });
