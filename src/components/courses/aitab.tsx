'use client'

import { useStore } from '@/store/useStore'
import ChatInterface from '@/components/chat/chat-interface'

export default function AIPage() {
    const { user } = useStore()

    const initialContext = "You are an academic assistant designed to help students with general questions about their studies, academic life, and university resources. Provide helpful and concise answers.";
    const placeholder = "Ask me anything about academics...";
    // No title/subtitle props passed to ChatInterface as it now manages its own header title based on session.

    return (
        // The h-screen class here ensures the parent container takes full viewport height.
        // The ChatInterface itself will manage its internal flex layout.
        <div className="h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto h-full"> {/* Max width for content, full height */}
                <ChatInterface
                    initialContext={initialContext}
                    placeholder={placeholder}
                    chatType="general" // This is a general chat
                    userDisplayName={user?.name || user?.email || null}
                    userRole={user?.role || null}
                />
            </div>
        </div>
    )
}
