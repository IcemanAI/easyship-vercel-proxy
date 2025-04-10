export default async function handler(req, res) {
  // Allow CORS for browser-based testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Handle preflight
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    postal_code,
    country,
    weight = 500, // grams
    length = 10,  // cm
    width = 10,
    height = 5
  } = req.body;

  if (!postal_code || !country) {
    return res.status(400).json({ error: 'Missing postal_code or country' });
  }

  try {
    // Get all shipping methods using GET instead of POST
    const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
    const secretKey = process.env.SENDCLOUD_SECRET_KEY;
    const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
    
    const response = await fetch('https://panel.sendcloud.sc/api/v2/shipping_methods', {
      method: 'GET', // Using GET which works with trial accounts
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.shipping_methods) {
      console.error("❌ Error from Sendcloud:", data);
      return res.status(response.status).json({
        error: 'Failed to fetch shipping methods',
        status: response.status,
        raw: data
      });
    }
    
    // Filter methods manually based on package details
    const filteredMethods = data.shipping_methods.filter(method => {
      // Convert to grams if needed (API uses kg)
      const minWeightInG = parseFloat(method.min_weight) * 1000;
      const maxWeightInG = parseFloat(method.max_weight) * 1000;
      
      // Check weight constraints
      const withinWeight = weight >= minWeightInG && weight <= maxWeightInG;
      
      // Check if this method supports the destination country
      const supportsCountry = method.countries.some(c => 
        c.iso_2 === country.toUpperCase()
      );
      
      return withinWeight && supportsCountry;
    }).map(method => {
      // Find pricing for this specific country
      const countryData = method.countries.find(c => 
        c.iso_2 === country.toUpperCase()
      );
      
      // Calculate delivery estimate if available
      let deliveryEstimate = null;
      if (countryData && countryData.lead_time_hours) {
        const days = Math.ceil(countryData.lead_time_hours / 24);
        deliveryEstimate = {
          days,
          text: days === 1 ? 'Next day delivery' : `${days} days delivery`
        };
      }
      
      return {
        id: method.id,
        name: method.name,
        carrier: method.carrier,
        min_weight: method.min_weight,
        max_weight: method.max_weight,
        price: countryData ? countryData.price : 0,
        service_point_input: method.service_point_input,
        delivery_estimate: deliveryEstimate
      };
    });
    
    // Sort by price
    filteredMethods.sort((a, b) => a.price - b.price);

    return res.status(200).json({
      success: true,
      country: country.toUpperCase(),
      postal_code,
      available_methods: filteredMethods
    });

  } catch (err) {
    console.error('❌ Internal error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });
  }
}
