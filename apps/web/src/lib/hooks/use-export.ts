import { apiFetch } from '../api/api-client';

// Helper to trigger browser download from binary response
async function downloadFile(endpoint: string, filename: string) {
  // We use fetch directly here because our apiFetch wrapper might assume JSON
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('access_token='))
    ?.split('=')[1];

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Export failed');

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
