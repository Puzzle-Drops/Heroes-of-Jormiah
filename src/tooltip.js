// Single floating tooltip element, lazily created, positioned near the cursor.
// Use attachTooltip(element, content[, opts]) for any anchor; content can be a
// string or a 0-arg function called fresh each time the tooltip opens (so
// numbers reflect current game state).
//
// Auto-hides on any document click (re-renders typically remove anchors) and
// on window blur. Smart positioning flips to the other side of the cursor when
// the tooltip would overflow the viewport.

const SHOW_DELAY_MS = 180;
const PAD = 10;
const CURSOR_OFFSET = 14;

let _el = null;
let _showTimer = null;
let _currentAnchor = null;
let _lastEvent = null;

function ensureEl() {
  if (_el) return _el;
  _el = document.createElement('div');
  _el.className = 'tooltip';
  _el.style.display = 'none';
  document.body.appendChild(_el);
  return _el;
}

function position() {
  const el = ensureEl();
  if (!_lastEvent) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = _lastEvent.clientX + CURSOR_OFFSET;
  let y = _lastEvent.clientY + CURSOR_OFFSET;
  if (x + w + PAD > vw) x = _lastEvent.clientX - w - CURSOR_OFFSET;
  if (y + h + PAD > vh) y = _lastEvent.clientY - h - CURSOR_OFFSET;
  el.style.left = Math.max(PAD, x) + 'px';
  el.style.top  = Math.max(PAD, y) + 'px';
}

function show(content) {
  const el = ensureEl();
  const html = typeof content === 'function' ? content() : content;
  if (!html) return false;
  el.innerHTML = html;
  el.style.display = 'block';
  position();
  return true;
}

export function hideTooltip() {
  clearTimeout(_showTimer);
  _showTimer = null;
  if (_el) _el.style.display = 'none';
  _currentAnchor = null;
}

// Manual API for callers that drive the tooltip themselves (e.g. canvas
// hit-test). showTooltipAt forces it visible immediately; updateTooltipContent
// swaps innerHTML in place so per-frame refreshes don't reset position.
export function showTooltipAt(html, clientX, clientY, ownerToken = '__manual__') {
  clearTimeout(_showTimer);
  _showTimer = null;
  _lastEvent = { clientX, clientY };
  _currentAnchor = ownerToken;
  const el = ensureEl();
  el.innerHTML = html;
  el.style.display = 'block';
  position();
}

export function updateTooltipContent(html) {
  if (!_el || _el.style.display === 'none') return;
  _el.innerHTML = html;
}

export function isTooltipShowing() { return _el && _el.style.display !== 'none'; }

export function attachTooltip(element, content, options = {}) {
  if (!element) return () => {};
  const { delay = SHOW_DELAY_MS } = options;

  const onEnter = (e) => {
    _lastEvent = e;
    clearTimeout(_showTimer);
    _showTimer = setTimeout(() => {
      if (!show(content)) return;
      _currentAnchor = element;
    }, delay);
  };
  const onMove = (e) => {
    _lastEvent = e;
    if (_currentAnchor === element) position();
  };
  const onLeave = () => {
    if (_currentAnchor === element || _showTimer) hideTooltip();
  };

  element.addEventListener('mouseenter', onEnter);
  element.addEventListener('mousemove', onMove);
  element.addEventListener('mouseleave', onLeave);

  return () => {
    element.removeEventListener('mouseenter', onEnter);
    element.removeEventListener('mousemove', onMove);
    element.removeEventListener('mouseleave', onLeave);
    if (_currentAnchor === element) hideTooltip();
  };
}

document.addEventListener('click', hideTooltip, true);
window.addEventListener('blur', hideTooltip);
