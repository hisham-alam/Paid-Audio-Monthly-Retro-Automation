// CSVHandler.gs - Processes multiple CSV files into a single Google Doc

/**
 * Main function to process CSV files from latest subfolder
 */
function processCsvFiles() {
  const parentFolderId = '1DU7SZGZLRP5XMaBoDfcRgeooPTMSYCQz'; // Change this to your parent folder ID
  
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
    
    while (fileIterator.hasNext()) {
      const file = fileIterator.next();
      
      // Check if it's a CSV file
      if (file.getMimeType() === 'text/csv' || 
          file.getName().toLowerCase().endsWith('.csv')) {
        csvArray.push(file);
      }
    }
    
    if (csvArray.length === 0) {
      console.log('No CSV files found in folder');
      return;
    }
    
    console.log(`Found ${csvArray.length} CSV file(s)`);
    
    // Generate filename with timestamp
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
    const docName = `combined_csv_data_${timestamp}`;
    
    // Create new Google Doc directly in the parent folder
    const doc = DocumentApp.create(docName);
    const docId = doc.getId();
    
    // Important: Save and close the initial document
    doc.saveAndClose();
    
    // Add a delay to ensure document is fully saved
    Utilities.sleep(2000);
    
    // Reopen the document by ID
    const reopenedDoc = DocumentApp.openById(docId);
    const body = reopenedDoc.getBody();
    
    // Clear any default content
    body.clear();
    
    // Track successfully processed files
    const processedFiles = [];
    
    // Process each CSV file
    for (let i = 0; i < csvArray.length; i++) {
      try {
        const csvFile = csvArray[i];
        
        // Add CSV filename as header
        const header = body.appendParagraph(csvFile.getName());
        header.setHeading(DocumentApp.ParagraphHeading.HEADING2);
        header.setBold(true);
        
        // Add separator
        body.appendParagraph('─'.repeat(50));
        
        // Get CSV content
        const csvContent = csvFile.getBlob().getDataAsString();
        
        // Add CSV content
        body.appendParagraph(csvContent);
        
        // Add spacing between files (except after last one)
        if (i < csvArray.length - 1) {
          body.appendParagraph('\n\n');
        }
        
        console.log(`Added ${csvFile.getName()}`);
        
        // Mark file as successfully processed
        processedFiles.push(csvFile);
        
      } catch (fileError) {
        console.error(`Error processing file ${csvArray[i].getName()}:`, fileError);
      }
    }
    
    // Save the document (but don't close it - let Google handle that)
    reopenedDoc.saveAndClose();
    
    // Small delay before file operations
    Utilities.sleep(1000);
    
    // Move document to the parent folder using Drive API
    try {
      const docFile = DriveApp.getFileById(docId);
      docFile.moveTo(parentFolder);
      console.log(`Created and moved: ${docName}`);
    } catch (moveError) {
      console.log(`Document created but couldn't move: ${moveError.message}`);
    }
    
    // Mark successfully processed CSV files as processed
    for (const file of processedFiles) {
      if (markFileAsProcessed(file, ' (PROCESSED_CSV)')) {
        console.log(`Processed CSV: ${file.getName()}`);
      } else {
        console.log(`⚠️ Couldn't process CSV ${file.getName()} - may be reprocessed`);
      }
    }
    
    // Only process folder if all files were processed successfully
    if (processedFiles.length === csvArray.length) {
      if (markFileAsProcessed(latestFolder, ' (PROCESSED_FOLDER)')) {
        console.log(`Processed folder: ${latestFolder.getName()}`);
      } else {
        console.log(`⚠️ Couldn't process folder: ${latestFolder.getName()}`);
      }
    } else {
      console.log(`Kept folder due to unprocessed files. Processed ${processedFiles.length} of ${csvArray.length} files.`);
    }
    
  } catch (error) {
    console.error('Error processing CSV files:', error);
    throw error; // Re-throw to see the full error in the logs
  }
}