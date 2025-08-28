// =================================================================================
// Main Control Panel & Placeholders
// =================================================================================

// ****** PLEASE FILL IN THESE VALUES ******

// ID of the Google Drive folder containing your data CSV file.
const FOLDER_ID = '1DU7SZGZLRP5XMaBoDfcRgeooPTMSYCQz'; 

// ID of the Google Sheet with the country-to-region mapping.
const SPREADSHEET_ID = '1aalgZUTZ_5fjXsIOhNDc7ntiO-7gCm9i9Xve7enBQHQ';

// The name of the *tab* in your spreadsheet that contains the region mapping.
const REGION_SHEET_NAME = 'Regions'; 

// The Parent Page ID in Confluence where you want to save the new page.
const CONFLUENCE_PARENT_PAGE_ID = '2534671054'; 

// The Ancestor Page ID for checking if a page already exists. 
// This can be a higher-level page that contains all your reports.
const CONFLUENCE_SEARCH_ANCESTOR_ID = '1890235685';


// =================================================================================
// Main Execution Function
// =================================================================================

/**
 * This is the main function to run. It performs the analysis and creates the Confluence page.
 */
function runMonthlyReport() {
  try {
    // 1. Analyze the spend data from Drive and Sheets.
    const analysisResults = analyzeSpendData();
    
    if (!analysisResults) {
      console.log("Analysis could not be completed. Halting page creation.");
      return;
    }
    
    // 2. Generate the HTML content for the Confluence page.
    const reportHtml = generateConfluenceHtml(analysisResults);
    
    // 3. Create the page in Confluence.
    createConfluencePage(reportHtml);

  } catch (error) {
    console.error(`An error occurred in the main process: ${error.message}`);
  }
}


// =================================================================================
// Step 1: Data Analysis
// =================================================================================

/**
 * Analyzes spend data from CSV and Google Sheet, returning structured results.
 */
function analyzeSpendData() {
  console.log("Starting data analysis...");
  
  // Find and load the data CSV file
  const dataRows = findDataCsvInDrive();
  if (!dataRows) return null;

  // Get region mapping from the Google Sheet
  const regionMap = getRegionMapFromSheet();
  if (!regionMap) return null;

  const monthlyTotals = {};
  const dataHeaders = dataRows[0].map(h => h.toLowerCase());
  const dayIndex = dataHeaders.indexOf('day');
  const geoIndex = dataHeaders.indexOf('geo');
  const publisherIndex = dataHeaders.indexOf('publisher');
  const spendIndex = dataHeaders.indexOf('spend');

  if (dayIndex === -1 || publisherIndex === -1 || geoIndex === -1 || spendIndex === -1) {
    throw new Error("Could not find one or more required columns: 'Day', 'Geo', 'Publisher', 'Spend'.");
  }

  for (let i = 1; i < dataRows.length; i++) {
    const row = dataRows[i];
    const spend = parseFloat(row[spendIndex]);
    const date = new Date(row[dayIndex]);

    if (isNaN(spend) || isNaN(date.getTime())) continue;
    
    const monthKey = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2);

    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = {
        totalSpend: 0,
        byRegion: {},
        byPublisher: {}
      };
    }

    monthlyTotals[monthKey].totalSpend += spend;

    // Aggregate by Region
    const geo = row[geoIndex];
    if (geo) {
      const region = regionMap[geo.toLowerCase()];
      if (region) {
        monthlyTotals[monthKey].byRegion[region] = (monthlyTotals[monthKey].byRegion[region] || 0) + spend;
      }
    }
    
    // Aggregate by Publisher
    const publisher = row[publisherIndex];
    if (publisher) {
      monthlyTotals[monthKey].byPublisher[publisher] = (monthlyTotals[monthKey].byPublisher[publisher] || 0) + spend;
    }
  }
  
  console.log("Data analysis complete.");
  return monthlyTotals;
}

/**
 * Helper function to find the primary data CSV in the specified Drive folder.
 */
function findDataCsvInDrive() {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    while (files.hasNext()) {
        const file = files.next();
        if (file.getMimeType() === 'text/csv') {
            const content = file.getBlob().getDataAsString();
            const header = content.split('\n')[0].toLowerCase();
            if (header.includes('geo') && header.includes('spend')) {
                console.log(`Found data file: ${file.getName()}`);
                return Utilities.parseCsv(content);
            }
        }
    }
    throw new Error("Could not find a CSV file with 'Geo' and 'Spend' columns in the folder.");
}

/**
 * Helper function to get the region mapping from the specified Google Sheet.
 */
