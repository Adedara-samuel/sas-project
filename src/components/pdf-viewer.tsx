/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, FC } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Setting the worker source is crucial for PDF.js to work
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
    pdfUrl: string;
}

const PdfViewer: FC<PdfViewerProps> = ({ pdfUrl }) => {
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pdfUrl) {
            setError('No PDF URL provided.');
            setLoading(false);
            return;
        }

        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });

        loadingTask.promise.then(
            async (pdf: any) => {
                const container = canvasContainerRef.current;
                if (!container) return;

                // Clear previous canvas elements
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };

                    await page.render(renderContext).promise;

                    container.appendChild(canvas);
                }

                setLoading(false);
            },
            (reason: any) => {
                // reason can be any type, so we need to handle it gracefully
                setError(`Failed to load PDF: ${reason?.message || reason}`);
                setLoading(false);
            }
        );
    }, [pdfUrl]);

    if (loading) {
        return <div>Loading PDF...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h3>PDF Viewer</h3>
            <div ref={canvasContainerRef}></div>
        </div>
    );
};

export default PdfViewer;
