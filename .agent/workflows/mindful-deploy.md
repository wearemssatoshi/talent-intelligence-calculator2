---
description: SVD_MINDFULをGitHub Pagesにデプロイする手順
---

# MINDFUL Deploy Workflow

dotfiles内のSVD_MINDFULをGitHub Pagesにデプロイする手順。

## 前提条件

- `~/SVD_MINDFUL` は `~/dotfiles/SVD_MINDFUL` へのシンボリックリンク
- GitHub Pages用リポジトリ: `wearemssatoshi/SVD_MINDFUL`

## 手順

// turbo-all

1. dotfilesで変更をコミット
```bash
cd ~/dotfiles
git add SVD_MINDFUL/
git commit -m "Update MINDFUL"
git push origin main
```

2. GitHub Pages用リポジトリに同期（SATがターミナルで実行）
```bash
cd /tmp
rm -rf SVD_MINDFUL_deploy
git clone https://github.com/wearemssatoshi/SVD_MINDFUL.git SVD_MINDFUL_deploy
cp ~/dotfiles/SVD_MINDFUL/*.html SVD_MINDFUL_deploy/
cp ~/dotfiles/SVD_MINDFUL/*.js SVD_MINDFUL_deploy/
cp ~/dotfiles/SVD_MINDFUL/*.json SVD_MINDFUL_deploy/
cp ~/dotfiles/SVD_MINDFUL/*.png SVD_MINDFUL_deploy/ 2>/dev/null || true
cd SVD_MINDFUL_deploy
git add .
git commit -m "Sync from dotfiles"
git push
cd ~
rm -rf /tmp/SVD_MINDFUL_deploy
```

## 注意事項

- GitHub Pagesはmainブランチからデプロイ
- デプロイ後、数分でhttps://wearemssatoshi.github.io/SVD_MINDFUL/に反映
