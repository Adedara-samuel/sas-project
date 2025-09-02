'use client'

import { FiClock, FiFileText } from 'react-icons/fi'

interface BookCardProps {
    book: {
        id: string
        title: string
        author: string
        coverUrl: string
        description?: string
        publishedYear?: number
        category?: string
        availableCopies: number
        createdAt: Date
    }
}

export default function BookCard({ book }: BookCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col border border-gray-200">
            <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center p-4 text-center">
                {/* Always display icon and title, no matter what */}
                <div className="flex flex-col items-center justify-center text-gray-500">
                    <FiFileText size={48} className="mb-2" />
                    <span className="text-sm font-medium line-clamp-2 px-2">{book.title}</span>
                </div>
            </div>

            <div className="p-4 flex-grow">
                <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{book.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{book.author}</p>

                {book.publishedYear && (
                    <p className="text-xs text-gray-500 mb-3">
                        Published: {book.publishedYear}
                    </p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                    {book.category && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                            {book.category}
                        </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${book.availableCopies > 0
                            ? 'bg-green-50 text-green-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                        {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Checked out'}
                    </span>
                </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="flex items-center text-xs text-gray-500">
                    <FiClock className="mr-1" size={12} />
                    <span>Added {new Date(book.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    )
}