// html2pdf.d.ts

declare module 'html2pdf.js' {
    interface Options {
        margin?: number | [number, number, number, number];
        filename?: string;
        image?: {
            type: string;
            quality: number;
        };
        html2canvas?: {
            scale?: number;
            dpi?: number;
            letterRendering?: boolean;
            useCORS?: boolean;
            allowTaint?: boolean;
        };
        jsPDF?: {
            unit?: string;
            format?: string;
            orientation?: 'portrait' | 'landscape';
        };
        pagebreak?: {
            mode?: string | Array<string>;
            before?: string | Array<string>;
            after?: string | Array<string>;
            avoid?: string | Array<string>;
        };
    }

    interface HTML2PDF {
        (element?: HTMLElement, options?: Options): HTML2PDF;
        from(element: HTMLElement | string): HTML2PDF;
        set(options: Options): HTML2PDF;
        save(): void;
        output(
            type:
                | 'dataurlstring'
                | 'datauristring'
                | 'dataurlnewwindow'
                | 'blob'
                | 'arraybuffer'
        ): Promise<any>;
        outputPdf(type: string): any;
    }

    const html2pdf: HTML2PDF;
    export = html2pdf;
}
