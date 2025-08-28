# Paid Audio Team Monthly Retro Automation

An AppsScript solution that automates the process of generating monthly performance reports for the Paid Audio team. This system processes dashboard data from Looker and Podscribe, transforms it into structured content, and publishes comprehensive retrospective reports to Confluence.

## Overview

This automation system handles the entire workflow from raw data collection to published Confluence reports:

1. Users download reports from Looker and Podscribe
2. Files are uploaded to a designated Google Drive folder
3. The script processes and analyzes the data
4. Cleaned data is formatted for a Credal AI chatbot agent
5. The agent's output is saved as JSON in a Google Doc
6. The system processes the JSON and publishes a formatted report to Confluence

The system runs on Google Apps Script and uses time-based triggers to regularly check for new files to process.

## Features

- Automatic detection and processing of new report files
- Data cleaning and standardization for podcast metrics
- Currency conversion between USD and GBP
- Comprehensive analysis of spend by region and publisher
- Direct integration with Confluence for publishing reports
- Support for AI-assisted report writing via Credal AI
- Robust error handling and logging

## Installation & Setup

### Prerequisites
- Google Workspace account with access to Google Drive, Google Docs, and Google Apps Script
- Access to Confluence API
- Access to Looker dashboard for audio metrics
- Access to Podscribe reporting platform
- Access to Credal AI chatbot

