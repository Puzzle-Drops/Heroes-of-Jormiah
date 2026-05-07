class Character {
            constructor(name, className, level, maxHp, maxMana, attack, defense, attackSpeed) {
    this.name = name;
    this.className = className;
    this.level = level;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.maxMana = maxMana;
this.mana = maxMana;
this._baseMana = maxMana; // Store base for recalculation
    this.attack = attack;
    this.defense = defense;
    this.attackSpeed = attackSpeed;

    // GDD §4.1 core 6-stat axis. Single attack/defense above are kept as
    // backward-compatible aggregates; combat resolves through the p/m fields.
    // Subclasses override these per their family lean (§6.3).
    this.pAtk = attack;   // Physical Attack
    this.mAtk = 0;        // Magical Attack
    this.pDef = defense;  // Physical Defense
    this.mDef = 0;        // Magical Defense
    this.damageType = 'physical'; // basic-attack school: 'physical' | 'magical' | 'mixed'
    
    // New combat stats
    this.critChance = 5; // Base 5%
    this.critDamage = 150; // Base 150% (1.5x multiplier)
    this.dodgeChance = 0; // Base 0%
    this.lifesteal = 0; // Base 0%
    this.hpRegen = 0; // Base 0% - % of max HP restored between rooms
    this.manaRegen = 0; // Base 0% - % of max Mana restored per second
    this.cdr = 0; // Cooldown reduction %
    
    // Skill tree bonuses (initialized to 0)
    this.skillTreeAttack = 0;
    this.skillTreeDefense = 0;
    this.skillTreeHP = 0;
    this.skillTreeMana = 0;
    this.skillTreeAttackSpeed = 0;
    this.skillTreeCritChance = 0;
    this.skillTreeCritDamage = 0;
    this.skillTreeDodge = 0;
    this.skillTreeLifesteal = 0;
    this.skillTreeHPRegen = 0;
    this.skillTreeManaRegen = 0;
    this.skillTreeCDR = 0;
                
                this.xp = 0;
                this.maxXp = 100;
                this.skillPoints = 1; // Start with 1 skill point
                this.allocatedSkillNodes = new Set([0]); // Start node always allocated
                this.skillTreeData = {
                    allocatedNodes: new Set([0]),
                    usedPoints: 0
                };
                this.equipment = {
                    weapon: null,
                    chest: null,
                    helmet: null,
                    gloves: null,
                    boots: null,
                    amulet: null,
                    belt: null,
                    ring1: null,
                    ring2: null,
                    // GDD §7.1 four stone slots — each drives an ability slot.
                    // An empty slot = dead ability per §7.1; subclasses
                    // auto-equip level-1 starter stones once they declare
                    // their gddAbilities so abilities still fire on spawn.
                    attackStone: null,
                    spell1Stone: null,
                    spell2Stone: null,
                    passiveStone: null,
                };
                this.cooldown = 0;
                // GDD §6.2 spell2 has its own independent cooldown.
                this.cooldown2 = 0;
                this.sprite = null;
                this.isAlive = true;
                // GDD §13 — passive-tree allocation. Initialised empty;
                // subclasses set the family start via _initFamilyStart()
                // once `family` is known. The center root (id 0) is a
                // layout anchor only — never auto-allocated, so cross-arm
                // travel requires explicit cross-connections (Phase 10.x).
                this.allocatedTreeNodes = new Set();
            }

// Subclasses call this after declaring `this.family` so the tree starts
// at the right family-arm root node and bonuses apply on spawn.
_initFamilyStart() {
    if (typeof PASSIVE_TREE === 'undefined' || !this.family) return;
    const start = PASSIVE_TREE.getStartNodeForFamily(this.family);
    if (start) this.allocatedTreeNodes.add(start);
    PASSIVE_TREE.applyTreeBonuses(this);
}

takeDamage(damage, damageType, floorLevel) {
    // God mode cheat - party members take no damage
    if (window.game && window.game.godModeEnabled && window.game.party.includes(this)) {
        return 0;
    }

    // GDD §4.3 mitigation: defenderDef / (defenderDef + 100 + 5×floor).
    // The floor-scaling term keeps defense relevant on deep floors but never
    // a wall. damageType selects pDef vs mDef; an undefined damageType keeps
    // the legacy single-axis behavior so old call sites are unaffected.
    if (damageType !== undefined) {
        const def = this.getEffectiveDef(damageType);
        const floor = (floorLevel ?? (window.game && window.game.dungeonFloor) ?? 0);
        const mitigation = def / (def + 100 + 5 * floor);
        damage = Math.max(1, damage * (1 - mitigation));
        // Skip the legacy reduction below since we already mitigated.
        this._gddMitigated = true;
    }

    // Prevent damage to already dead units
    if (!this.isAlive || this.hp <= 0) {
        this.hp = 0;
        this.isAlive = false;
        
        // Pet drop from boss only (1 in 100, or 1 in 10 for first pet)
        if (window.game && this.isBoss && !this._petDropped) {
            this._petDropped = true;
            
            // Check if player has any pets yet
            const hasPets = window.game.pets.length > 0 || 
                           Object.values(window.game.equippedPets).some(pet => pet !== null);
            
            // Drop rate: 1 in 10 for first pet, 1 in 100 after that
            const dropRate = hasPets ? 0.01 : 0.1;
            
            if (Math.random() < dropRate) {
                const rarity = window.game.rollPetRarity();
                const petLevel = 1; // Always drop at level 1
                const dungeonType = window.game.currentDungeon || 'everfall';
                const pet = new Pet(rarity, petLevel, dungeonType);
                window.game.pets.push(pet);
                window.game.addLog(`Found pet: ${pet.getDisplayName()}!`, 'loot');
                
                // Show popup for rare+ pets
                if (['rare', 'epic', 'legendary'].includes(rarity)) {
                    lootPopupManager.showItemPopup({
                        rarity: rarity,
                        name: pet.name,
                        slot: 'Pet',
                        level: petLevel,
                        emoji: pet.emoji
                    });
                }
            }
        }
        
        return 0;
    }
    
    // Check for dodge
    if (Math.random() * 100 < this.getTotalDodgeChance()) {
        return 'DODGE';
    }
    
    // Check for invulnerability (Warden's Aegis)
    if (this.invulnerable) {
        return 0;
    }
    
    // Calculate damage reduction from defense (diminishing returns).
    // Skipped if takeDamage was called with a damageType (already GDD-mitigated).
    let actualDamage;
    if (this._gddMitigated) {
        this._gddMitigated = false;
        actualDamage = Math.max(1, Math.floor(damage));
    } else {
        const defense = this.getTotalDefense();
        const damageReduction = defense / (defense + 100); // Returns 0-1 (0% to 100%)
        actualDamage = Math.max(1, Math.floor(damage * (1 - damageReduction)));
    }
    
    // Shield absorbs damage first
    if (this.shieldAmount && this.shieldAmount > 0) {
        if (actualDamage <= this.shieldAmount) {
            // Shield absorbs all damage
            this.shieldAmount -= actualDamage;
            return actualDamage;
        } else {
            // Shield breaks, remaining damage goes to HP
            const remainingDamage = actualDamage - this.shieldAmount;
            this.shieldAmount = 0;
            this.hp = Math.max(0, this.hp - remainingDamage);
            actualDamage = remainingDamage;
        }
    } else {
        // GDD §13 Mind Over Matter (keystone): a fraction of incoming
        // damage hits MP first; only the remainder bleeds through to HP.
        if (this.keystone_mpAbsorbsDamageFraction > 0 && this.mana > 0) {
            const fraction = this.keystone_mpAbsorbsDamageFraction;
            const mpAbsorbCap = Math.min(this.mana, actualDamage * fraction);
            this.mana = Math.max(0, this.mana - mpAbsorbCap);
            actualDamage = Math.max(0, actualDamage - mpAbsorbCap);
        }
        // No shield, damage goes directly to HP
        this.hp = Math.max(0, this.hp - actualDamage);
    }
    
    // Force HP to exactly 0 and mark as dead if HP is at or below 0
    if (this.hp <= 0) {
        this.hp = 0;
        this.isAlive = false;
        // Mark that positions changed for re-sorting
        if (window.game) window.game._unitPositionsChanged = true;
    }
    
    return actualDamage;
}

heal(amount) {
    const totalMaxHp = this.getTotalMaxHp();
    const healed = Math.min(amount, totalMaxHp - this.hp);
    this.hp += healed;
    return Math.round(healed * 100) / 100;  // Round to 2 decimal places
}

getTotalAttack() {
    let total = this.attack + this.skillTreeAttack;
    if (this.equipment.weapon) total += this.equipment.weapon.attack || 0;
    if (this.equipment.gloves) total += this.equipment.gloves.attack || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.attack || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.attack || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.attack || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.attack) {
        total = total * (1 + this.runePercentBonuses.attack / 100);
    }
    
    // Apply attack debuffs (Earthshaker's Resolve)
    if (this.attackDebuff && this.attackDebuff > 0 && this.attackDebuff < 1) {
        total = total * this.attackDebuff; // attackDebuff is a multiplier (0.6 = 40% reduction)
    }
    
    return parseFloat(total.toFixed(2));
}

