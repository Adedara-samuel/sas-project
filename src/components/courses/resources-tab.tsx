/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore, Course } from '@/store/useStore'
import { db, storage } from '@/lib/firebase'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { FiUploadCloud, FiFileText, FiDownload, FiExternalLink,  FiFile, FiCheckCircle, FiXCircle, FiFilePlus } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link'

// Helper function to get icon based on file type
const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FiFile />;
    if (mimeType.includes('pdf')) return <FiFile className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FiFileText className="text-blue-700" />;
    if (mimeType.includes('image')) return <FiFilePlus className="text-green-500" />;
    // Add more as needed (e.g., excel, presentation)
    return <FiFileText className="text-gray-500" />;
};

export default function ResourcesTab() {
    const { user, currentCourse, authChecked } = useStore();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [courseResources, setCourseResources] = useState<{ name: string; url: string; type?: string; size?: number; }[]>([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Determine if the current user has permission to upload resources for THIS course
    const canUpload = user && currentCourse && user.uid === currentCourse.userId;

    // Fetch resources for the current course in real-time
    useEffect(() => {
        if (!authChecked || !currentCourse?.id) {
            setLoadingResources(false);
            return;
        }

        setLoadingResources(true);
        const courseDocRef = doc(db, 'courses', currentCourse.id);

        const unsubscribe = onSnapshot(courseDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as Course;
                setCourseResources(data.materials || []);
                // Update currentCourse in Zustand to reflect latest materials
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
            // Store in course-specific folder, tied to the course ID
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

    if (loadingResources) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Materials</h2>

            {message && (
                <div className={`p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.type === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                    <span>{message.text}</span>
                </div>
            )}

            {canUpload && ( // Only show upload section if user owns the course
                <div className="bg-gray-50 p-6 rounded-xl shadow-inner">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload New Material</h3>
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <label htmlFor="resource-file-upload" className="flex-1 w-full sm:w-auto cursor-pointer bg-white border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center text-gray-700 hover:border-blue-500 transition-colors duration-200">
                            <FiUploadCloud className="mr-2 text-xl" />
                            {file ? file.name : 'Choose File (PDF, DOCX, PPTX, etc.)'}
                            <input
                                id="resource-file-upload"
                                type="file"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploading}
                                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                            />
                        </label>
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading || !canUpload}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                </span>
                            ) : (
                                <>
                                    <FiUploadCloud className="mr-2" />
                                    Upload Material
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {courseResources.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {courseResources.map((resource, index) => (
                            <li key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200">
                                <div className="flex items-center flex-1 min-w-0">
                                    {getFileIcon(resource.type)}
                                    <span className="ml-3 text-gray-900 font-medium truncate">
                                        {resource.name}
                                    </span>
                                    {resource.size && (
                                        <span className="ml-3 text-sm text-gray-500 hidden sm:inline">
                                            ({(resource.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center space-x-4 ml-4">
                                    <Link
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={resource.name}
                                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                        title="Download Material"
                                    >
                                        <FiDownload className="text-xl" />
                                    </Link>
                                    <Link
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                                        title="View Material"
                                    >
                                        <FiExternalLink className="text-xl" />
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-12 text-gray-600">
                        <p className="text-lg font-medium mb-2">No materials uploaded for this course yet.</p>
                        {canUpload && (
                            <p className="text-sm">Use the "Upload New Material" section above to add files.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
