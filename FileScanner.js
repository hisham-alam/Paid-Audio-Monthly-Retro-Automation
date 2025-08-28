// FileScanner.gs - Handles finding and moving Google Docs with JSON content

/**
 * Find new Paid Social Monthly Retro JSON files (stored as Google Docs)
 */
function findNewRetroFiles() {
  const files = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Only look at files from last 7 days
  
  // Search for Google Docs with our naming pattern
  const searchQuery = 'title contains "Paid Social Monthly Retro JSON -" and mimeType = "application/vnd.google-apps.document"';
  const fileIterator = DriveApp.searchFiles(searchQuery);
  
  while (fileIterator.hasNext()) {
    const file = fileIterator.next();
    
    // Check if file was created recently
    if (file.getDateCreated() > cutoffDate) {
      // Verify the exact naming pattern (YYYY/MM/DD at the end)
      const fileName = file.getName();
      const datePattern = /Paid Social Monthly Retro JSON - (\d{4})\/(\d{2})\/(\d{2})$/;
      
      if (datePattern.test(fileName)) {
        files.push(file);
      }
    }
  }
  
  return files;
}

/**
 * Move processed file to archive folder
 */
function moveToArchive(file) {
  try {
    // Get the archive folder (using the existing DRIVE_FOLDER_ID)
    const archiveFolderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
    
    if (!archiveFolderId) {
      console.log('No archive folder configured, leaving file in place');
      return;
    }
    
    const archiveFolder = DriveApp.getFolderById(archiveFolderId);
    
    // Move the file
    file.moveTo(archiveFolder);
    
  } catch (error) {
    console.error('Error moving file to archive:', error);
    // Don't throw - we don't want to stop processing if move fails
  }
}

/**
 * Test function to check file search
 */
function testFileSearch() {
  const files = findNewRetroFiles();
  
  if (files.length === 0) {
    console.log('No matching files found');
  } else {
    console.log(`Found ${files.length} file(s):`);
    files.forEach(file => {
      console.log(`- ${file.getName()} (created: ${file.getDateCreated()})`);
    });
  }
}

/**
 * Debug function to find Google Docs with various search criteria
 */
function debugFindGoogleDocs() {
  console.log('=== DEBUGGING GOOGLE DOCS SEARCH ===\n');
  
  // 1. Search for ANY Google Doc with "Paid Social" in the name
  console.log('1. Google Docs containing "Paid Social":\n');
  const search1 = DriveApp.searchFiles('title contains "Paid Social" and mimeType = "application/vnd.google-apps.document"');
  let count = 0;
  while (search1.hasNext() && count < 10) {
    const file = search1.next();
    console.log(`- ${file.getName()}`);
    console.log(`  Created: ${file.getDateCreated()}`);
    console.log(`  ID: ${file.getId()}\n`);
    count++;
  }
  
  // 2. Check the designated folder specifically
  const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (folderId) {
    console.log('\n2. Files in designated folder:\n');
    const folder = DriveApp.getFolderById(folderId);
    const filesInFolder = folder.getFiles();
    while (filesInFolder.hasNext()) {
      const file = filesInFolder.next();
      if (file.getMimeType() === 'application/vnd.google-apps.document') {
        console.log(`- ${file.getName()} (Google Doc)`);
      }
    }
  }
  
  // 3. Show the exact pattern we're looking for
  console.log('\n3. Expected pattern:');
  console.log('- Name: "Paid Social Monthly Retro JSON - YYYY/MM/DD"');
  console.log('- Example: "Paid Social Monthly Retro JSON - 2024/12/15"');
  console.log('- File type: Google Doc');
}// FileScanner.gs - Handles finding and moving Google Docs with JSON content

/**
 * Find new Paid Social Monthly Retro JSON files (stored as Google Docs)
 */
function findNewRetroFiles() {
  const files = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Only look at files from last 7 days
  
  // Search for Google Docs with our naming pattern
  const searchQuery = 'title contains "Paid Social Monthly Retro JSON -" and mimeType = "application/vnd.google-apps.document"';
  const fileIterator = DriveApp.searchFiles(searchQuery);
  
  while (fileIterator.hasNext()) {
    const file = fileIterator.next();
    
    // Check if file was created recently
    if (file.getDateCreated() > cutoffDate) {
      // Verify the exact naming pattern (YYYY/MM/DD at the end)
      const fileName = file.getName();
      const datePattern = /Paid Social Monthly Retro JSON - (\d{4})\/(\d{2})\/(\d{2})$/;
      
      if (datePattern.test(fileName)) {
        files.push(file);
      }
    }
  }
  
  return files;
}

/**
 * Move processed file to archive folder
 */
function moveToArchive(file) {
  try {
    // Get the archive folder (using the existing DRIVE_FOLDER_ID)
    const archiveFolderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
    
    if (!archiveFolderId) {
      console.log('No archive folder configured, leaving file in place');
      return;
    }
    
    const archiveFolder = DriveApp.getFolderById(archiveFolderId);
    
    // Move the file
    file.moveTo(archiveFolder);
    
  } catch (error) {
    console.error('Error moving file to archive:', error);
    // Don't throw - we don't want to stop processing if move fails
  }
}

/**
 * Test function to check file search
 */
function testFileSearch() {
  const files = findNewRetroFiles();
  
  if (files.length === 0) {
    console.log('No matching files found');
  } else {
    console.log(`Found ${files.length} file(s):`);
    files.forEach(file => {
      console.log(`- ${file.getName()} (created: ${file.getDateCreated()})`);
    });
  }
}

/**
 * Debug function to find Google Docs with various search criteria
 */
function debugFindGoogleDocs() {
  console.log('=== DEBUGGING GOOGLE DOCS SEARCH ===\n');
  
  // 1. Search for ANY Google Doc with "Paid Social" in the name
  console.log('1. Google Docs containing "Paid Social":\n');
  const search1 = DriveApp.searchFiles('title contains "Paid Social" and mimeType = "application/vnd.google-apps.document"');
  let count = 0;
  while (search1.hasNext() && count < 10) {
    const file = search1.next();
    console.log(`- ${file.getName()}`);
    console.log(`  Created: ${file.getDateCreated()}`);
    console.log(`  ID: ${file.getId()}\n`);
    count++;
  }
  
  // 2. Check the designated folder specifically
  const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (folderId) {
    console.log('\n2. Files in designated folder:\n');
    const folder = DriveApp.getFolderById(folderId);
    const filesInFolder = folder.getFiles();
    while (filesInFolder.hasNext()) {
      const file = filesInFolder.next();
      if (file.getMimeType() === 'application/vnd.google-apps.document') {
        console.log(`- ${file.getName()} (Google Doc)`);
      }
    }
  }
  
  // 3. Show the exact pattern we're looking for
  console.log('\n3. Expected pattern:');
  console.log('- Name: "Paid Social Monthly Retro JSON - YYYY/MM/DD"');
  console.log('- Example: "Paid Social Monthly Retro JSON - 2024/12/15"');
  console.log('- File type: Google Doc');
}