getTotalDefense() {
    let total = this.defense + this.skillTreeDefense;
    if (this.equipment.weapon) total += this.equipment.weapon.defense || 0;
    if (this.equipment.chest) total += this.equipment.chest.defense || 0;
    if (this.equipment.helmet) total += this.equipment.helmet.defense || 0;
    if (this.equipment.gloves) total += this.equipment.gloves.defense || 0;
    if (this.equipment.boots) total += this.equipment.boots.defense || 0;
    if (this.equipment.belt) total += this.equipment.belt.defense || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.defense || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.defense || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.defense || 0;
    
    // Tank's taunt buff: +10 flat + percentage of defense for 5 seconds
    if (this.className === 'Tank' && this.tauntActive) {
        total += this.tauntDefenseBonus || 10;
    }
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.defense) {
        total = total * (1 + this.runePercentBonuses.defense / 100);
    }
    
    // Sacred Barrier: +30% defense
    if (this.sacredBarrierDefense) {
        total = total * (1 + this.sacredBarrierDefense);
    }
    
    // Apply defense debuffs (Assassin's Mark, Earthshaker's Resolve, etc.)
    if (this.defenseDebuff && this.defenseDebuff > 0) {
        total = Math.max(0, total - this.defenseDebuff);
    }
    
    // Cap at 999 defense
    total = Math.min(total, 999);

    return parseFloat(total.toFixed(2));
}

