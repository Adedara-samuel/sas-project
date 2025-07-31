/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
// import { useRouter } from 'next/navigation'
import { FiUser, FiMail, FiLock, FiBook, FiHash, FiAlertCircle } from 'react-icons/fi'

export default function RegisterForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [matricNumber, setMatricNumber] = useState('')
    const [department, setDepartment] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    // const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            await setDoc(doc(db, 'users', user.uid), {
                fullName,
                matricNumber,
                department,
                email,
                createdAt: serverTimestamp(),
                role: 'student'
            })

            // No setTimeout needed. The AuthProvider will handle the redirect
            // once the Firebase auth state changes.
        } catch (err: any) {
            setError(err.message.replace(' ', ''))
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleRegister} className="space-y-4">
            {error && (
                <div className="flex items-center p-4 bg-red-50 rounded-lg text-red-700">
                    <FiAlertCircle className="mr-2" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="col-span-2 sm:col-span-2">
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                        Full Name
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiUser className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border text-black"
                            placeholder="John Doe"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="matricNumber" className="block text-sm font-medium text-gray-700">
                        Matric Number
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiHash className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="matricNumber"
                            name="matricNumber"
                            type="text"
                            required
                            value={matricNumber}
                            onChange={(e) => setMatricNumber(e.target.value)}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border text-black"
                            placeholder="U20XXXXXX"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                        Department
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiBook className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="department"
                            name="department"
                            type="text"
                            required
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border text-black"
                            placeholder="Computer Science"
                        />
                    </div>
                </div>

                <div className="col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiMail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border text-black"
                            placeholder="your@school.edu"
                        />
                    </div>
                </div>

                <div className="col-span-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border text-black"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        Must be at least 6 characters
                    </p>
                </div>
            </div>

            <div className="flex items-center">
                <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                    I agree to the terms and conditions
                </label>
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating account...
                        </span>
                    ) : (
                        'Create Account'
                    )}
                </button>
            </div>
        </form>
    )
}