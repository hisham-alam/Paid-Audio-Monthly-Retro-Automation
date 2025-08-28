// JsonToHtmlConverter.gs - Converts JSON report data to Confluence HTML

// CONFIGURATION VARIABLES - Adjust these to fine-tune appearance
const CONFIG = {
  fontSize: '16px',
  tableWidths: {
    performance: '100%',
    conversion: '90%',
    bau: '90%',
    regional: '90%'
  }
};

/**
 * Main function to convert JSON report to HTML for Modern Confluence Editor
 */
function convertJsonToHtml(jsonData) {
  let html = '';
  
  // Simple wrapper div without any special attributes
  html += '<div style="max-width: 900px; margin: 0 auto;">';
  
  // Add team/contact info using expand macro
  html += generateTeamInfoBox(jsonData);
  
  // Add TL;DR highlight
  if (jsonData.tldr) {
    html += '<h1>TL;DR highlight</h1>';
    html += `<p>${jsonData.tldr}</p>`;
  }
  
  // Add outline section
  html += generateOutlineSection();
  
  // Audio Performance section
  html += '<h1>Audio Performance</h1>';
  
  // Overview subsection
  html += '<h2>Overview</h2>';
  if (jsonData.overview) {
    html += `<p>${jsonData.overview.description || ''}</p>`;
    if (jsonData.overview.performanceTable) {
      html += generatePerformanceTable(jsonData.overview.performanceTable);
    }
    if (jsonData.overview.commentary) {
      html += `<p>${jsonData.overview.commentary}</p>`;
    }
  }
  
  // Conversion rates subsection
  if (jsonData.conversionRates) {
    html += '<h2>Conversion rates</h2>';
    html += `<p>${jsonData.conversionRates.description || ''}</p>`;
    html += generateConversionTable(jsonData.conversionRates.data, jsonData.conversionRates.notes);
    if (jsonData.conversionRates.commentary) {
      html += `<p>${jsonData.conversionRates.commentary}</p>`;
    }
  }
  
  // Business as usual (BAU) activity
  if (jsonData.bauActivity) {
    html += '<h2>Business as usual (BAU) activity</h2>';
    html += `<p>${jsonData.bauActivity.description || ''}</p>`;
    html += generateBauTable(jsonData.bauActivity.vendors);
    
    // Add podcast shows table if available
    if (jsonData.showData && jsonData.showData.length > 0) {
      html += '<h3>Podcast Shows by Publisher</h3>';
      html += generatePodcastShowsTable(jsonData.showData);
    }
    
    // Add the New This Month section if available
    if (jsonData.bauActivity.newThisMonth) {
      html += '<h3>New This Month</h3>';
      html += `<p>${jsonData.bauActivity.newThisMonth}</p>`;
    }
    
    if (jsonData.bauActivity.standouts) {
      html += '<h3>Stand-outs: Top Performers</h3>';
      html += `<p>${jsonData.bauActivity.standouts}</p>`;
    }
    
    if (jsonData.bauActivity.needsImprovement) {
      html += '<h3>Needs Improvement: Areas to Watch</h3>';
      html += `<p>${jsonData.bauActivity.needsImprovement}</p>`;
    }
  }
  
  // Business Marketing
  if (jsonData.businessMarketing) {
    html += '<h1>Business Marketing</h1>';
    html += `<p>${jsonData.businessMarketing}</p>`;
  }
  
  // Regional Marketing
  if (jsonData.regionalMarketing) {
    html += '<h1>Regional Marketing</h1>';
    html += '<h2>Overview</h2>';
    html += `<p>${jsonData.regionalMarketing.overview || ''}</p>`;
    if (jsonData.regionalMarketing.table) {
      html += generateRegionalTable(jsonData.regionalMarketing.table, jsonData.regionalMarketing.notes);
    }
    if (jsonData.regionalMarketing.commentary) {
      html += `<p>${jsonData.regionalMarketing.commentary}</p>`;
    }
    
    if (jsonData.regionalMarketing.tests) {
      html += '<h2>Regional Marketing Tests</h2>';
      html += `<p>${jsonData.regionalMarketing.tests}</p>`;
    }
  }
  
  // Operational Updates
  if (jsonData.operationalUpdates) {
    html += '<h2>Operational Updates</h2>';
    html += `<p>${jsonData.operationalUpdates}</p>`;
  }
  
  // Special Projects
  if (jsonData.specialProjects) {
    html += '<h1>Special Projects</h1>';
    html += `<p>${jsonData.specialProjects}</p>`;
  }
  
  // CLOSE THE WRAPPER
  html += '</div>';
  
  return html;
}

/**
 * Generate team info box using info macro with emojis and hyperlinks
 */
