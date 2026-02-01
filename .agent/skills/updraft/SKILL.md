# 📈 Updraft Skills（上昇スキル）

売上を「上昇気流」に乗せるスキル群。

## 含まれるスキル

### momentum-peaks/
**モメンタムピークス指標**を計算するコアスキル。

観光地の人流×曜日×季節×イベントから「忙しさ係数」を算出。

```bash
python .agent/scripts/momentum_calculator.py <売上CSV> <日付列> <売上列>
```

### demand-forecast/ (予定)
過去データから需要を予測。

## 目的
需要の波を事前に把握し、**機会損失と過剰在庫**を同時に防ぐ。
