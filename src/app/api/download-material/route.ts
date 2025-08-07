/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    let fileUrl = searchParams.get('url');
    const fileName = searchParams.get('name') || 'download.pdf';
    const fileType = searchParams.get('type') || 'application/pdf';

    if (!fileUrl) {
        return NextResponse.json({ error: 'Missing file URL' }, { status: 400 });
    }

    // 👇 Auto-fix for PDFs mistakenly using `/image/upload/`
    if (fileType === 'application/pdf' && fileUrl.includes('/image/upload/')) {
        fileUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
    }

    try {
        const response = await axios.get(fileUrl, {
            responseType: 'stream',
        });

        const headers = new Headers({
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Type': fileType,
        });

        return new Response(response.data, { headers });
    } catch (error: any) {
        console.error('Error downloading file from Cloudinary:', error);
        return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }
}
