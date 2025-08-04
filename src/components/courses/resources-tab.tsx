/* eslint-disable react/no-unescaped-entities */
'use client'

import { useEffect, useState } from 'react'
import { useStore, Course } from '@/store/useStore'
import { db, storage } from '@/lib/firebase'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { FiUploadCloud, FiFileText, FiDownload, FiExternalLink, FiFile, FiCheckCircle, FiXCircle, FiFilePlus } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link'

// Helper function to get icon based on file type
const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FiFile className="text-gray-400" />;
    if (mimeType.includes('pdf')) return <FiFile className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FiFileText className="text-blue-700" />;
    if (mimeType.includes('image')) return <FiFilePlus className="text-green-500" />;
    return <FiFile className="text-gray-500" />;
};

const formatFileSize = (sizeInBytes?: number) => {
    if (sizeInBytes === undefined) return 'N/A';
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return `${sizeInMB.toFixed(2)} MB`;
};

export default function ResourcesTab() {
    const { user, currentCourse, authChecked } = useStore();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [courseResources, setCourseResources] = useState<{ name: string; url: string; type?: string; size?: number; }[]>([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
                const data = docSnap.data() as Course;
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
            console.error("Error fetching course resources:", error);
            setMessage({ text: 'Failed to load course resources.', type: 'error' });
            setLoadingResources(false);
        });

        return () => unsubscribe();
    }, [currentCourse?.id, authChecked]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage(null);
        }
    };

    const uploadFileToStorage = async (fileToUpload: File): Promise<{ name: string; url: string; type: string; size: number } | null> => {
        if (!user || !currentCourse) {
            setMessage({ text: 'User or Course not available for upload.', type: 'error' });
            return null;
        }

        try {
            const fileExtension = fileToUpload.name.split('.').pop();
            const uniqueFileName = `${uuidv4()}.${fileExtension}`;
            const storageRef = ref(storage, `course-materials/${currentCourse.id}/${uniqueFileName}`);

            console.log(`Uploading file: ${fileToUpload.name} to ${storageRef.fullPath}`);
            const snapshot = await uploadBytes(storageRef, fileToUpload);
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log(`File uploaded: ${fileToUpload.name}, URL: ${downloadURL}`);

            return {
                name: fileToUpload.name,
                url: downloadURL,
                type: fileToUpload.type,
                size: fileToUpload.size,
            };
        } catch (error: unknown) {
            console.error('Error during file upload:', error);
            if (error instanceof Error) {
                setMessage({ text: `Upload failed for ${fileToUpload.name}: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: `An unknown error occurred during upload for ${fileToUpload.name}.`, type: 'error' });
            }
            return null;
        }
    };

    const handleUpload = async () => {
        if (!file || !user || !currentCourse) {
            setMessage({ text: 'Please select a file to upload.', type: 'error' });
            return;
        }

        if (!canUpload) {
            setMessage({ text: 'You do not have permission to upload resources for this course.', type: 'error' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const uploadedMaterial = await uploadFileToStorage(file);

            if (uploadedMaterial) {
                const courseDocRef = doc(db, 'courses', currentCourse.id);
                const currentMaterials = currentCourse.materials || [];
                const updatedMaterials = [...currentMaterials, uploadedMaterial];

                await updateDoc(courseDocRef, {
                    materials: updatedMaterials
                });

                setMessage({ text: `File "${file.name}" uploaded and added to course resources!`, type: 'success' });
                setFile(null);
            }
        } catch (error: unknown) {
            console.error('Error updating course document with new material:', error);
            if (error instanceof Error) {
                setMessage({ text: `Failed to save resource to course: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred while saving resource.', type: 'error' });
            }
        } finally {
            setUploading(false);
        }
    };

    if (!currentCourse) {
        return (
            <div className="flex justify-center items-center p-8 text-gray-500 min-h-[500px]">
                <p>Please select a course to view its resources.</p>
            </div>
        );
    }

    if (loadingResources) {
        return (
            <div className="flex justify-center items-center p-8 min-h-[500px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8">
            <h2 className="text-3xl font-extrabold text-gray-900">Course Materials</h2>
            <p className="text-gray-600">Access and manage all the study materials for this course, including lecture slides, documents, and other useful files.</p>

            {message && (
                <div className={`p-4 rounded-lg flex items-center space-x-3 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.type === 'success' ? <FiCheckCircle className="flex-shrink-0" /> : <FiXCircle className="flex-shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            {canUpload && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Upload New Material</h3>
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <label htmlFor="resource-file-upload" className={`flex-1 w-full sm:w-auto cursor-pointer bg-gray-50 border-2 border-dashed rounded-lg py-4 px-6 flex flex-col items-center justify-center text-gray-700 transition-colors duration-200 ${file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
                            <FiUploadCloud className="text-3xl mb-2 text-gray-400" />
                            <p className="text-center font-medium">
                                {file ? `Selected file: ${file.name}` : 'Drag & drop a file here or click to browse'}
                            </p>
                            <span className="text-sm text-gray-500 mt-1">
                                Max size 10MB (PDF, DOCX, PPTX, etc.)
                            </span>
                            <input
                                id="resource-file-upload"
                                type="file"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploading}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*"
                            />
                        </label>
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading || !canUpload}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg flex items-center justify-center font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                <span className="flex items-center">
                                    <LoadingSpinner size="sm"/> Uploading...
                                </span>
                            ) : (
                                <>
                                    <FiUploadCloud className="mr-2 text-lg" />
                                    Upload Material
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <h3 className="p-6 text-xl font-semibold text-gray-800 border-b border-gray-200">Available Materials</h3>
                {courseResources.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {courseResources.map((resource, index) => (
                            <li key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200">
                                <div className="flex items-center flex-1 min-w-0">
                                    <div className="p-2 bg-gray-100 rounded-md">
                                        {getFileIcon(resource.type)}
                                    </div>
                                    <div className="ml-4 flex-1 truncate">
                                        <p className="text-lg font-medium text-gray-900 truncate">{resource.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatFileSize(resource.size)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-4 ml-4 flex-shrink-0">
                                    <Link
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={resource.name}
                                        className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 rounded-full hover:bg-blue-50"
                                        title="Download Material"
                                    >
                                        <FiDownload className="text-xl" />
                                    </Link>
                                    <Link
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors duration-200 rounded-full hover:bg-gray-100"
                                        title="View Material"
                                    >
                                        <FiExternalLink className="text-xl" />
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-12 px-6 text-gray-500">
                        <FiFile className="text-6xl mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No materials have been uploaded yet.</p>
                        {canUpload && (
                            <p className="text-sm">Use the "Upload New Material" section above to get started.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}