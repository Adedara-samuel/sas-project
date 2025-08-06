/* eslint-disable @typescript-eslint/no-unused-vars */
// /components/courses/upcoming-schedule.tsx

'use client'

import { useEffect, useState } from 'react'
import { useStore, Schedule, Course } from '@/store/useStore'
import { collection, query, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FiCalendar, FiClock, FiMapPin, FiBook } from 'react-icons/fi'
import Link from 'next/link'

interface UpcomingScheduleProps {
    allCourses: Course[];
}

// Helper function to get the numeric day of the week (0 for Sunday, 1 for Monday, etc.)
const dayOfWeekMap: { [key: string]: number } = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

// Helper function to find the next occurrence of a recurring weekly event
const getNextEventDate = (day: string, time: string): Date | null => {
    const today = new Date();
    const todayDay = today.getDay(); // 0 for Sunday, 1 for Monday
    const targetDay = dayOfWeekMap[day];

    if (targetDay === undefined) return null;

    let daysUntilNext = targetDay - todayDay;
    if (daysUntilNext < 0) {
        daysUntilNext += 7; // Add a week if the day has already passed
    }
    
    const nextEventDate = new Date(today.getTime());
    nextEventDate.setDate(today.getDate() + daysUntilNext);

    const [hours, minutes] = time.split(':').map(Number);
    nextEventDate.setHours(hours, minutes, 0, 0);

    if (daysUntilNext === 0 && nextEventDate < today) {
        nextEventDate.setDate(today.getDate() + 7);
    }

    return nextEventDate;
};


export default function UpcomingSchedule({ allCourses }: UpcomingScheduleProps) {
    const { user, authChecked } = useStore();
    const [upcomingEvent, setUpcomingEvent] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authChecked || !user?.uid) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'schedules'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
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

            let nextEvent: Schedule | null = null;
            let soonestDate: Date | null = null;

            allSchedules.forEach(schedule => {
                const eventDate = getNextEventDate(schedule.day, schedule.startTime);
                if (eventDate) {
                    if (!soonestDate || eventDate < soonestDate) {
                        soonestDate = eventDate;
                        nextEvent = schedule;
                    }
                }
            });

            setUpcomingEvent(nextEvent);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching upcoming schedules:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authChecked, user?.uid]);

    const getCourseTitle = (courseId: string) => {
        const course = allCourses.find(c => c.id === courseId);
        return course ? `${course.title} (${course.code})` : 'General Schedule';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
                <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Upcoming Schedule</h2>
                <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Upcoming Schedule</h2>
            {upcomingEvent ? (
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Next Event</p>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{upcomingEvent.title}</h3>
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                            upcomingEvent.type === 'Class' ? 'bg-blue-100 text-blue-800' :
                            upcomingEvent.type === 'Assignment' ? 'bg-purple-100 text-purple-800' :
                            upcomingEvent.type === 'Exam' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {upcomingEvent.type}
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p className="flex items-center">
                            <FiCalendar className="mr-2 text-gray-400" />
                            <span>
                                {upcomingEvent.day}, {upcomingEvent.startTime} - {upcomingEvent.endTime}
                            </span>
                        </p>
                        {upcomingEvent.location && (
                            <p className="flex items-center">
                                <FiMapPin className="mr-2 text-gray-400" />
                                <span>{upcomingEvent.location}</span>
                            </p>
                        )}
                        {upcomingEvent.courseId && (
                            <p className="flex items-center">
                                <FiBook className="mr-2 text-gray-400" />
                                <span className="font-medium text-gray-800">{getCourseTitle(upcomingEvent.courseId)}</span>
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-6 sm:py-8 text-gray-600">
                    <p className="mb-2 text-sm sm:text-base">No upcoming schedules found.</p>
                    <Link href="/schedule/new" className="text-blue-600 hover:underline text-sm sm:text-base">
                        Add a new schedule item.
                    </Link>
                </div>
            )}
        </div>
    )
}