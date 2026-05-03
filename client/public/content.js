console.log('PAIT Content Script Loaded!');

const TOOLTIP_ID = 'pait-magic-tooltip';
const INLINE_RESULT_ID = 'pait-inline-result';

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

      const tooltipTop = Number.parseInt(tooltip.style.top || '0', 10) || 0;

      Object.assign(resultBox.style, {
        position: 'absolute',
        top: `${tooltipTop + 40}px`,
        left: tooltip.style.left,
        right: 'auto',
        bottom: 'auto',
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #334155',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        width: '350px',
        resize: 'both',
        overflow: 'auto',
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
        <div class="pait-inline-toolbar" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <span class="pait-inline-label" style="font-size: 12px; color: #94a3b8; font-weight: bold;">✨ Summary</span>
            <select id="pait-summary-lang" class="pait-inline-select" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; font-size: 12px; outline: none; padding: 2px 4px;">
              <option value="uk" selected>Ukrainian</option>
              <option value="en">English</option>
              <option value="pl">Polish</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
            </select>
            <select id="pait-summary-length" class="pait-inline-select" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; font-size: 12px; outline: none; padding: 2px 4px;">
              <option value="short">Short (1-2 sentences)</option>
              <option value="medium" selected>Standard</option>
              <option value="long">Detailed</option>
            </select>
          </div>
          <button id="pait-close-inline" class="pait-inline-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">×</button>
        </div>
        <textarea id="pait-summary-content" class="pait-inline-textarea" readonly style="width: 100%; flex: 1; height: 100%; background: transparent; color: #f8fafc; border: none; resize: none; outline: none; font-size: 14px; font-family: sans-serif;">⏳ Summarizing...</textarea>
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
          contentEl.style.color = '#f8fafc';
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
            el.style.color = '#f8fafc';
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

      const tooltipTop = Number.parseInt(tooltip.style.top || '0', 10) || 0;

      // Стилізуємо віконце (Tailwind-like стилі через JS)
      Object.assign(resultBox.style, {
        position: 'absolute',
        top: `${tooltipTop + 40}px`, // Трохи нижче тултипу
        left: tooltip.style.left,
        right: 'auto',
        bottom: 'auto',
        backgroundColor: '#1e293b', // slate-800
        color: '#f8fafc', // slate-50
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #334155', // slate-700
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        width: '500px',
        resize: 'both',
        overflow: 'auto',
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
      <div class="pait-inline-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
        <select id="pait-lang-select" class="pait-inline-select" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; font-size: 12px; outline: none; padding: 2px 4px;">
          <option value="uk">Ukrainian</option>
          <option value="en">English</option>
          <option value="pl">Polish</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
        </select>
        <button id="pait-close-inline" class="pait-inline-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">×</button>
      </div>
      <div style="display: flex; gap: 8px; flex: 1; min-height: 120px;">
        <textarea id="pait-source-editor" class="pait-inline-textarea" style="flex: 1; height: 100%; background: transparent; color: #f8fafc; border: none; resize: none; outline: none; font-size: 14px; font-family: sans-serif;"></textarea>
        <div class="pait-inline-divider" style="width: 1px; background-color: #334155;"></div>
        <textarea id="pait-target-editor" class="pait-inline-textarea pait-inline-target" readonly style="flex: 1; height: 100%; background: transparent; color: #10b981; border: none; resize: none; outline: none; font-size: 14px; font-family: sans-serif;"></textarea>
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
              targetEditor.style.color = '#10b981';
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

