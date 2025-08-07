/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { Buffer } from 'buffer';

// Configure Cloudinary with your environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
    let formData: FormData | null = null;
    let fileName = 'unknown';

    try {
        formData = await req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file uploaded or invalid file.', fileName }, { status: 400 });
        }

        fileName = file.name || fileName;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({
                folder: 'course-materials', // Specify a folder for organization
                resource_type: 'auto', // Automatically detect file type
            }, (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            });
            uploadStream.end(buffer);
        });

        // The uploadResult from Cloudinary has all the necessary info
        // We'll destructure it to match the expected format on the frontend
        const { secure_url, resource_type, bytes, format } = uploadResult as any;

        const result = {
            secure_url,
            resource_type,
            bytes,
            format,
            file_name: fileName,
        };

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error. Check server logs for more details.';
        console.error('Unhandled error in /api/upload-material route:', error, 'File:', fileName);
        return NextResponse.json({
            error: errorMessage,
            file_name: fileName
        }, { status: 500 });
    }
}
