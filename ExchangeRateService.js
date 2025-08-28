// ExchangeRateService.js - Handles currency conversion using Wise API

/**
 * Exchange rate service that fetches the latest rate from Wise API once per script execution
 * and uses it for all conversions to reduce API calls and improve performance
 */
class ExchangeRateService {
  constructor() {
    // Auth token from the Python script
    this.authToken = "OGNhN2FlMjUtOTNjNS00MmFlLThhYjQtMzlkZTFlOTQzZDEwOjliN2UzNmZkLWRjYjgtNDEwZS1hYzc3LTQ5NGRmYmEyZGJjZA==";
    this.baseUrl = "https://api.wise.com/v1";
    
    // Cache for the exchange rate (lasts for the duration of the script execution)
    this.cachedRate = null;
    
    // Fallback rate in case the API call fails
    this.fallbackRate = 0.74;
    
    // Flag to track if we've logged the rate
    this.hasLoggedRate = false;
  }
  
  /**
   * Get the exchange rate between USD and GBP from Wise API
   * Only calls the API once per script execution
   * @returns {number} Exchange rate (USD to GBP)
   */
  getUsdToGbpRate() {
    // Return cached rate if available
    if (this.cachedRate !== null) {
      return this.cachedRate;
    }
    
    // Parameters for the request
    const source = "USD";
    const target = "GBP";
    
    try {
      // Build URL with query parameters
      const url = `${this.baseUrl}/rates?source=${source}&target=${target}`;
      
      // Make the request
      const options = {
        method: "get",
        headers: {
          "Authorization": `Basic ${this.authToken}`,
          "Content-Type": "application/json"
        },
        muteHttpExceptions: true
      };
      
      console.log("Fetching latest USD to GBP exchange rate from Wise API...");
      const response = UrlFetchApp.fetch(url, options);
      
      // Check response status
      if (response.getResponseCode() !== 200) {
        console.log(`API error: ${response.getResponseCode()} - falling back to default rate ${this.fallbackRate}`);
        this.cachedRate = this.fallbackRate;
        return this.fallbackRate;
      }
      
      // Parse response
      const data = JSON.parse(response.getContentText());
      
      // Return first rate if available
      if (Array.isArray(data) && data.length > 0 && data[0].rate) {
        const rate = data[0].rate;
        
        // Cache the rate with 6 decimal places precision
        this.cachedRate = parseFloat(rate.toFixed(6));
        
        // Log the rate once
        if (!this.hasLoggedRate) {
          console.log(`Current USD to GBP exchange rate: ${this.cachedRate}`);
          this.hasLoggedRate = true;
        }
        
        return this.cachedRate;
      } else {
        console.log(`Invalid response from API - falling back to default rate ${this.fallbackRate}`);
        this.cachedRate = this.fallbackRate;
        return this.fallbackRate;
      }
      
    } catch (error) {
      console.log(`Error fetching exchange rate: ${error.message} - falling back to default rate ${this.fallbackRate}`);
      this.cachedRate = this.fallbackRate;
      return this.fallbackRate;
    }
  }
  
  /**
   * Convert USD amount to GBP using the latest exchange rate
   * @param {number} usdAmount - Amount in USD
   * @returns {number} Amount in GBP
   */
  convertUsdToGbp(usdAmount) {
    // Handle invalid input
    if (usdAmount === null || usdAmount === undefined || isNaN(usdAmount)) {
      return 0;
    }
    
    // Get the current rate (from cache or API)
    const rate = this.getUsdToGbpRate();
    
    // Perform conversion
    return usdAmount * rate;
  }
}

/**
 * Create a new exchange rate service
 * @returns {ExchangeRateService} Exchange rate service instance
 */
function createExchangeRateService() {
  return new ExchangeRateService();
}

/**
 * Helper function to directly convert USD to GBP
 * @param {number} usdAmount - Amount in USD
 * @returns {number} Amount in GBP
 */
function convertUsdToGbp(usdAmount) {
  // Create service and convert in one step
  return createExchangeRateService().convertUsdToGbp(usdAmount);
}

/**
 * Test the exchange rate service
 */
function testExchangeRateService() {
  console.log("==== EXCHANGE RATE SERVICE TEST ====");
  
  // Create service
  const service = createExchangeRateService();
  
  // Test getting the rate
  console.log("\n-- Testing rate retrieval --");
  const rate = service.getUsdToGbpRate();
  console.log(`USD to GBP rate: ${rate}`);
  
  // Test multiple conversions (should use cached rate after first call)
  console.log("\n-- Testing multiple conversions --");
  const amounts = [100, 250, 500, 1000];
  
  console.log("Converting multiple USD amounts to GBP:");
  for (const amount of amounts) {
    const result = service.convertUsdToGbp(amount);
    console.log(`$${amount} USD = £${result.toFixed(2)} GBP`);
  }
  
  console.log("\n==== TEST COMPLETE ====");
  
  return {
    rate: rate,
    conversions: amounts.map(amount => ({
      usd: amount,
      gbp: service.convertUsdToGbp(amount)
    }))
  };
}