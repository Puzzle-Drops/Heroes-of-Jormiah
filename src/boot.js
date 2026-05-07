// Exit dialog code - NEW VERSION
const exitDialog = document.createElement('div');
exitDialog.id = 'exit-dialog';
exitDialog.style.display = 'none';

exitDialog.innerHTML = `
    <div class="dialog-content">
        <div class="icon-container">
            <svg viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="16 17 21 12 16 7" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        <h2>Exit Game?</h2>
        <p class="subtitle">Your progress has been saved. Are you sure you want to leave?</p>

        <div class="option-container">
            <div class="fullscreen-toggle" id="fullscreen-toggle-btn">
                <div class="toggle-label">
                    <svg viewBox="0 0 24 24">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Fullscreen Mode
                </div>
                <div class="switch active" id="fullscreen-switch">
                    <div class="switch-handle"></div>
                </div>
            </div>
        </div>

        <button id="reset-account-btn" style="width: 100%; padding: 12px; margin: 20px 0; background: linear-gradient(135deg, #dc2626, #991b1b); color: white; border: 2px solid #ef4444; border-radius: 10px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 1px;">
            🔄 Reset Account & Start Fresh
        </button>

        <div class="button-container">
            <button id="exit-yes">
                <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/exit%20game.png" alt="Exit Game">
            </button>
            <button id="exit-no">
                <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/keep%20playing3.png" alt="Keep Playing">
            </button>
        </div>

        <div class="community-buttons">
            <button class="community-btn" id="discord-btn" title="Join our Discord">
                <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/discord.png" alt="Discord">
            </button>
            <button class="community-btn" id="youtube-btn" title="Subscribe on YouTube">
                <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/youtube%20button.png" alt="YouTube">
            </button>
            <button class="community-btn" id="x-btn" title="Follow on X">
                <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/x.png" alt="X">
            </button>
            <button class="community-btn" id="wiki-btn" title="Visit Wiki">
                <img src="https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/wiki%204.png" alt="Wiki">
            </button>
        </div>
    </div>
`;

document.body.appendChild(exitDialog);

function showExitDialog() {
    document.getElementById('exit-dialog').style.display = 'flex';
}

function closeExitDialog() {
    document.getElementById('exit-dialog').style.display = 'none';
}

function openDiscord() {
    window.open('https://discord.gg/nnMYsPyWfV', '_blank');
}

function openYouTube() {
    window.open('https://www.youtube.com/channel/UCmIPFTLZdm1S-2U_e8ujnTA', '_blank');
}

function openX() {
    window.open('https://x.com/GameDevJoeyYT', '_blank');
}

function openWiki() {
    window.open('https://graphic37.github.io/Everfall-Wiki/', '_blank');
}

function toggleFullscreen() {
    const switchElement = document.getElementById('fullscreen-switch');
    switchElement.classList.toggle('active');
    
    const isActive = switchElement.classList.contains('active');
    
    if (window.electronAPI) {
        window.electronAPI.toggleFullscreen(isActive);
    } else {
        if (isActive) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}

function exitGame() {
    if (window.electronAPI) {
        window.electronAPI.exitApp();
    } else {
        window.close();
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 100);
    }
}

