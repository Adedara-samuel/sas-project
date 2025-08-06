/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, Schedule } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp, collection, Timestamp } from 'firebase/firestore'
import { FiArrowLeft, FiSave, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import Link from 'next/link'

export default function NewSchedulePage() {
    const { user, currentCourse, authChecked } = useStore()
    const router = useRouter()

    const [schedule, setSchedule] = useState<Omit<Schedule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>({
        title: '',
        type: 'Class',
        day: 'Monday',
        startTime: '',
        endTime: '',
        location: '',
        recurring: true,
        courseId: currentCourse?.id || '' // Initialize courseId from currentCourse, or empty string if none
    })

    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Update schedule.courseId if currentCourse changes (e.g., user selects a course after page load)
    useEffect(() => {
        setSchedule(prev => ({
            ...prev,
            courseId: currentCourse?.id || ''
        }));
    }, [currentCourse]);


    // --- DEBUG LOG: On component mount/updates ---
    useEffect(() => {
        console.log("NewSchedulePage Component Mounted/Updated:");
        console.log("   - user object (from Zustand):", user);
        console.log("   - user.uid (from Zustand):", user?.uid);
        console.log("   - authChecked (from Zustand):", authChecked);
        console.log("   - currentCourse (from Zustand):", currentCourse);
        console.log("   - schedule state:", schedule);

        // --- NEW DEBUG LOG: Button disabled conditions ---
        const isTitleEmpty = !schedule.title.trim();
        const isTypeEmpty = !schedule.type;
        const isStartTimeEmpty = !schedule.startTime;
        const isEndTimeEmpty = !schedule.endTime;
        const isUserMissing = !user?.uid;

        console.log("Button Disabled Conditions Check:");
        console.log(`   - Title Empty: ${isTitleEmpty} (Value: '${schedule.title}')`);
        console.log(`   - Type Empty: ${isTypeEmpty} (Value: '${schedule.type}')`);
        console.log(`   - Start Time Empty: ${isStartTimeEmpty} (Value: '${schedule.startTime}')`);
        console.log(`   - End Time Empty: ${isEndTimeEmpty} (Value: '${schedule.endTime}')`);
        console.log(`   - Saving: ${saving}`);
        console.log(`   - User Missing: ${isUserMissing} (User UID: ${user?.uid})`);
        console.log(`   - Overall Disabled: ${isTitleEmpty || isTypeEmpty || isStartTimeEmpty || isEndTimeEmpty || saving || isUserMissing}`);
    }, [user, authChecked, currentCourse, schedule, saving]);

    const handleSave = async () => {
        // --- DEBUG LOGS: Before validation ---
        console.log("handleSave: Attempting to save new schedule...");
        console.log("handleSave: Current user (from Zustand):", user);
        console.log("handleSave: User UID (from Zustand):", user?.uid);
        console.log("handleSave: authChecked (from Zustand):", authChecked);
        console.log("handleSave: Current Course for Schedule:", currentCourse);
        console.log("handleSave: Schedule form data:", schedule);
        // --- END DEBUG LOGS ---

        if (!authChecked) {
            setMessage({ text: 'Authentication check not complete. Please wait a moment.', type: 'error' });
            console.error("handleSave: Aborting save - authChecked is false.");
            return;
        }

        if (!user?.uid) {
            setMessage({ text: 'User not authenticated. Please log in.', type: 'error' });
            console.error("handleSave: Aborting save - user.uid is missing.");
            return;
        }
        if (
            !schedule.title.trim() ||
            !schedule.type ||
            !schedule.day ||
            !schedule.startTime ||
            !schedule.endTime
        ) {
            setMessage({ text: 'Please fill in all required fields (Title, Type, Day, Start Time, End Time).', type: 'error' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const scheduleData = {
                title: schedule.title.trim(),
                type: schedule.type,
                day: schedule.day,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                location: schedule.location.trim(),
                recurring: schedule.recurring,
                courseId: schedule.courseId, // Use the courseId from state, which can be ''
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            console.log("handleSave: Schedule data prepared for Firestore:", scheduleData);
            console.log("handleSave: userId in scheduleData:", scheduleData.userId);
            console.log("handleSave: user.uid from Zustand (for comparison):", user.uid);

            const newScheduleRef = doc(collection(db, 'schedules'));
            await setDoc(newScheduleRef, scheduleData);

            setMessage({ text: 'Schedule created successfully!', type: 'success' });
            // Redirect to dashboard schedule or back to course if one was selected
            router.push(currentCourse ? `/courses/${currentCourse.id}` : '/dashboard');
        } catch (error: unknown) {
            console.error('Error creating schedule:', error);
            if (error instanceof Error) {
                setMessage({ text: `Failed to create schedule: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred while creating schedule.', type: 'error' });
            }
        } finally {
            setSaving(false);
        }
    };

    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const SCHEDULE_TYPES = ['Class', 'Assignment', 'Exam', 'Other'];

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                    <Link
                        href={currentCourse ? `/courses/${currentCourse.id}` : '/dashboard'}
                        className="flex items-center text-blue-600 hover:underline text-lg font-medium mb-4 sm:mb-0"
                    >
                        <FiArrowLeft className="mr-2 text-xl" />
                        Back to {currentCourse ? currentCourse.title : 'Dashboard'}
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 text-left sm:text-right">Add New Schedule</h1>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Current Course Info Block */}
                <div className="bg-blue-50 rounded-xl p-4 mb-8 shadow-sm">
                    <p className="text-blue-800 text-base">
                        {currentCourse ? (
                            <>Schedule for: <span className="font-semibold">{currentCourse.title} ({currentCourse.code})</span></>
                        ) : (
                            <span className="font-semibold">Adding a general schedule item (not tied to a specific course)</span>
                        )}
                    </p>
                </div>

                {/* Schedule Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 outline-none text-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={schedule.title}
                                onChange={(e) => setSchedule({ ...schedule, title: e.target.value })}
                                placeholder="e.g. Lecture on Networking"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Type <span className="text-red-500">*</span></label>
                            <select
                                value={schedule.type}
                                onChange={(e) => setSchedule({ ...schedule, type: e.target.value as Schedule['type'] })}
                                className="w-full p-3 border rounded-xl border-gray-300 outline-none text-gray-800 focus:ring-2 focus:ring-blue-500 transition-colors duration-200 bg-white"
                                required
                            >
                                {SCHEDULE_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Day <span className="text-red-500">*</span></label>
                            <select
                                value={schedule.day}
                                onChange={(e) => setSchedule({ ...schedule, day: e.target.value })}
                                className="w-full p-3 border rounded-xl border-gray-300 outline-none text-gray-800 focus:ring-2 focus:ring-blue-500 transition-colors duration-200 bg-white"
                                required
                            >
                                {DAYS_OF_WEEK.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Location</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 outline-none text-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={schedule.location}
                                onChange={(e) => setSchedule({ ...schedule, location: e.target.value })}
                                placeholder="Room 101 or Online"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-800">Start Time <span className="text-red-500">*</span></label>
                            <input
                                type="time"
                                className="w-full p-3 border border-gray-300 outline-none text-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={schedule.startTime}
                                onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">End Time <span className="text-red-500">*</span></label>
                            <input
                                type="time"
                                className="w-full p-3 border-gray-300 outline-none border text-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={schedule.endTime}
                                onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center">
                            <input
                                id="recurring"
                                type="checkbox"
                                checked={schedule.recurring}
                                onChange={(e) => setSchedule({ ...schedule, recurring: e.target.checked })}
                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="recurring" className="ml-3 block text-base text-gray-700">
                                Recurring weekly
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={
                                !schedule.title.trim() ||
                                !schedule.type ||
                                !schedule.day ||
                                !schedule.startTime ||
                                !schedule.endTime ||
                                saving ||
                                !user?.uid
                            }
                            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl flex items-center justify-center font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
                                    Save Schedule
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}