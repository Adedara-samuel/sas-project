// components/chat/ai-chat-wrapper.tsx
'use client'; // This component is a client component

import { useStore } from '@/store/useStore';
import ChatInterface from './chat-interface'; // Assuming chat-interface.tsx is in the same directory

/**
 * AIChatWrapper is a client component that fetches user data
 * and provides initial context/placeholders to the ChatInterface.
 * This separation helps avoid type conflicts with Next.js page props.
 */
export default function AIChatWrapper() {
    const { user } = useStore();

    // Define initial context and placeholder for the AI chat
    const initialContext = "You are an academic assistant designed to help students with general questions about their studies, academic life, and university resources. Provide helpful and concise answers.";
    const placeholder = "Ask me anything about academics...";

    return (
        <div className="h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="max-w-7xl mx-auto h-full overflow-hidden">
                <ChatInterface
                    initialContext={initialContext}
                    placeholder={placeholder}
                    chatType="general" // Set chat type to general for this page
                    userDisplayName={user?.name || user?.email || null} // Pass user display name
                    userRole={user?.role || null} // Pass user role
                />
            </div>
        </div>
    );
}
