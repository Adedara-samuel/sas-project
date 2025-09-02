/* eslint-disable react-hooks/exhaustive-deps */
// NotesTab.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect } from 'react'
import { useStore, Note } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, Timestamp, orderBy, setDoc } from 'firebase/firestore'
import { FiPlus, FiEdit, FiTrash2, FiXCircle, FiFileText, FiCheckCircle, FiMoreHorizontal, FiVolume2, FiStopCircle } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { FaRegCheckSquare, FaCamera, FaPencilAlt } from 'react-icons/fa';
import { HiOutlineDotsCircleHorizontal } from "react-icons/hi";
import useDebounce from '@/hooks/useDebounce';
import parse from 'html-react-parser';

export default function NotesTab() {
    const { user, currentCourse, authChecked } = useStore()
    const [notes, setNotes] = useState<Note[]>([])
    const [activeNote, setActiveNote] = useState<Note | null>(null)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isUserStopping, setIsUserStopping] = useState(false); // New state to track user's stop action

    const [localTitle, setLocalTitle] = useState('');
    const [localContent, setLocalContent] = useState('');
    const debouncedTitle = useDebounce(localTitle, 500);
    const debouncedContent = useDebounce(localContent, 500);

    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: localContent,
        onUpdate: ({ editor }) => {
            setLocalContent(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none w-full h-full'
            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        setTitle(debouncedTitle);
    }, [debouncedTitle]);

    useEffect(() => {
        if (editor) {
            setContent(debouncedContent);
        }
    }, [debouncedContent, editor]);

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

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

            if (activeNote && !fetchedNotes.some(n => n.id === activeNote.id)) {
                setActiveNote(null);
                setIsEditing(false);
            }
            if (!activeNote && fetchedNotes.length > 0 && !isEditing) {
                setActiveNote(fetchedNotes[0]);
            }
            if (activeNote) {
                const currentActive = fetchedNotes.find(n => n.id === activeNote.id);
                if (currentActive && (currentActive.title !== title || currentActive.content !== content)) {
                    if (!isEditing) {
                        setLocalTitle(currentActive.title);
                        setLocalContent(currentActive.content);
                    }
                }
            }
        }, (error) => {
            console.error("Error fetching notes:", error);
            setMessage({ text: 'Failed to load notes.', type: 'error' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authChecked, user?.uid, currentCourse?.id, activeNote, isEditing]);

    useEffect(() => {
        if (!isEditing) {
            if (activeNote) {
                setLocalTitle(activeNote.title);
                setLocalContent(activeNote.content);
            } else {
                setLocalTitle('');
                setLocalContent('');
            }
        }
    }, [activeNote, isEditing]);

    const handleSaveNote = async () => {
        if (!user?.uid || !currentCourse?.id) {
            setMessage({ text: 'Authentication or course data missing. Cannot save note.', type: 'error' });
            return;
        }
        if (!editor?.getText()?.trim()) {
            setMessage({ text: 'Note content is required.', type: 'error' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const finalTitle = localTitle.trim() || 'Untitled';

            const noteData = {
                title: finalTitle,
                content: editor?.getHTML() || '',
                courseId: currentCourse.id,
                userId: user.uid,
                updatedAt: Timestamp.now()
            };

            if (activeNote && isEditing) {
                await updateDoc(doc(db, 'notes', activeNote.id), noteData);
                setMessage({ text: 'Note updated successfully!', type: 'success' });
            } else {
                const newNoteRef = doc(collection(db, 'notes'));
                await setDoc(newNoteRef, { ...noteData, createdAt: Timestamp.now() });
                setMessage({ text: 'Note created successfully!', type: 'success' });
                setActiveNote({
                    id: newNoteRef.id,
                    ...noteData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as Note);
            }
            setIsEditing(false);
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
            setSaving(true);
            setMessage(null);
            try {
                await deleteDoc(doc(db, 'notes', noteId));
                setMessage({ text: 'Note deleted successfully!', type: 'success' });
                setActiveNote(null);
                setIsEditing(false);
            } catch (error: any) {
                console.error('Error deleting note:', error);
                setMessage({ text: `Failed to delete note: ${error.message || 'Unknown error'}`, type: 'error' });
            } finally {
                setSaving(false);
            }
        }
    };

    const handleNewNoteClick = () => {
        setActiveNote(null);
        setLocalTitle('');
        setLocalContent('');
        setIsEditing(true);
        setMessage(null);
    };

    const handleTextToSpeech = () => {
        if (!window.speechSynthesis) {
            setMessage({ text: "Your browser doesn't support Text-to-Speech.", type: 'error' });
            return;
        }

        if (!activeNote) {
            setMessage({ text: 'No note selected to read.', type: 'error' });
            return;
        }
        
        setMessage(null); // Clear any previous messages

        // If already speaking, stop the speech
        if (window.speechSynthesis.speaking) {
            setIsUserStopping(true); // Mark as a user-initiated stop
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setMessage({ text: 'Speech stopped.', type: 'success' }); // Provide a stop message
            return;
        }

        // Clean the HTML content to get plain text
        const parser = new DOMParser();
        const doc = parser.parseFromString(activeNote.content, 'text/html');
        const cleanText = doc.body.textContent || "";

        if (!cleanText.trim()) {
            setMessage({ text: 'Note has no readable content.', type: 'error' });
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);

        utterance.onend = () => {
            setIsSpeaking(false);
            setIsUserStopping(false); // Reset the stop flag
            setMessage(null); // Clear the message when speech ends naturally
        };

        utterance.onerror = (event) => {
            if (!isUserStopping) { // Only show error if it wasn't a user-initiated stop
                console.error('SpeechSynthesis Utterance Error:', event.error);
                setMessage({ text: 'Text-to-Speech failed. Please try again.', type: 'error' });
            }
            setIsSpeaking(false);
            setIsUserStopping(false);
        };

        // Start the speech
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    if (!currentCourse) {
        return (
            <div className="flex justify-center items-center p-8 text-gray-500 min-h-[500px]">
                <p>Please select a course to view its notes.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8 min-h-[500px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full">
            {/* Left Column: Note List */}
            <div className="md:w-1/3 bg-white rounded-xl shadow-lg flex flex-col max-h-[calc(100vh-200px)] overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-semibold text-gray-800">Your Notes</h3>
                    <button
                        onClick={handleNewNoteClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition-all duration-200"
                        title="Create New Note"
                        disabled={saving}
                    >
                        <FiPlus className="text-lg" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {notes.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm p-6">
                            No notes yet for this course. Click the '+' button to create one.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {notes.map(note => (
                                <li
                                    key={note.id}
                                    onClick={() => {
                                        setActiveNote(note);
                                        setIsEditing(false);
                                        setMessage(null);
                                    }}
                                    className={`p-4 cursor-pointer transition-colors duration-200 border-l-4
                                        ${activeNote?.id === note.id
                                            ? 'bg-blue-50 border-blue-600 text-blue-800 font-semibold'
                                            : 'hover:bg-gray-100 border-transparent text-gray-700'
                                        }`}
                                >
                                    <h4 className="text-lg font-medium truncate">{note.title}</h4>
                                    <div className="prose text-sm mt-1 text-gray-500 max-h-12 overflow-hidden">
                                        {parse(note.content || '...')}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Right Column: Note Viewer/Editor */}
            <div className="md:w-2/3 bg-white flex flex-col h-fit min-h-[500px]">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
                    <div className="flex-1 text-center font-bold text-gray-800">
                        {isEditing ? (
                            <input
                                type="text"
                                value={localTitle}
                                onChange={(e) => setLocalTitle(e.target.value)}
                                placeholder="Note title"
                                className="w-full text-center text-lg font-bold placeholder-gray-400 focus:outline-none"
                            />
                        ) : (
                            <h3 className="text-2xl font-bold text-gray-900">{activeNote?.title || 'No Note Selected'}</h3>
                        )}
                    </div>
                    <div className="text-gray-500 flex items-center space-x-4">
                        {/* Text-to-Speech Button */}
                        {activeNote && !isEditing && (
                            <button
                                onClick={handleTextToSpeech}
                                className="p-2 border border-purple-600 text-purple-600 rounded-full flex items-center hover:bg-purple-50 transition-colors"
                                title={isSpeaking ? 'Stop Reading' : 'Read Note'}
                            >
                                {isSpeaking ? <FiStopCircle className="text-lg" /> : <FiVolume2 className="text-lg" />}
                            </button>
                        )}
                        {isEditing ? (
                            <button
                                onClick={handleSaveNote}
                                disabled={!editor?.getText()?.trim() || saving}
                                className="p-2 bg-blue-600 text-white rounded-full flex items-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={activeNote ? 'Update' : 'Save'}
                            >
                                <svg className={`h-5 w-5 ${saving ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    {saving ? <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> : <path className="opacity-75" fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path>}
                                </svg>
                            </button>
                        ) : (
                            <>
                                {activeNote && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 border border-blue-600 text-blue-600 rounded-full flex items-center hover:bg-blue-50 transition-colors"
                                        title="Edit"
                                    >
                                        <FiEdit className="text-lg" />
                                    </button>
                                )}
                                {activeNote && (
                                    <button
                                        onClick={() => activeNote && handleDeleteNote(activeNote.id)}
                                        className="p-2 border border-red-600 text-red-600 rounded-full flex items-center hover:bg-red-50 transition-colors"
                                        disabled={saving}
                                        title="Delete"
                                    >
                                        <FiTrash2 className="text-lg" />
                                    </button>
                                )}
                            </>
                        )}
                        <HiOutlineDotsCircleHorizontal className="text-xl cursor-pointer" />
                    </div>
                </div>

                {/* Main Content Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {message.type === 'success' ? <FiCheckCircle className="flex-shrink-0" /> : <FiXCircle className="flex-shrink-0" />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    {!activeNote && !isEditing ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
                            <FiFileText size={80} className="mb-4" />
                            <p className="text-xl font-medium">Select a note or create a new one</p>
                            <p className="text-sm mt-2">Your notes will appear here.</p>
                        </div>
                    ) : (
                        <>
                            {isEditing ? (
                                <EditorContent editor={editor} className="h-full text-gray-700" />
                            ) : (
                                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: activeNote?.content || '' }} />
                            )}
                        </>
                    )}
                </div>

                {/* Bottom Toolbar */}
                {/* <div className="flex-shrink-0 flex items-center justify-around text-gray-500 p-4 bg-white border-t border-gray-200">
                    <FaRegCheckSquare className="text-xl cursor-pointer" />
                    <FaCamera className="text-xl cursor-pointer" />
                    <FiMoreHorizontal className="text-xl cursor-pointer" />
                    <FaPencilAlt className="text-xl cursor-pointer" />
                </div> */}
            </div>
        </div>
    );
}