/* eslint-disable react/no-unescaped-entities */
'use client'

import { useEffect, useState } from 'react'
import { useStore, Course, Schedule } from '@/store/useStore' // Import Schedule type
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import CourseCard from '@/components/courses/course-card'
import UpcomingSchedule from '@/components/courses/upcoming-schedule'
import RecentNotes from '@/components/courses/recent-note'
import AdminPanel from '@/components/admin/admin-panel'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Link from 'next/link'
import { FiBook, FiCalendar, FiPlus, FiSearch } from 'react-icons/fi'

// Helper function to get the current day of the week as a string (e.g., "Monday")
const getCurrentDayOfWeek = (): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
};

export default function DashboardPage() {
    const {
        user,
        authChecked,
        setCourses,
    } = useStore();
    const [pageLoading, setPageLoading] = useState(true);
    const [userCourses, setUserCourses] = useState<Course[]>([]);
    const [todayScheduledCourseIds, setTodayScheduledCourseIds] = useState<string[]>([]); // New state for today's courses
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!authChecked) {
            setPageLoading(false);
            return;
        }

        if (!user?.uid) {
            setPageLoading(false);
            setUserCourses([]);
            setCourses([]);
            setTodayScheduledCourseIds([]); // Clear if no user
            return;
        }

        setPageLoading(true);

        // --- Fetch User Courses ---
        const coursesQuery = query(
            collection(db, 'courses'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
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
            setUserCourses(fetchedCourses);
            setCourses(fetchedCourses); // Update global store
            setPageLoading(false); // Set loading to false once courses are fetched
        }, (error) => {
            console.error("Error fetching courses for dashboard:", error);
            setPageLoading(false);
        });

        // --- Fetch User Schedules and determine today's courses ---
        const schedulesQuery = query(
            collection(db, 'schedules'),
            where('userId', '==', user.uid)
        );

        const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
            const allSchedules: Schedule[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    type: data.type,
                    day: data.day,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    location: data.location || '',
                    recurring: data.recurring,
                    courseId: data.courseId || '',
                    userId: data.userId,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                };
            });

            const todayDay = getCurrentDayOfWeek();
            const courseIdsForToday = new Set<string>();
            const now = new Date(); // Get current time once

            allSchedules.forEach(schedule => {
                if (schedule.day === todayDay && schedule.courseId) {
                    if (schedule.type === 'Assignment') {
                        // For assignments, if it's today, consider it relevant all day
                        courseIdsForToday.add(schedule.courseId);
                    } else {
                        // For 'Class' or 'Exam', check if the event's time has not passed for today
                        const [eventHour, eventMinute] = schedule.startTime.split(':').map(Number);
                        const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eventHour, eventMinute);

                        if (eventTime >= now) { // Only include if the event is still upcoming today or happening now
                            courseIdsForToday.add(schedule.courseId);
                        }
                    }
                }
            });
            setTodayScheduledCourseIds(Array.from(courseIdsForToday));
        }, (error) => {
            console.error("Error fetching schedules for dashboard filtering:", error);
        });

        return () => {
            unsubscribeCourses();
            unsubscribeSchedules();
        };
    }, [authChecked, user?.uid, setCourses]);

    if (!authChecked || pageLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user) {
        return null; // Should ideally redirect to login if not authenticated
    }

    return (
        <div className="min-h-screen bg-gray-50 container mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-colors duration-300">
            <main>
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-white shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="flex-1 mb-4 sm:mb-0">
                            <h1 className="text-xl sm:text-2xl font-bold mb-2">
                                Welcome back, {user?.name || 'Student'}!
                                {isAdmin && (
                                    <span className="ml-2 text-xs sm:text-sm bg-white text-blue-600 px-2 py-1 rounded-full">
                                        Admin
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm sm:text-base opacity-90">
                                {isAdmin ? 'Manage the academic system' : 'Track your academic progress'}
                            </p>
                        </div>
                        <div className="text-right flex items-center">
                            <FiCalendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 block sm:hidden" />
                            <div>
                                <div className="text-xs uppercase tracking-wider opacity-75 mb-1 hidden sm:block">Today is</div>
                                <div className="text-base sm:text-lg font-medium">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isAdmin ? (
                    <AdminPanel />
                ) : (
                    <StudentDashboard courses={userCourses} todayScheduledCourseIds={todayScheduledCourseIds} />
                )}
            </main>
        </div>
    );
}

interface StudentDashboardProps {
    courses: Course[];
    todayScheduledCourseIds: string[]; // New prop
}

function StudentDashboard({ courses, todayScheduledCourseIds }: StudentDashboardProps) {
    // Filter courses to only show those scheduled for today
    const coursesToShow = courses.filter(course => todayScheduledCourseIds.includes(course.id));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Link href="/courses" className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center group">
                    <div className="p-2 sm:p-3 rounded-full bg-blue-100 text-blue-600 mr-3 sm:mr-4 group-hover:bg-blue-600 group-hover:text-white transition">
                        <FiBook size={16} className="sm:h-5 sm:w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition text-sm sm:text-base">Courses</h3>
                        <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Browse all courses</p>
                    </div>
                </Link>

                <Link href="/schedule" className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center group">
                    <div className="p-2 sm:p-3 rounded-full bg-green-100 text-green-600 mr-3 sm:mr-4 group-hover:bg-green-600 group-hover:text-white transition">
                        <FiCalendar size={16} className="sm:h-5 sm:w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition text-sm sm:text-base">Schedule</h3>
                        <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">View timetable</p>
                    </div>
                </Link>

                <Link href="/dashboard/library" className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center group">
                    <div className="p-2 sm:p-3 rounded-full bg-purple-100 text-purple-600 mr-3 sm:mr-4 group-hover:bg-purple-600 group-hover:text-white transition">
                        <FiSearch size={16} className="sm:h-5 sm:w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition text-sm sm:text-base">Library</h3>
                        <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Explore books</p>
                    </div>
                </Link>

                <Link href="/notes" className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center group">
                    <div className="p-2 sm:p-3 rounded-full bg-amber-100 text-amber-600 mr-3 sm:mr-4 group-hover:bg-amber-600 group-hover:text-white transition">
                        <FiPlus size={16} className="sm:h-5 sm:w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition text-sm sm:text-base">New Note</h3>
                        <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Create notes</p>
                    </div>
                </Link>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Today's Engagements</h2>
                    {coursesToShow.length === 0 ? (
                        <div className="text-center py-6 sm:py-8 text-gray-600">
                            <p className="mb-2 text-sm sm:text-base">
                                No courses scheduled for today.
                            </p>
                            <Link href="/schedule/new" className="text-blue-600 hover:underline text-sm sm:text-base">
                                Add a new schedule item.
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {coursesToShow.map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                            {/* Only show "View All Courses" if there are courses not shown today */}
                            {courses.length > coursesToShow.length && (
                                <div className="text-center mt-6">
                                    <Link href="/courses" className="text-blue-600 font-medium hover:underline">
                                        View All {courses.length} Courses
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Sidebar Widgets */}
            <div className="lg:col-span-1 space-y-6">
                <UpcomingSchedule allCourses={courses} />
                <RecentNotes />
            </div>
        </div>
    );
}
