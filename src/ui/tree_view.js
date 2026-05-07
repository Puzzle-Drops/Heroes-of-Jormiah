// Phase 10.x — inline SVG visualiser for the GDD §13 shared passive tree.
// Opens as a fullscreen overlay over the game; click any allocatable node
// to spend 1 skillPoint. Adjacency / dead-slot rules are enforced by
// Character.allocateTreeNode itself.
//
// Renders:
//   - 8 family arms radiating from the centre (no allocatable root)
//   - stat (small circle), notable (medium ring), keystone (large hex),
//     bridge (small diamond) styled by family color
//   - edges between connected nodes
//   - allocated nodes glow; allocatable (adjacent + has SP) pulse;
//     others are dim
//
// Stays out of the way until invoked via openPassiveTreeOverlay(member).
// Doesn't touch the legacy iframe SkillTreeViewer.

(function () {
    if (typeof window === 'undefined') return;

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

    function bonusesToString(bonuses) {
        if (!bonuses) return '';
        const order = ['hp', 'mp', 'pAtk', 'mAtk', 'pDef', 'mDef',
                       'hp_pct', 'mp_pct', 'attackSpeed_pct'];
        const labels = {
            hp:'HP', mp:'MP', pAtk:'P.ATK', mAtk:'M.ATK', pDef:'P.DEF', mDef:'M.DEF',
            hp_pct:'+% HP', mp_pct:'+% MP', attackSpeed_pct:'+% AS',
        };
        const parts = [];
        for (const k of order) {
            if (bonuses[k]) parts.push(`${labels[k]} +${bonuses[k]}${k.endsWith('_pct') ? '%' : ''}`);
        }
        for (const k of Object.keys(bonuses)) {
            if (!order.includes(k)) parts.push(`${k} +${bonuses[k]}`);
        }
        return parts.join(', ');
    }

    function nodeStyle(node, member, allocatable) {
        const allocated = member.allocatedTreeNodes?.has(node.id);
        const fam = node.family || (node.bridgeBetween ? node.bridgeBetween[0] : null);
        const baseColor = FAMILY_COLOR[fam] || '#cbd5e1';
        return {
            fill: allocated ? baseColor : (allocatable ? '#1e293b' : '#0a0e27'),
            stroke: allocated ? '#fde68a' : (allocatable ? baseColor : '#334155'),
            strokeWidth: allocated ? 2.5 : (allocatable ? 1.8 : 1.2),
            opacity: allocated ? 1 : (allocatable ? 0.95 : 0.55),
        };
    }

    function drawNode(svg, node, member, allocatable, onClick) {
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const s = nodeStyle(node, member, allocatable);
        let el;
        const cx = node.x + 600, cy = node.y + 380;
        if (node.kind === 'keystone') {
            // Hex
            const r = 14;
            const pts = [];
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i - Math.PI / 6;
                pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
            }
            el = document.createElementNS(SVG_NS, 'polygon');
            el.setAttribute('points', pts.join(' '));
        } else if (node.kind === 'notable') {
            el = document.createElementNS(SVG_NS, 'circle');
            el.setAttribute('cx', cx);
            el.setAttribute('cy', cy);
            el.setAttribute('r', 11);
        } else if (node.kind === 'bridge') {
            const r = 7;
            const pts = `${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`;
            el = document.createElementNS(SVG_NS, 'polygon');
            el.setAttribute('points', pts);
        } else {
            el = document.createElementNS(SVG_NS, 'circle');
            el.setAttribute('cx', cx);
            el.setAttribute('cy', cy);
            el.setAttribute('r', 7);
        }
        el.setAttribute('fill', s.fill);
        el.setAttribute('stroke', s.stroke);
        el.setAttribute('stroke-width', s.strokeWidth);
        el.setAttribute('opacity', s.opacity);
        if (allocatable) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => onClick(node));
        }
        // Tooltip via title.
        const title = document.createElementNS(SVG_NS, 'title');
        title.textContent = `${node.name}${node.kind === 'keystone' ? ' (KEYSTONE)' : node.kind === 'notable' ? ' (NOTABLE)' : ''}\n${bonusesToString(node.bonuses)}${node.description ? '\n' + node.description : ''}`;
        el.appendChild(title);
        svg.appendChild(el);
    }

    function drawEdge(svg, a, b, allocatedSet) {
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const both = allocatedSet.has(a.id) && allocatedSet.has(b.id);
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', a.x + 600);
        line.setAttribute('y1', a.y + 380);
        line.setAttribute('x2', b.x + 600);
        line.setAttribute('y2', b.y + 380);
        line.setAttribute('stroke', both ? '#fde68a' : '#334155');
        line.setAttribute('stroke-width', both ? 2 : 1);
        line.setAttribute('opacity', both ? 0.85 : 0.45);
        svg.appendChild(line);
    }

    function buildOverlay(member, onAllocate, onClose) {
        const PT = window.PASSIVE_TREE;
        if (!PT) return null;
        const overlay = document.createElement('div');
        overlay.id = 'gdd-tree-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 4000;
            background: linear-gradient(135deg, rgba(10, 14, 39, 0.98) 0%, rgba(21, 25, 53, 0.98) 100%);
            display: flex; flex-direction: column; padding: 18px; font-family: 'Rajdhani', sans-serif;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
        header.innerHTML = `
            <div>
                <div style="font-family:'Orbitron',sans-serif;font-size:18px;font-weight:800;color:#a855f7;letter-spacing:2px;">PASSIVE TREE — ${member.className}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Skill Points: <span style="color:#fde68a;font-weight:700;" id="gdd-tree-sp">${member.skillPoints || 0}</span> · Allocated: <span style="color:#a7f3d0;font-weight:700;" id="gdd-tree-alloc">${member.allocatedTreeNodes?.size || 0}</span></div>
            </div>
            <div style="display:flex;gap:8px;">
                <button id="gdd-tree-refund" style="padding:8px 14px;background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:6px;color:#fca5a5;font-family:inherit;font-weight:700;cursor:pointer;">Refund All</button>
                <button id="gdd-tree-close" style="padding:8px 14px;background:rgba(168,85,247,0.15);border:1px solid #a855f7;border-radius:6px;color:#e9d5ff;font-family:inherit;font-weight:700;cursor:pointer;">Close</button>
            </div>
        `;
        overlay.appendChild(header);

        const SVG_NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 1200 760');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.cssText = 'flex:1;width:100%;background:radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 70%);';
        overlay.appendChild(svg);

        function render() {
            // Wipe.
            while (svg.firstChild) svg.removeChild(svg.firstChild);
            const allocated = member.allocatedTreeNodes || new Set();

            // Edges first so nodes draw over them.
            for (const [aId, bId] of PT.edges) {
                const a = PT.getNodeById(aId);
                const b = PT.getNodeById(bId);
                if (!a || !b) continue;
                drawEdge(svg, a, b, allocated);
            }

            // Nodes — skip the layout-only root (id 0).
            for (const node of PT.nodes) {
                if (node.id === 0) continue;
                let allocatable = false;
                if (!allocated.has(node.id) && (member.skillPoints || 0) > 0) {
                    const adj = PT.getNodesAdjacentTo(node.id).filter(id => id !== 0);
                    allocatable = adj.some(id => allocated.has(id));
                }
                drawNode(svg, node, member, allocatable, onClick);
            }

            // Side panel showing currently-hovered details could go here.
            // v1 leans on SVG <title> for tooltips (browser-native).

            const spEl = document.getElementById('gdd-tree-sp');
            const allocEl = document.getElementById('gdd-tree-alloc');
            if (spEl) spEl.textContent = member.skillPoints || 0;
            if (allocEl) allocEl.textContent = allocated.size;
        }

        function onClick(node) {
            const ok = onAllocate(node.id);
            if (ok) render();
        }

        header.querySelector('#gdd-tree-refund').addEventListener('click', () => {
            if (typeof member.refundTree === 'function') {
                member.refundTree();
                render();
            }
        });
        header.querySelector('#gdd-tree-close').addEventListener('click', () => {
            overlay.remove();
            if (onClose) onClose();
        });

        render();
        return overlay;
    }

    // Public API: open the overlay for a specific party member.
    window.openPassiveTreeOverlay = function (member) {
        if (!member) return;
        const existing = document.getElementById('gdd-tree-overlay');
        if (existing) existing.remove();
        const overlay = buildOverlay(member, (nodeId) => {
            return member.allocateTreeNode(nodeId);
        }, () => {});
        if (overlay) document.body.appendChild(overlay);
    };
})();