function generateTeamInfoBox(jsonData) {
  let html = '';
  
  // Use info macro with schema version for modern editor
  html += '<ac:structured-macro ac:name="info" ac:schema-version="1">';
  html += '<ac:parameter ac:name="icon">true</ac:parameter>';
  html += '<ac:rich-text-body>';
  
  // Team members with location emoji - HARDCODED
  // Ignoring JSON data completely
  html += '<p>📍 ATX - Allison Haferl, Performance Marketing Specialist (Audio)</p>';
  html += '<p>📍 NYC - Emily Miller, Performance Marketing Senior Manager (Audio)</p>';
  html += '<p>📍 NYC - Cassandra LaPrairie, Paid Audio Lead (Audio)</p>';
    
  // Contact with Slack emoji - HARDCODED
  html += '<p><strong>Contact:</strong></p>';
  html += '<p>💬 #ask-paid-audio</p>';
    
  // Glossary - COMPLETELY HARDCODED
  html += '<p><strong>Glossary:</strong></p>';
  
  // These definitions are completely hardcoded, not from JSON
  html += '<p>Ad impression (IMP): the download of a podcast episode that includes a Wise ad</p>';
  html += '<p>Visitor: the number of listeners exposed to a Wise podcast ads who go on to visit <a href="http://wise.com/">Wise.com</a></p>';
  html += '<p>CPM: acronym for \'cost per thousand\' ad impressions</p>';
    
  // Resources with hyperlinks - HARDCODED
  html += '<p><strong>Supporting resources:</strong></p>';
  html += '<ul>';
  
  // Directly hardcoded links - not from JSON
  html += '<li><a href="https://docs.google.com/spreadsheets/d/1d_OhxEwPcIsU7iJACfrJGWiKI23K3cuOH1qkuX9TdPY/edit?usp=sharing">Live podcast campaign tracker</a></li>';
  html += '<li><a href="https://docs.google.com/spreadsheets/d/1vpwEdKyRaXNuS7Tk6DQS2MzyPn8fvSuYYVI4v3Z6jS8/edit?usp=sharing">Podcast ad scripts and airchecks</a></li>';
  html += '<li><a href="https://looker.tw.ee/dashboards/27489">Audio HQ Looker dashboard</a></li>';
  html += '<li><a href="https://docs.google.com/presentation/d/1nST6Bp1kFN6A0Wg-j8P8qJTIyWxcc_Hi1xxclI3n1X8/edit?usp=sharing">Audio 101: How Wise\'s Podcast Advertising Works</a></li>';
  html += '</ul>';
  
  html += '</ac:rich-text-body>';
  html += '</ac:structured-macro>';
  html += '<hr />';
  
  return html;
}

/**
 * Generate outline section
 */
function generateOutlineSection() {
  return `
    <p><a href="#TL;DRhighlight">TL;DR highlight</a></p>
    <p><a href="#AudioPerformance">Audio Performance</a></p>
    <p style="margin-left: 30px;"><a href="#Overview">Overview</a></p>
    <p style="margin-left: 30px;"><a href="#Conversionrates">Conversion rates</a></p>
    <p style="margin-left: 30px;"><a href="#Businessasusual(BAU)activity">Business as usual (BAU) activity</a></p>
    <p><a href="#BusinessMarketing">Business Marketing</a></p>
    <p><a href="#RegionalMarketing">Regional Marketing</a></p>
    <p style="margin-left: 30px;"><a href="#Overview.1">Overview</a></p>
    <p style="margin-left: 30px;"><a href="#RegionalMarketingTests">Regional Marketing Tests</a></p>
    <p><a href="#OperationalUpdates">Operational Updates</a></p>
    <p><a href="#SpecialProjects">Special Projects</a></p>
    <hr />`;
}

/**
 * Generate performance table with width constraint
 */
