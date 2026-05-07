        class Item {
            constructor(type, rarityHint, level) {
                // GDD §8.1 — itemLevel = floor it dropped on. All 6 stats roll
                // independently in [0, lvl]; the namesake stat in [0, 2*lvl].
                // Rarity is computed *after* rolls per §9 (transparent function
                // of how well the item rolled), not seeded by the caller.
                // The 3rd-arg rarityHint is preserved only as a *minimum-quality*
                // floor for backwards-compat with existing roll sites that pass
                // 'epic'/'mythic'/etc. — final rarity is still the higher of
                // the rolled tier and the hint.
                this.type = type;
                this.level = level;
                this.itemLevel = level; // GDD-spec name
                this.levelReq = Math.max(1, level - 1);

                // Pick namesake per slot weighting (GDD §8.3 loose convention).
                // Weapons can be any namesake; armor leans HP/P.DEF/M.DEF; jewelry
                // leans P.ATK/M.ATK/MP/HP. Stones (Phase 8) override later.
                const namesakeWeights = (() => {
                    const armor = ['hp','hp','pDef','mDef'];
                    const jewelry = ['pAtk','mAtk','mp','hp'];
                    const weapons = ['hp','mp','pAtk','mAtk','pDef','mDef'];
                    if (['helmet','chest','gloves','belt','boots'].includes(type)) return armor;
                    if (['amulet','ring','ring1','ring2'].includes(type)) return jewelry;
                    return weapons;
                })();
                this.namesake = namesakeWeights[Math.floor(Math.random() * namesakeWeights.length)];

                // GDD §8.2 — every item has all 6 stats. Each non-namesake rolls
                // [0, lvl]; namesake rolls [0, 2*lvl]. We snap to integers so the
                // numbers display cleanly.
                const rollAxis = (max) => Math.floor(Math.random() * (max + 1));
                this.hp   = rollAxis(this.namesake === 'hp'   ? 2*level : level);
                this.mp   = rollAxis(this.namesake === 'mp'   ? 2*level : level);
                this.pAtk = rollAxis(this.namesake === 'pAtk' ? 2*level : level);
                this.mAtk = rollAxis(this.namesake === 'mAtk' ? 2*level : level);
                this.pDef = rollAxis(this.namesake === 'pDef' ? 2*level : level);
                this.mDef = rollAxis(this.namesake === 'mDef' ? 2*level : level);

                // GDD §9.2 quality score — average of each stat's roll-pct of
                // its max-possible. Namesake max is 2*lvl, others are lvl.
                const pct = (val, max) => max <= 0 ? 0 : Math.min(1, val / max);
                const rolls = [
                    pct(this.hp,   this.namesake === 'hp'   ? 2*level : level),
                    pct(this.mp,   this.namesake === 'mp'   ? 2*level : level),
                    pct(this.pAtk, this.namesake === 'pAtk' ? 2*level : level),
                    pct(this.mAtk, this.namesake === 'mAtk' ? 2*level : level),
                    pct(this.pDef, this.namesake === 'pDef' ? 2*level : level),
                    pct(this.mDef, this.namesake === 'mDef' ? 2*level : level),
                ];
                this.qualityScore = rolls.reduce((a,b) => a+b, 0) / rolls.length;

                // GDD §9.3 — 7 tiers thresholded on qualityScore. Note the
                // ordering: Mythic (≥80) sits BETWEEN Epic and Legendary, then
                // Legendary (≥90), then Radiant (≥95) caps the tree.
                const TIERS = [
                    { id: 'rusted',    threshold: 0.00, name: 'Rusted',    color: '#6b6b78' },
                    { id: 'common',    threshold: 0.20, name: 'Common',    color: '#e4e4e7' },
                    { id: 'rare',      threshold: 0.40, name: 'Rare',      color: '#3b82f6' },
                    { id: 'epic',      threshold: 0.60, name: 'Epic',      color: '#a855f7' },
                    { id: 'mythic',    threshold: 0.80, name: 'Mythic',    color: '#ec4899' },
                    { id: 'legendary', threshold: 0.90, name: 'Legendary', color: '#f59e0b' },
                    { id: 'radiant',   threshold: 0.95, name: 'Radiant',   color: '#fde68a' },
                ];
                let tier = TIERS[0];
                for (const t of TIERS) if (this.qualityScore >= t.threshold) tier = t;

                // Honor a minimum-rarity hint from existing roll sites (chests,
                // boss drops). We DON'T downgrade — the rolled tier wins if higher.
                if (rarityHint) {
                    const hintIdx = TIERS.findIndex(t => t.id === rarityHint);
                    const tierIdx = TIERS.findIndex(t => t.id === tier.id);
                    if (hintIdx > tierIdx) tier = TIERS[hintIdx];
                }
                this.rarity = tier.id;
                this.rarityName = tier.name;
                this.rarityColor = tier.color;

                // Equipment payload still routes through legacy fields too so
                // pre-Phase-5 combat paths (rune percent bonuses keyed off
                // 'attack', tooltip code, etc.) keep functioning. These are the
                // *aggregate* of the new p/m fields.
                this.attack = this.pAtk + this.mAtk;
                this.defense = this.pDef + this.mDef;

                this.equipment = {
                    weapon: null, chest: null, helmet: null, gloves: null,
                    boots: null, amulet: null, belt: null, ring1: null, ring2: null,
                };

                // Slot/normalize.
                if (['wand','dagger','greatsword','staff','bow','warhammer'].includes(type)) {
                    this.weaponType = type;
                    this.type = 'weapon';
                }

                // Item name per GDD §7.5 / §8.3 spirit:
                //  "Lvl <X> <Rarity> <Namesake-prefix> <Slot>"
                const NAMESAKE_PREFIX = {
                    hp:'Vital', mp:'Spry', pAtk:'Brutal', mAtk:'Arcane',
                    pDef:'Stalwart', mDef:'Warded',
                };
                const SLOT_NAME = {
                    helmet:'Helmet', gloves:'Gloves', belt:'Belt', chest:'Chestplate',
                    boots:'Boots', amulet:'Amulet', ring:'Ring',
                    wand:'Wand', dagger:'Dagger', greatsword:'Greatsword',
                    staff:'Staff', bow:'Bow', warhammer:'Warhammer', weapon:'Weapon',
                };
                const slotName = SLOT_NAME[this.weaponType || type] || SLOT_NAME[type] || 'Item';
                this.name = `Lvl ${level} ${tier.name} ${NAMESAKE_PREFIX[this.namesake]} ${slotName}`;
            }

            getStatsDisplay() {
                const parts = [];
                const fmt = (label, v, color) =>
                    v ? `<span style="color:${color}">${label} +${v}</span>` : null;
                const phys = '#fda4af', mag = '#a5b4fc', neutral = '#e2e8f0';
                parts.push(fmt('HP',    this.hp,   neutral));
                parts.push(fmt('MP',    this.mp,   '#3b82f6'));
                parts.push(fmt('P.ATK', this.pAtk, phys));
                parts.push(fmt('M.ATK', this.mAtk, mag));
                parts.push(fmt('P.DEF', this.pDef, phys));
                parts.push(fmt('M.DEF', this.mDef, mag));
                if (this.blessed) parts.push(`<span style="color:#fde68a">✨ BLESSED</span>`);
                return parts.filter(Boolean).join(', ');
            }
        }

        window.Item = Item;
