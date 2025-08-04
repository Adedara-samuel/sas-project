'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, Course } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc } from 'firebase/firestore'
import { FiArrowLeft, FiSave, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import Link from 'next/link'

export default function NewCoursePage() {
    const { user } = useStore()
    const router = useRouter()
    const [course, setCourse] = useState<Omit<Course, 'id' | 'createdAt' | 'materials' | 'userId'>>({
        title: '',
        code: '',
        units: 3,
        lecturer: '',
        description: ''
    })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleSave = async () => {
        if (!user || !course.title || !course.code) {
            setMessage({ text: 'Course title and code are required.', type: 'error' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const courseData: Course = {
                ...course,
                id: '',
                createdAt: new Date(),
                userId: user.uid,
                materials: [],
            };

            const newCourseRef = doc(collection(db, 'courses'));
            courseData.id = newCourseRef.id;
            await setDoc(newCourseRef, courseData);

            setMessage({ text: 'Course created successfully!', type: 'success' });
            router.push(`/courses/${newCourseRef.id}`);
        } catch (error: unknown) {
            console.error('Error creating course:', error);
            if (error instanceof Error) {
                setMessage({ text: `Failed to create course: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred while creating course.', type: 'error' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 transition-colors duration-300 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <Link
                        href="/courses"
                        className="flex items-center text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-3 py-2 rounded-lg font-medium text-sm sm:text-base transition-all duration-200"
                    >
                        <FiArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Back to Courses
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Create New Course</h1>
                </div>

                {message && (
                    <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-center space-x-2 animate-slide-down ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle className="h-5 w-5" /> : <FiXCircle className="h-5 w-5" />}
                        <span className="text-sm sm:text-base">{message.text}</span>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm sm:text-base"
                                value={course.title}
                                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                required
                                placeholder="e.g., Introduction to Programming"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Code <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm sm:text-base"
                                value={course.code}
                                onChange={(e) => setCourse({ ...course, code: e.target.value })}
                                required
                                placeholder="e.g., CSC101"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Units</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm sm:text-base"
                                value={course.units}
                                onChange={(e) => setCourse({ ...course, units: parseInt(e.target.value) || 3 })}
                                placeholder="e.g., 3"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Lecturer</label>
                            <input
                                type="text"
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm sm:text-base"
                                value={course.lecturer}
                                onChange={(e) => setCourse({ ...course, lecturer: e.target.value })}
                                placeholder="e.g., Dr. John Smith"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-medium mb-1 text-gray-800">Description</label>
                            <textarea
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg min-h-[100px] sm:min-h-[150px] text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm sm:text-base resize-none"
                                value={course.description}
                                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                placeholder="Brief course description..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 sm:mt-6">
                        <button
                            onClick={handleSave}
                            disabled={!course.title || !course.code || saving}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex items-center justify-center font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {saving ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </span>
                            ) : (
                                <>
                                    <FiSave className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                    Save Course
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-down {
                    animation: slideDown 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}