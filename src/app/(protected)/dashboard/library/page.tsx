'use client'

import { useState, useEffect } from 'react'
import { Book, Course, useStore } from '@/store/useStore'
import { db, storage } from '@/lib/firebase'
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import BookCard from '@/components/books/book-card'
import { FiPlus, FiSearch, FiUpload, FiTrash2, FiEdit } from 'react-icons/fi'
import Link from 'next/link'

// A generic resource type to combine books and course materials
interface Resource {
    id: string;
    title: string;
    description?: string;
    type: 'book' | 'material';
    source: string;
    coverUrl: string;
    addedBy?: string;
    createdAt: Date;
}

export default function LibraryPage() {
    const { user, books, setBooks, courses, setCourses } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [allResources, setAllResources] = useState<Resource[]>([]);
    const [newBook, setNewBook] = useState({
        title: '',
        author: '',
        isbn: '',
        description: '',
        publishedYear: '',
        category: '',
        availableCopies: '1',
        coverFile: null as File | null
    });

    useEffect(() => {
        // --- BOOKS SUBSCRIPTION ---
        const booksQuery = query(collection(db, 'books'));
        const unsubscribeBooks = onSnapshot(booksQuery, (snapshot) => {
            const booksData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt || new Date(),
                } as Book;
            });
            setBooks(booksData);
        });

        // --- COURSES SUBSCRIPTION ---
        const coursesQuery = query(collection(db, 'courses'));
        const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => {
                const data = doc.data() as Course;
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate()
                        : data.createdAt || new Date(),
                } as Course;
            });
            setCourses(coursesData);
        });

        return () => {
            unsubscribeBooks();
            unsubscribeCourses();
        };
    }, [setBooks, setCourses]);

    useEffect(() => {
        if (!user) {
            setAllResources([]);
            return;
        }

        const combinedResources: Resource[] = [];
        const uniqueIds = new Set<string>();

        books.forEach(book => {
            if (book.addedBy === user.id && !uniqueIds.has(book.id)) {
                combinedResources.push({
                    id: book.id,
                    title: book.title,
                    description: book.description,
                    type: 'book',
                    source: book.author,
                    coverUrl: book.coverUrl,
                    addedBy: book.addedBy,
                    createdAt: book.createdAt,
                });
                uniqueIds.add(book.id);
            }
        });

        courses.forEach(course => {
            if (course.userId === user.id && course.materials) {
                course.materials.forEach(material => {
                    const materialId = `${course.id}-${material.name}-${material.url}`;
                    if (!uniqueIds.has(materialId)) {
                        combinedResources.push({
                            id: materialId,
                            title: material.name,
                            description: `Material for ${course.title} (${course.code})`,
                            type: 'material',
                            source: course.title,
                            coverUrl: material.url, // Use the direct URL here
                            addedBy: course.userId,
                            createdAt: new Date(),
                        });
                        uniqueIds.add(materialId);
                    }
                });
            }
        });

        combinedResources.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setAllResources(combinedResources);

    }, [books, courses, user]);

    const handleAddBook = async () => {
        if (!user || !newBook.coverFile) return;

        setUploading(true);
        try {
            const coverRef = ref(storage, `book-covers/${Date.now()}-${newBook.coverFile.name}`);
            await uploadBytes(coverRef, newBook.coverFile);
            const coverUrl = await getDownloadURL(coverRef);

            const bookData = {
                title: newBook.title,
                author: newBook.author,
                isbn: newBook.isbn,
                description: newBook.description,
                publishedYear: parseInt(newBook.publishedYear) || new Date().getFullYear(),
                category: newBook.category,
                availableCopies: parseInt(newBook.availableCopies) || 1,
                coverUrl,
                createdAt: new Date(),
                addedBy: user.id
            };

            const newBookRef = doc(collection(db, 'books'));
            await setDoc(newBookRef, bookData);

            setNewBook({
                title: '',
                author: '',
                isbn: '',
                description: '',
                publishedYear: '',
                category: '',
                availableCopies: '1',
                coverFile: null
            });
            setIsAdding(false);
        } catch (error) {
            console.error('Error adding book:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteBook = async (bookId: string, coverUrl: string) => {
        if (!window.confirm('Are you sure you want to delete this book?')) return;

        try {
            const coverRef = ref(storage, coverUrl);
            await deleteObject(coverRef);
            await deleteDoc(doc(db, 'books', bookId));
        } catch (error) {
            console.error('Error deleting book:', error);
        }
    };

    const filteredResources = allResources.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.source.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mx-auto px-15 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 ">Library</h1>

                {user?.role === 'admin' && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                        <FiPlus className="mr-2" />
                        Add Book
                    </button>
                )}
            </div>

            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search resources by title or source..."
                    className="block text-gray-700 w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isAdding && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Add New Book</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    className="w-full text-gray-700 p-2 border rounded"
                                    value={newBook.title}
                                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                                <input
                                    type="text"
                                    className="w-full text-gray-700 p-2 border rounded"
                                    value={newBook.author}
                                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                                <input
                                    type="text"
                                    className="w-full text-gray-700 p-2 border rounded"
                                    value={newBook.isbn}
                                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700  mb-1">Published Year</label>
                                <input
                                    type="number"
                                    className="w-full text-gray-700 p-2 border rounded"
                                    value={newBook.publishedYear}
                                    onChange={(e) => setNewBook({ ...newBook, publishedYear: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    className="w-full text-gray-700 p-2 border rounded"
                                    value={newBook.category}
                                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Available Copies *</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-2 border rounded"
                                    value={newBook.availableCopies}
                                    onChange={(e) => setNewBook({ ...newBook, availableCopies: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image *</label>
                                <label className="w-full flex flex-col items-center px-4 py-6 bg-white text-blue-500 rounded-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-50 ">
                                    <FiUpload className="text-2xl mb-2" />
                                    <span className="text-sm">
                                        {newBook.coverFile ? newBook.coverFile.name : 'Select cover image'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => e.target.files && setNewBook({ ...newBook, coverFile: e.target.files[0] })}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700  mb-1">Description</label>
                        <textarea
                            className="w-full p-2 border rounded min-h-[100px]"
                            value={newBook.description}
                            onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 border rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddBook}
                            disabled={!newBook.title || !newBook.author || !newBook.coverFile || uploading}
                            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
                        >
                            {uploading ? 'Uploading...' : 'Add Book'}
                        </button>
                    </div>
                </div>
            )}
            {filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredResources.map(resource => (
                        <div key={resource.id} className="relative">
                            {/* Conditional Link or Anchor tag */}
                            {resource.type === 'book' ? (
                                <Link href={`/dashboard/library/${resource.id}`}>
                                    <BookCard
                                        book={{
                                            ...resource,
                                            author: resource.source,
                                            availableCopies: 1, // Placeholder
                                            createdAt: resource.createdAt,
                                            coverUrl: resource.coverUrl,
                                        }}
                                    />
                                </Link>
                            ) : (
                                <a href={resource.coverUrl} target="_blank" rel="noopener noreferrer">
                                    <BookCard
                                        book={{
                                            ...resource,
                                            author: resource.source,
                                            availableCopies: 1, // Placeholder
                                            createdAt: resource.createdAt,
                                            coverUrl: resource.coverUrl,
                                        }}
                                    />
                                </a>
                            )}
                            {user?.role === 'admin' && resource.type === 'book' && (
                                <div className="absolute top-2 right-2 flex space-x-2">
                                    <button className="bg-white p-1.5 rounded-full shadow hover:bg-gray-100">
                                        <FiEdit className="text-blue-600" size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBook(resource.id, resource.coverUrl)}
                                        className="bg-white p-1.5 rounded-full shadow hover:bg-gray-100"
                                    >
                                        <FiTrash2 className="text-red-600" size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <FiSearch className="mx-auto mb-4 text-gray-400" size={48} width={2.78} />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No resources found</h3>
                    <p className="mt-1 text-gray-500">
                        {searchTerm ? 'Try a different search term' : 'The library is currently empty'}
                    </p>
                </div>
            )}
        </div>
    );
}
