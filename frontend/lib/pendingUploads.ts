/**
 * Module-level store for files that need WebR processing (e.g. .dta, .rdata).
 * Used to pass File objects from the dashboard to the session view across
 * Next.js client-side navigation (JS runtime stays alive).
 */
const pending = new Map<string, File[]>();

export function setPendingUploads(projectId: string, files: File[]) {
  if (files.length > 0) pending.set(projectId, files);
}

export function takePendingUploads(projectId: string): File[] {
  const files = pending.get(projectId) || [];
  pending.delete(projectId);
  return files;
}
