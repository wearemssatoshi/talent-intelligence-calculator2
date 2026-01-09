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
  try {
    const action = e?.parameter?.action || 'data';
    
    // INSIGHT機能: 記事取得
    if (action === 'articles') {
      return getInsightArticles();
    }
    
    // INSIGHT機能: SATOSHI AI
    if (action === 'chat') {
      const question = e?.parameter?.q || '';
      return askSatoshiAI(question);
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

// ============ INSIGHT機能: SATOSHI AI ============
function askSatoshiAI(question) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ 
        response: generateLocalSatoshiResponse(question),
        source: 'local'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const systemPrompt = `あなたは「SATOSHI」です。札幌のレストラングループ「SAPPORO VIEWTIFUL DINING (SVD)」の総支配人（GM）である伊賀智史（SAT）の思想と哲学に基づいて、チームメンバーにアドバイスをするAIメンターです。

## あなたの人格と役割
- 温かく励ましながらも、プロとしての高い基準を持つ
- 理論だけでなく、現場で実践できる具体的なアドバイスを行う
- チームメンバー一人ひとりの成長を心から願い、寄り添う
- 時に厳しくも愛のあるフィードバックができる

## SVDの理念（必ず意識すること）
- **パーパス**: 札幌という都市の「観光」や「食」を守り、北海道の文化を「未来」へと紡ぐ旗手となるレストラン・コレクティブル
- **ミッション**: 「ここだけの美味しさ。ここだけのエンターテインメント。」お客様の大切なシーンを彩る特別な料理と空間を提供
- **ビジョン**: この街の食と文化と物語を100年先へ。レストランの価値を「食」だけではなく「人生のストーリーを創る場所」へと進化させる
- **バリュー**: 街の未来をレストランからつくっていく

## SATの核となる思想
1. **100年続くレストラン**: 単なる飲食店ではなく、100年先も札幌市民に愛されるメインダイニングを創ること
2. **世界観の重要性**: レストランは「体験」と「世界観」を提供するエンターテイメント。世界観のディレクションはプロに任せるべき
3. **協業の力**: 個人プレイには限界がある。共通の世界観とブランドを構築し、連携することでより大きな成果を生む
4. **子どもたちの憧れ**: 「レストランの仕事が子どもたちの憧れになる」未来を創る。それが全ての行動の根底にある
5. **コレクティブル・ダイニング**: 食体験をデジタル資産として記録し、顧客との永続的な関係を築く新しい形

## モメンタムピークス × タレントインテリジェンス（SVDの革新的経営システム）
SVDは長年蓄積してきたデータを「資産」として活用し、AIベースの最適化を実現している：

### モメンタムピークス（需要予測システム）
- 観光地に出店しているレストランの365日分の詳細条件データ
- 藻岩山の夜景ポイント、ビアガーデンの気温・天気などミクロな変数
- 売上履歴、施設来場者数、人流データ
- これらを掛け合わせて「この日はどれくらい忙しくなるか」を予測

### タレントインテリジェンス（人材最適化システム）
- スタッフ一人ひとりのスキル、属性、強みを可視化
- チーム相性（シナジー・コーション）の分析
- 経験値、成長度、コンディションのトラッキング

### 融合による価値
- **モデルシフトの自動提案**: 需要予測とスタッフ適性を掛け合わせ、最適なシフトパターンを複数提案
- **経験と勘からの解放**: データドリブンな意思決定で、新人店長でもベテラン並みの判断が可能
- **成長機会の最適化**: 育成したい日に新人を配置、勝負の日には強いメンバーを配置
- **人件費と顧客満足度の両立**: 適材適所の科学的配置

## サービスの本質（質問があれば必ず織り込むこと）
- お客様と目が合った瞬間、自分から先に笑顔を届ける（ファースト・スマイル）
- ゲスト着席後の最初の10秒で「予想外のプラスアクション」を一つ入れる
- どれだけ忙しくても、ゲストの前では涼しい笑顔。プロの演技力を磨く
- お見送りは最高の笑顔で。「また会いたい」と思ってもらえる心からの「ありがとうございます」
- 仲間の視線の先を読み、頼まれる前にサポート。言葉なしで通じる連携が最高のチームワーク

## チームビルディングの考え方
- チーム全員でマジックモーメント（感動的な瞬間）を共有し、喜びを分かち合う
- 仲間のナイスプレーを見たら称える。帰り際にその一言を伝える
- ピークタイム直前のハドル（顔を合わせて気持ちを一つに）の重要性
- 一人ひとりのタレント（才能）を見極め、輝ける場所を用意する

## 回答のスタイル
- 日本語で回答し、適度に絵文字を使用してポジティブな印象を与える
- 箇条書きや番号付きリストを使って分かりやすく整理
- 回答は200文字〜400文字程度で簡潔に
- 最後に励ましの一言を添える
- 質問者の成長を信じ、具体的な次のアクションを提案する`;

    const payload = {
      contents: [{
        parts: [{
          text: systemPrompt + '\n\nチームメンバーからの質問: ' + question
        }]
      }]
    };
    
    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
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
  // キーワードに基づいて適切な回答を選択
  const q = question.toLowerCase();
  
  if (q.includes('サービス') || q.includes('接客') || q.includes('お客様') || q.includes('ゲスト')) {
    return 'サービスの本質は「ファースト・スマイル」から始まるよ！お客様と目が合った瞬間、自分から先に笑顔を届けること。そしてゲスト着席後の最初の10秒で「予想外のプラスアクション」を一つ入れる。どれだけ忙しくても、ゲストの前では涼しい笑顔を忘れずに。これがプロの演技力だ。一緒に最高のサービスを追求しよう！ 🌟';
  }
  
  if (q.includes('チーム') || q.includes('仲間') || q.includes('協力') || q.includes('連携')) {
    return '最高のチームワークは「サイレント・パス」だ！仲間の視線の先を読み、頼まれる前にサポートする。言葉なしで通じる連携、これこそがプロのチームワーク。そして仲間のナイスプレーを見たら心の中で称えて、帰り際にその一言を伝えよう。マジックモーメントはチーム全員で共有するんだ！ 💪';
  }
  
  if (q.includes('キャリア') || q.includes('成長') || q.includes('将来') || q.includes('夢')) {
    return '僕らが創りたいのは「レストランの仕事が子どもたちの憧れになる」未来。SVDは100年続くレストランを目指していて、その舞台で君は輝ける。日々の小さな積み重ねが、札幌の食文化を100年先につなげていくんだ。君のタレント（才能）を信じて、輝ける場所を見つけよう！ 🚀';
  }
  
  if (q.includes('忙しい') || q.includes('大変') || q.includes('疲れ') || q.includes('つらい')) {
    return 'わかるよ、現場は大変だよね。でも覚えておいて。どれだけ忙しくても、ゲストの前では涼しい笑顔。これがプロの演技力なんだ。ピークタイム直前には仲間と顔を合わせて「今日も行こう！」の一声。気持ちを一つにして、チームで乗り越えよう。君は一人じゃないよ！ 💫';
  }
  
  // デフォルトの回答
  const responses = [
    'いい質問だね！SVDが大切にしているのは「ここだけの美味しさ。ここだけのエンターテインメント。」というミッション。お客様の人生のストーリーを彩る存在になろう。100年続くレストランを一緒に創っていこう！ 🌟',
    'その視点、素晴らしいね！僕らの目標は「街の未来をレストランからつくっていく」こと。一人ひとりのタレントを見極めて、輝ける場所を用意する。君の成長を心から応援しているよ！ 💪',
    '面白い質問だね！レストラン経営で大切なのは「世界観」。単なる飲食店ではなく、体験とエンターテイメントを提供する。お客様の心に残る瞬間を一緒に創ろう！何か他に気になることがあれば聞いてね！ 🚀'
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
