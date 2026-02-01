/**
 * ==============================================
 * Talent Intelligence Backend v2.0
 * ==============================================
 * 
 * Features:
 * - 写真永続化（Base64）
 * - 評価データ自動保存
 * - ルールベースAIアドバイス（コストフリー）
 * - 履歴取得・検索機能
 * 
 * Version: 2.0
 * Last Updated: 2026-02-01
 * Deployed GAS URL: (デプロイ後に更新)
 */

// ==============================================
// CONFIG
// ==============================================
const CONFIG = {
  SHEET_NAME: 'TI_Evaluations',
  VERSION: '2.0'
};

// ==============================================
// RULE-BASED AI ADVICE (コストフリー)
// ==============================================
const ADVICE_DATABASE = {
  performance: {
    low: [
      "🎯 表現力を高めるために、毎日5分間のプレゼン練習を始めましょう",
      "💡 お客様の前でのパフォーマンスを意識的に振り返る習慣をつけましょう",
      "📚 先輩のサービスを観察し、良い点をメモする習慣をつけましょう"
    ],
    mid: [
      "👍 パフォーマンス力は着実に成長しています！次はより高い目標を設定しましょう",
      "🌟 自分の強みを活かしたオリジナルのサービススタイルを確立しましょう"
    ],
    high: [
      "🏆 素晴らしいパフォーマンス力です！後輩への指導も意識してみましょう",
      "⭐ トップレベルのパフォーマンス力を維持しつつ、新しい挑戦を続けましょう"
    ]
  },
  service: {
    low: [
      "💬 お客様との会話を楽しむ気持ちを大切にしましょう",
      "📝 サービスの基本動作を毎日確認する習慣をつけましょう",
      "👀 お客様の表情やしぐさに注目し、ニーズを先読みする練習をしましょう"
    ],
    mid: [
      "🎯 サービススキルは順調です！より個別対応力を磨きましょう",
      "💡 リピーターのお客様の好みを覚えて、パーソナライズされたサービスを提供しましょう"
    ],
    high: [
      "✨ 卓越したサービス力です！チーム全体のレベルアップに貢献しましょう",
      "🌟 あなたのサービスがお店の基準になっています。その姿勢を維持してください"
    ]
  },
  expertise: {
    low: [
      "📖 毎日15分、ワインや料理の知識を学ぶ時間を設けましょう",
      "🍷 資格取得を目標に設定し、計画的に学習を進めましょう",
      "👨‍🍳 シェフやソムリエに積極的に質問する習慣をつけましょう"
    ],
    mid: [
      "📚 専門知識が着実に身についています！次のステップの資格に挑戦しましょう",
      "🎓 学んだ知識を実践で活かす機会を意識的に作りましょう"
    ],
    high: [
      "🏅 高い専門性を持っています！その知識をチームに共有しましょう",
      "📘 業界のトレンドを常にキャッチアップし、さらなる高みを目指しましょう"
    ]
  },
  management: {
    low: [
      "📋 まずは自分のタスク管理を徹底することから始めましょう",
      "👥 小さなチーム活動でリーダーシップを発揮する機会を探しましょう",
      "⏰ 時間管理のスキルを磨き、効率的な働き方を身につけましょう"
    ],
    mid: [
      "📊 マネジメント力が成長しています！より大きな責任に挑戦しましょう",
      "🤝 チームメンバーとの1on1コミュニケーションを増やしましょう"
    ],
    high: [
      "👑 優れたマネジメント力です！次世代リーダーの育成に力を入れましょう",
      "🎯 チーム全体のビジョンを明確にし、メンバーを導いていきましょう"
    ]
  },
  overall: {
    beginner: "🌱 素晴らしいスタートです！基礎をしっかり固めて、一歩一歩成長していきましょう。",
    developing: "🌿 着実に成長しています！強みを活かしつつ、弱点を意識的に改善していきましょう。",
    proficient: "🌳 高いレベルに達しています！次はチームへの貢献と後輩育成も意識しましょう。",
    expert: "🏆 エキスパートレベルです！あなたの存在がチーム全体の基準を引き上げています。",
    master: "👑 マスターレベルです！業界全体への貢献も視野に入れた活動を期待しています。"
  }
};

/**
 * ルールベースAIでアドバイスを生成
 */
