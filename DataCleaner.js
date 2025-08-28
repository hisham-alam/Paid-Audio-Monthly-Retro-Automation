/**
 * This script analyzes a data CSV from a Google Drive folder and uses a specific 
 * Google Sheet for region mapping.
 * It calculates the total spend per region AND per publisher, grouped by month.
 */
function analyzeSpendByMonth() {
  // *****************************************************************************************
  // START OF PLACEHOLDERS - PLEASE FILL IN THESE VALUES
  // *****************************************************************************************

  // ID of the Google Drive folder containing your data CSV file.
  const FOLDER_ID = '1DU7SZGZLRP5XMaBoDfcRgeooPTMSYCQz'; 
  
  // ID of the Google Sheet with the country-to-region mapping.
  const SPREADSHEET_ID = '1aalgZUTZ_5fjXsIOhNDc7ntiO-7gCm9i9Xve7enBQHQ';
  
  // The name of the *tab* in your spreadsheet that contains the region mapping.
  const REGION_SHEET_NAME = 'Regions'; 

  // *****************************************************************************************
  // END OF PLACEHOLDERS
  // *****************************************************************************************

  try {
    // --- Step 1: Find and load the data CSV file ---
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    let dataRows = null;

    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === 'text/csv') {
        const content = file.getBlob().getDataAsString();
        const header = content.split('\n')[0].toLowerCase();
        
        if (header.includes('geo') && header.includes('spend')) {
          dataRows = Utilities.parseCsv(content);
          console.log(`Found data file: ${file.getName()}`);
          break;
        }
      }
    }

    if (!dataRows) {
      throw new Error("Could not find a CSV file with 'Geo' and 'Spend' columns in the folder.");
    }

    // --- Step 2: Get and process region mapping from the Google Sheet ---
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

    // --- Step 3: Analyze the spend data by month ---
    const monthlyTotals = {};
    const dataHeaders = dataRows[0].map(h => h.toLowerCase());
    const dayIndex = dataHeaders.indexOf('day');
    const geoIndex = dataHeaders.indexOf('geo');
    const publisherIndex = dataHeaders.indexOf('publisher');
    const spendIndex = dataHeaders.indexOf('spend');

    if (dayIndex === -1 || publisherIndex === -1) {
        throw new Error("Could not find 'Day' or 'Publisher' columns in the data CSV.");
    }

    for (let i = 1; i < dataRows.length; i++) {
      const row = dataRows[i];
      const spend = parseFloat(row[spendIndex]);
      const date = new Date(row[dayIndex]);

      if (isNaN(spend) || isNaN(date.getTime())) {
          continue; // Skip rows with invalid spend or date
      }
      
      // Format the month as "YYYY-MM" to use as a key
      const monthKey = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2);

      // Initialize the data structure for the month if it doesn't exist
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = {
          byRegion: {},
          byPublisher: {}
        };
      }

      // Calculation 1: Spend by Region
      const geo = row[geoIndex];
      if (geo) {
        const region = regionMap[geo.toLowerCase()];
        if (region) {
          monthlyTotals[monthKey].byRegion[region] = (monthlyTotals[monthKey].byRegion[region] || 0) + spend;
        }
      }
      
      // Calculation 2: Spend by Publisher
      const publisher = row[publisherIndex];
      if (publisher) {
        monthlyTotals[monthKey].byPublisher[publisher] = (monthlyTotals[monthKey].byPublisher[publisher] || 0) + spend;
      }
    }

    // --- Step 4: Log the final, organized results ---
    console.log('--- Monthly Spend Analysis ---');
    for (const month in monthlyTotals) {
      console.log(`\n--- ${month} ---`);

      // Log Region Totals
      console.log('Total Spend by Region:');
      const regions = monthlyTotals[month].byRegion;
      for (const region in regions) {
        console.log(`  ${region}: ${regions[region].toFixed(2)}`);
      }

      // Log Publisher Totals
      console.log('\nTotal Spend by Publisher:');
      const publishers = monthlyTotals[month].byPublisher;
      for (const publisher in publishers) {
        console.log(`  ${publisher}: ${publishers[publisher].toFixed(2)}`);
      }
    }
    console.log('\n------------------------------');

  } catch (e) {
    console.error(`An error occurred: ${e.message}`);
  }
}