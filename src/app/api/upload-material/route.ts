import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with your credentials from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Perform the upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'course-materials', // Your desired folder
                    resource_type: 'auto', // Cloudinary auto-detects resource type (image, video, raw)
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload stream error:', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            ).end(buffer);
        });

        const cloudinaryResult = result as {
            secure_url: string;
            resource_type: string;
            format: string; // Cloudinary's detected format (e.g., 'pdf', 'docx', 'png')
            public_id: string; // The public ID of the uploaded asset
            bytes: number;
            version: number; // Cloudinary asset version
        };

        let viewUrl = cloudinaryResult.secure_url; // Default view URL is the original secure URL

        // Logic to generate a specific view URL for documents (e.g., convert to PDF for viewing)
        // Cloudinary can convert many document types to PDF for in-browser viewing.
        const documentFormats = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt']; // Add more as needed

        if (cloudinaryResult.resource_type === 'raw' && documentFormats.includes(cloudinaryResult.format)) {
            // Construct a URL to deliver the raw document as a PDF
            // Example: https://res.cloudinary.com/<cloud_name>/image/upload/f_pdf/v<version>/<public_id>.<extension>
            // We use 'image' type with f_pdf transformation for document viewing
            viewUrl = cloudinary.url(cloudinaryResult.public_id, {
                resource_type: 'image', // Use 'image' resource type for document transformations
                format: 'pdf', // Force format to PDF
                version: cloudinaryResult.version, // Include version for cache invalidation
                secure: true, // Ensure HTTPS
            });
            console.log(`Generated PDF view URL for document: ${viewUrl}`);
        } else if (cloudinaryResult.resource_type === 'image' || cloudinaryResult.format === 'pdf') {
            // For actual images and PDFs, the secure_url is already good for viewing
            viewUrl = cloudinaryResult.secure_url;
        }
        // For other resource types (e.g., video), you might need different view URLs/players.
        // For now, we'll stick to the secure_url for anything not explicitly handled.


        return NextResponse.json({
            secure_url: cloudinaryResult.secure_url,
            view_url: viewUrl, // Return the generated view URL
            resource_type: cloudinaryResult.resource_type,
            bytes: cloudinaryResult.bytes,
            format: cloudinaryResult.format, // Pass format back for frontend use if needed
        }, { status: 200 });

    } catch (error) {
        console.error('Unhandled error in /api/upload-material route:', error);
        return NextResponse.json({ error: 'Internal server error. Check server logs for more details.' }, { status: 500 });
    }
}
