/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured');
    }

    // Extract public ID from URL
    const publicId = extractPublicId(url);
    console.log('Extracted Public ID:', publicId);

    // Since your PDFs are stored as "image" resource type, use that specifically
    const authenticatedUrl = `https://${apiKey}:${apiSecret}@res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
    
    console.log('Accessing URL:', authenticatedUrl.replace(`${apiKey}:${apiSecret}@`, '[CREDENTIALS]@'));

    const response = await axios.get(authenticatedUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'Accept': 'application/pdf, application/octet-stream, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-Viewer/1.0)'
      },
      validateStatus: (status) => status < 400
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const pdfBuffer = Buffer.from(response.data);
    console.log('PDF loaded successfully, size:', pdfBuffer.length, 'bytes');

    // Set proper PDF headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=document.pdf');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    return res.send(pdfBuffer);

  } catch (error: any) {
    console.error('Error loading PDF:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    const status = error.response?.status || 500;
    const message = error.response?.status === 401 
      ? 'Authentication failed - check Cloudinary credentials'
      : error.response?.status === 404
      ? 'PDF not found - check the URL and public ID'
      : 'Error loading PDF document';

    return res.status(status).json({ 
      error: 'Error loading document',
      message,
      details: error.message
    });
  }
}

function extractPublicId(url: string): string {
  try {
    // Parse the Cloudinary URL to extract public ID
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the 'upload' segment
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL - missing upload path');
    }
    
    // Get everything after 'upload', skipping version if present
    let publicIdParts = pathParts.slice(uploadIndex + 1);
    
    // Remove version number (starts with 'v' followed by digits)
    publicIdParts = publicIdParts.filter(part => !/^v\d+$/.test(part));
    
    // Join the parts and remove file extension if present
    let publicId = publicIdParts.join('/');
    
    // Remove .pdf extension if present
    publicId = publicId.replace(/\.pdf$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID from URL:', url);
    throw new Error('Failed to parse Cloudinary URL');
  }
}