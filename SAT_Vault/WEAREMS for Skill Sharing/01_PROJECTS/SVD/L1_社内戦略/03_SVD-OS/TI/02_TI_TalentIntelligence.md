# 2. TI（Talent Intelligence）プロジェクト資料

> 人材能力可視化システム

---

## 📋 概要

Talent Intelligenceは、SVDスタッフの能力を18属性で評価し、可視化するシステム。シフト最適化の「供給側」データを提供。

---

## 🗂️ 関連ファイル

| ファイル | 説明 |
|----------|------|
| [TalentIntelligence_Calculator_v8.0.html](file:///Users/satoshiiga/dotfiles/TalentIntelligence/TalentIntelligence_Calculator_v8.0.html) | メイン評価ツール（2650行） |
| [TI_Backend_v2.gs](file:///Users/satoshiiga/dotfiles/TalentIntelligence/TI_Backend_v2.gs) | GASバックエンド |
| [TalentIntelligence_GrowthComparison.html](file:///Users/satoshiiga/dotfiles/TalentIntelligence/TalentIntelligence_GrowthComparison.html) | 成長比較ツール |
| [SVD_18_Attributes_Guide.html](file:///Users/satoshiiga/dotfiles/TalentIntelligence/SVD_18_Attributes_Guide.html) | 18属性ガイド |
| [SVD_Guidebook.html](file:///Users/satoshiiga/dotfiles/TalentIntelligence/SVD_Guidebook.html) | ガイドブック |
| [SVD_Manager_Dashboard.html](file:///Users/satoshiiga/dotfiles/TalentIntelligence/SVD_Manager_Dashboard.html) | マネージャーダッシュボード |
| [TalentIntelligence_Draft.md](file:///Users/satoshiiga/dotfiles/TalentIntelligence/TalentIntelligence_Draft.md) | ドラフト設計書 |
| [Talent Attributes.md](file:///Users/satoshiiga/dotfiles/TalentIntelligence/Talent%20Attributes.md) | 属性定義 |
| [KAONAVI Talentinteligence.md](file:///Users/satoshiiga/dotfiles/TalentIntelligence/KAONAVI%20Talentinteligence.md) | カオナビ連携資料 |

---

## ✅ 実装済み機能

| 機能 | 状態 |
|------|------|
| 18属性フレームワーク | ✅ |
| レーダーチャート | ✅ |
| 資格スコア（Meister Rank） | ✅ |
| PDF出力 | ✅ |
| AIアドバイス（ルールベース） | ✅ |
| バックエンド保存 | ✅ |
| スキルベース可視化 | ⏳ 計画中 |
| 経験ベース可視化 | ⏳ 計画中 |
| 役職マッピング | ⏳ 計画中 |

---

## 🏗️ 18属性フレームワーク

### Performance（P）
- p1〜p6：表現力、プレゼンテーション能力

### Service（S）
- s1〜s6：サービススキル、顧客対応

### Expertise（E）
- e1〜e6：専門知識、資格

### Management（M）
- m1〜m6：マネジメント力、リーダーシップ

---

## 🎖️ 資格スコア（Meister Rank）

| ランク | ポイント |
|--------|----------|
| Rookie | 0-1 pts |
| Junior | 2 pts |
| Specialist | 3-7 pts |
| Expert | 8-12 pts |
| Master | 13+ pts |

---

## 🔗 デプロイ先

- **本番**: https://wearemssatoshi.github.io/TalentIntelligence_Calculator/

---

*最終更新: 2026-02-05*