function getRegionMapFromSheet() {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(REGION_SHEET_NAME);
    if (!sheet) {
        throw new Error(`Sheet tab named '${REGION_SHEET_NAME}' not found.`);
    }
    const regionData = sheet.getDataRange().getValues();
    const regionMap = {};
    const regionHeaders = regionData[0].map(h => h.toLowerCase());
    const countryCodeIndex = regionHeaders.indexOf('2-iso');
    const regionIndex = regionHeaders.indexOf('region');

    if (countryCodeIndex === -1 || regionIndex === -1) {
        throw new Error("Could not find '2-ISO' or 'Region' columns in the Google Sheet.");
    }
    for (let i = 1; i < regionData.length; i++) {
        const countryCode = regionData[i][countryCodeIndex];
        const region = regionData[i][regionIndex];
        if (countryCode && region) {
            regionMap[countryCode.toLowerCase()] = region;
        }
    }
    return regionMap;
}


// =================================================================================
// Step 2: HTML Generation
// =================================================================================

/**
 * Generates the HTML for the Confluence page body using the analyzed data.
 * @param {object} analysisResults - The data object from analyzeSpendData.
 */
function generateConfluenceHtml(analysisResults) {
  console.log("Generating HTML content...");
  
  // For this report, we'll assume the data contains a single month.
  // If multiple months exist, it will use the first one it finds.
  const monthKey = Object.keys(analysisResults)[0];
  const monthData = analysisResults[monthKey];
  
  // Format month name (e.g., "May 2025")
  const date = new Date(monthKey + '-02'); // Use second day to avoid timezone issues
  const monthName = date.toLocaleString('default', { month: 'long' }) + ' ' + date.getFullYear();

  // Build the performance table rows for regions
  let regionPerformanceRows = '';
  for (const region in monthData.byRegion) {
    regionPerformanceRows += `
      <tr>
        <td><p>${region}</p></td>
        <td><p>£${monthData.byRegion[region].toFixed(2)}</p></td>
      </tr>
    `;
  }
  
  // Build the performance table rows for publishers
  let publisherPerformanceRows = '';
  for (const publisher in monthData.byPublisher) {
    publisherPerformanceRows += `
      <tr>
        <td><p>${publisher}</p></td>
        <td><p>£${monthData.byPublisher[publisher].toFixed(2)}</p></td>
      </tr>
    `;
  }

  const html = `
    <h1>Audio Monthly Retro - ${monthName}</h1>
    
    <h2>TL;DR Highlight</h2>
    <p>
      In ${monthName}, the total channel spend was <strong>£${monthData.totalSpend.toFixed(2)}</strong>.
    </p>

    <hr/>

    <h2>Spend by Region</h2>
    <table>
      <thead>
        <tr>
          <th><p><strong>Region</strong></p></th>
          <th><p><strong>Total Spend</strong></p></th>
        </tr>
      </thead>
      <tbody>
        ${regionPerformanceRows}
      </tbody>
    </table>
    
    <hr/>

    <h2>Spend by Publisher</h2>
     <table>
      <thead>
        <tr>
          <th><p><strong>Publisher</strong></p></th>
          <th><p><strong>Total Spend</strong></p></th>
        </tr>
      </thead>
      <tbody>
        ${publisherPerformanceRows}
      </tbody>
    </table>
  `;
  
  console.log("HTML content generated.");
  return html;
}


// =================================================================================
// Step 3: Confluence API Interaction
// =================================================================================

/**
 * Creates a new Confluence page with the given HTML content using modern editor (v2).
 * @param {string} reportContent - The HTML content for the page.
 */
function createConfluencePage(reportContent) {
  const config = getConfluenceConfig();
  let pageTitle = generatePageTitle();
  
  if (pageAlreadyExists(pageTitle)) {
    console.log(`Live page already exists: "${pageTitle}" - skipping creation.`);
    return null;
  }
  
  const endpoint = `https://${config.domain}.atlassian.net/wiki/rest/api/content`;
  
  // UPDATED PAYLOAD FOR MODERN EDITOR (v2)
  const payload = {
    "type": "page",
    "title": pageTitle,
    "space": { "key": config.spaceKey },
    "ancestors": [{ "id": CONFLUENCE_PARENT_PAGE_ID }],
    "body": { 
      "editor2": {  // Changed from "storage" to "editor2" for modern editor
        "value": reportContent, 
        "representation": "storage" 
      }
    },
    "metadata": {
      "properties": {
        "editor": { "value": "v2" }  // Force v2 (modern) editor
      }
    }
  };
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'Authorization': getConfluenceAuth(config) },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    console.log(`Creating Confluence page: ${pageTitle}`);
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`Confluence API error: ${responseCode} - ${response.getContentText()}`);
    }
    
    const result = JSON.parse(response.getContentText());
    const pageUrl = `https://${config.domain}.atlassian.net/wiki${result._links.webui}`;
    console.log(`✓ Page created successfully: ${pageUrl}`);
    return pageUrl;
    
  } catch (error) {
    console.error(`Failed to create Confluence page: ${error.message}`);
    throw error;
  }
}

