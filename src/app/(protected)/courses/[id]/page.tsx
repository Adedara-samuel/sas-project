'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStore, Course } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import CourseContainer from '@/components/courses/course-container'
import { FiArrowLeft, FiEdit, FiSave, FiXCircle } from 'react-icons/fi'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

export default function CourseDetailPage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { currentCourse, setCurrentCourse, authChecked, user } = useStore()
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editableCourse, setEditableCourse] = useState<Omit<Course, 'id' | 'createdAt' | 'materials' | 'userId'>>({
        title: '',
        code: '',
        units: 3,
        lecturer: '',
        description: ''
    })

    useEffect(() => {
        const fetchCourse = async () => {
            if (!authChecked || !id || !user?.uid) {
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                const courseDoc = await getDoc(doc(db, 'courses', id))
                if (courseDoc.exists()) {
                    const data = courseDoc.data()
                    const fetchedCourse: Course = {
                        id: courseDoc.id,
                        title: data.title,
                        code: data.code,
                        units: data.units,
                        lecturer: data.lecturer,
                        description: data.description || '',
                        userId: data.userId,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                        materials: data.materials || [],
                    }
                    setCurrentCourse(fetchedCourse)
                    setEditableCourse({
                        title: fetchedCourse.title,
                        code: fetchedCourse.code,
                        units: fetchedCourse.units,
                        lecturer: fetchedCourse.lecturer,
                        description: fetchedCourse.description
                    })
                } else {
                    toast.error('Course not found.')
                    router.push('/courses')
                }
            } catch (error: unknown) {
                toast.error(error instanceof Error ? `Failed to load course: ${error.message}` : 'An unknown error occurred.')
                router.push('/courses')
            } finally {
                setLoading(false)
            }
        }

        fetchCourse()
        return () => setCurrentCourse(null)
    }, [id, setCurrentCourse, router, authChecked, user?.uid])

    const handleUpdateCourse = async () => {
        if (!user || !currentCourse || user.uid !== currentCourse.userId) {
            toast.error('You do not have permission to edit this course.')
            return
        }
        if (!editableCourse.title || !editableCourse.code) {
            toast.error('Course title and code are required.')
            return
        }

        setLoading(true)
        try {
            const courseRef = doc(db, 'courses', currentCourse.id)
            await updateDoc(courseRef, {
                title: editableCourse.title,
                code: editableCourse.code,
                units: editableCourse.units,
                lecturer: editableCourse.lecturer,
                description: editableCourse.description,
                updatedAt: serverTimestamp()
            })
            toast.success('Course updated successfully!')
            setIsEditing(false)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? `Failed to update course: ${error.message}` : 'An unknown error occurred.')
        } finally {
            setLoading(false)
        }
    }

    const isCourseOwner = user && currentCourse && user.uid === currentCourse.userId

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <LoadingSpinner />
            </div>
        )
    }

    if (!currentCourse) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">Course not found or an error occurred.</h3>
                <Link
                    href="/courses"
                    className="flex items-center text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all duration-300"
                >
                    <FiArrowLeft className="mr-2 h-5 w-5" />
                    Back to Courses
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <Link
                        href="/courses"
                        className="flex items-center text-gray-600 hover:text-blue-600 hover:bg-gray-100 px-3 py-2 rounded-lg font-medium text-sm md:text-base transition-all duration-300"
                    >
                        <FiArrowLeft className="mr-2 h-5 w-5" />
                        Back to Courses
                    </Link>
                    {isCourseOwner && (
                        <div className="flex space-x-3">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleUpdateCourse}
                                        disabled={loading}
                                        className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                    >
                                        <FiSave className="mr-2 h-5 w-5" /> Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false)
                                            if (currentCourse) {
                                                setEditableCourse({
                                                    title: currentCourse.title,
                                                    code: currentCourse.code,
                                                    units: currentCourse.units,
                                                    lecturer: currentCourse.lecturer,
                                                    description: currentCourse.description || ''
                                                })
                                            }
                                        }}
                                        disabled={loading}
                                        className="flex items-center bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                    >
                                        <FiXCircle className="mr-2 h-5 w-5" /> Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                    <FiEdit className="mr-2 h-5 w-5" /> Edit Course
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 transition-all duration-300 border border-gray-200">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm md:text-base"
                                        value={editableCourse.title}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, title: e.target.value })}
                                        required
                                        placeholder="e.g., Introduction to Programming"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Code <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm md:text-base"
                                        value={editableCourse.code}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, code: e.target.value })}
                                        required
                                        placeholder="e.g., CSC101"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Units</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm md:text-base"
                                        value={editableCourse.units}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, units: parseInt(e.target.value) || 3 })}
                                        placeholder="e.g., 3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Lecturer</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm md:text-base"
                                        value={editableCourse.lecturer}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, lecturer: e.target.value })}
                                        placeholder="e.g., Dr. John Smith"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
                                    <textarea
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-sm md:text-base min-h-[120px] resize-none"
                                        value={editableCourse.description}
                                        onChange={(e) => setEditableCourse({ ...editableCourse, description: e.target.value })}
                                        placeholder="Brief course description..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 font-serif">{currentCourse.title}</h1>
                                <p className="text-blue-700 font-medium text-base md:text-lg mb-4">
                                    {currentCourse.code} • {currentCourse.units} units
                                </p>
                                <p className="text-gray-600 text-sm md:text-base mb-6 font-serif">
                                    Lecturer: <span className="font-semibold text-gray-800">{currentCourse.lecturer || 'Not assigned'}</span>
                                </p>
                                {currentCourse.description && (
                                    <div className="prose max-w-none text-gray-700 leading-relaxed font-serif text-sm md:text-base">
                                        <h3 className="text-xl md:text-2xl font-semibold mb-3 text-gray-900">Description</h3>
                                        <p>{currentCourse.description}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <CourseContainer />
                </div>
            </div>
        </div>
    )
}