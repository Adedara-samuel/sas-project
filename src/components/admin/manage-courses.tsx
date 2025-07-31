'use client'

import { useState, useEffect } from 'react'
import { Course, useStore } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { FiPlus, FiTrash2, FiEdit } from 'react-icons/fi'

export default function ManageCourses() {
    const { user } = useStore()
    const [courses, setCourses] = useState<Course[]>([])
    const [newCourse, setNewCourse] = useState<Partial<Course>>({
        title: '',
        code: '',
        units: 3,
        lecturer: ''
    })
    const [isAdding, setIsAdding] = useState(false)

    useEffect(() => {
        const q = query(collection(db, 'courses'))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Course[]
            setCourses(coursesData)
        })

        return () => unsubscribe()
    }, [])

    const handleAddCourse = async () => {
        if (!user || !newCourse.title || !newCourse.code) return

        try {
            const courseData = {
                title: newCourse.title,
                code: newCourse.code,
                units: newCourse.units || 3,
                lecturer: newCourse.lecturer || '',
                createdAt: new Date()
            }

            const newCourseRef = doc(collection(db, 'courses'))
            await setDoc(newCourseRef, courseData)

            // Reset form
            setNewCourse({
                title: '',
                code: '',
                units: 3,
                lecturer: ''
            })
            setIsAdding(false)
        } catch (error) {
            console.error('Error adding course:', error)
        }
    }

    const handleDeleteCourse = async (courseId: string) => {
        if (!window.confirm('Are you sure you want to delete this course?')) return

        try {
            await deleteDoc(doc(db, 'courses', courseId))
        } catch (error) {
            console.error('Error deleting course:', error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Manage Courses</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                >
                    <FiPlus className="mr-2" />
                    Add Course
                </button>
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Add New Course</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title *</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={newCourse.title}
                                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Code *</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={newCourse.code}
                                onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Units</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 border rounded"
                                value={newCourse.units}
                                onChange={(e) => setNewCourse({ ...newCourse, units: parseInt(e.target.value) || 3 })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Lecturer</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={newCourse.lecturer}
                                onChange={(e) => setNewCourse({ ...newCourse, lecturer: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 border rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddCourse}
                            disabled={!newCourse.title || !newCourse.code}
                            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
                        >
                            Add Course
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lecturer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Units</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {courses.map((course) => (
                            <tr key={course.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{course.code}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{course.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{course.lecturer}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{course.units}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                                        <FiEdit />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCourse(course.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}