export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    postal_code,
    country,
    weight = 500,          // grams, default
    length = 10,           // cm, default
    width = 10,
    height = 5,
    sandbox = false
  } = req.body;

  if (!postal_code || !country) {
    return res.status(400).json({ error: 'Missing postal_code or country' });
  }

  console.log('📦 Request:', { postal_code, country, weight, length, width, height });

  try {
    // Get API credentials
    const publicKey = sandbox
      ? process.env.SENDCLOUD_PUBLIC_KEY_SANDBOX
      : process.env.SENDCLOUD_PUBLIC_KEY;

    const secretKey = sandbox
      ? process.env.SENDCLOUD_SECRET_KEY_SANDBOX
      : process.env.SENDCLOUD_SECRET_KEY;

    const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

    // Construct Sendcloud API payload
    const payload = {
      parcel: {
        from_country: "GB",
        to_country: country.toUpperCase(),
        to_postal_code: postal_code,
        weight,
        length,
        width,
        height
      }
    };

    console.log("📦 Sending payload to Sendcloud:", payload);

    // Call Sendcloud shipping methods endpoint
    const response = await fetch('https://panel.sendcloud.sc/api/v2/shipping_methods', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("📦 Response from Sendcloud:", JSON.stringify(data, null, 2));

    if (!response.ok || !data.shipping_methods) {
      return res.status(500).json({
        error: 'Failed to fetch shipping methods',
        status: response.status,
        raw: data
      });
    }

    // Filter results (optional if you want to show only matching destination)
    const filtered = data.shipping_methods.filter(method =>
      method.to_country === country.toUpperCase()
    );

    return res.status(200).json({
      success: true,
      country: country.toUpperCase(),
      postal_code,
      available_methods: filtered
    });

  } catch (err) {
    console.error('❌ Error in Sendcloud handler:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });
  }
}
