// === VERCEL CALLBACK HANDLER FOR SPOTIFY OAUTH ===
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
  const redirect_uri = process.env.REDIRECT_URI || 'https://listennow-six.vercel.app/api/callback';
  const track_id = '41a4u7k1qElUrR5T2toecE';
  const artist_id = '3uIsve9Dn2WsIYgE3C7I86'; // Maddy's artist ID

  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  if (!client_id || !client_secret) {
    return res.status(500).json({ error: 'Missing Spotify credentials' });
  }

  try {
    // Exchange code for token
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
      console.error('Token response:', tokenData);
      return res.status(400).json({ error: 'Failed to get access token', details: tokenData });
    }

    // Follow artist and save track with proper error handling
    try {
      // Follow artist - try with JSON body instead of query params
      const followRes = await fetch('https://api.spotify.com/v1/me/following?type=artist', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer ' + access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: [artist_id]
        })
      });
      
      if (!followRes.ok) {
        const followError = await followRes.text();
        console.error('Follow artist failed:', followRes.status, followError);
      } else {
        console.log('Successfully followed artist');
      }

      // Save track - also try with JSON body
      const saveRes = await fetch('https://api.spotify.com/v1/me/tracks', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer ' + access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: [track_id]
        })
      });
      
      if (!saveRes.ok) {
        const saveError = await saveRes.text();
        console.error('Save track failed:', saveRes.status, saveError);
      } else {
        console.log('Successfully saved track');
      }

    } catch (apiError) {
      console.error('API calls failed:', apiError);
    }

    // Redirect to Spotify song page
    res.redirect(`https://open.spotify.com/track/${track_id}`);

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
