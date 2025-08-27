'use client'

import { useState, useEffect } from 'react'
import { useStore, Note } from '@/store/useStore'
import { FiPlus, FiSearch, FiBookOpen } from 'react-icons/fi'
import Link from 'next/link'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/ui/loading-spinner';
import parse from 'html-react-parser'; // Import the parser

export default function NotesPage() {
    const { notes, setNotes, authChecked, user, courses } = useStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authChecked || !user?.uid) {
            setLoading(false);
            setNotes([]); // Clear notes if user logs out
            return;
        }

        setLoading(true);
        // Query notes created by the current user, ordered by creation date
        const q = query(
            collection(db, 'notes'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
        // note userId courseId
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotes: Note[] = snapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title,
                content: doc.data().content,
                courseId: doc.data().courseId,
                userId: doc.data().userId,
                // Handle Firebase Timestamp conversion
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
                updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(),
            }));
            setNotes(fetchedNotes);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notes:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setNotes, authChecked, user?.uid]);

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Helper to get course title from courseId
    const getCourseTitle = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        return course ? course.title : 'General'; // Use a default 'General'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header with responsive spacing and layout */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
                    <h1 className="text-3xl font-extrabold text-gray-900">My Notes</h1>
                    <Link
                        href="/notes/new"
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center font-semibold shadow-md transition-all duration-200"
                    >
                        <FiPlus className="mr-2 text-lg" />
                        New Note
                    </Link>
                </div>

                {/* Search input with improved mobile focus and padding */}
                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400 text-lg" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search notes by title or content..."
                        className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-colors duration-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Grid for note cards with responsive breakpoints */}
                {filteredNotes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredNotes.map(note => (
                            <Link
                                key={note.id}
                                href={`/notes/${note.id}`}
                                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 block transform hover:-translate-y-1"
                            >
                                <div className="p-6">
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{note.title}</h3>
                                    {/* Fix: Use a div with `prose` class and `html-react-parser` */}
                                    <div className="prose text-gray-600 text-sm mb-4">
                                        {parse(note.content)}
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-4">
                                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                        {note.courseId && (
                                            <span className="flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                                <FiBookOpen className="mr-1 text-sm" />
                                                {getCourseTitle(note.courseId)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-md">
                        <div className="inline-block p-4 bg-gray-100 rounded-full mb-6">
                            <FiBookOpen className="text-5xl text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-xl font-medium text-gray-900">
                            {searchTerm ? 'No matching notes found' : 'No notes created yet'}
                        </h3>
                        <p className="mt-2 text-gray-500">
                            {searchTerm
                                ? 'Try refining your search terms.'
                                : 'Click the "New Note" button to get started.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}