// Phase 7.y — generic spell2 cast. Reads gddAbilities.spell2.effects[]
// and dispatches via the EFFECTS engine. cooldown2/manaCost interpolate
// from stone level via _abilityParam. Returns the primary damage dealt
// (0 = success, utility-only). Returns -1 if spell2 not ready.
useSpell2(target) {
    const sp = this.gddAbilities && this.gddAbilities.spell2;
    if (!sp) return -1;
    const haveStone = !!(this.equipment && this.equipment.spell2Stone);
    if (!haveStone) return -1; // dead-slot
    const liveManaCost = Math.round(this._abilityParam('spell2', 'manaCost', sp.manaCost ?? 25));
    if ((this.cooldown2 || 0) > 0) return -1;
    if (this.mana < liveManaCost) return -1;
    this.mana -= liveManaCost;
    this.cooldown2 = this._abilityParam('spell2', 'cooldown', sp.baseCooldown ?? 14);

    const school = sp.school || this.damageType || 'physical';
    const baseAtk = this.getEffectiveAtk ? this.getEffectiveAtk(school) : this.attack;
    const stoneFactor = this._stoneFactor ? this._stoneFactor('spell2') : 0;
    const power = baseAtk * (sp.power || 1.0) * (0.5 + 0.5 * stoneFactor);
    this._lastAttackSchool = school;

    const game = window.game || {};
    const ctx = {
        caster: this,
        target: Array.isArray(target) ? null : target,
        targets: Array.isArray(target) ? target : (target ? [target] : []),
        party: (game.party || []).filter(m => m && m.isAlive),
        enemies: (game.enemies || []).filter(e => e && e.isAlive),
        school,
        floor: game.dungeonFloor || 0,
        power,
        notes: [],
        note(kind, who, n) { this.notes.push({ kind, who, n }); },
    };
    if (window.EFFECTS && typeof window.EFFECTS.apply === 'function') {
        return window.EFFECTS.apply(sp.effects, ctx) | 0;
    }
    if (ctx.target && ctx.target.takeDamage) {
        return ctx.target.takeDamage(power, school, ctx.floor);
    }
    return Math.floor(power);
}

