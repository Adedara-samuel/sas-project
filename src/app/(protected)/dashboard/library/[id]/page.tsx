/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { FiArrowLeft, FiBook, FiUser, FiCalendar, FiClock } from 'react-icons/fi'
import Link from 'next/link'

export default function BookDetailPage() {
    const { id } = useParams()
    const { user } = useStore()
    const [book, setBook] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [borrowing, setBorrowing] = useState(false)

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const bookDoc = await getDoc(doc(db, 'books', id as string))
                if (bookDoc.exists()) {
                    setBook({
                        id: bookDoc.id,
                        ...bookDoc.data(),
                        createdAt: bookDoc.data().createdAt?.toDate()
                    })
                }
            } catch (error) {
                console.error('Error fetching book:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchBook()
    }, [id])

    const handleBorrow = async () => {
        if (!user || !book) return

        setBorrowing(true)
        try {
            // Implement borrow logic here
            // This would typically create a borrowing record in Firestore
            // and decrement the availableCopies count
            alert(`You have borrowed "${book.title}"`)
        } catch (error) {
            console.error('Error borrowing book:', error)
        } finally {
            setBorrowing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (!book) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">Book not found</h3>
                <Link href="/dashboard/library" className="mt-4 inline-block text-blue-600 hover:underline">
                    Back to library
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-6">
                <Link href="/dashboard/library" className="flex items-center text-blue-600 hover:underline">
                    <FiArrowLeft className="mr-1" />
                    Back to library
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="md:flex">
                    <div className="md:w-1/3 p-6">
                        <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full rounded-lg shadow"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/default-book-cover.jpg'
                            }}
                        />
                    </div>

                    <div className="md:w-2/3 p-6">
                        <h1 className="text-2xl font-bold text-gray-900  mb-2">{book.title}</h1>
                        <p className="text-gray-600  mb-4">by {book.author}</p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {book.category && (
                                <span className="px-2 py-1 bg-blue-50  text-blue-600  text-xs rounded-full">
                                    {book.category}
                                </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-full ${book.availableCopies > 0
                                    ? 'bg-green-50 text-green-600 '
                                    : 'bg-amber-50 text-amber-600 '
                                }`}>
                                {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Checked out'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="flex items-center text-sm text-gray-600 ">
                                <FiBook className="mr-2" />
                                <span>ISBN: {book.isbn || 'Not specified'}</span>
                            </div>

                            <div className="flex items-center text-sm text-gray-600 ">
                                <FiCalendar className="mr-2" />
                                <span>Published: {book.publishedYear || 'Unknown'}</span>
                            </div>

                            <div className="flex items-center text-sm text-gray-600 ">
                                <FiUser className="mr-2" />
                                <span>Author: {book.author}</span>
                            </div>

                            <div className="flex items-center text-sm text-gray-600 ">
                                <FiClock className="mr-2" />
                                <span>Added: {new Date(book.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                            <p className="text-gray-600 ">
                                {book.description || 'No description available.'}
                            </p>
                        </div>

                        <button
                            onClick={handleBorrow}
                            disabled={book.availableCopies <= 0 || borrowing}
                            className={`px-4 py-2 rounded-lg ${book.availableCopies > 0
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {borrowing ? 'Processing...' :
                                book.availableCopies > 0 ? 'Borrow Book' : 'Not Available'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}