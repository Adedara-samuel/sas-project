/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        // Verify API key is loaded
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is missing');
        }

        const { prompt, context, conversationHistory } = await req.json();

        const messages = [
            {
                role: "system" as const,
                content: context || "You are a helpful academic assistant."
            },
            ...conversationHistory.map((msg: { role: string; content: any; }) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content
            })),
            { role: "user" as const, content: prompt }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages,
            temperature: 0.7,
        });

        return NextResponse.json({
            response: completion.choices[0]?.message?.content || "No response"
        });

    } catch (err: any) {
        console.error('Full error:', err);
        return NextResponse.json(
            {
                error: "AI service unavailable",
                details: err.message
            },
            { status: 500 }
        );
    }
}