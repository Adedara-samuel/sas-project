// src/app/api/upload-material/route.ts
import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

// Your .env.local file should have these keys:
// CLOUDINARY_CLOUD_NAME="your_cloud_name"
// CLOUDINARY_API_KEY="your_api_key"
// CLOUDINARY_API_SECRET="your_api_secret"

// Configure Cloudinary with your credentials
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
    let fileName = 'unknown';

    try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            console.error('Missing Cloudinary API keys');
            return NextResponse.json(
                { error: 'Server configuration error: Missing Cloudinary API keys.' },
                { status: 500 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string' || !(file instanceof File)) {
            return NextResponse.json(
                { error: 'No file uploaded or invalid file format.' },
                { status: 400 }
            );
        }

        fileName = file.name || fileName;
        console.log(`Backend: Received file for upload: ${fileName}`);

        // Convert the File to a Buffer for upload to Cloudinary
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload the file to Cloudinary
        const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
                { resource_type: 'auto' },
                (error, res) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(res as cloudinary.UploadApiResponse);
                    }
                }
            );
            uploadStream.end(buffer);
        });

        const finalResult = {
            secure_url: result.secure_url,
            resource_type: result.resource_type,
            bytes: result.bytes,
            format: result.format,
            file_name: result.original_filename || fileName,
        };

        console.log('Backend: Upload successful:', finalResult);
        return NextResponse.json(finalResult, { status: 200 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error. Check server logs.';
        console.error('Backend: Unhandled error in /api/upload-material:', error, 'File:', fileName);
        return NextResponse.json(
            { error: `Upload failed: ${errorMessage}`, file_name: fileName },
            { status: 500 }
        );
    }
}
