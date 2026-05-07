// Canvas renderer for the shared passive tree. Pan with drag, zoom with wheel,
// click to allocate the hovered node. Tooltip wiring is done by the caller via
// nodeAtClient() + buildNodeTooltip() on hover.

import { getTree, nodesById, getAllocated, canAllocate, startNodeFor } from './tree.js';

const NODE_R = { stat: 8, notable: 13, keystone: 19, connector: 6 };

const COLORS = {
  bg:       '#0a0b14',
  edge:     '#26283e',
  edgeAlloc:'#c89860',
  fill:     '#14152a',
  fillAlloc:'#c89860',
  fillAvail:'#1d1f3a',
  stroke:   '#2a2c4a',
  strokeAvail:'#7a6442',
  strokeKey: '#a855f7',
  strokeNotable: '#3b82f6',
  text:     '#e8e6d8',
  textDim:  '#8a8b9a'
};

export function createTreeView(canvas, classId, opts = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = window.devicePixelRatio || 1;

  // tree-space transform: tree coordinates ~0..2000; screen = (tree - cam) * scale + viewportCenter
  let scale = 0.55;
  let camX = 1000, camY = 1000;
  let isPanning = false;
  let panStartX = 0, panStartY = 0, camStartX = 0, camStartY = 0;
  let hoveredId = null;
  let searchTerm = '';

  function nodeMatchesSearch(node) {
    if (!searchTerm) return true;
    if (node.name && node.name.toLowerCase().includes(searchTerm)) return true;
    for (const eff of node.effects ?? []) {
      if (eff.stat && eff.stat.toLowerCase().includes(searchTerm)) return true;
      if (eff.flag && eff.flag.toLowerCase().includes(searchTerm)) return true;
    }
    return false;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function treeToScreen(tx, ty) {
    return [(tx - camX) * scale + w / 2, (ty - camY) * scale + h / 2];
  }
  function screenToTree(sx, sy) {
    return [(sx - w / 2) / scale + camX, (sy - h / 2) / scale + camY];
  }

  function nodeAtClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const [tx, ty] = screenToTree(sx, sy);
    const tree = getTree();
    if (!tree) return null;
    let best = null;
    let bestDist = Infinity;
    for (const node of tree.nodes) {
      const dx = node.pos[0] - tx;
      const dy = node.pos[1] - ty;
      const r = (NODE_R[node.kind] ?? 8) + 6; // generous hit
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r && d2 < bestDist) { best = node; bestDist = d2; }
    }
    return best;
  }

  function draw() {
    if (!w || !h) return;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    const tree = getTree();
    if (!tree) return;
    const allocated = getAllocated(classId);

    // edges first
    ctx.lineWidth = Math.max(0.6, 1.4 * scale);
    for (const node of tree.nodes) {
      const [ax, ay] = treeToScreen(node.pos[0], node.pos[1]);
      for (const e of node.edges) {
        // draw each edge once: only when this end's id < other end's id
        if (node.id > e) continue;
        const other = nodesById()[e];
        if (!other) continue;
        const [bx, by] = treeToScreen(other.pos[0], other.pos[1]);
        const bothAlloc = allocated.has(node.id) && allocated.has(other.id);
        ctx.strokeStyle = bothAlloc ? COLORS.edgeAlloc : COLORS.edge;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }

    // nodes
    for (const node of tree.nodes) {
      const [sx, sy] = treeToScreen(node.pos[0], node.pos[1]);
      if (sx < -50 || sy < -50 || sx > w + 50 || sy > h + 50) continue;

      const r = (NODE_R[node.kind] ?? 8) * Math.max(0.7, Math.min(1.6, scale * 1.3));
      const alloc = allocated.has(node.id);
      const avail = !alloc && canAllocate(classId, node.id);
      const matches = nodeMatchesSearch(node);

      if (searchTerm && !matches) ctx.globalAlpha = 0.18;

      // halo
      if (alloc) {
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
        grad.addColorStop(0, 'rgba(200, 152, 96, 0.55)');
        grad.addColorStop(1, 'rgba(200, 152, 96, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(sx, sy, r * 3, 0, Math.PI * 2); ctx.fill();
      }
      // body
      ctx.fillStyle = alloc ? COLORS.fillAlloc : (avail ? COLORS.fillAvail : COLORS.fill);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();

      // ring for kind
      let stroke;
      if (node.kind === 'keystone')      stroke = COLORS.strokeKey;
      else if (node.kind === 'notable')  stroke = COLORS.strokeNotable;
      else                                stroke = avail ? COLORS.strokeAvail : COLORS.stroke;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = node.kind === 'keystone' ? 2.5 : node.kind === 'notable' ? 1.8 : 1;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();

      // hovered outline
      if (hoveredId === node.id) {
        ctx.strokeStyle = '#e3b878';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, r + 4, 0, Math.PI * 2); ctx.stroke();
      }

      // notable / keystone labels at higher zoom
      if (node.name && scale > 0.35) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `${node.kind === 'keystone' ? 'bold ' : ''}${Math.round(11 * Math.min(1.4, scale))}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(node.name, sx, sy - r - 6);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ===== input =====
  function onMouseDown(e) {
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    camStartX = camX; camStartY = camY;
    canvas.style.cursor = 'grabbing';
  }
  function onMouseUp(e) {
    if (isPanning) {
      const moved = Math.hypot(e.clientX - panStartX, e.clientY - panStartY);
      isPanning = false;
      canvas.style.cursor = 'default';
      if (moved < 4) {
        // treat as click
        const node = nodeAtClient(e.clientX, e.clientY);
        if (node && opts.onClickNode) opts.onClickNode(node);
      }
    }
  }
  function onMouseMove(e) {
    if (isPanning) {
      camX = camStartX - (e.clientX - panStartX) / scale;
      camY = camStartY - (e.clientY - panStartY) / scale;
      draw();
    }
    const prev = hoveredId;
    const node = nodeAtClient(e.clientX, e.clientY);
    hoveredId = node?.id ?? null;
    if (hoveredId !== prev) draw();
    if (opts.onHover) opts.onHover(node, e);
  }
  function onMouseLeave() {
    if (hoveredId) { hoveredId = null; draw(); }
    if (opts.onHover) opts.onHover(null, null);
  }
  function onWheel(e) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newScale = Math.max(0.18, Math.min(2.4, scale * factor));
    if (newScale === scale) return;
    // zoom toward cursor
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const [tx, ty] = screenToTree(sx, sy);
    scale = newScale;
    const [tx2, ty2] = screenToTree(sx, sy);
    camX += tx - tx2;
    camY += ty - ty2;
    draw();
  }

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // initial center on the class's start node
  const startId = startNodeFor(classId);
  const startNode = startId ? nodesById()[startId] : null;
  if (startNode) {
    camX = startNode.pos[0];
    camY = startNode.pos[1];
  }

  return {
    resize,
    draw,
    nodeAtClient,
    setSearch(term) { searchTerm = (term || '').toLowerCase().trim(); draw(); },
    destroy() {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('wheel', onWheel);
    }
  };
}
