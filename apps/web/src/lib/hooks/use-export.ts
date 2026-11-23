// A bulletproof helper to find the JWT token in localStorage or cookies
function getAuthToken(): string | null {
  // 1. Check direct localStorage keys
  const directKeys = ['token', 'access_token', 'accessToken', 'jwt'];
  for (const key of directKeys) {
    const val = localStorage.getItem(key);
    if (val) return val.replace(/^Bearer\s+/i, ''); // Remove "Bearer " if it's already there
  }

  // 2. Recursively search Zustand persist stores for anything that looks like a JWT
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const val = localStorage.getItem(key);
    if (!val) continue;

    try {
      const parsed = JSON.parse(val);
      const findToken = (obj: any): string | null => {
        // A valid JWT starts with "eyJ" and has at least two dots
        if (typeof obj === 'string' && obj.startsWith('eyJ') && obj.split('.').length === 3) {
          return obj;
        }
        if (typeof obj === 'object' && obj !== null) {
          for (const k in obj) {
            const res = findToken(obj[k]);
            if (res) return res;
          }
        }
        return null;
      };

      const found = findToken(parsed);
      if (found) return found;
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 3. Check Cookies
  const cookieKeys = ['token', 'access_token', 'accessToken', 'jwt'];
  for (const key of cookieKeys) {
    const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (match) return match[2].replace(/^Bearer\s+/i, '');
  }

  return null;
}

export async function downloadFile(endpoint: string, filename: string) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  // Debugging: Log the token to the console so you can see what is being sent
  console.log('Downloading with token:', token.slice(0, 15) + '...');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Export failed (${res.status}): ${errorText || res.statusText}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

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
