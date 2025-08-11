
'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { FiUploadCloud, FiFileText, FiFile, FiCheckCircle, FiXCircle, FiFilePlus, FiExternalLink } from 'react-icons/fi'
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

export default function ResourcesTab() {
    const { user, currentCourse, authChecked } = useStore();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loadingResources, setLoadingResources] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [courseResources, setCourseResources] = useState<CourseResource[]>([]);

    const canUpload = user && currentCourse && user.uid === currentCourse.userId;

    useEffect(() => {
        console.log('Frontend: useEffect triggered. AuthChecked:', authChecked, 'CurrentCourse ID:', currentCourse?.id);
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
                console.log('Frontend: Firestore snapshot received. Materials:', data.materials);
                setCourseResources(data.materials || []);
                useStore.setState(state => ({
                    currentCourse: {
                        ...state.currentCourse!,
                        materials: data.materials || []
                    }
                }));
            } else {
                console.log('Frontend: Course document not found.');
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
        if (e.target.files && e.target.files[0]) {
            const MAX_FILE_SIZE_MB = 10;
            if (e.target.files[0].size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                setMessage({ text: `File "${e.target.files[0].name}" exceeds ${MAX_FILE_SIZE_MB}MB.`, type: 'error' });
                setFile(null);
            } else {
                setFile(e.target.files[0]);
                setMessage(null);
                console.log('Frontend: File selected:', e.target.files[0].name, 'Type:', e.target.files[0].type);
            }
        }
    };

    const uploadFileToUploadcare = async (fileToUpload: File): Promise<CourseResource | null> => {
        console.log('Frontend: Uploading file:', fileToUpload.name);
        try {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUBLIC_KEY || '36b2aa3a71b52e3e6d10');
            formData.append('UPLOADCARE_STORE', '1');

            const response = await axios.post('/api/upload-material', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { secure_url, resource_type, bytes, format } = response.data;
            console.log('Frontend: Upload response:', { secure_url, resource_type, bytes, format });

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
        console.log('Frontend: Handle upload triggered:', file?.name);
        if (!file || !user || !currentCourse) {
            setMessage({ text: 'Select a file to upload.', type: 'error' });
            return;
        }

        if (!canUpload) {
            setMessage({ text: 'No permission to upload.', type: 'error' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const uploadedMaterial = await uploadFileToUploadcare(file);
            if (uploadedMaterial) {
                console.log('Frontend: Material ready for Firestore:', uploadedMaterial);
                const courseDocRef = doc(db, 'courses', currentCourse.id);
                const currentMaterials = currentCourse.materials || [];
                const updatedMaterials = [...currentMaterials, uploadedMaterial];

                await updateDoc(courseDocRef, { materials: updatedMaterials });
                setMessage({ text: `Uploaded "${file.name}" successfully!`, type: 'success' });
                setFile(null);
                console.log('Frontend: Firestore updated:', file.name);
            } else {
                console.log('Frontend: Upload material is null.');
            }
        } catch (error) {
            console.error('Frontend: Error saving to Firestore:', error);
            setMessage({ text: `Failed to save "${file?.name}": ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
        } finally {
            setUploading(false);
            console.log('Frontend: Upload finished:', file?.name);
        }
    };

    if (!currentCourse) {
        return <div className="flex justify-center items-center p-8 text-gray-500 min-h-[500px]">Select a course.</div>;
    }

    if (loadingResources) {
        return <div className="flex justify-center items-center p-8 min-h-[500px]"><LoadingSpinner /></div>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 font-sans">
            <h2 className="text-3xl font-extrabold text-gray-900">Course Materials</h2>
            <p className="text-gray-600">Manage course materials.</p>

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
                        <label htmlFor="resource-file-upload" className={`flex-1 w-full sm:w-auto cursor-pointer bg-gray-50 border-2 border-dashed rounded-lg py-4 px-6 flex flex-col items-center justify-center text-gray-700 transition-colors ${file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
                            <FiUploadCloud className="text-3xl mb-2 text-gray-400" />
                            <p className="text-center font-medium">
                                {file ? `Selected: ${file.name}` : 'Drag & drop or click to browse'}
                            </p>
                            <span className="text-sm text-gray-500 mt-1">Max 10MB (PDF, DOCX, etc.)</span>
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
                            {uploading ? <span className="flex items-center"><LoadingSpinner size="sm" /> Uploading...</span> : <>
                                <FiUploadCloud className="mr-2 text-lg" /> Upload
                            </>}
                        </button>
                    </div>
                </div>
            )}

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
        </div>
    );
}