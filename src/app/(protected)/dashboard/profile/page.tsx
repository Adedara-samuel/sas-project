/* eslint-disable @next/next/no-img-element */
// src/app/profile/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { FiEdit, FiUpload, FiCheckCircle, FiXCircle, FiGlobe, FiBook } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { User } from '@/types/user'
import axios from 'axios'

export default function ProfilePage() {
    const { user, setUser, authChecked } = useStore()
    const [localName, setLocalName] = useState('')
    const [localSchool, setLocalSchool] = useState('')
    const [localDepartment, setLocalDepartment] = useState('')
    const [localPhotoFile, setLocalPhotoFile] = useState<File | null>(null)

    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [profileSaveLoading, setProfileSaveLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const fetchUserProfile = useCallback(async () => {
        if (!authChecked || !auth.currentUser) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid)
            const userDocSnap = await getDoc(userDocRef)

            let firestoreData: Partial<User> = {}
            let shouldUpdateFirestore = false
            
            if (userDocSnap.exists()) {
                firestoreData = userDocSnap.data() as Partial<User>
                
                // If a new name is available in Firebase Auth and Firestore's name is the default 'User', update it.
                if (auth.currentUser.displayName && (!firestoreData.name || firestoreData.name === 'User')) {
                    firestoreData.name = auth.currentUser.displayName
                    shouldUpdateFirestore = true
                }
            } else {
                // For new users, create a document with data from Firebase Auth
                firestoreData = {
                    name: auth.currentUser.displayName || '',
                    photoURL: auth.currentUser.photoURL || null,
                    role: 'student',
                    school: '',
                    department: '',
                }
                shouldUpdateFirestore = true
            }
            
            // Update Firestore if needed
            if (shouldUpdateFirestore) {
                await setDoc(userDocRef, firestoreData, { merge: true })
            }

            // Determine the display name with proper priority
            const displayName = 
                firestoreData.name || 
                auth.currentUser.displayName || 
                user?.name || 
                auth.currentUser.email?.split('@')[0] || // Use part of the email as a fallback name
                'User'; // Fallback to 'User' if everything else fails

            const updatedUser: User = {
                id: auth.currentUser.uid,
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: displayName,
                photoURL: firestoreData.photoURL || auth.currentUser.photoURL || null,
                metadata: {
                    creationTime: auth.currentUser.metadata.creationTime,
                    lastSignInTime: auth.currentUser.metadata.lastSignInTime,
                },
                name: displayName,
                role: (firestoreData.role as 'admin' | 'student') || 'student',
                school: firestoreData.school || null,
                department: firestoreData.department || null,
            }

            setUser(updatedUser)
            setLocalName(displayName)
            setLocalSchool(updatedUser.school || '')
            setLocalDepartment(updatedUser.department || '')
        } catch (error: unknown) {
            console.error('Error fetching user profile from Firestore:', error)
            if (error instanceof Error) {
                setMessage({ text: `Failed to load profile: ${error.message}`, type: 'error' })
            } else {
                setMessage({ text: 'An unknown error occurred while loading profile.', type: 'error' })
            }
        } finally {
            setLoading(false)
        }
    }, [authChecked, setUser, user?.name])

    useEffect(() => {
        if (authChecked) {
            fetchUserProfile()
        }
    }, [authChecked, fetchUserProfile])

    const uploadPhotoToCloudinary = async (file: File): Promise<string | null> => {
        try {
            const formData = new FormData()
            formData.append('file', file)
            const response = await axios.post('/api/upload-photo', formData)
            const { secure_url } = response.data
            return secure_url
        } catch (error) {
            console.error('Cloudinary upload failed:', error)
            setMessage({ text: 'Photo upload failed. Please try again.', type: 'error' })
            return null
        }
    }

    const handleSaveProfile = async () => {
        if (!user || !auth.currentUser) {
            setMessage({ text: 'No user logged in.', type: 'error' })
            return
        }

        setProfileSaveLoading(true)
        setMessage(null)

        try {
            let newPhotoURL = user.photoURL
            if (localPhotoFile) {
                const uploadedURL = await uploadPhotoToCloudinary(localPhotoFile)
                if (uploadedURL) {
                    newPhotoURL = uploadedURL
                } else {
                    setProfileSaveLoading(false)
                    return
                }
            }

            // Update Firebase Auth profile
            await updateProfile(auth.currentUser, {
                displayName: localName,
                photoURL: newPhotoURL,
            })

            // Update user document in Firestore
            const userDocRef = doc(db, 'users', user.uid)
            const firestoreUpdateData = {
                name: localName,
                photoURL: newPhotoURL,
                school: localSchool,
                department: localDepartment,
            }
            await setDoc(userDocRef, firestoreUpdateData, { merge: true })

            // Update local Zustand store
            const updatedUserInStore: User = {
                ...user,
                name: localName,
                displayName: localName,
                photoURL: newPhotoURL,
                school: localSchool,
                department: localDepartment,
            }
            setUser(updatedUserInStore)

            setIsEditing(false)
            setLocalPhotoFile(null)
            setMessage({ text: 'Profile updated successfully!', type: 'success' })
        } catch (error: unknown) {
            console.error('Error updating profile:', error)
            if (error instanceof Error) {
                setMessage({ text: `Failed to update profile: ${error.message}`, type: 'error' })
            } else {
                setMessage({ text: 'An unknown error occurred while updating profile.', type: 'error' })
            }
        } finally {
            setProfileSaveLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <LoadingSpinner />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-gray-600">Please log in to view your profile.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 transition-colors duration-300 w-full">
            <div className="mx-auto py-8 px-4 w-full">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-36 relative">
                        {/* Message Display */}
                        {message && (
                            <div
                                className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-md flex items-center space-x-2
                                ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                                {message.type === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                                <span>{message.text}</span>
                            </div>
                        )}
                    </div>

                    <div className="px-6 pb-6 relative">
                        <div className="flex flex-col md:flex-row justify-between items-center md:items-start -mt-20 md:-mt-16">
                            {/* Profile Picture and Name */}
                            <div className="flex flex-col md:flex-row items-center md:items-end w-full md:w-auto">
                                <div className="relative group">
                                    <img
                                        src={localPhotoFile ? URL.createObjectURL(localPhotoFile) : user.photoURL || '/images/default-avatar.jpg'}
                                        alt="Profile"
                                        className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {isEditing && (
                                        <label className="absolute bottom-0 right-0 bg-white p-3 rounded-full shadow-md cursor-pointer transform translate-x-1 translate-y-1 transition-all duration-200 hover:scale-110">
                                            <FiUpload className="text-blue-600 text-lg" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const maxFileSize = 5 * 1024 * 1024; // 5MB
                                                        if (file.size > maxFileSize) {
                                                            setMessage({ text: 'File size must be less than 5MB.', type: 'error' });
                                                            setLocalPhotoFile(null);
                                                            e.target.value = ''; // Reset file input
                                                            return;
                                                        }
                                                        setLocalPhotoFile(file);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                                <div className="mt-4 md:ml-6 md:mt-0 text-center md:text-left">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={localName}
                                            onChange={(e) => setLocalName(e.target.value)}
                                            className="text-3xl font-extrabold bg-gray-100 border border-gray-300 text-gray-900 rounded-lg px-4 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                            placeholder="Your Name"
                                        />
                                    ) : (
                                        <h1 className="text-3xl font-extrabold text-gray-900 transition-colors duration-300">
                                            {user.name || user.displayName}
                                        </h1>
                                    )}
                                    <p className="text-gray-600 text-lg mt-1">{user.email}</p>
                                </div>
                            </div>

                            {/* Edit/Save Button */}
                            <button
                                onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                                disabled={profileSaveLoading}
                                className="mt-6 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-center font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {profileSaveLoading ? (
                                    <span className="flex items-center">
                                        <svg
                                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Saving...
                                    </span>
                                ) : isEditing ? (
                                    'Save Changes'
                                ) : (
                                    <>
                                        <FiEdit className="mr-2" />
                                        Edit Profile
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Settings and Info Sections */}
                        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Account Settings */}
                            <div className="bg-gray-50 p-8 rounded-xl shadow-md transition-colors duration-300">
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Account Settings</h2>
                                <div className="space-y-6">
                                    {/* Language Selector */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-medium text-gray-800 text-lg">Language</h3>
                                            <p className="text-sm text-gray-500">Choose your preferred interface language.</p>
                                        </div>
                                        <div className="relative">
                                            <select
                                                className="appearance-none bg-white border border-gray-300 text-gray-800 outline-none rounded-lg pl-4 pr-10 py-2 text-base shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                                            >
                                                <option value="en">English</option>
                                                <option value="fr">Français</option>
                                                <option value="es">Español</option>
                                            </select>
                                            <FiGlobe className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="bg-gray-50 p-8 rounded-xl shadow-md transition-colors duration-300">
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Account Information</h2>
                                <div className="space-y-5">
                                    {/* Email */}
                                    <div>
                                        <p className="text-sm text-gray-500">Email Address</p>
                                        <p className="font-medium text-gray-800 text-lg">{user.email}</p>
                                    </div>

                                    {/* School */}
                                    <div>
                                        <p className="text-sm text-gray-500">School</p>
                                        {isEditing ? (
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FiBook className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={localSchool}
                                                    onChange={(e) => setLocalSchool(e.target.value)}
                                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 text-sm border-gray-300 rounded-md py-2.5 border text-black sm:text-base sm:py-3"
                                                    placeholder="e.g. University of Lagos"
                                                />
                                            </div>
                                        ) : (
                                            <p className="font-medium text-gray-800 text-lg">{user.school || 'Not specified'}</p>
                                        )}
                                    </div>

                                    {/* Department */}
                                    <div>
                                        <p className="text-sm text-gray-500">Department</p>
                                        {isEditing ? (
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FiBook className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={localDepartment}
                                                    onChange={(e) => setLocalDepartment(e.target.value)}
                                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 text-sm border-gray-300 rounded-md py-2.5 border text-black sm:text-base sm:py-3"
                                                    placeholder="e.g. Computer Science"
                                                />
                                            </div>
                                        ) : (
                                            <p className="font-medium text-gray-800 text-lg">{user.department || 'Not specified'}</p>
                                        )}
                                    </div>

                                    {/* Role */}
                                    <div>
                                        <p className="text-sm text-gray-500">User Role</p>
                                        <p className="font-medium text-gray-800 text-lg capitalize flex items-center">
                                            {user.role}
                                            {user.role === 'admin' && (
                                                <span className="ml-3 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                                                    Admin
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Account Created Date */}
                                    <div>
                                        <p className="text-sm text-gray-500">Account Created</p>
                                        <p className="font-medium text-gray-800 text-lg">
                                            {user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>

                                    {/* Last Sign-in Time */}
                                    <div>
                                        <p className="text-sm text-gray-500">Last Sign-in</p>
                                        <p className="font-medium text-gray-800 text-lg">
                                            {user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}