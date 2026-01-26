// Vercel Serverless Function Entry Point
// This file exports the Express app for Vercel serverless deployment

import { createServer } from '../../server/dist/index.js';

// Cache the server instance
let server;

export default async function handler(req, res) {
  if (!server) {
    // Import and initialize the server on first request
    const { createServer } = await import('../../server/dist/index.js');
    server = await createServer();
  }

  return new Promise((resolve, reject) => {
    server(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// For Vercel to handle the Express app correctly
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
