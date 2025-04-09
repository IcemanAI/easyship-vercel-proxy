<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sendcloud Shipping Test</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    section { margin-bottom: 2rem; }
    pre { background: #eee; padding: 10px; overflow-x: auto; }
    label { display: block; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Sendcloud Integration Test</h1>

  <!-- Toggle -->
  <section>
    <label><input type="checkbox" id="sandboxToggle" checked /> Use Sandbox Mode</label>
  </section>

  <!-- Basket -->
  <section>
    <h2>1. Get Delivery Estimate</h2>
    <label>
      Postal Code: <input id="postalCode" placeholder="e.g. 10001" />
    </label>
    <label>
      Country:
      <select id="country">
        <option value="US">United States</option>
        <option value="GB">United Kingdom</option>
        <option value="FR">France</option>
        <!-- Add more as needed -->
      </select>
    </label>
    <button onclick="getEstimate()">Get Estimate</button>
    <pre id="estimateOutput">Estimate will appear here...</pre>
  </section>

  <!-- Shipping Options -->
  <section>
    <h2>2. Show Shipping Options</h2>
    <button onclick="loadOptions()">Load Shipping Options</button>
    <div id="optionsContainer"></div>
    <button onclick="selectOption()">Select Option</button>
    <pre id="stripeOutput">Stripe total will be adjusted here...</pre>
  </section>

  <!-- Mock Checkout -->
  <section>
    <h2>3. Simulate Checkout Success</h2>
    <button onclick="completeOrder()">Complete Order</button>
    <pre id="hubspotOutput">Nothing stored yet...</pre>
  </section>

  <!-- Dev Logs -->
  <section>
    <h2>🛠 Dev Logs</h2>
    <pre id="logBox">Waiting for actions...</pre>
  </section>

  <script>
    const log = (msg) => {
      const box = document.getElementById('logBox');
      box.textContent += '\n\n' + msg;
    };

    const getEndpoint = () => {
      const useSandbox = document.getElementById('sandboxToggle').checked;
      return useSandbox
        ? "https://easyship-vercel-proxy.vercel.app/api/sendcloud-estimate"
        : "https://your-production-endpoint.vercel.app/api/sendcloud-estimate";
    };

    async function getEstimate() {
      const postal_code = document.getElementById("postalCode").value;
      const country = document.getElementById("country").value;

      const res = await fetch(getEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postal_code, country })
      });

      const data = await res.json();
      document.getElementById("estimateOutput").textContent = JSON.stringify(data, null, 2);
      log(`📦 Estimate Response:\n${JSON.stringify(data, null, 2)}`);
    }

    async function loadOptions() {
      const container = document.getElementById("optionsContainer");
      container.innerHTML = "";

      const options = [
        { id: "opt1", courier: "UPS", eta: "3-5 days", cost: 12.99 },
        { id: "opt2", courier: "DHL", eta: "1-2 days", cost: 18.50 },
        { id: "opt3", courier: "Royal Mail", eta: "4-6 days", cost: 9.99 },
      ];

      options.forEach(opt => {
        const label = document.createElement("label");
        label.innerHTML = `
          <input type="radio" name="shippingOption" value="${JSON.stringify(opt)}" />
          ${opt.courier} – £${opt.cost} – ${opt.eta}
        `;
        container.appendChild(label);
      });

      log("📦 Mock shipping options loaded.");
    }

    function selectOption() {
      const selected = document.querySelector('input[name="shippingOption"]:checked');
      if (!selected) return alert("Please select a shipping option");

      const data = JSON.parse(selected.value);
      const stripeTotal = 199.99 + data.cost; // Pretend cart value is £199.99
      document.getElementById("stripeOutput").textContent =
        `New Stripe Total: £${stripeTotal.toFixed(2)}\nSelected: ${data.courier} – ${data.eta}`;

      log(`💰 Shipping selected:\n${JSON.stringify(data, null, 2)}`);
    }

    function completeOrder() {
      const selected = document.querySelector('input[name="shippingOption"]:checked');
      if (!selected) return alert("Select an option first!");

      const data = JSON.parse(selected.value);
      const contact = {
        name: "Test User",
        email: "test@example.com",
        courier: data.courier,
        eta: data.eta,
        cost: data.cost,
        zip: document.getElementById("postalCode").value,
        country: document.getElementById("country").value
      };

      document.getElementById("hubspotOutput").textContent =
        `Storing to HubSpot:\n${JSON.stringify(contact, null, 2)}`;

      log(`🧾 Mock HubSpot payload:\n${JSON.stringify(contact, null, 2)}`);
    }
  </script>
</body>
</html>
