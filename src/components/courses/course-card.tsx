/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Course, useStore, Note, Schedule } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { FiClock, FiUser, FiBookOpen, FiEdit } from 'react-icons/fi'
import ProgressBar from '@/components/ui/progress-bar'

interface CourseCardProps {
    course: Course
}

export default function CourseCard({ course }: CourseCardProps) {
    const { user, authChecked } = useStore()
    const [notesCount, setNotesCount] = useState(0)
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authChecked || !user?.uid || !course?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const notesQuery = query(
            collection(db, 'notes'),
            where('userId', '==', user.uid),
            where('courseId', '==', course.id)
        );
        const schedulesQuery = query(
            collection(db, 'schedules'),
            where('userId', '==', user.uid),
            where('courseId', '==', course.id)
        );

        const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
            setNotesCount(snapshot.docs.length);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notes:", error);
            setLoading(false);
        });

        const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
            const fetchedSchedules: Schedule[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                } as Schedule;
            });
            setSchedules(fetchedSchedules);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching schedules:", error);
            setLoading(false);
        });

        return () => {
            unsubscribeNotes();
            unsubscribeSchedules();
        };
    }, [authChecked, user?.uid, course.id]);

    // Calculate dynamic values
    const classSchedules = schedules.filter(s => s.type === 'Class');
    const firstClassTime = classSchedules.length > 0
        ? `${classSchedules[0].day.substring(0, 3)}/${classSchedules[0].startTime}`
        : 'N/A';

    const pendingAssignments = schedules.filter(s => s.type === 'Assignment').length;

    // Progress calculation based on 2% per note, capped at 100%
    const completionPercentage = Math.min(notesCount * 2, 100);

    return (
        <Link href={`/courses/${course.id}`}>
            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col border border-gray-100">
                <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center px-3 sm:px-4">
                            <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-1 line-clamp-2">
                                {course.code}
                            </h3>
                            <p className="text-gray-800 font-medium text-sm sm:text-base">
                                {course.title}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-5 flex-grow">
                    <div className="items-center text-xs sm:text-sm text-gray-600 mb-3 hidden sm:flex">
                        <FiUser className="mr-1 h-4 w-4 sm:h-5 sm:w-5" />
                        <span>{course.lecturer || 'Professor Name'}</span>
                    </div>

                    <div className="mb-3 sm:mb-4">
                        <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{completionPercentage}%</span>
                        </div>
                        <ProgressBar percentage={completionPercentage} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <div className="text-blue-600 font-medium text-sm sm:text-base">
                                {loading ? '...' : notesCount}
                            </div>
                            <div className="text-xs text-gray-500">Notes</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 text-center">
                            <div className="text-amber-600 font-medium text-sm sm:text-base">
                                {loading ? '...' : pendingAssignments}
                            </div>
                            <div className="text-xs text-gray-500">Assignments</div>
                        </div>
                    </div>
                </div>

                <div className="px-4 sm:px-5 py-2 sm:py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <FiClock className="mr-1 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline">{firstClassTime}</span>
                        <span className="inline sm:hidden">{firstClassTime}</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {course.units || 3} units
                    </span>
                </div>
            </div>
        </Link>
    )
}