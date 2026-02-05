# 3. MP（Momentum Peaks）プロジェクト資料

> 需要予測＆シフト最適化システム

---

## 📋 概要

Momentum Peaksは、環境要因（季節、曜日、特別日）を数値化し、需要を予測するシステム。シフト最適化の「需要側」データを提供。

---

## 🗂️ 関連ファイル

| ファイル | 説明 |
|----------|------|
| [index.html](file:///Users/satoshiiga/dotfiles/MomentumPeaks/index.html) | メインダッシュボード |
| [MomentumPeaks_Dashboard.html](file:///Users/satoshiiga/dotfiles/MomentumPeaks/MomentumPeaks_Dashboard.html) | ダッシュボードUI |
| [MomentumPeaks_Input.html](file:///Users/satoshiiga/dotfiles/MomentumPeaks/MomentumPeaks_Input.html) | データ入力画面 |
| [Code.gs](file:///Users/satoshiiga/dotfiles/MomentumPeaks/Code.gs) | GASバックエンド |
| [setup_form.gs](file:///Users/satoshiiga/dotfiles/MomentumPeaks/setup_form.gs) | フォーム設定 |
| [Base_Constitution.md](file:///Users/satoshiiga/dotfiles/MomentumPeaks/Base_Constitution.md) | 拠点定数定義 |
| [momentum_peaks_indices.json](file:///Users/satoshiiga/dotfiles/MomentumPeaks/momentum_peaks_indices.json) | 指数データ |
| [opal_prompt_final.md](file:///Users/satoshiiga/dotfiles/MomentumPeaks/opal_prompt_final.md) | AIプロンプト |

---

## ✅ 実装済み機能

| 機能 | 状態 |
|------|------|
| 2層統合需要定量化 | ✅ |
| 季節要因分析（月別） | ✅ |
| 曜日別係数 | ✅ |
| 特別日対応 | ✅ |
| 環境定数（Constants） | ✅ |
| ダッシュボード | ✅ |
| シフト提案連携 | ⏳ 計画中 |
| 1ボタン最適化 | ⏳ 計画中 |

---

## 🏗️ 2層統合需要定量化ロジック

### Step ①〜③: 拠点レベル定数（KF1）
- 季節係数
- 曜日係数
- 特別日係数

### Step ④〜⑥: 店舗レベルパフォーマンス（KF2, KF3）
- 売上実績
- 客数実績

### Step ⑦: 最終出力
- 需要予測値
- シフト必要人数

---

## 🎯 究極の目標

**「業務革命」（業務革命）**

> 1ボタンで、拠点と店舗の両方に完璧にマッチしたシフト提案を行う

---

## 📊 Why Based Approach

「なんとなく」ではなく「適正フォーキャスト」

| Before | After |
|--------|-------|
| 業界の勘 | データ駆動 |
| 経験則 | 環境定数 |
| 属人的 | システム化 |

---

*最終更新: 2026-02-05*
