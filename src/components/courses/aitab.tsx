'use client'

import { useStore } from '@/store/useStore'
import ChatInterface from '@/components/chat/chat-interface'

export default function AIPage() {
    const { user } = useStore()

    // Context for the AI assistant
    const initialContext = "You are an academic assistant designed to help students with general questions about their studies, academic life, and university resources. Provide helpful and concise answers.";
    const placeholder = "Ask me anything about academics...";

    return (
        <div className="flex flex-col h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="flex-grow w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <ChatInterface
                    initialContext={initialContext}
                    placeholder={placeholder}
                    chatType="general"
                    userDisplayName={user?.name || user?.email || null}
                    userRole={user?.role || null}
                />
            </div>
        </div>
    )
}