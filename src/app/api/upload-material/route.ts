// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { NextResponse } from 'next/server';
// // import { v2 as cloudinary } from 'cloudinary';
// import { Buffer } from 'buffer';
// import cloudinary from 'cloudinary';

// // Configure Cloudinary with your environment variables
// cloudinary.v2.config({
//     cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// export async function POST(req: Request) {
//     let formData: FormData | null = null;
//     let fileName = 'unknown';

//     try {
//         formData = await req.formData();
//         const file = formData.get('file');

//         if (!file || typeof file === 'string') {
//             return NextResponse.json(
//                 { error: 'No file uploaded or invalid file.', fileName },
//                 { status: 400 }
//             );
//         }

//         fileName = file.name || fileName;
//         const arrayBuffer = await file.arrayBuffer();
//         const buffer = Buffer.from(arrayBuffer);

//         // Determine upload settings based on file type
//         const isPdf = fileName.toLowerCase().endsWith('.pdf');

//         const uploadOptions: any = {
//             folder: 'course-materials',
//             resource_type: isPdf ? 'raw' : 'auto', // PDFs = raw, others auto
//         };

//         if (isPdf) {
//             uploadOptions.access_mode = 'public';
//             uploadOptions.type = 'upload';
//         }

//         // Upload to Cloudinary
//         const uploadResult = await new Promise((resolve, reject) => {
//             const uploadStream = cloudinary.v2.uploader.upload_stream(
//                 uploadOptions,
//                 (error, result) => {
//                     if (error) {
//                         return reject(error);
//                     }
//                     resolve(result);
//                 }
//             );
//             uploadStream.end(buffer);
//         });

//         const { secure_url, resource_type, bytes, format } = uploadResult as any;

//         const result = {
//             secure_url,
//             resource_type,
//             bytes,
//             format,
//             file_name: fileName,
//         };

//         return NextResponse.json(result, { status: 200 });
//     } catch (error) {
//         const errorMessage =
//             error instanceof Error
//                 ? error.message
//                 : 'Internal server error. Check server logs for more details.';
//         console.error(
//             'Unhandled error in /api/upload-material route:',
//             error,
//             'File:',
//             fileName
//         );
//         return NextResponse.json(
//             {
//                 error: errorMessage,
//                 file_name: fileName,
//             },
//             { status: 500 }
//         );
//     }
// }


// // export function getSignedPdfUrl(publicId: string) {
// //     return cloudinary.v2.utils.sign_url(publicId, {
// //       type: 'authenticated',
// //       resource_type: 'raw',
// //       expires_at: Math.floor(Date.now() / 1000) + 300 // 5 mins expiry
// //     });
// //   }


import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';

export async function POST(req: Request) {
    let formData: FormData | null = null;
    let fileName = 'unknown';

    try {
        formData = await req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json(
                { error: 'No file uploaded or invalid file.', fileName },
                { status: 400 }
            );
        }

        fileName = file.name || fileName;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const formDataUpload = new FormData();
        formDataUpload.append('file', new Blob([buffer], { type: file.type || '' }), fileName);
        formDataUpload.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUBLIC_KEY || '36b2aa3a71b52e3e6d10');
        formDataUpload.append('UPLOADCARE_STORE', '1');

        const response = await fetch('https://upload.uploadcare.com/base/', {
            method: 'POST',
            body: formDataUpload,
        });

        if (!response.ok) {
            throw new Error(`Uploadcare API error: ${response.statusText} `);
        }

        const data = await response.json();
        const fileId = data.file;
        const secureUrl = `https://ucarecdn.com/${fileId}/`;

        console.log(`Uploaded file to Uploadcare: ${secureUrl}, File: ${fileName}`);

        const result = {
            secure_url: secureUrl,
            resource_type: 'raw',
            bytes: buffer.length,
            format: fileName.split('.').pop() || 'unknown',
            file_name: fileName,
        };

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error. Check server logs.';
        console.error('Unhandled error in /api/upload-material:', error, 'File:', fileName);
        return NextResponse.json({ error: errorMessage, file_name: fileName }, { status: 500 });
    }
}