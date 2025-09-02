/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
    FiSend,
    FiMessageSquare,
    FiPlus,
    FiTrash2,
    FiXCircle,
    FiMenu,
    FiImage,
    FiPaperclip
} from 'react-icons/fi'
import { getAIResponse } from '@/lib/gemini'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, updateDoc, Timestamp, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'
import { useStore, ChatMessage, ChatSession } from '@/store/useStore';

interface ChatInterfaceProps {
    initialContext: string;
    placeholder: string;
    chatType: 'general' | 'course';
    courseId?: string;
    userDisplayName?: string | null;
    userRole?: string | null;
}

const SUPPORTED_MIMES = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.oasis.opendocument.text' // ODT
];

export default function ChatInterface({
    initialContext,
    placeholder,
    chatType,
    courseId,
    userDisplayName,
    userRole
}: ChatInterfaceProps) {
    const { user, authChecked, currentCourse } = useStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileData, setFileData] = useState<string | null>(null);
    const [fileMimeType, setFileMimeType] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to the bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Memoized functions to prevent re-creation on every render
    const loadMessagesForSession = useCallback((sessionId: string) => {
        const session = chatSessions.find(s => s.id === sessionId);
        if (session) {
            setMessages(session.messages || []);
        } else {
            setMessages([]);
        }
    }, [chatSessions]);

    const updateChatSessionInFirestore = useCallback(async (newMessages: ChatMessage[]) => {
        if (!currentSessionId || !user?.uid) {
            console.error("No active session or user not authenticated to update chat.");
            return;
        }

        const sessionDocRef = doc(db, 'ai_chat_sessions', currentSessionId);
        try {
            await updateDoc(sessionDocRef, {
                messages: newMessages,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error("Error updating chat session in Firestore:", error);
        }
    }, [currentSessionId, user?.uid]);

    const handleNewChat = useCallback(async (isAutoCreate = false) => {
        if (!user?.uid) return;

        setIsLoading(true);
        try {
            const newSessionRef = doc(collection(db, 'ai_chat_sessions'));
            const newSessionId = newSessionRef.id;

            const sessionTitle = chatType === 'course' && currentCourse?.title
                ? `Chat for ${currentCourse.title}`
                : `General Chat ${new Date().toLocaleDateString()}`;

            const newSession: ChatSession = {
                id: newSessionId,
                userId: user.uid,
                courseId: courseId || null,
                title: sessionTitle,
                messages: [],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            await setDoc(newSessionRef, newSession);
            setCurrentSessionId(newSessionId);
            setMessages([]);
            setInput('');
            setFilePreview(null);
            setFileName(null);
            setFileData(null);
            setFileMimeType(null);

            if (isSidebarOpen) {
                setIsSidebarOpen(false);
            }

            if (!isAutoCreate) {
                const greetingMessage: ChatMessage = {
                    role: 'assistant',
                    content: chatType === 'course' && currentCourse?.title
                        ? `Hello! How can I help you with ${currentCourse.title} today?`
                        : "Hello! How can I assist you with your academic queries today?",
                    timestamp: Timestamp.now()
                };
                setMessages([greetingMessage]);
                await setDoc(newSessionRef, { ...newSession, messages: [greetingMessage] });
            }

        } catch (error) {
            console.error("Error creating new chat session:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.uid, chatType, currentCourse?.title, courseId, isSidebarOpen]);

    const handleDeleteSession = async (sessionId: string) => {
        if (!user?.uid || !sessionId) return;

        if (window.confirm("Are you sure you want to delete this chat session? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, 'ai_chat_sessions', sessionId));
                console.log("Chat session deleted:", sessionId);
            } catch (error) {
                console.error("Error deleting chat session:", error);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!user?.uid || (!input.trim() && !fileData)) {
            return;
        }

        if (!currentSessionId) {
            console.error("No active chat session. Cannot send message.");
            return;
        }

        // Ensure content is not empty if a file is uploaded
        const userMessageContent = input.trim() || `[File uploaded: ${fileName}]`;

        // Correctly create the ChatMessage object, ensuring no 'undefined' properties are included.
        const userMessage: ChatMessage = {
            role: 'user',
            content: userMessageContent,
            timestamp: Timestamp.now(),
            // Conditionally add file properties only if they exist
            ...(fileData && { fileData }),
            ...(fileMimeType && { fileMimeType }),
            ...(fileName && { fileName }),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setFilePreview(null);
        setFileName(null);
        setFileData(null);
        setFileMimeType(null);
        setIsLoading(true);

        try {
            let fullAIContext = initialContext;
            if (userDisplayName) {
                fullAIContext += ` You are speaking with ${userDisplayName}.`;
            }
            if (userRole) {
                fullAIContext += ` Their role is ${userRole}.`;
            }

            // Pass fileData and fileMimeType to the AI function
            const aiResponseContent = await getAIResponse(userMessageContent, fullAIContext, updatedMessages, fileData || undefined, fileMimeType || undefined);

            // Correctly create the assistant message
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: aiResponseContent,
                timestamp: Timestamp.now(),
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);
            // Save the updated array to Firestore
            await updateChatSessionInFirestore(finalMessages);

        } catch (error) {
            console.error('Error getting AI response or saving chat:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again later.',
                timestamp: Timestamp.now(),
            };
            const finalMessagesWithError = [...updatedMessages, errorMessage];
            setMessages(finalMessagesWithError);
            await updateChatSessionInFirestore(finalMessagesWithError);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!SUPPORTED_MIMES.includes(file.type)) {
                alert('File type not supported. Please upload an image, PDF, or DOCX file.');
                return;
            }

            setFileName(file.name);
            setFileMimeType(file.type);

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove the data URL prefix to get the pure Base64 string
                setFileData(base64String.split(',')[1]);

                // Set file preview for images and documents
                if (file.type.startsWith('image/')) {
                    setFilePreview(base64String);
                } else if (file.type === 'application/pdf') {
                    setFilePreview('/images/pdf-icon.png'); // Provide a local icon
                } else if (file.type.includes('wordprocessingml.document')) {
                    setFilePreview('/images/docx-icon.png'); // Provide a local icon
                } else {
                    setFilePreview(null); // No preview for other file types
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveFile = () => {
        setFilePreview(null);
        setFileName(null);
        setFileData(null);
        setFileMimeType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // The main useEffect for Firestore subscription
    useEffect(() => {
        if (!authChecked || !user?.uid) {
            setLoadingSessions(false);
            setChatSessions([]);
            setCurrentSessionId(null);
            return;
        }

        setLoadingSessions(true);
        const q = query(
            collection(db, 'ai_chat_sessions'),
            where('userId', '==', user.uid),
            where('courseId', '==', courseId || null)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSessions: ChatSession[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    userId: data.userId,
                    courseId: data.courseId || null,
                    title: data.title,
                    messages: data.messages || [],
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date()),
                    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.fromDate(new Date()),
                };
            }).sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());

            setChatSessions(fetchedSessions);
            setLoadingSessions(false);

            if (fetchedSessions.length > 0) {
                if (!currentSessionId || !fetchedSessions.some(s => s.id === currentSessionId)) {
                    setCurrentSessionId(fetchedSessions[0].id);
                }
            } else if (!currentSessionId) {
                handleNewChat(true);
            }
        }, (error) => {
            console.error("Error fetching chat sessions:", error);
            setLoadingSessions(false);
        });

        return () => unsubscribe();
    }, [authChecked, user?.uid, courseId, currentSessionId, handleNewChat]);

    // Use a separate useEffect to load messages when currentSessionId changes
    useEffect(() => {
        if (currentSessionId && chatSessions.length > 0) {
            loadMessagesForSession(currentSessionId);
        }
    }, [currentSessionId, chatSessions, loadMessagesForSession]);


    const currentChatTitle = chatSessions.find(s => s.id === currentSessionId)?.title ||
        (chatType === 'course' && currentCourse?.title ? `Chat for ${currentCourse.title}` : "General Chat");
    const currentChatSubtitle = chatType === 'course' && currentCourse?.code ? currentCourse.code : "Your smart companion for all things academic.";

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <FiImage size={24} className="text-gray-600" />;
        if (mimeType === 'application/pdf') return <FiPaperclip size={24} className="text-red-500" />;
        if (mimeType.includes('wordprocessingml.document')) return <FiPaperclip size={24} className="text-blue-500" />;
        return <FiPaperclip size={24} className="text-gray-600" />;
    };

    return (
        <div className="flex w-full h-screen overflow-hidden bg-gray-50 relative">

            {/* Sidebar for Chat History (Responsive) */}
            <div className={`
                fixed top-0 left-0 bottom-0 z-20 w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0
                transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 md:w-64 h-full mt-15
            `}>
                {/* Sidebar Header: This should be fixed at the top */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Chats</h2>
                    <button
                        onClick={() => handleNewChat()}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition-all duration-200"
                        title="Start New Chat"
                        disabled={isLoading}
                    >
                        <FiPlus className="text-lg" />
                    </button>
                    {/* Close button for mobile sidebar */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1 md:hidden"
                        aria-label="Close chat history"
                    >
                        <FiXCircle className="text-gray-500 text-2xl" />
                    </button>
                </div>

                {/* Chat Session List: This should be the only scrolling part */}
                <div className="flex-1 overflow-y-auto py-2">
                    {loadingSessions ? (
                        <div className="flex justify-center items-center h-full text-gray-500">
                            <LoadingSpinner size="sm" />
                            <span className="ml-2 text-sm">Loading chats...</span>
                        </div>
                    ) : chatSessions.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm p-4">
                            No chats yet. Click '+' to start one.
                        </div>
                    ) : (
                        <ul>
                            {chatSessions.map(session => (
                                <li key={session.id} className="relative">
                                    <button
                                        onClick={() => {
                                            setCurrentSessionId(session.id);
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between
                                        ${session.id === currentSessionId ? 'bg-blue-100 text-blue-800 font-semibold' : ''}`}
                                        disabled={isLoading}
                                    >
                                        <span className="truncate pr-8">{session.title}</span>
                                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                            {session.updatedAt.toDate().toLocaleDateString()}
                                        </span>
                                    </button>
                                    {session.id === currentSessionId && (
                                        <button
                                            onClick={() => handleDeleteSession(session.id)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 p-1 rounded-full bg-white bg-opacity-70"
                                            title="Delete Chat"
                                            disabled={isLoading}
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative bg-gray-50 ">
                {/* Chat Header */}
                <div className="flex-shrink-0 md:mt-10 bg-white p-4 sm:p-6 border-b border-gray-100 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-3 md:hidden">
                        <FiMenu className="text-2xl text-gray-700" />
                    </button>
                    <div className="flex items-center flex-1">
                        <FiMessageSquare className="text-2xl text-blue-600 mr-3 hidden sm:block" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{currentChatTitle}</h1>
                            <p className="text-sm text-gray-500">{currentChatSubtitle}</p>
                        </div>
                    </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {messages.length === 0 && !isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                            <FiMessageSquare size={80} className="mb-4" />
                            <p className="text-lg font-medium">Start a conversation with your AI assistant</p>
                            <p className="text-sm mt-1">{placeholder}</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] p-3 rounded-2xl shadow-sm text-base leading-relaxed
                                        ${message.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-lg'
                                            : 'bg-gray-200 text-gray-800 rounded-bl-lg'
                                        }`}
                                >
                                    {message.fileMimeType && message.fileData && (
                                        <div className="mb-2 p-2 bg-gray-300 rounded-lg flex items-center space-x-2">
                                            {getFileIcon(message.fileMimeType)}
                                            <span className="text-sm font-medium text-gray-700">{message.fileName}</span>
                                        </div>
                                    )}
                                    <p>{message.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 text-gray-800 p-3 rounded-2xl rounded-bl-lg shadow-sm flex items-center space-x-2">
                                <LoadingSpinner size="sm" />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 flex-shrink-0 bg-white border-t border-gray-100">
                    {filePreview && (
                        <div className="relative mb-4 p-2 bg-gray-100 rounded-lg flex items-center space-x-4">
                            {fileMimeType?.startsWith('image/') ? (
                                <img src={filePreview} alt="Preview" className="max-h-32 rounded-md" />
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <FiPaperclip size={24} className="text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">{fileName}</span>
                                </div>
                            )}
                            <button
                                onClick={handleRemoveFile}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                                title="Remove file"
                            >
                                <FiXCircle size={16} />
                            </button>
                        </div>
                    )}
                    <div className="relative flex items-center bg-gray-100 rounded-full pl-6 pr-2 py-2 shadow-sm">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 mr-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                            title="Upload a file"
                        >
                            <FiPaperclip size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept={SUPPORTED_MIMES.join(',')}
                            disabled={isLoading}
                        />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={placeholder}
                            className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-500 pr-10"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || (!input.trim() && !fileData)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <FiSend size={20} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}