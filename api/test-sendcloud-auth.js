export default async function handler(req, res) {
  // Allow CORS for browser-based testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Always use live Sendcloud keys
    const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
    const secretKey = process.env.SENDCLOUD_SECRET_KEY;
    const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
    
    // Test all endpoints to see which ones we have access to
    const endpoints = [
      { url: 'https://panel.sendcloud.sc/api/v2/user', method: 'GET', name: 'User Info' },
      { url: 'https://panel.sendcloud.sc/api/v2/shipping_methods', method: 'GET', name: 'Shipping Methods (GET)' },
      { url: 'https://panel.sendcloud.sc/api/v2/parcels', method: 'GET', name: 'Parcels' },
      { url: 'https://panel.sendcloud.sc/api/v2/brands', method: 'GET', name: 'Brands' },
      { url: 'https://panel.sendcloud.sc/api/v2/labels', method: 'GET', name: 'Labels' }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        const status = response.status;
        const data = await response.json();
        
        results[endpoint.name] = {
          status,
          success: status >= 200 && status < 300,
          data: data
        };
      } catch (endpointErr) {
        results[endpoint.name] = {
          success: false,
          error: endpointErr.message
        };
      }
    }
    
    return res.status(200).json({
      success: true,
      results: results
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