function generatePerformanceTable(tableData) {
  if (!tableData || !tableData.months) return '';
  
  let html = `<table class="wrapped" style="width: 
  ${CONFIG.tableWidths.performance};">`;
  
  // Header row
  html += '<thead><tr>';
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Month</strong></th>`;
  
  const columnPairs = [
    'Imps', 'Visitors', 'Regs', 'NCs', 'Spend', 'CPM', 'CPA', 'LTV', 'C Margin', 'Payback'
  ];
  
  columnPairs.forEach(col => {
    html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>${col}</strong></th>`;
    html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MoM</strong></th>`;
  });
  
  html += '</tr></thead><tbody>';
  
  // Data rows
  tableData.months.forEach(monthData => {
    html += '<tr>';
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${monthData.month}</td>`;
    
    const keyMap = {
      'Imps': 'imps',
      'Visitors': 'visitors',
      'Regs': 'regs',
      'NCs': 'ncs',
      'Spend': 'spend',
      'CPM': 'cpm',
      'CPA': 'cpa',
      'LTV': 'ltv',
      'C Margin': 'cmargin',
      'Payback': 'payback'
    };
    
    columnPairs.forEach(col => {
      const key = keyMap[col];
      let value = monthData[key];
      
      if (col === 'Spend' || col === 'CPA' || col === 'CPM' || col === 'LTV' || col === 'C Margin') {
        value = formatCurrency(value);
      } else if (col === 'Payback') {
        value = formatPayback(value);
      } else if (col === 'Imps' || col === 'Visitors' || col === 'Regs' || col === 'NCs') {
        value = formatMetricValue(value);
      }
      
      html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${value}</td>`;
      
      const momValue = monthData[`${key}_mom`];
      html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatAsPercentageChange(momValue)}</td>`;
    });
    
    html += '</tr>';
  });
  
  // Add notes as final row inside table
  if (tableData.notes) {
    const totalColumns = 1 + (columnPairs.length * 2); // Month column + pairs of value/MoM columns
    html += '<tr>';
    html += `<td colspan="${totalColumns}" style="font-size: ${CONFIG.fontSize}; font-style: italic; padding-top: 10px;">`;
    // Use the notes from the JSON if available
    html += tableData.notes || 'Spend, CPM & CPA use fully loaded spend. **LTV 12M (AVG)';
    html += '</td>';
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  
  return html;
}

/**
 * Generate conversion rates table
 */
function generateConversionTable(conversionData, notesText) {
  if (!conversionData) return '';
  
  
  let html = `<table class="wrapped" style="width: 
  ${CONFIG.tableWidths.conversion};">`;
  
  html += '<thead><tr>';
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Month</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Imp > Visitor</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MoM</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Imp > Reg</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MoM</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Imp > XCCY NC</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MoM</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Visitor > Reg</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MoM</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Visitor > XCCY NC</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MoM</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Reg > XCCY NC</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MoM</strong></th>`;
  html += '</tr></thead><tbody>';
  
  conversionData.forEach(row => {
    html += '<tr>';
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${row.month}</td>`;
    
    
    ['impToVisitor', 'impToReg', 'impToNC', 'visitorToReg', 'visitorToNC', 'regToNC'].forEach(metric => {
      html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatPercentage(row[metric])}</td>`;
      html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatAsPercentageChange(row[`${metric}_mom`])}</td>`;
    });
    
    html += '</tr>';
  });
  
  // Add notes as final row inside table
  html += '<tr>';
  html += `<td colspan="13" style="font-size: ${CONFIG.fontSize}; font-style: italic; padding-top: 10px;">`;
  
  // Use notes from JSON if available, otherwise use default note
  if (notesText) {
    html += notesText;
  } else {
    html += 'Site visitor and impression data come from Podscribe<br/>';
    html += 'Registration and XCCY NC conversion data come from Looker';
  }
  
  html += '</td>';
  html += '</tr>';
  
  html += '</tbody></table>';
  
  return html;
}

  /**
 * Generate BAU vendor table
 */
