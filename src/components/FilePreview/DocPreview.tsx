import React, { useState, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

interface DocPreviewProps {
    url: string;
    fileName: string;
    fileType: string;
}

const DocPreview: React.FC<DocPreviewProps> = ({ url, fileName, fileType }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Clear state when inputs change
        setPdfUrl(null);
        setError(null);

        if (!url) {
            return;
        }

        const convertAndDisplay = async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch file: ${response.statusText}`
                    );
                }

                const arrayBuffer = await response.arrayBuffer();
                let htmlContent = '';

                if (
                    fileType ===
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ) {
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    htmlContent = result.value;
                } else if (
                    fileType ===
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ) {
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    htmlContent = XLSX.utils.sheet_to_html(worksheet);
                } else {
                    setError(`Unsupported file type: ${fileType}`);
                    return;
                }

                // Use a temporary div to render the content for html2pdf
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;

                const options = {
                    margin: 10,
                    filename: `${fileName.replace(/\.[^/.]+$/, '')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: {
                        unit: 'mm',
                        format: 'a4',
                        orientation: 'portrait',
                    },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                };

                const pdf = await html2pdf()
                    .from(tempDiv)
                    .set(options as any)
                    .output('blob');
                const objectUrl = URL.createObjectURL(pdf);
                setPdfUrl(objectUrl);
            } catch (err) {
                setError(
                    `Failed to process the document: ${err instanceof Error ? err.message : String(err)}`
                );
            }
        };

        convertAndDisplay();

        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [url, fileType, fileName]);

    if (error) {
        return (
            <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>
        );
    }

    if (!pdfUrl) {
        return (
            <div style={{ padding: '20px' }}>
                Loading and converting document...
            </div>
        );
    }

    return (
        <iframe
            title={fileName}
            src={pdfUrl}
            style={{ width: '100%', height: '100vh', border: 'none' }}
        />
    );
};

export default DocPreview;
