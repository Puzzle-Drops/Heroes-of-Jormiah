        class CharacterSprite {
    constructor(x, y, color, type) {
        this.gridX = x;
        this.gridY = y;
        this.color = color;
        this.type = type;
        this.offsetY = 0;
        this.animTimer = Math.random() * Math.PI * 2;
        this.attacking = false;
        this.attackTimer = 0;
        
        // Combat positioning
        this.combatX = x;
        this.combatY = y;
                this.targetX = x;
                this.targetY = y;
                this.moveSpeed = 0.027; // Slowed down 3x (was 0.08)
                this.isMoving = false;
                
                const pos = ISO.toScreen(x, y);
                this.screenX = pos.x;
                this.screenY = pos.y;
            }

            update() {
                this.animTimer += 0.1;
                this.offsetY = Math.sin(this.animTimer) * 2;
                
                if (this.attacking) {
                    this.attackTimer++;
                    if (this.attackTimer > 15) {
                        this.attacking = false;
                        this.attackTimer = 0;
                    }
                }
                
                // Move towards target position
                const dx = this.targetX - this.gridX;
                const dy = this.targetY - this.gridY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0.1) {
                    this.isMoving = true;
                    this.gridX += dx * this.moveSpeed;
                    this.gridY += dy * this.moveSpeed;
                } else {
                    this.isMoving = false;
                    this.gridX = this.targetX;
                    this.gridY = this.targetY;
                }
                
                // Boundary constraints for special dungeons (Rune Trial, Vault, Divine Arena, Pinnacle)
                if (window.game && (window.game.currentDungeon === 'runetrial' || 
                    window.game.currentDungeon === 'vault' || 
                    window.game.currentDungeon === 'pinnacle' ||
                    window.game.currentDungeon === 'endlessblessings')) {
                    // Get grid size from the room
                    const gridSize = window.game.room ? (window.game.room.width || 30) : 30;
                    const minX = 0;
                    const maxX = gridSize - 1;
                    const minY = 0;
                    const maxY = gridSize - 1;
                    
                    // Clamp position within bounds
                    this.gridX = Math.max(minX, Math.min(maxX, this.gridX));
                    this.gridY = Math.max(minY, Math.min(maxY, this.gridY));
                    this.targetX = Math.max(minX, Math.min(maxX, this.targetX));
                    this.targetY = Math.max(minY, Math.min(maxY, this.targetY));
                }
                
                // Smooth screen position update
                const targetPos = ISO.toScreen(this.gridX, this.gridY);
                this.screenX += (targetPos.x - this.screenX) * 0.2;
                this.screenY += (targetPos.y - this.screenY) * 0.2;
            }

            draw(ctx, offsetX, offsetY) {
    const x = this.screenX + offsetX;
    const y = this.screenY + offsetY + this.offsetY;
    
    // Store screen position for hover detection
    this.screenDrawX = x;
    this.screenDrawY = y;
    
    // Shadow (larger for bosses)
const enemy = this.type === 'enemy' ? window.game?.enemies?.find(e => e.sprite === this) : null;
const isBoss = enemy && (enemy.isRuneTrialBoss || enemy.isPinnacleBoss || enemy.name === 'Keystone Warden' || enemy.name === 'Rune Guardian' || enemy.name === 'Pinnacle Boss' || enemy.name === 'Treasure Guardian');
const shadowSize = isBoss ? 35 : 12;
const shadowOpacity = isBoss ? 0.5 : 0.3;

ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`;
ctx.beginPath();
ctx.ellipse(x, y + 20, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
ctx.fill();
                
                // Draw based on class for party members
                if (this.type === 'party') {
                    // V2 Enhanced Graphics
                    if (typeof GRAPHICS_VERSION !== 'undefined' && GRAPHICS_VERSION === 2) {
                        this.drawV2Party(ctx, x, y);
                    } else {
                    // V1 Original Graphics
                    // Different drawing for each class
                    if (this.classSymbol === '🛡') { // Tank
                        // Heavy armor body
                        ctx.fillStyle = '#71717a';
                        ctx.fillRect(x - 11, y - 10, 22, 22);
                        
                        // Armor details
                        ctx.fillStyle = '#52525b';
                        ctx.fillRect(x - 9, y - 8, 18, 4);
                        ctx.fillRect(x - 9, y + 4, 18, 4);
                        
                        // Shield
                        ctx.fillStyle = '#a1a1aa';
                        ctx.fillRect(x - 15, y - 6, 5, 12);
                        
                        // Sword
                        ctx.fillStyle = '#d4d4d8';
                        ctx.fillRect(x + 10, y - 12, 2, 18);
                        ctx.fillRect(x + 8, y - 2, 6, 2);
                        
                        // Head with helmet
                        ctx.fillStyle = '#71717a';
                        ctx.fillRect(x - 9, y - 20, 18, 12);
                        ctx.fillStyle = '#fdbcb4';
                        ctx.fillRect(x - 6, y - 16, 12, 6);
                        
                    } else if (this.classSymbol === '💊') { // Healer
                        // Robes (flowing)
                        ctx.fillStyle = '#f0fdf4';
                        ctx.beginPath();
                        ctx.moveTo(x - 12, y + 10);
                        ctx.lineTo(x - 8, y - 8);
                        ctx.lineTo(x + 8, y - 8);
                        ctx.lineTo(x + 12, y + 10);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Robe details
                        ctx.fillStyle = '#10b981';
                        ctx.fillRect(x - 2, y - 8, 4, 18);
                        ctx.fillRect(x - 8, y + 6, 16, 2);
                        
                        // Staff
                        ctx.strokeStyle = '#84cc16';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x + 8, y - 15);
                        ctx.lineTo(x + 8, y + 12);
                        ctx.stroke();
                        // Staff orb
                        ctx.fillStyle = '#86efac';
                        ctx.beginPath();
                        ctx.arc(x + 8, y - 16, 3, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Head with hood
                        ctx.fillStyle = '#10b981';
                        ctx.fillRect(x - 9, y - 20, 18, 14);
                        ctx.fillStyle = '#fdbcb4';
                        ctx.fillRect(x - 6, y - 16, 12, 8);
                        
                    } else if (this.classSymbol === '🔮') { // Mage
                        // Wizard robes
                        ctx.fillStyle = '#312e81';
                        ctx.beginPath();
                        ctx.moveTo(x - 12, y + 10);
                        ctx.lineTo(x - 8, y - 8);
                        ctx.lineTo(x + 8, y - 8);
                        ctx.lineTo(x + 12, y + 10);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Robe trim
                        ctx.fillStyle = '#8b5cf6';
                        ctx.fillRect(x - 2, y - 8, 4, 18);
                        
                        // Wand
                        ctx.strokeStyle = '#a78bfa';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x - 8, y - 10);
                        ctx.lineTo(x - 8, y + 8);
                        ctx.stroke();
                        // Wand star
                        ctx.fillStyle = '#c4b5fd';
                        ctx.beginPath();
                        ctx.arc(x - 8, y - 12, 3, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Head with hat
                        ctx.fillStyle = '#312e81';
                        ctx.fillRect(x - 10, y - 22, 20, 4);
                        ctx.fillRect(x - 6, y - 26, 12, 4);
                        ctx.fillStyle = '#fdbcb4';
                        ctx.fillRect(x - 6, y - 18, 12, 8);
                        
                    } else if (this.classSymbol === '🗡') { // Rogue
                        // Light armor/cloak
                        ctx.fillStyle = '#450a0a';
                        ctx.fillRect(x - 10, y - 10, 20, 20);
                        
                        // Armor details
                        ctx.fillStyle = '#7f1d1d';
                        ctx.fillRect(x - 8, y - 6, 16, 2);
                        ctx.fillRect(x - 8, y + 2, 16, 2);
                        
                        // Dual daggers
                        ctx.fillStyle = '#d4d4d8';
                        ctx.fillRect(x - 12, y - 4, 2, 10);
                        ctx.fillRect(x + 10, y - 4, 2, 10);
                        ctx.fillRect(x - 14, y - 2, 6, 2);
                        ctx.fillRect(x + 8, y - 2, 6, 2);
                        
                        // Head with hood
                        ctx.fillStyle = '#450a0a';
                        ctx.fillRect(x - 9, y - 20, 18, 12);
                        ctx.fillStyle = '#fdbcb4';
                        ctx.fillRect(x - 6, y - 16, 12, 6);
                        
                    } else if (this.classSymbol === '🏹') { // Archer
                        // Leather armor body
                        ctx.fillStyle = '#78350f';
                        ctx.fillRect(x - 10, y - 10, 20, 20);
                        
                        // Armor details (leather straps)
                        ctx.fillStyle = '#92400e';
                        ctx.fillRect(x - 8, y - 8, 16, 2);
                        ctx.fillRect(x - 8, y, 16, 2);
                        ctx.fillRect(x - 8, y + 6, 16, 2);
                        
                        // Quiver on back (LEFT SIDE - SWAPPED)
                        ctx.fillStyle = '#451a03';
                        ctx.fillRect(x - 12, y - 12, 6, 14);
                        // Arrows in quiver
                        ctx.fillStyle = '#84cc16';
                        ctx.fillRect(x - 11, y - 14, 1, 4);
                        ctx.fillRect(x - 9, y - 13, 1, 3);
                        ctx.fillRect(x - 7, y - 12, 1, 2);
                        
                        // Bow (RIGHT SIDE - SWAPPED) - pullback when attacking
                        const bowPull = this.attacking ? (this.attackTimer / 15) * 6 : 0;
                        ctx.strokeStyle = '#92400e';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x + 12, y - 10);
                        ctx.quadraticCurveTo(x + 16 - bowPull, y, x + 12, y + 10);
                        ctx.stroke();
                        // Bow string - pulls back when attacking
                        ctx.strokeStyle = '#d4d4d8';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x + 12, y - 10);
                        ctx.lineTo(x + 12 - bowPull, y);
                        ctx.lineTo(x + 12, y + 10);
                        ctx.stroke();
                        
                        // Arrow ready (in hand) - visible when not attacking or just starting attack
                        if (!this.attacking || this.attackTimer < 10) {
                            ctx.fillStyle = '#84cc16';
                            ctx.fillRect(x + 4 + bowPull, y - 1, 8 - bowPull, 2);
                            ctx.fillStyle = '#78716c';
                            ctx.beginPath();
                            ctx.moveTo(x + 12 - bowPull, y);
                            ctx.lineTo(x + 15 - bowPull, y - 2);
                            ctx.lineTo(x + 15 - bowPull, y + 2);
                            ctx.closePath();
                            ctx.fill();
                        }
                        
                        // Head with ranger hood
                        ctx.fillStyle = '#15803d';
                        ctx.fillRect(x - 9, y - 20, 18, 12);
                        ctx.fillStyle = '#fdbcb4';
                        ctx.fillRect(x - 6, y - 16, 12, 6);
                        // Hood point
                        ctx.fillStyle = '#15803d';
                        ctx.beginPath();
                        ctx.moveTo(x - 9, y - 20);
                        ctx.lineTo(x, y - 24);
                        ctx.lineTo(x + 9, y - 20);
                        ctx.fill();
                        
                    } else if (this.classSymbol === '⚔️') { // Paladin
                        // Holy plate armor body
                        ctx.fillStyle = '#e0e7ff';
                        ctx.fillRect(x - 11, y - 10, 22, 22);
                        
                        // Golden trim
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillRect(x - 12, y - 11, 24, 2);
                        ctx.fillRect(x - 12, y - 1, 24, 2);
                        ctx.fillRect(x - 12, y + 9, 24, 2);
                        
                        // Holy symbol on chest
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillRect(x - 2, y - 6, 4, 12);
                        ctx.fillRect(x - 6, y - 2, 12, 4);
                        // Symbol glow
                        ctx.shadowColor = '#fbbf24';
                        ctx.fillStyle = '#fef3c7';
                        ctx.fillRect(x - 1, y - 5, 2, 10);
                        ctx.fillRect(x - 5, y - 1, 10, 2);
                        
                        // Holy sword (right side) - swings when attacking
                        const swordAngle = this.attacking ? Math.sin(this.attackTimer / 15 * Math.PI) * 0.5 : 0;
                        const swordOffset = this.attacking ? Math.sin(this.attackTimer / 15 * Math.PI) * 8 : 0;
                        
                        ctx.save();
                        ctx.translate(x + 11, y - 2);
                        ctx.rotate(swordAngle);
                        
                        // Sword blade
                        ctx.fillStyle = '#c0c0c0';
                        ctx.fillRect(0, -12 + swordOffset, 3, 22);
                        // Sword crossguard
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillRect(-2, -2 + swordOffset, 7, 3);
                        
                        // Sword glow effect (stronger when attacking)
                        const glowIntensity = this.attacking ? 0.8 : 0.3;
                        ctx.strokeStyle = `rgba(254, 243, 199, ${glowIntensity})`;
                        ctx.lineWidth = this.attacking ? 3 : 1;
                        ctx.shadowColor = '#fbbf24';
                        ctx.strokeRect(0.5, -11 + swordOffset, 2, 20);
                        
                        // Slash trail when attacking
                        if (this.attacking && this.attackTimer > 5 && this.attackTimer < 12) {
                            ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
                            ctx.lineWidth = 4;
                            ctx.beginPath();
                            ctx.arc(0, 0, 20, -Math.PI / 3, Math.PI / 3);
                            ctx.stroke();
                        }
                        
                        ctx.restore();
                        
                        // Shield (left side)
                        ctx.fillStyle = '#3b82f6';
                        ctx.fillRect(x - 16, y - 8, 6, 14);
                        // Shield cross
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillRect(x - 15, y - 6, 4, 10);
                        ctx.fillRect(x - 17, y - 2, 8, 2);
                        
                        // Shoulder plates
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillRect(x - 14, y - 11, 6, 4);
                        ctx.fillRect(x + 8, y - 11, 6, 4);
                        
                        // Head with holy helm
                        ctx.fillStyle = '#e0e7ff';
                        ctx.fillRect(x - 9, y - 20, 18, 12);
                        // Helm glow
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillRect(x - 10, y - 21, 20, 2);
                        // Face
                        ctx.fillStyle = '#fdbcb4';
                        ctx.fillRect(x - 6, y - 16, 12, 6);
                        // Divine halo effect
                        ctx.strokeStyle = '#fef3c7';
                        ctx.lineWidth = 2;
                        ctx.shadowColor = '#fbbf24';
                        ctx.beginPath();
                        ctx.arc(x, y - 22, 10, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    } // End V1 graphics
                } else {
    // Enemy sprites based on type
    let enemyName = this.type === 'enemy' ? (window.game?.enemies?.find(e => e.sprite === this)?.name || '') : '';
    
    // Also check runeTrialBoss if not in enemies array yet
    if (!enemyName && window.game?.runeTrialBoss?.sprite === this) {
        enemyName = window.game.runeTrialBoss.name;
    }
    
    // CRITICAL: Fallback for Treasure Guardian (only if no other name found)
    if (!enemyName && this.color === '#f59e0b') {
        enemyName = 'Treasure Guardian';
        
    }

    // Enemy rendering
    
    
    // FORCE TREASURE GUARDIAN CHECK BY COLOR (PRIORITY)
    if (this.color === '#f59e0b' && (enemyName === 'Treasure Guardian' || !enemyName)) {
        // TREASURE GUARDIAN - MASSIVE 4X SIZE with bags of gold
        const scale = 1.0;;
        
        
        // Larger golden aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 50 * scale);
        auraGradient.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
        auraGradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 50 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Massive armored body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 16 * scale, y - 10 * scale, 32 * scale, 20 * scale);
        
        // Armor plating
        ctx.fillStyle = '#1a1300';
        ctx.fillRect(x - 13 * scale, y - 8 * scale, 26 * scale, 3 * scale);
        ctx.fillRect(x - 13 * scale, y - 2 * scale, 26 * scale, 3 * scale);
        ctx.fillRect(x - 13 * scale, y + 4 * scale, 26 * scale, 3 * scale);
        
        // Golden trim
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 14 * scale, y - 9 * scale, 28 * scale, 2 * scale);
        ctx.fillRect(x - 14 * scale, y - 1 * scale, 28 * scale, 2 * scale);
        ctx.fillRect(x - 14 * scale, y + 5 * scale, 28 * scale, 2 * scale);
        
        // Shoulders
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 22 * scale, y - 9 * scale, 8 * scale, 12 * scale);
        ctx.fillRect(x + 14 * scale, y - 9 * scale, 8 * scale, 12 * scale);
        
        // Golden spikes
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 21 * scale, y - 12 * scale, 3 * scale, 4 * scale);
        ctx.fillRect(x - 17 * scale, y - 14 * scale, 3 * scale, 6 * scale);
        ctx.fillRect(x - 13 * scale, y - 12 * scale, 3 * scale, 4 * scale);
        ctx.fillRect(x + 11 * scale, y - 12 * scale, 3 * scale, 4 * scale);
        ctx.fillRect(x + 15 * scale, y - 14 * scale, 3 * scale, 6 * scale);
        ctx.fillRect(x + 19 * scale, y - 12 * scale, 3 * scale, 4 * scale);
        
        // Helmet
        ctx.fillStyle = '#1a1300';
        ctx.fillRect(x - 10 * scale, y - 18 * scale, 20 * scale, 10 * scale);
        
        // Crown
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 12 * scale, y - 24 * scale, 6 * scale, 6 * scale);
        ctx.fillRect(x - 5 * scale, y - 27 * scale, 5 * scale, 9 * scale);
        ctx.fillRect(x + 1 * scale, y - 28 * scale, 5 * scale, 10 * scale);
        ctx.fillRect(x + 7 * scale, y - 24 * scale, 6 * scale, 6 * scale);
        
        // Face plate
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 9 * scale, y - 17 * scale, 18 * scale, 9 * scale);
        ctx.fillStyle = '#1a1300';
        ctx.fillRect(x - 7 * scale, y - 15 * scale, 14 * scale, 5 * scale);
        
        // Glowing eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#f59e0b';
        ctx.fillRect(x - 6 * scale, y - 14 * scale, 4 * scale, 4 * scale);
        ctx.fillRect(x + 2 * scale, y - 14 * scale, 4 * scale, 4 * scale);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x - 5 * scale, y - 13 * scale, 2 * scale, 2 * scale);
        ctx.fillRect(x + 3 * scale, y - 13 * scale, 2 * scale, 2 * scale);
        
        // BAGS OF GOLD - left hand
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(x - 28 * scale, y - 2 * scale, 10 * scale, 14 * scale);
        ctx.fillRect(x - 26 * scale, y - 4 * scale, 6 * scale, 3 * scale);
        ctx.fillStyle = '#6a5a45';
        ctx.fillRect(x - 25 * scale, y - 5 * scale, 4 * scale, 2 * scale);
        
        // Gold coins spilling
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x - 26 * scale, y + 11 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 22 * scale, y + 10 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 24 * scale, y + 8 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // WAR HAMMER - right hand
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x + 17 * scale, y - 25 * scale, 4 * scale, 40 * scale);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + 12 * scale, y - 28 * scale, 14 * scale, 8 * scale);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x + 13 * scale, y - 27 * scale, 12 * scale, 6 * scale);
        
        // Hammer spikes
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x + 10 * scale, y - 26 * scale, 3 * scale, 4 * scale);
        ctx.fillRect(x + 25 * scale, y - 26 * scale, 3 * scale, 4 * scale);
        ctx.fillRect(x + 17 * scale, y - 30 * scale, 4 * scale, 3 * scale);
        
        // Chest emblem
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 6 * scale, y - 4 * scale, 12 * scale, 8 * scale);
        ctx.fillStyle = '#1a1300';
        ctx.fillRect(x - 5 * scale, y - 3 * scale, 10 * scale, 6 * scale);
        
        // Glowing gem
        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.shadowColor = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y + 5 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyName === 'Rune Guardian') {
        // RUNE GUARDIAN - ANCIENT NIGHTMARE
        const scale = 2.8; // Even BIGGER
        
        // Ominous purple void aura (multi-layered)
        for (let i = 3; i > 0; i--) {
            const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 35 * scale * i * 0.4);
            auraGradient.addColorStop(0, `rgba(88, 28, 135, ${0.2 * i})`);
            auraGradient.addColorStop(0.5, `rgba(109, 40, 217, ${0.15 * i})`);
            auraGradient.addColorStop(1, 'rgba(109, 40, 217, 0)');
            ctx.fillStyle = auraGradient;
            ctx.beginPath();
            ctx.arc(x, y, 35 * scale * i * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Void tendrils emanating from body
        const time = Date.now() / 500;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i / 6) + time;
            const tendrilLength = 20 * scale + Math.sin(time + i) * 8 * scale;
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + Math.sin(time + i) * 0.2})`;
            ctx.lineWidth = 3 * scale;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + Math.cos(angle) * tendrilLength * 0.6,
                y + Math.sin(angle) * tendrilLength * 0.4,
                x + Math.cos(angle) * tendrilLength,
                y + Math.sin(angle) * tendrilLength
            );
            ctx.stroke();
        }
        
        // Main body - dark void armor
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 20 * scale, y - 14 * scale, 40 * scale, 28 * scale);
        
        // Void cracks/energy seeping through armor
        ctx.fillStyle = '#6b21a8';
        ctx.fillRect(x - 18 * scale, y - 10 * scale, 3 * scale, 24 * scale);
        ctx.fillRect(x + 15 * scale, y - 10 * scale, 3 * scale, 24 * scale);
        ctx.fillRect(x - 15 * scale, y - 2 * scale, 30 * scale, 2 * scale);
        
        // Chest core - pulsing void energy
        const voidPulse = 0.5 + Math.sin(Date.now() / 300) * 0.5;
        ctx.fillStyle = `rgba(168, 85, 247, ${voidPulse})`;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Spiked shoulder plates
        ctx.fillStyle = '#0f0520';
        // Left shoulder
        ctx.fillRect(x - 30 * scale, y - 12 * scale, 15 * scale, 20 * scale);
        ctx.fillRect(x - 32 * scale, y - 16 * scale, 4 * scale, 8 * scale);
        ctx.fillRect(x - 28 * scale, y - 18 * scale, 4 * scale, 10 * scale);
        ctx.fillRect(x - 24 * scale, y - 16 * scale, 4 * scale, 8 * scale);
        // Right shoulder
        ctx.fillRect(x + 15 * scale, y - 12 * scale, 15 * scale, 20 * scale);
        ctx.fillRect(x + 28 * scale, y - 16 * scale, 4 * scale, 8 * scale);
        ctx.fillRect(x + 24 * scale, y - 18 * scale, 4 * scale, 10 * scale);
        ctx.fillRect(x + 20 * scale, y - 16 * scale, 4 * scale, 8 * scale);
        
        // Helmet - ancient and menacing
        ctx.fillStyle = '#050114';
        ctx.fillRect(x - 14 * scale, y - 24 * scale, 28 * scale, 16 * scale);
        
        // Face plate with runes
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(x - 12 * scale, y - 22 * scale, 24 * scale, 12 * scale);
        
        // Massive curved demon horns
        ctx.fillStyle = '#000000';
        // Left horn
        ctx.fillRect(x - 18 * scale, y - 30 * scale, 7 * scale, 14 * scale);
        ctx.fillRect(x - 20 * scale, y - 32 * scale, 5 * scale, 10 * scale);
        // Right horn
        ctx.fillRect(x + 11 * scale, y - 30 * scale, 7 * scale, 14 * scale);
        ctx.fillRect(x + 15 * scale, y - 32 * scale, 5 * scale, 10 * scale);
        
        // Horn glow
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.fillRect(x - 17 * scale, y - 28 * scale, 5 * scale, 10 * scale);
        ctx.fillRect(x + 12 * scale, y - 28 * scale, 5 * scale, 10 * scale);
        
        // DEMONIC RED EYES - SOUL-PIERCING
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#dc2626';
        ctx.fillRect(x - 10 * scale, y - 18 * scale, 6 * scale, 6 * scale);
        ctx.fillRect(x + 4 * scale, y - 18 * scale, 6 * scale, 6 * scale);
        
        // Eye cores (brighter)
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(x - 8 * scale, y - 16 * scale, 2 * scale, 2 * scale);
        ctx.fillRect(x + 6 * scale, y - 16 * scale, 2 * scale, 2 * scale);
        
        // Ancient glowing runes on armor (multiple, animated)
        const runePulse = 0.4 + Math.sin(Date.now() / 400) * 0.4;
        ctx.fillStyle = `rgba(139, 92, 246, ${runePulse})`;
        ctx.shadowColor = '#8b5cf6';
        // Chest runes
        ctx.fillRect(x - 8 * scale, y - 8 * scale, 4 * scale, 4 * scale);
        ctx.fillRect(x + 4 * scale, y - 8 * scale, 4 * scale, 4 * scale);
        ctx.fillRect(x - 3 * scale, y + 2 * scale, 6 * scale, 6 * scale);
        // Shoulder runes
        ctx.fillRect(x - 24 * scale, y - 6 * scale, 3 * scale, 3 * scale);
        ctx.fillRect(x + 21 * scale, y - 6 * scale, 3 * scale, 3 * scale);
        
        // Floating void particles around boss
        for (let i = 0; i < 8; i++) {
            const particleAngle = (Math.PI * 2 * i / 8) + time * 0.5;
            const particleRadius = 40 * scale + Math.sin(time * 2 + i) * 5 * scale;
            const px = x + Math.cos(particleAngle) * particleRadius;
            const py = y + Math.sin(particleAngle) * particleRadius;
            ctx.fillStyle = `rgba(168, 85, 247, ${0.6 + Math.sin(time * 3 + i) * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, py, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (enemyName.includes('Wolf')) {
        // Wolf - fierce predator
        const wolfDark = this.color;
        const wolfLight = '#' + this.color.slice(1).split('').map(c => Math.min(15, parseInt(c, 16) + 3).toString(16)).join('');
        
        // Body with fur texture
        ctx.fillStyle = wolfDark;
        ctx.fillRect(x - 13, y - 9, 26, 14);
        
        // Fur details (darker stripes)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x - 11, y - 7, 2, 10);
        ctx.fillRect(x - 6, y - 7, 2, 10);
        ctx.fillRect(x + 4, y - 7, 2, 10);
        ctx.fillRect(x + 9, y - 7, 2, 10);
        
        // Head with snout
        ctx.fillStyle = wolfDark;
        ctx.fillRect(x - 16, y - 11, 10, 10);
        // Snout protruding
        ctx.fillRect(x - 19, y - 8, 5, 4);
        
        // Ears (pointed)
        ctx.fillRect(x - 15, y - 14, 3, 4);
        ctx.fillRect(x - 10, y - 14, 3, 4);
        
        // Fierce open mouth
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 18, y - 7, 3, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 18, y - 6, 1, 1);
        ctx.fillRect(x - 16, y - 6, 1, 1);
        
        // Muscular legs
        ctx.fillStyle = wolfDark;
        ctx.fillRect(x - 11, y + 5, 4, 7);
        ctx.fillRect(x - 4, y + 5, 4, 7);
        ctx.fillRect(x + 3, y + 5, 4, 7);
        ctx.fillRect(x + 10, y + 5, 4, 7);
        
        // Paws (darker)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x - 11, y + 11, 4, 2);
        ctx.fillRect(x - 4, y + 11, 4, 2);
        ctx.fillRect(x + 3, y + 11, 4, 2);
        ctx.fillRect(x + 10, y + 11, 4, 2);
        
        // Bushy tail (curved)
        ctx.fillStyle = wolfDark;
        ctx.fillRect(x + 13, y - 7, 3, 3);
        ctx.fillRect(x + 15, y - 9, 3, 3);
        ctx.fillRect(x + 17, y - 10, 3, 3);
        
        // Glowing red eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - 14, y - 10, 3, 3);
        ctx.fillRect(x - 10, y - 10, 3, 3);
    } else if (enemyName.includes('Bandit') || enemyName.includes('Cutthroat')) {
        // Bandit - dangerous rogue
        
        // Tattered cloak with detail
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 11, y - 9, 22, 19);
        
        // Cloak tears and patches
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 9, y - 6, 3, 4);
        ctx.fillRect(x + 6, y - 4, 3, 5);
        ctx.fillRect(x - 2, y + 6, 2, 3);
        
        // Belt with pouches
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - 10, y + 2, 20, 2);
        ctx.fillRect(x - 8, y + 3, 3, 4);
        ctx.fillRect(x + 5, y + 3, 3, 4);
        
        // Leather armor underneath
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(x - 7, y - 6, 14, 8);
        
        // Hood (deep and menacing)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 10, y - 20, 20, 14);
        
        // Face partially hidden
        ctx.fillStyle = '#fdbcb4';
        ctx.fillRect(x - 6, y - 15, 12, 7);
        
        // Menacing eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 5, y - 13, 2, 2);
        ctx.fillRect(x + 3, y - 13, 2, 2);
        
        // Face mask/bandana
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x - 6, y - 10, 12, 3);
        
        // Wicked curved dagger
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x + 11, y - 6, 2, 10);
        ctx.fillRect(x + 12, y - 8, 3, 3);
        // Blood stain on blade
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(x + 11, y - 4, 2, 2);
        
        // Dagger handle (wrapped grip)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 9, y - 1, 6, 3);
    } else if (enemyName.includes('Boar')) {
        // Boar - aggressive beast
        
        // Massive bristly body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 15, y - 11, 30, 18);
        
        // Bristle texture (spiky fur)
        ctx.fillStyle = '#2a2020';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(x - 13 + i * 3, y - 13, 2, 3);
        }
        
        // Muscular shoulders
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 16, y - 9, 6, 10);
        ctx.fillRect(x + 10, y - 9, 6, 10);
        
        // Large head
        ctx.fillRect(x - 18, y - 9, 12, 13);
        
        // Snout
        ctx.fillStyle = '#6a5040';
        ctx.fillRect(x - 21, y - 6, 5, 6);
        
        // Nostrils
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 20, y - 5, 1, 2);
        ctx.fillRect(x - 18, y - 5, 1, 2);
        
        // Fierce tusks (curved)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 19, y - 3, 2, 5);
        ctx.fillRect(x - 20, y - 2, 1, 3);
        ctx.fillRect(x - 17, y - 3, 2, 5);
        ctx.fillRect(x - 16, y - 2, 1, 3);
        
        // Angry red eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - 15, y - 7, 2, 2);
        ctx.fillRect(x - 12, y - 7, 2, 2);
        
        // Thick legs
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 13, y + 7, 5, 5);
        ctx.fillRect(x - 4, y + 7, 5, 5);
        ctx.fillRect(x + 4, y + 7, 5, 5);
        ctx.fillRect(x + 11, y + 7, 5, 5);
        
        // Hooves
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 13, y + 11, 5, 2);
        ctx.fillRect(x - 4, y + 11, 5, 2);
        ctx.fillRect(x + 4, y + 11, 5, 2);
        ctx.fillRect(x + 11, y + 11, 5, 2);
    } else if (enemyName.includes('Stag')) {
        // Stag - majestic forest guardian
        
        // Sleek body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 11, y - 9, 22, 13);
        
        // Fur patterns (lighter spots)
        const lightColor = '#a0826d';
        ctx.fillStyle = lightColor;
        ctx.fillRect(x - 8, y - 7, 3, 3);
        ctx.fillRect(x - 3, y - 6, 3, 3);
        ctx.fillRect(x + 3, y - 7, 3, 3);
        
        // Graceful neck
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 14, y - 15, 6, 8);
        
        // Noble head
        ctx.fillRect(x - 16, y - 18, 8, 6);
        
        // Ears
        ctx.fillRect(x - 15, y - 21, 2, 3);
        ctx.fillRect(x - 11, y - 21, 2, 3);
        
        // Magnificent antlers (branching)
        ctx.fillStyle = '#8b7355';
        // Main beams
        ctx.fillRect(x - 17, y - 24, 2, 6);
        ctx.fillRect(x - 9, y - 24, 2, 6);
        // Points/tines
        ctx.fillRect(x - 19, y - 26, 2, 4);
        ctx.fillRect(x - 17, y - 28, 2, 5);
        ctx.fillRect(x - 15, y - 27, 2, 4);
        ctx.fillRect(x - 11, y - 27, 2, 4);
        ctx.fillRect(x - 9, y - 28, 2, 5);
        ctx.fillRect(x - 7, y - 26, 2, 4);
        
        // Gentle eyes
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(x - 14, y - 16, 2, 2);
        ctx.fillRect(x - 11, y - 16, 2, 2);
        
        // Snout
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(x - 17, y - 14, 3, 2);
        
        // Slender legs
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 9, y + 4, 2, 9);
        ctx.fillRect(x - 5, y + 4, 2, 9);
        ctx.fillRect(x + 3, y + 4, 2, 9);
        ctx.fillRect(x + 7, y + 4, 2, 9);
        
        // Hooves (dark)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x - 9, y + 12, 2, 2);
        ctx.fillRect(x - 5, y + 12, 2, 2);
        ctx.fillRect(x + 3, y + 12, 2, 2);
        ctx.fillRect(x + 7, y + 12, 2, 2);
    } else if (enemyName.includes('Treant')) {
        // Treant trunk (thick)
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 12, y - 10, 24, 20);
        // Branches
        ctx.fillRect(x - 18, y - 14, 6, 4);
        ctx.fillRect(x + 12, y - 14, 6, 4);
        ctx.fillRect(x - 16, y - 8, 4, 3);
        ctx.fillRect(x + 12, y - 8, 4, 3);
        // Root legs
        ctx.fillRect(x - 10, y + 10, 6, 4);
        ctx.fillRect(x + 4, y + 10, 6, 4);
        // Eyes
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x - 6, y - 6, 3, 3);
        ctx.fillRect(x + 3, y - 6, 3, 3);
    } else if (enemyName.includes('Spider')) {
        // Spider body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        // Abdomen
        ctx.beginPath();
        ctx.arc(x, y + 6, 6, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) * i - Math.PI/2;
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x - 6 - Math.cos(angle) * 10, y + Math.sin(angle) * 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 6, y);
            ctx.lineTo(x + 6 + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
            ctx.stroke();
        }
    } else if (enemyName.includes('Scout')) {
        // Scout body (light armor)
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 8, y - 8, 16, 16);
        // Head
        ctx.fillStyle = '#fdbcb4';
        ctx.fillRect(x - 6, y - 16, 12, 8);
        // Helmet
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x - 7, y - 18, 14, 4);
        // Bow
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x - 12, y, 8, -Math.PI/3, Math.PI/3, false);
        ctx.stroke();
        // Arrow
        ctx.strokeStyle = '#8b7355';
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x - 8, y);
        ctx.stroke();
    } else if (enemyName.includes('Wisp')) {
        // Wisp glowing orb
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
        gradient.addColorStop(0, this.color + 'ff');
        gradient.addColorStop(0.5, this.color + '80');
        gradient.addColorStop(1, this.color + '20');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        // Inner core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Floating particles
        for (let i = 0; i < 3; i++) {
            const px = x + Math.cos(this.animTimer + i * 2) * 15;
            const py = y + Math.sin(this.animTimer + i * 2) * 15;
            ctx.fillStyle = this.color + '60';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (enemyName.includes('Golem')) {
        // Enhanced Stone Golem - ancient construct with detail
        const stoneColor = this.color;
        const stoneDark = '#2a2a2a';
        const stoneLight = '#6a6a6a';
        
        // Massive stone body with segments
        ctx.fillStyle = stoneColor;
        ctx.fillRect(x - 15, y - 11, 30, 22);
        
        // Stone texture - cracks and segments
        ctx.fillStyle = stoneDark;
        ctx.fillRect(x - 13, y - 9, 26, 2);
        ctx.fillRect(x - 13, y - 2, 26, 2);
        ctx.fillRect(x - 13, y + 5, 26, 2);
        ctx.fillRect(x - 2, y - 10, 2, 20);
        
        // Stone highlights
        ctx.fillStyle = stoneLight;
        ctx.fillRect(x - 14, y - 10, 2, 20);
        ctx.fillRect(x + 12, y - 10, 2, 20);
        ctx.fillRect(x - 12, y - 8, 24, 1);
        
        // Boulder-like head
        ctx.fillStyle = stoneColor;
        ctx.fillRect(x - 9, y - 20, 18, 10);
        
        // Head segments
        ctx.fillStyle = stoneDark;
        ctx.fillRect(x - 8, y - 19, 16, 1);
        ctx.fillRect(x - 8, y - 14, 16, 1);
        ctx.fillRect(x - 1, y - 19, 1, 9);
        
        // Massive stone arms
        ctx.fillStyle = stoneColor;
        ctx.fillRect(x - 22, y - 9, 8, 16);
        ctx.fillRect(x + 14, y - 9, 8, 16);
        
        // Arm joints/segments
        ctx.fillStyle = stoneDark;
        ctx.fillRect(x - 21, y - 4, 6, 2);
        ctx.fillRect(x + 15, y - 4, 6, 2);
        
        // Fists (larger)
        ctx.fillRect(x - 22, y + 6, 8, 5);
        ctx.fillRect(x + 14, y + 6, 8, 5);
        
        // Thick stone legs
        ctx.fillStyle = stoneColor;
        ctx.fillRect(x - 11, y + 11, 9, 7);
        ctx.fillRect(x + 2, y + 11, 9, 7);
        
        // Leg segments
        ctx.fillStyle = stoneDark;
        ctx.fillRect(x - 10, y + 14, 7, 1);
        ctx.fillRect(x + 3, y + 14, 7, 1);
        
        // GLOWING ORANGE CORE EYES
        ctx.fillStyle = '#ff4500';
        ctx.fillRect(x - 6, y - 16, 4, 4);
        ctx.fillRect(x + 2, y - 16, 4, 4);
        
        // Eye glow core (brighter)
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(x - 5, y - 15, 2, 2);
        ctx.fillRect(x + 3, y - 15, 2, 2);
        
        // Ancient runes on chest (dim glow)
        ctx.fillStyle = 'rgba(255, 69, 0, 0.4)';
        ctx.fillRect(x - 4, y - 6, 2, 2);
        ctx.fillRect(x + 2, y - 6, 2, 2);
        ctx.fillRect(x - 1, y - 1, 2, 2);
    } else if (enemyName.includes('Sprite')) {
        // Sprite small floating flame
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(1, this.color + '40');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        // Flame effect
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x, y - 12);
        ctx.lineTo(x + 6, y);
        ctx.arc(x, y, 6, 0, Math.PI, false);
        ctx.fill();
    } else if (enemyName.includes('Rat')) {
        // Enhanced Rat - diseased dungeon pest (static, no animations)
        const ratBrown = this.color;
        const ratDark = '#2a1a1a';
        
        // Hunched body with fur texture
        ctx.fillStyle = ratBrown;
        ctx.fillRect(x - 9, y - 5, 18, 10);
        
        // Fur details (darker patches)
        ctx.fillStyle = ratDark;
        ctx.fillRect(x - 7, y - 4, 2, 8);
        ctx.fillRect(x - 3, y - 3, 2, 7);
        ctx.fillRect(x + 2, y - 4, 2, 8);
        ctx.fillRect(x + 6, y - 3, 2, 7);
        
        // Head with detail
        ctx.fillStyle = ratBrown;
        ctx.fillRect(x - 11, y - 5, 7, 8);
        
        // Pointed snout
        ctx.fillRect(x - 13, y - 3, 3, 4);
        
        // Whiskers (static lines)
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x - 13, y - 2);
        ctx.lineTo(x - 16, y - 3);
        ctx.moveTo(x - 13, y);
        ctx.lineTo(x - 16, y);
        ctx.moveTo(x - 13, y + 1);
        ctx.lineTo(x - 16, y + 2);
        ctx.stroke();
        
        // Large round ears
        ctx.fillStyle = '#8b6f5f';
        ctx.beginPath();
        ctx.arc(x - 9, y - 7, 3, 0, Math.PI * 2);
        ctx.arc(x - 5, y - 7, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner ear detail
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(x - 9, y - 7, 1.5, 0, Math.PI * 2);
        ctx.arc(x - 5, y - 7, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Menacing red eyes (static glow)
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(x - 10, y - 3, 2, 2);
        ctx.fillRect(x - 6, y - 3, 2, 2);
        
        // Long curved tail with segmented texture
        ctx.strokeStyle = ratBrown;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 1);
        ctx.quadraticCurveTo(x + 14, y + 3, x + 18, y - 1);
        ctx.stroke();
        
        // Tail segments (static stripes)
        ctx.strokeStyle = ratDark;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 10, y);
        ctx.lineTo(x + 10, y + 2);
        ctx.moveTo(x + 12, y + 1);
        ctx.lineTo(x + 12, y + 3);
        ctx.moveTo(x + 14, y + 1);
        ctx.lineTo(x + 14, y + 3);
        ctx.moveTo(x + 16, y);
        ctx.lineTo(x + 16, y + 2);
        ctx.stroke();
        
        // Clawed feet
        ctx.fillStyle = ratDark;
        ctx.fillRect(x - 7, y + 5, 3, 2);
        ctx.fillRect(x - 2, y + 5, 3, 2);
        ctx.fillRect(x + 3, y + 5, 3, 2);
        ctx.fillRect(x + 7, y + 5, 3, 2);
    } else if (enemyName.includes('Brute')) {
        // Brute body (muscular)
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 16, y - 10, 32, 20);
        // Head (small)
        ctx.fillRect(x - 6, y - 16, 12, 6);
        // Arms (thick)
        ctx.fillRect(x - 22, y - 8, 8, 16);
        ctx.fillRect(x + 14, y - 8, 8, 16);
        // Legs
        ctx.fillRect(x - 12, y + 10, 10, 6);
        ctx.fillRect(x + 2, y + 10, 10, 6);
    } else if (enemyName.includes('Guard')) {
        // Guard body (heavy armor)
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 12, y - 10, 24, 20);
        // Helmet
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x - 8, y - 18, 16, 10);
        // Shield
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(x - 18, y - 8, 6, 14);
        // Hammer
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x + 12, y - 12, 4, 16);
        ctx.fillRect(x + 10, y - 14, 8, 4);
    } else if (enemyName.includes('Imp')) {
        // Imp body (small)
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 6, y - 4, 12, 10);
        // Head with horns
        ctx.fillRect(x - 5, y - 10, 10, 6);
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(x - 6, y - 12, 2, 3);
        ctx.fillRect(x + 4, y - 12, 2, 3);
        // Wings
        ctx.fillStyle = this.color + '80';
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 4);
        ctx.lineTo(x - 12, y - 8);
        ctx.lineTo(x - 10, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 6, y - 4);
        ctx.lineTo(x + 12, y - 8);
        ctx.lineTo(x + 10, y + 2);
        ctx.closePath();
        ctx.fill();
        // Tail
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.quadraticCurveTo(x + 4, y + 10, x + 8, y + 8);
        ctx.stroke();
    } else if (enemyName.includes('Beetle')) {
        // Beetle shell
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillRect(x - 6, y - 10, 12, 6);
        // Horn
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x - 2, y - 12, 4, 3);
        // Legs
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 8, y + i * 4);
            ctx.lineTo(x - 12, y + i * 4 + 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 8, y + i * 4);
            ctx.lineTo(x + 12, y + i * 4 + 2);
            ctx.stroke();
        }
    } else if (enemyName.includes('Slime')) {
        // Enhanced Slime - gelatinous blob with depth
        const slimeAlpha = 0.85;
        
        // Shadow puddle beneath
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bottom blob (darker, more opaque)
        ctx.fillStyle = this.color + 'dd';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 13, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Middle blob
        ctx.fillStyle = this.color + 'cc';
        ctx.beginPath();
        ctx.ellipse(x, y, 11, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Top blob (more transparent)
        ctx.fillStyle = this.color + 'bb';
        ctx.beginPath();
        ctx.ellipse(x, y - 4, 9, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Multiple glossy highlights for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x - 4, y - 7, 5, 4, -Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 3, y - 5, 3, 2, Math.PI/6, 0, Math.PI * 2);
        ctx.fill();
        
        // Smaller shine spots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(x - 5, y - 6, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Internal bubbles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(x + 2, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 3, y + 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4, y + 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple dot eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x - 4, y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4, y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - 3.5, y - 1.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4.5, y - 1.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyName.includes('Shade')) {
        // Enhanced Shade - ethereal specter with layers
        const shadeAlpha = 0.7 + Math.sin(this.animTimer * 0.5) * 0.2;
        
        // Outer ethereal aura (pulsing)
        ctx.fillStyle = this.color + '30';
        ctx.beginPath();
        ctx.moveTo(x - 14, y + 12);
        ctx.lineTo(x - 10, y - 12);
        ctx.lineTo(x + 10, y - 12);
        ctx.lineTo(x + 14, y + 12);
        ctx.quadraticCurveTo(x + 7, y + 10, x, y + 13);
        ctx.quadraticCurveTo(x - 7, y + 10, x - 14, y + 12);
        ctx.fill();
        
        // Main ghostly body (flowing robes)
        ctx.fillStyle = this.color + Math.floor(shadeAlpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.moveTo(x - 11, y + 11);
        ctx.lineTo(x - 9, y - 11);
        ctx.lineTo(x + 9, y - 11);
        ctx.lineTo(x + 11, y + 11);
        // Wispy bottom
        ctx.quadraticCurveTo(x + 6, y + 9, x + 3, y + 12);
        ctx.quadraticCurveTo(x, y + 11, x - 3, y + 12);
        ctx.quadraticCurveTo(x - 6, y + 9, x - 11, y + 11);
        ctx.fill();
        
        // Inner darker core
        ctx.fillStyle = this.color + '90';
        ctx.fillRect(x - 6, y - 6, 12, 10);
        
        // Hood/cowl
        ctx.fillStyle = this.color + 'aa';
        ctx.fillRect(x - 8, y - 15, 16, 5);
        
        // Spectral tendrils floating around
        const shadeTime = Date.now() / 800;
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i / 3) + shadeTime;
            const radius = 12 + Math.sin(shadeTime * 2 + i) * 3;
            const tx = x + Math.cos(angle) * radius;
            const ty = y + Math.sin(angle) * radius * 0.6;
            
            ctx.fillStyle = this.color + '40';
            ctx.beginPath();
            ctx.arc(tx, ty, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // PIERCING PURPLE EYES (more intense)
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(x - 6, y - 5, 4, 4);
        ctx.fillRect(x + 2, y - 5, 4, 4);
        
        // Eye cores (brighter center)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 5, y - 4, 2, 2);
        ctx.fillRect(x + 3, y - 4, 2, 2);
        
        // Faint ethereal glow around entire shade
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        glowGradient.addColorStop(0, this.color + '00');
        glowGradient.addColorStop(1, this.color + '20');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyName.includes('Gloomling')) {
        // Enhanced Gloomling - writhing shadow creature
        const pulseSize = 10 + Math.sin(this.animTimer * 0.8) * 2;
        
        // Dark aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 18);
        auraGradient.addColorStop(0, this.color + '60');
        auraGradient.addColorStop(1, this.color + '00');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body (pulsing)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner darker core
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(x, y, pulseSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Animated writhing tendrils (6 instead of 4)
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i / 6) + this.animTimer * 0.15;
            const wave = Math.sin(this.animTimer * 0.3 + i) * 3;
            const length = 18 + Math.sin(this.animTimer * 0.4 + i * 0.5) * 5;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + Math.cos(angle) * (length * 0.6) + wave,
                y + Math.sin(angle) * (length * 0.4) + wave * 0.5,
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length * 0.7
            );
            ctx.stroke();
            
            // Tendril tips (smaller blobs)
            ctx.fillStyle = this.color + 'aa';
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length * 0.7,
                2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Sinister glowing eyes
        ctx.fillStyle = '#8b00ff';
        ctx.shadowColor = '#8b00ff';
        ctx.fillRect(x - 4, y - 2, 2, 3);
        ctx.fillRect(x + 2, y - 2, 2, 3);
    } else if (enemyName.includes('Stalker')) {
        // Night Stalker predator
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 10, y - 6, 20, 12);
        // Head with sharp features
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 4);
        ctx.lineTo(x - 8, y - 8);
        ctx.lineTo(x - 4, y - 6);
        ctx.closePath();
        ctx.fill();
        // Claws
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 12, y + 4, 2, 4);
        ctx.fillRect(x - 9, y + 4, 2, 4);
        ctx.fillRect(x + 8, y + 4, 2, 4);
        ctx.fillRect(x + 11, y + 4, 2, 4);
        // Eyes
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(x - 10, y - 6, 2, 2);
        ctx.fillRect(x - 6, y - 6, 2, 2);
    } else if (enemyName.includes('Mite')) {
        // Void Mite tiny creature
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        // Legs (tiny)
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8);
            ctx.stroke();
        }
    } else if (enemyName.includes('Leech')) {
        // Abyssal Leech segmented
        ctx.fillStyle = this.color;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x - i * 6, y + i * 2, 6 - i, 0, Math.PI * 2);
            ctx.fill();
        }
        // Mouth
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.arc(x + 4, y, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyName.includes('Bat')) {
        // Dread Bat wings spread
        ctx.fillStyle = this.color;
        // Body
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x - 16, y - 4);
        ctx.lineTo(x - 14, y + 4);
        ctx.lineTo(x - 10, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + 16, y - 4);
        ctx.lineTo(x + 14, y + 4);
        ctx.lineTo(x + 10, y + 2);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - 3, y - 2, 2, 2);
        ctx.fillRect(x + 1, y - 2, 2, 2);
    } else if (enemyName.includes('Cultist')) {
        // Hollow Cultist robed
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 10);
        ctx.lineTo(x - 8, y - 8);
        ctx.lineTo(x + 8, y - 8);
        ctx.lineTo(x + 12, y + 10);
        ctx.closePath();
        ctx.fill();
        // Hood
        ctx.fillStyle = '#2a1a3a';
        ctx.beginPath();
        ctx.arc(x, y - 10, 10, Math.PI, 0, true);
        ctx.fill();
        // Glowing eyes
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.fillRect(x - 4, y - 8, 2, 2);
        ctx.fillRect(x + 2, y - 8, 2, 2);
        // Staff
        ctx.strokeStyle = '#8b7bc8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 12);
        ctx.lineTo(x + 10, y + 8);
        ctx.stroke();
        // Orb on staff
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(x + 10, y - 14, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyName.includes('Colossus')) {
        // TITAN COLOSSUS - Massive stone giant
        const scale = 0.95;
        
        // Ground pound aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 40 * scale);
        auraGradient.addColorStop(0, 'rgba(74, 85, 104, 0.3)');
        auraGradient.addColorStop(1, 'rgba(74, 85, 104, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 40 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Massive rocky body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 32 * scale, y - 20 * scale, 64 * scale, 42 * scale);
        
        // Rock texture
        ctx.fillStyle = '#3a4150';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect((x - 28 * scale) + (i * 7 * scale), y - 16 * scale, 5 * scale, 8 * scale);
            ctx.fillRect((x - 28 * scale) + (i * 7 * scale), y + 2 * scale, 5 * scale, 8 * scale);
        }
        
        // Massive shoulders
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 44 * scale, y - 18 * scale, 16 * scale, 24 * scale);
        ctx.fillRect(x + 28 * scale, y - 18 * scale, 16 * scale, 24 * scale);
        
        // Head with cracks
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x - 18 * scale, y - 38 * scale, 36 * scale, 20 * scale);
        
        // Glowing cracks in head
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(x - 12 * scale, y - 28 * scale);
        ctx.lineTo(x - 6 * scale, y - 22 * scale);
        ctx.moveTo(x + 6 * scale, y - 30 * scale);
        ctx.lineTo(x + 10 * scale, y - 24 * scale);
        ctx.stroke();
        
        // Glowing eyes
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.fillRect(x - 12 * scale, y - 28 * scale, 6 * scale, 6 * scale);
        ctx.fillRect(x + 6 * scale, y - 28 * scale, 6 * scale, 6 * scale);
        
        // Massive fists
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 50 * scale, y + 2 * scale, 12 * scale, 16 * scale);
        
        // MASSIVE WAR HAMMER - right hand
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x + 42 * scale, y - 30 * scale, 6 * scale, 50 * scale);
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x + 36 * scale, y - 36 * scale, 18 * scale, 12 * scale);
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x + 38 * scale, y - 34 * scale, 14 * scale, 8 * scale);
        // Hammer spikes
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(x + 33 * scale, y - 32 * scale, 5 * scale, 6 * scale);
        ctx.fillRect(x + 52 * scale, y - 32 * scale, 5 * scale, 6 * scale);
        ctx.fillRect(x + 42 * scale, y - 40 * scale, 6 * scale, 5 * scale);
    } else if (enemyName.includes('Behemoth')) {
        // INFERNAL BEHEMOTH - Burning demon lord
        const scale = 0.9;
        
        // Infernal aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 45 * scale);
        auraGradient.addColorStop(0, 'rgba(220, 38, 38, 0.4)');
        auraGradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 45 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Muscular demonic body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 30 * scale, y - 18 * scale, 60 * scale, 38 * scale);
        
        // Flame patterns
        ctx.fillStyle = '#ff4500';
        for (let i = 0; i < 6; i++) {
            const flameX = (x - 24 * scale) + (i * 8 * scale);
            ctx.beginPath();
            ctx.moveTo(flameX, y - 12 * scale);
            ctx.lineTo(flameX + 4 * scale, y - 18 * scale);
            ctx.lineTo(flameX + 8 * scale, y - 12 * scale);
            ctx.fill();
        }
        
        // Massive horned head
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(x - 20 * scale, y - 36 * scale, 40 * scale, 20 * scale);
        
        // Curved horns
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(x - 18 * scale, y - 34 * scale);
        ctx.quadraticCurveTo(x - 26 * scale, y - 44 * scale, x - 22 * scale, y - 48 * scale);
        ctx.moveTo(x + 18 * scale, y - 34 * scale);
        ctx.quadraticCurveTo(x + 26 * scale, y - 44 * scale, x + 22 * scale, y - 48 * scale);
        ctx.stroke();
        
        // Burning eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#ff4500';
        ctx.fillRect(x - 12 * scale, y - 28 * scale, 6 * scale, 8 * scale);
        ctx.fillRect(x + 6 * scale, y - 28 * scale, 6 * scale, 8 * scale);
        
        // Clawed hands
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 42 * scale, y - 8 * scale, 14 * scale, 20 * scale);
        
        // FLAMING GREATSWORD - right hand
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x + 32 * scale, y - 40 * scale, 8 * scale, 60 * scale);
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x + 33 * scale, y - 38 * scale, 6 * scale, 55 * scale);
        // Crossguard
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x + 24 * scale, y - 10 * scale, 24 * scale, 4 * scale);
        // Flame effect on blade
        ctx.shadowColor = '#ff4500';
        ctx.fillStyle = 'rgba(255, 69, 0, 0.6)';
        ctx.fillRect(x + 34 * scale, y - 36 * scale, 4 * scale, 50 * scale);
        
        // Left clawed hand
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 28 * scale, y - 8 * scale, 14 * scale, 20 * scale);
        
        // Claws
        ctx.fillStyle = '#1a1a1a';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect((x - 40 * scale) + (i * 4 * scale), y + 10 * scale, 2 * scale, 6 * scale);
            ctx.fillRect((x + 30 * scale) + (i * 4 * scale), y + 10 * scale, 2 * scale, 6 * scale);
        }
    } else if (enemyName.includes('Leviathan')) {
        // FROST LEVIATHAN - Ice dragon-like beast
        const scale = 0.95;
        
        // Frost aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 48 * scale);
        auraGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        auraGradient.addColorStop(1, 'rgba(147, 197, 253, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 48 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Serpentine body with ice crystals
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 34 * scale, y - 16 * scale, 68 * scale, 36 * scale);
        
        // Ice crystal spikes along back
        ctx.fillStyle = '#bfdbfe';
        for (let i = 0; i < 7; i++) {
            const spikeX = (x - 30 * scale) + (i * 10 * scale);
            ctx.beginPath();
            ctx.moveTo(spikeX, y - 16 * scale);
            ctx.lineTo(spikeX + 4 * scale, y - 26 * scale);
            ctx.lineTo(spikeX + 8 * scale, y - 16 * scale);
            ctx.closePath();
            ctx.fill();
        }
        
        // Dragon-like head
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 22 * scale, y - 40 * scale, 44 * scale, 26 * scale);
        
        // Snout
        ctx.fillRect(x - 16 * scale, y - 46 * scale, 32 * scale, 8 * scale);
        
        // Ice horns
        ctx.fillStyle = '#dbeafe';
        ctx.beginPath();
        ctx.moveTo(x - 20 * scale, y - 38 * scale);
        ctx.lineTo(x - 24 * scale, y - 50 * scale);
        ctx.lineTo(x - 16 * scale, y - 40 * scale);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 20 * scale, y - 38 * scale);
        ctx.lineTo(x + 24 * scale, y - 50 * scale);
        ctx.lineTo(x + 16 * scale, y - 40 * scale);
        ctx.fill();
        
        // Glowing ice eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#60a5fa';
        ctx.fillRect(x - 14 * scale, y - 32 * scale, 7 * scale, 7 * scale);
        ctx.fillRect(x + 7 * scale, y - 32 * scale, 7 * scale, 7 * scale);
        
        // Massive clawed limbs
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 46 * scale, y - 6 * scale, 16 * scale, 22 * scale);
        ctx.fillRect(x + 30 * scale, y - 6 * scale, 16 * scale, 22 * scale);
    } else if (enemyName.includes('Juggernaut')) {
        // CHAOS JUGGERNAUT - Void-touched warrior
        const scale = 0.925;
        
        // Chaos aura with swirling effect
        const time = Date.now() / 600;
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 42 * scale);
        auraGradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        auraGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
        auraGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 42 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Chaos tendrils
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i / 4) + time;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * 35 * scale, y + Math.sin(angle) * 35 * scale);
            ctx.stroke();
        }
        
        // Armored body with chaos energy
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 28 * scale, y - 20 * scale, 56 * scale, 40 * scale);
        
        // Energy lines
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 24 * scale, (y - 16 * scale) + (i * 7 * scale));
            ctx.lineTo(x + 24 * scale, (y - 16 * scale) + (i * 7 * scale));
            ctx.stroke();
        }
        
        // Helmet with void energy
        ctx.fillStyle = '#581c87';
        ctx.fillRect(x - 20 * scale, y - 38 * scale, 40 * scale, 20 * scale);
        
        // Void eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#a855f7';
        ctx.fillRect(x - 14 * scale, y - 30 * scale, 8 * scale, 8 * scale);
        ctx.fillRect(x + 6 * scale, y - 30 * scale, 8 * scale, 8 * scale);
        
        // Chaos blades in hands
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(x - 48 * scale, y - 24 * scale, 8 * scale, 36 * scale);
        ctx.fillRect(x + 40 * scale, y - 24 * scale, 8 * scale, 36 * scale);
    } else if (enemyName.includes('Dreadnought')) {
        // VOID DREADNOUGHT - Dark matter tank
        const scale = 1.0;
        
        // Void aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 50 * scale);
        auraGradient.addColorStop(0, 'rgba(30, 27, 75, 0.5)');
        auraGradient.addColorStop(1, 'rgba(30, 27, 75, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 50 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Void particles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i / 8) + Date.now() / 800;
            const radius = 30 * scale;
            ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
            ctx.beginPath();
            ctx.arc(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ultra-heavy armor
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 36 * scale, y - 22 * scale, 72 * scale, 44 * scale);
        
        // Armor plating
        ctx.fillStyle = '#0f0a2e';
        ctx.fillRect(x - 32 * scale, y - 18 * scale, 64 * scale, 8 * scale);
        ctx.fillRect(x - 32 * scale, y - 2 * scale, 64 * scale, 8 * scale);
        ctx.fillRect(x - 32 * scale, y + 14 * scale, 64 * scale, 8 * scale);
        
        // Massive pauldrons
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 50 * scale, y - 20 * scale, 18 * scale, 28 * scale);
        ctx.fillRect(x + 32 * scale, y - 20 * scale, 18 * scale, 28 * scale);
        
        // Void core on chest
        const voidPulse = 0.5 + Math.sin(Date.now() / 400) * 0.5;
        ctx.fillStyle = `rgba(139, 92, 246, ${voidPulse})`;
        ctx.shadowColor = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Helmet
        ctx.fillStyle = '#0a0825';
        ctx.fillRect(x - 22 * scale, y - 42 * scale, 44 * scale, 22 * scale);
        
        // Glowing void eyes
        ctx.fillStyle = '#8b5cf6';
        ctx.shadowColor = '#8b5cf6';
        ctx.fillRect(x - 14 * scale, y - 34 * scale, 8 * scale, 8 * scale);
        ctx.fillRect(x + 6 * scale, y - 34 * scale, 8 * scale, 8 * scale);
    } else if (enemyName.includes('Ravager')) {
        // STORM RAVAGER - Lightning-charged berserker
        const scale = 0.875;
        
        // Storm aura with lightning
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 40 * scale);
        auraGradient.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
        auraGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 40 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Lightning bolts
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 2 * scale;
        ctx.shadowColor = '#fbbf24';
        for (let i = 0; i < 3; i++) {
            const startX = x + (i - 1) * 20 * scale;
            ctx.beginPath();
            ctx.moveTo(startX, y - 40 * scale);
            ctx.lineTo(startX + 5 * scale, y - 25 * scale);
            ctx.lineTo(startX - 3 * scale, y - 20 * scale);
            ctx.lineTo(startX + 4 * scale, y);
            ctx.stroke();
        }
        
        // Battle-scarred body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 26 * scale, y - 16 * scale, 52 * scale, 34 * scale);
        
        // Scars (dark lines)
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(x - 20 * scale, y - 10 * scale);
        ctx.lineTo(x + 18 * scale, y + 8 * scale);
        ctx.moveTo(x - 14 * scale, y);
        ctx.lineTo(x + 10 * scale, y);
        ctx.stroke();
        
        // Wild hair/mane
        ctx.fillStyle = '#f59e0b';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo((x - 18 * scale) + (i * 9 * scale), y - 26 * scale);
            ctx.lineTo((x - 14 * scale) + (i * 9 * scale), y - 38 * scale);
            ctx.lineTo((x - 10 * scale) + (i * 9 * scale), y - 26 * scale);
            ctx.fill();
        }
        
        // Fierce face
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x - 16 * scale, y - 28 * scale, 32 * scale, 14 * scale);
        
        // Glowing yellow eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fbbf24';
        ctx.fillRect(x - 10 * scale, y - 24 * scale, 6 * scale, 6 * scale);
        ctx.fillRect(x + 4 * scale, y - 24 * scale, 6 * scale, 6 * scale);
        
        // Thunder axes
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - 44 * scale, y - 20 * scale, 6 * scale, 28 * scale);
        ctx.fillRect(x + 38 * scale, y - 20 * scale, 6 * scale, 28 * scale);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x - 48 * scale, y - 24 * scale, 14 * scale, 6 * scale);
        ctx.fillRect(x + 34 * scale, y - 24 * scale, 14 * scale, 6 * scale);
    } else if (enemyName.includes('Abomination')) {
        // PLAGUE ABOMINATION - Toxic undead horror
        const scale = 0.95;
        
        // Toxic aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 45 * scale);
        auraGradient.addColorStop(0, 'rgba(22, 163, 74, 0.4)');
        auraGradient.addColorStop(1, 'rgba(22, 163, 74, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 45 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Plague clouds
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i / 5) + Date.now() / 1000;
            const radius = 25 * scale + Math.sin(Date.now() / 500 + i) * 5 * scale;
            ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
            ctx.beginPath();
            ctx.arc(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 4 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Grotesque bloated body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 32 * scale, y - 18 * scale, 64 * scale, 38 * scale);
        
        // Pustules and sores
        ctx.fillStyle = '#84cc16';
        for (let i = 0; i < 12; i++) {
            const pX = (x - 28 * scale) + Math.random() * 56 * scale;
            const pY = (y - 14 * scale) + Math.random() * 30 * scale;
            ctx.beginPath();
            ctx.arc(pX, pY, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Deformed head
        ctx.fillStyle = '#166534';
        ctx.fillRect(x - 20 * scale, y - 36 * scale, 40 * scale, 20 * scale);
        
        // Exposed bone/teeth
        ctx.fillStyle = '#fef3c7';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect((x - 16 * scale) + (i * 4 * scale), y - 20 * scale, 2 * scale, 4 * scale);
        }
        
        // Sickly glowing eyes
        ctx.fillStyle = '#84cc16';
        ctx.shadowColor = '#22c55e';
        ctx.fillRect(x - 12 * scale, y - 30 * scale, 6 * scale, 6 * scale);
        ctx.fillRect(x + 6 * scale, y - 30 * scale, 6 * scale, 6 * scale);
        
        // Grotesque limbs
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 44 * scale, y - 8 * scale, 14 * scale, 24 * scale);
        ctx.fillRect(x + 30 * scale, y - 8 * scale, 14 * scale, 24 * scale);
    } else if (enemyName.includes('Tyrant')) {
        // CRIMSON TYRANT - Blood-soaked warlord
        const scale = 0.9;
        
        // Blood aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 42 * scale);
        auraGradient.addColorStop(0, 'rgba(153, 27, 27, 0.4)');
        auraGradient.addColorStop(1, 'rgba(153, 27, 27, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 42 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Blood droplets
        for (let i = 0; i < 6; i++) {
            const dropX = x + (Math.random() - 0.5) * 50 * scale;
            const dropY = y + (Math.random() - 0.5) * 40 * scale;
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(dropX, dropY, 1.5 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Blood-stained armor
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 28 * scale, y - 18 * scale, 56 * scale, 38 * scale);
        
        // Blood splatters
        ctx.fillStyle = '#7f1d1d';
        for (let i = 0; i < 10; i++) {
            const sX = (x - 24 * scale) + Math.random() * 48 * scale;
            const sY = (y - 14 * scale) + Math.random() * 30 * scale;
            ctx.fillRect(sX, sY, 3 * scale, 3 * scale);
        }
        
        // Crown of thorns
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(x - 22 * scale, y - 40 * scale, 44 * scale, 8 * scale);
        for (let i = 0; i < 7; i++) {
            ctx.fillRect((x - 18 * scale) + (i * 6 * scale), y - 46 * scale, 2 * scale, 6 * scale);
        }
        
        // Helmeted face
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 18 * scale, y - 34 * scale, 36 * scale, 16 * scale);
        
        // Burning red eyes
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#dc2626';
        ctx.fillRect(x - 12 * scale, y - 28 * scale, 7 * scale, 7 * scale);
        ctx.fillRect(x + 5 * scale, y - 28 * scale, 7 * scale, 7 * scale);
        
        // Blood-dripping greatsword
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x + 36 * scale, y - 40 * scale, 6 * scale, 60 * scale);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(x + 34 * scale, y - 42 * scale, 10 * scale, 10 * scale);
        // Dripping blood
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x + 37 * scale + (i * 2 * scale), y + 18 * scale + (i * 3 * scale), 2 * scale, 4 * scale);
        }
    } else if (enemyName.includes('Devastator')) {
        // ARCANE DEVASTATOR - Magical destroyer
        const scale = 0.85;
        
        // Arcane aura with runes
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 44 * scale);
        auraGradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
        auraGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 44 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Floating arcane runes
        const time = Date.now() / 800;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i / 6) + time;
            const radius = 30 * scale;
            const runeX = x + Math.cos(angle) * radius;
            const runeY = y + Math.sin(angle) * radius;
            
            ctx.fillStyle = '#c084fc';
            ctx.shadowColor = '#8b5cf6';
            ctx.fillRect(runeX - 2 * scale, runeY - 3 * scale, 4 * scale, 6 * scale);
            ctx.fillRect(runeX - 3 * scale, runeY - 2 * scale, 6 * scale, 4 * scale);
        }
        
        // Robed body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x - 30 * scale, y + 20 * scale);
        ctx.lineTo(x - 22 * scale, y - 16 * scale);
        ctx.lineTo(x + 22 * scale, y - 16 * scale);
        ctx.lineTo(x + 30 * scale, y + 20 * scale);
        ctx.closePath();
        ctx.fill();
        
        // Arcane energy lines
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 20 * scale, (y - 12 * scale) + (i * 8 * scale));
            ctx.lineTo(x + 20 * scale, (y - 12 * scale) + (i * 8 * scale));
            ctx.stroke();
        }
        
        // Hooded head
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(x, y - 24 * scale, 18 * scale, Math.PI, 0, true);
        ctx.fill();
        
        // Glowing arcane eyes
        ctx.fillStyle = '#e9d5ff';
        ctx.shadowColor = '#8b5cf6';
        ctx.fillRect(x - 10 * scale, y - 26 * scale, 6 * scale, 8 * scale);
        ctx.fillRect(x + 4 * scale, y - 26 * scale, 6 * scale, 8 * scale);
        
        // Staff with orb
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(x + 30 * scale, y - 30 * scale);
        ctx.lineTo(x + 30 * scale, y + 20 * scale);
        ctx.stroke();
        
        // Pulsing arcane orb
        const orbPulse = 0.6 + Math.sin(Date.now() / 300) * 0.4;
        ctx.fillStyle = `rgba(139, 92, 246, ${orbPulse})`;
        ctx.shadowColor = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(x + 30 * scale, y - 34 * scale, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyName.includes('Overlord')) {
        // SHADOW OVERLORD - Dark entity
        const scale = 0.925;
        
        // Shadow aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 46 * scale);
        auraGradient.addColorStop(0, 'rgba(49, 46, 129, 0.5)');
        auraGradient.addColorStop(1, 'rgba(49, 46, 129, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 46 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Shadowy tendrils
        const shadowTime = Date.now() / 600;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i / 8) + shadowTime;
            const wave = Math.sin(shadowTime * 2 + i) * 8 * scale;
            const length = 32 * scale;
            
            ctx.strokeStyle = 'rgba(67, 56, 202, 0.6)';
            ctx.lineWidth = 3 * scale;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + Math.cos(angle) * (length * 0.6) + wave,
                y + Math.sin(angle) * (length * 0.6) + wave,
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );
            ctx.stroke();
        }
        
        // Dark robed body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x - 32 * scale, y + 22 * scale);
        ctx.lineTo(x - 24 * scale, y - 18 * scale);
        ctx.lineTo(x + 24 * scale, y - 18 * scale);
        ctx.lineTo(x + 32 * scale, y + 22 * scale);
        // Wispy bottom
        ctx.quadraticCurveTo(x + 18 * scale, y + 18 * scale, x + 8 * scale, y + 24 * scale);
        ctx.quadraticCurveTo(x, y + 22 * scale, x - 8 * scale, y + 24 * scale);
        ctx.quadraticCurveTo(x - 18 * scale, y + 18 * scale, x - 32 * scale, y + 22 * scale);
        ctx.fill();
        
        // Crown of shadows
        ctx.fillStyle = '#1e1b4b';
        for (let i = 0; i < 7; i++) {
            ctx.beginPath();
            ctx.moveTo((x - 20 * scale) + (i * 6 * scale), y - 38 * scale);
            ctx.lineTo((x - 17 * scale) + (i * 6 * scale), y - 50 * scale);
            ctx.lineTo((x - 14 * scale) + (i * 6 * scale), y - 38 * scale);
            ctx.fill();
        }
        
        // Hooded face
        ctx.fillStyle = '#0c0a1f';
        ctx.fillRect(x - 20 * scale, y - 40 * scale, 40 * scale, 24 * scale);
        
        // Piercing purple eyes
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#a855f7';
        ctx.fillRect(x - 14 * scale, y - 32 * scale, 8 * scale, 10 * scale);
        ctx.fillRect(x + 6 * scale, y - 32 * scale, 8 * scale, 10 * scale);
        
        // Shadow scythe
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(x - 40 * scale, y + 10 * scale);
        ctx.lineTo(x - 40 * scale, y - 30 * scale);
        ctx.stroke();
        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.arc(x - 40 * scale, y - 34 * scale, 10 * scale, Math.PI / 4, Math.PI, false);
        ctx.fill();
    } else if (enemyName.includes('Destroyer')) {
        // MOLTEN DESTROYER - Lava colossus
        const scale = 0.95;
        
        // Molten aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 48 * scale);
        auraGradient.addColorStop(0, 'rgba(249, 115, 22, 0.5)');
        auraGradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 48 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Heat waves
        for (let i = 0; i < 4; i++) {
            const waveY = y - 30 * scale + (i * 15 * scale);
            ctx.strokeStyle = `rgba(251, 146, 60, ${0.3 - i * 0.05})`;
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(x - 40 * scale, waveY);
            ctx.quadraticCurveTo(x - 20 * scale, waveY - 4 * scale, x, waveY);
            ctx.quadraticCurveTo(x + 20 * scale, waveY + 4 * scale, x + 40 * scale, waveY);
            ctx.stroke();
        }
        
        // Rocky body with lava cracks
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 34 * scale, y - 20 * scale, 68 * scale, 42 * scale);
        
        // Glowing lava cracks
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3 * scale;
        ctx.shadowColor = '#f97316';
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo((x - 30 * scale) + (i * 10 * scale), y - 16 * scale);
            ctx.lineTo((x - 26 * scale) + (i * 10 * scale), y + 16 * scale);
            ctx.stroke();
        }
        
        // Molten shoulders
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(x - 48 * scale, y - 18 * scale, 18 * scale, 26 * scale);
        ctx.fillRect(x + 30 * scale, y - 18 * scale, 18 * scale, 26 * scale);
        
        // Lava drips
        ctx.fillStyle = '#fb923c';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect((x - 42 * scale) + (i * 3 * scale), y + 6 * scale + (i * 2 * scale), 2 * scale, 6 * scale);
            ctx.fillRect((x + 34 * scale) + (i * 3 * scale), y + 6 * scale + (i * 2 * scale), 2 * scale, 6 * scale);
        }
        
        // Head with molten core
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(x - 22 * scale, y - 40 * scale, 44 * scale, 22 * scale);
        
        // Blazing eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#f97316';
        ctx.fillRect(x - 14 * scale, y - 34 * scale, 8 * scale, 8 * scale);
        ctx.fillRect(x + 6 * scale, y - 34 * scale, 8 * scale, 8 * scale);
        
        // Molten core on chest (pulsing)
        const corePulse = 0.7 + Math.sin(Date.now() / 350) * 0.3;
        ctx.fillStyle = `rgba(251, 191, 36, ${corePulse})`;
        ctx.shadowColor = '#f97316';
        ctx.beginPath();
        ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // MASSIVE LAVA HAMMER - right hand
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(x + 38 * scale, y - 32 * scale, 8 * scale, 54 * scale);
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(x + 30 * scale, y - 40 * scale, 24 * scale, 16 * scale);
        // Molten core in hammer
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f97316';
        ctx.fillRect(x + 34 * scale, y - 36 * scale, 16 * scale, 8 * scale);
        // Lava drips from hammer
        ctx.fillStyle = '#fb923c';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect((x + 34 * scale) + (i * 5 * scale), y - 24 * scale + (i * 2 * scale), 2 * scale, 6 * scale);
        }
    } else if (enemyName.includes('Sentinel')) {
        // CRYSTAL SENTINEL - Diamond fortress
        const scale = 1.0;
        
        // Crystal refraction aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 50 * scale);
        auraGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        auraGradient.addColorStop(1, 'rgba(103, 232, 249, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 50 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Floating crystal shards
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i / 8) + Date.now() / 1000;
            const radius = 32 * scale + Math.sin(Date.now() / 500 + i) * 4 * scale;
            const shardX = x + Math.cos(angle) * radius;
            const shardY = y + Math.sin(angle) * radius;
            
            ctx.fillStyle = '#67e8f9';
            ctx.shadowColor = '#06b6d4';
            ctx.beginPath();
            ctx.moveTo(shardX, shardY - 4 * scale);
            ctx.lineTo(shardX + 2 * scale, shardY);
            ctx.lineTo(shardX, shardY + 4 * scale);
            ctx.lineTo(shardX - 2 * scale, shardY);
            ctx.closePath();
            ctx.fill();
        }
        
        // Crystalline body
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 36 * scale, y - 22 * scale, 72 * scale, 44 * scale);
        
        // Crystal facets (lighter)
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(x - 32 * scale, y - 18 * scale, 30 * scale, 18 * scale);
        ctx.fillRect(x + 2 * scale, y - 18 * scale, 30 * scale, 18 * scale);
        ctx.fillRect(x - 32 * scale, y + 4 * scale, 30 * scale, 16 * scale);
        ctx.fillRect(x + 2 * scale, y + 4 * scale, 30 * scale, 16 * scale);
        
        // Crystal highlights
        ctx.fillStyle = '#f0fdfa';
        for (let i = 0; i < 12; i++) {
            const hX = (x - 30 * scale) + (i * 5 * scale);
            const hY = (y - 16 * scale) + ((i % 3) * 12 * scale);
            ctx.fillRect(hX, hY, 2 * scale, 4 * scale);
        }
        
        // Massive crystal pauldrons
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(x - 52 * scale, y - 20 * scale, 20 * scale, 30 * scale);
        ctx.fillRect(x + 32 * scale, y - 20 * scale, 20 * scale, 30 * scale);
        
        // Crystal spikes on shoulders
        ctx.fillStyle = '#67e8f9';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo((x - 46 * scale) + (i * 6 * scale), y - 20 * scale);
            ctx.lineTo((x - 43 * scale) + (i * 6 * scale), y - 32 * scale);
            ctx.lineTo((x - 40 * scale) + (i * 6 * scale), y - 20 * scale);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo((x + 36 * scale) + (i * 6 * scale), y - 20 * scale);
            ctx.lineTo((x + 39 * scale) + (i * 6 * scale), y - 32 * scale);
            ctx.lineTo((x + 42 * scale) + (i * 6 * scale), y - 20 * scale);
            ctx.fill();
        }
        
        // Crystal helmet
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(x - 24 * scale, y - 44 * scale, 48 * scale, 24 * scale);
        
        // Glowing crystal eyes
        ctx.fillStyle = '#f0fdfa';
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(x - 16 * scale, y - 36 * scale, 8 * scale, 10 * scale);
        ctx.fillRect(x + 8 * scale, y - 36 * scale, 8 * scale, 10 * scale);
        
        // Crystal core on chest (bright pulsing)
        const crystalPulse = 0.8 + Math.sin(Date.now() / 400) * 0.2;
        ctx.fillStyle = `rgba(103, 232, 249, ${crystalPulse})`;
        ctx.shadowColor = '#06b6d4';
        ctx.beginPath();
        ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - 2 * scale, y - 2 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // CRYSTAL SWORD - right hand
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(x + 40 * scale, y - 38 * scale, 6 * scale, 58 * scale);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(x + 41 * scale, y - 36 * scale, 4 * scale, 54 * scale);
        // Crossguard
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(x + 32 * scale, y - 10 * scale, 22 * scale, 4 * scale);
        // Crystal glow on blade
        ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = 'rgba(103, 232, 249, 0.8)';
        ctx.fillRect(x + 42 * scale, y - 34 * scale, 2 * scale, 50 * scale);
			} else if (enemyName === 'Treasure Guardian') {
    // TREASURE GUARDIAN - MASSIVE 2X SIZE with bags of gold
    const scale = 4.0; // 4x bigger to match shadow!
    
    
    // Larger golden aura
    const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 50 * scale);
    auraGradient.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
    auraGradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(x, y, 50 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Massive armored body with ornate detail
    ctx.fillStyle = this.color;
    ctx.fillRect(x - 16 * scale, y - 10 * scale, 32 * scale, 20 * scale);
    
    // Armor plating with gold inlay
    ctx.fillStyle = '#1a1300';
    ctx.fillRect(x - 13 * scale, y - 8 * scale, 26 * scale, 3 * scale);
    ctx.fillRect(x - 13 * scale, y - 2 * scale, 26 * scale, 3 * scale);
    ctx.fillRect(x - 13 * scale, y + 4 * scale, 26 * scale, 3 * scale);
    
    // Golden trim (thicker for bigger size)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 14 * scale, y - 9 * scale, 28 * scale, 2 * scale);
    ctx.fillRect(x - 14 * scale, y - 1 * scale, 28 * scale, 2 * scale);
    ctx.fillRect(x - 14 * scale, y + 5 * scale, 28 * scale, 2 * scale);
    
    // Ornate gold patterns on chest
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 8 * scale, y - 6 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x + 6 * scale, y - 6 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x - 4 * scale, y * scale, 8 * scale, 2 * scale);
    
    // Large pauldrons (shoulders)
    ctx.fillStyle = this.color;
    ctx.fillRect(x - 22 * scale, y - 9 * scale, 8 * scale, 12 * scale);
    ctx.fillRect(x + 14 * scale, y - 9 * scale, 8 * scale, 12 * scale);
    
    // Golden shoulder spikes (more impressive)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 21 * scale, y - 12 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(x - 17 * scale, y - 14 * scale, 3 * scale, 6 * scale);
    ctx.fillRect(x - 13 * scale, y - 12 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(x + 11 * scale, y - 12 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(x + 15 * scale, y - 14 * scale, 3 * scale, 6 * scale);
    ctx.fillRect(x + 19 * scale, y - 12 * scale, 3 * scale, 4 * scale);
    
    // Imposing helmet
    ctx.fillStyle = '#1a1300';
    ctx.fillRect(x - 10 * scale, y - 18 * scale, 20 * scale, 10 * scale);
    
    // Elaborate golden crown
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 12 * scale, y - 24 * scale, 6 * scale, 6 * scale);
    ctx.fillRect(x - 5 * scale, y - 27 * scale, 5 * scale, 9 * scale);
    ctx.fillRect(x + 1 * scale, y - 28 * scale, 5 * scale, 10 * scale);
    ctx.fillRect(x + 7 * scale, y - 24 * scale, 6 * scale, 6 * scale);
    
    // Crown jewels (emeralds)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x - 9 * scale, y - 22 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x - 2 * scale, y - 24 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x + 3 * scale, y - 25 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x + 9 * scale, y - 22 * scale, 2 * scale, 2 * scale);
    
    // Golden face plate
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 9 * scale, y - 17 * scale, 18 * scale, 9 * scale);
    ctx.fillStyle = '#1a1300';
    ctx.fillRect(x - 7 * scale, y - 15 * scale, 14 * scale, 5 * scale);
    
    // Intimidating glowing eyes
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#f59e0b';
    ctx.fillRect(x - 6 * scale, y - 14 * scale, 4 * scale, 4 * scale);
    ctx.fillRect(x + 2 * scale, y - 14 * scale, 4 * scale, 4 * scale);
    
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 5 * scale, y - 13 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x + 3 * scale, y - 13 * scale, 2 * scale, 2 * scale);
    
    // BAGS OF GOLD IN LEFT HAND (instead of shield)
    // Large bulging sack
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(x - 28 * scale, y - 2 * scale, 10 * scale, 14 * scale);
    ctx.fillRect(x - 26 * scale, y - 4 * scale, 6 * scale, 3 * scale);
    
    // Sack tie (rope)
    ctx.fillStyle = '#6a5a45';
    ctx.fillRect(x - 25 * scale, y - 5 * scale, 4 * scale, 2 * scale);
    
    // Gold coins spilling out
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x - 26 * scale, y + 11 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 22 * scale, y + 10 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 24 * scale, y + 8 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Coin shine
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(x - 25 * scale, y + 10 * scale, 0.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 21 * scale, y + 9 * scale, 0.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // MASSIVE WAR HAMMER in right hand
    ctx.fillStyle = '#71717a';
    ctx.fillRect(x + 17 * scale, y - 25 * scale, 4 * scale, 40 * scale);
    
    // Ornate hammer head (golden with spikes)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 12 * scale, y - 28 * scale, 14 * scale, 8 * scale);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x + 13 * scale, y - 27 * scale, 12 * scale, 6 * scale);
    
    // Hammer spikes (more dangerous)
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x + 10 * scale, y - 26 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(x + 25 * scale, y - 26 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(x + 17 * scale, y - 30 * scale, 4 * scale, 3 * scale);
    
    // Handle wrap (leather)
    ctx.fillStyle = '#8b7355';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 17 * scale, y - 20 * scale + i * 6 * scale, 4 * scale, 2 * scale);
    }
    
    // Large treasure chest emblem on chest armor
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 6 * scale, y - 4 * scale, 12 * scale, 8 * scale);
    ctx.fillStyle = '#1a1300';
    ctx.fillRect(x - 5 * scale, y - 3 * scale, 10 * scale, 6 * scale);
    
    // Chest lock (golden)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 1 * scale, y - 2 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(x - 2 * scale, y - 1 * scale, 4 * scale, 2 * scale);
    
    // Glowing treasure gem on chest (static)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.shadowColor = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x, y + 5 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Gem highlight
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(x - 1 * scale, y + 4 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Gold coin details on armor (decorative)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x - 10 * scale, y + 6 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10 * scale, y + 6 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
} else if (enemyName === 'Keystone Warden' || (enemyName.includes('Warden') && !enemyName.includes('Hound'))) {
        // KEYSTONE WARDEN - VAULT GUARDIAN
        
        const scale = 1.0;
    // ... rest of Keystone Warden code
        
        // Golden aura around boss
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 60 * scale);
        auraGradient.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
        auraGradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 60 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Massive armored body with detail
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 36, y - 24, 72, 48);
        
        // Armor plating details
        ctx.fillStyle = '#1a1300';
        ctx.fillRect(x - 30, y - 18, 60, 6);
        ctx.fillRect(x - 30, y - 6, 60, 6);
        ctx.fillRect(x - 30, y + 6, 60, 6);
        
        // Golden trim on armor
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 32, y - 20, 64, 2);
        ctx.fillRect(x - 32, y - 4, 64, 2);
        ctx.fillRect(x - 32, y + 8, 64, 2);
        
        // Massive pauldrons (shoulders)
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 50, y - 20, 18, 28);
        ctx.fillRect(x + 32, y - 20, 18, 28);
        
        // Golden spikes on shoulders
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 48, y - 26, 3, 6);
        ctx.fillRect(x - 43, y - 28, 3, 8);
        ctx.fillRect(x - 38, y - 26, 3, 6);
        ctx.fillRect(x + 35, y - 26, 3, 6);
        ctx.fillRect(x + 40, y - 28, 3, 8);
        ctx.fillRect(x + 45, y - 26, 3, 6);
        
        // Ornate helmet
        ctx.fillStyle = '#1a1300';
        ctx.fillRect(x - 22, y - 42, 44, 24);
        
        // Golden crown/helmet crest
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 24, y - 50, 10, 8);
        ctx.fillRect(x - 10, y - 54, 8, 12);
        ctx.fillRect(x + 2, y - 56, 8, 14);
        ctx.fillRect(x + 14, y - 50, 10, 8);
        
        // Face plate with details
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 18, y - 38, 36, 18);
        ctx.fillStyle = '#1a1300';
        ctx.fillRect(x - 14, y - 34, 28, 10);
        
        // GLOWING GOLDEN EYES - INTIMIDATING
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#f59e0b';
        ctx.fillRect(x - 12, y - 32, 7, 7);
        ctx.fillRect(x + 5, y - 32, 7, 7);
        
        // Eye glow effect (layered)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x - 11, y - 31, 5, 5);
        ctx.fillRect(x + 6, y - 31, 5, 5);
        
        // Massive war hammer
        ctx.fillStyle = '#71717a';
        ctx.fillRect(x + 38, y - 45, 6, 70);
        
        // Hammer head (golden)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + 30, y - 50, 22, 12);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x + 32, y - 48, 18, 8);
        
        // Hammer spikes
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x + 28, y - 46, 4, 4);
        ctx.fillRect(x + 50, y - 46, 4, 4);
        
        // Keystone gem on chest (pulsing)
        const keystonePulse = 0.6 + Math.sin(Date.now() / 400) * 0.4;
        ctx.fillStyle = `rgba(245, 158, 11, ${keystonePulse})`;
        ctx.shadowColor = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y - 8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Gem highlight
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(x - 2, y - 10, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyName.includes('Hound')) {
        // Warden Hound (miniature Warden - 0.8x scale)
        ctx.fillStyle = this.color;
        // Massive armored body
        ctx.fillRect(x - 14.4, y - 9.6, 28.8, 19.2);
        // Shoulders
        ctx.fillRect(x - 17.6, y - 8, 6.4, 9.6);
        ctx.fillRect(x + 11.2, y - 8, 6.4, 9.6);
        // Helmet with crown
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 8, y - 16, 16, 8);
        // Crown points (smaller)
        ctx.fillRect(x - 8, y - 19.2, 3.2, 3.2);
        ctx.fillRect(x - 1.6, y - 20.8, 3.2, 4.8);
        ctx.fillRect(x + 4.8, y - 19.2, 3.2, 3.2);
        // Glowing eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#f59e0b';
        ctx.fillRect(x - 4.8, y - 12.8, 2.4, 2.4);
        ctx.fillRect(x + 2.4, y - 12.8, 2.4, 2.4);
        // Weapon (smaller)
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x + 14.4, y - 16, 3.2, 24);
        ctx.fillRect(x + 12.8, y - 17.6, 6.4, 3.2);
    } else if (enemyName.includes('Guardian')) {
        
        
        // RUNE GUARDIAN BOSS - MASSIVE AND TERRIFYING
        const scale = 2.5; // 2.5x bigger than normal
        
        // Massive dark body with purple glow
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 18 * scale, y - 12 * scale, 36 * scale, 24 * scale);
        
        // Armored shoulders
        ctx.fillStyle = '#2a1a4a';
        ctx.fillRect(x - 24 * scale, y - 10 * scale, 12 * scale, 16 * scale);
        ctx.fillRect(x + 12 * scale, y - 10 * scale, 12 * scale, 16 * scale);
        
        // Helmet/head with horns
        ctx.fillStyle = '#1a0a3a';
        ctx.fillRect(x - 12 * scale, y - 20 * scale, 24 * scale, 12 * scale);
        
        // Large curved horns
        ctx.fillStyle = '#0f0520';
        ctx.fillRect(x - 16 * scale, y - 26 * scale, 6 * scale, 10 * scale);
        ctx.fillRect(x + 10 * scale, y - 26 * scale, 6 * scale, 10 * scale);
        
        // GLOWING RED EYES - TERRIFYING
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(x - 8 * scale, y - 16 * scale, 4 * scale, 4 * scale);
        ctx.fillRect(x + 4 * scale, y - 16 * scale, 4 * scale, 4 * scale);
        
        // Purple energy aura
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40 * scale);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 40 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing runes on body (pulsing)
        const pulseAlpha = 0.5 + Math.sin(Date.now() / 300) * 0.3;
        ctx.fillStyle = `rgba(139, 92, 246, ${pulseAlpha})`;
        ctx.fillRect(x - 6 * scale, y - 6 * scale, 3 * scale, 3 * scale);
        ctx.fillRect(x + 3 * scale, y - 6 * scale, 3 * scale, 3 * scale);
        ctx.fillRect(x - 2 * scale, y + 2 * scale, 4 * scale, 4 * scale);
        
    } else if (enemyName === 'Pinnacle Boss') {
        // PINNACLE BOSS - ULTIMATE CHALLENGE
        const scale = 2.5; // Big boss!
        
        // Pink/purple aura effect (multi-layered)
        for (let i = 3; i > 0; i--) {
            const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 40 * scale * i * 0.4);
            auraGradient.addColorStop(0, `rgba(236, 72, 153, ${0.25 * i})`);
            auraGradient.addColorStop(0.5, `rgba(147, 51, 234, ${0.15 * i})`);
            auraGradient.addColorStop(1, 'rgba(147, 51, 234, 0)');
            ctx.fillStyle = auraGradient;
            ctx.beginPath();
            ctx.arc(x, y, 40 * scale * i * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Floating energy particles
        const time = Date.now() / 400;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i / 8) + time;
            const dist = 30 * scale + Math.sin(time * 2 + i) * 8 * scale;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist * 0.5;
            ctx.fillStyle = `rgba(236, 72, 153, ${0.6 + Math.sin(time + i) * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, py, 3 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main body - dark with pink accents
        ctx.fillStyle = '#1a0a14';
        ctx.fillRect(x - 22 * scale, y - 16 * scale, 44 * scale, 32 * scale);
        
        // Pink energy cracks
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(x - 18 * scale, y - 12 * scale, 3 * scale, 26 * scale);
        ctx.fillRect(x + 15 * scale, y - 12 * scale, 3 * scale, 26 * scale);
        ctx.fillRect(x - 15 * scale, y, 30 * scale, 2 * scale);
        
        // Core energy - pulsing pink
        const corePulse = 0.6 + Math.sin(Date.now() / 200) * 0.4;
        ctx.fillStyle = `rgba(236, 72, 153, ${corePulse})`;
        ctx.shadowColor = '#ec4899';
        ctx.beginPath();
        ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Shoulder crystals
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(x - 32 * scale, y - 14 * scale, 12 * scale, 22 * scale);
        ctx.fillRect(x + 20 * scale, y - 14 * scale, 12 * scale, 22 * scale);
        
        // Crystal spikes
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(x - 34 * scale, y - 20 * scale);
        ctx.lineTo(x - 28 * scale, y - 35 * scale);
        ctx.lineTo(x - 22 * scale, y - 20 * scale);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 22 * scale, y - 20 * scale);
        ctx.lineTo(x + 28 * scale, y - 35 * scale);
        ctx.lineTo(x + 34 * scale, y - 20 * scale);
        ctx.fill();
        
        // Crown
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(x - 14 * scale, y - 30 * scale, 28 * scale, 8 * scale);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x - 10 * scale, y - 38 * scale, 6 * scale, 12 * scale);
        ctx.fillRect(x - 2 * scale, y - 42 * scale, 4 * scale, 16 * scale);
        ctx.fillRect(x + 4 * scale, y - 38 * scale, 6 * scale, 12 * scale);
        
        // Glowing pink eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#ec4899';
        ctx.fillRect(x - 10 * scale, y - 24 * scale, 7 * scale, 6 * scale);
        ctx.fillRect(x + 3 * scale, y - 24 * scale, 7 * scale, 6 * scale);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(x - 9 * scale, y - 23 * scale, 5 * scale, 4 * scale);
        ctx.fillRect(x + 4 * scale, y - 23 * scale, 5 * scale, 4 * scale);
        
    } else if (enemyName === 'Pinnacle Spawn') {
        // PINNACLE SPAWN - Mini version of boss
        const scale = 1.2;
        
        // Smaller pink aura
        const auraGradient = ctx.createRadialGradient(x, y, 0, x, y, 25 * scale);
        auraGradient.addColorStop(0, 'rgba(244, 114, 182, 0.3)');
        auraGradient.addColorStop(1, 'rgba(244, 114, 182, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, 25 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body - dark pink
        ctx.fillStyle = '#2d0a1a';
        ctx.fillRect(x - 12 * scale, y - 10 * scale, 24 * scale, 20 * scale);
        
        // Pink energy lines
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x - 10 * scale, y - 8 * scale, 2 * scale, 16 * scale);
        ctx.fillRect(x + 8 * scale, y - 8 * scale, 2 * scale, 16 * scale);
        
        // Core
        const miniPulse = 0.5 + Math.sin(Date.now() / 250) * 0.5;
        ctx.fillStyle = `rgba(244, 114, 182, ${miniPulse})`;
        ctx.shadowColor = '#f472b6';
        ctx.beginPath();
        ctx.arc(x, y, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Small crown spikes
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x - 6 * scale, y - 16 * scale, 3 * scale, 8 * scale);
        ctx.fillRect(x - 1 * scale, y - 18 * scale, 2 * scale, 10 * scale);
        ctx.fillRect(x + 3 * scale, y - 16 * scale, 3 * scale, 8 * scale);
        
        // Glowing eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#f472b6';
        ctx.fillRect(x - 6 * scale, y - 6 * scale, 4 * scale, 3 * scale);
        ctx.fillRect(x + 2 * scale, y - 6 * scale, 4 * scale, 3 * scale);
        
    } else {
        // Default fallback for bosses and unknown enemies
        const isBoss = window.game?.enemies?.find(e => e.sprite === this)?.isBoss;
        if (isBoss) {
            // Boss default (larger, more menacing)
            ctx.fillStyle = this.color;
            ctx.fillRect(x - 14, y - 12, 28, 24);
            ctx.fillRect(x - 10, y - 18, 20, 8);
            // Crown or horns
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x - 8, y - 22, 3, 4);
            ctx.fillRect(x - 2, y - 24, 4, 6);
            ctx.fillRect(x + 5, y - 22, 3, 4);
        } else {
            // Simple default enemy
            ctx.fillStyle = this.color;
            ctx.fillRect(x - 10, y - 10, 20, 20);
            ctx.fillRect(x - 8, y - 18, 16, 10);
        }
    }
}
                
                // Attack effect removed for less clutter
                
                // Movement trail effect when moving fast
        if (this.isMoving && this.type === 'party') {
            ctx.fillStyle = this.color + '30';
            ctx.fillRect(x - 8 - this.offsetY * 2, y - 8, 16, 16);
        }
        
        }

        // V2 Enhanced Party Graphics
        drawV2Party(ctx, x, y) {
            const time = Date.now() / 1000;
            const breathe = Math.sin(time * 2) * 0.5;
            
            if (this.classSymbol === '🛡') { // TANK V2
                // Ambient glow
                ctx.shadowColor = 'rgba(113, 113, 122, 0.5)';
                
                // Heavy plate armor body with depth
                const gradient = ctx.createLinearGradient(x - 12, y - 10, x + 12, y + 12);
                gradient.addColorStop(0, '#a1a1aa');
                gradient.addColorStop(0.3, '#71717a');
                gradient.addColorStop(0.7, '#52525b');
                gradient.addColorStop(1, '#3f3f46');
                ctx.fillStyle = gradient;
                ctx.fillRect(x - 12, y - 10 + breathe, 24, 24);
                
                // Armor plate lines
                ctx.strokeStyle = '#27272a';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x - 10, y - 6 + i * 6 + breathe);
                    ctx.lineTo(x + 10, y - 6 + i * 6 + breathe);
                    ctx.stroke();
                }
                
                // Shield with emblem
                const shieldGrad = ctx.createLinearGradient(x - 18, y - 8, x - 10, y + 6);
                shieldGrad.addColorStop(0, '#d4d4d8');
                shieldGrad.addColorStop(0.5, '#a1a1aa');
                shieldGrad.addColorStop(1, '#71717a');
                ctx.fillStyle = shieldGrad;
                ctx.beginPath();
                ctx.moveTo(x - 18, y - 8 + breathe);
                ctx.lineTo(x - 10, y - 8 + breathe);
                ctx.lineTo(x - 10, y + 4 + breathe);
                ctx.lineTo(x - 14, y + 8 + breathe);
                ctx.lineTo(x - 18, y + 4 + breathe);
                ctx.closePath();
                ctx.fill();
                // Shield emblem
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(x - 16, y - 4 + breathe, 4, 8);
                ctx.fillRect(x - 17, y - 1 + breathe, 6, 2);
                
                // Sword with gleam
                ctx.fillStyle = '#e4e4e7';
                ctx.fillRect(x + 11, y - 14, 3, 22);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(x + 9, y - 3, 7, 3);
                // Sword gleam
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(x + 12, y - 12, 1, 16);
                
                // Helmet with visor
                ctx.fillStyle = '#71717a';
                ctx.fillRect(x - 10, y - 22 + breathe, 20, 14);
                ctx.fillStyle = '#52525b';
                ctx.fillRect(x - 8, y - 18 + breathe, 16, 8);
                // Visor slit
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(x - 6, y - 16 + breathe, 12, 3);
                // Eye glow
                ctx.fillStyle = '#60a5fa';
                ctx.shadowColor = '#3b82f6';
                ctx.fillRect(x - 4, y - 15 + breathe, 3, 2);
                ctx.fillRect(x + 1, y - 15 + breathe, 3, 2);
                
            } else if (this.classSymbol === '💊') { // HEALER V2
                // Healing aura particles
                ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
                
                for (let i = 0; i < 4; i++) {
                    const angle = time * 2 + (i * Math.PI / 2);
                    const dist = 18 + Math.sin(time * 3 + i) * 4;
                    const px = x + Math.cos(angle) * dist;
                    const py = y + Math.sin(angle) * dist * 0.5 - 5;
                    ctx.fillStyle = `rgba(134, 239, 172, ${0.4 + Math.sin(time * 4 + i) * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(px, py, 2 + Math.sin(time * 3 + i), 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Flowing robes
                const robeGrad = ctx.createLinearGradient(x - 12, y - 8, x + 12, y + 12);
                robeGrad.addColorStop(0, '#ecfdf5');
                robeGrad.addColorStop(0.5, '#d1fae5');
                robeGrad.addColorStop(1, '#a7f3d0');
                ctx.fillStyle = robeGrad;
                ctx.beginPath();
                ctx.moveTo(x - 14 + Math.sin(time * 2) * 2, y + 12);
                ctx.lineTo(x - 9, y - 8 + breathe);
                ctx.lineTo(x + 9, y - 8 + breathe);
                ctx.lineTo(x + 14 + Math.sin(time * 2 + 1) * 2, y + 12);
                ctx.closePath();
                ctx.fill();
                
                // Green trim with glow
                ctx.fillStyle = '#10b981';
                ctx.fillRect(x - 3, y - 8 + breathe, 6, 20);
                ctx.fillStyle = '#059669';
                ctx.fillRect(x - 10, y + 6, 20, 3);
                
                // Staff with glowing orb
                ctx.strokeStyle = '#65a30d';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x + 10, y - 18);
                ctx.lineTo(x + 10, y + 14);
                ctx.stroke();
                
                // Orb with pulse
                const orbPulse = 0.8 + Math.sin(time * 4) * 0.2;
                ctx.shadowColor = '#22c55e';
                ctx.fillStyle = '#86efac';
                ctx.beginPath();
                ctx.arc(x + 10, y - 20, 5 * orbPulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + 8, y - 22, 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Hood
                ctx.fillStyle = '#10b981';
                ctx.fillRect(x - 10, y - 22 + breathe, 20, 16);
                ctx.fillStyle = '#fdbcb4';
                ctx.fillRect(x - 7, y - 18 + breathe, 14, 10);
                // Kind eyes
                ctx.fillStyle = '#065f46';
                ctx.fillRect(x - 4, y - 15 + breathe, 3, 2);
                ctx.fillRect(x + 1, y - 15 + breathe, 3, 2);
                
            } else if (this.classSymbol === '🔮') { // MAGE V2
                // Arcane energy swirl
                ctx.shadowColor = 'rgba(139, 92, 246, 0.7)';
                
                for (let i = 0; i < 6; i++) {
                    const angle = time * 1.5 + (i * Math.PI / 3);
                    const dist = 20 + Math.sin(time * 2 + i) * 5;
                    const px = x + Math.cos(angle) * dist;
                    const py = y + Math.sin(angle) * dist * 0.4 - 3;
                    ctx.fillStyle = `rgba(196, 181, 253, ${0.3 + Math.sin(time * 3 + i) * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(px, py, 1.5 + Math.sin(time * 2 + i), 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Mystical robes
                const mageRobeGrad = ctx.createLinearGradient(x - 12, y - 8, x + 12, y + 12);
                mageRobeGrad.addColorStop(0, '#4338ca');
                mageRobeGrad.addColorStop(0.5, '#312e81');
                mageRobeGrad.addColorStop(1, '#1e1b4b');
                ctx.fillStyle = mageRobeGrad;
                ctx.beginPath();
                ctx.moveTo(x - 14 + Math.sin(time * 1.5) * 2, y + 12);
                ctx.lineTo(x - 9, y - 8 + breathe);
                ctx.lineTo(x + 9, y - 8 + breathe);
                ctx.lineTo(x + 14 + Math.sin(time * 1.5 + 1) * 2, y + 12);
                ctx.closePath();
                ctx.fill();
                
                // Rune patterns
                ctx.strokeStyle = '#a78bfa';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x - 6, y - 4 + breathe);
                ctx.lineTo(x, y + 8 + breathe);
                ctx.lineTo(x + 6, y - 4 + breathe);
                ctx.stroke();
                
                // Wand with star
                ctx.strokeStyle = '#a78bfa';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - 10, y - 12);
                ctx.lineTo(x - 10, y + 10);
                ctx.stroke();
                
                // Wand star with sparkle
                const starPulse = 0.8 + Math.sin(time * 5) * 0.2;
                ctx.shadowColor = '#c4b5fd';
                ctx.fillStyle = '#e9d5ff';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const starAngle = (i * Math.PI * 2 / 5) - Math.PI / 2 + time;
                    const r = i % 2 === 0 ? 5 * starPulse : 2;
                    ctx.lineTo(x - 10 + Math.cos(starAngle) * r, y - 16 + Math.sin(starAngle) * r);
                }
                ctx.closePath();
                ctx.fill();
                
                // Wizard hat
                ctx.fillStyle = '#312e81';
                ctx.fillRect(x - 12, y - 24 + breathe, 24, 6);
                ctx.beginPath();
                ctx.moveTo(x - 8, y - 24 + breathe);
                ctx.lineTo(x, y - 36 + breathe);
                ctx.lineTo(x + 8, y - 24 + breathe);
                ctx.closePath();
                ctx.fill();
                // Hat band
                ctx.fillStyle = '#8b5cf6';
                ctx.fillRect(x - 11, y - 24 + breathe, 22, 3);
                // Face
                ctx.fillStyle = '#fdbcb4';
                ctx.fillRect(x - 7, y - 18 + breathe, 14, 10);
                // Glowing eyes
                ctx.fillStyle = '#c4b5fd';
                ctx.shadowColor = '#8b5cf6';
                ctx.fillRect(x - 4, y - 15 + breathe, 3, 2);
                ctx.fillRect(x + 1, y - 15 + breathe, 3, 2);
                
            } else if (this.classSymbol === '🗡') { // ROGUE V2
                // Shadow trail when moving
                if (this.isMoving) {
                    ctx.fillStyle = 'rgba(69, 10, 10, 0.3)';
                    ctx.fillRect(x - 12, y - 12, 24, 24);
                }
                
                ctx.shadowColor = 'rgba(127, 29, 29, 0.5)';
                
                // Dark cloak with depth
                const cloakGrad = ctx.createLinearGradient(x - 12, y - 10, x + 12, y + 10);
                cloakGrad.addColorStop(0, '#7f1d1d');
                cloakGrad.addColorStop(0.3, '#450a0a');
                cloakGrad.addColorStop(0.7, '#2c0505');
                cloakGrad.addColorStop(1, '#1a0303');
                ctx.fillStyle = cloakGrad;
                ctx.fillRect(x - 11, y - 10 + breathe, 22, 22);
                
                // Leather straps
                ctx.fillStyle = '#991b1b';
                ctx.fillRect(x - 9, y - 6 + breathe, 18, 2);
                ctx.fillRect(x - 9, y + 2 + breathe, 18, 2);
                
                // Daggers with gleam
                ctx.fillStyle = '#e4e4e7';
                // Left dagger
                ctx.beginPath();
                ctx.moveTo(x - 14, y - 6);
                ctx.lineTo(x - 12, y + 8);
                ctx.lineTo(x - 10, y - 6);
                ctx.closePath();
                ctx.fill();
                // Right dagger
                ctx.beginPath();
                ctx.moveTo(x + 10, y - 6);
                ctx.lineTo(x + 12, y + 8);
                ctx.lineTo(x + 14, y - 6);
                ctx.closePath();
                ctx.fill();
                // Dagger gleam
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillRect(x - 13, y - 4, 1, 8);
                ctx.fillRect(x + 12, y - 4, 1, 8);
                // Crossguards
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(x - 16, y - 3, 6, 2);
                ctx.fillRect(x + 10, y - 3, 6, 2);
                
                // Hood
                ctx.fillStyle = '#450a0a';
                ctx.fillRect(x - 10, y - 22 + breathe, 20, 14);
                // Shadow in hood
                ctx.fillStyle = '#2c0505';
                ctx.fillRect(x - 8, y - 18 + breathe, 16, 8);
                // Glowing eyes in shadow
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.fillRect(x - 4, y - 15 + breathe, 2, 2);
                ctx.fillRect(x + 2, y - 15 + breathe, 2, 2);
                
            } else if (this.classSymbol === '🏹') { // ARCHER V2
                ctx.shadowColor = 'rgba(21, 128, 61, 0.4)';
                
                // Leather armor with detail
                const leatherGrad = ctx.createLinearGradient(x - 10, y - 10, x + 10, y + 10);
                leatherGrad.addColorStop(0, '#a16207');
                leatherGrad.addColorStop(0.5, '#78350f');
                leatherGrad.addColorStop(1, '#451a03');
                ctx.fillStyle = leatherGrad;
                ctx.fillRect(x - 11, y - 10 + breathe, 22, 22);
                
                // Leather straps
                ctx.fillStyle = '#92400e';
                ctx.fillRect(x - 9, y - 8 + breathe, 18, 2);
                ctx.fillRect(x - 9, y + breathe, 18, 2);
                ctx.fillRect(x - 9, y + 6 + breathe, 18, 2);
                
                // Quiver
                ctx.fillStyle = '#451a03';
                ctx.fillRect(x - 14, y - 14 + breathe, 7, 16);
                // Arrows with colored fletching
                const colors = ['#84cc16', '#22c55e', '#15803d'];
                for (let i = 0; i < 3; i++) {
                    ctx.fillStyle = colors[i];
                    ctx.fillRect(x - 13 + i * 2, y - 18 + breathe, 2, 6);
                }
                
                // Bow with pull animation
                const bowPull = this.attacking ? (this.attackTimer / 15) * 8 : 0;
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x + 14, y - 14);
                ctx.quadraticCurveTo(x + 20 - bowPull, y, x + 14, y + 14);
                ctx.stroke();
                
                // Bow string
                ctx.strokeStyle = '#fafaf9';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 14, y - 14);
                ctx.lineTo(x + 14 - bowPull, y);
                ctx.lineTo(x + 14, y + 14);
                ctx.stroke();
                
                // Arrow nocked
                if (!this.attacking || this.attackTimer < 10) {
                    ctx.fillStyle = '#84cc16';
                    ctx.fillRect(x + 4, y - 1, 10 - bowPull, 2);
                    ctx.fillStyle = '#dc2626';
                    ctx.beginPath();
                    ctx.moveTo(x + 14 - bowPull, y);
                    ctx.lineTo(x + 18 - bowPull, y - 3);
                    ctx.lineTo(x + 18 - bowPull, y + 3);
                    ctx.closePath();
                    ctx.fill();
                }
                
                // Ranger hood
                ctx.fillStyle = '#15803d';
                ctx.fillRect(x - 10, y - 22 + breathe, 20, 14);
                // Hood point
                ctx.beginPath();
                ctx.moveTo(x - 10, y - 22 + breathe);
                ctx.lineTo(x, y - 28 + breathe);
                ctx.lineTo(x + 10, y - 22 + breathe);
                ctx.closePath();
                ctx.fill();
                // Face
                ctx.fillStyle = '#fdbcb4';
                ctx.fillRect(x - 7, y - 18 + breathe, 14, 8);
                // Sharp eyes
                ctx.fillStyle = '#166534';
                ctx.fillRect(x - 4, y - 15 + breathe, 3, 2);
                ctx.fillRect(x + 1, y - 15 + breathe, 3, 2);
                
            } else if (this.classSymbol === '⚔️') { // PALADIN V2
                // Holy aura
                ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
                
                // Light particles
                for (let i = 0; i < 6; i++) {
                    const angle = time * 1.2 + (i * Math.PI / 3);
                    const dist = 22 + Math.sin(time * 2 + i) * 4;
                    const px = x + Math.cos(angle) * dist;
                    const py = y + Math.sin(angle) * dist * 0.4 - 5;
                    ctx.fillStyle = `rgba(254, 243, 199, ${0.4 + Math.sin(time * 3 + i) * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(px, py, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Holy plate armor
                const plateGrad = ctx.createLinearGradient(x - 12, y - 10, x + 12, y + 12);
                plateGrad.addColorStop(0, '#f8fafc');
                plateGrad.addColorStop(0.3, '#e0e7ff');
                plateGrad.addColorStop(0.7, '#c7d2fe');
                plateGrad.addColorStop(1, '#a5b4fc');
                ctx.fillStyle = plateGrad;
                ctx.fillRect(x - 13, y - 10 + breathe, 26, 24);
                
                // Golden trim
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(x - 14, y - 11 + breathe, 28, 3);
                ctx.fillRect(x - 14, y - 1 + breathe, 28, 2);
                ctx.fillRect(x - 14, y + 11 + breathe, 28, 3);
                
                // Holy cross emblem
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.fillRect(x - 2, y - 7 + breathe, 4, 14);
                ctx.fillRect(x - 6, y - 3 + breathe, 12, 4);
                
                // Sword with holy glow
                const swordAngle = this.attacking ? Math.sin(this.attackTimer / 15 * Math.PI) * 0.6 : 0;
                ctx.save();
                ctx.translate(x + 13, y - 2);
                ctx.rotate(swordAngle);
                
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, -14, 4, 26);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(-3, -3, 10, 4);
                ctx.fillRect(1, -16, 2, 4);
                
                // Sword glow
                ctx.shadowColor = '#fbbf24';
                ctx.strokeStyle = 'rgba(254, 243, 199, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(0.5, -13, 3, 24);
                
                ctx.restore();
                
                // Shield with cross
                const shieldGrad = ctx.createLinearGradient(x - 20, y - 10, x - 10, y + 8);
                shieldGrad.addColorStop(0, '#60a5fa');
                shieldGrad.addColorStop(0.5, '#3b82f6');
                shieldGrad.addColorStop(1, '#2563eb');
                ctx.fillStyle = shieldGrad;
                ctx.beginPath();
                ctx.moveTo(x - 20, y - 10 + breathe);
                ctx.lineTo(x - 10, y - 10 + breathe);
                ctx.lineTo(x - 10, y + 6 + breathe);
                ctx.lineTo(x - 15, y + 12 + breathe);
                ctx.lineTo(x - 20, y + 6 + breathe);
                ctx.closePath();
                ctx.fill();
                // Shield cross
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(x - 17, y - 6 + breathe, 4, 12);
                ctx.fillRect(x - 19, y - 2 + breathe, 8, 3);
                
                // Holy helm
                ctx.fillStyle = '#e0e7ff';
                ctx.fillRect(x - 10, y - 22 + breathe, 20, 14);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(x - 11, y - 23 + breathe, 22, 3);
                // Wings on helm
                ctx.fillStyle = '#fef3c7';
                ctx.beginPath();
                ctx.moveTo(x - 10, y - 20 + breathe);
                ctx.lineTo(x - 16, y - 26 + breathe);
                ctx.lineTo(x - 8, y - 22 + breathe);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x + 10, y - 20 + breathe);
                ctx.lineTo(x + 16, y - 26 + breathe);
                ctx.lineTo(x + 8, y - 22 + breathe);
                ctx.closePath();
                ctx.fill();
                // Face
                ctx.fillStyle = '#fdbcb4';
                ctx.fillRect(x - 7, y - 18 + breathe, 14, 8);
                // Holy eyes
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.fillRect(x - 4, y - 15 + breathe, 3, 2);
                ctx.fillRect(x + 1, y - 15 + breathe, 3, 2);
                
                // Halo
                ctx.strokeStyle = '#fef3c7';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(x, y - 26 + breathe, 12, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

            moveTo(x, y, instant = false) {
                // Boundary constraints for special dungeons
                if (window.game && (window.game.currentDungeon === 'runetrial' || 
                    window.game.currentDungeon === 'vault' || 
                    window.game.currentDungeon === 'endlessblessings')) {
                    const gridSize = window.game.room ? (window.game.room.width || 30) : 30;
                    x = Math.max(0, Math.min(gridSize - 1, x));
                    y = Math.max(0, Math.min(gridSize - 1, y));
                }
                
                if (instant) {
                    this.gridX = x;
                    this.gridY = y;
                    this.targetX = x;
                    this.targetY = y;
                    const pos = ISO.toScreen(x, y);
                    this.screenX = pos.x;
                    this.screenY = pos.y;
                } else {
                    this.targetX = x;
                    this.targetY = y;
                }
            }

            setCombatPosition(x, y) {
                this.combatX = x;
                this.combatY = y;
                this.moveTo(x, y);
            }

            returnToCombatPosition() {
                this.moveTo(this.combatX, this.combatY);
            }
        }

