        class DungeonRoom {
            constructor(width, height, type, dungeonTheme = 'stoneforge') {
                this.width = width;
                this.height = height;
                this.type = type;
                this.dungeonTheme = dungeonTheme;
                this.tiles = [];
                this.generateTiles();
            }

generateTiles() {
    for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
            const variation = Math.random();
            let color;
            
            // Vault rooms are black with gold accents
            if (this.dungeonTheme === 'vault') {
                color = variation < 0.2 ? '#1a1300' : '#0a0a00';
            }
            // Divine Arena - divine yellow/gold theme (toned down)
            else if (this.dungeonTheme === 'endlessblessings') {
                if (variation < 0.1) {
                    color = '#9a7d3a'; // Darker muted gold
                } else if (variation < 0.3) {
                    color = '#b89d58'; // Muted khaki
                } else if (variation < 0.5) {
                    color = '#c4a747'; // Subdued gold
                } else if (variation < 0.7) {
                    color = '#d4b86a'; // Muted yellow-gold
                } else {
                    color = '#ccbb7a'; // Soft cream-gold
                }
            }
            // Boss rooms are always red regardless of dungeon
            else if (this.type === ROOM_TYPES.BOSS) {
                color = variation < 0.3 ? '#8b0000' : '#660000';
                        } else if (this.type === ROOM_TYPES.TREASURE) {
                            color = variation < 0.3 ? '#665500' : '#554400';
                        } else if (this.type === ROOM_TYPES.FOUNTAIN) {
                            // Fountain of Youth - blue colored tiles
                            color = variation < 0.3 ? '#1a3a4a' : '#2a4a5a';
                        } else if (this.type === ROOM_TYPES.ENTRANCE) {
                            // Entrance matches dungeon theme
                            if (this.dungeonTheme === 'umbral') {
                                color = variation < 0.3 ? '#2a1a3a' : '#3a2a4a';
                            } else if (this.dungeonTheme === 'everfall') {
                                color = variation < 0.3 ? '#1a3a2a' : '#2a4a3a';
                            } else {
                                // Stoneforge - grey
                                color = variation < 0.2 ? '#2a2a2a' : '#333333';
                            }
                        } else if (this.type === ROOM_TYPES.PATHWAY) {
                            // Hallway tiles match dungeon theme
                            if (this.dungeonTheme === 'umbral') {
                                color = variation < 0.2 ? '#2a1a3a' : '#3a2a4a';
                            } else if (this.dungeonTheme === 'everfall') {
                                color = variation < 0.2 ? '#1a3a2a' : '#2a4a3a';
                            } else {
                                color = variation < 0.2 ? '#2a2a2a' : '#333333';
                            }
                        } else {
                            // Normal room colors based on dungeon theme
                            if (this.dungeonTheme === 'umbral') {
                                // Purple theme for Umbral Depths
                                if (variation < 0.1) {
                                    color = '#3a2a4a';
                                } else if (variation < 0.2) {
                                    color = '#4a3a5a';
                                } else {
                                    color = '#5a4a6a';
                                }
                            } else if (this.dungeonTheme === 'everfall') {
                                // Green theme for Everfall
                                if (variation < 0.1) {
                                    color = '#2a4a3a';
                                } else if (variation < 0.2) {
                                    color = '#3a5a4a';
                                } else {
                                    color = '#4a6a5a';
                                }
                            } else {
                                // Grey theme for Stoneforge (default)
                                if (variation < 0.1) {
                                    color = '#3a3a3a';
                                } else if (variation < 0.2) {
                                    color = '#424242';
                                } else {
                                    color = '#4a4a4a';
                                }
                            }
                        }
                        this.tiles.push({ x, y, color });
                    }
                }
            }

            draw(ctx, offsetX, offsetY, drawWalls = true) {
                // Draw tiles in isometric order
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const tile = this.tiles[y * this.width + x];
                        const pos = ISO.toScreen(x, y);
                        
                        ctx.fillStyle = tile.color;
                        ctx.beginPath();
                        ctx.moveTo(pos.x + offsetX, pos.y + offsetY);
                        ctx.lineTo(pos.x + offsetX + ISO.tileWidth/2, pos.y + offsetY + ISO.tileHeight/2);
                        ctx.lineTo(pos.x + offsetX, pos.y + offsetY + ISO.tileHeight);
                        ctx.lineTo(pos.x + offsetX - ISO.tileWidth/2, pos.y + offsetY + ISO.tileHeight/2);
                        ctx.closePath();
                        ctx.fill();
                        
                        ctx.strokeStyle = '#222';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
                
// Draw walls only for main rooms, not hallways
if (drawWalls && this.type !== ROOM_TYPES.PATHWAY) {
    // Vault rooms have golden walls
    ctx.fillStyle = this.dungeonTheme === 'vault' ? '#f59e0b' : '#222';
    for (let x = 0; x < this.width; x++) {
        const pos = ISO.toScreen(x, 0);
        ctx.fillRect(pos.x + offsetX - 2, pos.y + offsetY - 40, 4, 40);
    }
    for (let y = 0; y < this.height; y++) {
        const pos = ISO.toScreen(0, y);
        ctx.fillRect(pos.x + offsetX - 2, pos.y + offsetY - 40, 4, 40);
    }
}
            }
        }

