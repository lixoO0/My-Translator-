console.log('PAIT Content Script Loaded!');

const TOOLTIP_ID = 'pait-magic-tooltip';

function removeTooltip() {
  const existing = document.getElementById(TOOLTIP_ID);
  if (existing) existing.remove();
}

function ensureOutsideClickListener() {
  if (window.__paitOutsideTooltipListenerInstalled) return;
  window.__paitOutsideTooltipListenerInstalled = true;

  document.addEventListener(
    'mousedown',
    (e) => {
      const tooltip = document.getElementById(TOOLTIP_ID);
      if (!tooltip) return;
      if (tooltip.contains(e.target)) return;
      removeTooltip();
    },
    true
  );
}

ensureOutsideClickListener();

window.addEventListener('mouseup', () => {
  const selection = window.getSelection?.();
  const selected = selection?.toString?.().trim();
  if (!selected) {
    removeTooltip();
    return;
  }

  if (!selection || selection.rangeCount === 0) return;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return;

  removeTooltip();

  const tooltip = document.createElement('div');
  tooltip.id = TOOLTIP_ID;

  const translateBtn = document.createElement('button');
  translateBtn.id = 'pait-btn-translate';
  translateBtn.type = 'button';
  translateBtn.textContent = '🌐 Translate';

  const saveBtn = document.createElement('button');
  saveBtn.id = 'pait-btn-save';
  saveBtn.type = 'button';
  saveBtn.textContent = '📝 Save';
  saveBtn.addEventListener('click', () => {
    saveBtn.textContent = '⏳ Saving...';

    if (!chrome?.runtime?.sendMessage) {
      saveBtn.textContent = '❌ Error';
      return;
    }

    chrome.runtime.sendMessage({ action: 'SAVE_NOTE', text: selected }, (response) => {
      const ok = Boolean(response?.ok);
      if (ok) {
        saveBtn.textContent = '✅ Saved!';
        window.setTimeout(() => removeTooltip(), 2000);
        return;
      }
      saveBtn.textContent = '❌ Error';
    });
  });

  tooltip.appendChild(translateBtn);
  tooltip.appendChild(saveBtn);
  document.body.appendChild(tooltip);

  const top = rect.top + window.scrollY - 40;
  const left = rect.left + window.scrollX;
  tooltip.style.top = `${Math.max(8, top)}px`;
  tooltip.style.left = `${Math.max(8, left)}px`;

  console.log('PAIT selected text:', selected);
});

