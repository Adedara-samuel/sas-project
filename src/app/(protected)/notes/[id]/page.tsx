/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { FiArrowLeft, FiEdit, FiTrash2, FiSave, FiX, FiCheckCircle, FiXCircle, FiBookOpen } from 'react-icons/fi'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Import SimpleMDE editor and its types
import SimpleMdeReact from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import EasyMDE from 'easymde';

// Define the Note and Course interfaces for type safety
interface Note {
    id: string;
    title: string;
    content: string;
    userId: string;
    courseId?: string;
    createdAt: Date;
    updatedAt: Date | Timestamp | null;
}

interface EditNote {
    title: string;
    content: string;
}

interface Course {
    id: string;
    title: string;
}

// A simple loading spinner component
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
    </div>
);

export default function NoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, courses } = useStore();
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editNote, setEditNote] = useState<EditNote>({
        title: '',
        content: ''
    });
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const id = params?.id;

    // Effect to auto-dismiss messages
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        // Handle cases where the id might be an array (for catch-all routes)
        const noteId = Array.isArray(id) ? id[0] : id;

        if (!noteId || !user?.uid) {
            setLoading(false);
            return;
        }

        const fetchNote = async () => {
            try {
                const noteDoc = await getDoc(doc(db, 'notes', noteId as string));
                if (noteDoc.exists() && noteDoc.data().userId === user.uid) {
                    const data = noteDoc.data();
                    const fetchedNote: Note = {
                        id: noteDoc.id,
                        title: data.title,
                        content: data.content,
                        userId: data.userId,
                        courseId: data.courseId,
                        createdAt: data.createdAt?.toDate(),
                        updatedAt: data.updatedAt
                    };
                    setNote(fetchedNote);
                    setEditNote({
                        title: fetchedNote.title,
                        content: fetchedNote.content
                    });
                } else {
                    console.warn('Note not found or user does not have permission.');
                    router.push('/notes');
                }
            } catch (error) {
                console.error('Error fetching note:', error);
                router.push('/notes');
            } finally {
                setLoading(false);
            }
        };

        fetchNote();
    }, [id, router, user]);

    const isOwner = user && note && note.userId === user.uid;

    const handleSave = async () => {
        if (!isOwner || !note) return;

        if (!editNote.title.trim() || !editNote.content.trim()) {
            setMessage({ text: 'Title and content are required.', type: 'error' });
            return;
        }

        try {
            await updateDoc(doc(db, 'notes', note.id), {
                title: editNote.title,
                content: editNote.content,
                updatedAt: serverTimestamp()
            });

            setNote({
                ...note,
                title: editNote.title,
                content: editNote.content,
                updatedAt: new Date() as any
            });
            setIsEditing(false);
            setMessage({ text: 'Note updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating note:', error);
            setMessage({ text: 'Failed to update note. Please try again.', type: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!isOwner || !note) return;

        setDeleting(true);
        setShowDeleteModal(false);
        try {
            await deleteDoc(doc(db, 'notes', note.id));
            setMessage({ text: 'Note deleted successfully!', type: 'success' });
            setTimeout(() => router.push('/notes'), 1500);
        } catch (error) {
            console.error('Error deleting note:', error);
            setMessage({ text: 'Failed to delete note. Please try again.', type: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const getCourseTitle = (courseId: string) => {
        const course = courses.find((c: Course) => c.id === courseId);
        return course ? course.title : 'General';
    };

    // SimpleMDE options, memoized
    const mdeOptions = useMemo(() => {
        return {
            autofocus: true,
            spellChecker: false,
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', '|',
                'link', 'image',
                {
                    name: "preview",
                    action: (editor: EasyMDE) => EasyMDE.togglePreview(editor),
                    className: "fa fa-eye no-disable",
                    title: "Toggle Preview"
                },
                {
                    name: "side-by-side",
                    action: (editor: EasyMDE) => EasyMDE.toggleSideBySide(editor),
                    className: "fa fa-columns no-disable no-mobile",
                    title: "Toggle Side by Side"
                },
                {
                    name: "fullscreen",
                    action: (editor: EasyMDE) => EasyMDE.toggleFullScreen(editor),
                    className: "fa fa-arrows-alt no-disable no-mobile",
                    title: "Toggle Fullscreen"
                },
                '|',
                'guide'
            ],
            status: false,
        } as EasyMDE.Options;
    }, []);


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    if (!note) {
        return (
            <div className="min-h-screen text-center py-12 px-4 bg-gray-50 flex flex-col items-center justify-center">
                <div className="inline-block p-4 bg-gray-100 rounded-full mb-6">
                    <FiXCircle className="text-5xl text-red-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900">Note not found or you do not have access.</h3>
                <Link href="/notes" className="mt-4 inline-block text-blue-600 hover:underline">
                    <FiArrowLeft className="inline-block mr-2" />
                    Back to notes
                </Link>
            </div>
        );
    }

    // Helper to get the display date, handling both Date and Timestamp types
    const getDisplayDate = (date: Date | Timestamp | null) => {
        if (!date) return 'N/A';
        if (date instanceof Timestamp) {
            return date.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
                    <Link
                        href="/notes"
                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 text-lg font-semibold"
                    >
                        <FiArrowLeft className="mr-2 text-xl" />
                        Back to Notes
                    </Link>

                    {isOwner && (
                        <div className="flex space-x-2">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md transform hover:scale-105"
                                    >
                                        <FiEdit className="mr-2" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        disabled={deleting}
                                        className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiTrash2 className="mr-2" />
                                        {deleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditNote({ title: note.title, content: note.content });
                                            setMessage(null);
                                        }}
                                        className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-all duration-200"
                                    >
                                        <FiX className="mr-2" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md transform hover:scale-105"
                                    >
                                        <FiSave className="mr-2" />
                                        Save
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 shadow-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle className="text-xl" /> : <FiXCircle className="text-xl" />}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}

                {isEditing ? (
                    <div>
                        <div className="mb-6">
                            <label htmlFor="note-title" className="block text-sm font-semibold mb-2 text-gray-800">Title</label>
                            <input
                                id="note-title"
                                type="text"
                                className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                value={editNote.title}
                                onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="note-content" className="block text-sm font-semibold mb-2 text-gray-800">Content</label>
                            <SimpleMdeReact
                                value={editNote.content}
                                onChange={(value) => setEditNote({ ...editNote, content: value })}
                                options={mdeOptions}
                                className="w-full text-gray-800 font-sans leading-relaxed"
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{note.title}</h1>

                        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 mb-6 space-y-2 sm:space-y-0 sm:space-x-4">
                            <span>Created: {getDisplayDate(note.createdAt)}</span>
                            <span>Updated: {getDisplayDate(note.updatedAt)}</span>
                            {note.courseId && (
                                <span className="flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                                    <FiBookOpen className="mr-1 text-sm" />
                                    {getCourseTitle(note.courseId)}
                                </span>
                            )}
                        </div>

                        <div className="prose max-w-none text-gray-800 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 transition-transform duration-300">
                        <FiTrash2 className="text-5xl text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Note</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
                        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-5 py-2 rounded-lg text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}