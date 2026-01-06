/**
 * SVD MINDFUL - Google Apps Script Backend
 * 各拠点のスプレッドシートにこのスクリプトをデプロイしてください
 * 
 * 設定手順:
 * 1. Google Spreadsheetを作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードを貼り付け
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ
 * 5. アクセス: 全員（匿名ユーザーを含む）
 * 6. デプロイしてURLをコピー
 * 7. SVD_MINDFUL.htmlのSCRIPT_URLSに設定
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // MINDFUL_Logシートを取得または作成
    let sheet = ss.getSheetByName('MINDFUL_Log');
    if (!sheet) {
      sheet = ss.insertSheet('MINDFUL_Log');
      // ヘッダーを設定（トークン列追加）
      sheet.getRange(1, 1, 1, 22).setValues([[
        'Timestamp', 'Type', 'Name', 'Base',
        'Shift Start', 'Shift End',
        'Condition', 'Temp', 'Fatigue', 'Nausea', 'Nails', 'Hands', 'Uniform',
        'Mind Enjoy', 'Mind Morning', 'Mind Consult',
        'Quests', 'Rating', 'Memo',
        'Token Earned', 'Token Balance', 'Token Breakdown'
      ]]);
      sheet.getRange(1, 1, 1, 22).setFontWeight('bold');
    }
    
    // トークン残高を計算（ユーザー別累計）
    let tokenBalance = 0;
    const tokenEarned = data.tokenEarned || 0;
    
    if (data.type === 'reflection' && tokenEarned > 0) {
      // 既存データからユーザーの累計トークンを取得
      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][2] === data.name && allData[i][3] === data.base) {
          const prevBalance = allData[i][20]; // Token Balance列
          if (prevBalance && !isNaN(prevBalance)) {
            tokenBalance = Math.max(tokenBalance, prevBalance);
          }
        }
      }
      tokenBalance += tokenEarned;
    }
    
    // データを追加
    const row = [
      data.timestamp,
      data.type,
      data.name,
      data.base,
      data.shiftStart || '',
      data.shiftEnd || '',
      data.checks?.condition || '',
      data.checks?.temp || '',
      data.checks?.fatigue || '',
      data.checks?.nausea || '',
      data.checks?.nails || '',
      data.checks?.hands || '',
      data.checks?.uniform || '',
      data.mindChecks?.mind_enjoy || '',
      data.mindChecks?.mind_morning || '',
      data.mindChecks?.mind_consult || '',
      data.quests ? data.quests.map(q => `#${q.id}`).join(', ') : '',
      data.rating || '',
      data.memo || '',
      tokenEarned || '',
      tokenBalance || '',
      data.tokenBreakdown || ''
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      tokenBalance: tokenBalance 
    }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // ダッシュボード用のデータ取得
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('MINDFUL_Log');
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    
    return ContentService.createTextOutput(JSON.stringify({ data: rows }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
