'use client'

import Link from 'next/link'
import { Course } from '@/store/useStore'
import { FiBookOpen, FiClock, FiUser } from 'react-icons/fi'
import ProgressBar from '@/components/ui/progress-bar'

interface CourseCardProps {
    course: Course
}

export default function CourseCard({ course }: CourseCardProps) {
    // Mock progress - replace with real data from your backend
    const completionPercentage = Math.min(Math.floor(Math.random() * 100), 85)
    const upcomingClasses = 2 // Mock data
    const pendingAssignments = 1 // Mock data

    return (
        <Link href={`/courses/${course.id}`}>
            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col border border-gray-100">
                <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center relative">
                    <FiBookOpen size={40} className="text-blue-600 opacity-20 sm:h-12 sm:w-12" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center px-3 sm:px-4">
                            <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-1 line-clamp-2">{course.title}</h3>
                            <p className="text-blue-600 font-medium text-sm sm:text-base">{course.code}</p>
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
                            <div className="text-blue-600 font-medium text-sm sm:text-base">{upcomingClasses}</div>
                            <div className="text-xs text-gray-500">Classes</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 text-center">
                            <div className="text-amber-600 font-medium text-sm sm:text-base">{pendingAssignments}</div>
                            <div className="text-xs text-gray-500">Assignments</div>
                        </div>
                    </div>
                </div>

                <div className="px-4 sm:px-5 py-2 sm:py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <FiClock className="mr-1 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline">Mon/Wed 10:00 AM</span>
                        <span className="inline sm:hidden">Mon/Wed</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {course.units || 3} units
                    </span>
                </div>
            </div>
        </Link>
    )
}