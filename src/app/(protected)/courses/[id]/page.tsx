'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStore, Course } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore' // Import updateDoc and serverTimestamp
import CourseContainer from '@/components/courses/course-container'
import { FiArrowLeft, FiEdit, FiSave, FiXCircle, FiCheckCircle } from 'react-icons/fi' // Added edit/save icons
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/loading-spinner'

export default function CourseDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const { currentCourse, setCurrentCourse, authChecked, user } = useStore() // Get user from store
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false) // State for edit mode
    const [editableCourse, setEditableCourse] = useState<Omit<Course, 'id' | 'createdAt' | 'materials' | 'userId'>>({ // State for form inputs
        title: '',
        code: '',
        units: 3,
        lecturer: '',
        description: ''
    });
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Function to fetch course details
    useEffect(() => {
        const fetchCourse = async () => {
            if (!authChecked || !id) {
                setLoading(false);
                return;
            }

            setLoading(true)
            try {
                const courseDoc = await getDoc(doc(db, 'courses', id as string))
                if (courseDoc.exists()) {
                    const data = courseDoc.data();
                    const fetchedCourse: Course = {
                        id: courseDoc.id,
                        title: data.title,
                        code: data.code,
                        units: data.units,
                        lecturer: data.lecturer,
                        description: data.description,
                        userId: data.userId,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                        materials: data.materials || [],
                    };
                    setCurrentCourse(fetchedCourse);
                    // Initialize editableCourse state
                    setEditableCourse({
                        title: fetchedCourse.title,
                        code: fetchedCourse.code,
                        units: fetchedCourse.units,
                        lecturer: fetchedCourse.lecturer,
                        description: fetchedCourse.description || ''
                    });
                    console.log("Course detail fetched:", fetchedCourse);
                } else {
                    console.log(`Course with ID ${id} not found.`);
                    router.push('/courses');
                }
            } catch (error: unknown) {
                console.error('Error fetching course:', error);
                router.push('/courses');
            } finally {
                setLoading(false);
            }
        }

        fetchCourse();

        return () => {
            setCurrentCourse(null); // Clear current course on unmount
        }
    }, [id, setCurrentCourse, router, authChecked]);

    // Handle course detail updates
    const handleUpdateCourse = async () => {
        if (!user || !currentCourse || user.uid !== currentCourse.userId) {
            setMessage({ text: 'You do not have permission to edit this course.', type: 'error' });
            return;
        }
        if (!editableCourse.title || !editableCourse.code) {
            setMessage({ text: 'Course title and code are required.', type: 'error' });
            return;
        }

        setLoading(true); // Use loading for saving state
        setMessage(null);
        try {
            const courseRef = doc(db, 'courses', currentCourse.id);
            await updateDoc(courseRef, {
                title: editableCourse.title,
                code: editableCourse.code,
                units: editableCourse.units,
                lecturer: editableCourse.lecturer,
                description: editableCourse.description,
                updatedAt: serverTimestamp() // Add an updatedAt timestamp
            });
            setMessage({ text: 'Course updated successfully!', type: 'success' });
            setIsEditing(false); // Exit edit mode
            // currentCourse will be updated by the onSnapshot listener in CoursesPage/ResourcesTab
            // which will then propagate to here.
        } catch (error: unknown) {
            console.error('Error updating course:', error);
            if (error instanceof Error) {
                setMessage({ text: `Failed to update course: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred while updating course.', type: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    // Check if the current user is the owner of the course
    const isCourseOwner = user && currentCourse && user.uid === currentCourse.userId;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <LoadingSpinner />
            </div>
        )
    }

    if (!currentCourse) {
        return (
            <div className="text-center py-12 bg-gray-50 min-h-screen">
                <h3 className="text-lg font-medium text-gray-900">Course not found or an error occurred.</h3>
                <Link
                    href="/courses"
                    className="mt-4 inline-block text-blue-600 hover:underline"
                >
                    Back to courses
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <Link
                        href="/courses"
                        className="flex items-center text-blue-600 hover:underline text-lg font-medium"
                    >
                        <FiArrowLeft className="mr-2 text-xl" />
                        Back to Courses
                    </Link>
                    {isCourseOwner && (
                        <div className="flex space-x-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleUpdateCourse}
                                        disabled={loading}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center font-semibold disabled:opacity-50"
                                    >
                                        <FiSave className="mr-2" /> Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            // Reset editableCourse to currentCourse data if cancelling
                                            if (currentCourse) {
                                                setEditableCourse({
                                                    title: currentCourse.title,
                                                    code: currentCourse.code,
                                                    units: currentCourse.units,
                                                    lecturer: currentCourse.lecturer,
                                                    description: currentCourse.description || ''
                                                });
                                            }
                                            setMessage(null); // Clear messages on cancel
                                        }}
                                        disabled={loading}
                                        className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center font-semibold disabled:opacity-50"
                                    >
                                        <FiXCircle className="mr-2" /> Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-semibold"
                                >
                                    <FiEdit className="mr-2" /> Edit Course
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="space-y-8">
                    {/* Course Overview Section */}
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-800">Title *</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                        value={editableCourse.title}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-800">Code *</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                        value={editableCourse.code}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, code: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-800">Units</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                        value={editableCourse.units}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, units: parseInt(e.target.value) || 3 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-800">Lecturer</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-300 outline-none rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                        value={editableCourse.lecturer}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, lecturer: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1 text-gray-800">Description</label>
                                    <textarea
                                        className="w-full p-3 border resize-none outline-none border-gray-300 rounded-lg min-h-[150px] text-gray-900 focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                        value={editableCourse.description}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                                    {currentCourse.title}
                                </h1>
                                <p className="text-blue-600 font-medium text-lg mb-4">
                                    {currentCourse.code} • {currentCourse.units} units
                                </p>
                                <p className="text-gray-600 text-base mb-6">
                                    Lecturer: <span className="font-semibold">{currentCourse.lecturer}</span>
                                </p>
                                {currentCourse.description && (
                                    <div className="prose max-w-none text-gray-700 leading-relaxed">
                                        <h3 className="text-xl font-semibold mb-2 text-gray-900">Description</h3>
                                        <p>{currentCourse.description}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Course Tabs (Notes, Resources, Schedule, AI) */}
                    <CourseContainer />
                </div>
            </div>
        </div>
    )
}
