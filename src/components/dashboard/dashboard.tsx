'use client'

import { useEffect, useState } from 'react'
import { useStore, Course } from '@/store/useStore' // Import Course interface
import { collection, query, onSnapshot, where } from 'firebase/firestore' // Import Firestore functions
import { db } from '@/lib/firebase'
import CourseCard from '@/components/courses/course-card'
import UpcomingSchedule from '@/components/courses/upcoming-schedule' // This will be updated to fetch its own data
import RecentNotes from '@/components/courses/recent-note' // This will be updated to fetch its own data
import AdminPanel from '@/components/admin/admin-panel'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Link from 'next/link'
import { FiBook, FiCalendar, FiPlus, FiSearch } from 'react-icons/fi'

export default function DashboardPage() {
    const {
        user,
        authChecked,
        setCourses, // We will use this to update the global courses state
    } = useStore()
    const [pageLoading, setPageLoading] = useState(true)
    const [userCourses, setUserCourses] = useState<Course[]>([]) // Local state for courses
    const isAdmin = user?.role === 'admin'

    // --- Real-time Courses Fetching ---
    useEffect(() => {
        if (!authChecked || !user?.uid) {
            setPageLoading(false);
            setUserCourses([]);
            setCourses([]); // Clear global state too
            return;
        }

        setPageLoading(true);
        // Query courses where userId matches the logged-in user's UID
        const q = query(
            collection(db, 'courses'),
            where('userId', '==', user.uid)
            // orderBy('createdAt', 'desc') // Add orderBy if you want a specific order
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedCourses: Course[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    code: data.code,
                    units: data.units,
                    lecturer: data.lecturer,
                    description: data.description || '',
                    userId: data.userId,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    materials: data.materials || [],
                };
            });
            setUserCourses(fetchedCourses); // Update local state
            setCourses(fetchedCourses); // Update global Zustand state
            setPageLoading(false);
        }, (error) => {
            console.error("Error fetching courses for dashboard:", error);
            setPageLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [authChecked, user?.uid, setCourses]); // Re-run if auth state or user changes

    // Remove the redundant onAuthStateChanged useEffect here.
    // The AuthProvider in layout.tsx already handles global auth state and sets the user.
    // This useEffect is no longer needed:
    /*
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseAuthUser | null) => {
            // ... (removed logic) ...
        })
        return () => unsubscribe()
    }, [setUser, setAuthChecked])
    */

    // Remove featured books fetching useEffect
    /*
    useEffect(() => {
        const fetchFeaturedBooks = async () => {
            // ... (removed logic) ...
        }
        fetchFeaturedBooks()
    }, [])
    */

    if (!authChecked || pageLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        )
    }

    if (!user) {
        return null; // AuthProvider should handle redirect to login
    }

    return (
        <div className="min-h-screen bg-gray-50 container mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300">
            <main>
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-8 text-white shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="flex-1 mb-4 sm:mb-0">
                            <h1 className="text-2xl font-bold mb-2">
                                Welcome back, {user?.name || 'Student'}!
                                {isAdmin && (
                                    <span className="ml-2 text-sm bg-white text-blue-600 px-2 py-1 rounded-full">
                                        Admin
                                    </span>
                                )}
                            </h1>
                            <p className="opacity-90">
                                {isAdmin ? 'Manage the academic system' : 'Track your academic progress'}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wider opacity-75 mb-1">Today is</div>
                            <div className="text-lg font-medium">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>

                {isAdmin ? (
                    <AdminPanel />
                ) : (
                    <StudentDashboard
                        courses={userCourses} // Pass fetched courses
                        // notes and schedules will be fetched by their respective components
                    />
                )}
            </main>
        </div>
    )
}

interface StudentDashboardProps {
    courses: Course[]; // Use Course type
}

function StudentDashboard({ courses }: StudentDashboardProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Link href="/courses" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition flex items-center group">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4 group-hover:bg-blue-600 group-hover:text-white transition">
                        <FiBook size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">View All Courses</h3>
                        <p className="text-sm text-gray-500">Browse all available courses</p>
                    </div>
                </Link>

                <Link href="/schedule" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition flex items-center group">
                    <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4 group-hover:bg-green-600 group-hover:text-white transition">
                        <FiCalendar size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition">My Schedule</h3>
                        <p className="text-sm text-gray-500 ">View your class timetable</p>
                    </div>
                </Link>

                <Link href="/dashboard/library" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition flex items-center group">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4 group-hover:bg-purple-600 group-hover:text-white transition">
                        <FiSearch size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition">Library</h3>
                        <p className="text-sm text-gray-500 ">Explore our book collection</p>
                    </div>
                </Link>

                <Link href="/notes" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition flex items-center group">
                    <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-4 group-hover:bg-amber-600 group-hover:text-white transition">
                        <FiPlus size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition">New Note</h3>
                        <p className="text-sm text-gray-500 ">Create study notes</p>
                    </div>
                </Link>
            </div>

            {/* Courses Section (2/3 width) and Side Widgets (1/3 width) */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Your Courses</h2>
                    {courses.length === 0 ? (
                        <div className="text-center py-8 text-gray-600">
                            <p className="mb-2">No courses enrolled yet.</p>
                            <Link href="/courses/new" className="text-blue-600 hover:underline">
                                Add your first course!
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {courses.map(course => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <UpcomingSchedule />
                <RecentNotes />
            </div>
        </div>
    )
}