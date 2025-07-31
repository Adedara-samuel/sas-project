// src/store/useStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Timestamp } from 'firebase/firestore';

export interface User {
    id: string; // This should always be the Firebase UID
    uid: string; // Firebase UID (redundant but kept for clarity if needed elsewhere)
    email: string | null;
    name: string | null; // This will be the editable name, potentially stored in Firestore
    displayName: string | null; // This will reflect Firebase Auth's displayName
    role: 'admin' | 'student'; // Role must be 'admin' or 'student'
    photoURL: string | null; // photoURL can be null
    metadata: {
        creationTime: string | undefined;
        lastSignInTime: string | undefined;
    };
}
export interface Course {
    id: string
    title: string
    code: string
    units: number
    lecturer: string
    description?: string
    userId?: string
    createdAt: Date
    materials?: {
        name: string;
        url: string;
        type?: string;
        size?: number;
    }[];
}

export interface Book {
    id: string
    title: string
    author: string
    isbn?: string
    coverUrl: string
    description?: string
    publishedYear?: number
    category?: string
    availableCopies: number
    createdAt: Date
}

export interface Note {
    id: string
    courseId: string
    title: string
    content: string
    createdAt: Date
    updatedAt: Date
    userId: string
}

export interface Schedule {
    id: string
    courseId: string
    userId: string // Ensure userId is present for security rules
    title: string; // New: Title for the schedule item (e.g., "Lecture on Calculus", "Homework 1")
    type: 'Class' | 'Assignment' | 'Exam' | 'Other'; // New: Type of schedule item
    day: string // e.g., "Monday", "Tuesday"
    startTime: string // e.g., "09:00"
    endTime: string // e.g., "10:30"
    location: string // e.g., "Room 201", "Online"
    recurring: boolean
    createdAt: Date
    updatedAt?: Date // Optional: for tracking last update
}

// Updated Message interface for chat history
export interface ChatMessage {
    role: 'user' | 'assistant' | 'file'; // Added 'file' role for temporary file messages
    content: string; // For text messages
    fileName?: string; // For file messages
    fileUrl?: string; // For file messages
    fileType?: string; // For file messages
    fileSize?: number; // For file messages
    timestamp: Timestamp; // To order messages
}

// New interface for a chat session document
export interface ChatSession {
    id: string; // Document ID
    userId: string;
    courseId?: string | null; // Null for general chat
    title: string; // Display title for the sidebar
    messages: ChatMessage[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}


interface StoreState {
    user: User | null
    courses: Course[]
    books: Book[]
    notes: Note[]
    schedules: Schedule[] // Ensure schedules are managed by Zustand
    currentCourse: Course | null
    authChecked: boolean
    darkMode: boolean
    language: 'en' | 'fr' | 'es'

    // Actions
    setUser: (user: User | null) => void
    setCourses: (courses: Course[]) => void
    setBooks: (books: Book[]) => void
    setNotes: (notes: Note[]) => void
    setSchedules: (schedules: Schedule[]) => void // Action to set schedules
    setCurrentCourse: (course: Course | null) => void
    setAuthChecked: (checked: boolean) => void
    toggleDarkMode: () => void
    setLanguage: (language: 'en' | 'fr' | 'es') => void
}

export const useStore = create<StoreState>()(
    persist(
        (set) => ({
            user: null,
            courses: [],
            books: [],
            notes: [],
            schedules: [], // Initialize schedules
            currentCourse: null,
            authChecked: false,
            darkMode: false,
            language: 'en',

            setUser: (user) => set({ user }),
            setCourses: (courses) => set({ courses }),
            setBooks: (books) => set({ books }),
            setNotes: (notes) => set({ notes }),
            setSchedules: (schedules) => set({ schedules }), // Implement setSchedules
            setCurrentCourse: (course) => set({ currentCourse: course }),
            setAuthChecked: (checked) => set({ authChecked: checked }),
            toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
            setLanguage: (language) => set({ language })
        }),
        {
            name: 'academic-store',
            partialize: (state) => ({
                darkMode: state.darkMode,
                language: state.language
            })
        }
    )
)
