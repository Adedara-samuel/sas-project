'use client'

import { useState, useEffect } from 'react'
import { useStore, Note } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Link from 'next/link'

export default function RecentNotes() {
    const { user, authChecked, courses } = useStore()
    const [recentNotes, setRecentNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authChecked || !user?.uid) {
            setLoading(false);
            setRecentNotes([]);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, 'notes'),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc') // This sorts by the most recently updated notes first
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotes: Note[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    courseId: data.courseId || '',
                    title: data.title,
                    content: data.content,
                    userId: data.userId,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                };
            });
            setRecentNotes(fetchedNotes.slice(0, 5)); // This takes only the top 5 notes from the sorted list
            setLoading(false);
        }, (error) => {
            console.error("Error fetching recent notes:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authChecked, user?.uid, courses]);

    const getCourseTitle = (courseId: string) => {
        if (!courseId) return 'General';
        const course = courses.find(c => c.id === courseId);
        return course ? course.title : 'Unknown Course';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow p-6 flex justify-center items-center min-h-[150px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Recent Notes</h2>
            {recentNotes.length === 0 ? (
                <div className="text-center text-gray-600 py-4">
                    <p className="mb-2">No recent notes found.</p>
                    <Link href="/notes/new" className="text-blue-600 hover:underline">
                        Create your first note!
                    </Link>
                </div>
            ) : (
                <ul className="space-y-4">
                    {recentNotes.map(note => (
                        <li key={note.id} className="border-l-4 border-amber-500 pl-3 py-1">
                            <Link href={`/notes/${note.id}`} className="block">
                                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{note.title}</p>
                                <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                                    {note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Course: <span className="font-medium">{getCourseTitle(note.courseId)}</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Updated: {note.updatedAt.toLocaleDateString()}
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}