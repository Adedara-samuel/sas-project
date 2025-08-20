/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useStore, Schedule } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore'
import { FiPlus, FiEdit, FiTrash2, FiClock, FiMapPin, FiCalendar, FiBookOpen, FiXCircle, FiCheckCircle, FiSave } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'

// Helper for consistent days of the week ordering
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
                userId: user.uid,
                updatedAt: Timestamp.now(),
            };

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
            <div className="flex justify-center items-center p-8 text-gray-500 min-h-[500px]">
                <p>Please select a course to view its schedule.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8 min-h-[500px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen p-4 md:p-8 lg:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                <h2 className="text-3xl font-extrabold text-gray-900">Course Schedule</h2>
                <p className="text-gray-600 max-w-2xl">
                    Manage and organize all your course-related events, including classes, assignments, and exams.
                </p>

                {message && (
                    <div className={`p-4 rounded-lg flex items-center space-x-3 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle className="flex-shrink-0" /> : <FiXCircle className="flex-shrink-0" />}
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Schedule Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 transform hover:scale-105 transition-transform duration-300">
                        <FiBookOpen className="mx-auto text-5xl text-blue-500 mb-2" />
                        <p className="text-lg font-semibold text-gray-900">Classes</p>
                        <p className="text-4xl font-extrabold text-blue-600 mt-1">{classCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 transform hover:scale-105 transition-transform duration-300">
                        <FiEdit className="mx-auto text-5xl text-purple-500 mb-2" />
                        <p className="text-lg font-semibold text-gray-900">Assignments</p>
                        <p className="text-4xl font-extrabold text-purple-600 mt-1">{assignmentCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 transform hover:scale-105 transition-transform duration-300">
                        <FiCalendar className="mx-auto text-5xl text-red-500 mb-2" />
                        <p className="text-lg font-semibold text-gray-900">Exams</p>
                        <p className="text-4xl font-extrabold text-red-600 mt-1">{examCount}</p>
                    </div>
                </div>

                {/* Add/Edit Schedule Form */}
                {(isAdding || editingScheduleId) && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                            {editingScheduleId ? 'Edit Schedule Item' : 'Add New Schedule Item'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            <div className="col-span-1 lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formInput.title}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                <select
                                    name="type"
                                    value={formInput.type}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border border-gray-300 text-gray-800 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
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
                                    className="w-full p-3 border border-gray-300 text-gray-800 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                                    required
                                >
                                    {DAYS_OF_WEEK.map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 col-span-1 md:col-span-2 lg:col-span-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formInput.startTime}
                                        onChange={handleFormChange}
                                        className="w-full p-3 border text-gray-800 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                                        className="w-full p-3 border text-gray-800 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formInput.location}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border text-gray-800 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center mt-2">
                                <input
                                    type="checkbox"
                                    name="recurring"
                                    checked={formInput.recurring}
                                    onChange={handleFormChange}
                                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label className="ml-3 block text-sm text-gray-900">Recurring Event</label>
                            </div>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-5 space-y-5 sm:space-y-6 gap-4 mt-6">
                            <button
                                onClick={() => { setIsAdding(false); setEditingScheduleId(null); setMessage(null); }}
                                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2.5 rounded-lg flex items-center justify-center font-semibold transition-colors duration-200"
                                disabled={loading}
                            >
                                <FiXCircle className="mr-2 text-lg" /> Cancel
                            </button>
                            <button
                                onClick={handleAddOrUpdateSchedule}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center font-semibold shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    <FiSave className="mr-2 text-lg" />
                                )}
                                {editingScheduleId ? 'Update Schedule' : 'Add Schedule'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Schedule List */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {!isAdding && !editingScheduleId && (
                        <div className="p-6 border-b border-gray-200">
                            <button
                                onClick={() => { setIsAdding(true); setMessage(null); }}
                                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center font-semibold shadow-sm transition-colors duration-200"
                            >
                                <FiPlus className="mr-2 text-lg" /> Add Schedule
                            </button>
                        </div>
                    )}

                    {schedules.length === 0 && !isAdding && !editingScheduleId ? (
                        <div className="text-center py-16 px-6 text-gray-500">
                            <FiCalendar className="text-7xl mx-auto mb-4 text-gray-300" />
                            <p className="text-xl font-semibold mb-2">No schedule items for this course yet.</p>
                            <p className="text-md">Click the button above to add your first class, assignment, or exam.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {schedules.map(schedule => (
                                <li key={schedule.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 transition-colors duration-200">
                                    <div className="flex-1 min-w-0 mb-4 sm:mb-0 sm:mr-4">
                                        <div className="flex items-center space-x-3">
                                            {schedule.type === 'Class' && <FiBookOpen className="flex-shrink-0 text-xl md:text-2xl text-blue-600" />}
                                            {schedule.type === 'Assignment' && <FiEdit className="flex-shrink-0 text-xl md:text-2xl text-purple-600" />}
                                            {schedule.type === 'Exam' && <FiCalendar className="flex-shrink-0 text-xl md:text-2xl text-red-600" />}
                                            {schedule.type === 'Other' && <FiClock className="flex-shrink-0 text-xl md:text-2xl text-gray-600" />}
                                            <p className="text-lg md:text-xl font-bold text-gray-900 truncate">{schedule.title}</p>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                                            <p className="flex items-center"><FiClock className="mr-2 text-gray-400" /> {schedule.day}, {schedule.startTime} - {schedule.endTime}</p>
                                            {schedule.location && (
                                                <p className="flex items-center"><FiMapPin className="mr-2 text-gray-400" /> {schedule.location}</p>
                                            )}
                                        </div>
                                        {schedule.recurring && (
                                            <span className="text-xs text-blue-500 mt-2 inline-block bg-blue-100 px-2 py-1 rounded-full font-medium">Recurring</span>
                                        )}
                                    </div>
                                    <div className="flex space-x-3 items-center flex-shrink-0 mt-4 sm:mt-0">
                                        <button
                                            onClick={() => handleEditClick(schedule)}
                                            className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors duration-200"
                                            title="Edit"
                                            disabled={loading}
                                        >
                                            <FiEdit size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSchedule(schedule.id)}
                                            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                                            title="Delete"
                                            disabled={loading}
                                        >
                                            <FiTrash2 size={20} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}