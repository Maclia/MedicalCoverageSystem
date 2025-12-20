const axios = require('axios');

// Simulation script for token purchase and consumption for SMS and Claims services

const BASE_URL = 'http://localhost:5000'; // Assuming server runs on port 5000

async function simulateTokenPurchase() {
  try {
    console.log('Starting token purchase simulation...');

    // Step 1: Authenticate and get token (assuming auth is set up)
    // For simulation, we'll assume we have a valid auth token
    const authToken = 'your-auth-token-here'; // Replace with actual token

    // Step 2: Get available token packages
    console.log('Fetching token packages...');
    const packagesResponse = await axios.get(`${BASE_URL}/api/tokens/packages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const packages = packagesResponse.data.packages;
    console.log(`Available packages: ${packages.length}`);

    // Step 3: Select a package (e.g., first one)
    const selectedPackage = packages[0];
    console.log(`Selected package: ${selectedPackage.name} - ${selectedPackage.tokenQuantity} tokens`);

    // Step 4: Simulate purchase
    console.log('Simulating token purchase...');
    const purchaseData = {
      organizationId: 1, // Example organization ID
      packageId: selectedPackage.id,
      paymentMethodId: 1, // Example payment method
      quantity: 1
    };

    const purchaseResponse = await axios.post(`${BASE_URL}/api/tokens/purchase`, purchaseData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('Purchase successful:', purchaseResponse.data);

    // Step 5: Check wallet balance after purchase
    console.log('Checking wallet balance...');
    const walletResponse = await axios.get(`${BASE_URL}/api/tokens/wallet/1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Wallet balance:', walletResponse.data.wallet.currentBalance);

    // Step 6: Simulate token consumption for SMS service
    console.log('Simulating SMS service token consumption...');
    // Assuming there's an endpoint for consuming tokens, e.g., /api/tokens/consume
    const smsConsumption = {
      organizationId: 1,
      service: 'sms',
      tokensUsed: 10,
      description: 'Bulk SMS campaign'
    };

    // Note: This endpoint might not exist; adjust based on actual API
    try {
      const smsResponse = await axios.post(`${BASE_URL}/api/tokens/consume`, smsConsumption, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('SMS consumption successful:', smsResponse.data);
    } catch (error) {
      console.log('SMS consumption endpoint not available, simulating manually...');
      // Simulate by deducting from wallet
      await simulateConsumption(1, 10, authToken);
    }

    // Step 7: Simulate token consumption for Claims service
    console.log('Simulating Claims service token consumption...');
    const claimsConsumption = {
      organizationId: 1,
      service: 'claims',
      tokensUsed: 25,
      description: 'Claims processing batch'
    };

    try {
      const claimsResponse = await axios.post(`${BASE_URL}/api/tokens/consume`, claimsConsumption, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('Claims consumption successful:', claimsResponse.data);
    } catch (error) {
      console.log('Claims consumption endpoint not available, simulating manually...');
      await simulateConsumption(1, 25, authToken);
    }

    // Step 8: Final balance check
    const finalWalletResponse = await axios.get(`${BASE_URL}/api/tokens/wallet/1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Final wallet balance:', finalWalletResponse.data.wallet.currentBalance);

    console.log('Simulation completed successfully!');

  } catch (error) {
    console.error('Simulation failed:', error.response?.data || error.message);
  }
}

async function simulateConsumption(organizationId, tokensUsed, authToken) {
  // Manual simulation by updating wallet (this would normally be done by the service)
  const updateData = {
    organizationId,
    tokensUsed,
    reason: 'Service consumption simulation'
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/tokens/deduct`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Manual deduction successful:', response.data);
  } catch (error) {
    console.log('Manual deduction failed, endpoint may not exist');
  }
}

// Run the simulation
simulateTokenPurchase();