// GDD §13 — allocate one passive-tree node. Honors POE-style adjacency:
// the requested node must connect to one already in the allocated set.
// Returns true on success. Costs 1 skillPoint (existing field).
allocateTreeNode(nodeId) {
    if (typeof PASSIVE_TREE === 'undefined') return false;
    if (!this.allocatedTreeNodes) this.allocatedTreeNodes = new Set();
    if (nodeId === 0) return false; // root is a layout anchor only
    if (this.allocatedTreeNodes.has(nodeId)) return false;
    if ((this.skillPoints || 0) < 1) return false;
    const adj = PASSIVE_TREE.getNodesAdjacentTo(nodeId)
        .filter(id => id !== 0); // adjacency cannot go through the root
    const connected = adj.some(id => this.allocatedTreeNodes.has(id));
    if (!connected) return false;
    this.allocatedTreeNodes.add(nodeId);
    this.skillPoints -= 1;
    PASSIVE_TREE.applyTreeBonuses(this);
    return true;
}

// Refund the entire tree (GDD §13.4 v1 free-refund). Resets back to
// the family start node and refunds 1 point per non-start allocation.
refundTree() {
    if (!this.allocatedTreeNodes) return;
    const start = (typeof PASSIVE_TREE !== 'undefined' && this.family)
        ? PASSIVE_TREE.getStartNodeForFamily(this.family)
        : null;
    const wasSize = this.allocatedTreeNodes.size;
    this.allocatedTreeNodes = new Set(start ? [start] : []);
    const refunded = Math.max(0, wasSize - this.allocatedTreeNodes.size);
    this.skillPoints = (this.skillPoints || 0) + refunded;
    if (typeof PASSIVE_TREE !== 'undefined') PASSIVE_TREE.applyTreeBonuses(this);
}

// GDD §7 — auto-equip level-1 starter stones for each ability slot the
// class has declared. Called at the end of each subclass constructor so
// that gddAbilities has been populated. Re-running is safe; existing
// stones (e.g. loaded from a save) are not overwritten.
_equipStarterStones() {
    if (!this.gddAbilities || typeof Stone === 'undefined') return;
    const SLOTS = ['attack', 'spell1', 'spell2', 'passive'];
    const SLOT_KEY = { attack: 'attackStone', spell1: 'spell1Stone', spell2: 'spell2Stone', passive: 'passiveStone' };
    const classKey = (this.className || '').toLowerCase();
    for (const slot of SLOTS) {
        const k = SLOT_KEY[slot];
        if (this.equipment[k]) continue; // already populated
        const ability = this.gddAbilities[slot];
        if (!ability) continue;
        const id = (ability.name || slot).toLowerCase().replace(/\s+/g, '_');
        this.equipment[k] = new Stone(slot, 1, classKey, id, ability.name, ability.school);
    }
}

// GDD §7.3 — interpolate a slot's effective scaling factor from its stone.
// Returns 0..1 (L1 = 0, L100 = 1). If no stone is equipped, returns 0
// (i.e. the slot is dead per §7.1). Combat call sites multiply this
// against the slot's nominal numbers (cooldown, damage power, etc.).
_stoneFactor(slot) {
    const k = { attack: 'attackStone', spell1: 'spell1Stone', spell2: 'spell2Stone', passive: 'passiveStone' }[slot];
    const s = this.equipment && this.equipment[k];
    if (!s) return 0;
    return Math.max(0, Math.min(1, ((s.stoneLevel || 1) - 1) / 99));
}

