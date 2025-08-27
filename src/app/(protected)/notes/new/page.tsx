'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore'
import { FiArrowLeft, FiMoreHorizontal } from 'react-icons/fi'
import Link from 'next/link'
import { FaRegCheckSquare, FaCamera, FaPencilAlt } from 'react-icons/fa';
import { HiOutlineDotsCircleHorizontal } from "react-icons/hi";

// Import Tiptap components
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export default function NewNotePage() {
    const { user, currentCourse, authChecked } = useStore()
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Initialize the Tiptap editor
    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML()) // Tiptap saves content as HTML
        },
        editorProps: {
            attributes: {
                // Corrected line: removed 'prose' classes to fill the whole area
                class: 'focus:outline-none w-full h-full'
            },
        },
        immediatelyRender: false,
    })

    useEffect(() => {
        if (editor && content && editor.isEmpty) {
            editor.commands.setContent(content, { emitUpdate: false })
        }
    }, [content, editor])
    
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

        if (!editor?.getText()?.trim()) {
            setMessage({ text: 'Content is required.', type: 'error' })
            return
        }

        setSaving(true)
        setMessage(null)

        try {
            const noteTitle = title.trim() || 'Untitled'
            
            const noteData = {
                title: noteTitle,
                content: editor.getHTML(),
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
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full text-center text-lg font-bold placeholder-gray-400 focus:outline-none"
                    />
                </div>
                <div className="text-gray-500 flex items-center space-x-4">
                    <button
                        onClick={handleSave}
                        disabled={!editor?.getText()?.trim() || saving || !authChecked || !user?.uid}
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
                <EditorContent editor={editor} className="h-full text-gray-700" />
            </div>
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