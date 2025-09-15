declare global {
    var __app_id: string;
    var __initial_auth_token: string;
}

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useState, useEffect } from 'react'
import { useStore, Schedule } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore'
import { FiCalendar, FiPlus, FiClock, FiMapPin, FiBookOpen, FiEdit } from 'react-icons/fi'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { getMessaging, getToken } from 'firebase/messaging'

export default function SchedulePage() {
    const { user, authChecked, courses } = useStore()
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'week' | 'month'>('week')

    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    // --- Notification Permission & Token Handling ---
    useEffect(() => {
        // Only run this effect if the window object is available and auth is ready.
        if (typeof window === 'undefined' || !authChecked || !user?.uid) {
            console.log("Authentication not ready or not on client side. Skipping token request.");
            return;
        }

        console.log("Authentication is ready, attempting to request token...");

        const requestNotificationPermission = async () => {
            if ('Notification' in window && 'serviceWorker' in navigator) {
                // Register the service worker
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
                console.log('Service Worker registered successfully:', registration);

                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                    try {
                        const messaging = getMessaging();

                        setTimeout(async () => {
                            if (messaging && user?.uid) {
                                const token = await getToken(messaging, {
                                    vapidKey: 'BPtxpwfMuQvDIT86hI1w_X8e7-GnDFHNf-mxOp5R4J0eO5FRznQdN602NXJ65wzD1GpjJEo8ao_ERaxPEx9c4V8',
                                    serviceWorkerRegistration: registration,
                                });

                                if (token) {
                                    console.log('FCM token:', token);
                                    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                                    const userId = user.uid;

                                    const tokenDocRef = doc(db, `artifacts/${appId}/public/data/fcmTokens`, userId);
                                    await setDoc(tokenDocRef, {
                                        token: token,
                                        userId: userId,
                                        createdAt: new Date()
                                    });
                                    console.log('FCM token saved to Firestore');
                                } else {
                                    console.log('No FCM token received.');
                                }
                            } else {
                                console.log('User or Messaging not ready.');
                            }
                        }, 500); // Wait for 500ms
                    } catch (error) {
                        console.error('Error getting FCM token or saving to Firestore:', error);
                    }
                } else {
                    console.log('Notification permission denied.');
                }
            } else {
                console.warn("Notifications or Service Workers are not supported in this browser.");
            }
        };

        requestNotificationPermission();
    }, [authChecked, user?.uid]);

    // --- Real-time Fetching of ALL User Schedules ---
    useEffect(() => {
        if (!authChecked || !user?.uid) {
            setLoading(false);
            setSchedules([]);
            return;
        }

        setLoading(true);
        // This query fetches schedules for the current user, ordered by day and start time.
        // It requires a composite index on `schedules` with `userId` ASC, `day` ASC, and `startTime` ASC.
        const q = query(
            collection(db, 'schedules'),
            where('userId', '==', user.uid),
            orderBy('day', 'asc'),
            orderBy('startTime', 'asc')
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
            // Custom sort by day of week to ensure correct order
            fetchedSchedules.sort((a, b) => {
                const dayA = DAYS_OF_WEEK.indexOf(a.day);
                const dayB = DAYS_OF_WEEK.indexOf(b.day);
                if (dayA !== dayB) return dayA - dayB;
                return a.startTime.localeCompare(b.startTime);
            });
            setSchedules(fetchedSchedules);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching schedules for SchedulePage:", error);
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [authChecked, user?.uid]);

    // Group schedules by day for Week View
    const scheduleByDay = DAYS_OF_WEEK.map(day => ({
        day,
        events: schedules.filter(s => s.day === day)
    }));

    // Function to get course title by ID
    const getCourseTitle = (courseId: string) => {
        if (!courseId) return 'General';
        const course = courses.find(c => c.id === courseId);
        return course ? course.title : 'Unknown Course';
    };

    if (!authChecked || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center mb-4 sm:mb-0">
                    <FiCalendar className="mr-2 text-3xl" />
                    My Schedule
                </h1>

                {/* Button group with responsive wrapping */}
                <div className="flex flex-wrap gap-2 justify-end">
                    <button
                        onClick={() => setView('week')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${view === 'week' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Week View
                    </button>
                    <button
                        onClick={() => setView('month')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${view === 'month' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Month View
                    </button>
                    <Link
                        href="/schedule/new"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-md transition-all duration-200 text-sm font-medium"
                    >
                        <FiPlus className="mr-2" />
                        Add Event
                    </Link>
                </div>
            </div>

            {schedules.length === 0 && !loading ? (
                <div className="text-center py-12 px-4 text-gray-600 bg-white rounded-2xl shadow-lg">
                    <p className="text-lg font-medium mb-2">No schedule items found.</p>
                    <p className="text-sm">Click "Add Event" to start building your schedule.</p>
                </div>
            ) : (
                <>
                    {view === 'week' ? (
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            {/* Responsive grid for week view */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 border-t border-gray-200">
                                {scheduleByDay.map(({ day, events }) => (
                                    <div key={day} className="bg-white border-l border-gray-200 first:border-l-0">
                                        <div className="bg-gray-100 p-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                                            {day}
                                        </div>
                                        <div className="p-3 space-y-3 min-h-[10rem] md:min-h-[12rem]">
                                            {events.length > 0 ? (
                                                events.map(event => (
                                                    <div
                                                        key={event.id}
                                                        className="p-3 bg-blue-50 rounded-lg shadow-sm border border-blue-100 flex flex-col space-y-1 transition-transform transform hover:scale-[1.02]"
                                                    >
                                                        <p className="text-sm font-semibold text-blue-800 flex items-center line-clamp-1">
                                                            {event.type === 'Class' && <FiBookOpen className="mr-1 text-blue-600" />}
                                                            {event.type === 'Assignment' && <FiEdit className="mr-1 text-purple-600" />}
                                                            {event.type === 'Exam' && <FiCalendar className="mr-1 text-red-600" />}
                                                            {event.type === 'Other' && <FiClock className="mr-1 text-gray-600" />}
                                                            {event.title}
                                                        </p>
                                                        <p className="text-xs text-blue-700 flex items-center">
                                                            <FiClock className="mr-1" /> {event.startTime} - {event.endTime}
                                                        </p>
                                                        {event.location && (
                                                            <p className="text-xs text-blue-600 flex items-center">
                                                                <FiMapPin className="mr-1" /> {event.location}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Course: <span className="font-medium">{getCourseTitle(event.courseId)}</span>
                                                        </p>
                                                        {event.recurring && (
                                                            <span className="text-xs text-blue-500 mt-1 inline-block bg-blue-100 px-2 py-0.5 rounded-full">Recurring</span>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-sm text-gray-500 py-4">No events</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <p className="text-center text-gray-500">Month view coming soon</p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
const eventDate = new Date();