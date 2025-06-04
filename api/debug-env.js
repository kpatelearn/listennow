// === DEBUG ENDPOINT - Save as /api/debug-env.js ===
export default async function handler(req, res) {
  // Check if environment variables are available
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  res.json({
    env_check: {
      client_id_set: !!client_id,
      client_id_length: client_id ? client_id.length : 0,
      client_secret_set: !!client_secret,
      client_secret_length: client_secret ? client_secret.length : 0,
      redirect_uri_set: !!redirect_uri,
      redirect_uri: redirect_uri || 'NOT SET',
    },
    current_url: req.headers.host,
    user_agent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
}