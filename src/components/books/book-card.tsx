/* eslint-disable @next/next/no-img-element */
'use client'

import Link from 'next/link'
import { FiClock } from 'react-icons/fi'

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
        <Link href={`/dashboard/library/${book.id}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col border border-gray-200 dark:border-gray-700">
                <div className="h-48 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/default-book-cover.jpg'
                        }}
                    />
                </div>

                <div className="p-4 flex-grow">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2">{book.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{book.author}</p>

                    {book.publishedYear && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Published: {book.publishedYear}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                        {book.category && (
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                                {book.category}
                            </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${book.availableCopies > 0
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            }`}>
                            {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Checked out'}
                        </span>
                    </div>
                </div>

                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <FiClock className="mr-1" size={12} />
                        <span>Added {new Date(book.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </Link>
    )
}