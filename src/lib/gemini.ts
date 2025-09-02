// src/lib/gemini.ts

import { ChatMessage } from '@/store/useStore';

interface GeminiChatMessage {
    role: 'user' | 'model';
    parts: {
        text?: string;
        inline_data?: {
            mime_type: string;
            data: string;
        };
    }[];
}

/**
 * Sends a prompt and an optional file to the Gemini API.
 * @param userPrompt The user's current message.
 * @param context Additional context for the AI.
 * @param history Array of previous messages.
 * @param fileData Optional: Base64 string of the file data.
 * @param fileMimeType Optional: MIME type of the file (e.g., 'image/jpeg', 'application/pdf').
 * @returns The AI's generated text response.
 */
export async function getAIResponse(userPrompt: string, context: string, history: ChatMessage[] = [], fileData?: string, fileMimeType?: string): Promise<string> {
    const apiKey = "AIzaSyBPwTHb2ux_V2o9twLgnhjhwJKroucdGOk";

    if (!apiKey) {
        console.error("Gemini API Key is missing. Please ensure it is correctly configured.");
        throw new Error("Gemini API Key is not configured.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const formattedHistory: GeminiChatMessage[] = history
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

    const userMessageParts: { text?: string; inline_data?: { mime_type: string; data: string; } }[] = [];
    if (fileData && fileMimeType) {
        userMessageParts.push({
            inline_data: {
                mime_type: fileMimeType,
                data: fileData
            }
        });
    }

    userMessageParts.push({ text: `${context}\n\n${userPrompt}` });

    const payload = {
        contents: [...formattedHistory, { role: "user", parts: userMessageParts }],
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