# チャネル自動判定アルゴリズム

## 概要

SVD売上日報Excelの列構造は店舗・月によって変動しうる（特にBG列の有無）。本ドキュメントでは、ヘッダー行から各チャネルを動的に判定するアルゴリズムを定義する。

## 判定フロー

```
1. ヘッダー行2（iloc[2]）の全セルをスキャン
2. 各セルのテキストからセクション名を抽出
3. セクション名に基づきチャネル種別と開始列を決定
4. ヘッダー行3（iloc[3]）から各チャネル内の列のオフセットを決定
```

## セクション名 → チャネルマッピング

| ヘッダー行2のキーワード | チャネル | 備考 |
|:--|:--|:--|
| `LUNCH` | lunch | 固定位置（列3起点） |
| `DINNER` | dinner | 固定位置（列11起点） |
| `レストランTOTAL` | ld_total | L+D合計。固定（列19起点） |
| `EAT-IN・T/O` or `T/O` | takeout | 固定位置（列24起点） |
| `宴会` | banquet | 固定位置（列32起点） |
| `ビアガーデン` | beer_garden | **動的位置**。存在しない月あり |
| `TOTAL` (列49付近) | all_channels | 全チャネル集計 |

## BG列の動的判定アルゴリズム

```python
def find_bg_columns(df):
    """BGのセクション開始列と合計列を動的に特定"""
    bg_start = -1
    bg_pax_col = -1
    bg_total_col = -1
    
    for k in range(df.shape[1]):
        h2 = str(df.iloc[2, k]).strip() if pd.notna(df.iloc[2, k]) else ''
        if 'ビアガーデン' in h2:
            bg_start = k
            bg_pax_col = k + 1  # 人数は常にセクション開始+1
            
            # 合計列をヘッダー行3で探す
            for m in range(k, min(k + 10, df.shape[1])):
                h3 = str(df.iloc[3, m]).strip() if pd.notna(df.iloc[3, m]) else ''
                if h3 == '合計':
                    bg_total_col = m
                    break
            break
    
    return bg_start, bg_pax_col, bg_total_col
```

## 合計行の判定

```python
def find_total_row(df):
    """合計行のインデックスを特定"""
    for i in range(len(df)):
        # 列0または列1に「合計」文字列
        for j in range(min(5, df.shape[1])):
            val = df.iloc[i, j]
            if pd.notna(val) and isinstance(val, str) and val.strip() == '合計':
                return i
    return -1
```

## 日付行の判定

```python
import datetime

def is_data_row(df, i):
    """行iがデータ行（日付行）かを判定"""
    date_val = df.iloc[i, 1]
    return isinstance(date_val, (datetime.datetime, pd.Timestamp))
```

## 検証チェック

パース後、以下を自動検証：

1. **日別合算チェック**: 各チャネルの日別売上合計 ≒ 合計行の値（±1円の丸め差は許容）
2. **L+D整合性**: ランチ売上 + ディナー売上 = L+D合計売上
3. **全チャネル整合性**: L+D + T/O + 宴会 + BG ≒ 全チャネル売上（列52）
