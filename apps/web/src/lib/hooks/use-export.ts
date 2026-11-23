export async function downloadFile(endpoint: string, filename: string) {
  // 1. Try to get the token from localStorage, then fallback to cookies
  let token = localStorage.getItem('access_token') || localStorage.getItem('token');

  if (!token) {
    token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('access_token=') || row.startsWith('token='))
      ?.split('=')[1];
  }

  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (!baseUrl) {
    console.warn('NEXT_PUBLIC_API_URL is not set. Falling back to relative path.');
  }

  // 2. Fetch the file
  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // Try to read the error message from the backend (e.g., 401 Unauthorized)
    const errorText = await res.text();
    throw new Error(`Export failed (${res.status}): ${errorText || res.statusText}`);
  }

  // 3. Trigger the browser download
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
