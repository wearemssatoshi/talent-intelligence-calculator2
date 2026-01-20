---
description: GitHub Pagesへのデプロイ手順
---

# Deploy Workflow

GitHub Pagesへプロジェクトをデプロイする手順。

## 手順

// turbo-all

1. 変更をステージング
```bash
git add .
```

2. コミット作成
```bash
git commit -m "Deploy: [変更内容を簡潔に記述]"
```

3. プッシュ
```bash
git push origin main
```

4. GitHub Pagesの確認
- MINDFUL: https://wearemssatoshi.github.io/SVD_MINDFUL/
- TSS: https://wearemssatoshi.github.io/TSS/
- dotfiles: https://wearemssatoshi.github.io/dotfiles/

## 注意事項

- PWAのキャッシュ問題がある場合は、ブラウザのキャッシュをクリアするか、シークレットモードで確認
- Service Workerのバージョンを更新する場合は、`sw.js` の CACHE_VERSION を変更
