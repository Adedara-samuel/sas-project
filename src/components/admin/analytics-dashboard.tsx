'use client'

import { FiUsers, FiBook, FiBarChart2, FiTrendingUp } from 'react-icons/fi'

export default function AnalyticsDashboard() {
    // Mock data - replace with real data from your backend
    const stats = [
        { name: 'Total Students', value: '1,234', icon: FiUsers, change: '+12%', changeType: 'increase' },
        { name: 'Active Courses', value: '42', icon: FiBook, change: '+3', changeType: 'increase' },
        { name: 'Library Books', value: '856', icon: FiBook, change: '+24', changeType: 'increase' },
        { name: 'Avg. Engagement', value: '78%', icon: FiTrendingUp, change: '+5%', changeType: 'increase' }
    ]

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Analytics Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-blue-100  text-blue-600">
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                                <p className="text-2xl font-semibold text-gray-900 ">{stat.value}</p>
                                <p className={`text-sm ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                                    {stat.change}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-lg">
                <h3 className="text-lg font-medium mb-4 text-gray-900">Recent Activity</h3>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((item) => (
                        <div key={item} className="flex items-start pb-4 border-gray-200 ">
                            <div className="bg-gray-100 p-2 rounded-full mr-3">
                                <FiBarChart2 className="h-5 w-5 text-gray-500 " />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">New course enrollment</p>
                                <p className="text-sm text-gray-500">Computer Science 101 - 5 new students</p>
                                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}