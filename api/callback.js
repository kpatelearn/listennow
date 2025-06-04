// === IMPROVED VERCEL CALLBACK HANDLER FOR SPOTIFY OAUTH ===
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('=== CALLBACK HANDLER START ===');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  // Log environment variable status
  console.log('Environment variables check:', {
    client_id_set: !!client_id,
    client_secret_set: !!client_secret,
    redirect_uri_set: !!redirect_uri,
    redirect_uri_value: redirect_uri
  });

  const track_id = '41a4u7k1qElUrR5T2toecE';
  const artist_id = '3uIsve9Dn2WsIYgE3C7I86';
  const playlist_id = '5mykZdkyXIJNrmULYGk4x0';

  const code = req.query.code;
  const error = req.query.error;

  // Check for authorization errors first
  if (error) {
    console.error('Authorization error from Spotify:', error);
    return res.status(400).json({ 
      error: 'Authorization failed', 
      spotify_error: error,
      description: req.query.error_description 
    });
  }

  if (!code) {
    console.error('No authorization code received');
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  if (!client_id || !client_secret || !redirect_uri) {
    console.error('Missing environment variables:', {
      client_id: !!client_id,
      client_secret: !!client_secret,
      redirect_uri: !!redirect_uri
    });
    return res.status(500).json({ error: 'Missing Spotify credentials' });
  }

  try {
    console.log('Attempting token exchange with code:', code.substring(0, 10) + '...');
    
    // Exchange code for token
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri
    });

    console.log('Token request body:', tokenRequestBody.toString());
    console.log('Using redirect_uri:', redirect_uri);

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      },
      body: tokenRequestBody
    });

    console.log('Token response status:', tokenRes.status);
    
    const tokenData = await tokenRes.json();
    console.log('Token response data:', {
      access_token_received: !!tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      expires_in: tokenData.expires_in,
      error: tokenData.error,
      error_description: tokenData.error_description
    });

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return res.status(400).json({ 
        error: 'Failed to get access token', 
        details: tokenData,
        status: tokenRes.status
      });
    }

    const access_token = tokenData.access_token;
    console.log('Successfully received access token');

    // Test the access token with user profile
    console.log('Testing access token with user profile...');
    const userProfileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer ' + access_token }
    });

    if (!userProfileRes.ok) {
      const userError = await userProfileRes.text();
      console.error('User profile check failed:', {
        status: userProfileRes.status,
        statusText: userProfileRes.statusText,
        error: userError
      });
      return res.status(500).json({ 
        error: 'Invalid access token',
        spotify_api_error: userError,
        status: userProfileRes.status
      });
    }

    const userProfile = await userProfileRes.json();
    console.log('User profile success:', {
      id: userProfile.id,
      display_name: userProfile.display_name,
      country: userProfile.country,
      product: userProfile.product
    });

    // Now perform the Spotify actions
    const results = {
      user: userProfile,
      actions: {}
    };

    // Follow artist
    try {
      console.log('Following artist:', artist_id);
      const followRes = await fetch(`https://api.spotify.com/v1/me/following?type=artist&ids=${artist_id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer ' + access_token,
          'Content-Type': 'application/json'
        }
      });
      
      results.actions.follow_artist = {
        status: followRes.status,
        success: followRes.ok
      };
      
      if (!followRes.ok) {
        const followError = await followRes.text();
        console.error('Follow artist failed:', followRes.status, followError);
        results.actions.follow_artist.error = followError;
      } else {
        console.log('Successfully followed artist');
      }
    } catch (followError) {
      console.error('Follow artist exception:', followError);
      results.actions.follow_artist = { error: followError.message };
    }

    // Save track
    try {
      console.log('Saving track:', track_id);
      const saveRes = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${track_id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer ' + access_token
        }
      });
      
      results.actions.save_track = {
        status: saveRes.status,
        success: saveRes.ok
      };
      
      if (!saveRes.ok) {
        const saveError = await saveRes.text();
        console.error('Save track failed:', saveRes.status, saveError);
        results.actions.save_track.error = saveError;
      } else {
        console.log('Successfully saved track');
      }
    } catch (saveError) {
      console.error('Save track exception:', saveError);
      results.actions.save_track = { error: saveError.message };
    }

    // Follow playlist
    try {
      console.log('Following playlist:', playlist_id);
      const followPlaylistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/followers`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + access_token }
      });
      
      results.actions.follow_playlist = {
        status: followPlaylistRes.status,
        success: followPlaylistRes.ok
      };
      
      if (!followPlaylistRes.ok) {
        const playlistError = await followPlaylistRes.text();
        console.error('Follow playlist failed:', followPlaylistRes.status, playlistError);
        results.actions.follow_playlist.error = playlistError;
      } else {
        console.log('Successfully followed playlist');
      }
    } catch (playlistError) {
      console.error('Follow playlist exception:', playlistError);
      results.actions.follow_playlist = { error: playlistError.message };
    }

    console.log('Final results:', results);
    console.log('=== CALLBACK HANDLER SUCCESS ===');

    // Redirect to play page
    res.redirect(`/play.html?type=playlist&id=${playlist_id}`);

  } catch (error) {
    console.error('=== CALLBACK HANDLER ERROR ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}