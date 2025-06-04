// === UPDATED VERCEL SERVERLESS FUNCTION FOR SPOTIFY OAUTH ===
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  if (!client_id || !client_secret) {
    return res.status(500).json({ error: 'Missing Spotify credentials' });
  }

  // Updated scope to include playlist permissions
  const scope = 'user-library-modify user-follow-modify playlist-modify-public playlist-modify-private';
  
  const auth_url = `https://accounts.spotify.com/authorize?` +
    `client_id=${client_id}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&show_dialog=true`; // Forces re-authorization for testing

  console.log('Redirecting to Spotify auth with:', {
    client_id: client_id.substring(0, 8) + '...',
    redirect_uri,
    scope
  });
  
  res.redirect(auth_url);
}