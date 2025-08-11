'use client'

import { useState } from 'react'
import { FiExternalLink, FiFile, FiX } from 'react-icons/fi'
import { CourseResource } from '@/types/course'
import { JSX } from 'react/jsx-runtime'

interface CourseResourcesProps {
  courseResources: CourseResource[]
  canUpload: boolean
  getFileIcon: (mimeType?: string) => JSX.Element
  formatFileSize: (sizeInBytes?: number) => string
}

function PdfViewerModal({
  resource,
  onClose
}: {
  resource: CourseResource
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleIframeLoad = () => {
    setLoading(false)
    setError('')
  }

  const handleIframeError = () => {
    setError('Failed to load PDF. The file might be corrupted or unavailable.')
    setLoading(false)
  }

  // if (!resource.isPdf) {
  //   return (
  //     <div className="p-6">
  //       <p>This file is not a PDF and cannot be viewed here.</p>
  //     </div>
  //   )
  // }

  // if (!resource.isPublic) {
  //   return (
  //     <div className="p-6">
  //       <p>This PDF is private and cannot be opened directly.</p>
  //       <p>Please ask the course admin to re-upload it as public.</p>
  //     </div>
  //   )
  // }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3
                className="text-lg leading-6 font-medium text-gray-900"
                id="modal-title"
              >
                Document Viewer
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                aria-label="Close document viewer"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4">
              {loading && (
                <div
                  className="flex justify-center items-center h-64"
                  aria-live="polite"
                >
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
                  <span className="sr-only">Loading document...</span>
                </div>
              )}
              <iframe
                src={resource.url}
                className="w-full h-[80vh] border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={`PDF Viewer - ${
                  resource.url.split('/').pop() || 'document'
                }`}
                loading="lazy"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiX className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CourseResources({
  courseResources = [],
  canUpload = false,
  getFileIcon,
  formatFileSize
}: CourseResourcesProps) {
  const [selectedResource, setSelectedResource] =
    useState<CourseResource | null>(null)

  const openPdfViewer = (resource: CourseResource) => {
    setSelectedResource(resource)
  }

  const closePdfViewer = () => {
    setSelectedResource(null)
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <h3 className="p-6 text-xl font-semibold text-gray-800 border-b border-gray-200">
          Available Materials
        </h3>
        {courseResources.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {courseResources.map((resource, index) => (
              <li
                key={`${resource.name}-${index}`}
                className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="p-2 bg-gray-100 rounded-md">
                    {getFileIcon(resource.type)}
                  </div>
                  <div className="ml-4 flex-1 truncate">
                    <p className="text-lg font-medium text-gray-900 truncate">
                      {resource.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(resource.size)}{' '}
                      {resource.type ? `(${resource.type})` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4 ml-0 sm:ml-4 mt-4 sm:mt-0 flex-shrink-0">
                  <button
                    onClick={() => openPdfViewer(resource)}
                    className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors duration-200 text-sm font-medium"
                  >
                    <FiExternalLink className="mr-2" />
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <FiFile className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No materials have been uploaded yet.</p>
            {canUpload && (
              <p className="mt-1">Use the section above to get started.</p>
            )}
          </div>
        )}
      </div>

      {selectedResource && (
        <PdfViewerModal
          resource={selectedResource}
          onClose={closePdfViewer}
        />
      )}
    </div>
  )
}