function resetAccount() {
        if (window.game && window.game.cleanup) {
            window.game.cleanup();
        }
        
    // Create confirmation dialog
    const confirmOverlay = document.createElement('div');
    confirmOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 200000;';
    
    const confirmPanel = document.createElement('div');
    confirmPanel.style.cssText = 'background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 9, 23, 0.98) 100%); border: 3px solid #ef4444; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9); max-width: 500px;';
    
    confirmPanel.innerHTML = `
        <div style="font-size: 56px; margin-bottom: 20px;">⚠️</div>
        <div style="font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 800; color: #ef4444; margin-bottom: 20px;">RESET ACCOUNT?</div>
        <div style="font-size: 16px; color: #e2e8f0; margin-bottom: 15px; line-height: 1.6;">
            This will <strong style="color: #ef4444;">permanently delete</strong> ALL of your progress:
        </div>
        <div style="text-align: left; margin: 20px 0; padding: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px;">
            <div style="font-size: 14px; color: #fca5a5; margin-bottom: 8px;">• All characters and their levels</div>
            <div style="font-size: 14px; color: #fca5a5; margin-bottom: 8px;">• All equipment, keystones, and runes</div>
            <div style="font-size: 14px; color: #fca5a5; margin-bottom: 8px;">• All gold, pets, and collected items</div>
            <div style="font-size: 14px; color: #fca5a5; margin-bottom: 8px;">• Skill tree allocations</div>
            <div style="font-size: 14px; color: #fca5a5;">• Leaderboard position and stats</div>
        </div>
        <div style="font-size: 14px; color: #94a3b8; margin-bottom: 30px; font-style: italic;">
            This action cannot be undone!
        </div>
        <div style="display: flex; gap: 15px;">
            <button id="reset-cancel-btn" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; border-radius: 10px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700;">Cancel</button>
            <button id="reset-confirm-btn" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 10px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700;">DELETE ALL</button>
        </div>
    `;
    
    confirmOverlay.appendChild(confirmPanel);
    document.body.appendChild(confirmOverlay);
    
    // Cancel button
    document.getElementById('reset-cancel-btn').addEventListener('click', () => {
        confirmOverlay.remove();
    });
    
    // Confirm button - actually reset
    document.getElementById('reset-confirm-btn').addEventListener('click', () => {
        // Clear ALL localStorage data
        localStorage.clear();
        
        // Show brief "Resetting..." message
        confirmPanel.innerHTML = `
            <div style="font-size: 56px; margin-bottom: 20px;">🔄</div>
            <div style="font-family: 'Orbitron', sans-serif; font-size: 24px; font-weight: 800; color: #10b981; margin-bottom: 20px;">Resetting Account...</div>
            <div style="font-size: 14px; color: #94a3b8;">Please wait</div>
        `;
        
        // Reload page after brief delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const dialog = document.getElementById('exit-dialog');
        if (dialog.style.display === 'none' || !dialog.style.display) {
            showExitDialog();
        } else {
            closeExitDialog();
        }
    }
});

document.getElementById('exit-yes').addEventListener('click', exitGame);
document.getElementById('exit-no').addEventListener('click', closeExitDialog);
document.getElementById('reset-account-btn').addEventListener('click', resetAccount);
document.getElementById('discord-btn').addEventListener('click', openDiscord);
document.getElementById('youtube-btn').addEventListener('click', openYouTube);
document.getElementById('x-btn').addEventListener('click', openX);
document.getElementById('wiki-btn').addEventListener('click', openWiki);
document.getElementById('fullscreen-toggle-btn').addEventListener('click', toggleFullscreen);

window.addEventListener('load', function() {
    const switchElement = document.getElementById('fullscreen-switch');
    if (document.fullscreenElement) {
        switchElement.classList.add('active');
    }
});

document.addEventListener('fullscreenchange', function() {
    const switchElement = document.getElementById('fullscreen-switch');
    if (document.fullscreenElement) {
        switchElement.classList.add('active');
    } else {
        switchElement.classList.remove('active');
    }
});

// Bottom UI Resize Handler
(function() {
    const resizeHandle = document.getElementById('resize-handle');
    const bottomUI = document.getElementById('bottom-ui');
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    
    // Load saved height from localStorage
    const savedHeight = localStorage.getItem('bottomUIHeight');
    if (savedHeight) {
        bottomUI.style.height = savedHeight + 'px';
    }
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startY = e.clientY;
        startHeight = bottomUI.offsetHeight;
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaY = startY - e.clientY; // Inverted because moving up increases height
        let newHeight = startHeight + deltaY;
        
        // Constrain height between 200px and 800px
        newHeight = Math.max(200, Math.min(800, newHeight));
        
        bottomUI.style.height = newHeight + 'px';
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Save the new height to localStorage
            clearTimeout(window._bottomUIHeightSaveTimer);
                window._bottomUIHeightSaveTimer = setTimeout(() => {
                    localStorage.setItem('bottomUIHeight', bottomUI.offsetHeight);
                }, 150);
        }
    });
})();


// Helper function to debug keystone cooldowns - accessible from console
window.checkKeystones = function() {
    if (!window.game || !window.game.party) {
        
        return;
    }


    window.game.party.forEach((member, i) => {
        const keystoneType = member.className.toLowerCase();
        const equipped = window.game.equippedKeystones[keystoneType];


    });
};


