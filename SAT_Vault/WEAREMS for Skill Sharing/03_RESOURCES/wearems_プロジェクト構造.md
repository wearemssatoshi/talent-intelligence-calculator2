---
tags: [wearems, 組織構造, ルール, リファレンス]
status: permanent
created: 2026-02-10
---

# wearems プロジェクト構造

> wearemssatoshi はSATの事業母体。SVDやTSSはその顧客。

---

## 組織図

```
wearems（wearemssatoshi — 母体）
├── SVD（顧客: レストラン事業）
│   ├── MINDFUL
│   ├── Talent Intelligence
│   ├── Momentum Peaks
│   ├── PL Auto
│   ├── WINE OS
│   └── RYB
├── TSS（顧客: チームシナジー）
│   └── Team Synergy Stage
└── wearems共通基盤
    ├── Agent Bus v2.0
    ├── G Skills
    ├── SAT_Vault（Obsidian）
    └── dotfiles
```

---

## GitHub構造

- Organization: `wearemssatoshi`
- GitHub Pages: `wearemssatoshi.github.io/○○`
- 各プロジェクトは独立したリポジトリとして管理

---

## Git push ルール

新規のリポジトリ作成やpush先が不明な場合、Gは必ずSATに確認する。

### 確認チェックリスト
1. どのリポジトリにpushすべきか
2. SVD専用か、wearems全体か、それ以外か
3. GitHub Pages対象かどうか
4. リポジトリ名は適切か

### やってはいけないこと
- dotfilesリポジトリに無関係なプロジェクトを安易に追加する
- SVD以外のプロジェクトをSVD名義のリポジトリに入れる
- 確認なしに新規リポジトリを作成する

---

## 参考
- [[SAT_G_Partnership_Constitution]] — 第6条に本ルールを定めている
- [[G_Skills一覧]]
