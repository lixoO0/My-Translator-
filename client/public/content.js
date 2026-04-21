console.log('PAIT Content Script Loaded!');

const TOOLTIP_ID = 'pait-magic-tooltip';

function removeTooltip() {
  const existing = document.getElementById(TOOLTIP_ID);
  if (existing) existing.remove();
}

document.addEventListener('mousedown', (e) => {
  const tooltip = document.getElementById(TOOLTIP_ID);
  if (tooltip && !tooltip.contains(e.target)) {
    tooltip.remove();
  }
});

document.addEventListener('mouseup', (e) => {
  // ЗАХИСТ: Якщо ми відпустили мишку над самим тултипом (наприклад, клікаємо кнопку),
  // нічого не перемальовуємо / не видаляємо.
  if (e.target.closest(`#${TOOLTIP_ID}`)) {
    return;
  }

  const selection = window.getSelection?.();
  const selectedText = selection?.toString?.().trim();
  if (!selectedText) {
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

  tooltip.appendChild(translateBtn);
  tooltip.appendChild(saveBtn);
  document.body.appendChild(tooltip);

  const saveBtnEl = document.getElementById('pait-btn-save');
  if (saveBtnEl) {
    // Зупиняємо mousedown, щоб він не спливав вище
    saveBtnEl.addEventListener('mousedown', (e) => e.stopPropagation());

    saveBtnEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const originalText = saveBtnEl.textContent;
      saveBtnEl.textContent = '⏳ Saving...';
      saveBtnEl.style.pointerEvents = 'none'; // блокуємо подвійний клік

      if (!chrome?.runtime?.sendMessage) {
        saveBtnEl.textContent = '❌ Error';
        saveBtnEl.style.pointerEvents = '';
        console.error('PAIT Save Error: chrome.runtime.sendMessage unavailable');
        return;
      }

      chrome.runtime.sendMessage(
        {
          action: 'SAVE_NOTE',
          text: selectedText,
          sourceUrl: window.location.href,
        },
        (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) {
          saveBtnEl.textContent = '❌ Error';
          saveBtnEl.style.pointerEvents = '';
          console.error('PAIT Save Error:', chrome.runtime.lastError || response?.error);
        } else {
          saveBtnEl.textContent = '✅ Saved!';
          window.setTimeout(() => {
            const t = document.getElementById(TOOLTIP_ID);
            if (t) t.remove();
          }, 2000);
        }
        }
      );
    });
  }

  const top = rect.top + window.scrollY - 40;
  const left = rect.left + window.scrollX;
  tooltip.style.top = `${Math.max(8, top)}px`;
  tooltip.style.left = `${Math.max(8, left)}px`;

  console.log('PAIT selected text:', selectedText);
});

