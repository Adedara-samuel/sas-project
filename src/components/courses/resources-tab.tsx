/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { FiUploadCloud, FiFileText, FiFile, FiCheckCircle, FiXCircle, FiFilePlus, FiExternalLink, FiX, FiZoomIn, FiZoomOut, FiRotateCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import axios from 'axios'
import { db } from '@/lib/firebase'
import { CourseResource, CourseDocument } from '@/types/course';

// Helper functions
const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FiFile className="text-gray-400" />;
    if (mimeType.includes('pdf')) return <FiFileText className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FiFileText className="text-blue-700" />;
    if (mimeType.includes('image')) return <FiFilePlus className="text-green-500" />;
    if (mimeType.includes('presentation')) return <FiFileText className="text-orange-500" />;
    if (mimeType.includes('spreadsheet')) return <FiFileText className="text-green-700" />;
    if (mimeType.includes('zip')) return <FiFile className="text-purple-500" />;
    return <FiFile className="text-gray-500" />;
};

const formatFileSize = (sizeInBytes?: number) => {
    if (sizeInBytes === undefined || sizeInBytes === null) return 'N/A';
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return `${sizeInMB.toFixed(2)} MB`;
};

const isViewableInApp = (resource: CourseResource): boolean => {
    if (!resource.type) return false;
    return (
        resource.type.includes('pdf') ||
        resource.type.includes('image')
    );
};

