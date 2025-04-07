import { v2 as cloudinary } from 'cloudinary';
// server.js (Express.js example)
const express = require('express');
const cloudinary = require('cloudinary').v2;
const app = express();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'drpqytgbz',
  api_key: '192131978987885',
  api_secret: 'sVrFGRBv8yVVfpz5T9HUeVx2Kqs',
  secure: true,
});

// Generate a signed upload URL (more secure)
app.post('/api/get-signature', (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request({
    timestamp: timestamp,
    folder: 'profile_pictures',
  }, 'YOUR_API_SECRET');

  res.json({
    signature,
    timestamp,
    cloudName: 'drpqytgbz',
    apiKey: '192131978987885'
  });
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});


export default cloudinary;
