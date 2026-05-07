class AssetPreloader {
    constructor() {
        this.assets = {
            images: {},
            loaded: 0,
            total: 0
        };
    }

    async loadAllAssets() {
        const imageList = {
            // Character icons
            tank: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/shield.png',
            healer: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/healer.png',
            mage: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/mage.png',
            rogue: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/rogue.png',
            archer: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/archer.png',
            paladin: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/paladin.png',
            
            // Backgrounds
            everfallBg: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Everfall%20HD.png',
            stoneforgeBg: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Stoneforge%20HD.png',
            umbralBg: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/umbral%20depths1.png',
            vaultBg: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/vault.png',
            runetrialBg: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/runetrial.png',
            
            // Banners
            everfallBanner: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/everfall%20banner.png',
            stoneforgeBanner: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/stoneforge%20banner.png',
            umbralBanner: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/umbral%20depths.png',
            vaultBanner: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/the%20vault.png',
            runetrialBanner: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/rune%20trials.png',
            
            // UI Icons
            combatLog: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/combat%20log2.png',
            lootIcon: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/Lootbad3.png',
            cacheIcon: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/cache%20tab.png',
            keystoneIcon: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/keystone%20tabs.png',
            dungeonIcon: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/dungeon%20tab.png',
            settingsIcon: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/settings%20tab.png',
            statsIcon: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/stats.png',
            
            // Keys and items
            blueKey: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/blue_key_64_transparent.png',
            goldKey: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/gold_key_64_transparent.png',
            chest: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/chest.png',
            keystoneEmoji: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/keystone%20emoji.png',
            runeEmoji: 'https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/rune%20emoji.png'
        };
        
        this.total = Object.keys(imageList).length;
        
        // Show loading screen
        this.showLoadingScreen();
        
        // Load all images
        const loadPromises = Object.entries(imageList).map(([key, url]) => {
            return this.loadImage(key, url);
        });
        
        await Promise.all(loadPromises);
        
        // Hide loading screen
        this.hideLoadingScreen();
        
        return this.assets.images;
    }
    
    loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets.images[key] = img;
                this.assets.loaded++;
                this.updateLoadingProgress();
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${key} from ${url}`);
                this.assets.loaded++;
                this.updateLoadingProgress();
                resolve(null); // Don't block loading on failed images
            };
            img.src = url;
        });
    }
    
    showLoadingScreen() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'preloader-screen';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, rgba(10, 14, 39, 0.9) 0%, rgba(21, 25, 53, 0.9) 100%),
                            url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjM2NmYxIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPjwvc3ZnPg==');
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Orbitron', sans-serif;
            ">
                <h1 style="color: #f59e0b; margin-bottom: 30px;">LOADING DUNGEON ASSETS</h1>
                <div style="
                    width: 300px;
                    height: 20px;
                    background: rgba(99, 102, 241, 0.2);
                    border: 2px solid rgba(99, 102, 241, 0.5);
                    border-radius: 10px;
                    overflow: hidden;
                ">
                    <div id="loading-bar" style="
                        width: 0%;
                        height: 100%;
                        background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <p id="loading-text" style="color: #94a3b8; margin-top: 20px;">Loading... 0%</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }
    
    updateLoadingProgress() {
        const percent = Math.round((this.assets.loaded / this.total) * 100);
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        if (bar) bar.style.width = percent + '%';
        if (text) text.textContent = `Loading... ${percent}%`;
    }
    
    hideLoadingScreen() {
        const loader = document.getElementById('preloader-screen');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease';
            setTimeout(() => loader.remove(), 500);
        }
    }
}

// Initialize and load assets when game starts
let gameAssets = {};