export default function ResourcesTab() {
    const { user, currentCourse, authChecked } = useStore();
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loadingResources, setLoadingResources] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [courseResources, setCourseResources] = useState<CourseResource[]>([]);
    const [viewingResource, setViewingResource] = useState<CourseResource | null>(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);
    const [imageSlideshow, setImageSlideshow] = useState<CourseResource[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const canUpload = user && currentCourse && user.uid === currentCourse.userId;

    useEffect(() => {
        if (!authChecked || !currentCourse?.id) {
            setLoadingResources(false);
            setCourseResources([]);
            return;
        }

        setLoadingResources(true);
        const courseDocRef = doc(db, 'courses', currentCourse.id);

        const unsubscribe = onSnapshot(courseDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as CourseDocument;
                setCourseResources(data.materials || []);
                useStore.setState(state => ({
                    currentCourse: {
                        ...state.currentCourse!,
                        materials: data.materials || []
                    }
                }));
            } else {
                setCourseResources([]);
            }
            setLoadingResources(false);
        }, (error) => {
            console.error('Frontend: Error fetching resources:', error);
            setMessage({ text: 'Failed to load resources. Check network.', type: 'error' });
            setLoadingResources(false);
        });

        return () => unsubscribe();
    }, [currentCourse?.id, authChecked]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const MAX_FILE_SIZE_MB = 10;
            const validFiles = Array.from(e.target.files).filter(file => {
                if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    setMessage({ text: `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB.`, type: 'error' });
                    return false;
                }
                return true;
            });
            setFiles(validFiles);
            if (validFiles.length > 0) {
                setMessage(null);
            }
        }
    };

    const uploadFileToUploadcare = async (fileToUpload: File): Promise<CourseResource | null> => {
        try {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUBLIC_KEY || '36b2aa3a71b52e3e6d10');
            formData.append('UPLOADCARE_STORE', '1');

            const response = await axios.post('/api/upload-material', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { secure_url, resource_type, bytes, format } = response.data;

            return {
                name: fileToUpload.name,
                url: secure_url,
                type: fileToUpload.type || `application/${format}` || resource_type,
                size: fileToUpload.size || bytes,
            };
        } catch (error) {
            console.error('Frontend: Upload failed:', fileToUpload.name, error);
            if (axios.isAxiosError(error) && error.response) {
                setMessage({ text: `Upload failed: ${error.response.data.error || 'Server error'}`, type: 'error' });
            } else if (error instanceof Error) {
                setMessage({ text: `Upload failed: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: `Unknown error uploading "${fileToUpload.name}".`, type: 'error' });
            }
            return null;
        }
    };

    const handleUpload = async () => {
        if (files.length === 0 || !user || !currentCourse) {
            setMessage({ text: 'Select at least one file to upload.', type: 'error' });
            return;
        }

        if (!canUpload) {
            setMessage({ text: 'No permission to upload.', type: 'error' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const updatedMaterials = [...(currentCourse.materials || [])];
            for (const file of files) {
                const uploadedMaterial = await uploadFileToUploadcare(file);
                if (uploadedMaterial) {
                    updatedMaterials.push(uploadedMaterial);
                }
            }

            if (updatedMaterials.length > (currentCourse.materials || []).length) {
                const courseDocRef = doc(db, 'courses', currentCourse.id);
                await updateDoc(courseDocRef, { materials: updatedMaterials });
                setMessage({ text: `Uploaded ${files.length} file(s) successfully!`, type: 'success' });
                setFiles([]);
            } else {
                setMessage({ text: `No new files were uploaded.`, type: 'error' });
            }
        } catch (error) {
            console.error('Frontend: Error saving to Firestore:', error);
            setMessage({ text: `Failed to save files: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleViewResource = (resource: CourseResource) => {
        if (resource.type?.includes('image')) {
            const images = courseResources.filter(r => r.type?.includes('image'));
            setImageSlideshow(images);
            const index = images.findIndex(r => r.url === resource.url);
            setCurrentImageIndex(index);
            setViewingResource(resource);
        } else if (resource.type?.includes('pdf')) {
            setViewingResource(resource);
        }
        setImageZoom(1);
        setImageRotation(0);
    };

    const handleCloseViewer = () => {
        setViewingResource(null);
        setImageSlideshow([]);
        setCurrentImageIndex(0);
        setImageZoom(1);
        setImageRotation(0);
    };
    
    const handleNextImage = () => {
        setCurrentImageIndex(prev => (prev + 1) % imageSlideshow.length);
    };

    const handlePrevImage = () => {
        setCurrentImageIndex(prev => (prev - 1 + imageSlideshow.length) % imageSlideshow.length);
    };
    

    const handleDownloadResource = (resource: CourseResource) => {
        const link = document.createElement('a');
        link.href = resource.url;
        link.download = resource.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleZoomIn = () => {
        setImageZoom(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setImageZoom(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleRotate = () => {
        setImageRotation(prev => (prev + 90) % 360);
    };

    const handleResetImage = () => {
        setImageZoom(1);
        setImageRotation(0);
    };

    if (!currentCourse) {
        return <div className="flex justify-center items-center p-8 text-gray-500 min-h-[500px]">Select a course.</div>;
    }

    if (loadingResources) {
        return <div className="flex justify-center items-center p-8 min-h-[500px]"><LoadingSpinner /></div>;
    }

    return (
        <div className="space-y-8 font-sans relative">
            {/* File Viewer Modal - Mobile Optimized */}
            {viewingResource && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-white rounded-none sm:rounded-lg w-full h-full sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-semibold text-gray-500 truncate max-w-[70%]">{viewingResource.name}</h3>
                            <button
                                onClick={handleCloseViewer}
                                className="text-gray-500 hover:text-gray-700 p-1"
                            >
                                <FiX size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                            {viewingResource.type && viewingResource.type.includes('pdf') ? (
                                <div className="w-full h-full">
                                    <iframe
                                        src={viewingResource.url}
                                        className="w-full h-full min-h-[70vh]"
                                        title={viewingResource.name}
                                    />
                                </div>
                            ) : viewingResource.type && viewingResource.type.includes('image') ? (
                                <div className="w-full h-full overflow-auto flex items-center justify-center relative">
                                    <img
                                        src={imageSlideshow[currentImageIndex]?.url}
                                        alt={imageSlideshow[currentImageIndex]?.name}
                                        className="max-w-full max-h-full object-contain"
                                        style={{
                                            transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                                            transition: 'transform 0.3s ease'
                                        }}
                                    />
                                    {/* Slideshow Controls */}
                                    {imageSlideshow.length > 1 && (
                                        <>
                                            <button
                                                onClick={handlePrevImage}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-gray-800 text-white rounded-full opacity-70 hover:opacity-100 transition-opacity"
                                            >
                                                <FiChevronLeft size={24} />
                                            </button>
                                            <button
                                                onClick={handleNextImage}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-800 text-white rounded-full opacity-70 hover:opacity-100 transition-opacity"
                                            >
                                                <FiChevronRight size={24} />
                                            </button>
                                        </>
                                    )}
                                    {/* Mobile touch controls for images */}
                                    <div className="fixed bottom-4 left-0 right-0 flex justify-center space-x-4 bg-white bg-opacity-80 py-2 rounded-lg shadow-lg mx-4 sm:hidden">
                                        <button onClick={handleZoomIn} className="p-2 bg-gray-200 rounded-full">
                                            <FiZoomIn size={20} />
                                        </button>
                                        <button onClick={handleZoomOut} className="p-2 bg-gray-200 rounded-full">
                                            <FiZoomOut size={20} />
                                        </button>
                                        <button onClick={handleRotate} className="p-2 bg-gray-200 rounded-full">
                                            <FiRotateCw size={20} />
                                        </button>
                                        <button onClick={handleResetImage} className="p-2 bg-gray-200 rounded-full text-sm font-medium">
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                                    <FiFile className="text-4xl text-gray-400 mb-4" />
                                    <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-2 sticky bottom-0 bg-white">
                            <div className="hidden sm:flex items-center space-x-2">
                                {viewingResource.type && viewingResource.type.includes('image') && (
                                    <>
                                        <button
                                            onClick={handleZoomIn}
                                            className="p-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                                            title="Zoom in"
                                        >
                                            <FiZoomIn />
                                        </button>
                                        <button
                                            onClick={handleZoomOut}
                                            className="p-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                                            title="Zoom out"
                                        >
                                            <FiZoomOut />
                                        </button>
                                        <button
                                            onClick={handleRotate}
                                            className="p-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                                            title="Rotate"
                                        >
                                            <FiRotateCw />
                                        </button>
                                        <button
                                            onClick={handleResetImage}
                                            className="p-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                                        >
                                            Reset
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-3xl font-extrabold text-gray-900">Course Materials</h2>
            <p className="text-gray-600">Manage course materials.</p>

            {message && (
                <div className={`flex items-center space-x-3 text-sm p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.type === 'success' ? <FiCheckCircle className="flex-shrink-0" /> : <FiXCircle className="flex-shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            {canUpload && (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Upload New Material</h3>
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <label htmlFor="resource-file-upload" className={`flex-1 w-full sm:w-auto cursor-pointer bg-gray-50 border-2 border-dashed rounded-lg py-4 px-4 sm:px-6 flex flex-col items-center justify-center text-gray-700 transition-colors ${files.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
                            <FiUploadCloud className="text-3xl mb-2 text-gray-400" />
                            <p className="text-center font-medium text-sm sm:text-base">
                                {files.length > 0 ? `Selected: ${files.length} file(s)` : 'Drag & drop or click to browse'}
                            </p>
                            <span className="text-xs sm:text-sm text-gray-500 mt-1">Max 10MB per file (PDF, DOCX, etc.)</span>
                            <input
                                id="resource-file-upload"
                                type="file"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploading}
                                multiple // Allow multiple files
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*"
                            />
                        </label>
                        <button
                            onClick={handleUpload}
                            disabled={files.length === 0 || uploading || !canUpload}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 rounded-lg flex items-center justify-center font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? <span className="flex items-center"><LoadingSpinner size="sm" /> Uploading...</span> : <>
                                <FiUploadCloud className="mr-2 text-lg" /> Upload
                            </>}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white overflow-hidden rounded-lg shadow-sm border">
                <h3 className="p-4 sm:p-6 text-xl font-semibold text-gray-800 border-b border-gray-200">Available Materials</h3>
                {courseResources.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {courseResources.map((resource, index) => (
                            <li key={index} className="p-4 sm:px-6 sm:py-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center flex-1 min-w-0">
                                    <div className="p-2 bg-gray-100 rounded-md">{getFileIcon(resource.type)}</div>
                                    <div className="ml-3 sm:ml-4 flex-1 truncate">
                                        <p className="text-base sm:text-lg font-medium text-gray-900 truncate">{resource.name}</p>
                                        <p className="text-xs sm:text-sm text-gray-500">{formatFileSize(resource.size)} {resource.type ? `(${resource.type.split('/')[1] || resource.type})` : ''}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-4 ml-2 sm:ml-4 flex-shrink-0">
                                    {isViewableInApp(resource) && (
                                        <button
                                            onClick={() => handleViewResource(resource)}
                                            className="p-2 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-100"
                                            title="View file"
                                        >
                                            <FiExternalLink className="text-lg sm:text-xl" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDownloadResource(resource)}
                                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                        title="Download file"
                                    >
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-8 sm:py-12 px-6 text-gray-500">
                        <FiFile className="text-4xl sm:text-6xl mx-auto mb-4 text-gray-300" />
                        <p className="text-base sm:text-lg font-medium mb-2">No materials uploaded.</p>
                        {canUpload && <p className="text-xs sm:text-sm">Use the upload section above.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}