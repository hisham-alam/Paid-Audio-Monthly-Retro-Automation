// PodscribeIntegration.js - Integrates Podscribe CSV processing into the main workflow

/**
 * Process all CSV files from the latest dashboard folder, giving special treatment to Podscribe files
 */
function processCsvFilesWithPodscribe() {
  const parentFolderId = '1DU7SZGZLRP5XMaBoDfcRgeooPTMSYCQz'; // Change this to your parent folder ID
  const SPREADSHEET_ID = '1aalgZUTZ_5fjXsIOhNDc7ntiO-7gCm9i9Xve7enBQHQ'; // Region mapping spreadsheet
  const REGION_SHEET_NAME = 'Regions'; // Tab name in spreadsheet
  
  // Create exchange rate service
  const exchangeService = createExchangeRateService();
  
  try {
    const parentFolder = DriveApp.getFolderById(parentFolderId);
    
    // Find all dashboard-audio_retro_dashboard folders
    const folders = parentFolder.getFolders();
    let latestFolder = null;
    let latestDate = null;
    
    while (folders.hasNext()) {
      const folder = folders.next();
      
      if (folder.getName() === 'dashboard-audio_retro_dashboard') {
        const folderDate = folder.getDateCreated();
        
        if (!latestDate || folderDate > latestDate) {
          latestDate = folderDate;
          latestFolder = folder;
        }
      }
    }
    
    if (!latestFolder) {
      console.log('No dashboard-audio_retro_dashboard folder found');
      return;
    }
    
    console.log(`Using folder: ${latestFolder.getName()} (created: ${latestDate})`);
    
    // Find CSV files in the latest folder
    const fileIterator = latestFolder.getFiles();
    const csvArray = [];
    let podscribeFile = null;
    
    // Track successfully processed files
    const processedFiles = [];
    
    while (fileIterator.hasNext()) {
      const file = fileIterator.next();
      
      // Check if it's a CSV file
      if (file.getMimeType() === 'text/csv' || 
          file.getName().toLowerCase().endsWith('.csv')) {
        
        // Special handling for Podscribe file
        const fileName = file.getName().toLowerCase();
        const fileContent = file.getBlob().getDataAsString();
        const header = fileContent.split('\n')[0].toLowerCase();
        
        if (fileName.includes('podscribe') || 
            (header.includes('impression') && (header.includes('visitor') || header.includes('unique')))) {
          console.log(`Found Podscribe file: ${file.getName()}`);
          podscribeFile = file;
        } else {
          // Regular CSV files added to array
          csvArray.push(file);
        }
      }
    }
    
    if (csvArray.length === 0 && !podscribeFile) {
      console.log('No CSV files found in folder');
      return;
    }
    
    // Generate filename with timestamp
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
    const docName = `combined_csv_data_${timestamp}`;
    
    // Create new Google Doc with error handling
    console.log('Creating new Google Doc...');
    let doc, docId;
    
    try {
      doc = DocumentApp.create(docName);
      docId = doc.getId();
      console.log(`Doc created with ID: ${docId}`);
      
      // Save and close the initial document
      doc.saveAndClose();
      console.log('Initial document saved and closed');
      
      // Add a delay to ensure document is fully saved
      Utilities.sleep(3000); // Increased delay for better reliability
    } catch (docError) {
      console.error(`Error creating document: ${docError.message}`);
      throw new Error(`Failed to create document: ${docError.message}`);
    }
    
    // Reopen the document with error handling
    console.log('Reopening document...');
    let reopenedDoc, body;
    
    try {
      reopenedDoc = DocumentApp.openById(docId);
      body = reopenedDoc.getBody();
      console.log('Document reopened successfully');
    } catch (reopenError) {
      console.error(`Error reopening document: ${reopenError.message}`);
      throw new Error(`Failed to reopen document: ${reopenError.message}`);
    }
    
    // Clear any default content
    try {
      body.clear();
      console.log('Document cleared successfully');
    } catch (clearError) {
      console.error(`Error clearing document: ${clearError.message}`);
      // Continue even if clearing fails
    }
    
    // Process the Podscribe file first with special handling if found
    if (podscribeFile) {
      console.log(`Processing Podscribe file: ${podscribeFile.getName()}`);
      try {
        // Add header for the Podscribe section
        try {
          const header = body.appendParagraph('Podscribe Data Analysis');
          header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
          header.setBold(true);
          console.log('Added Podscribe section header');
        } catch (headerError) {
          console.error(`Error adding header: ${headerError.message}`);
          // Continue even if header fails
        }
        
        // Get region mapping
        console.log('Getting region mapping...');
        const regionMap = getRegionMapping(SPREADSHEET_ID, REGION_SHEET_NAME);
        if (!regionMap) {
          console.log('⚠️ Failed to load region mapping. Using default processing.');
        } else {
          console.log(`Successfully loaded ${Object.keys(regionMap).length} region mappings`);
        }
        
        // Process the Podscribe data
        console.log('Processing Podscribe data...');
        const podscribeData = processPodscribeFile(podscribeFile, regionMap, exchangeService);
        
        if (podscribeData) {
          console.log('Podscribe data processed successfully');
          // Format as markdown and add to document
          const markdownText = formatPodscribeDataAsMarkdown(podscribeData);
          console.log(`Generated ${markdownText.length} characters of formatted data`);
          
          try {
            body.appendParagraph(markdownText);
            console.log('✅ Added processed Podscribe data to document');
          // Mark as processed
          processedFiles.push(podscribeFile);
          } catch (appendError) {
            console.error(`Error adding formatted data to document: ${appendError.message}`);
            // Try simpler approach
            try {
              body.appendParagraph('See processed data below:');
              const chunks = splitIntoChunks(markdownText, 5000);
              chunks.forEach((chunk, index) => {
                body.appendParagraph(`Part ${index + 1}/${chunks.length}`);
                body.appendParagraph(chunk);
              });
              console.log('Added Podscribe data in chunks');
            } catch (chunkError) {
              console.error(`Error adding data chunks: ${chunkError.message}`);
            }
          }
        } else {
          console.log('Podscribe data processing failed, falling back to raw data');
          // Fallback to raw CSV if processing fails
          try {
            body.appendParagraph('Failed to process Podscribe data in specialized format. Including raw data:');
            body.appendParagraph('─'.repeat(50));
            const rawData = podscribeFile.getBlob().getDataAsString();
            body.appendParagraph(rawData.substring(0, 100000)); // Limit size to avoid issues
            console.log('⚠️ Added raw Podscribe data (processing failed)');
            // Mark as processed even if we had to use raw data
            processedFiles.push(podscribeFile);
          } catch (rawDataError) {
            console.error(`Error adding raw data: ${rawDataError.message}`);
          }
        }
        
        // Add spacing
        body.appendParagraph('\n\n');
        body.appendParagraph('─'.repeat(50));
        body.appendParagraph('\n\n');
      } catch (error) {
        console.error(`Error processing Podscribe file: ${error}`);
        // If Podscribe processing fails completely, add to regular CSV array for standard processing
        csvArray.push(podscribeFile);
        // Don't mark as processed yet, it will be marked in the regular CSV processing section
      }
    }
    
    // Add a header for other CSV files
    if (csvArray.length > 0) {
      const otherHeader = body.appendParagraph('Other CSV Files');
      otherHeader.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      otherHeader.setBold(true);
      body.appendParagraph('\n');
    }
    
    // Process remaining CSV files normally
    for (let i = 0; i < csvArray.length; i++) {
      try {
        const csvFile = csvArray[i];
        console.log(`Processing regular CSV file: ${csvFile.getName()}`);
        
        try {
          // Add CSV filename as header
          const fileHeader = body.appendParagraph(csvFile.getName());
          fileHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
          fileHeader.setBold(true);
          
          // Add separator
          body.appendParagraph('─'.repeat(50));
        } catch (headerError) {
          console.error(`Error adding header for ${csvFile.getName()}: ${headerError.message}`);
          // Continue even if header fails
        }
        
        // Get CSV content
        console.log(`Getting content for ${csvFile.getName()}...`);
        let csvContent;
        try {
          csvContent = csvFile.getBlob().getDataAsString();
        } catch (contentError) {
          console.error(`Error getting content for ${csvFile.getName()}: ${contentError.message}`);
          csvContent = `[Error reading file: ${contentError.message}]`;
        }
        
        // Add CSV content with error handling
        try {
          if (csvContent.length > 100000) {
            // If content is very large, split it
            console.log(`File ${csvFile.getName()} is large (${csvContent.length} chars), adding in chunks`);
            body.appendParagraph(`Content is large (${csvContent.length} characters), showing first portion:`);
            body.appendParagraph(csvContent.substring(0, 100000));
          } else {
            body.appendParagraph(csvContent);
          }
          
          // Add spacing between files (except after last one)
          if (i < csvArray.length - 1) {
            body.appendParagraph('\n\n');
          }
          
          console.log(`Added ${csvFile.getName()} to document`);
        } catch (appendError) {
          console.error(`Error adding content for ${csvFile.getName()}: ${appendError.message}`);
        }
        
        // Mark file as successfully processed regardless of content errors
        // This is to ensure we don't get stuck in a loop if one file is problematic
        processedFiles.push(csvFile);
        
      } catch (fileError) {
        console.error(`Error processing file ${csvArray[i].getName()}:`, fileError);
      }
    }
    
    // Save the document with error handling
    console.log('Saving final document...');
    try {
      reopenedDoc.saveAndClose();
      console.log('Document saved and closed successfully');
      
      // Increased delay before file operations
      Utilities.sleep(3000);
    } catch (saveError) {
      console.error(`Error saving document: ${saveError.message}`);
      throw new Error(`Failed to save document: ${saveError.message}`);
    }
    
    // Move document to the parent folder using Drive API
    try {
      console.log('Moving document to parent folder...');
      const docFile = DriveApp.getFileById(docId);
      if (!docFile) {
        console.error('Could not find document by ID');
      } else {
        docFile.moveTo(parentFolder);
        console.log(`Created and moved: ${docName}`);
      }
    } catch (moveError) {
      console.error(`Document created but couldn't move: ${moveError.message}`);
    }
    
    console.log(`Preparing to delete ${processedFiles.length} processed files`);
    
    // Delete processed CSV files
    for (const file of processedFiles) {
      try {
        file.setTrashed(true);
        console.log(`Deleted CSV: ${file.getName()}`);
      } catch (deleteError) {
        console.log(`Couldn't delete CSV ${file.getName()}: ${deleteError.message}`);
      }
    }
    
    // Only delete folder if all files were processed successfully
    try {
      const allFilesCount = csvArray.length + (podscribeFile ? 1 : 0);
      console.log(`Files processed: ${processedFiles.length} of ${allFilesCount} total`);
      
      if (processedFiles.length === allFilesCount) {
        try {
          latestFolder.setTrashed(true);
          console.log(`Deleted folder: ${latestFolder.getName()}`);
        } catch (folderError) {
          console.error(`Couldn't delete folder: ${folderError.message}`);
        }
      } else {
        console.log(`Kept folder due to unprocessed files. Processed ${processedFiles.length} of ${allFilesCount} files.`);
        
        // Log which files weren't processed for debugging
        if (podscribeFile && !processedFiles.includes(podscribeFile)) {
          console.log(`- Podscribe file not processed: ${podscribeFile.getName()}`);
        }
        
        csvArray.forEach(file => {
          if (!processedFiles.includes(file)) {
            console.log(`- File not processed: ${file.getName()}`);
          }
        });
      }
    } catch (finalError) {
      console.error(`Error in final cleanup: ${finalError.message}`);
    }
    
  } catch (error) {
    console.error('Error processing CSV files:', error);
    throw error; // Re-throw to see the full error in the logs
  }
}

