/* eslint-disable react/no-unescaped-entities */
import LoginForm from '@/components/auth/login-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Login | Academic Manager',
    description: 'Access your student dashboard',
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-16">
                <div className="flex flex-col items-center justify-center">
                    <div className="w-full max-w-md">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center">
                                <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                                <p className="text-blue-100 mt-2">
                                    Sign in to manage your academic journey
                                </p>
                            </div>

                            <div className="p-8">
                                <LoginForm />

                                <div className="mt-6 relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">
                                            Don't have an account?
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <a
                                        href="/register"
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                                    >
                                        Create new account
                                    </a>
                                </div>
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