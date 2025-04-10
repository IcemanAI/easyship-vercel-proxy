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
    // Get all shipping methods 
    const shippingMethods = await fetchCachedShippingMethods();
    
    // Filter methods based on package specifications
    const availableMethods = filterShippingMethods(shippingMethods, {
      country: country.toUpperCase(),
      weight,
      length,
      width,
      height
    });

    return res.status(200).json({
      success: true,
      country: country.toUpperCase(),
      postal_code,
      available_methods: availableMethods
    });

  } catch (err) {
    console.error('❌ Internal error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });
  }
}

// Cache shipping methods to improve performance
let cachedShippingMethods = null;
let lastCacheTime = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function fetchCachedShippingMethods() {
  // Return cached data if valid
  if (cachedShippingMethods && lastCacheTime && (Date.now() - lastCacheTime < CACHE_DURATION)) {
    return cachedShippingMethods;
  }
  
  // Otherwise fetch fresh data
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  
  const response = await fetch('https://panel.sendcloud.sc/api/v2/shipping_methods', {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    }
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.shipping_methods) {
    throw new Error('Failed to fetch shipping methods from SendCloud');
  }
  
  // Update cache
  cachedShippingMethods = data.shipping_methods;
  lastCacheTime = Date.now();
  
  return cachedShippingMethods;
}

function filterShippingMethods(methods, packageDetails) {
  const { country, weight, length, width, height } = packageDetails;
  
  return methods
    .filter(method => {
      // Check weight constraints
      const weightInG = weight;
      const minWeightInG = parseFloat(method.min_weight) * 1000;
      const maxWeightInG = parseFloat(method.max_weight) * 1000;
      const withinWeight = weightInG >= minWeightInG && weightInG <= maxWeightInG;
      
      // Find if this shipping method supports the target country
      const countryData = method.countries.find(c => c.iso_2 === country);
      
      return withinWeight && countryData;
    })
    .map(method => {
      // Get country-specific details
      const countryData = method.countries.find(c => c.iso_2 === country);
      
      // Calculate estimated delivery date if lead time is available
      let estimatedDelivery = null;
      if (countryData && countryData.lead_time_hours) {
        const deliveryHours = countryData.lead_time_hours;
        const deliveryDays = Math.ceil(deliveryHours / 24);
        const today = new Date();
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() + deliveryDays);
        
        estimatedDelivery = {
          days: deliveryDays,
          date: deliveryDate.toLocaleDateString('en-GB'),
          formatted: deliveryDays === 1 ? 'Next day delivery' : `${deliveryDays} days delivery`
        };
      }
      
      // Return formatted shipping method
      return {
        id: method.id,
        name: method.name,
        carrier: method.carrier,
        min_weight: method.min_weight,
        max_weight: method.max_weight,
        service_point_input: method.service_point_input,
        price: countryData ? countryData.price : 0,
        currency: '£', // Assuming GBP, adjust if needed
        estimated_delivery: estimatedDelivery,
        lead_time_hours: countryData ? countryData.lead_time_hours : null
      };
    })
    // Sort by price
    .sort((a, b) => a.price - b.price);
}
