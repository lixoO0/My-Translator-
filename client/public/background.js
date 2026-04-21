const GRAPHQL_URL = 'https://pait-server.onrender.com/graphql';

async function getAuthToken() {
  if (!chrome?.storage?.local) return null;
  const result = await chrome.storage.local.get('authToken');
  return result?.authToken ?? null;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request || request.action !== 'SAVE_NOTE') return;

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
});

