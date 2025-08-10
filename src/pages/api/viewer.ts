import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { createHash } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).send('URL parameter is required');
  }

  try {
    // Fetch the PDF from Cloudinary with authentication
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf',
      },
      // Add authentication if needed
      auth: {
        username: process.env.CLOUDINARY_API_KEY || '',
        password: process.env.CLOUDINARY_API_SECRET || ''
      }
    });

    // Set the appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=document.pdf');
    
    // Send the PDF data
    return res.send(response.data);
  } catch (error: unknown) {
    console.error('Error fetching PDF:', error);
    
    // If we get a 401, try with signed URL
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' &&
        'status' in error.response && error.response.status === 401) {
      try {
        // Create a signed URL using your Cloudinary credentials
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        
        if (!cloudName || !apiKey || !apiSecret) {
          throw new Error('Missing Cloudinary configuration');
        }

        // Extract the public ID from the URL
        const publicId = url.split('/').slice(-2).join('/').split('.')[0];
        // const signature = crypto
        //   .createHash('sha1')
        //   .update(`public_id=${publicId}&timestamp=${Math.floor(Date.now()/1000)}${apiSecret}`)
        //   .digest('hex');
        const signature = createHash('sha1')
          .update(`public_id=${publicId}&timestamp=${Math.floor(Date.now()/1000)}${apiSecret}`)
          .digest('hex');

        const signedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/fl_attachment/v1/${publicId}.pdf?api_key=${apiKey}&timestamp=${Math.floor(Date.now()/1000)}&signature=${signature}`;

        const signedResponse = await axios.get(signedUrl, {
          responseType: 'arraybuffer'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=document.pdf');
        return res.send(signedResponse.data);
      } catch (signedError) {
        console.error('Error with signed URL:', signedError);
        return res.status(500).send('Error loading document: Authentication failed');
      }
    }
    
    return res.status(500).send('Error loading document');
  }
}