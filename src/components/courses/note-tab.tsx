/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useStore, Note } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, Timestamp, orderBy, setDoc } from 'firebase/firestore'
import { FiPlus, FiEdit, FiTrash2, FiSave, FiXCircle, FiFileText, FiCheckCircle } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'

export default function NotesTab() {
    const { user, currentCourse, authChecked } = useStore()
    const [notes, setNotes] = useState<Note[]>([])
    const [activeNote, setActiveNote] = useState<Note | null>(null)
    const [content, setContent] = useState('')
    const [title, setTitle] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // --- Real-time Fetching of Notes for Current Course & User ---
    useEffect(() => {
        if (!authChecked || !user?.uid || !currentCourse?.id) {
            setLoading(false);
            setNotes([]);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, 'notes'),
            where('userId', '==', user.uid),
            where('courseId', '==', currentCourse.id),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotes: Note[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    courseId: data.courseId,
                    title: data.title,
                    content: data.content,
                    userId: data.userId,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                };
            });
            setNotes(fetchedNotes);
            setLoading(false);

            // If activeNote was deleted or no longer exists, clear it
            if (activeNote && !fetchedNotes.some(n => n.id === activeNote.id)) {
                setActiveNote(null);
                setIsEditing(false); // Exit editing mode if active note is gone
            }
            // If no active note, and notes exist, select the first one by default
            // Only if not currently creating a new note
            if (!activeNote && fetchedNotes.length > 0 && !isEditing) {
                setActiveNote(fetchedNotes[0]);
            }

        }, (error) => {
            console.error("Error fetching notes:", error);
            setMessage({ text: 'Failed to load notes.', type: 'error' });
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [authChecked, user?.uid, currentCourse?.id, activeNote, isEditing]); // Added isEditing to deps

    // Update form fields when active note changes
    useEffect(() => {
        if (activeNote) {
            setTitle(activeNote.title);
            setContent(activeNote.content);
        } else {
            setTitle('');
            setContent('');
        }
    }, [activeNote]);

    const handleSaveNote = async () => {
        if (!user?.uid || !currentCourse?.id) {
            setMessage({ text: 'Authentication or course data missing. Cannot save note.', type: 'error' });
            return;
        }
        if (!title.trim()) {
            setMessage({ text: 'Note title is required.', type: 'error' });
            return;
        }
        if (!content.trim()) {
            setMessage({ text: 'Note content is required.', type: 'error' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const noteData = {
                title: title.trim(),
                content: content.trim(),
                courseId: currentCourse.id,
                userId: user.uid,
                updatedAt: Timestamp.now()
            };

            if (activeNote && isEditing) {
                // Update existing note
                await updateDoc(doc(db, 'notes', activeNote.id), noteData);
                setMessage({ text: 'Note updated successfully!', type: 'success' });
            } else {
                // Create new note
                const newNoteRef = doc(collection(db, 'notes'));
                await setDoc(newNoteRef, { ...noteData, createdAt: Timestamp.now() });
                setMessage({ text: 'Note created successfully!', type: 'success' });
                // Set the newly created note as active
                setActiveNote({
                    id: newNoteRef.id,
                    ...noteData, // Use the data sent to Firestore
                    createdAt: new Date(), // Convert Timestamp to Date for local state
                    updatedAt: new Date()
                } as Note); // Cast to Note
            }
            setIsEditing(false); // Exit editing mode
        } catch (error: any) {
            console.error('Error saving note:', error);
            setMessage({ text: `Failed to save note: ${error.message || 'Unknown error'}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!user?.uid || !currentCourse?.id) return;

        if (window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
            setSaving(true); // Use saving state for delete too
            setMessage(null);
            try {
                await deleteDoc(doc(db, 'notes', noteId));
                setMessage({ text: 'Note deleted successfully!', type: 'success' });
                setActiveNote(null); // Clear active note after deletion
                setIsEditing(false); // Exit editing mode
            } catch (error: any) {
                console.error('Error deleting note:', error);
                setMessage({ text: `Failed to delete note: ${error.message || 'Unknown error'}`, type: 'error' });
            } finally {
                setSaving(false);
            }
        }
    };

    const handleNewNoteClick = () => {
        setActiveNote(null); // Clear active note to show empty form
        setTitle('');
        setContent('');
        setIsEditing(true); // Enter editing mode for new note
        setMessage(null); // Clear any previous messages
    };

    if (!currentCourse) {
        return (
            <div className="flex justify-center items-center py-8 text-gray-600">
                <p>Please select a course to view its notes.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 h-full">
            {/* Left Column: Note List */}
            <div className="md:col-span-1 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-900">Your Notes</h3>
                    <button
                        onClick={handleNewNoteClick} // FIX: Assign handleNewNoteClick to the plus button
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition-all duration-200"
                        title="Create New Note"
                        disabled={saving}
                    >
                        <FiPlus className="text-lg" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {notes.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm p-4">
                            No notes yet for this course. Click '+' to create one.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {notes.map(note => (
                                <li
                                    key={note.id}
                                    onClick={() => {
                                        setActiveNote(note);
                                        setIsEditing(false); // Switch to view mode when selecting
                                        setMessage(null);
                                    }}
                                    className={`p-4 cursor-pointer transition-colors duration-200
                                        ${activeNote?.id === note.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <h4 className="text-lg font-medium truncate">{note.title}</h4>
                                    <p className="text-sm truncate mt-1 text-gray-500">
                                        {note.content.substring(0, 70)}{note.content.length > 70 ? '...' : ''}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Last updated: {note.updatedAt.toLocaleDateString()}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Right Column: Note Viewer/Editor */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-md p-6 flex flex-col">
                {message && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                        <span>{message.text}</span>
                    </div>
                )}

                {!activeNote && !isEditing ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center">
                        <FiFileText size={64} className="mb-4 opacity-30" />
                        <p className="text-lg font-medium">Select a note or create a new one</p>
                        <p className="text-sm mt-1">Your notes will appear here.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Note title"
                                    className="flex-1 text-2xl font-bold text-gray-900 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                            ) : (
                                <h3 className="text-2xl font-bold text-gray-900">{activeNote?.title}</h3>
                            )}
                            <div className="flex space-x-2 ml-4">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                // Reset content/title if cancelling edit of existing note
                                                if (activeNote) {
                                                    setTitle(activeNote.title);
                                                    setContent(activeNote.content);
                                                } else { // If cancelling new note
                                                    setTitle('');
                                                    setContent('');
                                                }
                                                setMessage(null);
                                            }}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg flex items-center hover:bg-gray-50 transition-colors"
                                            disabled={saving}
                                        >
                                            <FiXCircle className="mr-2" /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveNote}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors"
                                            disabled={saving || !title.trim() || !content.trim()}
                                        >
                                            {saving ? (
                                                <LoadingSpinner size="sm" />
                                            ) : (
                                                <FiSave className="mr-2" />
                                            )}
                                            {activeNote ? 'Update' : 'Save'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg flex items-center hover:bg-blue-50 transition-colors"
                                        >
                                            <FiEdit className="mr-2" /> Edit
                                        </button>
                                        <button
                                            onClick={() => activeNote && handleDeleteNote(activeNote.id)}
                                            className="px-4 py-2 border border-red-600 text-red-600 rounded-lg flex items-center hover:bg-red-50 transition-colors"
                                            disabled={saving}
                                        >
                                            <FiTrash2 className="mr-2" /> Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {isEditing ? (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your note here (Markdown supported)"
                                className="flex-1 w-full text-gray-800 p-4 border border-gray-300 outline-none resize-none rounded-lg font-sans leading-relaxed focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                            />
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 prose max-w-none leading-relaxed">
                                <ReactMarkdown>{activeNote?.content || 'Select a note to view its content.'}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
