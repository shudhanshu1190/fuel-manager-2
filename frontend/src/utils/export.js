import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Client-side Excel Export
export const exportToExcel = (data, fileName = 'report') => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Excel export failed:', error);
    alert('Excel Export failed. Please try again.');
  }
};

// Client-side PDF Export
export const exportToPDF = ({ title, headers, body, summary, fileName = 'report' }) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Add title
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(title, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    // Add main data table
    doc.autoTable({
      startY: 26,
      head: [headers],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] }, // orange-500
      styles: { fontSize: 8, cellPadding: 2 },
    });
    
    // Add summary calculations if present
    if (summary && summary.length > 0) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Summary Metrics / विवरण सारांश:', 14, finalY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      let currentY = finalY + 6;
      summary.forEach((line) => {
        doc.text(line, 14, currentY);
        currentY += 5;
      });
    }

    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('PDF Export failed. Please try again.');
  }
};
