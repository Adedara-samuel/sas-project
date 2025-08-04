/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { useStore, Schedule, Course } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'
import { FiCalendar, FiClock, FiMapPin, FiBookOpen, FiEdit } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Link from 'next/link'

export default function UpcomingSchedule() {
    const { user, authChecked, courses } = useStore()
    const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authChecked || !user?.uid) {
            setLoading(false);
            setUpcomingSchedules([]);
            return;
        }

        setLoading(true);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Define days of week for consistent ordering
        const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayIndex = now.getDay(); // 0 for Sunday, 1 for Monday, etc.

        // Fetch schedules for today and the next 7 days, sorted by day and time
        // This query fetches all schedules for the user and then filters/sorts client-side
        // for "upcoming" logic, as complex date queries are hard in Firestore.
        const q = query(
            collection(db, 'schedules'),
            where('userId', '==', user.uid),
            orderBy('day', 'asc'), // Order by day
            orderBy('startTime', 'asc') // Then by time
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSchedules: Schedule[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    courseId: data.courseId || '',
                    userId: data.userId,
                    title: data.title,
                    type: data.type,
                    day: data.day,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    location: data.location || '',
                    recurring: data.recurring,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                };
            });

            // Client-side filtering for "upcoming" events
            const filteredAndSorted = fetchedSchedules.filter(schedule => {
                // For recurring events, check if they are today or in the future this week
                const scheduleDayIndex = DAYS_OF_WEEK.indexOf(schedule.day);
                if (schedule.recurring) {
                    if (scheduleDayIndex > currentDayIndex) {
                        return true; // Event is on a future day this week
                    } else if (scheduleDayIndex === currentDayIndex) {
                        // If today, check time
                        const [eventHour, eventMinute] = schedule.startTime.split(':').map(Number);
                        const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eventHour, eventMinute);
                        return eventTime.getTime() > now.getTime();
                    }
                    return false; // Past day this week
                }
                // For non-recurring events, you'd need a full date field in Firestore
                // For simplicity, we're assuming "upcoming" primarily refers to recurring weekly events
                // or events that are explicitly set for today/future if a full date field existed.
                // Since we don't have a full date, we'll only show recurring for now.
                return false; // Non-recurring events without a full date cannot be determined as "upcoming"
            }).sort((a, b) => {
                // Sort by day of week, then by time
                const dayA = DAYS_OF_WEEK.indexOf(a.day);
                const dayB = DAYS_OF_WEEK.indexOf(b.day);
                if (dayA !== dayB) return dayA - dayB;
                return a.startTime.localeCompare(b.startTime);
            });

            setUpcomingSchedules(filteredAndSorted.slice(0, 5)); // Show top 5 upcoming
            setLoading(false);
        }, (error) => {
            console.error("Error fetching upcoming schedules:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authChecked, user?.uid, courses]); // courses added to dependencies to resolve titles

    const getCourseTitle = (courseId: string) => {
        if (!courseId) return 'General';
        const course = courses.find(c => c.id === courseId);
        return course ? course.title : 'Unknown Course';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow p-6 flex justify-center items-center min-h-[150px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Upcoming Schedule</h2>
            {upcomingSchedules.length === 0 ? (
                <div className="text-center text-gray-600 py-4">
                    <p className="mb-2">No upcoming events.</p>
                    <Link href="/dashboard/schedule" className="text-blue-600 hover:underline">
                        View full schedule
                    </Link>
                </div>
            ) : (
                <ul className="space-y-4">
                    {upcomingSchedules.map(schedule => (
                        <li key={schedule.id} className="border-l-4 border-blue-500 pl-3 py-1">
                            <p className="text-sm font-semibold text-gray-800 flex items-center">
                                {schedule.type === 'Class' && <FiBookOpen className="mr-1 text-blue-600" />}
                                {schedule.type === 'Assignment' && <FiEdit className="mr-1 text-purple-600" />}
                                {schedule.type === 'Exam' && <FiCalendar className="mr-1 text-red-600" />}
                                {schedule.type === 'Other' && <FiClock className="mr-1 text-gray-600" />}
                                {schedule.title}
                            </p>
                            <p className="text-xs text-gray-600 flex items-center mt-0.5">
                                <FiClock className="mr-1" /> {schedule.day}, {schedule.startTime} - {schedule.endTime}
                            </p>
                            {schedule.location && (
                                <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                    <FiMapPin className="mr-1" /> {schedule.location}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-0.5">
                                Course: <span className="font-medium">{getCourseTitle(schedule.courseId)}</span>
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