// GDD §7.3 — interpolate a per-ability parameter from its endpoints.
// Each ability may declare `endpoints: { paramName: [min, max], ... }`.
// At stone L1 we return min, at L100 we return max, with linear in
// between. If no endpoint is declared for `key`, fall back to the
// scalar `ability[key]` (this means "doesn't scale with stone level"
// which matches the GDD example where Provoke's mana cost stays 30).
//
// For abilities without ANY endpoints, two implicit defaults apply:
//   cooldown:    multiplier 2.25 (L1) → 1.0 (L100), so the same spell
//                takes 2.25× longer to come back at L1 stones.
//   manaCost:    no implicit scale (constant per GDD example).
// Concrete implicit-cooldown scaling lets stones feel meaningful even
// before per-ability endpoints are tuned.
_abilityParam(slot, key, fallback) {
    const ability = this.gddAbilities && this.gddAbilities[slot];
    if (!ability) return fallback;
    const f = this._stoneFactor(slot);
    if (ability.endpoints && ability.endpoints[key]) {
        const [lo, hi] = ability.endpoints[key];
        return lo + (hi - lo) * f;
    }
    if (key === 'cooldown' && ability.baseCooldown != null) {
        const cdMult = 2.25 - 1.25 * f; // 2.25 at L1 → 1.0 at L100
        return ability.baseCooldown * cdMult;
    }
    if (key === 'manaCost') return ability.manaCost ?? fallback;
    return fallback ?? ability[key];
}

// GDD §4.1 core stats — sum base + skill tree + equipment + rune bonuses.
// Phase 5 items roll pAtk/mAtk/pDef/mDef natively. Legacy items only carry
// the old single-axis attack/defense fields; we fall those over to pAtk/pDef
// (route to magical for magical-typed wearers) so old gear still functions.
_sumEquipStat(field, legacyField, legacyToMagical = false) {
    let total = 0;
    for (const slot in this.equipment) {
        const it = this.equipment[slot];
        if (!it) continue;
        if (it[field] !== undefined && it[field] !== 0) {
            total += it[field] || 0;
        } else if (legacyField && it[legacyField] !== undefined) {
            // Pre-Phase-5 item: route legacy attack/defense to whichever axis
            // matches the wearer's damageType.
            const isMagicalAxis = (field === 'mAtk' || field === 'mDef');
            const wantsMagical = (this.damageType === 'magical');
            if ((isMagicalAxis && wantsMagical) || (!isMagicalAxis && !wantsMagical)) {
                total += it[legacyField] || 0;
            } else if (this.damageType === 'mixed') {
                total += (it[legacyField] || 0) / 2;
            }
        }
    }
    return total;
}
getTotalPAtk() {
    let total = (this.pAtk || 0) + (this.skillTreePAtk || this.skillTreeAttack || 0);
    total += this._sumEquipStat('pAtk', 'attack');
    if (this.runePercentBonuses && this.runePercentBonuses.attack) {
        total = total * (1 + this.runePercentBonuses.attack / 100);
    }
    if (this.attackDebuff && this.attackDebuff > 0 && this.attackDebuff < 1) {
        total = total * this.attackDebuff;
    }
    return parseFloat(total.toFixed(2));
}
getTotalMAtk() {
    let total = (this.mAtk || 0) + (this.skillTreeMAtk || 0);
    total += this._sumEquipStat('mAtk', 'attack');
    if (this.runePercentBonuses && this.runePercentBonuses.attack) {
        total = total * (1 + this.runePercentBonuses.attack / 100);
    }
    if (this.attackDebuff && this.attackDebuff > 0 && this.attackDebuff < 1) {
        total = total * this.attackDebuff;
    }
    return parseFloat(total.toFixed(2));
}
getTotalPDef() {
    let total = (this.pDef || 0) + (this.skillTreePDef || this.skillTreeDefense || 0);
    total += this._sumEquipStat('pDef', 'defense');
    if (this.className === 'Tank' && this.tauntActive) total += this.tauntDefenseBonus || 10;
    if (this.runePercentBonuses && this.runePercentBonuses.defense) {
        total = total * (1 + this.runePercentBonuses.defense / 100);
    }
    if (this.sacredBarrierDefense) total = total * (1 + this.sacredBarrierDefense);
    if (this.defenseDebuff && this.defenseDebuff > 0) total = Math.max(0, total - this.defenseDebuff / 2);
    return parseFloat(Math.min(total, 999).toFixed(2));
}
getTotalMDef() {
    let total = (this.mDef || 0) + (this.skillTreeMDef || 0);
    total += this._sumEquipStat('mDef', 'defense');
    if (this.runePercentBonuses && this.runePercentBonuses.defense) {
        total = total * (1 + this.runePercentBonuses.defense / 100);
    }
    if (this.sacredBarrierDefense) total = total * (1 + this.sacredBarrierDefense);
    if (this.defenseDebuff && this.defenseDebuff > 0) total = Math.max(0, total - this.defenseDebuff / 2);
    return parseFloat(Math.min(total, 999).toFixed(2));
}
// Returns the attacker's effective ATK for the given damage type.
getEffectiveAtk(damageType) {
    if (damageType === 'magical') return this.getTotalMAtk();
    if (damageType === 'mixed') return (this.getTotalPAtk() + this.getTotalMAtk()) / 2;
    return this.getTotalPAtk();
}
// Returns the defender's effective DEF for the incoming damage type.
getEffectiveDef(damageType) {
    if (damageType === 'magical') return this.getTotalMDef();
    if (damageType === 'mixed') return (this.getTotalPDef() + this.getTotalMDef()) / 2;
    return this.getTotalPDef();
}

