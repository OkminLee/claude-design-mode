'use strict';

(function (global) {
  const HEX_RE = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

  function detectWidget(value, override) {
    if (override) return override;
    if (typeof value === 'boolean') return 'toggle';
    if (typeof value === 'string') {
      return HEX_RE.test(value) ? 'color' : 'text';
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return 'number';
      if (value >= 0 && value <= 1) return 'slider';
      return 'number';
    }
    return null;
  }

  function makeRow(key, value, widget, onInput) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 6px 0;';
    const label = document.createElement('label');
    label.textContent = key;
    label.style.cssText = 'flex: 1; font-size: 12px; color: #3f3f46; font-family: ui-sans-serif, system-ui, sans-serif;';
    row.appendChild(label);
    let input;
    let readout;
    switch (widget) {
      case 'color':
        input = document.createElement('input');
        input.type = 'color';
        input.value = value;
        input.style.cssText = 'width: 32px; height: 24px; border: 1px solid #d4d4d8; border-radius: 4px; padding: 0;';
        readout = document.createElement('span');
        readout.textContent = value;
        readout.style.cssText = 'font-family: ui-monospace, monospace; font-size: 11px; color: #71717a; width: 64px;';
        row.appendChild(input);
        row.appendChild(readout);
        input.addEventListener('input', () => {
          readout.textContent = input.value;
          onInput(input.value);
        });
        break;
      case 'text':
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.style.cssText = 'flex: 1.4; font-size: 12px; padding: 4px 6px; border: 1px solid #d4d4d8; border-radius: 4px;';
        row.appendChild(input);
        input.addEventListener('input', () => onInput(input.value));
        break;
      case 'number':
        input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.style.cssText = 'width: 80px; font-size: 12px; padding: 4px 6px; border: 1px solid #d4d4d8; border-radius: 4px;';
        row.appendChild(input);
        input.addEventListener('input', () => {
          const v = input.value === '' ? 0 : Number(input.value);
          if (!Number.isNaN(v)) onInput(v);
        });
        break;
      case 'slider':
        input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = String(value);
        input.style.cssText = 'flex: 1.2;';
        readout = document.createElement('span');
        readout.textContent = value.toFixed(2);
        readout.style.cssText = 'font-family: ui-monospace, monospace; font-size: 11px; color: #71717a; width: 36px;';
        row.appendChild(input);
        row.appendChild(readout);
        input.addEventListener('input', () => {
          const v = Number(input.value);
          readout.textContent = v.toFixed(2);
          onInput(v);
        });
        break;
      case 'toggle':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        input.style.cssText = 'width: 16px; height: 16px;';
        row.appendChild(input);
        input.addEventListener('change', () => onInput(input.checked));
        break;
      default:
        return null;
    }
    return row;
  }

  function mount(values, options) {
    if (!values || typeof values !== 'object') {
      console.warn('[tweaks] mount(values) requires an object');
      return;
    }
    if (!options || typeof options.onChange !== 'function') {
      console.warn('[tweaks] mount requires options.onChange');
      return;
    }
    const overrides = (options && options.widgetOverrides) || {};

    const position = (options && options.position) || 'bottom-right';
    const positions = {
      'bottom-right': 'bottom: 16px; right: 16px;',
      'bottom-left': 'bottom: 16px; left: 16px;',
      'top-right': 'top: 16px; right: 16px;',
      'top-left': 'top: 16px; left: 16px;',
    };
    const positionCss = positions[position] || positions['bottom-right'];

    const panel = document.createElement('div');
    panel.style.cssText = [
      'position: fixed', positionCss, 'width: 280px',
      'background: white', 'border: 1px solid #d4d4d8', 'border-radius: 10px',
      'box-shadow: 0 8px 24px rgba(0,0,0,0.15)', 'padding: 12px',
      'font-family: ui-sans-serif, system-ui, sans-serif', 'z-index: 999999',
    ].join('; ');

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; cursor: pointer; user-select: none;';
    const title = document.createElement('span');
    title.textContent = 'Tweaks';
    title.style.cssText = 'font-size: 13px; font-weight: 600; color: #18181b;';
    const caret = document.createElement('span');
    caret.style.cssText = 'font-size: 12px; color: #71717a;';
    header.appendChild(title);
    header.appendChild(caret);
    panel.appendChild(header);

    const body = document.createElement('div');
    panel.appendChild(body);

    const storageKey = 'tweaks-panel:' + (options.filePath || 'default') + ':collapsed';
    let collapsed = localStorage.getItem(storageKey) === '1';

    function applyCollapse() {
      body.style.display = collapsed ? 'none' : '';
      caret.textContent = collapsed ? '▸' : '▾';
    }
    applyCollapse();

    function toggleCollapse() {
      collapsed = !collapsed;
      try { localStorage.setItem(storageKey, collapsed ? '1' : '0'); } catch (_) {}
      applyCollapse();
    }
    header.addEventListener('click', toggleCollapse);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleCollapse();
    });

    const daemonUrl = (options && options.daemonUrl) || 'http://localhost:5174';
    const filePath = options.filePath;
    const isHeadless = (typeof navigator !== 'undefined' && navigator.webdriver === true);

    const status = document.createElement('span');
    status.style.cssText = 'width: 8px; height: 8px; border-radius: 50%; background: #71717a; margin-right: 6px; flex-shrink: 0;';
    if (!isHeadless) header.insertBefore(status, title);

    let saveTimer = null;
    let lastError = null;

    function setStatus(state) {
      if (isHeadless) return;
      const colors = { idle: '#71717a', pending: '#eab308', ok: '#22c55e', error: '#ef4444' };
      status.style.background = colors[state] || colors.idle;
      status.title = state === 'error' ? ('save failed: ' + (lastError || 'unknown')) : ('save status: ' + state);
    }
    setStatus('idle');

    function scheduleSave() {
      if (isHeadless) return;
      if (!filePath) {
        console.warn('[tweaks] options.filePath is required for daemon save');
        return;
      }
      if (saveTimer) clearTimeout(saveTimer);
      setStatus('pending');
      saveTimer = setTimeout(() => {
        fetch(daemonUrl + '/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: filePath, edits: values }),
        }).then((res) => {
          if (res.ok) {
            lastError = null;
            setStatus('ok');
          } else {
            res.json().then((j) => {
              lastError = (j && j.error) || ('HTTP ' + res.status);
              setStatus('error');
            }).catch(() => {
              lastError = 'HTTP ' + res.status;
              setStatus('error');
            });
          }
        }).catch((err) => {
          lastError = (err && err.message) || 'network error';
          setStatus('error');
        });
      }, 200);
    }

    Object.keys(values).forEach((key) => {
      const widget = detectWidget(values[key], overrides[key]);
      if (!widget) {
        console.warn('[tweaks] unsupported value type for key "' + key + '"');
        return;
      }
      const row = makeRow(key, values[key], widget, (newValue) => {
        values[key] = newValue;
        options.onChange(key, newValue, values);
        scheduleSave();
      });
      if (row) body.appendChild(row);
    });

    document.body.appendChild(panel);
    return panel;
  }

  global.TweaksPanel = { mount: mount, _detectWidget: detectWidget };
})(window);
