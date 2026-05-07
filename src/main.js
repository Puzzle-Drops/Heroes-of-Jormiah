import { loadGameData } from './data.js';
import { storage } from './storage.js';
import { initState } from './state.js';
import { showHub } from './ui.js';
import { bindGlobalClickSound, setMuted } from './audio.js';

async function boot() {
  try {
    const data = await loadGameData();
    const saved = storage.load();
    const state = initState(data, saved);
    setMuted(state.settings?.muted ?? false);
    bindGlobalClickSound();
    showHub();
    window.addEventListener('error', e => console.error('runtime error:', e.error || e.message));
  } catch (err) {
    document.getElementById('app').innerHTML = `
      <div class="boot" style="color: var(--ember);">Boot failed: ${err.message}<br><pre style="margin-top:12px;font-size:11px;color:var(--ink-muted)">${err.stack || ''}</pre></div>
    `;
    throw err;
  }
}

boot();
