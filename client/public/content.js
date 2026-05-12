console.log('PAIT Content Script Loaded!');

const TOOLTIP_ID = 'pait-magic-tooltip';
const INLINE_RESULT_ID = 'pait-inline-result';

/** Іконка Sparkles (Lucide-совісний SVG) для Summarize — content script без React. */
const PAIT_SPARKLES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>`;

let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let paitTooltipDragCleanup = null;

function applyPaitThemeToRoots(isLight) {
  const tooltip = document.getElementById(TOOLTIP_ID);
  const inline = document.getElementById(INLINE_RESULT_ID);
  for (const el of [tooltip, inline]) {
    if (!el) continue;
    if (isLight) el.classList.add('pait-light');
    else el.classList.remove('pait-light');
  }
}

function syncPaitThemeFromStorage() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local?.get) return;
  chrome.storage.local.get(['pait_theme'], (result) => {
    applyPaitThemeToRoots(result?.pait_theme === 'light');
  });
}

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local' || !Object.prototype.hasOwnProperty.call(changes, 'pait_theme')) {
      return;
    }
    const next = changes.pait_theme.newValue;
    applyPaitThemeToRoots(next === 'light');
  });
}

function removeTooltip() {
  const existing = document.getElementById(TOOLTIP_ID);
  if (existing) existing.remove();
}

function tearDownInlineDrag() {
  if (paitTooltipDragCleanup) {
    paitTooltipDragCleanup();
    paitTooltipDragCleanup = null;
  }
}

/** handleEl — «ручка» (хедер панелі); container — #pait-inline-result (рухається весь блок). */
function initTooltipDrag(handleEl, container) {
  tearDownInlineDrag();

  let onMove;
  let onUp;

  const detach = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    isDragging = false;
    handleEl.style.cursor = 'grab';
    if (paitTooltipDragCleanup === detach) {
      paitTooltipDragCleanup = null;
    }
  };

  onMove = (e) => {
    if (!isDragging) return;
    container.style.left = `${e.clientX - offsetX + window.scrollX}px`;
    container.style.top = `${e.clientY - offsetY + window.scrollY}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  };

  onUp = () => {
    detach();
  };

  handleEl.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('select')) return;
      if (e.target.closest('.pait-inline-close')) return;
      const rect = container.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      isDragging = true;
      handleEl.style.cursor = 'grabbing';
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    true
  );

  paitTooltipDragCleanup = detach;
}

