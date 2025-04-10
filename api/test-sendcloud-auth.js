// Create a file named test-sendcloud-auth.js in your project
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  
  try {
    const userInfo = await fetch('https://panel.sendcloud.sc/api/v2/user', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    const userData = await userInfo.json();
    return res.status(200).json({
      success: true,
      userData: userData
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
