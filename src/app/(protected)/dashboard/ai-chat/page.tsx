// src/app/(protected)/dashboard/ai-chat/page.tsx
'use client';

import { useStore } from '@/store/useStore';
import LoadingSpinner from '@/components/ui/loading-spinner';
import ChatInterface from '@/components/chat/chat-interface';

export default function AIPage() {
    // Get the user and course data from your global store
    const { user, authChecked, currentCourse } = useStore();

    // Explicitly define the type for chatType here
    const chatType: 'general' | 'course' = currentCourse ? 'course' : 'general';

    // The props for your ChatInterface component
    const chatProps = {
        initialContext: `You are an academic assistant. Your goal is to provide helpful, concise, and accurate answers to students.`,
        placeholder: 'Ask a question about your course or studies...',
        chatType: chatType,
        courseId: currentCourse?.id,
        userDisplayName: user?.displayName,
        userRole: 'student', // Or get this from your user object
    };

    // Show a loading spinner while the auth status is being checked
    if (!authChecked) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <ChatInterface {...chatProps} />
    );
}