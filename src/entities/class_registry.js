// GDD §6.3 — full 48-class roster. The 6 starters (tank/rogue/mage/healer/
// archer/paladin) keep their bespoke subclasses for spell1 mechanics; the
// remaining 42 are generated from this registry by defineClass() with a
// generic spell1 (basic damage cast on a valid target, school = ability
// school, scales off attacker's matching atk stat).
//
// Stat profiles lean by family per GDD §6.3 stat-focus tags. Per-class
// tweaks are kept light here — granular tuning per §A.1 endpoints lands
// alongside a balance pass and Phase 10 passives.

const FAMILY_BASE = {
  // family: [hp, mp, pAtk, mAtk, pDef, mDef, attackSpeed]
  tank:     [120, 40,  6,  0, 12,  5, 0.85],
  fighter:  [100, 40,  9,  0,  6,  3, 1.0],
  healer:   [ 80, 90,  0,  5,  4,  6, 1.0],
  marksman: [ 85, 50, 10,  0,  4,  3, 1.15],
  rogue:    [ 75, 55, 11,  0,  4,  2, 1.4],
  magician: [ 70,100,  0, 12,  3,  6, 0.95],
  mystic:   [ 80, 80,  2,  8,  4,  5, 1.0],
  farland:  [ 80, 65,  5,  5,  4,  4, 1.0],
};

// Damage-type lean per family (the basic-attack school).
const FAMILY_SCHOOL = {
  tank: 'physical', fighter: 'physical', marksman: 'physical', rogue: 'physical',
  healer: 'magical', magician: 'magical', mystic: 'magical', farland: 'mixed',
};

