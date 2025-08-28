// Main.gs - Entry point
// Includes show analysis integration

// Note: CONFLUENCE_PARENT_PAGE_ID is defined in confluenceapi.js and shared across all files

/**
 * Custom function to find Audio Monthly Retro JSON files
 */
function findAudioRetroFiles() {
  console.log('Starting search for Audio Monthly Retro JSON files...');
  const files = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Only look at files from last 7 days
  console.log(`Using cutoff date: ${cutoffDate}`);
  
  try {
    // Search for Google Docs with our UPDATED naming pattern for Audio Retro
    const searchQuery = 'title contains "Audio Monthly Retro JSON -" and mimeType = "application/vnd.google-apps.document"';
    console.log(`Using search query: ${searchQuery}`);
    const fileIterator = DriveApp.searchFiles(searchQuery);
    console.log('Search executed successfully');
    
    let totalFiles = 0;
    let matchedFiles = 0;
    
    while (fileIterator.hasNext()) {
      const file = fileIterator.next();
      totalFiles++;
      
      // Check if file was created recently
      const createDate = file.getDateCreated();
      console.log(`Checking file: ${file.getName()} (created: ${createDate})`);
      
      if (createDate > cutoffDate) {
        // Verify the exact naming pattern (YYYY/MM/DD at the end)
        const fileName = file.getName();
        const datePattern = /Audio Monthly Retro JSON - (\d{4})\/(\d{2})\/(\d{2})$/;
        
        if (datePattern.test(fileName)) {
          console.log(`✓ File matches pattern: ${fileName}`);
          files.push(file);
          matchedFiles++;
        } else {
          console.log(`✗ File does not match exact pattern: ${fileName}`);
        }
      } else {
        console.log(`✗ File too old: ${file.getName()}, created ${createDate}`);
      }
    }
    
    console.log(`Search complete. Found ${totalFiles} files, ${matchedFiles} match criteria.`);
    return files;
    
  } catch (error) {
    console.error('Error in findAudioRetroFiles:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error; // Re-throw to be caught by the calling function
  }
}

/**
 * Main function to run periodically (set up time-based trigger)
 */
function main() {
  console.log('===== STARTING MAIN PROCESS =====');
  try {
    console.log('Looking for JSON files to process...');
    // Find new JSON files matching our pattern - using our updated function
    const newFiles = findAudioRetroFiles();
    
    console.log(`File scan complete - found ${newFiles ? newFiles.length : 'NULL'} files`);
    
    if (!newFiles || newFiles.length === 0) {
      console.log('No files to process - exiting');
      return;
    }
    
    console.log(`Starting Audio Retro processing...`);
    console.log(`Found ${newFiles.length} new file(s) to process`);
    
    // Log file names for debugging
    newFiles.forEach((file, index) => {
      console.log(`File ${index+1}: ${file.getName()} (ID: ${file.getId()})`);
    });
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each file
    newFiles.forEach(file => {
      try {
        console.log(`Processing file: ${file.getName()}`);
        const result = processRetroFile(file);
        console.log(`Process result: ${result}`);
        
        if (result === 'created') {
          successCount++;
          console.log('✓ File processed successfully');
        } else if (result === 'exists') {
          skippedCount++;
          console.log('⚠️ Page already exists - skipped');
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to process ${file.getName()}:`, error.toString());
        // Log more detailed error information
        console.error('Error details:', error);
        if (error.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
    });
    
    // Summary log
    console.log(`Processing complete. Created: ${successCount}, Already existed: ${skippedCount}, Errors: ${errorCount}`);
    
  } catch (error) {
    // Only catastrophic errors get here (like Drive API issues)
    console.error('Critical error in main process:', error.toString());
    console.error('Error details:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    // Don't throw - let the trigger continue running
  }
  console.log('===== MAIN PROCESS COMPLETED =====');
}

/**
 * Process a single retro JSON file (Google Doc)
 * Returns: 'created' if new page was created, 'exists' if page already existed
 */
function processRetroFile(file) {
  console.log(`Processing: ${file.getName()}`);
  
  // Read content from Google Doc
  const doc = DocumentApp.openById(file.getId());
  const docText = doc.getBody().getText();
  
  // Check for override keyword
  let forceCreate = false;
  let jsonContent = docText;
  
  if (docText.toLowerCase().includes('override')) {
    console.log('⚠️  Override keyword detected in document');
    forceCreate = true;
    
    // Remove the override keyword to prevent future loops
    // This modifies the actual Google Doc
    const body = doc.getBody();
    const text = body.getText();
    const newText = text.replace(/override/gi, ''); // Remove all instances, case-insensitive
    body.setText(newText);
    doc.saveAndClose();
    
    console.log('✓ Removed override keyword from document');
    jsonContent = newText;
  }
  
  // Parse JSON
  const jsonData = JSON.parse(jsonContent);
  
  // Convert to HTML
  const htmlContent = convertJsonToHtml(jsonData);
  
  // Create Confluence page (with force flag if override was detected)
  const pageUrl = createRetroPaginConfluence(htmlContent, file.getName(), forceCreate);
  
  if (pageUrl === null) {
    // Page already exists - still delete the JSON file to prevent reprocessing
    console.log('✓ Page already exists - no action needed');
    
    // Delete the JSON Google Doc
    DriveApp.getFileById(file.getId()).setTrashed(true);
    console.log('✓ JSON file deleted (moved to trash)');
    
    return 'exists';
  }
  
  console.log(`✓ Confluence page created: ${pageUrl}`);
  
  // Delete the JSON Google Doc after successful page creation
  DriveApp.getFileById(file.getId()).setTrashed(true);
  console.log(`✓ JSON file deleted (moved to trash)`);
  
  return 'created';
}

/**
 * Set up 1-minute trigger
 */
function setupMinuteTrigger() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to run every minute
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyMinutes(1)
    .create();
    
  console.log('Trigger set up to run every minute');
}

/**
 * Remove all triggers
 */
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  console.log('All triggers removed');
}

/**
 * Create Confluence page for the retro report
 * This is a wrapper around the createConfluencePage function in confluenceapi.js
 * to handle the additional parameters needed for JSON Retro processing
 */
function createRetroPaginConfluence(htmlContent, fileName, forceCreate) {
  try {
    // Get configs from existing function
    const config = getConfluenceConfig();
    
    // Get current time for timestamp
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), '(HH:mm)');
    
    // Use the file name as the base for page title (or generate based on the month)
    let pageTitle = fileName;
    
    // Handle Audio Retro files
    if (fileName.startsWith('Audio Monthly Retro JSON - ')) {
      // Extract date format YYYY/MM/DD and make a nice title
      const dateStr = fileName.replace('Audio Monthly Retro JSON - ', '');
      const dateParts = dateStr.split('/');
      if (dateParts.length === 3) {
        try {
          const date = new Date(dateParts[0], dateParts[1]-1, dateParts[2]);
          const month = date.toLocaleString('default', { month: 'long' });
          const year = date.getFullYear();
          pageTitle = `Audio Monthly Retro - ${month} ${year} ${timestamp}`;
        } catch (e) {
          console.log('Could not parse date from filename, using modified title');
          pageTitle = `${fileName} - Processed ${timestamp}`;
        }
      } else {
        pageTitle = `${fileName} - Processed ${timestamp}`;
      }
    } 
    // Handle Paid Social files (keeping backward compatibility)
    else if (fileName.startsWith('Paid Social Monthly Retro JSON - ')) {
      // Extract date format YYYY/MM/DD and make a nice title
      const dateStr = fileName.replace('Paid Social Monthly Retro JSON - ', '');
      const dateParts = dateStr.split('/');
      if (dateParts.length === 3) {
        try {
          const date = new Date(dateParts[0], dateParts[1]-1, dateParts[2]);
          const month = date.toLocaleString('default', { month: 'long' });
          const year = date.getFullYear();
          pageTitle = `Paid Social Retro - ${month} ${year} ${timestamp}`;
        } catch (e) {
          console.log('Could not parse date from filename, using modified title');
          pageTitle = `${fileName} - Processed ${timestamp}`;
        }
      } else {
        pageTitle = `${fileName} - Processed ${timestamp}`;
      }
    } 
    // Default for any other files
    else {
      pageTitle = `${fileName} - Processed ${timestamp}`;
    }
    
    console.log(`Generated page title with timestamp: "${pageTitle}"`);
    
    // Check if this page already exists and we don't want to force create
    // Note: With timestamp this should be very rare, but keeping the check
    if (!forceCreate && pageAlreadyExists(pageTitle)) {
      console.log(`Page already exists: "${pageTitle}" - skipping creation.`);
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
        "editor2": {  // For modern editor
          "value": htmlContent, 
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
    
    console.log(`Creating Confluence page: ${pageTitle}`);
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    
    // Handle response
    if (responseCode !== 200) {
      // Check for the specific "page already exists" error
      const responseText = response.getContentText();
      if (responseCode === 400 && responseText.includes('A page with this title already exists')) {
        console.log(`\u26A0\uFE0F Page already exists (${pageTitle}) despite timestamp - very rare collision!`);
        return null;
      } else {
        throw new Error(`Confluence API error: ${responseCode} - ${responseText}`);
      }
    }
    
    const result = JSON.parse(response.getContentText());
    const pageUrl = `https://${config.domain}.atlassian.net/wiki${result._links.webui}`;
    console.log(`\u2713 Page created successfully: ${pageUrl}`);
    return pageUrl;
    
  } catch (error) {
    console.error(`Failed to create Confluence page: ${error.message}`);
    throw error;
  }
}

/**
 * Manual test function to process a specific file by name
 */
function testProcessSpecificFile(fileName) {
  const file = DriveApp.getFilesByName(fileName).next();
  if (file) {
    const result = processRetroFile(file);
    console.log(`Result: ${result}`);
  } else {
    console.log('File not found:', fileName);
  }
}

/**
 * Health check function - useful for debugging
 */
function healthCheck() {
  try {
    // Test basic functionality
    const testSearch = DriveApp.searchFiles('title contains "test_health_check_ignore"');
    console.log('✅ Drive API: OK');
    
    const config = getConfluenceConfig();
    console.log('✅ Confluence Config: OK');
    
    const files = findNewRetroFiles();
    console.log(`✅ File Scanner: OK (${files.length} files ready)`);
    
    // Test page title generation
    const title = generatePageTitle();
    console.log(`✅ Page title would be: "${title}"`);
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.toString());
    return false;
  }
}

/**
 * Test function to manually run the JSON document processing
 * Useful for troubleshooting when the automatic trigger isn't working
 */
function testJsonProcessing() {
  console.log('=== Manual JSON document processing test ===');
  
  try {
    // Run the main function that the trigger would normally call
    main();
    console.log('✅ JSON processing test completed');
    return true;
  } catch (error) {
    console.error('❌ JSON processing test failed:', error.toString());
    return false;
  }
}

/**
 * Test function specifically to test the Audio JSON file search
 */
function testAudioJsonSearch() {
  console.log('=== Testing Audio JSON File Search ===');
  
  try {
    const files = findAudioRetroFiles();
    console.log(`Found ${files ? files.length : 0} matching files`);
    
    if (files && files.length > 0) {
      console.log('Matching files:');
      files.forEach((file, index) => {
        console.log(`${index+1}: ${file.getName()} (created: ${file.getDateCreated()})`);
      });
    }
    
    return files?.length || 0;
  } catch (error) {
    console.error('Search test failed:', error);
    return 0;
  }
}

/**
 * Debug function to test Drive search query specifically
 */
function debugDriveSearch() {
  console.log('=== DEBUG DRIVE SEARCH ===');
  try {
    const searchQuery = 'title contains "Audio Monthly Retro JSON -" and mimeType = "application/vnd.google-apps.document"';
    console.log(`Using search query: ${searchQuery}`);
    
    const fileIterator = DriveApp.searchFiles(searchQuery);
    console.log('Search executed...');
    
    let count = 0;
    while (fileIterator.hasNext() && count < 10) {
      const file = fileIterator.next();
      count++;
      console.log(`${count}: ${file.getName()} (created: ${file.getDateCreated()})`);
    }
    
    if (count === 0) {
      console.log('No files found matching query');
    } else {
      console.log(`Found ${count} file(s) matching query`);
    }
    
    return count;
  } catch (error) {
    console.error('Error in debug search:', error);
    return 0;
  }
}

/**
 * More detailed test function that will create a test JSON document
 * and attempt to process it into a Confluence page
 */
function testFullJSONProcessFlow() {
  console.log('=== Full JSON Processing Test ===');
  
  try {
    // 1. Create a test JSON document
    console.log('Creating test JSON document...');
    const testData = {
      "tldr": "This is a test report created by the test function.",
      "overview": {
        "description": "This is a test overview section.",
        "commentary": "Test commentary for the overview."
      },
      "team": {
        "members": ["Test Member 1", "Test Member 2"],
        "contact": "#test-slack-channel"
      }
    };
    
    // Create a timestamp for a unique name
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
    // Use correct date format with slashes for the pattern to match
    const docName = `Audio Monthly Retro JSON - 2025/08/21`;
    
    // Create a Google Doc with JSON content
    const doc = DocumentApp.create(docName);
    doc.getBody().setText(JSON.stringify(testData, null, 2));
    doc.saveAndClose();
    
    // Get the file ID
    const file = DriveApp.getFileById(doc.getId());
    console.log(`Created test document: ${file.getName()} (ID: ${file.getId()})`);
    
    // 2. Process the document
    console.log('Processing test document...');
    try {
      const result = processRetroFile(file);
      console.log(`Processing result: ${result}`);
      console.log('✅ Test completed successfully!');
    } catch (processError) {
      console.error('❌ Error processing document:', processError.toString());
      
      // Clean up the test document regardless of success/failure
      DriveApp.getFileById(doc.getId()).setTrashed(false); // Untrash it if it was trashed
      
      throw processError;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Full test failed:', error.toString());
    return false;
  }
}

/**
 * Check what page title would be generated right now
 */
function checkCurrentPageTitle() {
  const title = generatePageTitle();
  console.log(`Current page title would be: "${title}"`);
  
  // Also check if it exists
  if (pageAlreadyExists(title)) {
    console.log('⚠️  This page already exists in Confluence');
  } else {
    console.log('✅ This page does not exist yet');
  }
}

/**
 * Test the override functionality
 */
function testOverrideFunction() {
  console.log('=== Testing Override Functionality ===\n');
  
  // Create a test doc with override keyword
  const testContent = {
    "override": true,
    "testData": "This is test data",
    "channelSummary": {
      "commentary": "Test with override"
    }
  };
  
  const testDoc = DocumentApp.create('TEST Override Doc');
  testDoc.getBody().setText('override\n' + JSON.stringify(testContent, null, 2));
  testDoc.saveAndClose();
  
  console.log(`Created test doc: ${testDoc.getName()}`);
  console.log('Doc contains "override" keyword');
  
  // Process it
  const file = DriveApp.getFileById(testDoc.getId());
  processRetroFile(file);
  
  // Check if override was removed
  const updatedDoc = DocumentApp.openById(testDoc.getId());
  const updatedText = updatedDoc.getBody().getText();
  
  if (updatedText.toLowerCase().includes('override')) {
    console.log('❌ Override keyword was NOT removed');
  } else {
    console.log('✅ Override keyword was successfully removed');
  }
  
  // Clean up
  DriveApp.getFileById(testDoc.getId()).setTrashed(true);
  console.log('Test doc moved to trash');
}