export function safeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

export function createCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(safeCsvCell).join(","),
    ...rows.map((row) => row.map(safeCsvCell).join(",")),
  ].join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const blob = new Blob([`\uFEFF${createCsv(headers, rows)}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
