// Apps Script Backend – with PDF receipt support & enhanced Main Students sheet
// Includes class columns, monthly fee ticks, missing count, and mobile numbers as text

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;

  if (action === "getStudentDetails") {
    var studentId = e.parameter.studentId ? e.parameter.studentId.trim() : "";
    var studentSheet = ss.getSheetByName(studentId);
    if (!studentSheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Student not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var name = studentSheet.getRange("B1").getValue();
    var father = studentSheet.getRange("B2").getValue();
    var mother = studentSheet.getRange("B3").getValue();
    // Use getDisplayValue() to preserve leading zero in mobile number
    var mobile = studentSheet.getRange("B4").getDisplayValue();
    var roll = studentSheet.getRange("B5").getValue();
    var id = studentSheet.getRange("B6").getValue();
    var section = studentSheet.getRange("B7").getValue();
    var cls = studentSheet.getRange("B8").getValue();

    return ContentService.createTextOutput(JSON.stringify({
      name: name, father: father, mother: mother, mobile: mobile,
      roll: roll, id: id, section: section, class: cls
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Return all data from Main Students
  var mainSheet = ss.getSheetByName("Main Students");
  if (!mainSheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Main Students sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var data = mainSheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var action = data.action;

  // Ensure Main Students sheet has full structure (including class columns and text mobile)
  var mainSheet = ensureMainSheetStructure(ss);

  // ---------- CREATE ACCOUNT ----------
  if (action === "create") {
    var studentId = data.studentIdNew ? data.studentIdNew.toString().trim() : "";
    var studentName = data.studentName ? data.studentName.toString().trim() : "";
    var father = data.father ? data.father.toString().trim() : "";
    var mother = data.mother ? data.mother.toString().trim() : "";
    var roll = data.roll ? data.roll.toString().trim() : "";
    var cls = data.cls ? data.cls.toString().trim() : "";
    var section = data.section ? data.section.toString().trim() : "";
    var mobile = data.mobile ? data.mobile.toString().trim() : "";

    // Get headers to locate column indices
    var headers = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0];
    var totalCols = headers.length;

    // Prepare a new row with empty values
    var newRow = new Array(totalCols).fill("");

    // Fill basic details
    newRow[0] = mainSheet.getLastRow();                 // Serial No (simple, can be improved)
    newRow[1] = cls;                                    // Class
    newRow[2] = studentName;                            // Name
    newRow[3] = studentId;                              // ID
    newRow[4] = mobile;                                 // Mobile (as string)
    newRow[5] = 0;                                      // Total Fee (initially 0)

    // Set tick in the appropriate class column
    var classColIndex = getClassColumnIndex(headers, cls);
    if (classColIndex !== -1) newRow[classColIndex] = "✓";

    // Month columns remain empty initially
    // Missing count set to 12 (all months unpaid)
    var missingColIndex = headers.indexOf("Missing Count");
    if (missingColIndex !== -1) newRow[missingColIndex] = 12;

    // Append the row
    mainSheet.appendRow(newRow);

    // Ensure the mobile cell in this new row is formatted as text (important for leading zeros)
    var lastRow = mainSheet.getLastRow();
    mainSheet.getRange(lastRow, 5).setNumberFormat('@'); // Column 5 = Mobile

    // Create individual student sheet (unchanged)
    var studentSheet = ss.getSheetByName(studentId);
    if (!studentSheet) {
      studentSheet = ss.insertSheet(studentId);
      studentSheet.getRange("A1").setValue("Name"); studentSheet.getRange("B1").setValue(studentName);
      studentSheet.getRange("A2").setValue("Father Name"); studentSheet.getRange("B2").setValue(father);
      studentSheet.getRange("A3").setValue("Mother Name"); studentSheet.getRange("B3").setValue(mother);
      studentSheet.getRange("A4").setValue("Mobile"); studentSheet.getRange("B4").setValue(mobile);
      studentSheet.getRange("A5").setValue("Roll"); studentSheet.getRange("B5").setValue(roll);
      studentSheet.getRange("A6").setValue("ID"); studentSheet.getRange("B6").setValue(studentId);
      studentSheet.getRange("A7").setValue("Section"); studentSheet.getRange("B7").setValue(section);
      studentSheet.getRange("A8").setValue("Class"); studentSheet.getRange("B8").setValue(cls);

      var feeHeaders = ["Month", "Tuition Fee", "Admission Fee", "Re-Admission Fee", "Exam Fee", "Computer Fee", "Late Fee", "Sports Fee", "T.C Fee", "Miscellaneous", "Month Total", "Receipt No"];
      studentSheet.getRange(9, 1, 1, feeHeaders.length).setValues([feeHeaders]);

      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (var i = 0; i < 12; i++) {
        studentSheet.getRange(10 + i, 1).setValue(months[i]);
      }
      studentSheet.getRange(22, 1).setValue("Total");
    }

    // Sort main sheet by class custom order
    sortMainSheetByClass(mainSheet);

    return ContentService.createTextOutput(JSON.stringify({ result: "created" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ---------- FEE SUBMISSION ----------
  if (action === "fee") {
    var studentId = data.studentId ? data.studentId.toString().trim() : "";
    var month = data.month;
    var fees = data.fees;

    var studentSheet = ss.getSheetByName(studentId);
    if (!studentSheet) {
      return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "Student sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var monthIndex = monthsList.indexOf(month);
    if (monthIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "Invalid month" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Update student sheet fees (unchanged)
    var feeCols = ["tuition", "admission", "readmission", "exam", "computer", "late", "sports", "tc", "misc"];
    for (var i = 0; i < feeCols.length; i++) {
      studentSheet.getRange(10 + monthIndex, 2 + i).setValue(Number(fees[feeCols[i]] || 0));
    }

    var monthTotal = feeCols.reduce((sum, f) => sum + Number(fees[f] || 0), 0);
    studentSheet.getRange(10 + monthIndex, 11).setValue(monthTotal);

    // Update section totals (row 22)
    for (var i = 0; i < feeCols.length; i++) {
      var total = 0;
      for (var j = 10; j <= 21; j++) {
        total += Number(studentSheet.getRange(j, 2 + i).getValue() || 0);
      }
      studentSheet.getRange(22, 2 + i).setValue(total);
    }

    var totalPaid = 0;
    for (var i = 0; i < feeCols.length; i++) {
      totalPaid += Number(studentSheet.getRange(22, 2 + i).getValue() || 0);
    }

    // Update main sheet
    var headers = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0];
    var idCol = headers.indexOf("ID");
    var totalFeeCol = headers.indexOf("Total Fee");
    var janCol = headers.indexOf("Jan");
    var missingCol = headers.indexOf("Missing Count");

    var mainData = mainSheet.getDataRange().getValues();
    for (var i = 1; i < mainData.length; i++) {
      if (mainData[i][idCol] == studentId) {
        var rowNum = i + 1;
        // Update Total Fee
        mainSheet.getRange(rowNum, totalFeeCol + 1).setValue(totalPaid);

        // Update the specific month column with a tick mark
        if (janCol !== -1) {
          var monthCol = janCol + monthIndex; // 0-based
          mainSheet.getRange(rowNum, monthCol + 1).setValue("✓");
        }

        // Recalculate missing count: count months without "✓"
        var missing = 0;
        for (var m = 0; m < 12; m++) {
          var cellValue = mainSheet.getRange(rowNum, janCol + m + 1).getValue();
          if (cellValue !== "✓") missing++;
        }
        if (missingCol !== -1) {
          mainSheet.getRange(rowNum, missingCol + 1).setValue(missing);
        }
        break;
      }
    }

    // Sort main sheet by class custom order
    sortMainSheetByClass(mainSheet);

    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ---------- GENERATE RECEIPT NUMBER (unchanged) ----------
  if (action === "generateReceipt") {
    var studentId = data.studentId ? data.studentId.toString().trim() : "";
    var month = data.month;

    var props = PropertiesService.getScriptProperties();
    var lastReceipt = props.getProperty("LAST_RECEIPT");
    var nextNumber = lastReceipt ? parseInt(lastReceipt) + 1 : 2601;
    props.setProperty("LAST_RECEIPT", nextNumber.toString());
    var receiptStr = "wc" + nextNumber;

    var studentSheet = ss.getSheetByName(studentId);
    if (studentSheet) {
      var monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var monthIndex = monthsList.indexOf(month);
      if (monthIndex !== -1) {
        studentSheet.getRange(10 + monthIndex, 12).setValue(receiptStr);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ receiptNumber: receiptStr }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "Unknown action" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ensures the Main Students sheet has the full structure:
 * - Class columns (Play, Nursery, KG, 1, 2, 3, 4, 5)
 * - Month columns (Jan–Dec)
 * - Missing Count column
 * - Mobile column formatted as plain text (to preserve leading zeros)
 * If the sheet is missing columns, it rebuilds the sheet with the new structure
 * and migrates existing data.
 */
function ensureMainSheetStructure(ss) {
  var sheet = ss.getSheetByName("Main Students");
  var fullHeaders = ["Serial No", "Class", "Name", "ID", "Mobile", "Total Fee",
                     "Play", "Nursery", "KG", "1", "2", "3", "4", "5",
                     "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                     "Missing Count"];

  if (!sheet) {
    // Create new sheet with full headers
    sheet = ss.insertSheet("Main Students");
    sheet.getRange(1, 1, 1, fullHeaders.length).setValues([fullHeaders]);
    // Set Mobile column (column E) to text format for all rows (including future)
    sheet.getRange(2, 5, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    return sheet;
  }

  // Check if current headers match the full structure
  var lastCol = sheet.getLastColumn();
  var currentHeaders = (lastCol > 0) ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  // If headers are already correct, ensure mobile column is text and return
  if (currentHeaders.length === fullHeaders.length &&
      currentHeaders.every((val, idx) => val === fullHeaders[idx])) {
    // Ensure mobile column format is text
    sheet.getRange(2, 5, sheet.getLastRow() - 1, 1).setNumberFormat('@');
    return sheet;
  }

  // --- Migration needed ---
  // Read all existing data
  var data = sheet.getDataRange().getValues();
  var oldHeaders = data.length > 0 ? data[0] : [];
  var oldRows = data.slice(1);

  // Create a new temporary sheet to rebuild
  var newSheet = ss.insertSheet("Main Students New");
  newSheet.getRange(1, 1, 1, fullHeaders.length).setValues([fullHeaders]);

  // Prepare new rows
  var newRows = [];
  for (var r = 0; r < oldRows.length; r++) {
    var oldRow = oldRows[r];
    var newRow = new Array(fullHeaders.length).fill("");

    // Map basic fields by header name (case-insensitive)
    for (var c = 0; c < oldHeaders.length; c++) {
      var header = oldHeaders[c];
      if (!header) continue;
      var headerLower = header.toString().toLowerCase();
      var value = oldRow[c];

      if (headerLower === "serial no") newRow[0] = value;
      else if (headerLower === "class") newRow[1] = value;
      else if (headerLower === "name") newRow[2] = value;
      else if (headerLower === "id") newRow[3] = value;
      else if (headerLower === "mobile") {
        // Convert to string to preserve any existing leading zeros (though may be lost)
        newRow[4] = value !== undefined && value !== null ? value.toString() : "";
      }
      else if (headerLower === "total fee") newRow[5] = value;
    }

    // Set class tick based on Class value (newRow[1])
    var className = newRow[1] ? newRow[1].toString().trim() : "";
    var classColIdx = getClassColumnIndex(fullHeaders, className);
    if (classColIdx !== -1) newRow[classColIdx] = "✓";

    // Copy month data if it exists in old row
    var oldJanIdx = -1;
    for (var c = 0; c < oldHeaders.length; c++) {
      if (oldHeaders[c] === "Jan") { oldJanIdx = c; break; }
    }
    if (oldJanIdx !== -1) {
      for (var m = 0; m < 12; m++) {
        var oldMonthIdx = oldJanIdx + m;
        if (oldMonthIdx < oldRow.length) {
          newRow[14 + m] = oldRow[oldMonthIdx]; // 14 = index of Jan in fullHeaders
        }
      }
    }

    // Calculate missing count based on month columns (14 to 25)
    var missing = 0;
    for (var m = 0; m < 12; m++) {
      if (newRow[14 + m] !== "✓") missing++;
    }
    newRow[26] = missing; // Missing Count index

    newRows.push(newRow);
  }

  // Write all new rows
  if (newRows.length > 0) {
    newSheet.getRange(2, 1, newRows.length, fullHeaders.length).setValues(newRows);
  }

  // Set Mobile column (column E) to text format for all rows
  newSheet.getRange(2, 5, newSheet.getLastRow() - 1, 1).setNumberFormat('@');

  // Delete old sheet and rename new one
  ss.deleteSheet(sheet);
  newSheet.setName("Main Students");

  return ss.getSheetByName("Main Students");
}

/**
 * Returns the column index (0-based) for the class tick column based on class name.
 * @param {Array} headers - The header row array.
 * @param {string} className - e.g., "Play", "Nursery", "KG", "1", etc.
 * @returns {number} The column index, or -1 if not found.
 */
function getClassColumnIndex(headers, className) {
  var classMap = {
    "PLAY": "Play",
    "NURSERY": "Nursery",
    "KG": "KG",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5"
  };
  var normalized = className.toString().trim().toUpperCase();
  var targetHeader = classMap[normalized];
  if (!targetHeader) return -1;
  return headers.indexOf(targetHeader);
}

/**
 * Sorts the Main Students sheet by Class column in custom order:
 * Play, Nursery, KG, 1, 2, 3, 4, 5 (case‑insensitive).
 */
function sortMainSheetByClass(sheet) {
  var classOrder = ["Play", "Nursery", "KG", "1", "2", "3", "4", "5"];
  var orderMap = {};
  classOrder.forEach(function(cls, idx) { orderMap[cls.toUpperCase()] = idx; });

  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

  var classCol = header.indexOf("Class");
  if (classCol === -1) return;

  rows.sort(function(a, b) {
    var aClass = (a[classCol] || "").toString().trim().toUpperCase();
    var bClass = (b[classCol] || "").toString().trim().toUpperCase();
    var aIdx = orderMap.hasOwnProperty(aClass) ? orderMap[aClass] : classOrder.length;
    var bIdx = orderMap.hasOwnProperty(bClass) ? orderMap[bClass] : classOrder.length;
    return aIdx - bIdx;
  });

  var sortedData = [header].concat(rows);
  sheet.clear();
  sheet.getRange(1, 1, sortedData.length, sortedData[0].length).setValues(sortedData);
}

