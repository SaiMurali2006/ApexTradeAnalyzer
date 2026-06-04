// Route an uploaded file to the right parser (CLAUDE.md §5.5).
export type FileKind = 'tlg' | 'csv';

export function detectFileType(filename: string, sample: string): FileKind {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'tlg') return 'tlg';
  if (ext === 'csv') return 'csv';
  // content sniff: .tlg is pipe-delimited with many columns and no comma header
  const firstLines = sample.split(/\r?\n/).slice(0, 10);
  const pipey = firstLines.filter((l) => (l.match(/\|/g)?.length ?? 0) >= 10).length;
  return pipey >= 2 ? 'tlg' : 'csv';
}