function generateBauTable(vendors) {
  if (!vendors || vendors.length === 0) return '';
  
  let html = `<table class="wrapped" style="width: 
  ${CONFIG.tableWidths.bau};">`;
  
  html += '<thead><tr>';
  html += `<th style="font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Vendor</strong></th>`;
  html += `<th style="font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Placement Description</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Impressions</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Spend</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>XCCY NCs</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>CPA</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>Payback</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>% of total spend</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>% of total NCs</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>LTV</strong></th>`;
  html += '</tr></thead><tbody>';
  
  vendors.forEach(vendor => {
    html += '<tr>';
    html += `<td style="font-size: ${CONFIG.fontSize}; white-space: nowrap;">${vendor.name}</td>`;
    // Check if placements is a string before using replace
    let placementsContent = '';
    if (typeof vendor.placements === 'string') {
      placementsContent = vendor.placements.replace(/,/g, '<br>');
    } else if (Array.isArray(vendor.placements)) {
      placementsContent = vendor.placements.join('<br>');
    } else {
      // Handle case where placements is neither string nor array
      placementsContent = String(vendor.placements || 'BAU placements');
    }
    html += `<td style="font-size: ${CONFIG.fontSize};">${placementsContent}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatMetricValue(vendor.impressions)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatCurrency(vendor.spend)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatMetricValue(vendor.ncs)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatCurrency(vendor.cpa)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatPayback(vendor.payback)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${vendor.spendPercent}</td>`; // Removed % since spendPercent already includes %
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${vendor.ncPercent}</td>`; // Removed % since ncPercent already includes %
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatCurrency(vendor.ltv)}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  return html;
}

/**
 * Generate regional performance table
 */
function generateRegionalTable(regionalData, notesText) {
  if (!regionalData) return '';
  
  let html = `<table class="wrapped" style="width: 
  ${CONFIG.tableWidths.regional};">`;
  
  html += '<thead><tr>';
  html += `<th style="font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>REGION</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>SPEND ($)</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>SPEND (£)</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>SPEND (%)</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>IMPs</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>IMPs (%)</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>CPMs</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>MNCs</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>NCs (%)</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>C MARGIN</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>CPA</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>LTV</strong></th>`;
  html += `<th style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;"><strong>PAYBACK</strong></th>`;
  html += '</tr></thead><tbody>';
  
  regionalData.forEach(region => {
    html += '<tr>';
    html += `<td style="font-size: ${CONFIG.fontSize}; white-space: nowrap;">${region.name}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatMetricValue(region.spendUsd)}</td>`; // Removed extra $ sign since spendUsd already contains $
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatCurrency(region.spendGbp)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${region.spendPercent}</td>`; // Removed % since spendPercent already includes %
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatMetricValue(region.impressions)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${region.impPercent}</td>`; // Removed % since impPercent already includes %
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatMetricValue(region.cpm)}</td>`; // Removed $ since cpm already contains currency symbol
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatMetricValue(region.mncs)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${region.ncPercent}</td>`; // Removed % since ncPercent already includes %
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatCurrency(region.margin)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatCurrency(region.cpa)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatCurrency(region.ltv)}</td>`;
    html += `<td style="text-align: center; font-size: ${CONFIG.fontSize}; white-space: nowrap;">${formatPayback(region.payback)}</td>`;
    html += '</tr>';
  });
  
  // Add notes as final row inside table
  html += '<tr>';
  html += `<td colspan="13" style="font-size: ${CONFIG.fontSize}; padding-top: 10px;">`;
  
  // Use notes from JSON if available
  if (notesText) {
    html += `<strong>NOTES:</strong> ${notesText}`;
  } else {
    html += '<strong>NOTES:</strong> Regional spend & impression data pulled from Podscribe does not include MRKTST or MRKBIZ activity<br/>';
    html += 'Spend, CPA & payback are based on media spend only<br/>';
    html += '**LTV 12M (AVG)';
  }
  
  html += '</td>';
  html += '</tr>';
  
  html += '</tbody></table>';
  
  return html;
}

/**
 * Format currency values
 */
function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '-';
  // If the value is already formatted with a currency symbol, return it as is
  if (typeof value === 'string' && (value.startsWith('£') || value.startsWith('$'))) {
    return value;
  }
  const num = Number(value);
  if (isNaN(num)) return value; // Return original value if not a number
  return '£' + num.toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

/**
 * Format percentage values
 */
function formatPercentage(value) {
  if (value === null || value === undefined || value === '') return '-';
  
  // If the value is already formatted with a percentage sign, return it as is
  if (typeof value === 'string' && value.endsWith('%')) {
    return value;
  }
  
  // Try to convert to number, handling strings with commas
  let num;
  if (typeof value === 'string') {
    // Remove any commas before parsing
    num = Number(value.replace(/,/g, ''));
  } else {
    num = Number(value);
  }
  
  if (isNaN(num)) return value; // Return original value if can't be parsed
  return num.toFixed(3) + '%';
}

/**
 * Format general metric values
 */
function formatMetricValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (value === '—') return value; // Return em dash as is
  // If value is already a formatted string, return as is
  if (typeof value === 'string' && isNaN(value.replace(/,/g, ''))) return value;
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('en-GB');
}

/**
 * Format payback values
 */
function formatPayback(value) {
  if (value === null || value === undefined || value === '') return '-';
  // If it's already a string with decimal point, return it as is
  if (typeof value === 'string' && value.includes('.')) return value;
  const num = Number(value);
  if (isNaN(num)) return value; // Return original value if not a number
  return num.toFixed(1);
}

/**
 * Format values as percentage changes
 */
function formatAsPercentageChange(value) {
  if (value === null || value === undefined || value === '') return '-';
  
  // If the value is already formatted with a percentage sign, return it as is
  if (typeof value === 'string' && value.endsWith('%')) return value;
  
  const numValue = Number(value);
  if (isNaN(numValue)) return value; // Return original value if not a number
  
  let formatted;
  if (Number.isInteger(numValue)) {
    formatted = numValue.toString();
  } else {
    formatted = numValue.toFixed(1);
  }
  
  if (numValue > 0) {
    return `+${formatted}%`;
  } else {
    return `${formatted}%`;
  }
}