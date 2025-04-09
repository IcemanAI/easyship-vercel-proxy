export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { postal_code, country } = req.body;

    if (!postal_code || !country) {
      return res.status(400).json({ error: 'Missing postal_code or country' });
    }

    console.log("✅ API request received:", postal_code, country);

    const authHeader = 'Basic ' + Buffer.from(
      `${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_SECRET_KEY}`
    ).toString('base64');

    const response = await fetch('https://panel.sendcloud.sc/api/v2/shipping_methods', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log("📦 Response from Sendcloud:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(500).json({
        error: 'Failed to fetch shipping methods',
        status: response.status,
        raw: data
      });
    }

    const filtered = data.shipping_methods?.filter(method =>
      method.to_country === country.toUpperCase()
    );

    res.status(200).