document.addEventListener('mousedown', (e) => {
  const tooltip = document.getElementById(TOOLTIP_ID);
  if (tooltip && !tooltip.contains(e.target) && !e.target.closest('#pait-inline-result')) {
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
  translateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`;
  translateBtn.title = 'Translate';
  translateBtn.style.padding = '6px';

  const btnSummarize = document.createElement('button');
  btnSummarize.id = 'pait-btn-summarize';
  btnSummarize.title = 'Summarize';
  btnSummarize.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.2 1.2L3 12l5.8 1.9a2 2 0 0 1 1.2 1.2L12 21l1.9-5.8a2 2 0 0 1 1.2-1.2L21 12l-5.8-1.9a2 2 0 0 1-1.2-1.2Z"/></svg>`;
  Object.assign(btnSummarize.style, {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '6px',
  });

  const saveBtn = document.createElement('button');
  saveBtn.id = 'pait-btn-save';
  saveBtn.type = 'button';
  saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
  saveBtn.title = 'Save to Notebook';
  saveBtn.style.padding = '6px';

  tooltip.appendChild(translateBtn);
  tooltip.appendChild(btnSummarize);
  tooltip.appendChild(saveBtn);
  document.body.appendChild(tooltip);
  syncPaitThemeFromStorage();

  const summarizeBtnEl = document.getElementById('pait-btn-summarize');
  if (summarizeBtnEl) {
    summarizeBtnEl.addEventListener('mousedown', (e) => e.stopPropagation());
    summarizeBtnEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const oldBox = document.getElementById('pait-inline-result');
      if (oldBox) {
        tearDownInlineDrag();
        oldBox.remove();
      }

      const resultBox = document.createElement('div');
      resultBox.id = 'pait-inline-result';
      resultBox.classList.add('pait-inline-card');

      const tooltipTop = Number.parseInt(tooltip.style.top || '0', 10) || 0;

      Object.assign(resultBox.style, {
        position: 'absolute',
        top: `${tooltipTop + 40}px`,
        left: tooltip.style.left,
        right: 'auto',
        bottom: 'auto',
        width: '350px',
        resize: 'both',
        overflow: 'hidden',
        minWidth: '300px',
        minHeight: '150px',
        maxWidth: '800px',
        maxHeight: '600px',
        zIndex: '10000',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        display: 'flex',
        flexDirection: 'column',
      });

      resultBox.innerHTML = `
        <div class="pait-inline-toolbar pait-inline-card__header">
          <div class="pait-inline-summary-row">
            <div class="pait-inline-summary-title">
              <span class="pait-inline-sparkles-icon">${PAIT_SPARKLES_SVG}</span>
              <span class="pait-inline-label">Summary</span>
            </div>
            <select id="pait-summary-lang" class="pait-inline-select">
              <option value="uk" selected>Ukrainian</option>
              <option value="en">English</option>
              <option value="pl">Polish</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
            </select>
            <select id="pait-summary-length" class="pait-inline-select">
              <option value="short">Short (1-2 sentences)</option>
              <option value="medium" selected>Standard</option>
              <option value="long">Detailed</option>
            </select>
          </div>
          <button type="button" id="pait-close-inline" class="pait-inline-close" aria-label="Close">×</button>
        </div>
        <div class="pait-inline-card__body">
          <textarea id="pait-summary-content" class="pait-inline-textarea pait-inline-body-copy" readonly>⏳ Summarizing...</textarea>
        </div>
      `;

      document.body.appendChild(resultBox);
      syncPaitThemeFromStorage();

      const headerEl = resultBox.querySelector('.pait-inline-toolbar');
      if (headerEl) {
        initTooltipDrag(headerEl, resultBox);
      }

      const closeBtn = document.getElementById('pait-close-inline');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          tearDownInlineDrag();
          resultBox.remove();
        });
      }

      const setError = (err) => {
        const contentEl = document.getElementById('pait-summary-content');
        if (!contentEl) return;
        contentEl.style.color = '#ef4444';
        contentEl.value = '❌ Error: Could not summarize text.';
        console.error('Summarize error:', err);
      };

      if (!chrome?.runtime?.sendMessage) {
        setError('chrome.runtime.sendMessage unavailable');
        return;
      }

      const requestSummary = () => {
        const contentEl = document.getElementById('pait-summary-content');
        if (contentEl) {
          contentEl.style.removeProperty('color');
          contentEl.value = '⏳ Summarizing...';
        }

        const lengthSelect = document.getElementById('pait-summary-length');
        const length = lengthSelect?.value || 'medium';
        const langSelect = document.getElementById('pait-summary-lang');
        const language = langSelect?.value || 'uk';

        chrome.runtime.sendMessage(
          { action: 'SUMMARIZE_TEXT', text: selectedText, length, language },
          (response) => {
          const el = document.getElementById('pait-summary-content');
          if (!el) return;

          if (chrome.runtime.lastError || !response || !response.ok) {
            setError(chrome.runtime.lastError || response?.error);
          } else {
            el.style.removeProperty('color');
            el.value = response.data ?? '';
          }
        }
        );
      };

      const bindSelect = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('mousedown', (ev) => ev.stopPropagation());
        el.addEventListener('change', () => {
          requestSummary();
        });
      };
      bindSelect('pait-summary-length');
      bindSelect('pait-summary-lang');

      requestSummary();
    });
  }

  const translateBtnEl = document.getElementById('pait-btn-translate');
  if (translateBtnEl) {
    translateBtnEl.addEventListener('mousedown', (e) => e.stopPropagation());
    translateBtnEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Видаляємо старі результати, якщо вони є
      const oldBox = document.getElementById('pait-inline-result');
      if (oldBox) {
        tearDownInlineDrag();
        oldBox.remove();
      }

      // Створюємо віконце для результату
      const resultBox = document.createElement('div');
      resultBox.id = 'pait-inline-result';
      resultBox.classList.add('pait-inline-card');

      const tooltipTop = Number.parseInt(tooltip.style.top || '0', 10) || 0;

      Object.assign(resultBox.style, {
        position: 'absolute',
        top: `${tooltipTop + 40}px`,
        left: tooltip.style.left,
        right: 'auto',
        bottom: 'auto',
        width: '500px',
        resize: 'both',
        overflow: 'hidden',
        minWidth: '300px',
        minHeight: '150px',
        maxWidth: '800px',
        maxHeight: '600px',
        zIndex: '10000',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        display: 'flex',
        flexDirection: 'column',
      });

      resultBox.innerHTML = `
      <div class="pait-inline-toolbar pait-inline-card__header">
        <select id="pait-lang-select" class="pait-inline-select">
          <option value="uk">Ukrainian</option>
          <option value="en">English</option>
          <option value="pl">Polish</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
        </select>
        <button type="button" id="pait-close-inline" class="pait-inline-close" aria-label="Close">×</button>
      </div>
      <div class="pait-inline-card__body">
        <div class="pait-inline-columns">
          <textarea id="pait-source-editor" class="pait-inline-textarea pait-inline-source"></textarea>
          <div class="pait-inline-divider" aria-hidden="true"></div>
          <textarea id="pait-target-editor" class="pait-inline-textarea pait-inline-target" readonly></textarea>
        </div>
      </div>
    `;

      document.body.appendChild(resultBox);
      syncPaitThemeFromStorage();

      const headerEl = resultBox.querySelector('.pait-inline-toolbar');
      if (headerEl) {
        initTooltipDrag(headerEl, resultBox);
      }

      const sourceEditor = document.getElementById('pait-source-editor');
      if (sourceEditor) {
        sourceEditor.value = selectedText;
      }

      // Обробник закриття віконця
      const closeBtn = document.getElementById('pait-close-inline');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          tearDownInlineDrag();
          resultBox.remove();
        });
      }

      const setLoading = () => {
        const targetEditor = document.getElementById('pait-target-editor');
        if (!targetEditor) return;
        targetEditor.style.removeProperty('color');
        targetEditor.value = '⏳ Translating...';
      };

      const showError = (err) => {
        const targetEditor = document.getElementById('pait-target-editor');
        if (!targetEditor) return;
        targetEditor.style.color = '#ef4444';
        targetEditor.value = '❌ Error: Could not translate text.';
        console.error('Translation error:', err);
      };

      const requestTranslation = () => {
        const langSelect = document.getElementById('pait-lang-select');
        const targetLang = langSelect?.value || 'uk';

        if (!chrome?.runtime?.sendMessage) {
          showError('chrome.runtime.sendMessage unavailable');
          return;
        }

        setLoading();

        const src = document.getElementById('pait-source-editor');
        const text = src?.value ?? selectedText;

        chrome.runtime.sendMessage(
          { action: 'TRANSLATE_TEXT', text, targetLang },
          (response) => {
            const targetEditor = document.getElementById('pait-target-editor');
            if (!targetEditor) return;

            if (chrome.runtime.lastError || !response || !response.ok) {
              showError(chrome.runtime.lastError || response?.error);
            } else {
              targetEditor.style.removeProperty('color');
              // Безпечно: рендеримо як текст, без HTML
              targetEditor.value = response.data ?? '';
            }
          }
        );
      };

      const langSelectEl = document.getElementById('pait-lang-select');
      if (langSelectEl) {
        langSelectEl.addEventListener('mousedown', (ev) => ev.stopPropagation());
        langSelectEl.addEventListener('change', () => {
          requestTranslation();
        });
      }

      const sourceEditorEl = document.getElementById('pait-source-editor');
      if (sourceEditorEl) {
        sourceEditorEl.addEventListener('mousedown', (ev) => ev.stopPropagation());

        let debounceTimer = null;
        sourceEditorEl.addEventListener('input', () => {
          setLoading();
          if (debounceTimer) window.clearTimeout(debounceTimer);
          debounceTimer = window.setTimeout(() => {
            requestTranslation();
          }, 600);
        });
      }

      requestTranslation();
    });
  }

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
  tooltip.style.right = 'auto';
  tooltip.style.bottom = 'auto';

  console.log('PAIT selected text:', selectedText);
});

