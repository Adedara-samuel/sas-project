'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore'
import { FiArrowLeft, FiSave, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import Link from 'next/link'

export default function NewNotePage() {
    const { user, currentCourse, authChecked } = useStore()
    const router = useRouter()
    const [note, setNote] = useState({
        title: '',
        content: ''
    })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Effect to auto-dismiss success/error messages after a few seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 5000); // Message disappears after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSave = async () => {
        if (!authChecked) {
            setMessage({ text: 'Authentication check not complete. Please wait.', type: 'error' });
            return;
        }

        if (!user?.uid) {
            setMessage({ text: 'User not authenticated. Please log in.', type: 'error' });
            return;
        }

        if (!note.title.trim() || !note.content.trim()) {
            setMessage({ text: 'Title and content are required.', type: 'error' });
            return;
        }

        setSaving(true)
        setMessage(null);

        try {
            const noteData = {
                title: note.title.trim(),
                content: note.content.trim(),
                courseId: currentCourse?.id || '',
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }

            const newNoteRef = doc(collection(db, 'notes'))
            await setDoc(newNoteRef, noteData)

            setMessage({ text: 'Note created successfully!', type: 'success' });
            // Redirect after a short delay to allow the user to see the success message
            setTimeout(() => {
                router.push(`/notes/${newNoteRef.id}`);
            }, 1000);
        } catch (error: unknown) {
            console.error('Error creating note:', error)
            if (error instanceof Error) {
                setMessage({ text: `Failed to create note: ${error.message}`, type: 'error' });
            } else {
                setMessage({ text: 'An unknown error occurred while creating the note.', type: 'error' });
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <Link
                        href="/notes"
                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 text-lg font-medium mb-4 sm:mb-0"
                    >
                        <FiArrowLeft className="mr-2 text-xl" />
                        Back to Notes
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 text-center sm:text-right">Create New Note</h1>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 shadow-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle className="text-xl" /> : <FiXCircle className="text-xl" />}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}

                {currentCourse && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-6 shadow-sm border border-blue-200">
                        <p className="text-blue-800 text-base">
                            Note for: <span className="font-semibold">{currentCourse.title} ({currentCourse.code})</span>
                        </p>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                    <div className="mb-6">
                        <label htmlFor="note-title" className="block text-sm font-semibold mb-2 text-gray-800">Title *</label>
                        <input
                            id="note-title"
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                            value={note.title}
                            onChange={(e) => setNote({ ...note, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="mb-8">
                        <label htmlFor="note-content" className="block text-sm font-semibold mb-2 text-gray-800">Content *</label>
                        <textarea
                            id="note-content"
                            className="w-full p-3 border resize-none border-gray-300 rounded-lg min-h-[300px] text-gray-900 font-sans placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                            value={note.content}
                            onChange={(e) => setNote({ ...note, content: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={!note.title.trim() || !note.content.trim() || saving || !authChecked || !user?.uid}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl flex items-center justify-center font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {saving ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </span>
                            ) : (
                                <>
                                    <FiSave className="mr-2" />
                                    Save Note
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
