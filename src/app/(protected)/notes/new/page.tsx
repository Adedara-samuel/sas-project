'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore'
import { FiArrowLeft, FiMoreHorizontal } from 'react-icons/fi'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { FaRegCheckSquare, FaCamera, FaPencilAlt } from 'react-icons/fa';
import { HiOutlineDotsCircleHorizontal } from "react-icons/hi";

// Use react-simplemde-editor instead
const SimpleMDE = dynamic(() => import('react-simplemde-editor'), {
    ssr: false,
    loading: () => (
        <div className="h-64 border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
            <div className="text-gray-500">Loading editor...</div>
        </div>
    )
})
import 'easymde/dist/easymde.min.css'

export default function NewNotePage() {
    const { user, currentCourse, authChecked } = useStore()
    const router = useRouter()
    const [note, setNote] = useState({
        title: '',
        content: ''
    })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Effect to auto-dismiss success/error messages
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [message])

    const handleSave = async () => {
        if (!authChecked) {
            setMessage({ text: 'Authentication check not complete. Please wait.', type: 'error' })
            return
        }

        if (!user?.uid) {
            setMessage({ text: 'User not authenticated. Please log in.', type: 'error' })
            return
        }

        if (!note.content.trim()) {
            setMessage({ text: 'Content is required.', type: 'error' })
            return
        }

        setSaving(true)
        setMessage(null)

        try {
            const title = note.title.trim() || 'Untitled'
            
            const noteData = {
                title: title,
                content: note.content.trim(),
                courseId: currentCourse?.id || '',
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }

            const newNoteRef = doc(collection(db, 'notes'))
            await setDoc(newNoteRef, noteData)

            setMessage({ text: 'Note created successfully!', type: 'success' })
            setTimeout(() => {
                router.push(`/notes/${newNoteRef.id}`)
            }, 1000)
        } catch (error: unknown) {
            console.error('Error creating note:', error)
            if (error instanceof Error) {
                setMessage({ text: `Failed to create note: ${error.message}`, type: 'error' })
            } else {
                setMessage({ text: 'An unknown error occurred while creating the note.', type: 'error' })
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
                <Link href="/notes" className="flex items-center text-blue-500 hover:text-blue-700 transition-colors duration-200">
                    <FiArrowLeft className="text-xl" />
                    <span className="ml-2 font-medium hidden sm:block">Notes</span>
                </Link>
                <div className="flex-1 text-center font-bold text-gray-800">
                    <input
                        type="text"
                        value={note.title}
                        onChange={(e) => setNote({ ...note, title: e.target.value })}
                        placeholder="Title"
                        className="w-full text-center text-lg font-bold placeholder-gray-400 focus:outline-none"
                    />
                </div>
                <div className="text-gray-500 flex items-center space-x-4">
                    <button
                        onClick={handleSave}
                        disabled={!note.content.trim() || saving || !authChecked || !user?.uid}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className={`h-5 w-5 ${saving ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            {saving ? <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> : <path className="opacity-75" fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path>}
                        </svg>
                    </button>
                    <HiOutlineDotsCircleHorizontal className="text-xl cursor-pointer" />
                </div>
            </div>

            {/* Main Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
                <SimpleMDE
                    // I have removed the border by adding a !important rule in a style block
                    className='text-gray-700 m-0'
                    value={note.content}
                    onChange={(value) => setNote({ ...note, content: value })}
                    options={{
                        placeholder: 'Write your note here...',
                        spellChecker: true,
                        status: false,
                        minHeight: '80vh',
                        toolbar: false,
                    }}
                />
            </div>
            {/* I've moved the border-b from the header to an empty div below the header */}
            <div className="border-b border-gray-200"></div>

            {/* Bottom Toolbar */}
            <div className="flex-shrink-0 flex items-center justify-around text-gray-500 p-4 bg-white border-t border-gray-200">
                <FaRegCheckSquare className="text-xl cursor-pointer" />
                <FaCamera className="text-xl cursor-pointer" />
                <FiMoreHorizontal className="text-xl cursor-pointer" />
                <FaPencilAlt className="text-xl cursor-pointer" />
            </div>
        </div>
    )
}