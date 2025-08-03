import React, { useEffect, useState } from 'react';

interface PdfPreviewProps {
  url?: string;
  content?: string | ArrayBuffer;
}

/**
 * PdfPreview component that renders a PDF from either a URL or content
 * 
 * @param url - URL of the PDF to render in an iframe
 * @param content - PDF content as a base64 string or ArrayBuffer
 */
const PdfPreview: React.FC<PdfPreviewProps> = ({ url, content }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    // If content is provided, create an object URL
    if (content) {
      let blob;
      
      if (typeof content === 'string') {
        // If content is a base64 string, convert it to a Blob
        const byteCharacters = atob(content.split(',')[1] || content);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArrays.push(byteCharacters.charCodeAt(i));
        }
        
        blob = new Blob([new Uint8Array(byteArrays)], { type: 'application/pdf' });
      } else {
        // If content is an ArrayBuffer, create a Blob directly
        blob = new Blob([content], { type: 'application/pdf' });
      }
      
      const newObjectUrl = URL.createObjectURL(blob);
      setObjectUrl(newObjectUrl);
      
      // Clean up the object URL when the component unmounts or content changes
      return () => {
        URL.revokeObjectURL(newObjectUrl);
      };
    }
  }, [content]);

  // Determine the source for the iframe
  const iframeSrc = url || objectUrl || '';

  return (
    <iframe
      src={iframeSrc}
      title="PDF Preview"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
};

export default PdfPreview;
