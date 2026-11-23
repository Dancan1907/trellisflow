export async function downloadFile(endpoint: string, filename: string) {
  let token: string | null = null;

  // 1. Check common localStorage keys
  const lsKeys = ['token', 'access_token', 'accessToken', 'jwt'];
  for (const key of lsKeys) {
    const val = localStorage.getItem(key);
    if (val) {
      token = val;
      break;
    }
  }

  // 2. Check Zustand persist storage (often stored as a JSON string under 'auth-storage' or similar)
  if (!token) {
    // Next.js often uses a key like 'auth-storage' or 'auth'
    for (const storeKey of ['auth-storage', 'auth', 'user-storage']) {
      const authStorage = localStorage.getItem(storeKey);
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          // Zustand usually puts the data inside parsed.state
          token =
            parsed?.state?.token ||
            parsed?.state?.accessToken ||
            parsed?.state?.jwt ||
            parsed?.state?.user?.token;
          if (token) break;
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  }

  // 3. Check Cookies (in case the token was synced to a cookie)
  if (!token) {
    const cookieKeys = ['token', 'access_token', 'accessToken', 'jwt'];
    for (const key of cookieKeys) {
      const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
      if (match) {
        token = match[2];
        break;
      }
    }
  }

  // 4. Build headers
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // 5. Fetch the file (include credentials in case the API relies on HttpOnly cookies)
  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Export failed (${res.status}): ${errorText || res.statusText}`);
  }

  // 6. Trigger the browser download
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function exportJson() {
  return downloadFile('/api/export/json', `trellisflow-export-${Date.now()}.json`);
}

export function exportCsv() {
  return downloadFile('/api/export/csv', `trellisflow-transactions-${Date.now()}.csv`);
}

export function exportPdf() {
  return downloadFile('/api/export/pdf', `trellisflow-networth-${Date.now()}.pdf`);
}
