// Tiny, dependency-free CSV serialisation + client-side download helpers.
// Used by the browse island's "download visible incidents" action.

// UTF-8 byte-order mark. Prepended to downloaded CSVs so spreadsheet apps
// (notably Excel) detect UTF-8 and render accented characters correctly.
const BOM = String.fromCharCode(0xfeff);

/** Escape one CSV field per RFC 4180: wrap in quotes when it contains a comma,
 * double-quote, CR or LF, and double any embedded quotes. Everything else is
 * emitted verbatim. */
function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialise a matrix of string cells to an RFC 4180 CSV string (CRLF rows). */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

/** Trigger a browser download of `csv` as `filename` (UTF-8 with BOM). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
