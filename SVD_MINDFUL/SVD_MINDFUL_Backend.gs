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
    
    // 重複防止のための日付取得（workDateがあればその日付、なければ今日）
    const checkDate = data.workDate || new Date().toISOString().split('T')[0];
    const allData = sheet.getDataRange().getValues();
    
    // ============ C/IN 重複チェック ============
    if (data.type === 'checkin') {
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][2] === data.name && allData[i][1] === 'checkin') {
          // timestampから日付を取得して比較
          const rowDate = new Date(allData[i][0]).toISOString().split('T')[0];
          if (rowDate === checkDate) {
            // Already checked in for this date - reject with error
            return ContentService.createTextOutput(JSON.stringify({ 
              success: false,
              error: 'Already checked in for this date',
              duplicate: true
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }
    
    // トークン残高を計算（ユーザー別累計）
    let tokenBalance = 0;
    const tokenEarned = data.tokenEarned || 0;
    
    // ============ C/O (reflection) 重複チェック ============
    if (data.type === 'reflection' && tokenEarned > 0) {
      // Check for duplicate reflection for this date (same user, same date)
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][2] === data.name && allData[i][3] === data.base) {
          // Check if this is a reflection from the same date
          if (allData[i][1] === 'reflection') {
            const rowDate = new Date(allData[i][0]).toISOString().split('T')[0];
            if (rowDate === checkDate) {
              // Already checked out for this date - reject with error
              return ContentService.createTextOutput(JSON.stringify({ 
                success: false,
                error: 'Already checked out for this date',
                duplicate: true
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
          
          // Get previous token balance
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
    
    // ============ C/O時はユーザーデータも更新 ============
    if (data.type === 'reflection' && tokenBalance > 0) {
      updateUserData(data.name, tokenBalance, checkDate);
    }
    
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
  try {
    const action = e?.parameter?.action || 'data';
    
    // バージョン確認
    if (action === 'version') {
      return ContentService.createTextOutput(JSON.stringify({
        version: '3.1.0',
        name: 'SATOSHI AI v3.0 - 寄り添いメンター',
        geminiModel: 'gemini-3-flash-preview',
        features: [
          '寄り添い型メンタリング',
          '相談者コンテキスト理解',
          '幅広いトピック対応',
          'PIN認証ログイン'
        ],
        deployedAt: '2026-01-17'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ============ PIN認証: ユーザー登録 ============
    if (action === 'register') {
      const name = e?.parameter?.name || '';
      const pin = e?.parameter?.pin || '';
      const base = e?.parameter?.base || '';
      
      if (!name || !pin) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: '名前とPINを入力してください' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return registerUser(name, pin, base);
    }
    
    // ============ PIN認証: ログイン ============
    if (action === 'login') {
      const name = e?.parameter?.name || '';
      const pin = e?.parameter?.pin || '';
      
      if (!name || !pin) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: '名前とPINを入力してください' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return loginUser(name, pin);
    }
    
    // ============ データ同期 ============
    if (action === 'sync') {
      const name = e?.parameter?.name || '';
      const pin = e?.parameter?.pin || '';
      
      return syncUserData(name, pin);
    }
    
    // ============ PIN変更 ============
    if (action === 'changePin') {
      const name = e?.parameter?.name || '';
      const currentPin = e?.parameter?.currentPin || '';
      const newPin = e?.parameter?.newPin || '';
      
      return changePinForUser(name, currentPin, newPin);
    }
    
    // INSIGHT機能: 記事取得
    if (action === 'articles') {
      return getInsightArticles();
    }
    
    // INSIGHT機能: SATOSHI AI
    if (action === 'chat') {
      const question = e?.parameter?.q || '';
      const userName = e?.parameter?.name || '相談者';
      const userBase = e?.parameter?.base || '';
      const userRole = e?.parameter?.role || '';
      const chatHistory = e?.parameter?.history || '';
      
      const userContext = {
        name: userName,
        base: userBase,
        role: userRole,
        history: chatHistory
      };
      
      return askSatoshiAI(question, userContext);
    }
    
    // デフォルト: ダッシュボード用データ取得
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

// ============ INSIGHT機能: 記事キュレーション ============
function getInsightArticles() {
  try {
    const RSS_FEEDS = [
      { url: 'https://www.inshokuten.com/foodist/feed/', source: 'FOODIST' }
    ];
    
    const articles = [];
    
    RSS_FEEDS.forEach(feed => {
      try {
        const response = UrlFetchApp.fetch(feed.url, { muteHttpExceptions: true });
        const xml = response.getContentText();
        const doc = XmlService.parse(xml);
        const root = doc.getRootElement();
        const channel = root.getChild('channel');
        const items = channel.getChildren('item');
        
        items.slice(0, 5).forEach(item => {
          articles.push({
            title: item.getChildText('title') || '',
            link: item.getChildText('link') || '',
            date: formatDate(item.getChildText('pubDate')),
            source: feed.source
          });
        });
      } catch (feedError) {
        console.log('Feed error:', feedError);
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({ articles }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message, articles: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy.MM.dd');
  } catch {
    return dateStr;
  }
}

// ============ INSIGHT機能: SATOSHI AI v3.0 ============
function askSatoshiAI(question, userContext = {}) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ 
        response: generateLocalSatoshiResponse(question),
        source: 'local'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 相談者コンテキストを構築
    let contextInfo = '';
    if (userContext.name && userContext.name !== '相談者') {
      contextInfo += `相談者: ${userContext.name}さん\n`;
    }
    if (userContext.base) {
      contextInfo += `拠点: ${userContext.base}\n`;
    }
    if (userContext.role) {
      contextInfo += `役職: ${userContext.role}\n`;
    }
    if (userContext.history) {
      contextInfo += `過去の相談テーマ:\n${userContext.history}\n`;
    }
    
    const systemPrompt = `あなたは「SATOSHI」です。レストラン業界で働く仲間をサポートするAIメンターです。

## あなたの基本姿勢
- **まず聴く**: 相談者の話の意図を正確に理解することを最優先にする
- **押し付けない**: 「こうすべき」ではなく「こういう方法もある」と選択肢を提示
- **実用的**: 抽象論より、明日から使える具体的なアドバイスを優先
- **謙虚に**: 分からないことは正直に「分からない」と言う
- **寄り添う**: 一緒に考えるパートナーとして接する

## 対応できるトピック
あなたはレストラン業界の幅広いトピックに対応できます：

### サービス・接客
- お客様対応の基本（ファースト・スマイル、お見送りなど）
- クレーム対応、トラブル対処
- 高齢者・お子様・外国人ゲストへの対応
- 予約対応、電話応対

### チームワーク・人間関係
- 仲間との連携（サイレント・パス）
- 先輩・後輩との関係
- チームビルディング
- コミュニケーション改善

### 商品知識
- ワイン、日本酒、カクテルの基礎
- 料理の説明の仕方
- アレルギー対応
- おすすめの仕方

### キャリア・成長
- スキルアップの方法
- 将来のキャリアパス
- モチベーション維持
- 資格取得

### 業界知識
- レストラン経営の基礎
- トレンド・最新情報
- 衛生管理
- 労務・シフト

## 相談者の情報
${contextInfo || '（初めての相談者です）'}

## 回答ガイドライン
1. 質問に直接答える（関係ない話に飛ばない）
2. 200〜400文字程度で簡潔に
3. 具体的な次のアクションを1つ提案
4. 必要に応じて絵文字を使う（控えめに）
5. 押し付けがましい励ましは不要（自然な言葉で締める）
6. 相談者の名前が分かる場合は名前で呼びかける`;

    const payload = {
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n相談内容: ' + question
        }]
      }]
    };
    
    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );
    
    const responseText = response.getContentText();
    console.log('API Response:', responseText);
    
    const result = JSON.parse(responseText);
    console.log('Parsed result:', JSON.stringify(result));
    
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || generateLocalSatoshiResponse(question);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      response: aiText,
      source: 'gemini'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      response: generateLocalSatoshiResponse(question),
      source: 'local',
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function generateLocalSatoshiResponse(question) {
  // キーワードに基づいて適切な回答を選択（寄り添い型）
  const q = question.toLowerCase();
  
  if (q.includes('サービス') || q.includes('接客') || q.includes('お客様') || q.includes('ゲスト')) {
    return 'サービスについての相談だね。一つ提案があるよ。お客様と目が合った瞬間、自分から先に笑顔を届けてみて。これを「ファースト・スマイル」と呼んでいるんだけど、第一印象が大きく変わるよ。まずこれを1日意識してみてどうかな？';
  }
  
  if (q.includes('チーム') || q.includes('仲間') || q.includes('協力') || q.includes('連携') || q.includes('人間関係')) {
    return 'チームについての相談だね。仲間との連携で大切なのは「頼まれる前にサポートする」こと。相手の視線の先を読んで動けると、言葉なしで通じる信頼関係が生まれるよ。何か具体的に困っていることがあれば、もう少し詳しく教えて？';
  }
  
  if (q.includes('キャリア') || q.includes('成長') || q.includes('将来') || q.includes('夢') || q.includes('スキル')) {
    return 'キャリアについて考えているんだね。レストランで身につくスキルは、実は他の業界でも通用するものが多いよ。コミュニケーション、チームワーク、問題解決力...。今の仕事で何を伸ばしたいか、具体的に聞かせてもらえる？';
  }
  
  if (q.includes('忙しい') || q.includes('大変') || q.includes('疲れ') || q.includes('つらい') || q.includes('しんどい')) {
    return '大変な状況なんだね。まず話してくれてありがとう。忙しい時こそ、できることとできないことを整理することが大事だよ。今一番負担になっていることは何？整理を手伝えるかもしれない。';
  }
  
  if (q.includes('ワイン') || q.includes('お酒') || q.includes('料理') || q.includes('メニュー')) {
    return '商品知識についての質問だね。詳しく答えたいところなんだけど、今ちょっとネットワークの調子が良くなくて...。もう一度試してもらえると、もっと詳しく調べて答えられるよ！';
  }
  
  if (q.includes('クレーム') || q.includes('怒') || q.includes('トラブル')) {
    return 'トラブル対応の相談だね。まず落ち着いて状況を整理しよう。お客様が何に不満を感じているか、正確に理解することが第一歩。具体的にどんな状況か教えてもらえる？一緒に対応を考えよう。';
  }
  
  // デフォルトの回答（謙虚・寄り添い型）
  const responses = [
    'いい質問だね。もう少し詳しく状況を教えてもらえる？具体的なアドバイスができると思う。',
    'その悩み、しっかり聞きたい。背景や状況をもう少し教えてくれると、一緒に考えられるよ。',
    '分かった、考えてみよう。何か特に気になっていることや、試してみたいことはある？',
    '相談してくれてありがとう。どんな結果を目指しているか教えてもらえると、具体的な提案ができそう。'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// テスト用関数
function testGemini() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  console.log('API Key exists:', !!key);
  console.log('Key starts with:', key ? key.substring(0, 10) : 'null');
  
  if (key) {
    const result = askSatoshiAI('レストランで働く若者へのキャリアアドバイスを3つ教えて');
    console.log('Result:', result.getContent());
  }
}

function forceAuth() {
  const test = UrlFetchApp.fetch('https://www.google.com');
  console.log('Success!', test.getResponseCode());
}

// ============ PIN認証システム ============

/**
 * ユーザーシートを取得または作成
 */
function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MINDFUL_Users');
  if (!sheet) {
    sheet = ss.insertSheet('MINDFUL_Users');
    sheet.getRange(1, 1, 1, 7).setValues([[
      'Name', 'PIN_Hash', 'Base', 'Token_Balance', 'Checkout_Dates', 'Created_At', 'Last_Login'
    ]]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  return sheet;
}

/**
 * 簡易ハッシュ関数（本番環境ではより強力なハッシュを推奨）
 */
function hashPin(pin) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin);
  return hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * ユーザー登録
 */
function registerUser(name, pin, base) {
  try {
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    
    // 既存ユーザーチェック
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'この名前は既に登録されています。ログインしてください。',
          exists: true
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 新規ユーザー登録
    const pinHash = hashPin(pin);
    const now = new Date().toISOString();
    
    sheet.appendRow([name, pinHash, base, 0, '[]', now, now]);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: '登録完了！',
      tokenBalance: 0
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ログイン
 */
function loginUser(name, pin) {
  try {
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    const pinHash = hashPin(pin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name && data[i][1] === pinHash) {
        // ログイン成功 - 最終ログイン時刻を更新
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
        
        // ユーザーデータを返す
        const tokenBalance = data[i][3] || 0;
        const checkoutDates = data[i][4] || '[]';
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          name: name,
          base: data[i][2] || '',
          tokenBalance: tokenBalance,
          checkoutDates: JSON.parse(checkoutDates)
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ログイン失敗
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '名前またはPINが正しくありません'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * データ同期（トークン残高とC/O履歴を取得/更新）
 */
function syncUserData(name, pin) {
  try {
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    const pinHash = hashPin(pin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name && data[i][1] === pinHash) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          tokenBalance: data[i][3] || 0,
          checkoutDates: JSON.parse(data[i][4] || '[]')
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '認証に失敗しました'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * トークン残高とC/O履歴を更新（C/O時に呼び出し）
 */
function updateUserData(name, tokenBalance, checkoutDate) {
  try {
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name) {
        // トークン残高を更新
        sheet.getRange(i + 1, 4).setValue(tokenBalance);
        
        // C/O日付を追加
        let checkoutDates = [];
        try {
          checkoutDates = JSON.parse(data[i][4] || '[]');
        } catch (e) {
          checkoutDates = [];
        }
        
        if (!checkoutDates.includes(checkoutDate)) {
          checkoutDates.push(checkoutDate);
          // 過去30日分だけ保持
          if (checkoutDates.length > 30) {
            checkoutDates.shift();
          }
          sheet.getRange(i + 1, 5).setValue(JSON.stringify(checkoutDates));
        }
        
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('updateUserData error:', error);
    return false;
  }
}

/**
 * PIN変更
 */
function changePinForUser(name, currentPin, newPin) {
  try {
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    const currentPinHash = hashPin(currentPin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name) {
        // 現在のPINを確認
        if (data[i][1] !== currentPinHash) {
          return ContentService.createTextOutput(JSON.stringify({ 
            success: false, 
            error: '現在のPINが正しくありません'
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        // 新しいPINを保存
        const newPinHash = hashPin(newPin);
        sheet.getRange(i + 1, 2).setValue(newPinHash);
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          message: 'PINを変更しました'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
