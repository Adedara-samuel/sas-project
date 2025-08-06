// app/(protected)/dashboard/ai-chat/page.tsx
// This page component is now a server component by default (no 'use client')
// as it only renders a client component.
import AIChatWrapper from '@/components/chat/ai-chat-wrapper';

/**
 * AIPage is a Next.js App Router page component.
 * It acts as a wrapper for the client-side AIChatWrapper to ensure
 * proper hydration and type handling by Next.js.
 */
export default function AIPage() {
    return <AIChatWrapper />;
}
