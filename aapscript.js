// Apps Script Backend – with PDF receipt support & enhanced Main Students sheet
// Includes class columns, monthly fee ticks, missing count, and mobile numbers as text
// Version: Added student login website (action=loginPage) – default behavior unchanged.

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e ? e.parameter.action : null;

  // Serve the student login page only when explicitly requested
  if (action === "loginPage") {
    return HtmlService.createHtmlOutputFromFile('LoginPage');
  }

  // Existing action: get student details (used by admin panel)
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

  // New action: student login (returns JSON success/failure)
  if (action === "studentLogin") {
    var id = e.parameter.id ? e.parameter.id.trim() : "";
    var mobile = e.parameter.mobile ? e.parameter.mobile.trim() : "";
    var studentSheet = ss.getSheetByName(id);
    if (!studentSheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Student not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var storedMobile = studentSheet.getRange("B4").getDisplayValue().toString();
    // Compare last 11 digits
    var last11Stored = storedMobile.slice(-11);
    var last11Input = mobile.slice(-11);
    if (last11Stored === last11Input) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, studentId: id }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid mobile number" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // New action: fetch student sheet data (used by the dashboard)
  if (action === "getStudentSheetData") {
    var studentId = e.parameter.studentId ? e.parameter.studentId.trim() : "";
    var studentSheet = ss.getSheetByName(studentId);
    if (!studentSheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Student not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Fetch student profile info (rows 1-8, columns A-B)
    var profile = {};
    var profileLabels = ["Name", "Father Name", "Mother Name", "Mobile", "Roll", "ID", "Section", "Class"];
    for (var i = 0; i < profileLabels.length; i++) {
      var label = profileLabels[i];
      var value = studentSheet.getRange(i+1, 2).getDisplayValue();
      profile[label] = value;
    }

    // Fetch month data (rows 10-21, columns A-L)
    var monthData = [];
    for (var i = 0; i < 12; i++) {
      var rowData = [];
      for (var j = 1; j <= 12; j++) {
        var cell = studentSheet.getRange(10 + i, j).getDisplayValue();
        rowData.push(cell);
      }
      monthData.push(rowData);
    }

    // Fetch total row (row 22, columns A-L)
    var totalRow = [];
    for (var j = 1; j <= 12; j++) {
      totalRow.push(studentSheet.getRange(22, j).getDisplayValue());
    }

    var feeHeaders = ["Month", "Tuition Fee", "Admission Fee", "Re-Admission Fee", "Exam Fee", "Computer Fee", "Late Fee", "Sports Fee", "T.C Fee", "Miscellaneous", "Month Total", "Receipt No"];
    return ContentService.createTextOutput(JSON.stringify({
      profile: profile,
      monthData: monthData,
      totalRow: totalRow,
      feeHeaders: feeHeaders
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // DEFAULT BEHAVIOR (no action, or unknown action):
  // Return all data from the "Main Students" sheet as JSON.
  // This preserves your existing admin panel functionality.
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

    var headers = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0];
    var totalCols = headers.length;

    var newRow = new Array(totalCols).fill("");
    newRow[0] = mainSheet.getLastRow();
    newRow[1] = cls;
    newRow[2] = studentName;
    newRow[3] = studentId;
    newRow[4] = mobile;
    newRow[5] = 0;

    var classColIndex = getClassColumnIndex(headers, cls);
    if (classColIndex !== -1) newRow[classColIndex] = "✓";

    var missingColIndex = headers.indexOf("Missing Count");
    if (missingColIndex !== -1) newRow[missingColIndex] = 12;

    mainSheet.appendRow(newRow);
    var lastRow = mainSheet.getLastRow();
    mainSheet.getRange(lastRow, 5).setNumberFormat('@');

    var studentSheet = ss.getSheetByName(studentId);
    if (!studentSheet) {
      studentSheet = ss.insertSheet(studentId);
      
      // ---------- PROFILE SECTION (rows 1-8) ----------
      var profileLabels = ["Name", "Father Name", "Mother Name", "Mobile", "Roll", "ID", "Section", "Class"];
      var profileValues = [studentName, father, mother, mobile, roll, studentId, section, cls];
      for (var i = 0; i < profileLabels.length; i++) {
        studentSheet.getRange(i + 1, 1).setValue(profileLabels[i]);
        studentSheet.getRange(i + 1, 2).setValue(profileValues[i]);
      }

      // ---------- TABLE HEADER (row 9) ----------
      var feeHeaders = ["Month", "Tuition Fee", "Admission Fee", "Re-Admission Fee", "Exam Fee", "Computer Fee", "Late Fee", "Sports Fee", "T.C Fee", "Miscellaneous", "Month Total", "Receipt No"];
      studentSheet.getRange(9, 1, 1, feeHeaders.length).setValues([feeHeaders]);

      // ---------- MONTH ROWS (10-21) ----------
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (var i = 0; i < 12; i++) {
        studentSheet.getRange(10 + i, 1).setValue(months[i]);
      }

      // ---------- TOTAL ROW (row 22) ----------
      studentSheet.getRange(22, 1).setValue("Total");

      // ---------- SPACING ROW (row 23) ----------
      studentSheet.insertRowAfter(22); // creates row 23 empty

      // ---------- NOTICE ROW (row 24) ----------
      studentSheet.insertRowAfter(23); // creates row 24
      studentSheet.getRange(24, 1).setValue("Notice:");
      var lastFeeCol = feeHeaders.length; // 12
      studentSheet.getRange(24, 2, 1, lastFeeCol - 1).merge();
      studentSheet.getRange(24, 2, 1, lastFeeCol - 1).setBackground("#FFF9C4");

      // ---------- APPLY FORMATTING ----------
      // Set entire sheet font to Arial, size 12
      studentSheet.getRange(1, 1, studentSheet.getLastRow(), lastFeeCol)
        .setFontFamily("Arial").setFontSize(12);

      // 1. Profile area (rows 1-8, cols A-B)
      studentSheet.getRange(1, 1, 8, 2)
        .setBackground("#F5F9FF");
      studentSheet.getRange(1, 1, 8, 1)  // labels
        .setFontWeight("bold");
      studentSheet.getRange(1, 2, 8, 1)  // values
        .setFontWeight("normal");

      // 2. Bottom border under row 8 (columns A-L)
      studentSheet.getRange(8, 1, 1, lastFeeCol)
        .setBorder(true, false, false, false, false, false, null, null)
        .setBorder(false, false, true, false, false, false, null, null);

      // 3. Header row (row 9)
      studentSheet.getRange(9, 1, 1, lastFeeCol)
        .setBackground("#1976D2")
        .setFontColor("white")
        .setFontWeight("bold")
        .setHorizontalAlignment("center");

      // 4. Monthly rows (10-21): alternating colors, alignment, borders
      var colorEven = "#F5FAFF";
      var colorOdd = "#FFFFFF";
      for (var r = 10; r <= 21; r++) {
        var bgColor = (r % 2 === 0) ? colorEven : colorOdd;
        studentSheet.getRange(r, 1, 1, lastFeeCol)
          .setBackground(bgColor);
      }
      // Month names (col A) left-aligned
      studentSheet.getRange(10, 1, 12, 1).setHorizontalAlignment("left");
      // Numeric columns (B-K) center-aligned
      studentSheet.getRange(10, 2, 12, 10).setHorizontalAlignment("center");
      // Receipt No (col L) center-aligned
      studentSheet.getRange(10, 12, 12, 1).setHorizontalAlignment("center");
      // Light borders for all cells in rows 10-21, columns A-L
      studentSheet.getRange(10, 1, 12, lastFeeCol)
        .setBorder(true, true, true, true, true, true, "#E0E0E0", SpreadsheetApp.BorderStyle.SOLID);

      // 5. Total row (row 22)
      studentSheet.getRange(22, 1, 1, lastFeeCol)
        .setBackground("#E3F2FD")
        .setFontWeight("bold");
      // Thicker top border to separate from monthly rows
      studentSheet.getRange(22, 1, 1, lastFeeCol)
        .setBorder(true, false, false, false, false, false, null, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      // Align "Total" left and values center
      studentSheet.getRange(22, 1).setHorizontalAlignment("left");
      studentSheet.getRange(22, 2, 1, 10).setHorizontalAlignment("center");
      studentSheet.getRange(22, 12, 1, 1).setHorizontalAlignment("center");

      // 6. Notice row (row 24)
      studentSheet.getRange(24, 1).setFontWeight("bold").setHorizontalAlignment("left");
      studentSheet.getRange(24, 2, 1, lastFeeCol - 1)
        .setHorizontalAlignment("left")
        .setFontWeight("normal");

      // 7. Adjust column widths (B, D, C, F, J)
      studentSheet.setColumnWidth(2, 200); // Column B (Tuition Fee)
      studentSheet.setColumnWidth(4, 150); // Column D (Re-Admission Fee)
      studentSheet.setColumnWidth(3, 180); // Column C (Admission Fee)
      studentSheet.setColumnWidth(6, 180); // Column F (Computer Fee)
      studentSheet.setColumnWidth(10, 180); // Column J (Miscellaneous)
    }

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

    var feeCols = ["tuition", "admission", "readmission", "exam", "computer", "late", "sports", "tc", "misc"];
    for (var i = 0; i < feeCols.length; i++) {
      studentSheet.getRange(10 + monthIndex, 2 + i).setValue(Number(fees[feeCols[i]] || 0));
    }

    var monthTotal = feeCols.reduce((sum, f) => sum + Number(fees[f] || 0), 0);
    studentSheet.getRange(10 + monthIndex, 11).setValue(monthTotal);

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

    var headers = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0];
    var idCol = headers.indexOf("ID");
    var totalFeeCol = headers.indexOf("Total Fee");
    var janCol = headers.indexOf("Jan");
    var missingCol = headers.indexOf("Missing Count");

    var mainData = mainSheet.getDataRange().getValues();
    for (var i = 1; i < mainData.length; i++) {
      if (mainData[i][idCol] == studentId) {
        var rowNum = i + 1;
        mainSheet.getRange(rowNum, totalFeeCol + 1).setValue(totalPaid);
        if (janCol !== -1) {
          var monthCol = janCol + monthIndex;
          mainSheet.getRange(rowNum, monthCol + 1).setValue("✓");
        }
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

    sortMainSheetByClass(mainSheet);
    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ---------- GENERATE RECEIPT NUMBER ----------
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
 * Ensures the Main Students sheet has the full structure.
 */
function ensureMainSheetStructure(ss) {
  var sheet = ss.getSheetByName("Main Students");
  var fullHeaders = ["Serial No", "Class", "Name", "ID", "Mobile", "Total Fee",
                     "Play", "Nursery", "KG", "1", "2", "3", "4", "5",
                     "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                     "Missing Count"];

  if (!sheet) {
    sheet = ss.insertSheet("Main Students");
    sheet.getRange(1, 1, 1, fullHeaders.length).setValues([fullHeaders]);
    sheet.getRange(2, 5, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    return sheet;
  }

  var lastCol = sheet.getLastColumn();
  var currentHeaders = (lastCol > 0) ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  if (currentHeaders.length === fullHeaders.length &&
      currentHeaders.every((val, idx) => val === fullHeaders[idx])) {
    sheet.getRange(2, 5, sheet.getLastRow() - 1, 1).setNumberFormat('@');
    return sheet;
  }

  // Migration
  var data = sheet.getDataRange().getValues();
  var oldHeaders = data.length > 0 ? data[0] : [];
  var oldRows = data.slice(1);
  var newSheet = ss.insertSheet("Main Students New");
  newSheet.getRange(1, 1, 1, fullHeaders.length).setValues([fullHeaders]);

  var newRows = [];
  for (var r = 0; r < oldRows.length; r++) {
    var oldRow = oldRows[r];
    var newRow = new Array(fullHeaders.length).fill("");
    for (var c = 0; c < oldHeaders.length; c++) {
      var header = oldHeaders[c];
      if (!header) continue;
      var headerLower = header.toString().toLowerCase();
      var value = oldRow[c];
      if (headerLower === "serial no") newRow[0] = value;
      else if (headerLower === "class") newRow[1] = value;
      else if (headerLower === "name") newRow[2] = value;
      else if (headerLower === "id") newRow[3] = value;
      else if (headerLower === "mobile") newRow[4] = value !== undefined && value !== null ? value.toString() : "";
      else if (headerLower === "total fee") newRow[5] = value;
    }
    var className = newRow[1] ? newRow[1].toString().trim() : "";
    var classColIdx = getClassColumnIndex(fullHeaders, className);
    if (classColIdx !== -1) newRow[classColIdx] = "✓";

    var oldJanIdx = -1;
    for (var c = 0; c < oldHeaders.length; c++) {
      if (oldHeaders[c] === "Jan") { oldJanIdx = c; break; }
    }
    if (oldJanIdx !== -1) {
      for (var m = 0; m < 12; m++) {
        var oldMonthIdx = oldJanIdx + m;
        if (oldMonthIdx < oldRow.length) {
          newRow[14 + m] = oldRow[oldMonthIdx];
        }
      }
    }
    var missing = 0;
    for (var m = 0; m < 12; m++) {
      if (newRow[14 + m] !== "✓") missing++;
    }
    newRow[26] = missing;
    newRows.push(newRow);
  }

  if (newRows.length > 0) {
    newSheet.getRange(2, 1, newRows.length, fullHeaders.length).setValues(newRows);
  }
  newSheet.getRange(2, 5, newSheet.getLastRow() - 1, 1).setNumberFormat('@');
  ss.deleteSheet(sheet);
  newSheet.setName("Main Students");
  return ss.getSheetByName("Main Students");
}

function getClassColumnIndex(headers, className) {
  var classMap = {
    "PLAY": "Play", "NURSERY": "Nursery", "KG": "KG",
    "1": "1", "2": "2", "3": "3", "4": "4", "5": "5"
  };
  var normalized = className.toString().trim().toUpperCase();
  var targetHeader = classMap[normalized];
  if (!targetHeader) return -1;
  return headers.indexOf(targetHeader);
}

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