getTotalAttackSpeed() {
    let total = this.attackSpeed + (this.skillTreeAttackSpeed / 100);
    if (this.equipment.weapon) total += this.equipment.weapon.attackSpeed || 0;
    if (this.equipment.gloves) total += this.equipment.gloves.attackSpeed || 0;
    if (this.equipment.boots) total += this.equipment.boots.attackSpeed || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.attackSpeed || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.attackSpeed || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.attackSpeed || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.attackspeed) {
        total = total * (1 + this.runePercentBonuses.attackspeed / 100);
    }
    
    // Berserker's Pact: +100% attack speed
    if (this.berserkerActive) {
        total = total * 2.0;
    }
    
    // Righteous Fury: +35% attack speed
    if (this.righteousFuryAS) {
        total = total * (1 + this.righteousFuryAS);
    }
    
    // Cap at 5.0 attack speed
    total = Math.min(total, 5.0);
    
    return parseFloat(total.toFixed(2));
}

getTotalCritChance() {
    let total = this.critChance + this.skillTreeCritChance;
    if (this.equipment.weapon) total += this.equipment.weapon.critChance || 0;
    if (this.equipment.gloves) total += this.equipment.gloves.critChance || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.critChance || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.critChance || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.critChance || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.crit) {
        total = total + this.runePercentBonuses.crit;
    }
    
    // Cap at 100% crit chance
    total = Math.min(total, 100);
    
    return parseFloat(total.toFixed(2));
}

getTotalCritDamage() {
    let total = this.critDamage + this.skillTreeCritDamage;
    if (this.equipment.weapon) total += this.equipment.weapon.critDamage || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.critDamage || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.critDamage || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.critDamage || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.critDamage) {
        total = total + this.runePercentBonuses.critDamage;
    }
    
    return parseFloat(total.toFixed(2));
}

getTotalDodgeChance() {
    let total = this.dodgeChance + this.skillTreeDodge;
    if (this.equipment.chest) total += this.equipment.chest.dodgeChance || 0;
    if (this.equipment.boots) total += this.equipment.boots.dodgeChance || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.dodgeChance || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.dodgeChance || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.dodgeChance || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.dodge) {
        total = total + this.runePercentBonuses.dodge;
    }
    
    // Cap at 60% dodge
    total = Math.min(total, 60);
    
    return parseFloat(total.toFixed(2));
}

