export async function exportReportPdf(element, sessionId) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts.ready;

  const canvas = await html2canvas(element, { 
    scale: 2, 
    backgroundColor: '#ffffff', 
    logging: false,
    useCORS: true
  });

  // Strict A4 Standard Paper Format (210mm x 297mm)
  const pdf = new jsPDF({ 
    orientation: 'portrait', 
    unit: 'mm', 
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const usableWidth = pageWidth - (margin * 2); // 190mm
  const usableHeight = pageHeight - (margin * 2); // 277mm

  const contentHeightInMm = (canvas.height * usableWidth) / canvas.width;

  // Case 1: Fits cleanly on single A4 sheet (with proportional scaling if within 15% overflow)
  if (contentHeightInMm <= usableHeight * 1.18) {
    const scale = contentHeightInMm > usableHeight ? usableHeight / contentHeightInMm : 1;
    const printWidth = usableWidth * scale;
    const printHeight = contentHeightInMm * scale;
    const xOffset = margin + (usableWidth - printWidth) / 2;
    const yOffset = margin + (usableHeight - printHeight) / 2;

    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.98), 
      'JPEG', 
      xOffset, 
      yOffset, 
      printWidth, 
      printHeight
    );
  } else {
    // Case 2: Multi-page strictly chunked by A4 height
    const pagePixelHeight = Math.floor((usableHeight * canvas.width) / usableWidth);
    let offset = 0;

    while (offset < canvas.height) {
      const chunkHeight = Math.min(pagePixelHeight, canvas.height - offset);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = chunkHeight;

      const pageCtx = pageCanvas.getContext('2d');
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas, 
        0, offset, canvas.width, chunkHeight, 
        0, 0, canvas.width, chunkHeight
      );

      if (offset > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const chunkHeightInMm = (chunkHeight * usableWidth) / canvas.width;
      pdf.addImage(
        pageCanvas.toDataURL('image/jpeg', 0.98), 
        'JPEG', 
        margin, 
        margin, 
        usableWidth, 
        chunkHeightInMm
      );

      offset += chunkHeight;
    }
  }

  pdf.save(`training-report-A4-${String(sessionId || 'summary').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}
