const DEMO_MODE = false;
const DEMO_ALLOWED_DUNGEONS = ['everfall', 'stoneforge', 'umbral', 'vault', 'runetrial', 'endlessblessings'];
const DEMO_SUFFIX = DEMO_MODE ? '_demo' : '';
const SAVE_FILE_NAME = DEMO_MODE ? 'everfall_save_demo.json' : 'everfall_save.json';
const LOCALSTORAGE_PREFIX = DEMO_MODE ? 'demo_' : '';

// All localStorage keys that need demo separation
const LS_KEYS = {
    SELECTED_PARTY: LOCALSTORAGE_PREFIX + 'selectedParty',
    CURRENT_ENDLESS_KILLS: LOCALSTORAGE_PREFIX + 'currentEndlessKills',
    HIGHEST_FLOOR: LOCALSTORAGE_PREFIX + 'highestFloorEver',
    HIGHEST_GEAR_SCORE: LOCALSTORAGE_PREFIX + 'highestGearScoreEver',
    HIGHEST_PETS: LOCALSTORAGE_PREFIX + 'highestPetsEver',
    HIGHEST_MYTHICS: LOCALSTORAGE_PREFIX + 'highestMythicsEver',
    HIGHEST_ENDLESS: LOCALSTORAGE_PREFIX + 'highestEndlessKills'
};

// Main game class - PART 2 CONTINUES
