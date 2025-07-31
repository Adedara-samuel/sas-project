/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { FiUser, FiUserCheck, FiUserX, FiX } from 'react-icons/fi'
// import { setAdminClaim } from '@/utils/admin-client';
import { db } from '@/lib/firebase';
import { setAdminClaim } from '@/lib/firebase-admin';

// Define a type for the user data for better type safety
interface User {
    id: string;
    email: string;
    fullName?: string;
    role: 'admin' | 'student';
    createdAt?: any; // Firestore Timestamp
}

const ManageUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [userToUpdate, setUserToUpdate] = useState<User | null>(null);

    // useEffect hook to listen for real-time changes to the 'users' collection in Firestore
    useEffect(() => {
        if (!db) {
            console.error("Firestore db is not initialized.");
            return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
            setUsers(usersData);
        }, (error) => {
            console.error("Error fetching users:", error);
        });

        // Clean up the listener when the component unmounts
        return () => unsubscribe();
    }, []);

    // Function to handle the confirmation modal and initiate the update process
    const handleToggleAdminStatus = (user: User) => {
        setUserToUpdate(user);
        setShowModal(true);
    };

    // Function to perform the actual update after the modal is confirmed
    const confirmAction = async () => {
        if (!userToUpdate) return;

        setShowModal(false);
        setLoading(true);

        const isCurrentlyAdmin = userToUpdate.role === 'admin';
        const newRole = isCurrentlyAdmin ? 'student' : 'admin';

        try {
            // Step 1: Update the user's role in the Firestore document
            await updateDoc(doc(db, 'users', userToUpdate.id), {
                role: newRole
            });

            // Step 2: Update the user's custom claims via the API route
            await setAdminClaim(userToUpdate.id, !isCurrentlyAdmin);

            console.log(`Successfully updated user role for ${userToUpdate.email} to ${newRole}`);
        } catch (error) {
            console.error('Error updating user role:', error);
            // Optionally, revert the state or show an error message to the user
            alert('Failed to update user role. Please try again.');
        } finally {
            setLoading(false);
            setUserToUpdate(null);
        }
    };

    const cancelAction = () => {
        setShowModal(false);
        setUserToUpdate(null);
    };

    return (
        <div className="space-y-6 container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">User Management</h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    <div className="flex items-center">
                                        <FiUser className="mr-2" />
                                        {user.fullName || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">
                                    {user.role}
                                    {user.role === 'admin' && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">Admin</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                    {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleToggleAdminStatus(user)}
                                        disabled={loading}
                                        className={`inline-flex items-center px-4 py-2 rounded-md transition-colors duration-200 ease-in-out ${user.role === 'admin'
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {loading && userToUpdate?.id === user.id ? (
                                            'Processing...'
                                        ) : (
                                            <>
                                                {user.role === 'admin' ? (
                                                    <>
                                                        <FiUserX className="mr-1" />
                                                        Remove Admin
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiUserCheck className="mr-1" />
                                                        Make Admin
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Confirmation Modal */}
            {showModal && userToUpdate && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Action</h3>
                            <button onClick={cancelAction} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="my-4">
                            <p className="text-gray-700 dark:text-gray-300">
                                Are you sure you want to {userToUpdate.role === 'admin' ? 'remove admin privileges from' : 'make'} <span className="font-semibold">{userToUpdate.email}</span>?
                            </p>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={cancelAction}
                                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                className={`px-4 py-2 rounded-md text-white ${userToUpdate.role === 'admin' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                            >
                                {userToUpdate.role === 'admin' ? 'Remove' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;