getTotalLifesteal() {
    let total = this.lifesteal + this.skillTreeLifesteal;
    if (this.equipment.weapon) total += this.equipment.weapon.lifesteal || 0;
    if (this.equipment.belt) total += this.equipment.belt.lifesteal || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.lifesteal || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.lifesteal || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.lifesteal || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.lifesteal) {
        total = total + this.runePercentBonuses.lifesteal;
    }
    
    // Berserker's Pact: +50% lifesteal
    if (this.berserkerActive) {
        total = total + 50;
    }
    
    // Cap at 100% lifesteal (increased cap due to berserker)
    total = Math.min(total, 100);
    
    return parseFloat(total.toFixed(2));
}

getTotalHpRegen() {
    let total = this.hpRegen + this.skillTreeHPRegen;
    if (this.equipment.chest) total += this.equipment.chest.hpRegen || 0;
    if (this.equipment.belt) total += this.equipment.belt.hpRegen || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.hpRegen || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.hpRegen || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.hpRegen || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.health) {
        // Note: health runes affect HP, not HP regen - kept separate
    }
    
    return parseFloat(total.toFixed(2));
}

getTotalManaRegen() {
    let total = this.manaRegen + this.skillTreeManaRegen;
    if (this.equipment.helmet) total += this.equipment.helmet.manaRegen || 0;
    if (this.equipment.weapon) total += this.equipment.weapon.manaRegen || 0;
    if (this.equipment.amulet) total += this.equipment.amulet.manaRegen || 0;
    if (this.equipment.ring1) total += this.equipment.ring1.manaRegen || 0;
    if (this.equipment.ring2) total += this.equipment.ring2.manaRegen || 0;
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.mana) {
        // Note: mana runes affect max mana, not mana regen - kept separate
    }
    
    return parseFloat(total.toFixed(2));
}

getTotalCDR() {
    let total = this.cdr + this.skillTreeCDR;
    if (this.equipment.helmet) total += this.equipment.helmet.cdr || 0;
    if (this.equipment.weapon && this.equipment.weapon.weaponType === 'wand') {
        total += this.equipment.weapon.cdr || 0;
    }
    if (this.equipment.weapon && this.equipment.weapon.weaponType === 'staff') {
        total += this.equipment.weapon.cdr || 0;
    }
    
    // Apply rune percentage bonuses (time runes give CDR)
    if (this.runePercentBonuses && this.runePercentBonuses.cdr) {
        total = total + this.runePercentBonuses.cdr;
    }
    
    // Cap at 80% CDR
    total = Math.min(total, 80);
    
    return parseFloat(total.toFixed(2));
}

getTotalMaxHp() {
    let total = this.maxHp + this.getMaxHpBonus();
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.health) {
        total = Math.floor(total * (1 + this.runePercentBonuses.health / 100));
    }
    
    return parseFloat(total.toFixed(2));
}

getTotalMaxMana() {
    let total = this.maxMana + this.getMaxManaBonus();
    
    // Apply rune percentage bonuses
    if (this.runePercentBonuses && this.runePercentBonuses.mana) {
        total = Math.floor(total * (1 + this.runePercentBonuses.mana / 100));
    }
    
    return parseFloat(total.toFixed(2));
}

getMaxHpBonus() {
    let bonus = this.skillTreeHP;
    if (this.equipment.weapon) bonus += this.equipment.weapon.hp || 0;
    if (this.equipment.helmet) bonus += this.equipment.helmet.hp || 0;
    if (this.equipment.gloves) bonus += this.equipment.gloves.hp || 0;
    if (this.equipment.chest) bonus += this.equipment.chest.hp || 0;
    if (this.equipment.boots) bonus += this.equipment.boots.hp || 0;
    if (this.equipment.belt) bonus += this.equipment.belt.hp || 0;
    if (this.equipment.amulet) bonus += this.equipment.amulet.hp || 0;
    if (this.equipment.ring1) bonus += this.equipment.ring1.hp || 0;
    if (this.equipment.ring2) bonus += this.equipment.ring2.hp || 0;
    return bonus;
}

