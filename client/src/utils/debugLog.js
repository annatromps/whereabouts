// Persistent vanilla-JS debug panel — appended directly to document.body so it
// survives a React crash or full component unmount.
const ID = 'wa-debug';
let panel = null;
let entries = null;

const STYLES = `
#wa-debug {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  background: #0a0a0a;
  border-top: 2px solid #333;
  font-family: 'Courier New', Menlo, monospace;
  max-height: 40vh;
  flex-direction: column;
}
#wa-debug.wa-visible { display: flex; }
#wa-debug-header {
  background: #1a1a1a;
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #aaa;
  font-size: 0.7rem;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}
#wa-debug-clear {
  background: #333; color: #ccc; border: none; border-radius: 4px;
  padding: 2px 8px; font-size: 0.65rem; cursor: pointer; font-family: inherit;
}
#wa-debug-clear:hover { background: #444; color: #fff; }
#wa-debug-entries {
  overflow-y: auto; padding: 6px 10px;
  display: flex; flex-direction: column; gap: 2px; flex: 1; min-height: 0;
}
.wa-row { display: flex; gap: 8px; word-break: break-all; font-size: 0.72rem; line-height: 1.5; }
.wa-time { color: #555; flex-shrink: 0; font-size: 0.65rem; padding-top: 1px; }
.wa-ok   { flex: 1; color: #4ade80; }
.wa-warn { flex: 1; color: #fbbf24; }
.wa-err  { flex: 1; color: #f87171; font-weight: 700; }
`;

function init() {
  if (panel || typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  panel = document.createElement('div');
  panel.id = ID;
  panel.innerHTML = `
    <div id="wa-debug-header">
      <span>📋 Upload debug log</span>
      <button id="wa-debug-clear">Clear</button>
    </div>
    <div id="wa-debug-entries"></div>
  `;
  document.body.appendChild(panel);

  entries = panel.querySelector('#wa-debug-entries');
  panel.querySelector('#wa-debug-clear').addEventListener('click', clearDbg);
}

export function dbg(msg, level = 'ok') {
  if (level === 'error') console.error('[Creator]', msg);
  else if (level === 'warn')  console.warn('[Creator]', msg);
  else                        console.log('[Creator]', msg);

  init();
  if (!panel) return;
  panel.classList.add('wa-visible');

  const t = new Date().toTimeString().slice(0, 8);
  const row = document.createElement('div');
  row.className = 'wa-row';

  const timeEl = document.createElement('span');
  timeEl.className = 'wa-time';
  timeEl.textContent = t;

  const msgEl = document.createElement('span');
  msgEl.className = level === 'error' ? 'wa-err' : level === 'warn' ? 'wa-warn' : 'wa-ok';
  msgEl.textContent = msg;

  row.appendChild(timeEl);
  row.appendChild(msgEl);
  entries.appendChild(row);
  entries.scrollTop = entries.scrollHeight;
}

export function clearDbg() {
  if (entries) entries.innerHTML = '';
  if (panel) panel.classList.remove('wa-visible');
}

// Catch errors that happen outside React's tree (once per page load)
window.addEventListener('unhandledrejection', (e) => {
  dbg(`UNHANDLED REJECTION: ${e.reason?.message ?? String(e.reason)}`, 'error');
});
window.addEventListener('error', (e) => {
  dbg(`UNCAUGHT ERROR: ${e.message}  (${e.filename}:${e.lineno})`, 'error');
});
