/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { updateProfile } from 'firebase/auth'
import { auth, storage, db } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { FiEdit, FiUpload, FiGlobe, FiSun, FiMoon, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { User } from '@/types/user'; // Import your custom User interface

export default function ProfilePage() {
    const { user, setUser, authChecked } = useStore();
    const [localName, setLocalName] = useState(user?.name || '');
    const [localPhotoFile, setLocalPhotoFile] = useState<File | null>(null);
    // const [localDarkMode, setLocalDarkMode] = useState(user?.darkMode ?? false);
    // const [localLanguage, setLocalLanguage] = useState<'en' | 'fr' | 'es'>(user?.language || 'en');

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profileSaveLoading, setProfileSaveLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const fetchUserProfile = useCallback(async () => {
        console.log("fetchUserProfile: Starting fetch. authChecked:", authChecked, "auth.currentUser:", auth.currentUser);
        if (!authChecked || !auth.currentUser) {
            setLoading(false);
            console.log("fetchUserProfile: Skipping fetch - not authenticated or auth not checked.");
            return;
        }

        setLoading(true);
        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            let firestoreData: Partial<User> = {};
            if (userDocSnap.exists()) {
                firestoreData = userDocSnap.data() as Partial<User>;
                console.log("fetchUserProfile: Fetched Firestore data:", firestoreData);
            } else {
                console.log("fetchUserProfile: No existing user profile in Firestore. Creating a new one for:", auth.currentUser.uid);
                firestoreData = {
                    name: auth.currentUser.displayName,
                    photoURL: auth.currentUser.photoURL,
                    // darkMode: false,
                    // language: 'en',
                    role: 'student'
                };
                await setDoc(userDocRef, firestoreData, { merge: true });
                console.log("fetchUserProfile: New user profile created in Firestore.");
            }

            const updatedUser: User = {
                id: auth.currentUser.uid,
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
                photoURL: firestoreData.photoURL || auth.currentUser.photoURL || null,
                metadata: {
                    creationTime: auth.currentUser.metadata.creationTime,
                    lastSignInTime: auth.currentUser.metadata.lastSignInTime,
                },
                name: firestoreData.name || auth.currentUser.displayName || null,
                // darkMode: firestoreData.darkMode ?? false,
                // language: firestoreData.language || 'en',
                role: (firestoreData.role as 'admin' | 'student') || 'student',
            };

            setUser(updatedUser);
            setLocalName(updatedUser.name || '');
            // setLocalDarkMode(updatedUser.darkMode);
            // setLocalLanguage(updatedUser.language);
            console.log("fetchUserProfile: Zustand user state updated after fetch:", updatedUser);

        } catch (error: unknown) {
            console.error('fetchUserProfile: Error fetching user profile from Firestore:', error);
            if (error instanceof Error) {
                setMessage({ text: `Failed to load profile: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred while loading profile.', type: 'error' });
            }
        } finally {
            setLoading(false);
            console.log("fetchUserProfile: Loading state set to false.");
        }
    }, [authChecked, setUser]);

    useEffect(() => {
        if (authChecked) {
            fetchUserProfile();
        }
    }, [authChecked, fetchUserProfile]);


    const uploadPhoto = async (): Promise<string | null> => {
        console.log("uploadPhoto: Function called.");
        if (!localPhotoFile || !user) {
            console.error("uploadPhoto: No photo file or user to upload. localPhotoFile:", localPhotoFile, "user:", user);
            setMessage({ text: 'No photo selected or user not logged in.', type: 'error' });
            return null;
        }

        try {
            console.log("uploadPhoto: Starting upload for user:", user.uid, "File name:", localPhotoFile.name);
            const fileName = `${user.uid}_${Date.now()}_${localPhotoFile.name}`;
            const storageRef = ref(storage, `profile-photos/${user.uid}/${fileName}`);
            
            console.log("uploadPhoto: Uploading bytes to path:", storageRef.fullPath);
            const snapshot = await uploadBytes(storageRef, localPhotoFile);
            console.log("uploadPhoto: Bytes uploaded successfully. Snapshot:", snapshot);

            console.log("uploadPhoto: Getting download URL...");
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log("uploadPhoto: Download URL received:", downloadURL);
            return downloadURL;
        } catch (error: unknown) {
            console.error('uploadPhoto: Error during upload process:', error);
            if (error instanceof Error) {
                setMessage({ text: `Photo upload failed: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred during photo upload.', type: 'error' });
            }
            return null;
        }
    };

    const handleSaveProfile = async () => {
        console.log("handleSaveProfile: Function called. isEditing:", isEditing);
        if (!user || !auth.currentUser) {
            setMessage({ text: 'No user logged in.', type: 'error' });
            console.error("handleSaveProfile: No user or current user not authenticated.");
            return;
        }

        setProfileSaveLoading(true);
        setMessage(null);

        try {
            let newPhotoURL = user.photoURL; // Start with current photoURL

            if (localPhotoFile) {
                console.log("handleSaveProfile: Photo file selected. Initiating upload...");
                const uploadedURL = await uploadPhoto();
                if (uploadedURL) {
                    newPhotoURL = uploadedURL;
                    console.log("handleSaveProfile: Photo uploaded, new URL:", newPhotoURL);
                } else {
                    console.log("handleSaveProfile: Photo upload failed, stopping save process.");
                    setProfileSaveLoading(false);
                    return; // Stop if photo upload failed
                }
            } else {
                console.log("handleSaveProfile: No new photo file selected. Keeping existing photoURL.");
            }

            // Update Firebase Auth profile
            console.log("handleSaveProfile: Updating Firebase Auth profile (displayName, photoURL)...");
            await updateProfile(auth.currentUser, {
                displayName: localName,
                photoURL: newPhotoURL
            });
            console.log("handleSaveProfile: Firebase Auth profile updated.");

            // Update user document in Firestore
            console.log("handleSaveProfile: Updating Firestore document (name, photoURL, darkMode, language)...");
            const userDocRef = doc(db, 'users', user.uid);
            const firestoreUpdateData = {
                name: localName,
                photoURL: newPhotoURL,
                // darkMode: localDarkMode,
                // language: localLanguage,
            };
            await setDoc(userDocRef, firestoreUpdateData, { merge: true });
            console.log("handleSaveProfile: Firestore profile updated.");

            // Update local Zustand store with all current local states
            const updatedUserInStore: User = {
                ...user,
                name: localName,
                displayName: localName,
                photoURL: newPhotoURL,
                // darkMode: localDarkMode,
                // language: localLanguage,
            };
            setUser(updatedUserInStore);
            console.log("handleSaveProfile: Zustand store updated.");

            setIsEditing(false);
            setLocalPhotoFile(null);
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
        } catch (error: unknown) {
            console.error('handleSaveProfile: Error updating profile:', error);
            if (error instanceof Error) {
                setMessage({ text: `Failed to update profile: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred while updating profile.', type: 'error' });
            }
        } finally {
            setProfileSaveLoading(false);
            console.log("handleSaveProfile: Loading state reset.");
        }
    };

    // const handleToggleDarkMode = async () => {
    //     if (!user) return;
    //     const newDarkMode = !localDarkMode;
    //     setLocalDarkMode(newDarkMode);
    //     setMessage(null);

    //     try {
    //         const userDocRef = doc(db, 'users', user.uid);
    //         await setDoc(userDocRef, { darkMode: newDarkMode }, { merge: true });
    //         setUser({ ...user, darkMode: newDarkMode });
    //         setMessage({ text: 'Dark mode preference saved.', type: 'success' });
    //     } catch (error: unknown) {
    //         console.error('Error saving dark mode preference:', error);
    //         setMessage({ text: 'Failed to save dark mode preference.', type: 'error' });
    //         setLocalDarkMode(!newDarkMode);
    //     }
    // };

    const handleSetLanguage = async (newLanguage: 'en' | 'fr' | 'es') => {
        if (!user) return;
        // setLocalLanguage(newLanguage);
        setMessage(null);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { language: newLanguage }, { merge: true });
            // setUser({ ...user, language: newLanguage });
            setMessage({ text: 'Language preference saved.', type: 'success' });
        } catch (error: unknown) {
            console.error('Error saving language preference:', error);
            setMessage({ text: 'Failed to save language preference.', type: 'error' });
            // setLocalLanguage(localLanguage);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 ">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 ">
                <p className="text-gray-600 ">Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50  transition-colors duration-300 w-full">
            <div className="mx-auto py-8 px-4 w-full">
                <div className="bg-white  rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-36 relative">
                        {/* Message Display */}
                        {message && (
                            <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-md flex items-center space-x-2
                                ${message.type === 'success' ? 'bg-green-100 text-green-800 ' : 'bg-red-100 text-red-800 '}`}>
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
                                        className="w-32 h-32 rounded-full border-4 border-white  object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {isEditing && (
                                        <label className="absolute bottom-0 right-0 bg-white  p-3 rounded-full shadow-md cursor-pointer transform translate-x-1 translate-y-1 transition-all duration-200 hover:scale-110">
                                            <FiUpload className="text-blue-600  text-lg" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => e.target.files && setLocalPhotoFile(e.target.files[0])}
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
                                            className="text-3xl font-extrabold bg-gray-100 border border-gray-300  text-gray-900  rounded-lg px-4 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                            placeholder="Your Name"
                                        />
                                    ) : (
                                        <h1 className="text-3xl font-extrabold text-gray-900 transition-colors duration-300">
                                            {user.name || user.displayName || 'User'}
                                        </h1>
                                    )}
                                    <p className="text-gray-600 text-lg mt-1">{user.email}</p>
                                </div>
                            </div>

                            {/* Edit/Save Button */}
                            <button
                                onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                                disabled={profileSaveLoading}
                                className="mt-6 md:mt-0 bg-blue-600 hover:bg-blue-700  text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-center font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {profileSaveLoading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </span>
                                ) : isEditing ? 'Save Changes' : (
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
                            <div className="bg-gray-50  p-8 rounded-xl shadow-md transition-colors duration-300">
                                <h2 className="text-2xl font-bold mb-6 text-gray-900 ">Account Settings</h2>

                                <div className="space-y-6">
                                    {/* Dark Mode Toggle */}
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                        <div>
                                            <h3 className="font-medium text-gray-800  text-lg">Dark Mode</h3>
                                            <p className="text-sm text-gray-500 ">Toggle dark theme for the interface.</p>
                                        </div>
                                        {/* <button
                                            onClick={handleToggleDarkMode}
                                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 ${localDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                                            aria-checked={localDarkMode}
                                            role="switch"
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300
                                                    ${localDarkMode ? 'translate-x-7' : 'translate-x-1'}`}
                                            >
                                                {localDarkMode ? (
                                                    <FiMoon className="h-full w-full p-1 text-blue-600" />
                                                ) : (
                                                    <FiSun className="h-full w-full p-1 text-gray-500" />
                                                )}
                                            </span>
                                        </button> */}
                                    </div>

                                    {/* Language Selector */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-medium text-gray-800 text-lg">Language</h3>
                                            <p className="text-sm text-gray-500 ">Choose your preferred interface language.</p>
                                        </div>
                                        {/* <div className="relative">
                                            <select
                                                // value={localLanguage}
                                                onChange={(e) => handleSetLanguage(e.target.value as 'en' | 'fr' | 'es')}
                                                className="appearance-none bg-white  border border-gray-300  text-gray-800  outline-none rounded-lg pl-4 pr-10 py-2 text-base shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                                            >
                                                <option value="en">English</option>
                                                <option value="fr">Français</option>
                                                <option value="es">Español</option>
                                            </select>
                                            <FiGlobe className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500  pointer-events-none" />
                                        </div> */}
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="bg-gray-50 p-8 rounded-xl shadow-md transition-colors duration-300">
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Account Information</h2>

                                <div className="space-y-5">
                                    {/* Email */}
                                    <div>
                                        <p className="text-sm text-gray-500 ">Email Address</p>
                                        <p className="font-medium text-gray-800  text-lg">{user.email}</p>
                                    </div>

                                    {/* Role */}
                                    <div>
                                        <p className="text-sm text-gray-500 ">User Role</p>
                                        <p className="font-medium text-gray-800  text-lg capitalize flex items-center">
                                            {user.role}
                                            {user.role === 'admin' && (
                                                <span className="ml-3 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">Admin</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Account Created Date */}
                                    <div>
                                        <p className="text-sm text-gray-500 ">Account Created</p>
                                        <p className="font-medium text-gray-800  text-lg">
                                            {user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>

                                    {/* Last Sign-in Time */}
                                    <div>
                                        <p className="text-sm text-gray-500 ">Last Sign-in</p>
                                        <p className="font-medium text-gray-800  text-lg">
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
    );
}
