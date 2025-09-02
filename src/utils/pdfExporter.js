import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Generate PDF for shopping list
export const generateShoppingListPDF = async (combinedShoppingList, manualItems, lowStockItems) => {
  try {
    const criticalItems = lowStockItems.filter(item => item.currentQuantity === 0);
    const urgentItems = lowStockItems.filter(item => 
      item.currentQuantity > 0 && item.currentQuantity <= item.minStockLevel * 0.5
    );
    const normalLowStock = lowStockItems.filter(item => 
      !criticalItems.includes(item) && !urgentItems.includes(item)
    );

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DentalFlow Shopping List - ${currentDate}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 20px;
            font-size: 12px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #2196F3;
            margin: 0 0 8px 0;
            font-size: 24px;
        }
        .header .subtitle {
            color: #666;
            font-size: 14px;
            margin: 3px 0;
        }
        .summary {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        .summary-stats {
            display: inline-block;
            margin: 0 15px;
        }
        .summary-number {
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
            display: block;
        }
        .summary-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
        }
        .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .critical { color: #f44336; }
        .urgent { color: #ff9800; }
        .low-stock { color: #2196F3; }
        .manual { color: #6366f1; }
        .item {
            background: white;
            border: 1px solid #eee;
            border-left: 3px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .item-name {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 4px;
        }
        .item-details {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        }
        .item-details div {
            margin: 2px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        @media print {
            body { margin: 15px; }
            .section { page-break-inside: avoid; }
            .item { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦷 DentalFlow Shopping List</h1>
        <div class="subtitle">Professional Inventory Management</div>
        <div class="subtitle">Generated: ${currentDate}</div>
    </div>

    <div class="summary">
        <div class="summary-stats">
            <span class="summary-number">${combinedShoppingList.length}</span>
            <div class="summary-label">Total Items</div>
        </div>
        <div class="summary-stats">
            <span class="summary-number critical">${criticalItems.length}</span>
            <div class="summary-label">Out of Stock</div>
        </div>
        <div class="summary-stats">
            <span class="summary-number urgent">${urgentItems.length}</span>
            <div class="summary-label">Urgent</div>
        </div>
        <div class="summary-stats">
            <span class="summary-number manual">${manualItems.length}</span>
            <div class="summary-label">Manual Items</div>
        </div>
    </div>
  `;

  // Critical Items Section
  if (criticalItems.length > 0) {
    html += `
    <div class="section">
        <div class="section-title critical">🔴 CRITICAL - OUT OF STOCK (${criticalItems.length})</div>
    `;
    
    criticalItems.forEach(item => {
      const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
      const estimatedCost = needed * (item.unitCost || 0);
      html += `
        <div class="item">
            <div class="item-name">${item.productName}</div>
            <div class="item-details">
                <div><strong>Current:</strong> ${item.currentQuantity}</div>
                <div><strong>Minimum:</strong> ${item.minStockLevel}</div>
                <div><strong>Suggested Order:</strong> ${needed} units</div>
                ${item.unitCost ? `<div><strong>Unit Cost:</strong> £${item.unitCost.toFixed(2)}</div>` : ''}
                ${item.unitCost ? `<div><strong>Estimated Cost:</strong> £${estimatedCost.toFixed(2)}</div>` : ''}
                ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                ${item.barcode ? `<div><strong>Barcode:</strong> ${item.barcode}</div>` : ''}
                ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
            </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // Urgent Items Section
  if (urgentItems.length > 0) {
    html += `
    <div class="section">
        <div class="section-title urgent">🟡 URGENT - LOW STOCK (${urgentItems.length})</div>
    `;
    
    urgentItems.forEach(item => {
      const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
      const estimatedCost = needed * (item.unitCost || 0);
      html += `
        <div class="item">
            <div class="item-name">${item.productName}</div>
            <div class="item-details">
                <div><strong>Current:</strong> ${item.currentQuantity}</div>
                <div><strong>Minimum:</strong> ${item.minStockLevel}</div>
                <div><strong>Suggested Order:</strong> ${needed} units</div>
                ${item.unitCost ? `<div><strong>Unit Cost:</strong> £${item.unitCost.toFixed(2)}</div>` : ''}
                ${item.unitCost ? `<div><strong>Estimated Cost:</strong> £${estimatedCost.toFixed(2)}</div>` : ''}
                ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                ${item.barcode ? `<div><strong>Barcode:</strong> ${item.barcode}</div>` : ''}
                ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
            </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // Normal Low Stock Items Section
  if (normalLowStock.length > 0) {
    html += `
    <div class="section">
        <div class="section-title low-stock">🟠 LOW STOCK (${normalLowStock.length})</div>
    `;
    
    normalLowStock.forEach(item => {
      const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
      const estimatedCost = needed * (item.unitCost || 0);
      html += `
        <div class="item">
            <div class="item-name">${item.productName}</div>
            <div class="item-details">
                <div><strong>Current:</strong> ${item.currentQuantity}</div>
                <div><strong>Minimum:</strong> ${item.minStockLevel}</div>
                <div><strong>Suggested Order:</strong> ${needed} units</div>
                ${item.unitCost ? `<div><strong>Unit Cost:</strong> £${item.unitCost.toFixed(2)}</div>` : ''}
                ${item.unitCost ? `<div><strong>Estimated Cost:</strong> £${estimatedCost.toFixed(2)}</div>` : ''}
                ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                ${item.barcode ? `<div><strong>Barcode:</strong> ${item.barcode}</div>` : ''}
                ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
            </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // Manual Items Section
  if (manualItems.length > 0) {
    html += `
    <div class="section">
        <div class="section-title manual">📝 MANUALLY ADDED ITEMS (${manualItems.length})</div>
    `;
    
    manualItems.forEach(item => {
      const estimatedCost = (item.quantity || 1) * (item.unitCost || 0);
      html += `
        <div class="item">
            <div class="item-name">${item.productName}</div>
            <div class="item-details">
                <div><strong>Quantity:</strong> ${item.quantity || 1}</div>
                ${item.unitCost ? `<div><strong>Unit Cost:</strong> £${item.unitCost.toFixed(2)}</div>` : ''}
                ${item.unitCost ? `<div><strong>Estimated Cost:</strong> £${estimatedCost.toFixed(2)}</div>` : ''}
                ${item.notes ? `<div><strong>Notes:</strong> ${item.notes}</div>` : ''}
                ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
                <div><strong>Added:</strong> ${new Date(item.dateAdded).toLocaleDateString()}</div>
            </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // Calculate total estimated cost
  let totalEstimatedCost = 0;
  [...criticalItems, ...urgentItems, ...normalLowStock].forEach(item => {
    const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
    totalEstimatedCost += needed * (item.unitCost || 0);
  });
  manualItems.forEach(item => {
    totalEstimatedCost += (item.quantity || 1) * (item.unitCost || 0);
  });

  if (totalEstimatedCost > 0) {
    html += `
    <div class="section">
        <div class="section-title" style="color: #2196F3; text-align: center; font-size: 18px;">💰 TOTAL ESTIMATED COST</div>
        <div class="item" style="text-align: center; background: #e3f2fd; border: 2px solid #2196F3;">
            <div class="item-name" style="font-size: 20px; color: #2196F3;">£${totalEstimatedCost.toFixed(2)}</div>
            <div class="item-details">
                <div>Total estimated cost for all items in this shopping list</div>
                <div>Actual costs may vary based on supplier pricing</div>
            </div>
        </div>
    </div>
    `;
  }

  html += `
    <div class="footer">
        <div>Generated by DentalFlow - Professional Inventory Management</div>
        <div>Report contains ${combinedShoppingList.length} items for restocking</div>
        ${totalEstimatedCost > 0 ? `<div>Total Estimated Budget: £${totalEstimatedCost.toFixed(2)}</div>` : ''}
    </div>
</body>
</html>
  `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html: html,
      base64: false
    });

    return uri;
    
  } catch (error) {
    console.error('Error generating shopping list PDF:', error);
    throw error;
  }
};

// Generate PDF for inventory
export const generateInventoryPDF = async (inventoryItems, practices = [], selectedPracticeId = null) => {
  try {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Filter items if a practice is selected
    let filteredItems = inventoryItems;
    let practiceInfo = '';
    
    if (selectedPracticeId && selectedPracticeId !== 'all') {
      const selectedPractice = practices.find(p => p.id === selectedPracticeId);
      if (selectedPractice) {
        practiceInfo = ` - ${selectedPractice.name}`;
        filteredItems = inventoryItems.filter(item => {
          const itemPracticeId = item.assignedPracticeId || item.practiceId;
          return itemPracticeId === selectedPracticeId;
        });
      }
    }

    // Categorize items
    const criticalItems = filteredItems.filter(item => item.currentQuantity === 0);
    const lowStockItems = filteredItems.filter(item => 
      item.currentQuantity > 0 && item.currentQuantity <= item.minStockLevel
    );
    const normalStockItems = filteredItems.filter(item => 
      item.currentQuantity > item.minStockLevel
    );

    // Calculate total value
    const totalValue = filteredItems.reduce((sum, item) => {
      return sum + (item.currentQuantity * (item.unitCost || 0));
    }, 0);

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DentalFlow Inventory Report${practiceInfo} - ${currentDate}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 20px;
            font-size: 12px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #2196F3;
            margin: 0 0 8px 0;
            font-size: 24px;
        }
        .header .subtitle {
            color: #666;
            font-size: 14px;
            margin: 3px 0;
        }
        .summary {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        .summary-stats {
            display: inline-block;
            margin: 0 10px;
        }
        .summary-number {
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
            display: block;
        }
        .summary-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
        }
        .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .critical { color: #f44336; }
        .low-stock { color: #ff9800; }
        .normal-stock { color: #4caf50; }
        .value { color: #2196F3; }
        .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
        }
        .item {
            background: white;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 10px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            page-break-inside: avoid;
        }
        .item-name {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 6px;
        }
        .item-details {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        }
        .item-details div {
            margin: 2px 0;
        }
        .stock-status {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .critical-status { background: #ffebee; color: #c62828; }
        .low-status { background: #fff3e0; color: #ef6c00; }
        .normal-status { background: #e8f5e8; color: #2e7d32; }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        @media print {
            body { margin: 15px; }
            .summary { page-break-inside: avoid; }
            .section { page-break-inside: avoid; }
            .items-grid { display: block; }
            .item { page-break-inside: avoid; margin-bottom: 8px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦷 DentalFlow Inventory Report</h1>
        <div class="subtitle">Professional Inventory Management${practiceInfo}</div>
        <div class="subtitle">Generated: ${currentDate}</div>
    </div>

    <div class="summary">
        <div class="summary-stats">
            <span class="summary-number">${filteredItems.length}</span>
            <div class="summary-label">Total Items</div>
        </div>
        <div class="summary-stats">
            <span class="summary-number critical">${criticalItems.length}</span>
            <div class="summary-label">Out of Stock</div>
        </div>
        <div class="summary-stats">
            <span class="summary-number" style="color: #ff9800">${lowStockItems.length}</span>
            <div class="summary-label">Low Stock</div>
        </div>
        <div class="summary-stats">
            <span class="summary-number" style="color: #4caf50">${normalStockItems.length}</span>
            <div class="summary-label">Normal Stock</div>
        </div>
        <div class="summary-stats">
            <span class="summary-number value">£${totalValue.toFixed(2)}</span>
            <div class="summary-label">Total Value</div>
        </div>
    </div>
  `;

    // Critical Items Section
    if (criticalItems.length > 0) {
      html += `
      <div class="section">
          <div class="section-title critical">🔴 OUT OF STOCK ITEMS (${criticalItems.length})</div>
          <div class="items-grid">
      `;
      
      criticalItems.forEach(item => {
        html += `
          <div class="item">
              <div class="item-name">${item.productName}</div>
              <span class="stock-status critical-status">Out of Stock</span>
              <div class="item-details">
                  <div><strong>Current:</strong> ${item.currentQuantity}</div>
                  <div><strong>Minimum:</strong> ${item.minStockLevel}</div>
                  <div><strong>Unit Cost:</strong> £${(item.unitCost || 0).toFixed(2)}</div>
                  ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                  ${item.barcode ? `<div><strong>Barcode:</strong> ${item.barcode}</div>` : ''}
                  ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
              </div>
          </div>
        `;
      });
      
      html += `</div></div>`;
    }

    // Low Stock Items Section
    if (lowStockItems.length > 0) {
      html += `
      <div class="section">
          <div class="section-title" style="color: #ff9800">⚠️ LOW STOCK ITEMS (${lowStockItems.length})</div>
          <div class="items-grid">
      `;
      
      lowStockItems.forEach(item => {
        const value = item.currentQuantity * (item.unitCost || 0);
        html += `
          <div class="item">
              <div class="item-name">${item.productName}</div>
              <span class="stock-status low-status">Low Stock</span>
              <div class="item-details">
                  <div><strong>Current:</strong> ${item.currentQuantity}</div>
                  <div><strong>Minimum:</strong> ${item.minStockLevel}</div>
                  <div><strong>Unit Cost:</strong> £${(item.unitCost || 0).toFixed(2)}</div>
                  <div><strong>Total Value:</strong> £${value.toFixed(2)}</div>
                  ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                  ${item.barcode ? `<div><strong>Barcode:</strong> ${item.barcode}</div>` : ''}
                  ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
              </div>
          </div>
        `;
      });
      
      html += `</div></div>`;
    }

    // Normal Stock Items - Complete List
    if (normalStockItems.length > 0) {
      html += `
      <div class="section">
          <div class="section-title normal-stock">✅ NORMAL STOCK ITEMS (${normalStockItems.length})</div>
          <div class="items-grid">
      `;
      
      normalStockItems.forEach(item => {
        const value = item.currentQuantity * (item.unitCost || 0);
        html += `
          <div class="item">
              <div class="item-name">${item.productName}</div>
              <span class="stock-status normal-status">Normal Stock</span>
              <div class="item-details">
                  <div><strong>Current:</strong> ${item.currentQuantity}</div>
                  <div><strong>Minimum:</strong> ${item.minStockLevel}</div>
                  <div><strong>Unit Cost:</strong> £${(item.unitCost || 0).toFixed(2)}</div>
                  <div><strong>Total Value:</strong> £${value.toFixed(2)}</div>
                  ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                  ${item.barcode ? `<div><strong>Barcode:</strong> ${item.barcode}</div>` : ''}
                  ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
              </div>
          </div>
        `;
      });
      
      html += `</div></div>`;
    }

    html += `
      <div class="footer">
          <div>Generated by DentalFlow - Professional Inventory Management</div>
          <div>Report contains ${filteredItems.length} total inventory items${practiceInfo}</div>
      </div>
  </body>
  </html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html: html,
      base64: false
    });

    return uri;
    
  } catch (error) {
    console.error('Error generating inventory PDF:', error);
    throw error;
  }
};

// Export PDF function
export const exportToPDF = async (pdfUri, filename = 'document') => {
  try {
    await Sharing.shareAsync(pdfUri, {
      dialogTitle: `Share ${filename}`,
      mimeType: 'application/pdf'
    });
    
  } catch (error) {
    console.error('Error sharing PDF:', error);
    Alert.alert('Export Error', 'Failed to export document');
  }
};