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

// ── Token Authentication ──
function verifyToken(e, isPost) {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('SVD_API_TOKEN');
  if (!TOKEN) return true; // トークン未設定時はスキップ（段階的導入）
  
  let provided;
  if (isPost) {
    try {
      const data = JSON.parse(e.postData.contents);
      provided = data.token;
    } catch (err) {
      return false;
    }
  } else {
    provided = e?.parameter?.token;
  }
  return provided === TOKEN;
}

function unauthorizedResponse() {
  return ContentService.createTextOutput(JSON.stringify({ 
    success: false, 
    error: 'Unauthorized: Invalid or missing API token' 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // ── Auth Gate ──
  if (!verifyToken(e, true)) return unauthorizedResponse();
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ============ 拠点移籍（transferUser） ============
    if (data.action === 'transferUser') {
      return handleTransferUser(data);
    }
    
    // ============ アナウンスメント投稿 ============
    if (data.action === 'postAnnouncement') {
      return postAnnouncement(data.content, data.author);
    }
    
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
  // ── Auth Gate (version/ping は公開) ──
  const action = e?.parameter?.action || 'data';
  if (action !== 'version' && action !== 'ping') {
    if (!verifyToken(e, false)) return unauthorizedResponse();
  }
  try {
    
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
    
    // ============ SATOSHI AI (OpenClaw) 連携 ============
    if (action === 'askSatoshi') {
      const message = e?.parameter?.message || '';
      const userId = e?.parameter?.userId || 'anonymous';
      
      if (!message) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'メッセージを入力してください' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const reply = callOpenClawGateway(message, userId);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        reply: reply 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ============ PIN認証: ユーザー登録 ============
    if (action === 'register') {
      const name = e?.parameter?.name || '';
      const pin = e?.parameter?.pin || '';
      const base = e?.parameter?.base || '';
      const goalsThisYear = e?.parameter?.goalsThisYear || '[]';
      const goalsFuture = e?.parameter?.goalsFuture || '[]';
      
      if (!name || !pin) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: '名前とPINを入力してください' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return registerUser(name, pin, base, goalsThisYear, goalsFuture);
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
    
    // ============ 目標更新 ============
    if (action === 'updateGoals') {
      const name = e?.parameter?.name || '';
      const pin = e?.parameter?.pin || '';
      const goalsThisYear = e?.parameter?.goalsThisYear || '[]';
      const goalsFuture = e?.parameter?.goalsFuture || '[]';
      
      return updateUserGoals(name, pin, goalsThisYear, goalsFuture);
    }
    
    // ============ 写真アップロード ============
    if (action === 'uploadProfileImage') {
      const name = e?.parameter?.name || '';
      const pin = e?.parameter?.pin || '';
      const image = e?.parameter?.image || '';
      
      return uploadProfileImage(name, pin, image);
    }
    
    // ============ ユーザー検索（移行用） ============
    if (action === 'lookupUser') {
      const name = e?.parameter?.name || '';
      return lookupUserByName(name);
    }
    
    // ============ ユーザー一覧（ダッシュボード用） ============
    if (action === 'users') {
      return getUsersList();
    }
    
    // ============ トークンランキング（ダッシュボード用） ============
    if (action === 'ranking') {
      const period = e?.parameter?.period || '';
      const base = e?.parameter?.base || 'all';
      const fromParam = e?.parameter?.from || '';
      const toParam = e?.parameter?.to || '';
      return getTokenRanking(period, base, fromParam, toParam);
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
    
    // ============ アナウンスメント投稿（GET経由：CORS回避） ============
    if (action === 'postAnnouncement') {
      const content = e?.parameter?.content || '';
      const author = e?.parameter?.author || '管理者';
      return postAnnouncement(content, author);
    }
    
    // ============ アナウンスメント取得 ============
    if (action === 'announcements') {
      return getAnnouncements();
    }
    
    // ============ FCMトークン保存 ============
    if (action === 'saveFcmToken') {
      const name = e?.parameter?.name || '';
      const pin = e?.parameter?.pin || '';
      const fcmToken = e?.parameter?.fcmToken || '';
      return saveFcmToken(name, pin, fcmToken);
    }
    
    // ============ Push通知アナウンスメント送信 ============
    if (action === 'sendAnnouncementPush') {
      const title = e?.parameter?.title || '';
      const body = e?.parameter?.body || '';
      const senderName = e?.parameter?.senderName || '';
      const senderPin = e?.parameter?.senderPin || '';
      return sendAnnouncementPush(title, body, senderName, senderPin);
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

/**
 * ユーザーシートを取得または作成
 */
function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MINDFUL_Users');
  if (!sheet) {
    sheet = ss.insertSheet('MINDFUL_Users');
    sheet.getRange(1, 1, 1, 10).setValues([[
      'Name', 'PIN_Hash', 'Base', 'Token_Balance', 'Checkout_Dates', 'Created_At', 'Last_Login', 'Goals_ThisYear', 'Goals_Future', 'Profile_Image'
    ]]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  } else {
    // 既存シートに必要な列がなければ追加
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let lastCol = sheet.getLastColumn();
    if (!headers.includes('Goals_ThisYear')) {
      sheet.getRange(1, lastCol + 1).setValue('Goals_ThisYear');
      sheet.getRange(1, lastCol + 2).setValue('Goals_Future');
      lastCol += 2;
    }
    if (!headers.includes('Profile_Image')) {
      sheet.getRange(1, lastCol + 1).setValue('Profile_Image');
      lastCol += 1;
    }
    if (!headers.includes('FCM_Token')) {
      sheet.getRange(1, lastCol + 1).setValue('FCM_Token');
    }
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
function registerUser(name, pin, base, goalsThisYear, goalsFuture) {
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
    
    // 目標を含めて保存
    sheet.appendRow([name, pinHash, base, 0, '[]', now, now, goalsThisYear || '[]', goalsFuture || '[]']);
    
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
        
        // ユーザーデータを返す（目標と写真を含む）
        const tokenBalance = data[i][3] || 0;
        const checkoutDates = data[i][4] || '[]';
        const goalsThisYear = data[i][7] || '[]';
        const goalsFuture = data[i][8] || '[]';
        const profileImage = data[i][9] || '';
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          name: name,
          base: data[i][2] || '',
          tokenBalance: tokenBalance,
          checkoutDates: JSON.parse(checkoutDates),
          goalsThisYear: JSON.parse(goalsThisYear),
          goalsFuture: JSON.parse(goalsFuture),
          profileImage: profileImage
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // マイグレーション済みユーザー: PinHashが空 → 初回PIN設定
      if (data[i][0] === name && (!data[i][1] || data[i][1] === '')) {
        console.log('[Migration] First login PIN setup for: ' + name);
        sheet.getRange(i + 1, 2).setValue(pinHash);  // PinHash設定
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString()); // LastLogin
        
        const tokenBalance = data[i][3] || 0;
        const checkoutDates = data[i][4] || '[]';
        const goalsThisYear = data[i][7] || '[]';
        const goalsFuture = data[i][8] || '[]';
        const profileImage = data[i][9] || '';
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          name: name,
          base: data[i][2] || '',
          tokenBalance: tokenBalance,
          checkoutDates: JSON.parse(checkoutDates),
          goalsThisYear: JSON.parse(goalsThisYear),
          goalsFuture: JSON.parse(goalsFuture),
          profileImage: profileImage,
          pinSetup: true
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ============ MINDFUL_Log フォールバック（レガシーユーザー自動マイグレーション） ============
    // MINDFUL_Users に見つからなかった場合、MINDFUL_Log に存在するかチェック
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('MINDFUL_Log');
    if (logSheet) {
      const logData = logSheet.getDataRange().getValues();
      let foundInLog = false;
      let checkoutDatesFromLog = [];
      let userBase = '';
      
      for (let i = 1; i < logData.length; i++) {
        // MINDFUL_Log: [0]=Timestamp, [1]=Type, [2]=Name, [3]=Base
        if (logData[i][2] === name) {
          foundInLog = true;
          // ベース情報を取得（最新のログから）
          if (logData[i][3]) userBase = String(logData[i][3]);
          // チェックアウト日を収集
          if (logData[i][1] && String(logData[i][1]).includes('C/OUT')) {
            const dateStr = logData[i][0]; // Timestamp列
            if (dateStr) {
              const d = new Date(dateStr);
              const formatted = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
              if (!checkoutDatesFromLog.includes(formatted)) {
                checkoutDatesFromLog.push(formatted);
              }
            }
          }
        }
      }
      
      if (foundInLog) {
        // レガシーユーザーを MINDFUL_Users に自動マイグレーション
        console.log('[Migration] Auto-migrating legacy user: ' + name);
        const headers = data[0];
        const newRow = new Array(headers.length).fill('');
        newRow[0] = name;                               // Name
        newRow[1] = pinHash;                            // PinHash
        newRow[2] = userBase;                           // Base
        newRow[3] = checkoutDatesFromLog.length;        // TokenBalance（C/OUT回数 = トークン数）
        newRow[4] = JSON.stringify(checkoutDatesFromLog); // CheckoutDates
        newRow[5] = new Date().toISOString();            // RegisteredAt
        newRow[6] = new Date().toISOString();            // LastLogin
        newRow[7] = '[]';                               // GoalsThisYear
        newRow[8] = '[]';                               // GoalsFuture
        
        sheet.appendRow(newRow);
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          name: name,
          base: userBase,
          tokenBalance: 0,
          checkoutDates: checkoutDatesFromLog,
          goalsThisYear: [],
          goalsFuture: [],
          profileImage: '',
          migrated: true
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

/**
 * 目標を更新
 */
function updateUserGoals(name, pin, goalsThisYear, goalsFuture) {
  try {
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    const pinHash = hashPin(pin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name && data[i][1] === pinHash) {
        // 目標を更新
        sheet.getRange(i + 1, 8).setValue(goalsThisYear || '[]');
        sheet.getRange(i + 1, 9).setValue(goalsFuture || '[]');
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          message: '目標を更新しました'
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

/**
 * 写真をアップロード（Base64をスプレッドシートに保存）
 */
function uploadProfileImage(name, pin, image) {
  try {
    if (!name || !pin || !image) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: '名前、PIN、画像が必要です'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    const pinHash = hashPin(pin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name && data[i][1] === pinHash) {
        // 写真を保存（列10 = Profile_Image）
        sheet.getRange(i + 1, 10).setValue(image);
        SpreadsheetApp.flush();
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          message: '写真を保存しました'
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

/**
 * 拠点移籍を処理（全データを引き継いで新規登録）
 */
function handleTransferUser(data) {
  try {
    const name = data.name;
    const pin = data.pin;
    const newBase = data.newBase;
    const tokenBalance = data.tokenBalance || 0;
    const goalsThisYear = data.goalsThisYear || '[]';
    const goalsFuture = data.goalsFuture || '[]';
    const profileImage = data.profileImage || '';
    const checkoutDates = data.checkoutDates || '[]';
    
    if (!name || !pin || !newBase) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: '名前、PIN、新しい拠点が必要です'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = getUsersSheet();
    const pinHash = hashPin(pin);
    const now = new Date().toISOString();
    
    // 既存ユーザーがいるかチェック
    const data_rows = sheet.getDataRange().getValues();
    for (let i = 1; i < data_rows.length; i++) {
      if (data_rows[i][0] === name) {
        // 既存ユーザーを更新
        sheet.getRange(i + 1, 2).setValue(pinHash);       // PIN
        sheet.getRange(i + 1, 3).setValue(newBase);       // Base
        sheet.getRange(i + 1, 4).setValue(tokenBalance);  // Token
        sheet.getRange(i + 1, 5).setValue(checkoutDates); // C/O履歴
        sheet.getRange(i + 1, 7).setValue(now);           // Last_Login
        sheet.getRange(i + 1, 8).setValue(goalsThisYear); // Goals
        sheet.getRange(i + 1, 9).setValue(goalsFuture);
        sheet.getRange(i + 1, 10).setValue(profileImage); // Photo
        SpreadsheetApp.flush();
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          message: '拠点を移籍しました（既存ユーザー更新）'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 新規ユーザーとして登録
    sheet.appendRow([
      name, pinHash, newBase, tokenBalance, checkoutDates,
      now, now, goalsThisYear, goalsFuture, profileImage
    ]);
    SpreadsheetApp.flush();
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: '拠点を移籍しました（新規登録）'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 名前でユーザーを検索（移行用）
 * MINDFUL_Logから最新のトークン残高を取得
 */
function lookupUserByName(name) {
  try {
    if (!name) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: '名前を入力してください'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('MINDFUL_Log');
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'データが見つかりません'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    // 固定列インデックス（スプレッドシートの実際の構造に合わせる）
    // A=0, B=1, C=2(Name), D=3(Base), ... T=19(Token Earned), U=20(Token Balance)
    const nameIndex = 2;      // C列: Name
    const baseIndex = 3;      // D列: Base
    const typeIndex = 1;      // B列: Type
    const tokenEarnedIndex = 19;  // T列: Token Earned
    const tokenBalanceIndex = 20; // U列: Token Balance
    const timestampIndex = 0;     // A列: Timestamp
    
    // ユーザーのデータを検索
    let totalTokenEarned = 0;
    let latestTokenBalance = 0;
    let latestBase = '';
    let foundUser = false;
    let checkoutDates = [];
    
    for (let i = 1; i < data.length; i++) {
      const rowName = data[i][nameIndex >= 0 ? nameIndex : 2];
      
      if (rowName === name) {
        foundUser = true;
        
        // 拠点を取得（最新を保持）
        const rowBase = data[i][baseIndex >= 0 ? baseIndex : 3];
        if (rowBase) {
          latestBase = rowBase;
        }
        
        // Token Earnedを合計（C/O時のトークン獲得）
        if (tokenEarnedIndex >= 0) {
          const earned = data[i][tokenEarnedIndex];
          if (earned && !isNaN(earned)) {
            totalTokenEarned += Number(earned);
          }
        }
        
        // Token Balanceも確認（最大値を保持）
        if (tokenBalanceIndex >= 0) {
          const balance = data[i][tokenBalanceIndex];
          if (balance && !isNaN(balance) && Number(balance) > latestTokenBalance) {
            latestTokenBalance = Number(balance);
          }
        }
        
        // C/O日付を収集
        const rowType = data[i][typeIndex >= 0 ? typeIndex : 1];
        if (rowType === 'reflection') {
          try {
            const dateStr = new Date(data[i][timestampIndex >= 0 ? timestampIndex : 0]).toISOString().split('T')[0];
            if (!checkoutDates.includes(dateStr)) {
              checkoutDates.push(dateStr);
            }
          } catch (e) {}
        }
      }
    }
    
    // トークン残高は Token Earned の合計 か Token Balance の最大値のどちらか大きい方
    const finalTokenBalance = Math.max(totalTokenEarned, latestTokenBalance);
    
    if (!foundUser) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'ユーザーが見つかりません。名前を正確に入力してください。'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      name: name,
      base: latestBase,
      tokenBalance: finalTokenBalance,
      tokenEarnedTotal: totalTokenEarned,
      checkoutDates: checkoutDates.slice(-30) // 最新30日分
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ユーザー一覧を取得（ダッシュボード用）
 * 登録日とトークン残高を含む
 */
function getUsersList() {
  try {
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // 名前がある行のみ
        users.push({
          name: row[0],
          base: row[2] || '',
          tokenBalance: row[3] || 0,
          createdAt: row[5] || '', // Created_At列
          lastLogin: row[6] || ''  // Last_Login列
        });
      }
    }
    
    // 登録日の新しい順にソート
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      users: users
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false,
      error: error.message,
      users: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * トークンランキングを取得（ダッシュボード用）
 * 期間別・拠点別でToken EarnedをTOP3で返す
 * @param {string} period - today/yesterday/week/month/all（from/toが未指定時のフォールバック）
 * @param {string} base - all/okurayama/moiwa/teletou/akarenga
 * @param {string} fromParam - 開始日 (YYYY-MM-DD)。指定時はperiodより優先
 * @param {string} toParam - 終了日 (YYYY-MM-DD)。指定時はperiodより優先
 */
function getTokenRanking(period, base, fromParam, toParam) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('MINDFUL_Log');
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'MINDFUL_Logシートが見つかりません',
        ranking: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    // 期間の開始日・終了日を計算（JSTで計算）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
    const nowJST = new Date(now.getTime() + jstOffset);
    const todayJST = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate());
    
    let startDate;
    let endDate;
    
    // from/to パラメータが両方指定されている場合はそちらを優先
    if (fromParam && toParam) {
      startDate = new Date(fromParam + 'T00:00:00+09:00');
      endDate = new Date(toParam + 'T23:59:59+09:00');
    } else {
      // フォールバック: periodパラメータで計算
      endDate = new Date(todayJST.getTime() + 24 * 60 * 60 * 1000 - 1); // 今日の23:59:59
      const effectivePeriod = period || 'week';
      switch (effectivePeriod) {
        case 'today':
          startDate = todayJST;
          break;
        case 'yesterday':
          startDate = new Date(todayJST.getTime() - 24 * 60 * 60 * 1000);
          endDate = new Date(todayJST.getTime() - 1); // 昨日の23:59:59
          break;
        case 'week':
          startDate = new Date(todayJST.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(todayJST.getFullYear(), todayJST.getMonth(), 1);
          break;
        case 'all':
        default:
          startDate = new Date(0); // 全期間
          break;
      }
    }
    
    // 拠点名のマッピング（ダッシュボードからの値 → スプレッドシートに保存されている値）
    // フロントエンドのbaseMap: 'moiwayama' → 'moiwa', 'tvtower' → 'teletou'
    // スプレッドシートには英語名(moiwayama, okurayama, tvtower, akarenga)が保存されている
    const baseMap = {
      'okurayama': 'okurayama',
      'moiwa': 'moiwayama',
      'teletou': 'tvtower',
      'akarenga': 'akarenga'
    };
    
    // ユーザー別にToken Earnedを集計
    const tokenByUser = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const timestamp = new Date(row[0]);
      const rowType = row[1];
      const userName = row[2];
      const rowBase = row[3];
      const tokenEarned = Number(row[19]) || 0; // Token Earned列
      
      // reflectionタイプ（C/O）のみカウント
      if (rowType !== 'reflection') continue;
      
      // 期間フィルタ（開始日・終了日の両方でチェック）
      if (timestamp < startDate) continue;
      if (endDate && timestamp > endDate) continue;
      
      // 拠点フィルタ
      if (base && base !== 'all') {
        const targetBase = baseMap[base];
        if (targetBase && rowBase !== targetBase) continue;
      }
      
      // トークンがない場合はスキップ
      if (tokenEarned <= 0) continue;
      
      // ユーザー別に集計
      if (!tokenByUser[userName]) {
        tokenByUser[userName] = { name: userName, base: rowBase, tokens: 0 };
      }
      tokenByUser[userName].tokens += tokenEarned;
    }
    
    // ランキング作成（TOP3）
    const ranking = Object.values(tokenByUser)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 3)
      .map((user, index) => ({
        rank: index + 1,
        name: user.name,
        base: user.base,
        tokens: user.tokens
      }));
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      period: period,
      base: base || 'all',
      ranking: ranking
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false,
      error: error.message,
      ranking: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ アナウンスメント機能 ============

/**
 * アナウンスメントシートを取得または作成
 */
function getAnnouncementsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MINDFUL_Announcements');
  if (!sheet) {
    sheet = ss.insertSheet('MINDFUL_Announcements');
    sheet.getRange(1, 1, 1, 4).setValues([['ID', 'Date', 'Author', 'Content']]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  return sheet;
}

/**
 * アナウンスメント一覧を取得
 */
function getAnnouncements() {
  try {
    const sheet = getAnnouncementsSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        announcements: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const announcements = [];
    for (let i = 1; i < data.length; i++) {
      announcements.push({
        id: data[i][0] || '',
        date: data[i][1] || '',
        author: data[i][2] || '',
        content: data[i][3] || ''
      });
    }
    
    // 新しい順にソート
    announcements.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      announcements: announcements
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false,
      error: error.message,
      announcements: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * アナウンスメントを投稿
 */
function postAnnouncement(content, author) {
  try {
    if (!content) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false,
        error: '内容を入力してください'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = getAnnouncementsSheet();
    const id = 'ann_' + Date.now();
    const now = new Date().toISOString();
    
    sheet.appendRow([id, now, author || '管理者', content]);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      message: 'アナウンスメントを投稿しました',
      id: id
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ SATOSHI AI (OpenClaw Gateway) 連携 ============

/**
 * OpenClaw Gateway経由でSATOSHI AIに質問を送信
 * @param {string} message - 質問メッセージ
 * @param {string} userId - ユーザーID
 * @return {string} AIからの回答
 */
function callOpenClawGateway(message, userId) {
  const GATEWAY_URL = 'https://sat-macbook-pro.tail243dad.ts.net/v1/chat/completions';
  const TOKEN = PropertiesService.getScriptProperties().getProperty('OPENCLAW_TOKEN');
  
  if (!TOKEN) {
    return 'OPENCLAW_TOKENが設定されていません。スクリプトプロパティを確認してください。';
  }
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'openclaw:main',
      messages: [{ role: 'user', content: message }],
      user: userId
    }),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(GATEWAY_URL, options);
    const data = JSON.parse(response.getContentText());
    return data.choices[0].message.content || '回答を取得できませんでした';
  } catch (e) {
    console.error('OpenClaw Error:', e);
    return 'SATOSHIに接続できませんでした。後でお試しください。';
  }
}

// ============ Push通知 (Firebase Cloud Messaging) ============

/**
 * FCMトークンを保存
 */
function saveFcmToken(name, pin, fcmToken) {
  try {
    if (!name || !pin || !fcmToken) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, error: '名前、PIN、FCMトークンが必要です' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = getUsersSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const pinHash = hashPin(pin);
    
    // FCM_Token列のインデックスを取得
    let fcmColIndex = headers.indexOf('FCM_Token');
    if (fcmColIndex === -1) {
      // 列がなければ追加
      fcmColIndex = headers.length;
      sheet.getRange(1, fcmColIndex + 1).setValue('FCM_Token');
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name && data[i][1] === pinHash) {
        sheet.getRange(i + 1, fcmColIndex + 1).setValue(fcmToken);
        SpreadsheetApp.flush();
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, message: 'FCMトークンを保存しました' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, error: 'ユーザーが見つかりません' 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * OAuth2サービスを取得（Firebase Service Account認証）
 * 事前にスクリプトプロパティに以下を設定:
 *   FCM_CLIENT_EMAIL: firebase-adminsdk-xxxxx@svd-mindful.iam.gserviceaccount.com
 *   FCM_PRIVATE_KEY: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
 */
function getFirebaseService() {
  const clientEmail = PropertiesService.getScriptProperties().getProperty('FCM_CLIENT_EMAIL');
  const privateKey = PropertiesService.getScriptProperties().getProperty('FCM_PRIVATE_KEY');
  
  if (!clientEmail || !privateKey) {
    console.error('[FCM] FCM_CLIENT_EMAIL or FCM_PRIVATE_KEY not set in Script Properties');
    return null;
  }
  
  return OAuth2.createService('firebase')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(privateKey.replace(/\\n/g, '\n'))
    .setIssuer(clientEmail)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope('https://www.googleapis.com/auth/firebase.messaging');
}

/**
 * FCM HTTP v1 APIでPush通知を送信
 * @param {string} fcmToken - 対象デバイスのFCMトークン
 * @param {string} title - 通知タイトル
 * @param {string} body - 通知本文
 */
function sendPushNotification(fcmToken, title, body) {
  try {
    const service = getFirebaseService();
    if (!service) {
      console.error('[FCM] Firebase service not configured');
      return false;
    }
    
    if (!service.hasAccess()) {
      console.error('[FCM] OAuth2 access denied:', service.getLastError());
      return false;
    }
    
    const FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/svd-mindful/messages:send';
    
    const message = {
      message: {
        token: fcmToken,
        notification: {
          title: title,
          body: body
        },
        webpush: {
          notification: {
            icon: 'https://wearemssatoshi.github.io/talent-intelligence-calculator2/SVD_MINDFUL/logo/SVD_icon_square.png',
            badge: 'https://wearemssatoshi.github.io/talent-intelligence-calculator2/SVD_MINDFUL/logo/SVD_icon_square.png',
            tag: 'mindful-checkout-reminder',
            requireInteraction: true,
            actions: [
              { action: 'open', title: 'MINDFULを開く' },
              { action: 'dismiss', title: '閉じる' }
            ]
          },
          fcm_options: {
            link: 'https://wearemssatoshi.github.io/talent-intelligence-calculator2/SVD_MINDFUL/index.html'
          }
        }
      }
    };
    
    const response = UrlFetchApp.fetch(FCM_ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + service.getAccessToken()
      },
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    console.log('[FCM] Send response:', statusCode, responseText);
    
    return statusCode === 200;
    
  } catch (error) {
    console.error('[FCM] Send error:', error);
    return false;
  }
}

/**
 * 未チェックアウトスタッフを検出してPush通知を送信
 * 毎日22:00 JSTに時間トリガーで実行される
 */
function checkAndNotifyForgottenCheckouts() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('MINDFUL_Log');
    
    if (!logSheet) {
      console.log('[FCM] MINDFUL_Log sheet not found');
      return;
    }
    
    // 今日の日付を取得（JST）
    const now = new Date();
    const jstDate = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
    const jstHour = parseInt(Utilities.formatDate(now, 'Asia/Tokyo', 'HH'));
    
    // AM3:00が日の切り替わりなので、その日のログをチェック
    const logData = logSheet.getDataRange().getValues();
    
    // 今日チェックインした人を収集
    const checkedInUsers = new Set();
    const checkedOutUsers = new Set();
    
    for (let i = 1; i < logData.length; i++) {
      const timestamp = logData[i][0];
      const type = logData[i][1];
      const name = logData[i][2];
      
      if (!timestamp || !name) continue;
      
      let rowDate;
      try {
        rowDate = Utilities.formatDate(new Date(timestamp), 'Asia/Tokyo', 'yyyy-MM-dd');
      } catch (e) {
        continue;
      }
      
      if (rowDate === jstDate) {
        if (type === 'checkin') {
          checkedInUsers.add(name);
        } else if (type === 'reflection') {
          checkedOutUsers.add(name);
        }
      }
    }
    
    // C/inあり & C/outなし のユーザーを抽出
    const forgottenUsers = [];
    checkedInUsers.forEach(name => {
      if (!checkedOutUsers.has(name)) {
        forgottenUsers.push(name);
      }
    });
    
    console.log('[FCM] Forgotten checkout users:', forgottenUsers);
    
    if (forgottenUsers.length === 0) {
      console.log('[FCM] No forgotten checkouts today');
      return;
    }
    
    // MINDFUL_UsersからFCMトークンを取得
    const usersSheet = getUsersSheet();
    const usersData = usersSheet.getDataRange().getValues();
    const headers = usersData[0];
    const fcmColIndex = headers.indexOf('FCM_Token');
    
    if (fcmColIndex === -1) {
      console.log('[FCM] FCM_Token column not found in MINDFUL_Users');
      return;
    }
    
    let sentCount = 0;
    forgottenUsers.forEach(name => {
      for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][0] === name && usersData[i][fcmColIndex]) {
          const fcmToken = usersData[i][fcmColIndex];
          const success = sendPushNotification(
            fcmToken,
            'MINDFUL 🔔',
            `${name}さん、チェックアウトを忘れていませんか？今日のC/OUTをお忘れなく！`
          );
          if (success) sentCount++;
          break;
        }
      }
    });
    
    console.log(`[FCM] Sent ${sentCount} reminder(s) to ${forgottenUsers.length} user(s)`);
    
  } catch (error) {
    console.error('[FCM] checkAndNotify error:', error);
  }
}

/**
 * 22:00 JSTの時間トリガーをセットアップ
 * 初回のみ手動実行してください
 */
function setupCheckoutReminder() {
  // 既存の同名トリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkAndNotifyForgottenCheckouts') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 毎日22:30 JSTに実行するトリガーを作成
  ScriptApp.newTrigger('checkAndNotifyForgottenCheckouts')
    .timeBased()
    .atHour(22)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('Asia/Tokyo')
    .create();
  
  console.log('[FCM] Checkout reminder trigger set for 22:30 JST daily');
}

/**
 * テスト用: 手動でPush通知を送信
 */
function testPushNotification() {
  const usersSheet = getUsersSheet();
  const usersData = usersSheet.getDataRange().getValues();
  const headers = usersData[0];
  const fcmColIndex = headers.indexOf('FCM_Token');
  
  if (fcmColIndex === -1) {
    console.log('[FCM] FCM_Token column not found');
    return;
  }
  
  // 最初のFCMトークンがあるユーザーにテスト送信
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][fcmColIndex]) {
      const name = usersData[i][0];
      const token = usersData[i][fcmColIndex];
      console.log('[FCM] Sending test to:', name);
      const success = sendPushNotification(
        token,
        'MINDFUL テスト通知 📬',
        `${name}さん、Push通知のテストです！通知が届いていれば成功です🎉`
      );
      console.log('[FCM] Test result:', success);
      return;
    }
  }
  
  console.log('[FCM] No users with FCM tokens found');
}

/**
 * ダイレクトテスト: 既知のFCMトークンに直接送信
 */
function testDirectPush() {
  const directToken = 'ef_wWyAPGRGTPanFyGbav7:APA91bFvACOqTuy0TT9yVleTiYH-ZML_axqZdZGQ3U9xvSCOLp9mkbdbw6MUDfHDn8VJf4ZqaK7lCytz0hoBc9imffAapDWeUZhpeglSpIrcZFGrBaX41uk';
  console.log('[FCM] Direct test to SAT token');
  const success = sendPushNotification(
    directToken,
    'MINDFUL ダイレクトテスト 🔔',
    '伊賀智史さん、この通知が届いていれば完全成功です！🎉'
  );
  console.log('[FCM] Direct test result:', success);
}

/**
 * トークン残高修正: MINDFUL_LogのToken Earned列から正確な残高を算出してMINDFUL_Usersを更新
 */
function fixTokenBalances() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('MINDFUL_Log');
  const usersSheet = getUsersSheet();
  
  if (!logSheet) { console.log('MINDFUL_Log not found'); return; }
  
  const logData = logSheet.getDataRange().getValues();
  const usersData = usersSheet.getDataRange().getValues();
  
  // LogからユーザーごとのToken Earned合計を算出
  const tokenSums = {};
  for (let i = 1; i < logData.length; i++) {
    const name = logData[i][2];
    const tokenEarned = Number(logData[i][19]) || 0;
    const tokenBalance = Number(logData[i][20]) || 0;
    if (!name) continue;
    if (!tokenSums[name]) tokenSums[name] = { earned: 0, lastBalance: 0 };
    tokenSums[name].earned += tokenEarned;
    if (tokenBalance > 0) tokenSums[name].lastBalance = tokenBalance;
  }
  
  // MINDFUL_Usersの各ユーザーを更新
  let updated = 0;
  for (let i = 1; i < usersData.length; i++) {
    const name = usersData[i][0];
    if (name && tokenSums[name]) {
      const tokens = Math.max(tokenSums[name].earned, tokenSums[name].lastBalance);
      usersSheet.getRange(i + 1, 4).setValue(tokens);
      console.log('[Fix] ' + name + ' → ' + tokens + ' tokens (earned:' + tokenSums[name].earned + ' last:' + tokenSums[name].lastBalance + ')');
      updated++;
    }
  }
  console.log('[Fix] Complete: ' + updated + ' users updated');
}

/**
 * 強制マイグレーション: MINDFUL_Logの全ユニークユーザーをMINDFUL_Usersに追加
 */
function forceMigrateAllLegacyUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('MINDFUL_Log');
  const usersSheet = getUsersSheet();
  
  if (!logSheet) { console.log('MINDFUL_Log not found'); return; }
  
  const logData = logSheet.getDataRange().getValues();
  const usersData = usersSheet.getDataRange().getValues();
  
  // 既にMINDFUL_Usersにいるユーザー名を収集
  const existingUsers = new Set();
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][0]) existingUsers.add(usersData[i][0]);
  }
  
  // MINDFUL_Logからユニークユーザーを収集
  const logUsers = {};
  for (let i = 1; i < logData.length; i++) {
    const name = logData[i][2]; // Name列
    const type = String(logData[i][1]);
    const base = String(logData[i][3]);
    const timestamp = logData[i][0];
    
    if (!name || existingUsers.has(name)) continue;
    
    if (!logUsers[name]) {
      logUsers[name] = { base: base, checkoutDates: [] };
    }
    if (base) logUsers[name].base = base;
    
    // C/OUTの日付を収集
    if (type.includes('C/OUT') || type.includes('checkout') || type.includes('reflection')) {
      const d = new Date(timestamp);
      const formatted = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      if (!logUsers[name].checkoutDates.includes(formatted)) {
        logUsers[name].checkoutDates.push(formatted);
      }
    }
  }
  
  // マイグレーション実行
  const headers = usersData[0];
  let migratedCount = 0;
  
  for (const [name, info] of Object.entries(logUsers)) {
    const newRow = new Array(headers.length).fill('');
    newRow[0] = name;                                    // Name
    newRow[1] = '';                                       // PinHash（空 = 次回ログイン時に設定）
    newRow[2] = info.base;                               // Base
    newRow[3] = info.checkoutDates.length;               // TokenBalance
    newRow[4] = JSON.stringify(info.checkoutDates);      // CheckoutDates
    newRow[5] = new Date().toISOString();                // RegisteredAt
    newRow[6] = '';                                       // LastLogin
    newRow[7] = '[]';                                    // GoalsThisYear
    newRow[8] = '[]';                                    // GoalsFuture
    
    usersSheet.appendRow(newRow);
    migratedCount++;
    console.log('[Migration] ' + name + ' (tokens: ' + info.checkoutDates.length + ')');
  }
  
  console.log('[Migration] Complete: ' + migratedCount + ' users migrated');
}

/**
 * 運営アナウンスメント: 全ユーザーにPush通知を一斉送信
 */
function sendAnnouncementPush(title, body, senderName, senderPin) {
  try {
    if (!title || !body) {
      return jsonResponse({ success: false, error: 'タイトルと本文を入力してください' });
    }
    
    // 送信者の認証チェック
    if (senderName && senderPin) {
      const usersSheet = getUsersSheet();
      const usersData = usersSheet.getDataRange().getValues();
      const pinHash = hashPin(senderPin);
      let authenticated = false;
      for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][0] === senderName && usersData[i][1] === pinHash) {
          authenticated = true;
          break;
        }
      }
      if (!authenticated) {
        return jsonResponse({ success: false, error: '認証に失敗しました' });
      }
    }
    
    // 全ユーザーのFCMトークンを収集
    const usersSheet = getUsersSheet();
    const usersData = usersSheet.getDataRange().getValues();
    const headers = usersData[0];
    const fcmColIndex = headers.indexOf('FCM_Token');
    
    if (fcmColIndex === -1) {
      return jsonResponse({ success: false, error: 'FCM_Tokenカラムが見つかりません' });
    }
    
    let sentCount = 0;
    let failCount = 0;
    const fullTitle = '📢 ' + title;
    
    for (let i = 1; i < usersData.length; i++) {
      const token = usersData[i][fcmColIndex];
      if (token) {
        const success = sendPushNotification(token, fullTitle, body);
        if (success) {
          sentCount++;
        } else {
          failCount++;
        }
      }
    }
    
    console.log('[FCM] Announcement sent: ' + sentCount + ' succeeded, ' + failCount + ' failed');
    return jsonResponse({ success: true, message: sentCount + '名に送信しました', sentCount: sentCount, failCount: failCount });
  } catch (error) {
    console.error('[FCM] Announcement error:', error);
    return jsonResponse({ success: false, error: error.message });
  }
}

