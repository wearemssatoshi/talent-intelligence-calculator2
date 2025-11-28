function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Define the expected order of columns based on the CSV headers
    // Timestamp,Name,Affiliation,JobTitle,TypeSelf,TypeOther,TotalScore,Qualifications,QualScore,MeisterRank,p1...m6
    const nextRow = [];
    const timestamp = new Date();
    
    // Helper to get param or empty string
    const getParam = (name) => e.parameter[name] || '';

    nextRow.push(timestamp); // Timestamp
    nextRow.push(getParam('user-name')); // Name
    nextRow.push(getParam('user-affiliation')); // Affiliation
    nextRow.push(getParam('user-job-title')); // JobTitle
    nextRow.push(getParam('TypeSelf')); // TypeSelf
    nextRow.push(getParam('TypeOther')); // TypeOther
    nextRow.push(getParam('totalScore')); // TotalScore
    nextRow.push(getParam('qualifications')); // Qualifications
    nextRow.push(getParam('qualificationScore')); // QualScore
    nextRow.push(getParam('meisterRank')); // MeisterRank

    // Skill Matrix Scores (p1-p6, s1-s6, e1-e6, m1-m6)
    const prefixes = ['p', 's', 'e', 'm'];
    prefixes.forEach(prefix => {
      for (let i = 1; i <= 6; i++) {
        nextRow.push(getParam(`${prefix}${i}`));
      }
    });

    sheet.appendRow(nextRow);

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    
    // Assume Row 1 is header, start from Row 2
    const data = [];
    
    // Column Indices (0-based) based on:
    // Timestamp,Name,Affiliation,JobTitle,TypeSelf,TypeOther,TotalScore,Qualifications,QualScore,MeisterRank,p1...
    // 0,        1,   2,          3,       4,       5,        6,         7,             8,        9,          10...
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[1]) continue; // Skip empty names
      
      // Collect detailed scores (p1-m6) -> Indices 10 to 33
      const detailedScores = row.slice(10, 34);

      data.push({
        name: row[1],
        affiliation: row[2],
        jobTitle: row[3],
        type: row[5], // Using TypeOther for Manager Dashboard
        typeSelf: row[4], // Including Self for reference if needed
        score: row[6],
        qualifications: row[7],
        meisterRank: row[9],
        detailedScores: detailedScores
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'success', 'data': data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'error', 'message': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
