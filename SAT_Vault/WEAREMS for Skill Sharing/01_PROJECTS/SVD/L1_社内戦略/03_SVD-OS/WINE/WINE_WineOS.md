# 5. WINE（WINE OS）プロジェクト資料

> ワイン在庫・原価管理システム — **業界初のAI統合ワインOS**

---

## 📋 概要

WINE OSは、レストランのワイン業務を **納品書 → 棚卸表 → ワインリスト** までワンストップで完結させるOS。
2,157行のソムリエスキルを統合し、OCR自動認識 → AI自動補正 → 在庫管理 → リスト生成を実現。

**コスト: ¥0（全て無料OSS技術）**

---

## 🗂️ 関連ファイル

| ファイル | 説明 |
|----------|------|
| [wine-list-generator/](file:///Users/satoshiiga/dotfiles/wine-list-generator/) | Next.jsプロジェクト |
| [wine-knowledge.ts](file:///Users/satoshiiga/dotfiles/wine-list-generator/lib/wine-knowledge.ts) | ソムリエスキル統合エンジン（328行） |
| [ocr-parser.ts](file:///Users/satoshiiga/dotfiles/wine-list-generator/lib/ocr-parser.ts) | OCRパーサー・スキル統合版（320行） |
| [sommelier/SKILL.md](file:///Users/satoshiiga/dotfiles/.agent/skills/sommelier/SKILL.md) | ソムリエスキル本体 |
| [README.md](file:///Users/satoshiiga/dotfiles/wine-list-generator/README.md) | プロジェクト説明 |

---

## 🏗️ アーキテクチャ

```
[納品書(PDF/画像)] → Tesseract.js OCR → [AI自動補正・分類] → [在庫マスタ]
                                                ↑                     ↓
                                    ソムリエスキル(2,157行)       [棚卸表]
                                    - 80+品種自動判定                 ↓
                                    - 60+産地自動分類           [原価分析]
                                    - 表記自動正規化                  ↓
                                    - カテゴリ自動推定         [ワインリスト PDF]
                                                                     ↓
                                                              [PL Auto連携]
```

---

## ✅ フェーズ進捗

| Phase | 内容 | 状態 |
|-------|------|------|
| **Phase 1** | ソムリエスキル統合 → OCR精度向上 | ✅ 完了 |
| Phase 2 | 棚卸表モジュール | ⏳ Next |
| Phase 3 | ワインリスト自動生成 | ⏳ |
| Phase 4 | データ永続化 & PL Auto連携 | ⏳ |

### Phase 1 完了内容（2026-03-03）

| コンポーネント | 内容 |
|----------------|------|
| `wine-knowledge.ts` (328行) | 80+品種辞書、60+産地辞書、15パターン表記正規化、4自動判定関数 |
| `ocr-parser.ts` (320行) | スキル4エンジン統合、格付け検出、マルチライン統合、ポストプロセス |

---

## 🍷 ソムリエスキル構成（2,157行）

| リファレンス | 行数 | 内容 |
|-------------|------|------|
| SKILL.md | 116 | 5フォーマット + ハルシネーション防止3レベル |
| burgundy.md | 316 | 全33 Grand Cru + ~200 Premier Cru |
| france.md | 469 | フランス全13産地のAOC体系 |
| italy.md | 287 | イタリア全20州 170+土着品種 |
| grape_varieties.md | 376 | 白20+赤25品種 + シノニム表 |
| notation_rules.md | 349 | 6カ国語の表記ルール全体系 |
| pairing_theory.md | 87 | ペアリング理論 + SVD店舗別指針 |
| service_protocol.md | 75 | 温度/グラス/デカンタ/保存 |
| cost_management.md | 82 | 原価率/価格設定/在庫管理 |

---

## 🏗️ 技術スタック

| 技術 | 用途 | コスト |
|------|------|--------|
| Next.js 14 | フロントエンド | 無料 |
| TypeScript | 型安全性 | 無料 |
| Tailwind CSS | スタイリング | 無料 |
| Tesseract.js | OCR（日/英/仏/伊） | 無料 |
| @react-pdf/renderer | PDF生成 | 無料 |
| wine-knowledge.ts | AI辞書エンジン | 自前開発 |

---

## 🔗 連携

- **MP（Momentum Peaks）**: 需要予測に基づく発注最適化
- **PL Auto**: 原価データの自動連携 → FL比率分析
- **ソムリエスキル**: 表記正規化 / ペアリング提案 / 教育資料

---

## 📊 主要KPI

| 指標 | 説明 |
|------|------|
| ワイン原価率 | ボトル28-35% / グラス20-28% |
| 在庫回転率 | 年8-12回転が目標 |
| 廃棄率 | ロス削減 |
| OCR認識精度 | Phase 1で品種/産地の自動判定追加 |

---

## 📰 プレスリリース構想

1. レストランのワイン業務は「属人化」が最大の課題
2. ソムリエの退職 = ワイン知識の喪失
3. WINE OSは2,000行超のソムリエ知識をデジタル化し、誰でも使える形にした
4. 納品書→棚卸表→ワインリスト、全てワンストップ
5. SVDの4レストランで実証済み
6. **開発コスト¥0** — 全て無料OSS技術

---

*最終更新: 2026-03-03*
