export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postal_code, country } = req.body;

  if (!postal_code || !country) {
    return res.status(400).json({ error: 'Missing postal_code or country' });
  }

  console.log('📦 API request received:', { postal_code, country });

  try {
    // Encode Sendcloud credentials
    const authHeader = 'Basic ' + Buffer.from(
      `${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_SECRET_KEY}`
    ).toString('base64');

    // Fetch shipping methods from Sendcloud
    const response = await fetch('https://panel.sendcloud.sc/api/v2/shipping_methods', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📦 Response from Sendcloud:', JSON.stringify(data, null, 2));

    if (!response.ok || !data.shipping_methods) {
      return res.status(500).json({
        error: 'Failed to fetch shipping methods',
        status: response.status,
        raw: data
      });
    }

    // Filter methods based on destination country
    const filtered = data.shipping_methods.filter(method =>
      method.to_country === country.toUpperCase()
    );

    return res.status(200).json({
      success: true,
      country: country.toUpperCase(),
      postal_code,
      available_methods: filtered
    });

  } catch (error) {
    console.error('❌ Internal server error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