### Setup Instructions
1. **Create a new Google Apps Script project**:
   - Go to [script.google.com](https://script.google.com/) and create a new project
   - Create the following files in your project:
     - `Main.js`
     - `ConfluenceApi.js`
     - `JSONToHTML.js`
     - `FileScanner.js`
     - `PodscribeIntegration.js`
     - `ExchangeRateService.js`
     - `CSVHandler.js`
     - `DataCleaner.js`
   - Copy the corresponding code into each file

2. **Configure Google Drive folders**:
   - Create a main folder in Google Drive for the project
   - Create an archive subfolder for processed files
   - Note the folder IDs for both (found in the URL when viewing the folder)

3. **Configure Script Properties**:
   - In the Apps Script editor, go to Project Settings > Script Properties
   - Add the following key-value pairs:
     - `CONFLUENCE_EMAIL`: Your Confluence email
     - `CONFLUENCE_API_TOKEN`: Your Confluence API token
     - `CONFLUENCE_DOMAIN`: Your Confluence domain
     - `CONFLUENCE_SPACE_KEY`: Your Confluence space key
     - `DRIVE_FOLDER_ID`: ID of your archive folder

4. **Update hardcoded values**:
   - In `ConfluenceApi.js`, update the parent page ID and search ancestor ID
   - In files referencing the main data folder, update the folder ID
   - In `DataCleaner.js`, update the region mapping spreadsheet ID

## Configuration Requirements

### Required Google Script Properties
| Property Name | Description |
|---------------|-------------|
| `CONFLUENCE_EMAIL` | Email address associated with your Confluence account |
| `CONFLUENCE_API_TOKEN` | API token with write permissions for Confluence |
| `CONFLUENCE_DOMAIN` | Your Confluence domain (e.g., `yourcompany.atlassian.net`) |
| `CONFLUENCE_SPACE_KEY` | Key of the Confluence space where reports will be published |
| `DRIVE_FOLDER_ID` | Google Drive folder ID for the archive folder |

### Hardcoded IDs to Update
| Value | File | Description |
|-------|------|-------------|
| `1DU7SZGZLRP5XMaBoDfcRgeooPTMSYCQz` | Multiple files | Main data folder ID in Google Drive |
| `2534671054` | ConfluenceApi.js | Parent page ID in Confluence |
| `1890235685` | ConfluenceApi.js | Search ancestor ID in Confluence |
| `1aalgZUTZ_5fjXsIOhNDc7ntiO-7gCm9i9Xve7enBQHQ` | DataCleaner.js | Region mapping spreadsheet ID |

### Region Mapping Spreadsheet
Create a Google Sheet with the following format:
- Sheet name: `Regions`
- Columns:
  - `2-ISO`: Two-letter country codes (e.g., US, GB)
  - `Region`: Corresponding region names (e.g., North America, Europe)

## Usage Instructions

### Step 1: Prepare Data Files
1. **Download required reports**:
   - Download the Looker dashboard for audio metrics
   - Download the Podscribe report for podcast performance
   
2. **Prepare CSV files**:
   - Save both reports as CSV files
   - Place the Podscribe CSV file in the same folder as the Looker CSV file

3. **Upload to Google Drive**:
   - Upload the folder containing both CSV files to the configured Google Drive folder

### Step 2: Process CSVs for AI Input
1. The system will automatically detect new CSV files in the configured folder
2. Data will be processed according to the rules in `PodscribeIntegration.js` and `DataCleaner.js`
3. The processed data will be formatted as markdown text for input to Credal AI
4. The output will be available in a Google Doc with instructions for the next step

### Step 3: Use Credal AI
1. Copy the formatted markdown text from the Google Doc
2. Paste it into the Credal AI chatbot
3. Use the following prompt template:
   ```
   Analyze this audio performance data and create a monthly retro report. Include:
   - TL;DR summary with key highlights
   - Performance metrics analysis
   - Conversion rate analysis
   - BAU activities summary
   - Regional performance
   - Operational updates
   - Special projects
   Output the result as JSON following this structure: {tldr: string, performance: {...}, conversion: {...}, bau: {...}, regional: {...}, operations: {...}, projects: {...}}
   ```
4. Copy the JSON output from Credal AI

### Step 4: Create JSON Google Doc
1. Create a new Google Doc
2. Name it exactly: `Audio Monthly Retro JSON - YYYY/MM/DD` (using the current date)
3. Paste the JSON from Credal AI into the document
4. Save the document

### Step 5: Publication to Confluence
1. The system will automatically detect the new JSON document
2. It will convert the JSON to formatted HTML
3. A new Confluence page will be created with the appropriate title
4. The system will move the source JSON document to trash after successful publication

### Example Workflow
1. Download Looker dashboard CSV and Podscribe report CSV
2. Upload both files to the configured Google Drive folder
3. Wait for the system to process the files (triggered every minute)
4. Copy the generated markdown from the output Google Doc
5. Paste into Credal AI with the analysis prompt
6. Copy the JSON output from Credal AI
7. Create a new Google Doc named `Audio Monthly Retro JSON - 2023/05/15`
8. Paste the JSON into the document and save
9. Wait for the system to detect and process the JSON (triggered every minute)
10. Verify the published Confluence page at your configured Confluence space

## Trigger Setup

The automation runs using Google Apps Script time-based triggers. Two triggers need to be set up:

### 1. Main Processing Trigger

This trigger runs the `main()` function every minute to check for new JSON files to process:

```javascript
function setupMainTrigger() {
  // Delete any existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create a new trigger that runs every minute
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyMinutes(1)
    .create();
}
```

### 2. CSV Processing Trigger

This trigger runs the `processCsvFiles()` function every minute to check for new CSV files:

```javascript
function setupCsvProcessingTrigger() {
  // Delete any existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processCsvFiles') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create a new trigger that runs every minute
  ScriptApp.newTrigger('processCsvFiles')
    .timeBased()
    .everyMinutes(1)
    .create();
}
```

### Setting Up Triggers

1. After deploying your Apps Script project, run both trigger setup functions:
   - Open the Apps Script editor
   - Select `setupMainTrigger` from the function dropdown and click Run
   - Select `setupCsvProcessingTrigger` from the function dropdown and click Run

2. Verify triggers are created:
   - In the Apps Script editor, go to Triggers in the left sidebar
   - You should see two time-based triggers running every minute

3. Monitoring executions:
   - In the Apps Script editor, go to Executions in the left sidebar
   - You can monitor the execution history and check for any errors

## Data Flow & Processing Pipeline

The automation operates through two distinct processes:

## Troubleshooting

### Common Issues

1. **Files Not Being Processed**
   - Check that files are in the correct Google Drive folder
   - Verify that CSV files have the correct format with expected headers
   - Check the Apps Script execution logs for errors

2. **JSON Not Being Converted to Confluence Pages**
   - Ensure the JSON document is named correctly as `Audio Monthly Retro JSON - YYYY/MM/DD`
   - Verify the JSON structure matches what's expected in `JSONToHTML.js`
   - Check Confluence API permissions and authentication

3. **Data Not Showing Up Correctly**
   - Examine the region mapping spreadsheet for missing country codes
   - Check for unexpected data formats in the source CSV files
   - Review the currency conversion logic if financial figures appear incorrect

4. **Confluence Publishing Fails**
   - Verify your Confluence API token is valid and has write permissions
   - Check that the parent page and space still exist with correct IDs
   - Look for rate limiting issues in the execution logs

### Logging

The system includes detailed logging that can help identify issues:

```javascript
// Example of how to check logs
function checkLogs() {
  var logs = Logger.getLog();
  console.log(logs);
}
```

Run this function to view recent logs, or check the Execution logs in the Apps Script editor.

### Process 1: CSV Processing & AI Input Preparation
1. **Data Collection**
   - Users download reports from Looker and Podscribe
   - Files are combined into one folder and uploaded to Google Drive

2. **Data Discovery**
   - The system scans the designated Google Drive folder for CSV files
   - Special handling is applied to Podscribe CSV files

3. **Data Processing**
   - CSV files are parsed and data is extracted
   - Podscribe data is cleaned (show names standardized, metrics aggregated)
   - Spend data is converted from USD to GBP using ExchangeRateService
   - Metrics are aggregated by region, publisher, and month

4. **AI Input Preparation**
   - Processed data is formatted as markdown text (comma-separated)
   - The formatted text is ready for input into the Credal AI chatbot

### Process 2: JSON to Confluence Publication
1. **JSON Discovery**
   - The system scans for Google Docs with names matching "Audio Monthly Retro JSON - YYYY/MM/DD"
   - When found, it extracts the JSON content

2. **HTML Conversion**
   - JSON data is parsed and converted to formatted HTML
   - Different sections are created: team info, TL;DR, performance metrics, etc.
   - Tables are generated for various metrics

3. **Confluence Publication**
   - The system checks if a page with the same title already exists
   - Creates a new Confluence page using the formatted HTML
   - Sets the parent page ID for proper organization

4. **Cleanup**
   - After successful publication, the source Google Doc is moved to trash