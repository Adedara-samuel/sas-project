// src/store/useStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Timestamp } from 'firebase/firestore';
import { User } from '../types/user';

// Course interface remains the same
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

// Book interface remains the same
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

// Note interface remains the same
export interface Note {
    id: string
    courseId: string
    title: string
    content: string
    createdAt: Date
    updatedAt: Date
    userId: string
}

// Schedule interface remains the same
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
    schedules: Schedule[]
    currentCourse: Course | null
    authChecked: boolean
    darkMode: boolean
    language: 'en' | 'fr' | 'es'

    // Actions
    setUser: (user: User | null) => void
    setCourses: (courses: Course[]) => void
    setBooks: (books: Book[]) => void
    setNotes: (notes: Note[]) => void
    setSchedules: (schedules: Schedule[]) => void
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
            schedules: [],
            currentCourse: null,
            authChecked: false,
            darkMode: false,
            language: 'en',

            setUser: (user) => set({ user }),
            setCourses: (courses) => set({ courses }),
            setBooks: (books) => set({ books }),
            setNotes: (notes) => set({ notes }),
            setSchedules: (schedules) => set({ schedules }),
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
