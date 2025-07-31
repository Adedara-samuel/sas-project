/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { useStore, Course } from '@/store/useStore'
import CourseCard from '@/components/courses/course-card'
import { FiSearch, FiPlus, FiBookmark } from 'react-icons/fi'
import Link from 'next/link'
import { collection, onSnapshot, query, where } from 'firebase/firestore'; // Added 'where'
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function CoursesPage() {
    const { courses, setCourses, authChecked, user } = useStore() // Get user from store
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authChecked || !user?.uid) { // Ensure user is authenticated
            setLoading(false);
            return;
        }

        setLoading(true);
        // Query only courses created by the current user
        const q = query(collection(db, 'courses'), where('userId', '==', user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedCourses: Course[] = snapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title,
                code: doc.data().code,
                units: doc.data().units,
                lecturer: doc.data().lecturer,
                description: doc.data().description,
                userId: doc.data().userId,
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
                materials: doc.data().materials || [],
            }));
            setCourses(fetchedCourses);
            setLoading(false);
            console.log("Courses fetched and updated in Zustand:", fetchedCourses);
        }, (error) => {
            console.error("Error fetching courses:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setCourses, authChecked, user?.uid]); // Depend on user.uid

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.lecturer.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
                    <h1 className="text-3xl font-extrabold text-gray-900">Courses</h1>
                    <Link
                        href="/courses/new"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center font-semibold shadow-md transition-all duration-200"
                    >
                        <FiPlus className="mr-2 text-lg" />
                        New Course
                    </Link>
                </div>

                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400 text-lg" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search courses by title, code or lecturer..."
                        className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-colors duration-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCourses.map(course => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                        <FiBookmark size={48} className="mx-auto mb-4 text-gray-400 opacity-70" /> {/* Larger icon */}
                        <h3 className="mt-4 text-xl font-medium text-gray-900">No courses found</h3>
                        <p className="mt-2 text-gray-500">
                            {searchTerm ? 'Try a different search term or clear the search.' : 'There are no courses available yet. Create one!'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
