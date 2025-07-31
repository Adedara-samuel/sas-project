/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect } from 'react'
import { useStore, Schedule } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore'
import { FiPlus, FiEdit, FiTrash2, FiClock, FiMapPin, FiCalendar, FiBookOpen, FiXCircle, FiCheckCircle, FiSave } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'

// Helper for days of the week for consistent ordering
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ScheduleTab() {
    const { user, currentCourse, authChecked } = useStore();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [formInput, setFormInput] = useState<Omit<Schedule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>({
        courseId: currentCourse?.id || '',
        title: '',
        type: 'Class',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        recurring: true,
    });
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Fetch schedules in real-time
    useEffect(() => {
        if (!authChecked || !user?.uid || !currentCourse?.id) {
            setLoading(false);
            setSchedules([]);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, 'schedules'),
            where('userId', '==', user.uid),
            where('courseId', '==', currentCourse.id),
            orderBy('day', 'asc'),
            orderBy('startTime', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSchedules: Schedule[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    courseId: data.courseId,
                    userId: data.userId,
                    title: data.title,
                    type: data.type,
                    day: data.day,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    location: data.location,
                    recurring: data.recurring,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
                };
            });
            // Custom sort by day of week to ensure correct order
            fetchedSchedules.sort((a, b) => {
                const dayA = DAYS_OF_WEEK.indexOf(a.day);
                const dayB = DAYS_OF_WEEK.indexOf(b.day);
                if (dayA !== dayB) return dayA - dayB;
                return a.startTime.localeCompare(b.startTime); // Then by time
            });
            setSchedules(fetchedSchedules);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching schedules:", error);
            setMessage({ text: 'Failed to load schedules.', type: 'error' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authChecked, user?.uid, currentCourse?.id]);

    // Reset form when adding/editing state changes
    useEffect(() => {
        if (!isAdding && !editingScheduleId) {
            setFormInput({
                courseId: currentCourse?.id || '',
                title: '',
                type: 'Class',
                day: 'Monday',
                startTime: '09:00',
                endTime: '10:00',
                location: '',
                recurring: true,
            });
        }
    }, [isAdding, editingScheduleId, currentCourse?.id]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormInput({ ...formInput, [name]: (e.target as HTMLInputElement).checked });
        } else {
            setFormInput({ ...formInput, [name]: value });
        }
    };

    const handleAddOrUpdateSchedule = async () => {
        // --- DEBUG LOGS ---
        console.log("Attempting to save schedule item...");
        console.log("Current user:", user);
        console.log("User UID:", user?.uid);
        console.log("Current course:", currentCourse);
        console.log("Form Input:", formInput);
        // --- END DEBUG LOGS ---

        if (!user?.uid) {
            setMessage({ text: 'User not authenticated. Please log in.', type: 'error' });
            return;
        }
        if (!currentCourse?.id) {
            setMessage({ text: 'No course selected. Cannot save schedule.', type: 'error' });
            return;
        }
        if (!formInput.title.trim() || !formInput.day || !formInput.startTime || !formInput.endTime) {
            setMessage({ text: 'Please fill in all required fields (Title, Day, Start/End Time).', type: 'error' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const scheduleData = {
                ...formInput,
                title: formInput.title.trim(),
                location: formInput.location.trim(),
                courseId: currentCourse.id,
                userId: user.uid, // This is the critical field for permissions
                updatedAt: Timestamp.now(),
            };

            // --- DEBUG LOGS ---
            console.log("Schedule data prepared for Firestore:", scheduleData);
            // --- END DEBUG LOGS ---

            if (editingScheduleId) {
                await updateDoc(doc(db, 'schedules', editingScheduleId), scheduleData);
                setMessage({ text: 'Schedule updated successfully!', type: 'success' });
            } else {
                await addDoc(collection(db, 'schedules'), {
                    ...scheduleData,
                    createdAt: Timestamp.now(),
                });
                setMessage({ text: 'Schedule added successfully!', type: 'success' });
            }
            setIsAdding(false);
            setEditingScheduleId(null);
        } catch (error: any) {
            console.error('Error saving schedule:', error);
            setMessage({ text: `Failed to save schedule: ${error.message || 'Unknown error'}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (schedule: Schedule) => {
        setFormInput({
            courseId: schedule.courseId,
            title: schedule.title,
            type: schedule.type,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            location: schedule.location,
            recurring: schedule.recurring,
        });
        setEditingScheduleId(schedule.id);
        setIsAdding(false);
        setMessage(null);
    };

    const handleDeleteSchedule = async (scheduleId: string) => {
        if (!user?.uid || !currentCourse?.id) return;

        if (window.confirm("Are you sure you want to delete this schedule item?")) {
            setLoading(true);
            setMessage(null);
            try {
                await deleteDoc(doc(db, 'schedules', scheduleId));
                setMessage({ text: 'Schedule item deleted successfully!', type: 'success' });
            } catch (error: any) {
                console.error('Error deleting schedule:', error);
                setMessage({ text: `Failed to delete schedule: ${error.message || 'Unknown error'}`, type: 'error' });
            } finally {
                setLoading(false);
            }
        }
    };

    // Calculate summary
    const classCount = schedules.filter(s => s.type === 'Class').length;
    const assignmentCount = schedules.filter(s => s.type === 'Assignment').length;
    const examCount = schedules.filter(s => s.type === 'Exam').length;

    if (!currentCourse) {
        return (
            <div className="flex justify-center items-center py-8 text-gray-600">
                <p>Please select a course to view its schedule.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Schedule</h2>

            {message && (
                <div className={`p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.type === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Schedule Summary */}
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm flex flex-wrap gap-4 justify-around text-blue-800 font-semibold">
                <p className="flex items-center"><FiBookOpen className="mr-2" /> Classes: {classCount}</p>
                <p className="flex items-center"><FiEdit className="mr-2" /> Assignments: {assignmentCount}</p>
                <p className="flex items-center"><FiCalendar className="mr-2" /> Exams: {examCount}</p>
            </div>

            {/* Add/Edit Schedule Form */}
            {(isAdding || editingScheduleId) && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        {editingScheduleId ? 'Edit Schedule Item' : 'Add New Schedule Item'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formInput.title}
                                onChange={handleFormChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                            <select
                                name="type"
                                value={formInput.type}
                                onChange={handleFormChange}
                                className="w-full p-2 border border-gray-300 text-gray-800 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                required
                            >
                                <option value="Class">Class</option>
                                <option value="Assignment">Assignment</option>
                                <option value="Exam">Exam</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Day *</label>
                            <select
                                name="day"
                                value={formInput.day}
                                onChange={handleFormChange}
                                className="w-full p-2 border border-gray-300 text-gray-800 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                required
                            >
                                {DAYS_OF_WEEK.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formInput.startTime}
                                    onChange={handleFormChange}
                                    className="w-full p-2 border text-gray-800 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={formInput.endTime}
                                    onChange={handleFormChange}
                                    className="w-full p-2 border text-gray-800 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formInput.location}
                                onChange={handleFormChange}
                                className="w-full p-2 border text-gray-800 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center">
                            <input
                                type="checkbox"
                                name="recurring"
                                checked={formInput.recurring}
                                onChange={handleFormChange}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label className="ml-2 block text-sm text-gray-900">Recurring Event</label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => { setIsAdding(false); setEditingScheduleId(null); setMessage(null); }}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg flex items-center"
                            disabled={loading}
                        >
                            <FiXCircle className="mr-2" /> Cancel
                        </button>
                        <button
                            onClick={handleAddOrUpdateSchedule}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                            disabled={loading}
                        >
                            <FiSave className="mr-2" /> {editingScheduleId ? 'Update Schedule' : 'Add Schedule'}
                        </button>
                    </div>
                </div>
            )}

            {/* Schedule List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {!isAdding && !editingScheduleId && (
                    <div className="p-4 border-b border-gray-200">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-semibold"
                        >
                            <FiPlus className="mr-2" /> Add New Schedule Item
                        </button>
                    </div>
                )}

                {schedules.length === 0 && !isAdding && !editingScheduleId ? (
                    <div className="text-center py-12 text-gray-600">
                        <p className="text-lg font-medium mb-2">No schedule items for this course yet.</p>
                        <p className="text-sm">Click "Add New Schedule Item" to get started.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {schedules.map(schedule => (
                            <li key={schedule.id} className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 transition-colors duration-200">
                                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                                    <p className="text-lg font-semibold text-gray-900 flex items-center">
                                        {schedule.type === 'Class' && <FiBookOpen className="mr-2 text-blue-600" />}
                                        {schedule.type === 'Assignment' && <FiEdit className="mr-2 text-purple-600" />}
                                        {schedule.type === 'Exam' && <FiCalendar className="mr-2 text-red-600" />}
                                        {schedule.type === 'Other' && <FiClock className="mr-2 text-gray-600" />}
                                        {schedule.title}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1 flex items-center">
                                        <FiClock className="mr-1" /> {schedule.day}, {schedule.startTime} - {schedule.endTime}
                                    </p>
                                    {schedule.location && (
                                        <p className="text-sm text-gray-600 flex items-center">
                                            <FiMapPin className="mr-1" /> {schedule.location}
                                        </p>
                                    )}
                                    {schedule.recurring && (
                                        <span className="text-xs text-blue-500 mt-1 inline-block bg-blue-100 px-2 py-0.5 rounded-full">Recurring</span>
                                    )}
                                </div>
                                <div className="flex space-x-3 items-center flex-shrink-0">
                                    <button
                                        onClick={() => handleEditClick(schedule)}
                                        className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors duration-200"
                                        title="Edit"
                                        disabled={loading}
                                    >
                                        <FiEdit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                        className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                                        title="Delete"
                                        disabled={loading}
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
