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

    // First, let's verify we have a valid access token and can access the user's profile
    console.log('Access token received:', access_token ? 'YES' : 'NO');
    console.log('Token length:', access_token ? access_token.length : 0);

    try {
      // Test access token with user profile
      const userProfileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': 'Bearer ' + access_token }
      });
      
      if (!userProfileRes.ok) {
        const userError = await userProfileRes.text();
        console.error('User profile check failed:', userProfileRes.status, userError);
        return res.status(500).json({ error: 'Invalid access token' });
      }
      
      const userProfile = await userProfileRes.json();
      console.log('User profile:', {
        id: userProfile.id,
        display_name: userProfile.display_name,
        country: userProfile.country,
        product: userProfile.product
      });

      // Now try to follow artist
      console.log('Attempting to follow artist:', artist_id);
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
      
      console.log('Follow response status:', followRes.status);
      if (!followRes.ok) {
        const followError = await followRes.text();
        console.error('Follow artist failed:', followRes.status, followError);
      } else {
        console.log('Successfully followed artist');
        
        // Verify the follow worked
        const checkFollowRes = await fetch(`https://api.spotify.com/v1/me/following/contains?type=artist&ids=${artist_id}`, {
          headers: { 'Authorization': 'Bearer ' + access_token }
        });
        const isFollowing = await checkFollowRes.json();
        console.log('Following verification:', isFollowing);
      }

      // Now try to save track
      console.log('Attempting to save track:', track_id);
      const saveRes = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${track_id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer ' + access_token
        }
      });
      
      console.log('Save response status:', saveRes.status);
      if (!saveRes.ok) {
        const saveError = await saveRes.text();
        console.error('Save track failed:', saveRes.status, saveError);
        
        // Check if track exists and is available
        const trackInfoRes = await fetch(`https://api.spotify.com/v1/tracks/${track_id}`, {
          headers: { 'Authorization': 'Bearer ' + access_token }
        });
        
        if (trackInfoRes.ok) {
          const trackInfo = await trackInfoRes.json();
          console.log('Track info:', {
            name: trackInfo.name,
            artists: trackInfo.artists?.map(a => a.name),
            available_markets: trackInfo.available_markets?.slice(0, 5) || 'none',
            total_markets: trackInfo.available_markets?.length || 0,
            is_playable: trackInfo.is_playable,
            user_country: userProfile.country
          });
        } else {
          console.error('Could not fetch track info:', trackInfoRes.status);
        }
      } else {
        console.log('Successfully saved track');
        
        // Verify the save worked
        const checkSaveRes = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${track_id}`, {
          headers: { 'Authorization': 'Bearer ' + access_token }
        });
        const isSaved = await checkSaveRes.json();
        console.log('Save verification:', isSaved);
      }

      // Follow Maddy's playlist
const playlist_id = '5mykZdkyXIJNrmULYGk4x0';
const followPlaylistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/followers`, {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer ' + access_token }
});
console.log('Follow playlist status:', followPlaylistRes.status);


    } catch (apiError) {
      console.error('API calls failed:', apiError);
    }

    // Redirect to Spotify song page
    res.redirect(`/play.html?type=playlist&id=5mykZdkyXIJNrmULYGk4x0`);

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
