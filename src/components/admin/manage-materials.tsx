/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { db, storage } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { FiTrash2, FiDownload } from 'react-icons/fi'

export default function ManageMaterials() {
    const { currentCourse } = useStore()
    const [materials, setMaterials] = useState<any[]>([])

    useEffect(() => {
        if (!currentCourse) return

        const q = query(collection(db, 'resources'), where('courseId', '==', currentCourse.id))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const materialsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setMaterials(materialsData)
        })

        return () => unsubscribe()
    }, [currentCourse])

    const handleDeleteMaterial = async (materialId: string, filePath: string) => {
        if (!window.confirm('Are you sure you want to delete this material?')) return

        try {
            // Delete file from storage
            const fileRef = ref(storage, filePath)
            await deleteObject(fileRef)

            // Delete record from firestore
            await deleteDoc(doc(db, 'resources', materialId))
        } catch (error) {
            console.error('Error deleting material:', error)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Course Materials</h2>

            {currentCourse ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Size</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Uploaded</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {materials.map((material) => (
                                <tr key={material.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{material.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{material.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {(material.size / 1024).toFixed(2)} KB
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {new Date(material.createdAt?.toDate()).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a
                                            href={material.url}
                                            download
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            <FiDownload />
                                        </a>
                                        <button
                                            onClick={() => handleDeleteMaterial(material.id, material.url)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500">Select a course to view its materials</p>
                </div>
            )}
        </div>
    )
}