'use client'

import { useState } from 'react'
import { FiSave, FiGlobe, FiMail } from 'react-icons/fi'

export default function SystemSettings() {
    const [settings, setSettings] = useState({
        siteName: 'Academic Portal',
        siteEmail: 'admin@academicportal.com',
        registrationOpen: true,
        maintenanceMode: false
    })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            // Save settings to your backend
            await new Promise(resolve => setTimeout(resolve, 1000))
            alert('Settings saved successfully')
        } catch (error) {
            console.error('Error saving settings:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">System Settings</h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Site Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiGlobe className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="pl-10 w-full p-2 border rounded"
                                value={settings.siteName}
                                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Site Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiMail className="text-gray-400" />
                            </div>
                            <input
                                type="email"
                                className="pl-10 w-full p-2 border rounded"
                                value={settings.siteEmail}
                                onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="registrationOpen"
                            type="checkbox"
                            checked={settings.registrationOpen}
                            onChange={(e) => setSettings({ ...settings, registrationOpen: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="registrationOpen" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Allow new registrations
                        </label>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="maintenanceMode"
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Maintenance mode
                        </label>
                    </div>
                </div>

                <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Security Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Password Requirements</label>
                            <select className="w-full p-2 border rounded">
                                <option>Medium (8+ characters)</option>
                                <option>Strong (12+ characters with complexity)</option>
                            </select>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="twoFactorAuth"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="twoFactorAuth" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Require two-factor authentication for admins
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                        <FiSave className="mr-2" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    )
}