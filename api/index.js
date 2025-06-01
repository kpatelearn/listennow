// === EXPRESS SPOTIFY OAUTH HANDLER FOR VERCEL ===
const express = require('express');
const fetch = require('node-fetch');
const app = express();
require('dotenv').config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI || 'https://yourdomain.com/callback';
const track_id = '41a4u7k1qElUrR5T2toecE';
const artist_id = '3uIsve9Dn2WsIYgE3C7I86'; // Maddy's artist ID

// 1. Redirect user to Spotify auth
app.get('/login', (req, res) => {
  const scope = 'user-library-modify user-follow-modify';
  const auth_url = `https://accounts.spotify.com/authorize?` +
    `client_id=${client_id}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}`;
  res.redirect(auth_url);
});

// 2. Handle callback and exchange code for token
app.get('/callback', async (req, res) => {
  const code = req.query.code;

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri
    })
  });

  const tokenData = await tokenRes.json();
  const access_token = tokenData.access_token;

  if (!access_token) {
    return res.status(400).send('Spotify token failed');
  }

  // 3. Follow artist and save track
  await Promise.all([
    fetch(`https://api.spotify.com/v1/me/following?type=artist`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + access_token },
      body: JSON.stringify({ ids: [artist_id] })
    }),
    fetch(`https://api.spotify.com/v1/me/tracks?ids=${track_id}`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + access_token }
    })
  ]);

  // 4. Redirect to Spotify song page
  res.redirect(`https://open.spotify.com/track/${track_id}`);
});

module.exports = app;