getMaxManaBonus() {
    let bonus = this.skillTreeMana;
    if (this.equipment.weapon) bonus += this.equipment.weapon.mana || 0;
    if (this.equipment.helmet) bonus += this.equipment.helmet.mana || 0;
    if (this.equipment.chest) bonus += this.equipment.chest.mana || 0;
    if (this.equipment.amulet) bonus += this.equipment.amulet.mana || 0;
    if (this.equipment.ring1) bonus += this.equipment.ring1.mana || 0;
    if (this.equipment.ring2) bonus += this.equipment.ring2.mana || 0;
    return bonus;
}

            gainXP(amount) {
                // 🎉 DOUBLE XP EVENT - 1.5x XP boost!
                const xpMultiplier = 1.5;
                const boostedAmount = Math.floor(amount * xpMultiplier);
                this.xp += boostedAmount;
                while (this.xp >= this.maxXp) {
                    this.xp -= this.maxXp;
                    this.levelUp();
                }
            }

            levelUp() {
    if (this.level >= 100) return; // Level cap at 100
    
    this.level++;
    
    // STEAM: Check for max level achievement
    if (this.level >= 100 && window.trackStat) {
        window.trackStat('maxLevelReached', this.level);
    }
    
    // Base increases for all classes
    this.attack += 1;
    this.maxHp += 10;
    
    // Class-specific bonuses on level up
    switch(this.className) {
        case 'Tank':
            this.defense += 3;  // Tank gets extra defense
            this.maxHp += 2;    // Plus extra HP
            break;
            
        case 'Paladin':
            this.maxHp += 1;    // Paladin gets 1 HP
            this.maxMana += 1;  // 1 Mana
            this.defense += 1;  // 1 Defense (well-rounded)
            break;
            
        case 'Healer':
            this.maxMana += 3;  // Healer gets extra mana
            this.hpRegen += 0.5; // Plus HP regen for sustain
            break;
            
        case 'Rogue':
            this.critDamage += 0.5; // Rogue gets crit damage (multiplicative!)
            break;
            
        case 'Archer':
            this.attack += 1;      // Archer gets extra attack
            this.critChance += 0.2; // Plus crit chance
            break;
            
        case 'Mage':
            this.attack += 1;    // Mage gets extra attack
            this.maxMana += 1;   // Plus mana for spells
            break;
    }
    
    // Standard defense increase for non-tanks (0.5)
    if (this.className !== 'Tank' && this.className !== 'Paladin') {
        this.defense += 0.5;
    }
    
    // Heal to full HP/Mana
    this.hp = this.getTotalMaxHp();
    this.mana = this.getTotalMaxMana();
    
    // Grant skill point
    this.skillPoints++;
    
    // Update skill cost based on new level (scales +5 every 5 levels)
    if (this.updateSkillCost) {
        this.updateSkillCost();
    }
    
    // Exponential XP curve - slows down significantly at level 40
    let multiplier;
    if (this.level < 21) {
        multiplier = 1.27;   // Levels 1-20: UNCHANGED
    } else if (this.level < 46) {
        multiplier = 1.121;  // Levels 21-45
    } else if (this.level < 71) {
        multiplier = 1.101;  // Levels 46-70
    } else if (this.level < 91) {
        multiplier = 1.074;  // Levels 71-90
    } else {
        multiplier = 1.05;   // Levels 91-100: Slower grind to max level
    }
    this.maxXp = Math.floor(this.maxXp * multiplier);
    
    // Log level up with class-specific bonus info
    let bonusText = '';
    switch(this.className) {
        case 'Tank': bonusText = ' (+3 Def, +2 HP bonus)'; break;
        case 'Paladin': bonusText = ' (+1 HP, +1 Mana, +1 Def)'; break;
        case 'Healer': bonusText = ' (+3 Mana, +0.5 HP Regen)'; break;
        case 'Rogue': bonusText = ' (+0.5% Crit Damage)'; break;
        case 'Archer': bonusText = ' (+1 Atk, +0.2% Crit Chance)'; break;
        case 'Mage': bonusText = ' (+1 Atk, +1 Mana)'; break;
    }
    
    if (window.game) {
        window.game.addLog(`${this.name} reached level ${this.level}!${bonusText} (+1 skill point)`, 'heal');
    }
}
        }