function generateAdvice(scores) {
  // カテゴリ平均を計算
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  
  const pScores = [scores.p1, scores.p2, scores.p3, scores.p4, scores.p5, scores.p6].map(Number);
  const sScores = [scores.s1, scores.s2, scores.s3, scores.s4, scores.s5, scores.s6].map(Number);
  const eScores = [scores.e1, scores.e2, scores.e3, scores.e4, scores.e5, scores.e6].map(Number);
  const mScores = [scores.m1, scores.m2, scores.m3, scores.m4, scores.m5, scores.m6].map(Number);
  
  const pAvg = avg(pScores);
  const sAvg = avg(sScores);
  const eAvg = avg(eScores);
  const mAvg = avg(mScores);
  
  const totalScore = parseFloat(scores.totalScore) || 0;
  
  // レベル判定
  const getLevel = (score) => {
    if (score < 2.5) return 'low';
    if (score < 3.5) return 'mid';
    return 'high';
  };
  
  const getOverallLevel = (total) => {
    if (total < 20) return 'beginner';
    if (total < 35) return 'developing';
    if (total < 50) return 'proficient';
    if (total < 65) return 'expert';
    return 'master';
  };
  
  // カテゴリ分析
  const categories = [
    { name: 'Performance', nameJp: 'パフォーマンス', key: 'performance', score: pAvg },
    { name: 'Service', nameJp: 'サービス', key: 'service', score: sAvg },
    { name: 'Expertise', nameJp: '専門知識', key: 'expertise', score: eAvg },
    { name: 'Management', nameJp: 'マネジメント', key: 'management', score: mAvg }
  ];
  
  categories.sort((a, b) => a.score - b.score);
  const weakest = categories[0];
  const strongest = categories[3];
  
  // ランダムにアドバイスを選択
  const getRandomTip = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  const weakestLevel = getLevel(weakest.score);
  const strongestLevel = getLevel(strongest.score);
  
  return {
    totalScore: totalScore.toFixed(2),
    overallLevel: getOverallLevel(totalScore),
    overallAdvice: ADVICE_DATABASE.overall[getOverallLevel(totalScore)],
    strongest: {
      name: strongest.name,
      nameJp: strongest.nameJp,
      score: strongest.score.toFixed(2),
      tip: getRandomTip(ADVICE_DATABASE[strongest.key][strongestLevel])
    },
    growthFocus: {
      name: weakest.name,
      nameJp: weakest.nameJp,
      score: weakest.score.toFixed(2),
      tip: getRandomTip(ADVICE_DATABASE[weakest.key][weakestLevel])
    },
    categoryScores: {
      performance: pAvg.toFixed(2),
      service: sAvg.toFixed(2),
      expertise: eAvg.toFixed(2),
      management: mAvg.toFixed(2)
    }
  };
}

