import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Could not find the dashboard area to export.");
    return;
  }

  // Force light mode styles
  const styleId = 'pdf-export-styles';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* Global White Background */
      body.pdf-exporting, .pdf-export-mode {
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      /* Hide all scrollbars and force full width expansion during PDF export */
      .pdf-export-mode, .pdf-export-mode * {
        overflow: visible !important;
        max-height: none !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      .pdf-export-mode *::-webkit-scrollbar,
      .pdf-export-mode::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      /* Override any Tailwind dark mode backgrounds */
      .pdf-export-mode * {
        background-color: transparent !important;
        border-color: #e2e8f0 !important;
      }
      /* Keep specific container backgrounds white */
      .pdf-export-mode div[class*="bg-["], 
      .pdf-export-mode div[class*="bg-[#"], 
      .pdf-export-mode div[class*="bg-slate-"], 
      .pdf-export-mode div[class*="bg-gray-"] {
        background-color: #ffffff !important;
      }
      /* Force all text to black for readability */
      .pdf-export-mode span, 
      .pdf-export-mode p, 
      .pdf-export-mode h1, 
      .pdf-export-mode h2, 
      .pdf-export-mode h3, 
      .pdf-export-mode td,
      .pdf-export-mode th,
      .pdf-export-mode div {
        color: #0f172a !important;
      }
      /* Specific text color overrides */
      .pdf-export-mode [class*="text-white"],
      .pdf-export-mode [class*="text-slate-"] {
        color: #0f172a !important;
      }
      /* Keep accent text colors (emerald, blue, red) visible but darker */
      .pdf-export-mode .text-emerald-400 { color: #059669 !important; }
      .pdf-export-mode .text-blue-400 { color: #2563eb !important; }
      .pdf-export-mode .text-red-400 { color: #dc2626 !important; }
      .pdf-export-mode .text-orange-400 { color: #ea580c !important; }
      .pdf-export-mode .text-cyan-400 { color: #0891b2 !important; }
      .pdf-export-mode .text-purple-400 { color: #9333ea !important; }
      .pdf-export-mode .text-pink-400 { color: #db2777 !important; }
      .pdf-export-mode .text-sky-400 { color: #0284c7 !important; }
      .pdf-export-mode .text-indigo-400 { color: #4f46e5 !important; }
      .pdf-export-mode .text-amber-400 { color: #d97706 !important; }
    `;
    document.head.appendChild(style);
  }

  document.body.classList.add('pdf-exporting');
  element.classList.add('pdf-export-mode');

  try {
    const imgData = await htmlToImage.toJpeg(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });
    
    const pdf = new jsPDF({
      orientation: element.scrollWidth > element.scrollHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [element.scrollWidth, element.scrollHeight]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, element.scrollWidth, element.scrollHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF: ' + (error.message || 'Unknown error'));
  } finally {
    document.body.classList.remove('pdf-exporting');
    element.classList.remove('pdf-export-mode');
  }
};

