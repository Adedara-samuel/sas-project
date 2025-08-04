/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
    FiSend,
    FiMessageSquare,
    FiUser,
    FiCpu,
    FiUploadCloud,
    FiFileText,
    FiDownload,
    FiExternalLink,
    FiFile,
    FiPlus,
    FiTrash2,
    FiXCircle,
    FiFilePlus,
    FiMenu
} from 'react-icons/fi'
import { getAIResponse } from '@/lib/gemini'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { db, storage } from '@/lib/firebase'
import { collection, doc, setDoc, updateDoc, arrayUnion, Timestamp, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid';
import { useStore, ChatMessage, ChatSession } from '@/store/useStore';

interface ChatInterfaceProps {
    initialContext: string;
    placeholder: string;
    chatType: 'general' | 'course';
    courseId?: string;
    userDisplayName?: string | null;
    userRole?: string | null;
}

// Helper function to get icon based on file type
const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FiFile className="text-gray-500" />;
    if (mimeType.includes('pdf')) return <FiFile className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FiFileText className="text-blue-700" />;
    if (mimeType.includes('image')) return <FiFilePlus className="text-green-500" />;
    return <FiFileText className="text-gray-500" />;
};

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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // New state for sidebar visibility
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- Chat Session Management ---

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

            if (!currentSessionId || !fetchedSessions.some(s => s.id === currentSessionId)) {
                if (fetchedSessions.length > 0) {
                    setCurrentSessionId(fetchedSessions[0].id);
                } else {
                    handleNewChat(true);
                }
            }
        }, (error) => {
            console.error("Error fetching chat sessions:", error);
            setLoadingSessions(false);
        });

        return () => unsubscribe();
    }, [authChecked, user?.uid, courseId, currentSessionId]);

    useEffect(() => {
        if (!currentSessionId || !authChecked || !user?.uid) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);
        const sessionDocRef = doc(db, 'ai_chat_sessions', currentSessionId);

        const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data() as ChatSession;
                const loadedMessages: ChatMessage[] = sessionData.messages.map((msg: any) => ({
                    ...msg,
                    timestamp: msg.timestamp instanceof Timestamp ? msg.timestamp : Timestamp.fromDate(new Date(msg.timestamp.seconds * 1000))
                })).sort((a: ChatMessage, b: ChatMessage) => a.timestamp.toMillis() - b.timestamp.toMillis());
                setMessages(loadedMessages);
            } else {
                setMessages([]);
            }
            setLoadingMessages(false);
        }, (error) => {
            console.error("Error loading chat messages:", error);
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [currentSessionId, authChecked, user?.uid]);

    const updateChatSessionInFirestore = useCallback(async (newMessage: ChatMessage) => {
        if (!currentSessionId || !user?.uid) {
            console.error("No active session or user not authenticated to update chat.");
            return;
        }

        const sessionDocRef = doc(db, 'ai_chat_sessions', currentSessionId);
        try {
            await updateDoc(sessionDocRef, {
                messages: arrayUnion(newMessage),
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error("Error updating chat session in Firestore:", error);
        }
    }, [currentSessionId, user?.uid]);

    const handleNewChat = async (isAutoCreate = false) => {
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
            setSelectedFile(null);
            
            // On mobile, close the sidebar after creating a new chat
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
                await updateChatSessionInFirestore(greetingMessage);
            }

        } catch (error) {
            console.error("Error creating new chat session:", error);
        } finally {
            setIsLoading(false);
        }
    };

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
        if (!input.trim()) return;

        if (!currentSessionId) {
            console.error("No active chat session. Cannot send message.");
            return;
        }

        const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Timestamp.now() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            await updateChatSessionInFirestore(userMessage);

            let fullAIContext = initialContext;
            if (userDisplayName) {
                fullAIContext += ` You are speaking with ${userDisplayName}.`;
            }
            if (userRole) {
                fullAIContext += ` Their role is ${userRole}.`;
            }

            const response = await getAIResponse(userMessage.content, fullAIContext, messages);

            const assistantMessage: ChatMessage = { role: 'assistant', content: response, timestamp: Timestamp.now() };
            setMessages(prev => [...prev, assistantMessage]);
            await updateChatSessionInFirestore(assistantMessage);

        } catch (error) {
            console.error('Error getting AI response or saving chat:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again later.',
                timestamp: Timestamp.now(),
            };
            setMessages(prev => [...prev, errorMessage]);
            await updateChatSessionInFirestore(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadFile = async () => {
        if (!selectedFile || !user?.uid || !currentSessionId) {
            return;
        }

        setUploadingFile(true);
        try {
            const fileExtension = selectedFile.name.split('.').pop();
            const uniqueFileName = `${uuidv4()}.${fileExtension}`;
            const storageRef = ref(storage, `temp_chat_uploads/${user.uid}/${uniqueFileName}`);

            const snapshot = await uploadBytes(storageRef, selectedFile);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const fileMessage: ChatMessage = {
                role: 'file',
                content: `Uploaded: ${selectedFile.name}`,
                fileName: selectedFile.name,
                fileUrl: downloadURL,
                fileType: selectedFile.type,
                fileSize: selectedFile.size,
                timestamp: Timestamp.now(),
            };
            setMessages(prev => [...prev, fileMessage]);

            setSelectedFile(null);
        } catch (error) {
            console.error("Error uploading file in chat:", error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `Failed to upload file: ${selectedFile.name}. Please try again.`,
                timestamp: Timestamp.now(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setUploadingFile(false);
        }
    };

    const currentChatTitle = chatSessions.find(s => s.id === currentSessionId)?.title || (chatType === 'course' && currentCourse?.title ? `Chat for ${currentCourse.title}` : "General Chat");
    const currentChatSubtitle = chatType === 'course' && currentCourse?.code ? currentCourse.code : "Your smart companion for all things academic.";

    return (
        <div className="flex h-full bg-gray-50 rounded-2xl overflow-hidden relative">

            {/* Sidebar for Chat History (Responsive) */}
            <div className={`
                absolute inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0
                transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Chats</h2>
                    <button
                        onClick={() => handleNewChat()}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition-all duration-200"
                        title="Start New Chat"
                        disabled={isLoading || uploadingFile}
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
                                            setIsSidebarOpen(false); // Close sidebar on selection
                                        }}
                                        className={`w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between
                                            ${session.id === currentSessionId ? 'bg-blue-100 text-blue-800 font-semibold' : ''}`}
                                        disabled={isLoading || uploadingFile}
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
                                            disabled={isLoading || uploadingFile}
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
            <div className="flex-1 flex flex-col bg-white z-10">
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 sm:p-6 text-white shadow-md flex-shrink-0 flex items-center">
                    {/* Mobile-only toggle button for sidebar */}
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-3 md:hidden">
                        <FiMenu className="text-2xl" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center">
                            <FiMessageSquare className="mr-3 text-xl sm:text-3xl hidden sm:block" />
                            {currentChatTitle}
                        </h1>
                        <p className="text-sm opacity-90 mt-1 hidden sm:block">{currentChatSubtitle}</p>
                    </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
                    {loadingMessages ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center">
                            <LoadingSpinner />
                            <p className="mt-3">Loading messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
                            <FiMessageSquare size={64} className="mb-4 opacity-30" />
                            <p className="text-lg font-medium">Start a conversation with your AI assistant</p>
                            <p className="text-sm mt-1">{placeholder}</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role === 'file' ? (
                                    <div className="max-w-[80%] p-4 rounded-xl shadow-sm bg-blue-100 text-blue-800 flex items-center space-x-3">
                                        {getFileIcon(message.fileType)}
                                        <span className="font-medium truncate">{message.fileName}</span>
                                        <div className="flex space-x-2 flex-shrink-0">
                                            {message.fileUrl && (
                                                <>
                                                    <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="View File">
                                                        <FiExternalLink />
                                                    </a>
                                                    <a href={message.fileUrl} download={message.fileName} className="text-blue-600 hover:text-blue-800" title="Download File">
                                                        <FiDownload />
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`max-w-[80%] p-4 rounded-xl shadow-sm flex items-start space-x-3
                                            ${message.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                            }`}
                                    >
                                        {message.role === 'assistant' && <FiCpu className="text-xl mt-1 flex-shrink-0" />}
                                        <p className="text-base leading-relaxed break-words">{message.content}</p>
                                        {message.role === 'user' && <FiUser className="text-xl mt-1 flex-shrink-0" />}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-800 p-4 rounded-xl rounded-bl-none shadow-sm flex items-center space-x-2">
                                <LoadingSpinner size="sm" />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    )}
                    {uploadingFile && (
                        <div className="flex justify-start">
                            <div className="bg-blue-100 text-blue-800 p-4 rounded-xl rounded-bl-none shadow-sm flex items-center space-x-2">
                                <LoadingSpinner size="sm" />
                                <span>Uploading file...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 border-t border-gray-200 bg-white flex-shrink-0">
                    <div className="flex space-x-2 sm:space-x-3 items-center">
                        <label htmlFor="file-upload" className="cursor-pointer p-2 sm:p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors duration-200">
                            <FiUploadCloud className="text-xl sm:text-2xl" />
                            <input
                                id="file-upload"
                                type="file"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={isLoading || uploadingFile}
                                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                            />
                        </label>

                        {selectedFile && (
                            <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg text-gray-700 text-sm">
                                <span className="truncate max-w-[120px] sm:max-w-none">{selectedFile.name}</span>
                                <button onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700">
                                    <FiXCircle size={16} />
                                </button>
                            </div>
                        )}

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={placeholder}
                            className="flex-1 p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 transition-colors duration-200"
                            disabled={isLoading || uploadingFile}
                        />
                        <button
                            onClick={selectedFile ? handleUploadFile : handleSendMessage}
                            disabled={isLoading || uploadingFile || (!input.trim() && !selectedFile)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg flex items-center justify-center font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploadingFile || isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>
                                    <FiSend className="sm:mr-2" />
                                    <span className="hidden sm:block">Send</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}