// ==============================================
// doPost - 評価データ保存（写真含む）
// ==============================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    // シートがなければ作成
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      // ヘッダー設定
      const headers = [
        'Timestamp', 'Name', 'Affiliation', 'JobTitle', 'TypeSelf', 'TypeOther',
        'TotalScore', 'Qualifications', 'QualScore', 'MeisterRank', 'PhotoData',
        'p1', 'p2', 'p3', 'p4', 'p5', 'p6',
        's1', 's2', 's3', 's4', 's5', 's6',
        'e1', 'e2', 'e3', 'e4', 'e5', 'e6',
        'm1', 'm2', 'm3', 'm4', 'm5', 'm6'
      ];
      sheet.appendRow(headers);
    }
    
    // Helper to get param
    const getParam = (name) => e.parameter[name] || '';
    
    // Build row data
    const nextRow = [];
    nextRow.push(new Date()); // Timestamp
    nextRow.push(getParam('user-name')); // Name
    nextRow.push(getParam('user-affiliation')); // Affiliation
    nextRow.push(getParam('user-job-title')); // JobTitle
    nextRow.push(getParam('TypeSelf')); // TypeSelf
    nextRow.push(getParam('TypeOther')); // TypeOther
    nextRow.push(getParam('totalScore')); // TotalScore
    nextRow.push(getParam('qualifications')); // Qualifications
    nextRow.push(getParam('qualificationScore')); // QualScore
    nextRow.push(getParam('meisterRank')); // MeisterRank
    nextRow.push(getParam('photoData')); // PhotoData (Base64)
    
    // Skill Matrix Scores (p1-m6)
    const prefixes = ['p', 's', 'e', 'm'];
    prefixes.forEach(prefix => {
      for (let i = 1; i <= 6; i++) {
        nextRow.push(getParam(`${prefix}${i}`));
      }
    });
    
    sheet.appendRow(nextRow);
    SpreadsheetApp.flush();
    
    // Generate AI advice
    const scores = {
      totalScore: getParam('totalScore'),
      p1: getParam('p1'), p2: getParam('p2'), p3: getParam('p3'), p4: getParam('p4'), p5: getParam('p5'), p6: getParam('p6'),
      s1: getParam('s1'), s2: getParam('s2'), s3: getParam('s3'), s4: getParam('s4'), s5: getParam('s5'), s6: getParam('s6'),
      e1: getParam('e1'), e2: getParam('e2'), e3: getParam('e3'), e4: getParam('e4'), e5: getParam('e5'), e6: getParam('e6'),
      m1: getParam('m1'), m2: getParam('m2'), m3: getParam('m3'), m4: getParam('m4'), m5: getParam('m5'), m6: getParam('m6')
    };
    const advice = generateAdvice(scores);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: 'success', 
        message: '評価データを保存しました',
        advice: advice,
        version: CONFIG.VERSION
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: 'error', 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ==============================================
// doGet - データ取得 (action: list, search, history, advice)
// ==============================================
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action || 'list';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          result: 'error', 
          message: 'シートが見つかりません' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    
    // Column indices
    const COL = {
      TIMESTAMP: 0, NAME: 1, AFFILIATION: 2, JOB_TITLE: 3, 
      TYPE_SELF: 4, TYPE_OTHER: 5, TOTAL_SCORE: 6, 
      QUALIFICATIONS: 7, QUAL_SCORE: 8, MEISTER_RANK: 9, PHOTO_DATA: 10,
      SKILLS_START: 11, SKILLS_END: 35
    };
    
    switch (action) {
      
      // 名前一覧を取得
      case 'list': {
        const namesSet = new Set();
        for (let i = 1; i < rows.length; i++) {
          const name = rows[i][COL.NAME];
          if (name) namesSet.add(name);
        }
        return ContentService
          .createTextOutput(JSON.stringify({ 
            result: 'success', 
            names: Array.from(namesSet).sort(),
            count: namesSet.size,
            version: CONFIG.VERSION
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // 名前で検索（履歴取得）
      case 'search': {
        const searchName = e.parameter.name || '';
        const records = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[COL.NAME] === searchName) {
            const record = {
              Timestamp: row[COL.TIMESTAMP],
              Name: row[COL.NAME],
              Affiliation: row[COL.AFFILIATION],
              JobTitle: row[COL.JOB_TITLE],
              TypeSelf: row[COL.TYPE_SELF],
              TypeOther: row[COL.TYPE_OTHER],
              TotalScore: row[COL.TOTAL_SCORE],
              Qualifications: row[COL.QUALIFICATIONS],
              QualScore: row[COL.QUAL_SCORE],
              MeisterRank: row[COL.MEISTER_RANK],
              PhotoData: row[COL.PHOTO_DATA] || ''
            };
            
            // Add skill scores
            const skillNames = ['p1','p2','p3','p4','p5','p6','s1','s2','s3','s4','s5','s6','e1','e2','e3','e4','e5','e6','m1','m2','m3','m4','m5','m6'];
            for (let j = 0; j < skillNames.length; j++) {
              record[skillNames[j]] = row[COL.SKILLS_START + j];
            }
            
            records.push(record);
          }
        }
        
        // Sort by timestamp descending (newest first)
        records.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
        
        return ContentService
          .createTextOutput(JSON.stringify({ 
            result: 'success', 
            data: records,
            count: records.length,
            version: CONFIG.VERSION
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // 全データ取得（ダッシュボード用）
      case 'all': {
        const allData = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[COL.NAME]) continue;
          
          allData.push({
            name: row[COL.NAME],
            affiliation: row[COL.AFFILIATION],
            jobTitle: row[COL.JOB_TITLE],
            type: row[COL.TYPE_OTHER],
            typeSelf: row[COL.TYPE_SELF],
            score: row[COL.TOTAL_SCORE],
            qualifications: row[COL.QUALIFICATIONS],
            meisterRank: row[COL.MEISTER_RANK],
            photoData: row[COL.PHOTO_DATA] || '',
            detailedScores: row.slice(COL.SKILLS_START, COL.SKILLS_END + 1)
          });
        }
        
        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'success', 
            data: allData,
            count: allData.length,
            version: CONFIG.VERSION
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // アドバイス生成のみ
      case 'advice': {
        const scores = {
          totalScore: e.parameter.totalScore || '0',
          p1: e.parameter.p1 || '0', p2: e.parameter.p2 || '0', p3: e.parameter.p3 || '0', 
          p4: e.parameter.p4 || '0', p5: e.parameter.p5 || '0', p6: e.parameter.p6 || '0',
          s1: e.parameter.s1 || '0', s2: e.parameter.s2 || '0', s3: e.parameter.s3 || '0', 
          s4: e.parameter.s4 || '0', s5: e.parameter.s5 || '0', s6: e.parameter.s6 || '0',
          e1: e.parameter.e1 || '0', e2: e.parameter.e2 || '0', e3: e.parameter.e3 || '0', 
          e4: e.parameter.e4 || '0', e5: e.parameter.e5 || '0', e6: e.parameter.e6 || '0',
          m1: e.parameter.m1 || '0', m2: e.parameter.m2 || '0', m3: e.parameter.m3 || '0', 
          m4: e.parameter.m4 || '0', m5: e.parameter.m5 || '0', m6: e.parameter.m6 || '0'
        };
        
        const advice = generateAdvice(scores);
        
        return ContentService
          .createTextOutput(JSON.stringify({ 
            result: 'success', 
            advice: advice,
            version: CONFIG.VERSION
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      default:
        return ContentService
          .createTextOutput(JSON.stringify({ 
            result: 'error', 
            message: 'Unknown action: ' + action 
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: 'error', 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ==============================================
// Utility: Test functions
// ==============================================
function testAdvice() {
  const testScores = {
    totalScore: '45.5',
    p1: '4', p2: '3', p3: '4', p4: '3', p5: '4', p6: '3',
    s1: '4', s2: '4', s3: '5', s4: '4', s5: '3', s6: '4',
    e1: '2', e2: '2', e3: '3', e4: '2', e5: '2', e6: '3',
    m1: '3', m2: '3', m3: '4', m4: '3', m5: '3', m6: '4'
  };
  
  const advice = generateAdvice(testScores);
  Logger.log(JSON.stringify(advice, null, 2));
}
