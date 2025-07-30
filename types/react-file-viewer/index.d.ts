declare module 'react-file-viewer' {
  import { Component, ReactElement } from 'react';

  export type FileViewerProps = {
    /**
     * The type of file to be viewed (e.g., 'pdf', 'csv', 'xlsx', etc.)
     */
    fileType: string;

    /**
     * The path or URL to the file
     */
    filePath: string;

    /**
     * Callback function that is called when an error occurs
     */
    onError?: (error: Error) => void;

    /**
     * Custom component to display when an error occurs
     */
    errorComponent?: ReactElement;

    /**
     * Custom component to display when the file type is not supported
     */
    unsupportedComponent?: ReactElement;
  };

  /**
   * A component for viewing various file types
   */
  export default class FileViewer extends Component<FileViewerProps> {}

  /**
   * List of file types supported by react-file-viewer
   */
  export const SUPPORTED_FILE_TYPES: string[];

  // Driver Components

  /**
   * Props for the CsvViewer component
   */
  export interface CsvViewerProps {
    /**
     * The CSV data to be parsed and displayed
     */
    data: string;

    /**
     * The height of the grid
     */
    height?: number;
  }

  /**
   * Component for viewing CSV files
   */
  export class CsvViewer extends Component<CsvViewerProps> {}

  /**
   * Props for the PDFViewer component
   */
  export interface PDFViewerProps {
    /**
     * The path to the PDF file
     */
    filePath: string;

    /**
     * Whether to disable visibility checking for pages
     */
    disableVisibilityCheck?: boolean;
  }

  /**
   * Component for viewing PDF files
   */
  export class PDFViewer extends Component<PDFViewerProps> {}

  /**
   * Props for the DocxViewer component
   */
  export interface DocxViewerProps {
    /**
     * The path to the DOCX file
     */
    filePath: string;

    /**
     * The data of the DOCX file
     */
    data?: string;
  }

  /**
   * Component for viewing DOCX files
   */
  export class DocxViewer extends Component<DocxViewerProps> {}

  /**
   * Props for the VideoViewer component
   */
  export interface VideoViewerProps {
    /**
     * The path to the video file
     */
    filePath: string;

    /**
     * The type of the video file (e.g., 'mp4', 'webm')
     */
    fileType: string;
  }

  /**
   * Component for viewing video files
   */
  export class VideoViewer extends Component<VideoViewerProps> {}

  /**
   * Props for the XlsxViewer component
   */
  export interface XlsxViewerProps {
    /**
     * The path to the XLSX file
     */
    filePath: string;

    /**
     * The data of the XLSX file
     */
    data?: ArrayBuffer;
  }

  /**
   * Component for viewing XLSX files
   */
  export class XlsxViewer extends Component<XlsxViewerProps> {}

  /**
   * Props for the XBimViewer component
   */
  export interface XBimViewerProps {
    /**
     * The path to the XBIM file
     */
    filePath: string;
  }

  /**
   * Component for viewing XBIM files
   */
  export class XBimViewer extends Component<XBimViewerProps> {}

  /**
   * Props for the PhotoViewer component
   */
  export interface PhotoViewerProps {
    /**
     * The path to the image file
     */
    filePath: string;
  }

  /**
   * Component for viewing image files
   */
  export class PhotoViewer extends Component<PhotoViewerProps> {}

  /**
   * Props for the PhotoViewerWrapper component
   */
  export interface PhotoViewerWrapperProps {
    /**
     * The path to the image file
     */
    filePath: string;
  }

  /**
   * Wrapper component for the PhotoViewer
   */
  export class PhotoViewerWrapper extends Component<PhotoViewerWrapperProps> {}

  /**
   * Props for the Photo360Viewer component
   */
  export interface Photo360ViewerProps {
    /**
     * The path to the 360 photo file
     */
    filePath: string;
  }

  /**
   * Component for viewing 360 photos
   */
  export class Photo360Viewer extends Component<Photo360ViewerProps> {}

  /**
   * Props for the AudioViewer component
   */
  export interface AudioViewerProps {
    /**
     * The path to the audio file
     */
    filePath: string;

    /**
     * The type of the audio file (e.g., 'mp3')
     */
    fileType: string;
  }

  /**
   * Component for viewing audio files
   */
  export class AudioViewer extends Component<AudioViewerProps> {}

  /**
   * Props for the UnsupportedViewer component
   */
  export interface UnsupportedViewerProps {
    /**
     * The path to the unsupported file
     */
    filePath: string;

    /**
     * The type of the unsupported file
     */
    fileType: string;
  }

  /**
   * Component for displaying unsupported file types
   */
  export class UnsupportedViewer extends Component<UnsupportedViewerProps> {}
}
