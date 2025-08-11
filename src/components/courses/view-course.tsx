'use client'

import { JSX } from 'react';
import { FiDownload, FiExternalLink, FiFile } from 'react-icons/fi';

interface CourseResourcesProps {
  courseResources: { name: string; url: string; isPdf: boolean; type?: string; size?: number }[];
  canUpload: boolean;
  getFileIcon: (mimeType?: string) => JSX.Element;
  formatFileSize: (sizeInBytes?: number) => string;
}

export default function CourseResources({ courseResources, canUpload, getFileIcon, formatFileSize }: CourseResourcesProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <h3 className="p-6 text-xl font-semibold text-gray-800 border-b border-gray-200">Available Materials</h3>
      {courseResources.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {courseResources.map((resource, index) => (
            <li key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center flex-1 min-w-0">
                <div className="p-2 bg-gray-100 rounded-md">{getFileIcon(resource.type)}</div>
                <div className="ml-4 flex-1 truncate">
                  <p className="text-lg font-medium text-gray-900 truncate">{resource.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(resource.size)} {resource.type ? `(${resource.type})` : ''}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50">
                  <FiDownload className="text-xl" />
                </a>
                <button
                  onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                >
                  <FiExternalLink className="text-xl" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-12 px-6 text-gray-500">
          <FiFile className="text-6xl mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No materials uploaded.</p>
          {canUpload && <p className="text-sm">Use the upload section above.</p>}
        </div>
      )}
    </div>
  );
}