'use client';

import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { FiMenu, FiX, FiUser } from 'react-icons/fi';
import { FaBook } from 'react-icons/fa';

export default function DashboardNav() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/login');
            setIsOpen(false);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const userInitial = auth.currentUser?.email?.charAt(0).toUpperCase() || 'U';

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo and App Name */}
                    <div className="flex items-center space-x-2">
                        <Link href="/dashboard" className="flex items-center group">
                            <FaBook width={2.78} size="25" className='text-blue-700' />
                            <span className="text-xl font-extrabold text-gray-800 ml-2 tracking-tight hidden sm:block">Academic Manager</span>
                            <span className="text-xl font-extrabold text-gray-800 ml-2 block sm:hidden">AM</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation Links and User Avatar */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/dashboard"
                            className="text-gray-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200 ease-in-out px-3 py-2 rounded-md hover:bg-blue-50"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/dashboard/ai-chat"
                            className="text-gray-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200 ease-in-out px-3 py-2 rounded-md hover:bg-blue-50"
                        >
                            AI Assistant
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-gray-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200 ease-in-out px-3 py-2 rounded-md hover:bg-blue-50"
                        >
                            Logout
                        </button>
                        <Link href="/dashboard/profile" className="relative group block">
                            <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold overflow-hidden shadow-sm cursor-pointer transition-all duration-200 ease-in-out group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-opacity-50">
                                {userInitial !== 'U' ? (
                                    userInitial
                                ) : (
                                    <FiUser size={18} className="text-white" />
                                )}
                            </div>
                        </Link>
                    </div>

                    {/* Mobile Menu Button (visible on small screens) */}
                    <div className="-mr-2 flex items-center md:hidden">
                        <button
                            onClick={toggleMenu}
                            type="button"
                            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                            aria-controls="mobile-menu"
                            aria-expanded="false"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? (
                                <FiX className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <FiMenu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Panel (conditionally rendered) */}
            {isOpen && (
                <div className="md:hidden border-b border-gray-100 pb-4" id="mobile-menu" ref={menuRef}>
                    <div className="px-2 pt-2 space-y-1 sm:px-3">
                        <Link
                            href="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/dashboard/ai-chat"
                            onClick={() => setIsOpen(false)}
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                            AI Assistant
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                            Logout
                        </button>
                        <Link
                            href="/dashboard/profile"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-2 flex items-center"
                        >
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                                {userInitial !== 'U' ? userInitial : <FiUser size={18} className="text-white" />}
                            </div>
                            <span className="ml-2 text-sm text-gray-700">My Profile</span>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}