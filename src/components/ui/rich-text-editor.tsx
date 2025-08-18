// src/components/ui/rich-text-editor.tsx
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill/dist/quill.snow.css";

const QuillNoSSRWrapper = dynamic(() => import("react-quill"), {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
});

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    quillRef: React.RefObject<any>;
    imageHandler: () => void;
}

export const RichTextEditor = ({
    value,
    onChange,
    quillRef,
    imageHandler,
}: RichTextEditorProps) => {
    const modules = useMemo(
        () => ({
            toolbar: {
                container: [
                    [{ header: [1, 2, 3, 4, 5, 6, false] }],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["bold", "italic", "underline", "strike"],
                    [{ align: [] }],
                    ["link", "image", "video"],
                    ["clean"],
                ],
                handlers: {
                    image: imageHandler,
                },
            },
        }),
        [imageHandler]
    );

    return (
        <QuillNoSSRWrapper
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={onChange}
            modules={modules}
            className="quill-editor"
        />
    );
};