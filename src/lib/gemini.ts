// src/lib/gemini.ts

import { ChatMessage } from '@/store/useStore'; // Import ChatMessage interface

// Gemini API expects 'model' role for assistant messages
interface GeminiChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

/**
 * Sends a prompt to the Gemini 2.0 Flash model and returns the AI's response.
 * @param userPrompt The user's current message.
 * @param context Additional context for the AI (e.g., user role, course info).
 * @param history Optional: Array of previous messages for conversational context.
 * @returns The AI's generated text response.
 */
export async function getAIResponse(userPrompt: string, context: string, history: ChatMessage[] = []): Promise<string> {
    const apiKey = "AIzaSyBPwTHb2ux_V2o9twLgnhjhwJKroucdGOk";

    if (!apiKey) {
        console.error("Gemini API Key is missing. Please ensure it is correctly configured.");
        throw new Error("Gemini API Key is not configured.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Prepare chat history for Gemini API, filtering out 'file' messages
    const formattedHistory: GeminiChatMessage[] = history
        .filter(msg => msg.role !== 'file') // Filter out file messages from history sent to AI
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }] // FIX: Use msg.content here
        }));

    // Add initial context as a system-like message or part of the user's current prompt.
    // This ensures that the AI always has the base context for every turn.
    const fullCurrentPrompt = `${context}\n\n${userPrompt}`;

    const payload = {
        contents: [...formattedHistory, { role: "user", parts: [{ text: fullCurrentPrompt }] }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Gemini API Error Response:', errorBody);
            throw new Error(`Gemini API request failed with status ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            return text;
        } else {
            console.warn('Gemini API: Unexpected response structure or no content.', result);
            return 'No response from AI. Please try again.';
        }
    } catch (error: unknown) {
        console.error('Error calling Gemini API:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to get AI response: ${error.message}`);
        }
        throw new Error('An unknown error occurred while contacting the AI.');
    }
}