/**
 * Checks if a page with the generated title already exists under the search ancestor.
 * @param {string} pageTitle - The title to search for.
 */
function pageAlreadyExists(pageTitle) {
  const config = getConfluenceConfig();
  const searchEndpoint = `https://${config.domain}.atlassian.net/wiki/rest/api/content/search`;
  const cql = `ancestor=${CONFLUENCE_SEARCH_ANCESTOR_ID} and title="${pageTitle}" and type=page`;
  const url = `${searchEndpoint}?cql=${encodeURIComponent(cql)}&status=current`;

  const options = {
    'method': 'get',
    'headers': { 'Authorization': getConfluenceAuth(config) },
    'muteHttpExceptions': true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  return data.results && data.results.length > 0;
}

/**
 * Generates the page title for the previous month (e.g., "Audio Monthly Retro - August 2025").
 */
function generatePageTitle() {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = previousMonth.toLocaleString('default', { month: 'long' });
  const year = previousMonth.getFullYear();  // Use full 4-digit year
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  return `Audio Monthly Retro - ${month} ${year} (${timestamp})`;
}

/**
 * Gets Confluence configuration from Script Properties.
 * IMPORTANT: You must set these in File > Project properties > Script properties.
 * Required properties: CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN, CONFLUENCE_DOMAIN, CONFLUENCE_SPACE_KEY
 */
function getConfluenceConfig() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    email: props.getProperty('CONFLUENCE_EMAIL'),
    apiToken: props.getProperty('CONFLUENCE_API_TOKEN'),
    domain: props.getProperty('CONFLUENCE_DOMAIN'), // e.g., 'your-company.atlassian.net'
    spaceKey: props.getProperty('CONFLUENCE_SPACE_KEY') // e.g., 'MKT'
  };
  
  for (const key in config) {
    if (!config[key]) {
      throw new Error(`Missing required Script Property: ${key.toUpperCase()}`);
    }
  }
  return config;
}

/**
 * Generates the Basic Authentication header for Confluence API calls.
 * @param {object} config - The configuration object.
 */
function getConfluenceAuth(config) {
  const credentials = Utilities.base64Encode(`${config.email}:${config.apiToken}`);
  return `Basic ${credentials}`;
}

/**
 * =================================================================================
 * TEST FUNCTION
 * =================================================================================
 * Use this function to create a temporary Confluence page with placeholder
 * content to verify the structure and API connection.
 */
function testConfluencePageCreation() {

  // ****** Set your TEST location here ******
  // This is the Parent Page ID in Confluence where your TEST page will be created.
  const TEST_CONFLUENCE_PARENT_PAGE_ID = '2534671054';

  console.log("Starting Confluence test...");

  // 1. Generate the placeholder HTML content.
  const testHtmlContent = generateTestHtml();

  // 2. Call the main Confluence creation function with the test data.
  // We will temporarily modify the function call to pass our test parent ID.
  try {
    const config = getConfluenceConfig();
    let pageTitle = generatePageTitle();
    
    // Check if a page with this title already exists to avoid errors.
    if (pageAlreadyExists(pageTitle)) {
      console.log(`A page named "${pageTitle}" already exists. To force a test, please delete the old one or wait until next month.`);
      // Adding a timestamp to the title for testing purposes if it already exists
      const timestamp = new Date().toLocaleTimeString();
      pageTitle = `${pageTitle} (Test ${timestamp})`;
      console.log(`Creating page with modified title: ${pageTitle}`);
    }

    const endpoint = `https://${config.domain}.atlassian.net/wiki/rest/api/content`;
    
    const payload = {
      "type": "page",
      "title": pageTitle,
      "space": { "key": config.spaceKey },
      "ancestors": [{ "id": TEST_CONFLUENCE_PARENT_PAGE_ID }],
      "body": { "storage": { "value": testHtmlContent, "representation": "storage" } }
    };
    
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'Authorization': getConfluenceAuth(config) },
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };
    
    console.log(`Creating test page: ${pageTitle}`);
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`Confluence API error: ${responseCode} - ${response.getContentText()}`);
    }
    
    const result = JSON.parse(response.getContentText());
    const pageUrl = `https://${config.domain}.atlassian.net/wiki${result._links.webui}`;
    console.log(`✓ Test page created successfully: ${pageUrl}`);
    
  } catch (error) {
    console.error(`Failed to create test page: ${error.message}`);
  }
}