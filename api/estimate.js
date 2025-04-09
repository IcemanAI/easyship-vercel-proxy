export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { postal_code, country } = req.body;

  if (!postal_code || !country) {
    return res.status(400).json({ error: 'Missing postal_code or country' });
  }

  const origin = {
    country_alpha2: 'GB',
    postal_code: 'CT12 5NQ'
  };

  const parcelDetails = {
    length: 70,
    width: 70,
    height: 70,
    weight: 70
  };

  const payload = {
    origin_address: origin,
    destination_address: {
      country_alpha2: country.toUpperCase(),
      postal_code
    },
    parcels: [parcelDetails]
  };

  console.log('🔍 DEBUG - Sending payload to EasyShip sandbox:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://api.sandbox.easyship.com/rate/v1/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EASYSHIP_SANDBOX_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log('📥 DEBUG - EasyShip sandbox response:');
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok || !data.rates?.length) {
      console.warn('⚠️ Sandbox response error:', response.status, data);
      return res.status(500).json({
        error: data.message || 'No rates returned from sandbox',
        raw: data
      });
    }

    const bestRate = data.rates[0];

    res.status(200).json({
      courier: bestRate?.courier_name,
      service: bestRate?.courier_service_name,
      delivery_days: bestRate?.delivery_days,
      total_cost: bestRate?.total_charge,
      eta: bestRate?.estimated_delivery_date,
      currency: bestRate?.currency
    });

  } catch (err) {
    console.error('❌ Caught error while calling sandbox API:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
}