/**
 * Split text into manageable chunks
 * @param {string} text - Text to split
 * @param {number} chunkSize - Maximum size of each chunk
 * @returns {string[]} - Array of text chunks
 */
function splitIntoChunks(text, chunkSize) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
}

/**
 * Get region mapping from the specified Google Sheet
 */
function getRegionMapping(spreadsheetId, sheetName) {
  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      console.log(`⚠️ Sheet tab named '${sheetName}' not found.`);
      return null;
    }
    
    const regionData = sheet.getDataRange().getValues();
    const regionMap = {};
    const regionHeaders = regionData[0].map(h => h.toLowerCase());
    const countryCodeIndex = regionHeaders.indexOf('2-iso');
    const regionIndex = regionHeaders.indexOf('region');
    
    if (countryCodeIndex === -1 || regionIndex === -1) {
      console.log("⚠️ Could not find '2-ISO' or 'Region' columns in the Google Sheet.");
      return null;
    }
    
    console.log('Found region mapping columns in spreadsheet');
    
    for (let i = 1; i < regionData.length; i++) {
      const countryCode = regionData[i][countryCodeIndex];
      const region = regionData[i][regionIndex];
      if (countryCode && region) {
        regionMap[countryCode.toLowerCase()] = region;
      }
    }
    
    console.log(`✅ Loaded ${Object.keys(regionMap).length} country-to-region mappings`);
    return regionMap;
    
  } catch (error) {
    console.error(`Error loading region mapping: ${error.message}`);
    return null;
  }
}

