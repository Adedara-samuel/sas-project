'use client'

import { useState } from 'react'
import { FiUsers, FiBook, FiUploadCloud, FiSettings, FiBarChart2 } from 'react-icons/fi'
import ManageCourses from './manage-courses'
import ManageMaterials from './manage-materials'
import ManageUsers from './manage-user'
import SystemSettings from './system-settings'
import AnalyticsDashboard from './analytics-dashboard'

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState('analytics')

    return (
        <div className="rounded-xl">
            <div className="border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`py-4 px-4 text-center border-b-2 cursor-pointer font-medium text-sm whitespace-nowrap ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'}`}
                    >
                        <FiBarChart2 className="inline mr-2" />
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`py-4 px-4 text-center border-b-2 cursor-pointer font-medium text-sm whitespace-nowrap ${activeTab === 'courses' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'}`}
                    >
                        <FiBook className="inline mr-2" />
                        Manage Courses
                    </button>
                    <button
                        onClick={() => setActiveTab('materials')}
                        className={`py-4 px-4 text-center border-b-2 font-medium cursor-pointer text-sm whitespace-nowrap ${activeTab === 'materials' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'}`}
                    >
                        <FiUploadCloud className="inline mr-2" />
                        Course Materials
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`py-4 px-4 text-center border-b-2 font-medium cursor-pointer text-sm whitespace-nowrap ${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'}`}
                    >
                        <FiUsers className="inline mr-2" />
                        Manage Users
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-4 text-center border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'}`}
                    >
                        <FiSettings className="inline mr-2" />
                        System Settings
                    </button>
                </nav>
            </div>

            <div className="p-6">
                {activeTab === 'analytics' && <AnalyticsDashboard />}
                {activeTab === 'courses' && <ManageCourses />}
                {activeTab === 'materials' && <ManageMaterials />}
                {activeTab === 'users' && <ManageUsers />}
                {activeTab === 'settings' && <SystemSettings />}
            </div>
        </div>
    )
}