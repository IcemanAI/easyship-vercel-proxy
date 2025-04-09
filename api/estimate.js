export default async function handler(req, res) {
  // ✅ Allow CORS from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Preflight check
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ✅ Hardcoded origin (UK warehouse) + test destination (US)
  const payload = {
    origin_address: {
      country_alpha2: 'GB',
      postal_code: 'CT12 5NQ'
    },
    destination_address: {
      country_alpha2: 'US',   // ← TEMP TEST INPUT
      postal_code: '10001'    // ← TEMP TEST INPUT
    },
    parcels: [
      {
        length: 70,
        width: 70,
        height: 70,
        weight: 70
      }
    ]
  };

  console.log('📦 Payload being sent to EasyShip SANDBOX:');
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

    console.log('📬 Response from EasyShip SANDBOX:');
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok || !data.rates?.length) {
      console.warn('⚠️ No rates or bad response:', data);
      return res.status(500).json({
        error: data.message || 'No rates returned from sandbox',
        raw: data
      });
    }

    const bestRate = data.rates[0];

    return res.status(200).json({
      courier: bestRate?.courier_name,
      service: bestRate?.courier_service_name,
      delivery_days: bestRate?.delivery_days,
      total_cost: bestRate?.total_charge,
      eta: bestRate?.estimated_delivery_date,
      currency: bestRate?.currency
    });

  } catch (err) {
    console.error('❌ Sandbox fetch error:', err);
    return res.status(500).json({
      error: 'Server error when contacting EasyShip Sandbox',
      message: err.message
    });
  }
}
