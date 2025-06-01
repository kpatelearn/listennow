// === DEBUG ENDPOINT TO TEST SPOTIFY API CALLS ===
export default async function handler(req, res) {
  const { access_token } = req.query;
  
  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token parameter' });
  }

  const track_id = '41a4u7k1qElUrR5T2toecE';
  const artist_id = '3uIsve9Dn2WsIYgE3C7I86';

  try {
    // Test getting user profile first
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer ' + access_token }
    });
    
    const userData = await userRes.json();
    console.log('User data:', userData);

    // Test following artist
    const followRes = await fetch(`https://api.spotify.com/v1/me/following?type=artist&ids=${artist_id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      }
    });

    // Test saving track
    const saveRes = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${track_id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      }
    });

    // Check if we're already following the artist
    const checkFollowRes = await fetch(`https://api.spotify.com/v1/me/following/contains?type=artist&ids=${artist_id}`, {
      headers: { 'Authorization': 'Bearer ' + access_token }
    });
    const followingData = await checkFollowRes.json();

    // Check if track is saved
    const checkSaveRes = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${track_id}`, {
      headers: { 'Authorization': 'Bearer ' + access_token }
    });
    const savedData = await checkSaveRes.json();

    res.json({
      user: userData,
      follow_status: followRes.status,
      save_status: saveRes.status,
      is_following: followingData,
      is_saved: savedData,
      follow_response: followRes.ok ? 'Success' : await followRes.text(),
      save_response: saveRes.ok ? 'Success' : await saveRes.text()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
