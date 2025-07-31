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
                <div className="h-40 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center relative">
                    <FiBookOpen size={48} className="text-blue-600 opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center px-4">
                            <h3 className="font-bold text-xl text-gray-900 mb-1">{course.title}</h3>
                            <p className="text-blue-600 font-medium">{course.code}</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-5 flex-grow">
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                        <FiUser className="mr-1" />
                        <span>{course.lecturer || 'Professor Name'}</span>
                    </div>
                    
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Course Progress</span>
                            <span>{completionPercentage}%</span>
                        </div>
                        <ProgressBar percentage={completionPercentage} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <div className="text-blue-600 font-medium">{upcomingClasses}</div>
                            <div className="text-xs text-gray-500">Classes</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 text-center">
                            <div className="text-amber-600 font-medium">{pendingAssignments}</div>
                            <div className="text-xs text-gray-500">Assignments</div>
                        </div>
                    </div>
                </div>
                
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center text-sm text-gray-600">
                        <FiClock className="mr-1" />
                        <span>Mon/Wed 10:00 AM</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {course.units || 3} units
                    </span>
                </div>
            </div>
        </Link>
    )
}