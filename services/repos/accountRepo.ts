import { callFn } from '../api';

// Account lifecycle: the two edge functions behind Settings → Your data.
// Both are authenticated with the current session by callFn.

export interface AccountExport {
  format: 'cvbase-account-export';
  version: number;
  exportedAt: string;
  [section: string]: unknown;
}

/** Mirrors the server's Content-Disposition filename (callFn parses the body
 *  as JSON, so the header itself is not available here). */
export function exportFilename(exportedAt: string | Date = new Date()): string {
  const d = typeof exportedAt === 'string' ? new Date(exportedAt) : exportedAt;
  const date = Number.isNaN(d.getTime()) ? new Date() : d;
  return `cvbase-export-${date.toISOString().slice(0, 10)}.json`;
}

/** Hand a text file to the browser as a download. */
// TODO(native): route through lib/export/saveFile once it lands
export function triggerDownload(text: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the click a tick to grab the URL before it is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Fetch the full account export and save it as a JSON file. Resolves with
 *  the filename that was offered for download. */
export async function exportAccount(): Promise<string> {
  const data = await callFn<AccountExport>('account-export', {});
  const filename = exportFilename(data.exportedAt);
  triggerDownload(JSON.stringify(data, null, 2), filename);
  return filename;
}

/** Permanently delete the signed-in account. `confirmEmail` must match the
 *  session's email; the function refuses otherwise (`confirm_mismatch`). The
 *  caller is responsible for signing out afterwards — the session's user no
 *  longer exists once this resolves. */
export async function deleteAccount(confirmEmail: string): Promise<void> {
  await callFn<{ deleted: boolean }>('account-delete', { confirm: confirmEmail.trim() });
}
