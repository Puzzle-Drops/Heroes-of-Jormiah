// Phase 9.y — standalone roster browser overlay (GDD §18.1).
//
// Mid-game viewer for the full 48-class roster. Shows each class with
// portrait, family/tagline, 4 ability names, and stat lean. Read-only
// (you can't change party from here — that needs a return to the hub).

(function () {
    if (typeof window === 'undefined') return;

    const FAMILY_LABEL = {
        tank:'Tanks', fighter:'Fighters', healer:'Healers',
        marksman:'Marksmen', rogue:'Rogues', magician:'Magicians',
        mystic:'Mystics', farland:'Far Lands',
    };
    const FAMILY_COLOR = {
        tank:     '#fda4af',
        fighter:  '#fb923c',
        healer:   '#86efac',
        marksman: '#a7f3d0',
        rogue:    '#94a3b8',
        magician: '#a5b4fc',
        mystic:   '#c4b5fd',
        farland:  '#fde68a',
    };

    function renderCard(entry) {
        const fc = FAMILY_COLOR[entry.family] || '#cbd5e1';
        return `
            <div class="roster-card" data-class-id="${entry.id}" style="
                background: linear-gradient(135deg, rgba(30,41,59,0.85), rgba(15,23,42,0.95));
                border: 1px solid ${fc}55;
                border-left: 3px solid ${fc};
                border-radius: 10px;
                padding: 12px;
                display: flex;
                gap: 12px;
                min-width: 280px;
            ">
                <div style="width:64px;height:70px;flex-shrink:0;background-image:url('assets/sprites/sheets/${entry.sprite}');background-size:512px 70px;background-position:0 0;background-repeat:no-repeat;image-rendering:pixelated;border-radius:6px;background-color:rgba(15,23,42,0.4);"></div>
                <div style="flex:1;min-width:0;">
                    <div style="font-family:'Cinzel','Orbitron',serif;font-weight:800;font-size:15px;color:${fc};">${entry.name}</div>
                    <div style="font-size:10px;color:#94a3b8;margin-top:1px;font-style:italic;">${entry.tagline}</div>
                    <div style="font-size:11px;color:#cbd5e1;margin-top:6px;line-height:1.35;">${entry.desc}</div>
                    <div style="font-size:10px;color:#71717a;margin-top:6px;letter-spacing:0.5px;">
                        <span style="color:${fc};font-weight:700;">${entry.abilities.attack.name}</span> · ${entry.abilities.spell1.name} · ${entry.abilities.spell2.name} · ${entry.abilities.passive.name}
                    </div>
                </div>
            </div>
        `;
    }

    function buildOverlay() {
        if (!window.CLASS_REGISTRY) return null;
        const overlay = document.createElement('div');
        overlay.id = 'roster-browser-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 4500;
            background: linear-gradient(135deg, rgba(10, 14, 39, 0.97) 0%, rgba(21, 25, 53, 0.97) 100%);
            display: flex; flex-direction: column; padding: 24px;
            font-family: 'Rajdhani', sans-serif;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-shrink:0;';
        header.innerHTML = `
            <div>
                <div style="font-family:'Orbitron',sans-serif;font-size:20px;font-weight:800;color:#a855f7;letter-spacing:3px;">CLASS ROSTER</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">All 48 classes · 8 families × 6 each (GDD §6.3)</div>
            </div>
            <button id="roster-close" style="padding:9px 16px;background:rgba(168,85,247,0.18);border:1px solid #a855f7;border-radius:6px;color:#e9d5ff;font-family:inherit;font-weight:700;cursor:pointer;">Close</button>
        `;
        overlay.appendChild(header);

        const scroll = document.createElement('div');
        scroll.style.cssText = 'flex:1;overflow-y:auto;padding-right:8px;';
        overlay.appendChild(scroll);

        for (const fam of ['tank','fighter','healer','marksman','rogue','magician','mystic','farland']) {
            const fc = FAMILY_COLOR[fam];
            const sectionLabel = document.createElement('div');
            sectionLabel.style.cssText = `
                font-family:'Orbitron',sans-serif;font-size:14px;font-weight:800;letter-spacing:2px;
                color:${fc};margin: 18px 0 10px;
                padding-bottom:6px;border-bottom:1px solid ${fc}55;
            `;
            sectionLabel.textContent = FAMILY_LABEL[fam].toUpperCase();
            scroll.appendChild(sectionLabel);

            const grid = document.createElement('div');
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px;';
            const entries = window.CLASS_REGISTRY.filter(e => e.family === fam);
            for (const entry of entries) {
                grid.insertAdjacentHTML('beforeend', renderCard(entry));
            }
            scroll.appendChild(grid);
        }

        overlay.querySelector('#roster-close').addEventListener('click', () => overlay.remove());
        // Close on Escape.
        const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);

        return overlay;
    }

    window.openRosterBrowser = function () {
        const existing = document.getElementById('roster-browser-overlay');
        if (existing) { existing.remove(); return; }
        const overlay = buildOverlay();
        if (overlay) document.body.appendChild(overlay);
    };
})();
