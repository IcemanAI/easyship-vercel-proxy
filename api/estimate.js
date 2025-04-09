export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postal_code, country = 'US' } = req.body;

  const response = await fetch('https://api.easyship.com/rate/v1/rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EASYSHIP_API_TOKEN}`
    },
    body: JSON.stringify({
      origin_address: {
        country_alpha2: 'US', // your warehouse country
        postal_code: '10001'  // your warehouse postal code
      },
      destination_address: {
        country_alpha2: country,
        postal_code: postal_code
      },
      parcels: [{
        length: 10,
        width: 10,
        height: 5,
        weight: 2
      }]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(500).json({ error: data.message || 'Error from EasyShip' });
  }

  const topOption = data.rates?.[0];

  res.status(200).json({
    courier: topOption?.courier_name,
    delivery_days: topOption?.delivery_days,
    total_cost: topOption?.total_charge,
    eta: topOption?.estimated_delivery_date
  });
}
