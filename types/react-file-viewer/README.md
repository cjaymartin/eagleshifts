# TypeScript definitions for react-file-viewer

This package contains type definitions for [react-file-viewer](https://github.com/plangrid/react-file-viewer).

## Installation

You don't need to install this package directly. TypeScript will automatically find and use these definitions when you import `react-file-viewer` in your project.

## Usage

```typescript
import FileViewer from 'react-file-viewer';
import { FileViewerProps, PDFViewer, CsvViewer } from 'react-file-viewer';

// Use the main FileViewer component
const MyFileViewer: React.FC = () => {
  return (
    <FileViewer
      fileType="pdf"
      filePath="/path/to/document.pdf"
      onError={(e) => console.log(e)}
    />
  );
};

// Or use individual viewer components
const MyPDFViewer: React.FC = () => {
  return (
    <PDFViewer
      filePath="/path/to/document.pdf"
      disableVisibilityCheck={true}
    />
  );
};
```

## Structure

The type definitions include:

- `FileViewer` - The main component
- Individual viewer components:
  - `CsvViewer`
  - `PDFViewer`
  - `DocxViewer`
  - `VideoViewer`
  - `XlsxViewer`
  - `XBimViewer`
  - `PhotoViewer`
  - `PhotoViewerWrapper`
  - `Photo360Viewer`
  - `AudioViewer`
  - `UnsupportedViewer`
- Type definitions for all component props
- `SUPPORTED_FILE_TYPES` constant

## License

MIT