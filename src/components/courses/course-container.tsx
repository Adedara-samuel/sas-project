'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import NotesTab from '@/components/courses/note-tab'
import ResourcesTab from '@/components/courses/resources-tab' // Make sure this path is correct
import ScheduleTab from '@/components/courses/schedule-tab'
import AITab from '@/components/courses/aitab'

export default function CourseContainer() {
    const { currentCourse } = useStore()
    const [activeTab, setActiveTab] = useState('notes')

    if (!currentCourse) return (
        <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-600">
            No course selected. Please go back to courses list.
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-6 text-lg font-medium">
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`py-3 px-4 rounded-t-lg transition-all duration-200
                            ${activeTab === 'notes' ? 'border-b-3 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Notes
                    </button>
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`py-3 px-4 rounded-t-lg transition-all duration-200
                            ${activeTab === 'resources' ? 'border-b-3 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Resources
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`py-3 px-4 rounded-t-lg transition-all duration-200
                            ${activeTab === 'schedule' ? 'border-b-3 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`py-3 px-4 rounded-t-lg transition-all duration-200
                            ${activeTab === 'ai' ? 'border-b-3 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        AI Assistant
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'notes' && <NotesTab />}
                {/* FIX: Pass the courseMaterials prop here */}
                {activeTab === 'resources' && <ResourcesTab />}
                {activeTab === 'schedule' && <ScheduleTab />}
                {activeTab === 'ai' && <AITab />}
            </div>
        </div>
    )
}
