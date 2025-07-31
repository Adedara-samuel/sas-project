/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await sendPasswordResetEmail(auth, email)
            setSuccess(true)
        } catch (err: any) {
            setError(err.message.replace('Firebase:', '').trim())
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-16">
                <div className="flex flex-col items-center justify-center">
                    <div className="w-full max-w-md">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center">
                                <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
                                <p className="text-blue-100 mt-2">
                                    Enter your email and we’ll send you a reset link
                                </p>
                            </div>

                            <div className="p-8">
                                {success ? (
                                    <div className="space-y-4 text-center text-green-700">
                                        <p className="text-lg font-medium">✅ Reset link sent successfully!</p>
                                        <p className="text-sm">
                                            Please check your email inbox — and don't forget to check your <strong>Spam</strong> or <strong>Trash</strong> folders if you don't see it within a few minutes.
                                        </p>
                                        <Link
                                            href="/login"
                                            className="inline-block mt-2 text-blue-600 hover:underline"
                                        >
                                            🔙 Return to Login
                                        </Link>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-gray-700 font-medium mb-1">
                                                Email address
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded outline-none"
                                                required
                                            />
                                        </div>

                                        {error && (
                                            <div className="text-red-600 text-sm">{error}</div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-all"
                                        >
                                            {loading ? 'Sending...' : 'Send Reset Link'}
                                        </button>

                                        <div className="text-center text-sm text-gray-600 mt-4">
                                            <Link
                                                href="/login"
                                                className="text-blue-600 hover:underline"
                                            >
                                                Back to login
                                            </Link>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 text-center text-sm text-gray-600">
                            <p>
                                By continuing, you agree to our{' '}
                                <a href="#" className="text-blue-600 hover:underline">
                                    Terms of Service
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:underline">
                                    Privacy Policy
                                </a>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
