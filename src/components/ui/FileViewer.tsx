/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @/components/FileViewerModal.tsx

'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { FiX, FiZoomIn, FiZoomOut, FiRotateCw, FiChevronLeft, FiChevronRight, FiFile } from 'react-icons/fi'

const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FiFile className="text-gray-400" />
    if (mimeType.includes('pdf')) return <FiFile className="text-red-500" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FiFile className="text-blue-700" />
    if (mimeType.includes('image')) return <FiFile className="text-green-500" />
    if (mimeType.includes('presentation')) return <FiFile className="text-orange-500" />
    if (mimeType.includes('spreadsheet')) return <FiFile className="text-green-700" />
    if (mimeType.includes('zip')) return <FiFile className="text-purple-500" />
    return <FiFile className="text-gray-500" />
}

export default function FileViewerModal() {
    const { viewingResource, setViewingResource, currentCourse } = useStore()
    const [imageZoom, setImageZoom] = useState(1)
    const [imageRotation, setImageRotation] = useState(0)
    const [imageSlideshow, setImageSlideshow] = useState<any[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    useEffect(() => {
        if (viewingResource?.type?.includes('image') && currentCourse?.materials) {
            const images = currentCourse.materials.filter(r => r.type?.includes('image'))
            setImageSlideshow(images)
            const index = images.findIndex(r => r.url === viewingResource.url)
            setCurrentImageIndex(index)
        }
    }, [viewingResource, currentCourse])

    const handleCloseViewer = () => {
        setViewingResource(null)
        setImageZoom(1)
        setImageRotation(0)
    }

    const handleNextImage = () => {
        setCurrentImageIndex(prev => (prev + 1) % imageSlideshow.length)
        setImageZoom(1)
        setImageRotation(0)
    }

    const handlePrevImage = () => {
        setCurrentImageIndex(prev => (prev - 1 + imageSlideshow.length) % imageSlideshow.length)
        setImageZoom(1)
        setImageRotation(0)
    }

    const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3))
    const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.5))
    const handleRotate = () => setImageRotation(prev => (prev + 90) % 360)
    const handleResetImage = () => {
        setImageZoom(1)
        setImageRotation(0)
    }

    if (!viewingResource) {
        return null
    }

    const currentImageResource = imageSlideshow[currentImageIndex] || viewingResource

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000] p-0 sm:p-4">
            <div className="bg-white rounded-none sm:rounded-lg w-full h-full sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-gray-500 truncate max-w-[70%]">{currentImageResource.name}</h3>
                    <button onClick={handleCloseViewer} className="text-gray-500 hover:text-gray-700 p-1">
                        <FiX size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                    {currentImageResource.type?.includes('pdf') ? (
                        <div className="w-full h-full">
                            <iframe
                                src={currentImageResource.url}
                                className="w-full h-full min-h-[70vh]"
                                title={currentImageResource.name}
                            />
                        </div>
                    ) : currentImageResource.type?.includes('image') ? (
                        <div className="w-full h-full overflow-auto flex items-center justify-center relative">
                            <img
                                src={currentImageResource.url}
                                alt={currentImageResource.name}
                                className="max-w-full max-h-full object-contain"
                                style={{
                                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                                    transition: 'transform 0.3s ease',
                                }}
                            />
                            {imageSlideshow.length > 1 && (
                                <>
                                    <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-gray-800 text-white rounded-full opacity-70 hover:opacity-100 transition-opacity">
                                        <FiChevronLeft size={24} />
                                    </button>
                                    <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-800 text-white rounded-full opacity-70 hover:opacity-100 transition-opacity">
                                        <FiChevronRight size={24} />
                                    </button>
                                </>
                            )}
                            <div className="fixed bottom-4 left-0 right-0 flex justify-center space-x-4 bg-white bg-opacity-80 py-2 rounded-lg shadow-lg mx-4 sm:hidden">
                                <button onClick={handleZoomIn} className="p-2 bg-gray-200 rounded-full"><FiZoomIn size={20} /></button>
                                <button onClick={handleZoomOut} className="p-2 bg-gray-200 rounded-full"><FiZoomOut size={20} /></button>
                                <button onClick={handleRotate} className="p-2 bg-gray-200 rounded-full"><FiRotateCw size={20} /></button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                            <FiFile className="text-4xl text-gray-400 mb-4" />
                            <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}