/**
 * Process the Podscribe CSV file and extract relevant metrics
 */
function processPodscribeFile(csvFile, regionMap, exchangeRateService) {
  // Currency conversion is now handled by the SimpleCurrencyConverter
  console.log(`Processing file: ${csvFile.getName()}`);
  
  try {
    // Get file content
    const content = csvFile.getBlob().getDataAsString();
    const rows = Utilities.parseCsv(content);
    
    if (rows.length < 2) {
      console.log('❌ CSV file is empty or has no data rows');
      return null;
    }
    
    // Extract headers and convert to lowercase for case-insensitive matching
    const headers = rows[0].map(h => h.toLowerCase());
    console.log('CSV Headers:', headers);
    
    // Find the indexes of key columns
    const columnIndexes = {
      date: headers.findIndex(h => h.includes('date') || h.includes('day')),
      impressions: headers.findIndex(h => h.includes('impression')),
      visitors: headers.findIndex(h => h.includes('visitor') || h.includes('unique')),
      publisher: headers.findIndex(h => h.includes('publisher') || h.includes('show') || h.includes('podcast')),
      spend: headers.findIndex(h => h.includes('spend') || h.includes('cost')),
      geo: headers.findIndex(h => h.includes('geo') || h.includes('region') || h.includes('country'))
    };
    
    // Log the column indexes for debugging
    console.log('Column indexes:', columnIndexes);
    
    // Check if essential columns were found
    const missingColumns = Object.entries(columnIndexes)
      .filter(([key, index]) => index === -1)
      .map(([key]) => key);
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing essential columns: ${missingColumns.join(', ')}`);
      console.log('Column mapping might need manual adjustment for this file format');
    }
    
    // Extract and aggregate data
    const aggregatedData = {
      totalImpressions: 0,
      totalVisitors: 0,
      totalSpend: 0,
      totalSpendGbp: 0, // Track spend in GBP too
      byMonth: {},
      byPublisher: {},
      byRegion: {},
      publisherShows: {} // Track unique shows per publisher
    };
    
    // Process each data row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip rows that don't have enough columns
      if (row.length < Math.max(...Object.values(columnIndexes).filter(idx => idx !== -1))) {
        continue;
      }
      
      // Extract values, handling missing columns
      const rowData = {
        date: columnIndexes.date !== -1 ? row[columnIndexes.date] : null,
        impressions: columnIndexes.impressions !== -1 ? parseFloat(row[columnIndexes.impressions]) || 0 : 0,
        visitors: columnIndexes.visitors !== -1 ? parseFloat(row[columnIndexes.visitors]) || 0 : 0,
        publisher: columnIndexes.publisher !== -1 ? row[columnIndexes.publisher] : 'Unknown',
        spend: columnIndexes.spend !== -1 ? parseFloat(row[columnIndexes.spend]) || 0 : 0,
        geo: columnIndexes.geo !== -1 ? row[columnIndexes.geo] : 'Unknown'
      };
      
      // Special handling for publisher and show data
      // Look for show column (usually in column K, but search dynamically)
      // First check fixed columns I and K for backward compatibility
      const publisherColI = row[8] || ''; // Column I (0-indexed, so 8 is the 9th column)
      const showColK = row[10] || '';    // Column K (0-indexed, so 10 is the 11th column)
      
      // Find show and campaign columns by looking for relevant keywords in headers
      const showColIndex = headers.findIndex(h => h.includes('show') || h.includes('episode'));
      const campaignColIndex = headers.findIndex(h => h.includes('campaign'));
      
      // First try show column, then fall back to campaign column if show is empty
      const campaignColJ = row[9] || ''; // Column J (0-indexed, so 9 is the 10th column)
      const campaignValue = (campaignColIndex !== -1) ? row[campaignColIndex] || '' : campaignColJ;
      
      // Track the source of the show name (show column or campaign column)
      let showSource = '';
      let rawShowValue = '';
      
      // Prioritize using the show column value
      if (showColIndex !== -1 && row[showColIndex]) {
        rawShowValue = row[showColIndex];
        showSource = 'show';
      } else if (showColK) {
        rawShowValue = showColK;
        showSource = 'show';
      } else if (campaignValue) {
        rawShowValue = campaignValue;
        showSource = 'campaign';
      } else {
        rawShowValue = '';
        showSource = '';
      }
      
      // Apply name cleaning if needed (only for campaign source)
      const showValue = cleanShowName(rawShowValue, showSource, rowData.publisher);
      
      // Track unique shows per publisher using both dynamic publisher name and fixed column
      const publisherName = rowData.publisher; // Use the same publisher value as used for performance metrics
      
      // Only add show if it's not empty (wasn't filtered out by cleaning rules)
      if (publisherName && publisherName !== 'Unknown' && showValue && showValue !== 'Unknown') {
        if (!aggregatedData.publisherShows[publisherName]) {
          aggregatedData.publisherShows[publisherName] = new Set();
        }
        aggregatedData.publisherShows[publisherName].add(showValue);
      }
      
      // Skip rows with invalid data
      if (isNaN(rowData.impressions) && isNaN(rowData.visitors) && isNaN(rowData.spend)) {
        continue;
      }
      
      // Add to totals
      aggregatedData.totalImpressions += rowData.impressions;
      aggregatedData.totalVisitors += rowData.visitors;
      aggregatedData.totalSpend += rowData.spend;
      
      // Convert USD to GBP using exchange rate service
      const spendGbp = exchangeRateService ? exchangeRateService.convertUsdToGbp(rowData.spend) : rowData.spend * 0.74;
      aggregatedData.totalSpendGbp += spendGbp;
      
      // Aggregate by month
      let monthKey = 'Unknown';
      if (rowData.date) {
        try {
          const date = new Date(rowData.date);
          if (!isNaN(date.getTime())) {
            // Format as YYYY-MM
            monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
        } catch (e) {
          console.log(`Could not parse date: ${rowData.date}`);
        }
      }
      
      if (!aggregatedData.byMonth[monthKey]) {
        aggregatedData.byMonth[monthKey] = {
          impressions: 0,
          visitors: 0,
          spend: 0,
          spendGbp: 0
        };
      }
      
      aggregatedData.byMonth[monthKey].impressions += rowData.impressions;
      aggregatedData.byMonth[monthKey].visitors += rowData.visitors;
      aggregatedData.byMonth[monthKey].spend += rowData.spend;
      aggregatedData.byMonth[monthKey].spendGbp += spendGbp;
      
      // Aggregate by publisher
      if (!aggregatedData.byPublisher[rowData.publisher]) {
        aggregatedData.byPublisher[rowData.publisher] = {
          impressions: 0,
          visitors: 0,
          spend: 0,
          spendGbp: 0
        };
      }
      
      aggregatedData.byPublisher[rowData.publisher].impressions += rowData.impressions;
      aggregatedData.byPublisher[rowData.publisher].visitors += rowData.visitors;
      aggregatedData.byPublisher[rowData.publisher].spend += rowData.spend;
      aggregatedData.byPublisher[rowData.publisher].spendGbp += spendGbp;
      
      // Aggregate by region using mapping
      let region = "Unknown";
      if (rowData.geo && regionMap) {
        // Try to find the region for this geo code
        const geoCode = rowData.geo.trim().toLowerCase();
        region = regionMap[geoCode] || "Unknown";
      }
      
      if (!aggregatedData.byRegion[region]) {
        aggregatedData.byRegion[region] = {
          impressions: 0,
          visitors: 0,
          spend: 0,
          spendGbp: 0
        };
      }
      
      aggregatedData.byRegion[region].impressions += rowData.impressions;
      aggregatedData.byRegion[region].visitors += rowData.visitors;
      aggregatedData.byRegion[region].spend += rowData.spend;
      aggregatedData.byRegion[region].spendGbp += spendGbp;
    }
    
    console.log('✅ Data extraction complete');
    console.log(`Total Impressions: ${aggregatedData.totalImpressions}`);
    console.log(`Total Visitors: ${aggregatedData.totalVisitors}`);
    console.log(`Total Spend: ${aggregatedData.totalSpend}`);
    
    return aggregatedData;
    
  } catch (error) {
    console.error(`Error processing Podscribe file: ${error.message}`);
    return null;
  }
}

/**
 * Clean show names based on vendor-specific rules
 * Only cleans campaign names, not show names
 * 
 * @param {string} showName - The raw show name from campaign column
 * @param {string} source - Indicates if this is from 'show' or 'campaign' column
 * @param {string} publisher - The publisher name for publisher-specific rules
 * @return {string} - The cleaned show name or empty string if it should be excluded
 */
function cleanShowName(showName, source, publisher) {
  // Only clean campaign names, not actual show names
  if (source !== 'campaign') {
    return showName;
  }
  
  // Normalize the name for case-insensitive matching
  const nameLower = showName.toLowerCase().trim();
  
  // NPR patterns
  if (nameLower.startsWith('npr_ron_')) {
    // Extract geography
    const nprMatch = nameLower.match(/npr_ron_([a-z]+)/i);
    if (nprMatch) {
      const geography = nprMatch[1];
      
      // Special case for AV
      if (geography.toLowerCase() === 'av') {
        return 'RON AV - Global';
      }
      
      // Regular case - capitalize geography properly
      const geoCap = geography.charAt(0).toUpperCase() + geography.slice(1).toLowerCase();
      return `RON - ${geoCap} Geotarget`;
    }
  }
  
  // Direct match for This American Life
  if (nameLower === 'this american life') {
    return 'This American Life';
  }
  
  // BBC patterns
  if (nameLower.startsWith('bbc_')) {
    const bbc_match = nameLower.match(/bbc_([a-z]+)/i);
    if (bbc_match) {
      const geography = bbc_match[1].toLowerCase();
      
      // Geography mappings
      const geoMap = {
        'asia': 'Asia',
        'us': 'US',
        'canada': 'Canada',
        'latam': 'LatAm',
        'northam': 'US',
        'europe': 'Europe'
      };
      
      if (geoMap[geography]) {
        return `Premium Shows - ${geoMap[geography]} Target`;
      }
    }
  }
  
  // ARN patterns
  if (nameLower.startsWith('arn_ron_') || nameLower.startsWith('australian radio network_ron')) {
    return 'Run of Network';
  }
  if (nameLower.startsWith('arn_') || nameLower.startsWith('australian radio network_')) {
    return 'ARN_BUNDLE';
  }
  
  // Mamamia patterns
  if (nameLower.startsWith('mamamia_ron_')) {
    return 'Run of Network';
  }
  
  // NZME individual shows
  if (nameLower === 'the front page' || nameLower.startsWith('nzme_the front page')) {
    return 'The Front Page';
  }
  if (nameLower.includes("zm's fletch, vaughan & hayley")) {
    return 'Fletch, Vaughan, and Hayley';
  }
  if (nameLower.includes('the hauraki big show')) {
    return 'The Hauraki Big Show';
  }
  if (nameLower === 'the country') {
    return 'The Country';
  }
  
  // NZME network mappings
  if (nameLower.startsWith('nzme_acc_') || nameLower.startsWith('nzme_acc')) {
    return 'The ACC Network';
  }
  if (nameLower.startsWith('nzme_newstalk_') || nameLower.startsWith('nzme_newstalk')) {
    return 'Newstalk';
  }
  
  // NZME content bundles (case-insensitive)
  if (nameLower.startsWith('nzme_')) {
    // Check if it's a frontpage reference
    if (nameLower.includes('frontpage') || nameLower.includes('front page')) {
      return 'The Front Page';
    }
    
    // Extract the bundle type from nzme_TYPE_Q1 2025 format
    const bundleTypeMatch = nameLower.match(/nzme_([a-z0-9 ]+)_/i);
    if (bundleTypeMatch && bundleTypeMatch[1]) {
      const bundleType = bundleTypeMatch[1].trim();
      // Return a special format that marks it as bundle but preserves type
      return `NZME_BUNDLE:${bundleType}`;
    }
    
    // For all other NZME bundles, return a generic bundle marker
    return 'NZME_BUNDLE:generic';
  }
  
  // Genuina Media individual show
  if (nameLower.includes('cafe com adm') || nameLower.includes('by leandro vieira')) {
    return 'Cafe Con Adm';
  }
  
  // Genuina geographic RON patterns
  const genuinaGeoPattern = /(genuina_|genuina)(mexico|colombia|argentina|chile|brazil)_ron_/i;
  const geoMatch = nameLower.match(genuinaGeoPattern);
  if (geoMatch) {
    const geo = geoMatch[2];
    const geoCap = geo.charAt(0).toUpperCase() + geo.slice(1).toLowerCase();
    return `RON - ${geoCap} Geotarget`;
  }
  
  // Other Genuina content bundles
  if (nameLower.startsWith('genuina_') || nameLower.startsWith('genuina ')) {
    return 'GENUINA_BUNDLE';
  }
  
  // Marketplace (American Public Media)
  if (nameLower.includes('marketplace') && publisher.toLowerCase().includes('american public media')) {
    return 'RON - US Geotarget';
  }
  
  // Crooked Media
  if (nameLower === 'pod save the world') {
    return 'Pod Save the World';
  }
  if (nameLower === 'pod save the uk') {
    return 'Pod Save the UK';
  }
  
  // Libsyn
  if (nameLower.startsWith('abc_ron news_')) {
    return 'ABC News RON';
  }
  
  // MediaWorks
  if (nameLower.startsWith('mediaworks_mw ron_')) {
    return 'Mediaworks RON';
  }
  if (nameLower.startsWith('mediaworks_sxm ron_')) {
    return 'SXM RON';
  }
  
  // If we can't determine the pattern, return empty string
  // This means the show won't be included in the output
  return '';
}

/**
 * Format the processed Podscribe data as markdown text for AI agent input
 */
function formatPodscribeDataAsMarkdown(data) {
  let markdown = '';
  
  // Helper function to properly escape CSV values
  function escapeCSV(value) {
    // Convert to string and check if it needs quotes
    const str = String(value);
    if (str.includes(',') || str.includes('"')) {
      // Escape any double quotes by doubling them
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  
  // Add header
  markdown += '# Podscribe Performance Data\n\n';
  
  // Note: Summary section removed as it's redundant with monthly overview table
  
  // Add monthly data
  markdown += '## Monthly Performance\n\n';
  markdown += 'Month,Impressions,Visitors,Spend (USD),Spend (GBP)\n';
  
  const sortedMonths = Object.keys(data.byMonth).sort();
  for (const month of sortedMonths) {
    const monthData = data.byMonth[month];
    markdown += `${escapeCSV(month)},${escapeCSV(monthData.impressions.toLocaleString())},${escapeCSV(monthData.visitors.toLocaleString())},${escapeCSV('$' + monthData.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))},${escapeCSV('£' + monthData.spendGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}\n`;
  }
  
  markdown += '\n';
  
  // Add publisher data
  markdown += '## Publisher Performance\n\n';
  markdown += 'Publisher,Impressions,Visitors,Spend (USD),Spend (GBP)\n';
  
  // Sort publishers by impressions
  const sortedPublishers = Object.keys(data.byPublisher).sort((a, b) => 
    data.byPublisher[b].impressions - data.byPublisher[a].impressions
  );
  
  for (const publisher of sortedPublishers) {
    if (publisher === 'Unknown' && sortedPublishers.length > 1) continue; // Skip Unknown if there are other publishers
    
    const pubData = data.byPublisher[publisher];
    
    // Skip publishers with £0 spend
    if (pubData.spendGbp > 0) {
      markdown += `${escapeCSV(publisher)},${escapeCSV(pubData.impressions.toLocaleString())},${escapeCSV(pubData.visitors.toLocaleString())},${escapeCSV('$' + pubData.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))},${escapeCSV('£' + pubData.spendGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}\n`;
    }
  }
  
  markdown += '\n';
  
  // Add region data
  markdown += '## Regional Performance\n\n';
  markdown += 'Region,Impressions,Visitors,Spend (USD),Spend (GBP)\n';
  
  // Sort regions by impressions
  const sortedRegions = Object.keys(data.byRegion).sort((a, b) => 
    data.byRegion[b].impressions - data.byRegion[a].impressions
  );
  
  for (const region of sortedRegions) {
    if (region === 'Unknown' && sortedRegions.length > 1) continue; // Skip Unknown if there are other regions
    
    const regionData = data.byRegion[region];
    
    // Skip regions with £0 spend
    if (regionData.spendGbp > 0) {
      markdown += `${escapeCSV(region)},${escapeCSV(regionData.impressions.toLocaleString())},${escapeCSV(regionData.visitors.toLocaleString())},${escapeCSV('$' + regionData.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))},${escapeCSV('£' + regionData.spendGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}\n`;
    }
  }
  
  // Add publisher-show data - this is the new table
  markdown += '\n## Publisher Shows\n\n';
  markdown += 'Publisher,Shows\n';

  // Make sure all publishers from performance table are included in shows table
  // even if they don't have any shows detected
  for (const publisher of Object.keys(data.byPublisher)) {
    if (!data.publisherShows[publisher]) {
      data.publisherShows[publisher] = new Set();
    }
  }

  // Sort publishers alphabetically
  const sortedPublishersForShows = Object.keys(data.publisherShows).sort();
  
  for (const publisher of sortedPublishersForShows) {
    if (publisher === 'Unknown' && sortedPublishersForShows.length > 1) continue; // Skip Unknown if there are other publishers
    
    // Only include publishers with spend > 0
    const pubData = data.byPublisher[publisher];
    if (!pubData || pubData.spendGbp <= 0) continue;
    
    // Convert Set to Array and sort alphabetically
    const shows = Array.from(data.publisherShows[publisher]).sort();
    
    // Special handling for network consolidation
    const publisherLower = publisher.toLowerCase();
    const formattedShows = [];
    
    // Australian Radio Network (ARN) special handling
    if (publisherLower.includes('australian radio network') || publisherLower.includes('arn')) {
      let hasRon = false;
      let bundleCount = 0;
      
      // Count non-RON items (bundles)
      shows.forEach(show => {
        if (show === 'Run of Network') {
          hasRon = true;
        } else if (show === 'ARN_BUNDLE') {
          bundleCount++;
        }
      });
      
      // Only add RON if present
      if (hasRon) {
        formattedShows.push('Run of Network');
      }
      
      // Add bundle count - dynamically calculated based on actual data
      if (bundleCount > 0) {
        formattedShows.push(`${bundleCount} Various content-category bundles`);
      }
    } 
    // NZME special handling for bundles
    else if (publisherLower.includes('nzme')) {
      // Extract named shows and count bundles
      
      // First add all specifically named shows
      const namedShows = ['The Front Page', 'Fletch, Vaughan, and Hayley', 'The Hauraki Big Show', 
                          'The Country', 'The ACC Network', 'Newstalk'];
      
      // Track unique bundle types
      const bundleTypes = new Set();
      
      // First pass: Add all specifically named shows
      shows.forEach(show => {
        if (namedShows.includes(show)) {
          // It's a named show - add it if not already present
          if (!formattedShows.includes(show)) {
            formattedShows.push(show);
          }
        } 
        // Check for bundle markers with format NZME_BUNDLE:type
        else if (show.startsWith('NZME_BUNDLE:')) {
          const bundleType = show.substring('NZME_BUNDLE:'.length);
          if (bundleType && bundleType.trim() !== '') {
            bundleTypes.add(bundleType);
          }
        }
      });
      
      // Count unique bundle types
      const bundleCount = bundleTypes.size;
      
      // Add bundle count - dynamically calculated based on actual data
      if (bundleCount > 0) {
        formattedShows.push(`${bundleCount} Various content-category bundles`);
      }
    }
    // Genuina Media bundle handling
    else if (publisherLower.includes('genuina')) {
      // Extract named shows and RON geotargets
      const geoTargets = [];
      const namedShows = ['Cafe Con Adm'];
      let bundleCount = 0;
      
      shows.forEach(show => {
        if (namedShows.includes(show)) {
          // It's a specific named show
          if (!formattedShows.includes(show)) {
            formattedShows.push(show);
          }
        } else if (show.startsWith('RON - ') && show.endsWith(' Geotarget')) {
          // It's a geotarget
          if (!geoTargets.includes(show)) {
            geoTargets.push(show);
          }
        } else if (show === 'GENUINA_BUNDLE') {
          // Count as a bundle
          bundleCount++;
        }
      });
      
      // Add all geotargets
      geoTargets.forEach(target => formattedShows.push(target));
      
      // Add bundle count - dynamically calculated based on actual data
      if (bundleCount > 0) {
        formattedShows.push(`${bundleCount} Various content-category bundles`);
      }
    }
    // Default handling for other publishers
    else {
      // Deduplicate and filter out empty strings and special bundle markers
      const uniqueShows = [...new Set(shows.filter(show => {
        // Exclude empty strings and all bundle markers
        return show.trim() !== '' && 
               !show.startsWith('NZME_BUNDLE:') &&
               !show.startsWith('ARN_BUNDLE:') &&
               !show.startsWith('GENUINA_BUNDLE:') &&
               show !== 'NZME_BUNDLE' && 
               show !== 'ARN_BUNDLE' && 
               show !== 'GENUINA_BUNDLE';
      }))];
      formattedShows.push(...uniqueShows);
    }
    
    // Format the CSV properly:
    // 1. Each show is a separate cell in the row
    // 2. The publisher and each show get escaped individually
    const showsFormattedForCsv = formattedShows.map(show => escapeCSV(show));
    
    // Only include this publisher if there are actually shows to display
    if (showsFormattedForCsv.length > 0) {
      markdown += `${escapeCSV(publisher)},${showsFormattedForCsv.join(',')}\n`;
    }
  }
  
  console.log('✅ Markdown formatting complete');
  return markdown;
}