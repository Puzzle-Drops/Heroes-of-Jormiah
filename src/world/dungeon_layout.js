        class DungeonLayout {
            constructor(floor) {
                this.floor = floor;
                this.gridSize = 7;
                this.grid = [];
                this.rooms = [];
                this.currentRoomIndex = 0;
                this.generateLayout();
            }

            generateLayout() {
                // Initialize grid
                for (let y = 0; y < this.gridSize; y++) {
                    this.grid[y] = [];
                    for (let x = 0; x < this.gridSize; x++) {
                        this.grid[y][x] = null;
                    }
                }

                // Place entrance at bottom center
                const entranceX = Math.floor(this.gridSize / 2);
                const entranceY = this.gridSize - 1;
                this.placeRoom(entranceX, entranceY, ROOM_TYPES.ENTRANCE);

                // Generate main path to boss
                const path = this.generatePath(entranceX, entranceY);
                
                // Place boss at end of path
                const bossPos = path[path.length - 1];
                this.grid[bossPos.y][bossPos.x] = ROOM_TYPES.BOSS;
                this.rooms[this.rooms.length - 1].type = ROOM_TYPES.BOSS;

                // Add side rooms
                this.addSideRooms(path);

                // Connect all rooms
                this.connectRooms();
            }

            generatePath(startX, startY) {
                const path = [{x: startX, y: startY}];
                let x = startX;
                let y = startY;
                const targetY = 0; // Boss should be near top

                while (y > targetY + 1) {
                    // Move up with some randomness
                    const moves = [];
                    if (y > 0) moves.push({x: x, y: y - 1});
                    if (x > 0 && Math.random() > 0.5) moves.push({x: x - 1, y: y});
                    if (x < this.gridSize - 1 && Math.random() > 0.5) moves.push({x: x + 1, y: y});

                    if (moves.length > 0) {
                        const move = moves[Math.floor(Math.random() * moves.length)];
                        x = move.x;
                        y = move.y;
                        path.push({x, y});
                        
                        if (this.grid[y][x] === null) {
                            this.placeRoom(x, y, ROOM_TYPES.NORMAL);
                        }
                    }
                }

                return path;
            }

addSideRooms(mainPath) {
                const sideRoomCount = 3 + Math.floor(Math.random() * 3);
                let placed = 0;
                let fountainPlaced = false;
                let treasurePlaced = false;

                for (let i = 0; i < mainPath.length && placed < sideRoomCount; i++) {
                    const pos = mainPath[i];
                    const neighbors = [
                        {x: pos.x - 1, y: pos.y},
                        {x: pos.x + 1, y: pos.y},
                        {x: pos.x, y: pos.y - 1},
                        {x: pos.x, y: pos.y + 1}
                    ];

                    for (const neighbor of neighbors) {
                        if (neighbor.x >= 0 && neighbor.x < this.gridSize &&
                            neighbor.y >= 0 && neighbor.y < this.gridSize &&
                            this.grid[neighbor.y][neighbor.x] === null &&
                            Math.random() > 0.6) {
                            
                            let type;
                            // Place one Fountain of Youth per dungeon - random placement
                            if (!fountainPlaced && Math.random() < 0.3) {
                                type = ROOM_TYPES.FOUNTAIN;
                                fountainPlaced = true;
                            } 
                            // Place one treasure room at 10% chance
                            else if (!treasurePlaced && Math.random() < 0.1) {
                                type = ROOM_TYPES.TREASURE;
                                treasurePlaced = true;
                            }
                            else {
                                type = ROOM_TYPES.NORMAL;
                            }
                            
                            this.placeRoom(neighbor.x, neighbor.y, type);
                            placed++;
                            break;
                        }
                    }
                }
            }

            placeRoom(x, y, type) {
                this.grid[y][x] = type;
                this.rooms.push({
                    x: x,
                    y: y,
                    type: type,
                    visited: false,
                    cleared: false,
                    connections: []
                });
            }

            connectRooms() {
                // Connect adjacent rooms
                for (let room of this.rooms) {
                    const neighbors = [
                        {x: room.x - 1, y: room.y},
                        {x: room.x + 1, y: room.y},
                        {x: room.x, y: room.y - 1},
                        {x: room.x, y: room.y + 1}
                    ];

                    for (const neighbor of neighbors) {
                        if (neighbor.x >= 0 && neighbor.x < this.gridSize &&
                            neighbor.y >= 0 && neighbor.y < this.gridSize &&
                            this.grid[neighbor.y][neighbor.x] !== null) {
                            room.connections.push(neighbor);
                        }
                    }
                }
            }

            getCurrentRoom() {
                return this.rooms[this.currentRoomIndex];
            }

            moveToRoom(x, y) {
                const roomIndex = this.rooms.findIndex(r => r.x === x && r.y === y);
                if (roomIndex !== -1) {
                    this.currentRoomIndex = roomIndex;
                    this.rooms[roomIndex].visited = true;
                    return this.rooms[roomIndex];
                }
                return null;
            }
        }