// GDD §6.3 roster. Each entry: id, displayName, family, sprite, taglines,
// 4 abilities { attack, spell1, spell2, passive }.
const CLASS_REGISTRY = [
  // ── TANKS ─────────────────────────────────────────────────────────────
  { id:'knight',    name:'Knight',    family:'tank', sprite:'Tank.png',
    tagline:'plate, sword & board', desc:'Classic protector. Taunts on hit, regens through guard.',
    abilities:{
      attack:{name:'Shield Bash',school:'physical',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Provoke',school:'physical',power:0,manaCost:30,baseCooldown:18,effects:['taunt','buff_pdef']},
      spell2:{name:'Shield Wall',school:'physical',power:0,manaCost:30,baseCooldown:30,effects:['damage_reduction_60_4s']},
      passive:{name:'Vigilant Guard',description:'+P.DEF; regen 1% HP whenever struck.'},
    }},
  { id:'crusader',  name:'Crusader',  family:'tank', sprite:'Crusader.png',
    tagline:'holy magic-tank, divine shield', desc:'Group taunt + reflect aura.',
    abilities:{
      attack:{name:'Hammer of Faith',school:'mixed',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Divine Decree',school:'magical',power:0,manaCost:35,baseCooldown:24,effects:['taunt_all_3s','party_buff_mdef']},
      spell2:{name:'Consecrated Ground',school:'magical',power:0.4,manaCost:30,baseCooldown:18,effects:['heal_pulse_aoe','reflect_20_mag']},
      passive:{name:'Sacred Aegis',description:'M.DEF scales with HP missing (max +50% at 1 HP).'},
    }},
  { id:'sentinel',  name:'Sentinel',  family:'tank', sprite:'Sentinel.png',
    tagline:'spell-tank, mana shield', desc:'Magical-damage absorber.',
    abilities:{
      attack:{name:'Runic Strike',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['slow']},
      spell1:{name:'Mana Bulwark',school:'magical',power:0,manaCost:40,baseCooldown:24,effects:['mag_dmg_to_mp_6s']},
      spell2:{name:'Banishment Sigil',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['taunt_silence_3s']},
      passive:{name:'Spell Eater',description:'Overhealing converts to MP at 50% rate.'},
    }},
  { id:'warden',    name:'Warden',    family:'tank', sprite:'Warden.png',
    tagline:'nature tank, thorns and roots', desc:'Bramble-coated frontline.',
    abilities:{
      attack:{name:'Bramble Slam',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['bleed']},
      spell1:{name:'Earthen Roar',school:'physical',power:0,manaCost:30,baseCooldown:20,effects:['taunt_all','slow_4s']},
      spell2:{name:'Thornwall',school:'physical',power:0,manaCost:30,baseCooldown:24,effects:['reflect_30_phys_6s']},
      passive:{name:'Deep Roots',description:'Immune to displacement; +HP regen out of combat.'},
    }},
  { id:'juggernaut',name:'Juggernaut',family:'tank', sprite:'Juggernaut.png',
    tagline:'immovable wall', desc:'AoE cleave + last-stand defense.',
    abilities:{
      attack:{name:'Cleave',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['hits_2_adjacent']},
      spell1:{name:'Unbreakable',school:'physical',power:0,manaCost:30,baseCooldown:24,effects:['cc_immune_4s','taunt_on_hit']},
      spell2:{name:'Quaking Stomp',school:'physical',power:1.4,manaCost:30,baseCooldown:18,effects:['aoe','taunt_2s']},
      passive:{name:'Last Stand',description:'Under 30% HP, +50% all defenses.'},
    }},
  { id:'shieldmage',name:'Shieldmage',family:'tank', sprite:'Bulwark.png',
    tagline:'hybrid mana-shield magic tank', desc:'MP-shielded magic tank.',
    abilities:{
      attack:{name:'Aether Bolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['brief_taunt']},
      spell1:{name:'Arcane Barrier',school:'magical',power:0,manaCost:30,baseCooldown:20,effects:['shield_eq_pct_max_mp']},
      spell2:{name:'Pull',school:'magical',power:0,manaCost:25,baseCooldown:14,effects:['yank_to_row_taunt_3s']},
      passive:{name:'Mana Armor',description:'Incoming damage reduced by % current MP / 2.'},
    }},

  // ── FIGHTERS ──────────────────────────────────────────────────────────
  { id:'berserker', name:'Berserker', family:'fighter', sprite:'Berserker.png',
    tagline:'rage, glass cannon melee', desc:'Damage scales with missing HP.',
    abilities:{
      attack:{name:'Reaving Strike',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['rage_stack']},
      spell1:{name:'Bloodthirst',school:'physical',power:0,manaCost:25,baseCooldown:18,effects:['heal_50pct_dmg_6s']},
      spell2:{name:'Whirlwind',school:'physical',power:1.5,manaCost:35,baseCooldown:14,effects:['aoe','consume_rage']},
      passive:{name:'Unbridled Fury',description:'+5% P.ATK per missing 10% HP.'},
    }},
  { id:'gladiator', name:'Gladiator', family:'fighter', sprite:'Valkyrie.png',
    tagline:'crowd-pleaser, brief taunt', desc:'Hard hitter w/ short taunts.',
    abilities:{
      attack:{name:'Crowd Strike',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['taunt_target_2s']},
      spell1:{name:'Net Cast',school:'physical',power:1.1,manaCost:25,baseCooldown:14,effects:['root']},
      spell2:{name:'Showmanship',school:'physical',power:0,manaCost:30,baseCooldown:24,effects:['party_crit_dmg_buff_5s']},
      passive:{name:'Arena Veteran',description:'+15% P.ATK & P.DEF when 3+ enemies present.'},
    }},
  { id:'samurai',   name:'Samurai',   family:'fighter', sprite:'Samurai.png',
    tagline:'crit & parry', desc:'Wind-up to a guaranteed crit.',
    abilities:{
      attack:{name:'Iaijutsu',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['plus_crit_chance']},
      spell1:{name:'Wave Slash',school:'physical',power:1.4,manaCost:25,baseCooldown:12,effects:['line_aoe']},
      spell2:{name:'Meditation',school:'physical',power:0,manaCost:30,baseCooldown:18,effects:['next_attack_guaranteed_crit']},
      passive:{name:'Bushido',description:'Parry chance scales with P.ATK; parried hits return damage.'},
    }},
  { id:'monk',      name:'Monk',      family:'fighter', sprite:'Monk.png',
    tagline:'speed, combo, ki', desc:'Fast attacks; combo finisher.',
    abilities:{
      attack:{name:'Flurry',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['3_fast_hits','combo_stack']},
      spell1:{name:'Tiger Palm',school:'physical',power:1.6,manaCost:25,baseCooldown:8,effects:['consume_combo']},
      spell2:{name:'Inner Peace',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['self_regen_cleanse']},
      passive:{name:'Way of the Open Hand',description:'Attack speed scales with missing MP %.'},
    }},
  { id:'spellblade',name:'Spellblade',family:'fighter', sprite:'Spellblade.png',
    tagline:'hybrid melee, brief taunt', desc:'Crosses physical and magical scaling.',
    abilities:{
      attack:{name:'Enchanted Edge',school:'mixed',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Phase Slash',school:'magical',power:1.5,manaCost:25,baseCooldown:10,effects:['teleport_behind']},
      spell2:{name:'Aetheric Challenge',school:'magical',power:1.0,manaCost:25,baseCooldown:14,effects:['taunt_3s']},
      passive:{name:'Arcane Edge',description:'P.ATK contributes 50% of its value to M.ATK (and vice versa).'},
    }},
  { id:'paladin',   name:'Paladin',   family:'fighter', sprite:'Paladin.png',
    tagline:'holy fighter, brief group taunt', desc:'Hybrid striker with party aura.',
    abilities:{
      attack:{name:'Smite',school:'mixed',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Word of Glory',school:'magical',power:0,manaCost:25,baseCooldown:12,effects:['heal_party_small','aura_taunt_2s']},
      spell2:{name:'Hammer of Justice',school:'physical',power:1.6,manaCost:30,baseCooldown:14,effects:['stun']},
      passive:{name:'Aura of Valor',description:'Party +5% all attack while alive.'},
    }},

  // ── HEALERS ───────────────────────────────────────────────────────────
  { id:'cleric',    name:'Cleric',    family:'healer', sprite:'Healer.png',
    tagline:'standard holy healer', desc:'HoT primary heal + group mend.',
    abilities:{
      attack:{name:'Holy Bolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Greater Heal',school:'magical',power:0,manaCost:20,baseCooldown:8,effects:['heal_target_hot']},
      spell2:{name:'Group Mend',school:'magical',power:0,manaCost:35,baseCooldown:18,effects:['heal_party']},
      passive:{name:'Devout',description:'Overhealing converts to MP at 50%.'},
    }},
  { id:'druid',     name:'Druid',     family:'healer', sprite:'Druid.png',
    tagline:'HoT specialist', desc:'Stacking regen + party HoT.',
    abilities:{
      attack:{name:'Wrath',school:'magical',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Rejuvenation',school:'magical',power:0,manaCost:20,baseCooldown:8,effects:['hot_8_ticks']},
      spell2:{name:'Wild Growth',school:'magical',power:0,manaCost:40,baseCooldown:24,effects:['hot_party']},
      passive:{name:'Living Seed',description:'HoTs that complete heal nearest ally for 50% of the tick.'},
    }},
  { id:'templar',   name:'Templar',   family:'healer', sprite:'Templar.png',
    tagline:'low heals, big buffs', desc:'Buff-driven support.',
    abilities:{
      attack:{name:'Smite Lite',school:'magical',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Blessed Ward',school:'magical',power:0,manaCost:20,baseCooldown:10,effects:['heal_target_small','buff_mdef_6s']},
      spell2:{name:'Sanctuary',school:'magical',power:0,manaCost:35,baseCooldown:20,effects:['heal_target_immune_1s']},
      passive:{name:'Resolve Through Faith',description:'Each heal you cast reduces target threat by 5%.'},
    }},
  { id:'oracle',    name:'Oracle',    family:'healer', sprite:'Oracle.png',
    tagline:'cleanse + foresight', desc:'Utility healer.',
    abilities:{
      attack:{name:'Mind Pierce',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['ignore_partial_mdef']},
      spell1:{name:'Cleansing Light',school:'magical',power:0,manaCost:20,baseCooldown:8,effects:['cleanse','heal_small']},
      spell2:{name:'Foresight',school:'magical',power:0,manaCost:30,baseCooldown:24,effects:['next_attack_dodged_5s']},
      passive:{name:'Tides of Fate',description:'Random 10% chance heals critically (×2).'},
    }},
  { id:'bloodpriest',name:'Bloodpriest',family:'healer',sprite:'Bloodpriest.png',
    tagline:'heals via damage dealt', desc:'Offensive healer.',
    abilities:{
      attack:{name:'Crimson Lash',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['heal_lowest_50_pct_dmg']},
      spell1:{name:'Sanguine Bond',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['link_party_dmg_heals_target']},
      spell2:{name:'Hemorrhage',school:'magical',power:1.4,manaCost:30,baseCooldown:14,effects:['heal_on_struck']},
      passive:{name:'Vital Exchange',description:'Every 30s, sacrifice 5% own HP to grant 10% party HP.'},
    }},
  { id:'lifebinder',name:'Lifebinder',family:'healer', sprite:'Apothecary.png',
    tagline:'chain heals & damage-splitting', desc:'Damage-redirect + chain heal.',
    abilities:{
      attack:{name:'Soul Tether',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['mark']},
      spell1:{name:'Chain Mend',school:'magical',power:0,manaCost:30,baseCooldown:14,effects:['heal_jumps_3']},
      spell2:{name:'Communion',school:'magical',power:0,manaCost:35,baseCooldown:20,effects:['split_dmg_50_50']},
      passive:{name:'Tethered Souls',description:'On lethal, transfer 25% HP to save ally (60s CD).'},
    }},

  // ── MARKSMEN ──────────────────────────────────────────────────────────
  { id:'archer',    name:'Archer',    family:'marksman', sprite:'Archer.png',
    tagline:'versatile bow', desc:'Generalist ranged DPS.',
    abilities:{
      attack:{name:'Quick Shot',school:'physical',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Multishot',school:'physical',power:0.8,manaCost:20,baseCooldown:8,effects:['hits_3_random']},
      spell2:{name:'Piercing Arrow',school:'physical',power:1.5,manaCost:30,baseCooldown:12,effects:['line_aoe','ignore_50_pdef']},
      passive:{name:'Eagle Eye',description:'+crit chance vs enemies above 80% HP.'},
    }},
  { id:'crossbowman',name:'Crossbowman',family:'marksman',sprite:'Crossbowman.png',
    tagline:'slow, heavy, armor pierce', desc:'High-impact slow shots.',
    abilities:{
      attack:{name:'Bolt',school:'physical',power:1.4,manaCost:0,baseCooldown:0},
      spell1:{name:'Armor Piercing Shot',school:'physical',power:1.6,manaCost:25,baseCooldown:12,effects:['ignore_all_pdef']},
      spell2:{name:'Repeater Burst',school:'physical',power:0.6,manaCost:40,baseCooldown:18,effects:['5_fast_then_reload']},
      passive:{name:'Heavy Draw',description:'Longer cooldowns deal more damage (idle attack timer = bonus).'},
    }},
  { id:'sniper',    name:'Sniper',    family:'marksman', sprite:'Sniper.png',
    tagline:'patient, mark & headshot', desc:'Mark + execute single targets.',
    abilities:{
      attack:{name:'Marked Shot',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['mark_20_pct_taken']},
      spell1:{name:'Headshot',school:'physical',power:2.5,manaCost:30,baseCooldown:14,effects:['only_marked']},
      spell2:{name:'Camouflage',school:'physical',power:0,manaCost:35,baseCooldown:24,effects:['party_untargetable_2s']},
      passive:{name:'Patience',description:'Every 5s without attacking, next shot is a guaranteed crit.'},
    }},
  { id:'hunter',    name:'Hunter',    family:'marksman', sprite:'Beastmaster2.png',
    tagline:'beast companion', desc:'Pet-supported ranged.',
    abilities:{
      attack:{name:'Aimed Shot',school:'physical',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Beast Strike',school:'physical',power:1.4,manaCost:25,baseCooldown:10,effects:['pet_attack']},
      spell2:{name:'Trap',school:'physical',power:0,manaCost:25,baseCooldown:18,effects:['root_area_4s']},
      passive:{name:'Loyal Beast',description:'Companion has 50% your stats and auto-attacks alongside.'},
    }},
  { id:'gunner',    name:'Gunner',    family:'marksman', sprite:'Gunslinger.png',
    tagline:'fast multishot AoE', desc:'Spray-and-pray ranged.',
    abilities:{
      attack:{name:'Trick Shot',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['ricochet_1']},
      spell1:{name:'Spray and Pray',school:'physical',power:0.5,manaCost:30,baseCooldown:14,effects:['rapid_fire_3s']},
      spell2:{name:'Grenade',school:'physical',power:1.6,manaCost:30,baseCooldown:18,effects:['aoe','brief_stun']},
      passive:{name:'Hot Hand',description:'Consecutive hits build attack speed (max +50%, decays out of combat).'},
    }},
  { id:'falconer',  name:'Falconer',  family:'marksman', sprite:'Dragoon.png',
    tagline:'bird scout, dive bombs', desc:'Dive-bomb crits + party dodge.',
    abilities:{
      attack:{name:'Talon Strike',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['bleed']},
      spell1:{name:'Dive Bomb',school:'physical',power:1.5,manaCost:25,baseCooldown:12,effects:['target_plus_adjacent']},
      spell2:{name:'Sky Watch',school:'physical',power:0,manaCost:30,baseCooldown:24,effects:['party_dodge_5s']},
      passive:{name:'Keen Sight',description:'Party +5% crit chance while alive.'},
    }},

  // ── ROGUES ────────────────────────────────────────────────────────────
  { id:'assassin',  name:'Assassin',  family:'rogue', sprite:'Rogue.png',
    tagline:'single-target burst', desc:'Burst executioner.',
    abilities:{
      attack:{name:'Backstab',school:'physical',power:1.2,manaCost:0,baseCooldown:0,effects:['plus_200_pct_crit_dmg']},
      spell1:{name:'Vanish',school:'physical',power:0,manaCost:30,baseCooldown:18,effects:['untargetable_3s','double_dmg_next']},
      spell2:{name:'Throat Slit',school:'physical',power:2.0,manaCost:35,baseCooldown:14,effects:['plus_50_pct_under_30_hp']},
      passive:{name:'Shadow Step',description:'After a kill, +100% attack speed for 2s.'},
    }},
  { id:'duelist',   name:'Duelist',   family:'rogue', sprite:'Duelist.png',
    tagline:'sustained 1v1', desc:'Riposte specialist.',
    abilities:{
      attack:{name:'Riposte Stab',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['refund_cd_on_dodge']},
      spell1:{name:'Lunge',school:'physical',power:1.3,manaCost:20,baseCooldown:8,effects:['gap_close','bleed']},
      spell2:{name:'Honor Duel',school:'physical',power:0,manaCost:30,baseCooldown:20,effects:['lock_target_30_pct_each_8s']},
      passive:{name:'Parry Stance',description:'Dodge chance scales with P.ATK.'},
    }},
  { id:'shadowdancer',name:'Shadowdancer',family:'rogue',sprite:'Shadowdancer.png',
    tagline:'mobility, dodge stacks', desc:'Dodge-stacking ghost.',
    abilities:{
      attack:{name:'Twin Fangs',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['2_fast_hits']},
      spell1:{name:'Smoke Step',school:'physical',power:0,manaCost:25,baseCooldown:12,effects:['auto_dodge_next_2']},
      spell2:{name:'Shadow Clone',school:'physical',power:0,manaCost:35,baseCooldown:18,effects:['mirror_basic_4s']},
      passive:{name:'Liquid Movement',description:'Each successful dodge grants +5% attack speed (stacking).'},
    }},
  { id:'trickster', name:'Trickster', family:'rogue', sprite:'Saboteur.png',
    tagline:'status effects galore', desc:'Random debuffs + sabotage.',
    abilities:{
      attack:{name:'Tainted Blade',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['random_debuff']},
      spell1:{name:'Smoke Bomb',school:'physical',power:0,manaCost:25,baseCooldown:14,effects:['party_dodge_4s']},
      spell2:{name:'Sabotage',school:'physical',power:0,manaCost:30,baseCooldown:18,effects:['target_atk_minus_30_pct_5s']},
      passive:{name:'Mischief',description:'Debuffs you apply last 50% longer.'},
    }},
  { id:'bladestorm',name:'Bladestorm',family:'rogue', sprite:'Ninja.png',
    tagline:'multi-hit AoE rogue', desc:'Whirling AoE.',
    abilities:{
      attack:{name:'Crossblade',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['hits_adjacent']},
      spell1:{name:'Whirling Death',school:'physical',power:1.6,manaCost:30,baseCooldown:14,effects:['channeled_aoe_3s']},
      spell2:{name:'Glaive Throw',school:'physical',power:1.4,manaCost:25,baseCooldown:10,effects:['boomerang_2_hits']},
      passive:{name:'Steel Tornado',description:'When 3+ enemies, each hit grants +2% attack speed (max +30%).'},
    }},
  { id:'reaper',    name:'Reaper',    family:'rogue', sprite:'DeathKnight.png',
    tagline:'death-themed kill bonuses', desc:'Snowballs on kills.',
    abilities:{
      attack:{name:'Soul Cleave',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['heal_on_kill']},
      spell1:{name:"Death's Scythe",school:'physical',power:1.6,manaCost:30,baseCooldown:14,effects:['line_aoe','scale_with_kills']},
      spell2:{name:'Reaping',school:'physical',power:99,manaCost:30,baseCooldown:20,effects:['execute_under_15_hp']},
      passive:{name:'Harvest',description:'Stacking +P.ATK per kill, resets each floor.'},
    }},

  // ── MAGICIANS ─────────────────────────────────────────────────────────
  { id:'pyromancer',name:'Pyromancer',family:'magician',sprite:'Pyromancer.png',
    tagline:'fire DoTs', desc:'Burn stacks + detonate.',
    abilities:{
      attack:{name:'Firebolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['ignite_4s']},
      spell1:{name:'Fireball',school:'magical',power:1.6,manaCost:20,baseCooldown:6,effects:['aoe','burn_stack']},
      spell2:{name:'Combustion',school:'magical',power:0,manaCost:35,baseCooldown:14,effects:['detonate_burns_x1_5']},
      passive:{name:'Heat Wave',description:'Each ignited enemy grants +5% M.ATK.'},
    }},
  { id:'cryomancer',name:'Cryomancer',family:'magician',sprite:'Cryomancer.png',
    tagline:'ice control', desc:'Slow + freeze.',
    abilities:{
      attack:{name:'Frostbolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['slow_30']},
      spell1:{name:'Blizzard',school:'magical',power:1.4,manaCost:30,baseCooldown:14,effects:['aoe','stacking_slow']},
      spell2:{name:'Frozen Tomb',school:'magical',power:1.2,manaCost:30,baseCooldown:18,effects:['freeze_3s']},
      passive:{name:'Glacial Force',description:'+30% damage to slowed/frozen targets.'},
    }},
  { id:'stormcaller',name:'Stormcaller',family:'magician',sprite:'Stormcaller.png',
    tagline:'lightning chains', desc:'Chains and storm.',
    abilities:{
      attack:{name:'Spark',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['jump_to_nearest']},
      spell1:{name:'Chain Lightning',school:'magical',power:1.4,manaCost:30,baseCooldown:12,effects:['jumps_5_minus_10_each']},
      spell2:{name:'Thunderstorm',school:'magical',power:0.8,manaCost:35,baseCooldown:18,effects:['random_strikes_4s']},
      passive:{name:'Static Field',description:'Every cast leaves a charge; 3 charges = next cast is free.'},
    }},
  { id:'arcanist',  name:'Arcanist',  family:'magician', sprite:'Mage.png',
    tagline:'pure burst caster', desc:'Mana-fueled missiles.',
    abilities:{
      attack:{name:'Arcane Missile',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['fires_3']},
      spell1:{name:'Arcane Blast',school:'magical',power:2.0,manaCost:35,baseCooldown:10,effects:['heavy_costs_charge']},
      spell2:{name:'Mana Surge',school:'magical',power:0,manaCost:30,baseCooldown:20,effects:['refund_50_mp_4s']},
      passive:{name:'Arcane Mind',description:'+M.ATK proportional to current MP %.'},
    }},
  { id:'necromancer',name:'Necromancer',family:'magician',sprite:'Necromancer.png',
    tagline:'summons, drain', desc:'Corpse + minion play.',
    abilities:{
      attack:{name:'Death Bolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['corpse_on_kill']},
      spell1:{name:'Raise Skeleton',school:'magical',power:0,manaCost:25,baseCooldown:12,effects:['minion_10s']},
      spell2:{name:'Life Drain',school:'magical',power:1.2,manaCost:30,baseCooldown:14,effects:['heal_self_50_pct_dmg']},
      passive:{name:'Master of the Dead',description:'Minions live 4s longer; on death they explode for AoE mag.'},
    }},
  { id:'chronomancer',name:'Chronomancer',family:'magician',sprite:'Chronomancer.png',
    tagline:'time, cooldown manipulation', desc:'Cooldown weaver.',
    abilities:{
      attack:{name:'Time Bolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['slow_target_cd']},
      spell1:{name:'Rewind',school:'magical',power:0,manaCost:30,baseCooldown:24,effects:['reset_ally_cds']},
      spell2:{name:'Time Stop',school:'magical',power:0,manaCost:40,baseCooldown:30,effects:['freeze_all_enemies_2s']},
      passive:{name:'Temporal Mastery',description:'Party gains 10% cooldown reduction.'},
    }},

  // ── MYSTICS ───────────────────────────────────────────────────────────
  { id:'bard',      name:'Bard',      family:'mystic', sprite:'Bard.png',
    tagline:'buff songs', desc:'Song of party empowerment.',
    abilities:{
      attack:{name:'Sound Wave',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['small_aoe_mag']},
      spell1:{name:'Song of Valor',school:'magical',power:0,manaCost:25,baseCooldown:14,effects:['party_atk_plus_20_8s']},
      spell2:{name:'Crescendo',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['consume_song_party_heal']},
      passive:{name:'Inspiring Presence',description:'Passive +5% party attack speed.'},
    }},
  { id:'witch',     name:'Witch',     family:'mystic', sprite:'Bloodmage.png',
    tagline:'curses and hexes', desc:'Curse-driven debuffs.',
    abilities:{
      attack:{name:'Hex Bolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['random_curse']},
      spell1:{name:'Curse of Frailty',school:'magical',power:0,manaCost:25,baseCooldown:12,effects:['target_minus_50_def_6s']},
      spell2:{name:'Hex Toad',school:'magical',power:0,manaCost:35,baseCooldown:24,effects:['pacifist_4s']},
      passive:{name:'Cackling',description:'Cursed enemies grant party +MP regen on hit.'},
    }},
  { id:'shaman',    name:'Shaman',    family:'mystic', sprite:'Shaman.png',
    tagline:'totems', desc:'Totem-based control.',
    abilities:{
      attack:{name:'Totemic Strike',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['places_totem']},
      spell1:{name:'Earth Totem',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['taunt_aoe_4s']},
      spell2:{name:'Healing Totem',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['party_hot_4s']},
      passive:{name:'Spirit Link',description:'Your totems also grant party +element resist.'},
    }},
  { id:'inquisitor',name:'Inquisitor',family:'mystic', sprite:'Inquisitor.png',
    tagline:'anti-magic', desc:'Silence + spell-immunity.',
    abilities:{
      attack:{name:'Holy Bolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['dispel_1_buff']},
      spell1:{name:'Mantra of Silence',school:'magical',power:0,manaCost:25,baseCooldown:14,effects:['silence_3s']},
      spell2:{name:'Anti-Magic Field',school:'magical',power:0,manaCost:40,baseCooldown:30,effects:['party_immune_spell_2s']},
      passive:{name:'Sanctified',description:'Party +M.DEF and +20% debuff resist.'},
    }},
  { id:'spiritualist',name:'Spiritualist',family:'mystic',sprite:'Spiritualist.png',
    tagline:'channel ancestral spirits', desc:'Spirit-buff support.',
    abilities:{
      attack:{name:'Ghost Bolt',school:'magical',power:1.0,manaCost:0,baseCooldown:0,effects:['mark']},
      spell1:{name:'Spirit of the Bear',school:'magical',power:0,manaCost:25,baseCooldown:14,effects:['target_plus_30_pct_max_hp_6s']},
      spell2:{name:'Spirit of the Wolf',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['party_atk_speed_5s']},
      passive:{name:'Ancestral Wisdom',description:'+50% mana regen for entire party.'},
    }},
  { id:'geomancer', name:'Geomancer', family:'mystic', sprite:'Geomancer.png',
    tagline:'earth, terrain', desc:'Earth-bound bruiser-mage.',
    abilities:{
      attack:{name:'Stone Throw',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['scales_with_matk']},
      spell1:{name:'Earthquake',school:'physical',power:1.4,manaCost:30,baseCooldown:14,effects:['aoe','slow','taunt_1s']},
      spell2:{name:'Stone Skin',school:'magical',power:0,manaCost:25,baseCooldown:18,effects:['target_plus_pdef_5s']},
      passive:{name:"Mountain's Heart",description:'Your HP scales with M.ATK.'},
    }},

  // ── FAR LANDS ─────────────────────────────────────────────────────────
  { id:'engineer',  name:'Engineer',  family:'farland', sprite:'Engineer.png',
    tagline:'turrets, traps', desc:'Deployables.',
    abilities:{
      attack:{name:'Wrench Toss',school:'mixed',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Deploy Turret',school:'physical',power:0,manaCost:30,baseCooldown:18,effects:['turret_12s']},
      spell2:{name:'Spike Trap',school:'physical',power:1.4,manaCost:25,baseCooldown:14,effects:['delayed_aoe_8s']},
      passive:{name:'Tinkerer',description:'Your deployables last 50% longer.'},
    }},
  { id:'alchemist', name:'Alchemist', family:'farland', sprite:'Alchemist.png',
    tagline:'potions, transmutation', desc:'Potion-based RNG.',
    abilities:{
      attack:{name:'Acid Splash',school:'magical',power:0.8,manaCost:0,baseCooldown:0,effects:['aoe_corrode_pdef']},
      spell1:{name:'Healing Elixir',school:'magical',power:0,manaCost:25,baseCooldown:14,effects:['heal_cleanse_target']},
      spell2:{name:'Volatile Mixture',school:'magical',power:1.2,manaCost:30,baseCooldown:18,effects:['random_outcome']},
      passive:{name:'Transmutation',description:'Small chance dropped Stones come at +1 level.'},
    }},
  { id:'beastmaster',name:'Beastmaster',family:'farland',sprite:'Beastmaster.png',
    tagline:'multi-pet', desc:'Pack-driven companion master.',
    abilities:{
      attack:{name:'Whip Crack',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['signal_pets']},
      spell1:{name:'Pack Hunt',school:'physical',power:0,manaCost:30,baseCooldown:18,effects:['summon_3_wolves_6s']},
      spell2:{name:'Bear Companion',school:'physical',power:0,manaCost:35,baseCooldown:24,effects:['bear_taunts_8s']},
      passive:{name:'Pack Leader',description:'All your summons inherit 30% your stats.'},
    }},
  { id:'astromancer',name:'Astromancer',family:'farland',sprite:'Astromancer.png',
    tagline:'star alignments', desc:'Day/Night cycle.',
    abilities:{
      attack:{name:'Star Shard',school:'magical',power:1.0,manaCost:0,baseCooldown:0},
      spell1:{name:'Solar Flare',school:'magical',power:1.4,manaCost:30,baseCooldown:14,effects:['aoe','crit_in_day']},
      spell2:{name:'Lunar Veil',school:'magical',power:0,manaCost:30,baseCooldown:18,effects:['party_hot','crit_in_night']},
      passive:{name:'Cosmic Cycle',description:'Day/Night every 8s; bonuses match phase.'},
    }},
  { id:'sandwalker',name:'Sandwalker',family:'farland', sprite:'Sandwalker.png',
    tagline:'mirages, blind', desc:'Mirage decoys + blind.',
    abilities:{
      attack:{name:'Sand Slash',school:'physical',power:1.0,manaCost:0,baseCooldown:0,effects:['blind_1s']},
      spell1:{name:'Mirage',school:'physical',power:0,manaCost:25,baseCooldown:18,effects:['2_illusory_copies']},
      spell2:{name:'Sandstorm',school:'magical',power:1.2,manaCost:30,baseCooldown:14,effects:['aoe','reduce_enemy_hit']},
      passive:{name:'Desert Resilience',description:'Regen 1% HP/sec; doubled while target is blinded.'},
    }},
  { id:'voidcaller',name:'Voidcaller',family:'farland', sprite:'Warlock.png',
    tagline:'risk/reward dark magic', desc:'Self-damaging caster.',
    abilities:{
      attack:{name:'Void Bolt',school:'magical',power:1.2,manaCost:0,baseCooldown:0,effects:['costs_1_pct_self_hp']},
      spell1:{name:'Sacrifice',school:'magical',power:0,manaCost:0,baseCooldown:14,effects:['lose_20_hp_plus_50_matk_6s']},
      spell2:{name:'Abyssal Maw',school:'magical',power:1.6,manaCost:30,baseCooldown:18,effects:['channeled_pull_aoe_drains_self']},
      passive:{name:'From Below',description:'Under 50% HP, +M.ATK = (% HP missing).'},
    }},
];

// Look up a class entry by id.
function getClassEntry(id) {
  return CLASS_REGISTRY.find(c => c.id === id) || null;
}

// Build a Character subclass from a registry entry. Used for the 42
// non-starter classes; the 6 starters keep their bespoke subclasses.
function defineClass(entry) {
  const [hp, mp, pAtk, mAtk, pDef, mDef, atkSpd] = FAMILY_BASE[entry.family];
  const className = entry.name;
  return class extends Character {
    constructor() {
      // Single-axis legacy values: route attack→pAtk and defense→pDef so old
      // combat code that reads .attack/.defense still gets meaningful numbers.
      const legacyAtk = pAtk + mAtk;
      const legacyDef = pDef + mDef;
      super(className, className, 1, hp, mp, legacyAtk, legacyDef, atkSpd);
      this.pAtk = pAtk; this.mAtk = mAtk;
      this.pDef = pDef; this.mDef = mDef;
      this.damageType = entry.abilities.attack.school || FAMILY_SCHOOL[entry.family] || 'physical';
      this.family = entry.family;
      this.classId = entry.id;
      this.spritePath = `assets/sprites/sheets/${entry.sprite}`;
      this.gddAbilities = entry.abilities;
      // Generic spell1: cast on a valid enemy, deal `power × eff_atk`.
      this.skillName = entry.abilities.spell1.name;
      this.baseManaSkillCost = entry.abilities.spell1.manaCost ?? 25;
      this.skillCost = this.baseManaSkillCost;
      this.maxCooldown = entry.abilities.spell1.baseCooldown ?? 14;
      this._equipStarterStones();
    }
    updateSkillCost() {
      const inc = Math.floor(this.level / 5) * 5;
      this.skillCost = this.baseManaSkillCost + inc;
    }
    // Generic spell1 — fires a single damage ability per the entry's
    // gddAbilities.spell1 metadata. Bespoke implementations (Tank's
    // Provoke, Mage's Fireball AoE, Healer's Heal) live in the existing
    // hand-written subclasses and override this.
    useSkill(target) {
      this.updateSkillCost();
      if (this.cooldown !== 0 || this.mana < this.skillCost) return 0;
      this.mana -= this.skillCost;
      this.cooldown = this.maxCooldown;
      const sp = this.gddAbilities && this.gddAbilities.spell1;
      if (!sp) return 0;
      const school = sp.school || this.damageType || 'physical';
      const baseAtk = this.getEffectiveAtk ? this.getEffectiveAtk(school) : this.attack;
      const stoneFactor = this._stoneFactor ? this._stoneFactor('spell1') : 0;
      const power = (sp.power || 1.0) * (0.5 + 0.5 * stoneFactor);
      const damage = baseAtk * power;
      this._lastAttackSchool = school;
      // If a target is provided, deal damage directly. Otherwise return
      // the computed damage so the combat tick can route it.
      if (target && target.takeDamage) {
        return target.takeDamage(damage, school, window.game?.dungeonFloor || 0);
      }
      return Math.floor(damage);
    }
  };
}

// Build constructors for every entry. Bespoke starters (Tank, Rogue, Mage,
// Healer, Archer, Paladin) override the generic factory output below.
const CLASS_CONSTRUCTORS = {};
for (const entry of CLASS_REGISTRY) {
  CLASS_CONSTRUCTORS[entry.id] = defineClass(entry);
}
// Bespoke starters by their id mapping to the existing hand-written class.
// These keep the existing useSkill mechanics (Tank taunt, Mage fireball
// AoE, etc.) without depending on the generic.
if (typeof Tank !== 'undefined')    CLASS_CONSTRUCTORS.knight   = Tank;
if (typeof Rogue !== 'undefined')   CLASS_CONSTRUCTORS.assassin = Rogue;
if (typeof Mage !== 'undefined')    CLASS_CONSTRUCTORS.arcanist = Mage;
if (typeof Healer !== 'undefined')  CLASS_CONSTRUCTORS.cleric   = Healer;
if (typeof Archer !== 'undefined')  CLASS_CONSTRUCTORS.archer   = Archer;
if (typeof Paladin !== 'undefined') CLASS_CONSTRUCTORS.paladin  = Paladin;

// Aliases for legacy save files that still use the original 6 internal ids.
CLASS_CONSTRUCTORS.tank   = CLASS_CONSTRUCTORS.knight   || CLASS_CONSTRUCTORS.knight;
CLASS_CONSTRUCTORS.rogue  = CLASS_CONSTRUCTORS.assassin || CLASS_CONSTRUCTORS.assassin;
CLASS_CONSTRUCTORS.mage   = CLASS_CONSTRUCTORS.arcanist || CLASS_CONSTRUCTORS.arcanist;
CLASS_CONSTRUCTORS.healer = CLASS_CONSTRUCTORS.cleric   || CLASS_CONSTRUCTORS.cleric;

window.CLASS_REGISTRY = CLASS_REGISTRY;
window.CLASS_CONSTRUCTORS = CLASS_CONSTRUCTORS;
window.getClassEntry = getClassEntry;
