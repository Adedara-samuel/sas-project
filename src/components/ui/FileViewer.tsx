/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
// src/components/ui/FileViewer.tsx

import React from 'react';
import { CourseResource } from '@/types/course';
import { FiAlertCircle, FiDownload } from 'react-icons/fi';

interface FileViewerProps {
  resource: CourseResource;
}

const FileViewer: React.FC<FileViewerProps> = ({ resource }) => {
  const fileType = resource.type;

  // Handle common file types that can be embedded
  if (fileType?.includes('pdf')) {
    return (
      <iframe
        src={resource.url}
        className="w-full h-[70vh] border-0 rounded-lg"
        title={resource.name}
      >
      </iframe>
    );
  }

  if (fileType?.includes('image')) {
    return (
      <div className="flex justify-center items-center h-full max-h-[70vh]">
        <img src={resource.url} alt={resource.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
      </div>
    );
  }

  // For other file types, show a message and a download link
  return (
    <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
      <FiAlertCircle className="text-5xl text-yellow-500 mx-auto mb-4" />
      <h4 className="text-xl font-semibold mb-2 text-gray-800">Cannot preview this file type</h4>
      <p className="text-gray-600 mb-4">
        The file type "{resource.type || 'Unknown'}" cannot be displayed directly in the browser.
      </p>
      <a
        href={resource.url}
        download
        className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        <FiDownload className="mr-2" /> Download File
      </a>
    </div>
  );
};

export default FileViewer;