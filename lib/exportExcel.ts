import * as XLSX from 'xlsx';

/**
 * Exports data rows and headers into a Microsoft Excel (.xlsx) file.
 * 
 * @param headers Column header titles
 * @param rows Array of arrays representing the table rows
 * @param filename Desired name of the exported file (without extension)
 */
export function exportToExcel(
  headers: string[],
  rows: any[][],
  filename: string
) {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Auto-fit column widths for better readability
  const cols = headers.map((h, i) => {
    let maxLen = h.toString().length;
    rows.forEach(r => {
      if (r[i] !== undefined && r[i] !== null) {
        maxLen = Math.max(maxLen, r[i].toString().length);
      }
    });
    return { wch: maxLen + 3 };
  });
  ws['!cols'] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  
  // Format the date to avoid filename issues
  const cleanFilename = filename.replace(/[^a-zA-Z0-9_\-]/g, '_');
  XLSX.writeFile(wb, `${cleanFilename}.xlsx`);
}