// Helper to open inventory tab
window.openInventory = function() {
    // Switch to loot tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelector('[data-tab="loot"]').classList.add('active');
    document.getElementById('loot-tab').classList.add('active');
    
    // Switch to inventory sub-tab
    document.querySelectorAll('.loot-sub-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.loot-section').forEach(section => section.style.display = 'none');
    document.querySelector('[data-loot-tab="inventory"]').classList.add('active');
    document.getElementById('loot-inventory-section').style.display = 'block';
    
    if (window.game && window.game.showInventory) {
        window.game.showInventory();
    }
    
    
};


// Show detailed drop table for Divine Arena
window.showDropTable = function() {
    const dropTableHTML = `
        <div id="drop-table-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.95); display: flex; justify-content: center; align-items: center; z-index: 10000; backdrop-filter: blur(10px); padding: 20px;">
            <div id="drop-table-content" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98)); border: 3px solid #d4a747; border-radius: 16px; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(212, 167, 71, 0.3); padding: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="font-family: 'Orbitron', sans-serif; font-size: 32px; font-weight: 800; color: #f5deb3; text-shadow: 0 0 10px rgba(200, 160, 50, 0.7); margin: 0;">✨ Divine Arena Drop Table ✨</h2>
                    <button id="close-drop-table-btn" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: white; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-weight: 700; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">×</button>
                </div>
                
                <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(212, 167, 71, 0.3);">
                    <p style="color: #e8d5a8; font-size: 16px; margin: 0; line-height: 1.6;">
                        <strong style="color: #fbbf24;">📊 End of Run Rewards:</strong> 3 items awarded based on total kills<br>
                        <strong style="color: #fbbf24;">🎯 Item Level:</strong> Scales with enemy level (increases as you progress)<br>
                        <strong style="color: #fbbf24;">💎 Rarity:</strong> Determined by kill count brackets below<br>
                        <strong style="color: #f59e0b;">⚠️ Important:</strong> Need 10+ kills to earn any loot (Victory threshold)
                    </p>
                </div>
                
                <div style="display: grid; gap: 12px;">
                    <!-- 1-9 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15)); border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #ef4444; margin-bottom: 8px;">💀 Kills 1-9: DEFEAT</div>
                        <div style="color: #fca5a5; font-size: 14px;">❌ No item rewards (Victory threshold not reached)</div>
                    </div>
                    
                    <!-- 10-20 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.15)); border: 2px solid rgba(34, 197, 94, 0.5); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #10b981; margin-bottom: 8px;">⚔️ Kills 10-20: VICTORY (Basic Rewards)</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #3b82f6;">🔵 Rare:</span> 50% | 
                            <span style="color: #a855f7;">🟣 Epic:</span> 35% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 15%
                        </div>
                    </div>
                    
                    <!-- 21-39 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.15)); border: 2px solid rgba(168, 85, 247, 0.5); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #a855f7; margin-bottom: 8px;">⚡ Kills 21-39: Enhanced Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #3b82f6;">🔵 Rare:</span> 35% | 
                            <span style="color: #a855f7;">🟣 Epic:</span> 44.9% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 20% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 0.1%
                        </div>
                    </div>
                    
                    <!-- 40-59 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.15)); border: 2px solid rgba(245, 158, 11, 0.5); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #f59e0b; margin-bottom: 8px;">🔥 Kills 40-59: Superior Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #3b82f6;">🔵 Rare:</span> 20% | 
                            <span style="color: #a855f7;">🟣 Epic:</span> 49.8% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 30% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 0.2%
                        </div>
                    </div>
                    
                    <!-- 60-79 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.15)); border: 2px solid rgba(236, 72, 153, 0.5); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #ec4899; margin-bottom: 8px;">💫 Kills 60-79: Elite Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #3b82f6;">🔵 Rare:</span> 10% | 
                            <span style="color: #a855f7;">🟣 Epic:</span> 49.7% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 40% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 0.3%
                        </div>
                    </div>
                    
                    <!-- 80-99 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15)); border: 2px solid rgba(251, 191, 36, 0.5); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">⭐ Kills 80-99: Exceptional Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #3b82f6;">🔵 Rare:</span> 5% | 
                            <span style="color: #a855f7;">🟣 Epic:</span> 44.5% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 50% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 0.5%
                        </div>
                    </div>
                    
                    <!-- 100-119 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.15)); border: 2px solid rgba(99, 102, 241, 0.5); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #6366f1; margin-bottom: 8px;">🌟 Kills 100-119: Masterwork Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #a855f7;">🟣 Epic:</span> 34% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 65% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 1%
                        </div>
                    </div>
                    
                    <!-- 120-139 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(124, 58, 237, 0.2)); border: 2px solid rgba(139, 92, 246, 0.6); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #8b5cf6; margin-bottom: 8px;">💎 Kills 120-139: Legendary Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #a855f7;">🟣 Epic:</span> 23% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 75% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 2%
                        </div>
                    </div>
                    
                    <!-- 140-159 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(219, 39, 119, 0.2)); border: 2px solid rgba(236, 72, 153, 0.6); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #ec4899; margin-bottom: 8px;">🔮 Kills 140-159: Mythic Tier</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #a855f7;">🟣 Epic:</span> 12% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 85% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 3%
                        </div>
                    </div>
                    
                    <!-- 160-179 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(244, 114, 182, 0.25), rgba(236, 72, 153, 0.2)); border: 2px solid rgba(244, 114, 182, 0.6); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #f472b6; margin-bottom: 8px;">✨ Kills 160-179: Godly Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #a855f7;">🟣 Epic:</span> 5% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 90% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 5%
                        </div>
                    </div>
                    
                    <!-- 180-199 Kills -->
                    <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.25)); border: 2px solid rgba(251, 191, 36, 0.7); border-radius: 10px; padding: 15px;">
                        <div style="font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">👑 Kills 180-199: Ultimate Rewards</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #a855f7;">🟣 Epic:</span> 3% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 90% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 7%
                        </div>
                    </div>
                    
                    <!-- 200+ Kills -->
                    <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(147, 51, 234, 0.25)); border: 3px solid rgba(168, 85, 247, 0.8); border-radius: 10px; padding: 15px; box-shadow: 0 0 30px rgba(168, 85, 247, 0.4);">
                        <div style="font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700; color: #c084fc; margin-bottom: 8px; text-shadow: 0 0 8px rgba(168, 85, 247, 0.6); letter-spacing: 1px;">🌌 Kills 200+: TRANSCENDENT</div>
                        <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
                            <span style="color: #a855f7;">🟣 Epic:</span> 2% | 
                            <span style="color: #f59e0b;">🟠 Legendary:</span> 88% | 
                            <span style="color: #ec4899;">💎 Mythic:</span> 10%
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 25px; padding: 15px; background: rgba(34, 197, 94, 0.15); border: 2px solid rgba(34, 197, 94, 0.5); border-radius: 10px;">
                    <p style="color: #6ee7b7; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong style="color: #10b981;">💡 Pro Tip:</strong> Item level scales with enemy level in Divine Arena. The deeper you push, the higher level items you'll receive! Mythic items also grant +5 item levels bonus.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = dropTableHTML;
    document.body.appendChild(div.firstElementChild);
    
    // Add escape key handler
    const closeModal = () => {
        const modal = document.getElementById('drop-table-modal');
        if (modal) {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    
    document.addEventListener('keydown', escapeHandler);
    
    // Wire up close button
    document.getElementById('close-drop-table-btn').onclick = closeModal;
    
    // Click outside to close
    document.getElementById('drop-table-modal').onclick = (e) => {
        if (e.target.id === 'drop-table-modal') {
            closeModal();
        }
    };
};


window.addEventListener('beforeunload', function() {
    if (window.game && window.game.cleanup) {
        window.game.cleanup();
    }
});

// Game continues running when alt-tabbed/minimized (idle game should keep going!)
let backgroundGameInterval = null;
let lastBackgroundTime = 0;

document.addEventListener('visibilitychange', function() {
    if (document.hidden && window.game) {
        console.log('🎮 Game running in background...');
        lastBackgroundTime = Date.now();
        
        // Start a backup timer for when requestAnimationFrame slows down
        if (!backgroundGameInterval) {
            backgroundGameInterval = setInterval(() => {
                if (window.game && !window.game.paused && !window.game.destroyed) {
                    const now = Date.now();
                    const ticksToRun = Math.min(window.game.speed * 2, 10);
                    
                    for (let i = 0; i < ticksToRun; i++) {
                        if (window.game.inBattle) {
                            window.game.battleTick();
                        }
                        if (window.game.currentDungeon === 'runetrial' && window.game.runeTrialPillarCharging) {
                            window.game.battleTick();
                        }
                        if (window.game.endlessMode && window.game.inBattle) {
                            window.game.battleTick();
                        }
                    }
                    
                    if (window.game.inBattle && typeof window.game.checkBattleEnd === 'function') {
                        window.game.checkBattleEnd();
                    }
                    
                    // Auto-save every 30 seconds in background
                    if (!window.game._lastBackgroundSave) window.game._lastBackgroundSave = 0;
                    if (now - window.game._lastBackgroundSave > 30000) {
                        window.game._lastBackgroundSave = now;
                        if (typeof window.game.saveGame === 'function') {
                            window.game.saveGame();
                        }
                    }
                    lastBackgroundTime = now;
                }
            }, 50); // 20 FPS - faster for smoother background play
        }
    } else if (!document.hidden && window.game) {
        console.log('🎮 Game focused');
        if (backgroundGameInterval) {
            clearInterval(backgroundGameInterval);
            backgroundGameInterval = null;
        }
    }
});

// ========================================
// PERMANENT BACKGROUND FALLBACK TIMER
// ========================================
// Catches cases where visibilitychange doesn't fire (common with Electron + Steam)
let permanentBackgroundTimer = null;

function startPermanentBackgroundTimer() {
    if (permanentBackgroundTimer) return;
    
    permanentBackgroundTimer = setInterval(() => {
        if (!window.game || window.game.paused || window.game.destroyed) return;
        
        // Check if requestAnimationFrame is being throttled OR window is hidden/minimized
        const now = Date.now();
        const timeSinceLastLoop = window.game._lastGameLoopTime ? (now - window.game._lastGameLoopTime) : 0;
        
        // Run if: document hidden, OR RAF hasn't run in 200ms, OR window not focused
        const shouldRunBackground = document.hidden || timeSinceLastLoop > 200 || !document.hasFocus();
        
        if (shouldRunBackground) {
            // RAF is being throttled, run game logic manually
            const ticksToRun = Math.min(window.game.speed * 2, 8);
            
            for (let i = 0; i < ticksToRun; i++) {
                if (window.game.inBattle) {
                    window.game.battleTick();
                }
                if (window.game.currentDungeon === 'runetrial' && window.game.runeTrialPillarCharging) {
                    window.game.battleTick();
                }
                if (window.game.endlessMode && window.game.inBattle) {
                    window.game.battleTick();
                }
            }
            
            if (window.game.inBattle && typeof window.game.checkBattleEnd === 'function') {
                window.game.checkBattleEnd();
            }
            
            // FLOOR JUMPING FIX: Handle room transitions if battle ended, but respect guards
            if (!window.game.inBattle && window.game.room && window.game.enemies.length === 0 && 
                !window.game.movingToNextRoom && !window.game.transitioningFloor && 
                !window.game._floorCompletionHandled) {
                // Room cleared, move to next - but only if not already scheduled
                if (typeof window.game.moveToNextRoom === 'function' && !window.game._moveNextRoomTimeout) {
                    window.game.moveToNextRoom();
                }
            }
            
            // Update the timestamp so we don't double-process
            window.game._lastGameLoopTime = now;
        }
    }, 100);
    
    console.log('🎮 Permanent background timer started (with minimized support)');
}

// Start after game loads
setTimeout(startPermanentBackgroundTimer, 3000);

// ========================================
// EMERGENCY RESET (Ctrl+Shift+F5)
// ========================================
document.addEventListener('keydown', function(e) {
    // Ctrl+Shift+F5 = Emergency Reset
    if (e.ctrlKey && e.shiftKey && e.key === 'F5') {
        e.preventDefault();
        if (confirm('⚠️ EMERGENCY RESET\n\nThis will clear all save data and start fresh.\n\nOnly use this if the game is broken!\n\nAre you sure?')) {
            localStorage.clear();
            // Also try to delete filesystem save
            if (typeof require !== 'undefined') {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const appData = process.env.APPDATA || '';
                    const savePath = path.join(appData, 'everfall-idle-dungeon-rpg', 'saves', 'game_save.json');
                    if (fs.existsSync(savePath)) {
                        fs.unlinkSync(savePath);
                    }
                    // Also delete backups on full reset
                    for (let i = 1; i <= 3; i++) {
                        const backupPath = path.join(appData, 'everfall-idle-dungeon-rpg', 'saves', `game_save_backup${i}.json`);
                        if (fs.existsSync(backupPath)) {
                            fs.unlinkSync(backupPath);
                        }
                    }
                } catch(e) { console.log('Could not delete file save:', e); }
            }
            alert('Reset complete! Game will now reload.');
            location.reload();
        }
    }
    
    // Ctrl+Shift+F6 = Try Recovery from Backups
    if (e.ctrlKey && e.shiftKey && e.key === 'F6') {
        e.preventDefault();
        
        let recoveryInfo = '🔧 SAVE RECOVERY TOOL\n\nSearching for backup saves...\n\n';
        let foundBackups = [];
        
        if (typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');
                const appData = process.env.APPDATA || '';
                const saveDir = path.join(appData, 'everfall-idle-dungeon-rpg', 'saves');
                
                // Check main save
                const mainSave = path.join(saveDir, 'game_save.json');
                if (fs.existsSync(mainSave)) {
                    try {
                        const data = fs.readFileSync(mainSave, 'utf8');
                        JSON.parse(data);
                        const stats = fs.statSync(mainSave);
                        recoveryInfo += `✅ Main save: OK (${new Date(stats.mtime).toLocaleString()})\n`;
                    } catch (e) {
                        recoveryInfo += `❌ Main save: CORRUPTED\n`;
                    }
                } else {
                    recoveryInfo += `⚠️ Main save: Not found\n`;
                }
                
                // Check backups
                for (let i = 1; i <= 3; i++) {
                    const backupPath = path.join(saveDir, `game_save_backup${i}.json`);
                    if (fs.existsSync(backupPath)) {
                        try {
                            const data = fs.readFileSync(backupPath, 'utf8');
                            JSON.parse(data);
                            const stats = fs.statSync(backupPath);
                            recoveryInfo += `✅ Backup ${i}: OK (${new Date(stats.mtime).toLocaleString()})\n`;
                            foundBackups.push({ path: backupPath, num: i, time: stats.mtime });
                        } catch (e) {
                            recoveryInfo += `❌ Backup ${i}: CORRUPTED\n`;
                        }
                    }
                }
                
                if (foundBackups.length > 0) {
                    recoveryInfo += `\nFound ${foundBackups.length} valid backup(s).\n`;
                    recoveryInfo += `Click OK to restore the most recent backup.`;
                    
                    if (confirm(recoveryInfo)) {
                        // Sort by time, most recent first
                        foundBackups.sort((a, b) => b.time - a.time);
                        const bestBackup = foundBackups[0];
                        
                        try {
                            const backupData = fs.readFileSync(bestBackup.path, 'utf8');
                            // Copy to main save
                            fs.writeFileSync(mainSave, backupData, 'utf8');
                            alert(`✅ Restored from backup ${bestBackup.num}!\n\nGame will now reload.`);
                            location.reload();
                        } catch (e) {
                            alert('❌ Failed to restore backup: ' + e.message);
                        }
                    }
                } else {
                    recoveryInfo += `\n❌ No valid backups found.`;
                    alert(recoveryInfo);
                }
            } catch (e) {
                alert('Error checking saves: ' + e.message);
            }
        } else {
            // Browser mode
            recoveryInfo += 'Browser mode - checking localStorage...\n\n';
            
            const keys = ['rpg_dungeon_save', 'rpg_dungeon_save_backup1', 'rpg_dungeon_save_backup2'];
            keys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        JSON.parse(data);
                        recoveryInfo += `✅ ${key}: OK\n`;
                        foundBackups.push(key);
                    } catch (e) {
                        recoveryInfo += `❌ ${key}: CORRUPTED\n`;
                    }
                } else {
                    recoveryInfo += `⚠️ ${key}: Not found\n`;
                }
            });
            
            if (foundBackups.length > 1 && foundBackups[0] !== 'rpg_dungeon_save') {
                recoveryInfo += `\nClick OK to restore from ${foundBackups.find(k => k !== 'rpg_dungeon_save')}`;
                if (confirm(recoveryInfo)) {
                    const backupKey = foundBackups.find(k => k !== 'rpg_dungeon_save');
                    const backupData = localStorage.getItem(backupKey);
                    localStorage.setItem('rpg_dungeon_save', backupData);
                    alert('✅ Restored! Game will now reload.');
                    location.reload();
                }
            } else {
                alert(recoveryInfo);
            }
        }
    }
});

// ========================================
// RELEASE MODE INITIALIZATION
// ========================================
if (!DEMO_MODE) {
    console.log('🎮 Everfall 2: Full Release - All dungeons unlocked!');
}

