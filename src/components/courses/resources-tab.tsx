// @/components/ResourcesTab.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { FiUploadCloud, FiFileText, FiFile, FiCheckCircle, FiXCircle, FiFilePlus, FiExternalLink, FiX, FiZoomIn, FiZoomOut, FiRotateCw, FiChevronLeft, FiChevronRight, FiTrash2 } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { db, app } from '@/lib/firebase'
import { CourseResource, CourseDocument } from '@/types/course'

const storage = getStorage(app)

const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FiFile className="text-gray-400" />
    if (mimeType.includes('pdf')) return <FiFileText className="text-red-500" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FiFileText className="text-blue-700" />
    if (mimeType.includes('image')) return <FiFilePlus className="text-green-500" />
    if (mimeType.includes('presentation')) return <FiFileText className="text-orange-500" />
    if (mimeType.includes('spreadsheet')) return <FiFileText className="text-green-700" />
    if (mimeType.includes('zip')) return <FiFile className="text-purple-500" />
    return <FiFile className="text-gray-500" />
}

const formatFileSize = (sizeInBytes?: number) => {
    if (sizeInBytes === undefined || sizeInBytes === null) return 'N/A'
    const sizeInMB = sizeInBytes / (1024 * 1024)
    return `${sizeInMB.toFixed(2)} MB`
}

const isViewableInApp = (resource: CourseResource): boolean => {
    if (!resource.type) return false;
    const mimeType = resource.type.toLowerCase();
    const fileName = resource.name.toLowerCase();

    // Check by MIME type and common file extensions
    const viewableTypes = [
        'pdf', 'image', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'
    ];
    
    // Check if any part of the MIME type or file extension is supported
    return viewableTypes.some(type => mimeType.includes(type) || fileName.endsWith(`.${type}`));
}


export default function ResourcesTab() {
    const { user, currentCourse, authChecked, setViewingResource } = useStore()
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [loadingResources, setLoadingResources] = useState(true)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
    const [courseResources, setCourseResources] = useState<CourseResource[]>([])

    const canUpload = user && currentCourse && user.uid === currentCourse.userId

    useEffect(() => {
        if (!authChecked || !currentCourse?.id) {
            setLoadingResources(false)
            setCourseResources([])
            return
        }

        setLoadingResources(true)
        const courseDocRef = doc(db, 'courses', currentCourse.id)

        const unsubscribe = onSnapshot(
            courseDocRef,
            docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as CourseDocument
                    setCourseResources(data.materials || [])
                    useStore.setState(state => ({
                        currentCourse: {
                            ...state.currentCourse!,
                            materials: data.materials || [],
                        },
                    }))
                } else {
                    setCourseResources([])
                }
                setLoadingResources(false)
            },
            error => {
                console.error('Frontend: Error fetching resources:', error)
                setMessage({ text: 'Failed to load resources. Check network.', type: 'error' })
                setLoadingResources(false)
            }
        )

        return () => unsubscribe()
    }, [currentCourse?.id, authChecked])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const MAX_FILE_SIZE_MB = 10
            const validFiles = Array.from(e.target.files).filter(file => {
                if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    setMessage({ text: `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB.`, type: 'error' })
                    return false
                }
                return true
            })
            setFiles(validFiles)
            if (validFiles.length > 0) {
                setMessage(null)
            }
        }
    }

    const handleUpload = async () => {
        if (files.length === 0 || !user || !currentCourse) {
            setMessage({ text: 'Select at least one file to upload.', type: 'error' })
            return
        }

        if (!canUpload) {
            setMessage({ text: 'No permission to upload.', type: 'error' })
            return
        }

        setUploading(true)
        setMessage(null)

        try {
            const updatedMaterials = [...(currentCourse.materials || [])]
            const uploadPromises = files.map(file => {
                const storageRef = ref(storage, `course-materials/${currentCourse.id}/${file.name}`)
                const uploadTask = uploadBytesResumable(storageRef, file)

                return new Promise<CourseResource>((resolve, reject) => {
                    uploadTask.on(
                        'state_changed',
                        snapshot => {
                            // Optional: Handle upload progress
                        },
                        error => {
                            console.error('Frontend: Upload to Firebase Storage failed:', file.name, error)
                            reject(error)
                        },
                        async () => {
                            try {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
                                resolve({
                                    name: file.name,
                                    url: downloadURL,
                                    type: file.type,
                                    size: file.size,
                                })
                            } catch (err) {
                                reject(err)
                            }
                        }
                    )
                })
            })

            const uploadedMaterials = await Promise.allSettled(uploadPromises)

            const newMaterials = uploadedMaterials
                .filter(result => result.status === 'fulfilled')
                .map(result => (result as PromiseFulfilledResult<CourseResource>).value)

            if (newMaterials.length > 0) {
                const courseDocRef = doc(db, 'courses', currentCourse.id)
                const combinedMaterials = [...updatedMaterials, ...newMaterials]
                await updateDoc(courseDocRef, { materials: combinedMaterials })
                setMessage({ text: `Uploaded ${newMaterials.length} file(s) successfully!`, type: 'success' })
                setFiles([])
            } else {
                setMessage({ text: `No new files were uploaded.`, type: 'error' })
            }
        } catch (error) {
            console.error('Frontend: Error handling upload:', error)
            setMessage({ text: `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' })
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteResource = async (resource: CourseResource) => {
        if (!canUpload) {
            setMessage({ text: 'No permission to delete.', type: 'error' });
            return;
        }

        try {
            const fileRef = ref(storage, `course-materials/${currentCourse?.id}/${resource.name}`);
            await deleteObject(fileRef);

            const updatedMaterials = courseResources.filter(r => r.url !== resource.url);
            const courseDocRef = doc(db, 'courses', currentCourse!.id);
            await updateDoc(courseDocRef, { materials: updatedMaterials });

            setMessage({ text: `File "${resource.name}" deleted successfully.`, type: 'success' });
        } catch (error) {
            console.error('Frontend: Error deleting file:', error);
            setMessage({ text: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
        }
    };

    if (!currentCourse) {
        return <div className="flex justify-center items-center p-8 text-gray-500 min-h-[500px]">Select a course.</div>
    }

    if (loadingResources) {
        return <div className="flex justify-center items-center p-8 min-h-[500px]"><LoadingSpinner /></div>
    }

    return (
        <div className="space-y-8 font-sans relative">
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
                                multiple
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
                                            onClick={() => setViewingResource(resource)} // Call the global function
                                            className="p-2 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-100"
                                            title="View file"
                                        >
                                            <FiExternalLink className="text-lg sm:text-xl" />
                                        </button>
                                    )}
                                    {canUpload && (
                                        <button
                                            onClick={() => handleDeleteResource(resource)}
                                            className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100"
                                            title="Delete file"
                                        >
                                            <FiTrash2 className="text-lg sm:text-xl" />
                                        </button>
                                    )}
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
    )
}