chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("PAIT SidePanel Error:", error));
  }
});

const GRAPHQL_URL = 'https://pait-server.onrender.com/graphql';

async function getAuthToken() {
  if (!chrome?.storage?.local) return null;
  const result = await chrome.storage.local.get('authToken');
  return result?.authToken ?? null;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request?.action) return;

  if (request.action === 'SAVE_NOTE') {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ ok: false, error: 'Not authenticated' });
          return;
        }

        const graphqlQuery = {
          query: `
            mutation CreateNote($text: String!, $sourceUrl: String) {
              createNote(text: $text, sourceUrl: $sourceUrl) {
                id
              }
            }
          `,
          variables: {
            text: request.text,
            sourceUrl: request.sourceUrl,
          },
        };

        const res = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(graphqlQuery),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          sendResponse({ ok: false, error: data?.error || `HTTP ${res.status}` });
          return;
        }

        if (data?.errors?.length) {
          sendResponse({ ok: false, error: data.errors[0]?.message || 'GraphQL error' });
          return;
        }

        sendResponse({ ok: true, data: data?.data });
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || 'Unknown error' });
      }
    })();

    // ВАЖЛИВО: return true має бути синхронно в гілці SAVE_NOTE
    return true;
  }

  if (request.action === 'TRANSLATE_TEXT') {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ ok: false, error: 'Not authenticated' });
          return;
        }

        const text = (request.text ?? '').toString();
        if (!text.trim()) {
          sendResponse({ ok: false, error: 'No text to translate' });
          return;
        }

        const targetLangRaw = (request.targetLang ?? '').toString().trim();
        const targetLang = targetLangRaw || 'uk';

        const graphqlQuery = {
          query: `
            mutation Translate($text: String!, $targetLang: String!) {
              translate(text: $text, targetLang: $targetLang) {
                outputResult
              }
            }
          `,
          variables: {
            text,
            targetLang,
          },
        };

        const res = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(graphqlQuery),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          sendResponse({ ok: false, error: data?.error || `HTTP ${res.status}` });
          return;
        }

        if (data?.errors?.length) {
          sendResponse({ ok: false, error: data.errors[0]?.message || 'GraphQL error' });
          return;
        }

        const translated = data?.data?.translate?.outputResult;
        if (!translated) {
          sendResponse({ ok: false, error: 'Empty translation result' });
          return;
        }

        // Відправляємо сигнал в React-додаток, що історія оновилася
        chrome.runtime.sendMessage({ action: 'HISTORY_UPDATED' }).catch(() => {});

        // content.js очікує строку в response.data
        sendResponse({ ok: true, data: translated });
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || 'Unknown error' });
      }
    })();

    return true;
  }

  if (request.action === 'SUMMARIZE_TEXT') {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ ok: false, error: 'Not authenticated' });
          return;
        }

        const text = (request.text ?? '').toString();
        if (!text.trim()) {
          sendResponse({ ok: false, error: 'No text to summarize' });
          return;
        }

        const lengthRaw = (request.length ?? '').toString().trim();
        const length = lengthRaw || 'medium';

        const languageRaw = (request.language ?? '').toString().trim();
        const language = languageRaw || 'uk';

        const graphqlQuery = {
          query: `
            mutation Summarize($text: String!, $language: String, $length: String) {
              summarize(text: $text, language: $language, length: $length) {
                outputResult
              }
            }
          `,
          variables: {
            text,
            language,
            length,
          },
        };

        const res = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(graphqlQuery),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          sendResponse({ ok: false, error: data?.error || `HTTP ${res.status}` });
          return;
        }

        if (data?.errors?.length) {
          sendResponse({ ok: false, error: data.errors[0]?.message || 'GraphQL error' });
          return;
        }

        const summarized = data?.data?.summarize?.outputResult;
        if (!summarized) {
          sendResponse({ ok: false, error: 'Empty summary result' });
          return;
        }

        // Відправляємо сигнал в React-додаток, що історія оновилася
        chrome.runtime.sendMessage({ action: 'HISTORY_UPDATED' }).catch(() => {});

        sendResponse({ ok: true, data: summarized });
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || 'Unknown error' });
      }
    })();

    return true;
  }
});

