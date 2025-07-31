/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, Course } from '@/store/useStore'
import { db } from '@/lib/firebase' // No need for storage here anymore
import { collection, doc, setDoc } from 'firebase/firestore'
import { FiArrowLeft, FiSave, FiCheckCircle, FiXCircle } from 'react-icons/fi' // Removed upload icons
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/loading-spinner'; // Assuming you have this

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
        setMessage(null); // Clear previous messages

        try {
            const courseData: Course = {
                ...course,
                id: '', // Will be set by Firestore
                createdAt: new Date(),
                userId: user.uid, // Associate course with the creating user
                materials: [], // Initialize with empty materials array
            };

            const newCourseRef = doc(collection(db, 'courses'));
            courseData.id = newCourseRef.id; // Set the ID from Firestore reference
            await setDoc(newCourseRef, courseData);

            setMessage({ text: 'Course created successfully!', type: 'success' });
            router.push(`/courses/${newCourseRef.id}`); // Navigate to the detail page
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
        <div className="min-h-screen bg-gray-50 transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <Link
                        href="/courses"
                        className="flex items-center text-blue-600 hover:underline text-lg font-medium"
                    >
                        <FiArrowLeft className="mr-2 text-xl" />
                        Back to Courses
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900">Create New Course</h1>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800 ">Title *</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={course.title}
                                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800 ">Code *</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={course.code}
                                onChange={(e) => setCourse({ ...course, code: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Units</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={course.units}
                                onChange={(e) => setCourse({ ...course, units: parseInt(e.target.value) || 3 })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Lecturer</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={course.lecturer}
                                onChange={(e) => setCourse({ ...course, lecturer: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-1 text-gray-800 ">Description</label>
                        <textarea
                            className="w-full p-3 border resize-none outline-none border-gray-300 rounded-lg min-h-[150px] text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                            value={course.description}
                            onChange={(e) => setCourse({ ...course, description: e.target.value })}
                        />
                    </div>

                    {/* REMOVED: Course Materials Upload section */}

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={!course.title || !course.code || saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {saving ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </span>
                            ) : (
                                <>
                                    <FiSave className="mr-2" />
                                    Save Course
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
