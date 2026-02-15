#!/usr/bin/env python3
"""
Momentum Peaks — 節気エンジン (sekki.py)
任意の日付 → 二十四節気名・24レベル順位・季節カテゴリ・季節PT を返す。
汎用設計: 2023-2028年の節気境界日を内蔵（国立天文台データベース準拠）。
"""

from datetime import date, datetime
from typing import Tuple, Dict, Optional
import json
import os

# ============================================================
# 二十四節気の境界日テーブル（国立天文台暦計算室データ準拠）
# フォーマット: (月, 日) → 節気名
# 各年ごとに微調整（天文学的なずれは最大±1日）
# ============================================================

SEKKI_BOUNDARIES = {
    2023: [
        (1, 6, "小寒"), (1, 20, "大寒"), (2, 4, "立春"), (2, 19, "雨水"),
        (3, 6, "啓蟄"), (3, 21, "春分"), (4, 5, "清明"), (4, 20, "穀雨"),
        (5, 6, "立夏"), (5, 21, "小満"), (6, 6, "芒種"), (6, 21, "夏至"),
        (7, 7, "小暑"), (7, 23, "大暑"), (8, 8, "立秋"), (8, 23, "処暑"),
        (9, 8, "白露"), (9, 23, "秋分"), (10, 8, "寒露"), (10, 24, "霜降"),
        (11, 8, "立冬"), (11, 22, "小雪"), (12, 7, "大雪"), (12, 22, "冬至"),
    ],
    2024: [
        (1, 6, "小寒"), (1, 20, "大寒"), (2, 4, "立春"), (2, 19, "雨水"),
        (3, 5, "啓蟄"), (3, 20, "春分"), (4, 4, "清明"), (4, 19, "穀雨"),
        (5, 5, "立夏"), (5, 20, "小満"), (6, 5, "芒種"), (6, 21, "夏至"),
        (7, 6, "小暑"), (7, 22, "大暑"), (8, 7, "立秋"), (8, 22, "処暑"),
        (9, 7, "白露"), (9, 22, "秋分"), (10, 8, "寒露"), (10, 23, "霜降"),
        (11, 7, "立冬"), (11, 22, "小雪"), (12, 7, "大雪"), (12, 21, "冬至"),
    ],
    2025: [
        (1, 5, "小寒"), (1, 20, "大寒"), (2, 3, "立春"), (2, 18, "雨水"),
        (3, 5, "啓蟄"), (3, 20, "春分"), (4, 4, "清明"), (4, 20, "穀雨"),
        (5, 5, "立夏"), (5, 21, "小満"), (6, 5, "芒種"), (6, 21, "夏至"),
        (7, 7, "小暑"), (7, 22, "大暑"), (8, 7, "立秋"), (8, 23, "処暑"),
        (9, 7, "白露"), (9, 23, "秋分"), (10, 8, "寒露"), (10, 23, "霜降"),
        (11, 7, "立冬"), (11, 22, "小雪"), (12, 7, "大雪"), (12, 22, "冬至"),
    ],
    2026: [
        (1, 5, "小寒"), (1, 20, "大寒"), (2, 4, "立春"), (2, 18, "雨水"),
        (3, 5, "啓蟄"), (3, 20, "春分"), (4, 5, "清明"), (4, 20, "穀雨"),
        (5, 5, "立夏"), (5, 21, "小満"), (6, 6, "芒種"), (6, 21, "夏至"),
        (7, 7, "小暑"), (7, 23, "大暑"), (8, 7, "立秋"), (8, 23, "処暑"),
        (9, 7, "白露"), (9, 23, "秋分"), (10, 8, "寒露"), (10, 23, "霜降"),
        (11, 7, "立冬"), (11, 22, "小雪"), (12, 7, "大雪"), (12, 22, "冬至"),
    ],
    2027: [
        (1, 5, "小寒"), (1, 20, "大寒"), (2, 4, "立春"), (2, 19, "雨水"),
        (3, 6, "啓蟄"), (3, 21, "春分"), (4, 5, "清明"), (4, 20, "穀雨"),
        (5, 6, "立夏"), (5, 21, "小満"), (6, 6, "芒種"), (6, 22, "夏至"),
        (7, 7, "小暑"), (7, 23, "大暑"), (8, 7, "立秋"), (8, 23, "処暑"),
        (9, 8, "白露"), (9, 23, "秋分"), (10, 8, "寒露"), (10, 24, "霜降"),
        (11, 7, "立冬"), (11, 22, "小雪"), (12, 7, "大雪"), (12, 22, "冬至"),
    ],
    2028: [
        (1, 6, "小寒"), (1, 21, "大寒"), (2, 4, "立春"), (2, 19, "雨水"),
        (3, 5, "啓蟄"), (3, 20, "春分"), (4, 4, "清明"), (4, 19, "穀雨"),
        (5, 5, "立夏"), (5, 20, "小満"), (6, 5, "芒種"), (6, 21, "夏至"),
        (7, 6, "小暑"), (7, 22, "大暑"), (8, 7, "立秋"), (8, 22, "処暑"),
        (9, 7, "白露"), (9, 22, "秋分"), (10, 8, "寒露"), (10, 23, "霜降"),
        (11, 7, "立冬"), (11, 22, "小雪"), (12, 7, "大雪"), (12, 21, "冬至"),
    ],
}

# 曜日の日本語マッピング
WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"]


def get_sekki(target_date: date) -> Tuple[str, int, str, float]:
    """
    日付から二十四節気情報を取得する。
    
    Args:
        target_date: 対象日付
    
    Returns:
        Tuple of (節気名, 24レベル順位, 季節カテゴリ, 季節PT)
    """
    # インデックスファイルを読み込む
    indices = _load_indices()
    sekki_levels = indices["sekki_24_levels"]["levels"]
    
    year = target_date.year
    
    # 年末の冬至以降は、前年の冬至が適用される場合がある
    if year not in SEKKI_BOUNDARIES:
        raise ValueError(f"Year {year} is not in the supported range (2023-2028)")
    
    boundaries = SEKKI_BOUNDARIES[year]
    
    # 1月1日〜最初の節気の前日は、前年最後の節気（冬至）
    first_boundary = date(year, boundaries[0][0], boundaries[0][1])
    if target_date < first_boundary:
        prev_year = year - 1
        if prev_year in SEKKI_BOUNDARIES:
            last_sekki = SEKKI_BOUNDARIES[prev_year][-1][2]
        else:
            last_sekki = "冬至"
        info = sekki_levels[last_sekki]
        return last_sekki, info["rank"], info["season"], info["season_pt"]
    
    # 各境界をチェックして、該当する節気を特定
    current_sekki = boundaries[0][2]
    for i, (m, d, name) in enumerate(boundaries):
        boundary_date = date(year, m, d)
        if target_date >= boundary_date:
            current_sekki = name
        else:
            break
    
    info = sekki_levels[current_sekki]
    return current_sekki, info["rank"], info["season"], info["season_pt"]


def get_weekday_ja(target_date: date) -> str:
    """日付から日本語曜日を返す"""
    return WEEKDAY_JA[target_date.weekday()]


def get_weekday_index(target_date: date, indices: Optional[Dict] = None) -> float:
    """日付から曜日指数を返す"""
    if indices is None:
        indices = _load_indices()
    weekday_ja = get_weekday_ja(target_date)
    return indices["weekday_index"][weekday_ja]


def get_kf1(target_date: date, base_id: str, indices: Optional[Dict] = None) -> Dict:
    """
    KF①（拠点定指数）を計算する — 5層環境定数。
    
    5 Layers:
        ① 月別IDX     (seasonal)  — 12区分, 拠点別
        ② 曜日IDX     (weekday)   — 7区分, 全店共通
        ③ 節気別IDX   (sekki)     — 24区分, 拠点別  ← NEW
        ④ 週別IDX     (weekly)    — 52区分, 拠点別  ← NEW
        ⑤ 日別IDX     (daily)     — 特別日, 全店共通 ← NEW
    
    Formula: KF① = (月別 + 曜日別 + 節気別 + 週別 + 日別) / 5
             ※ 日別が該当しない場合は 4層平均
    
    Returns:
        Dict with all 5 layer values + kf1
    """
    if indices is None:
        indices = _load_indices()
    
    sekki_name, rank, season, season_pt = get_sekki(target_date)
    
    month_str = str(target_date.month)
    base_data = indices["bases"][base_id]
    
    # ① 月別IDX
    monthly_idx = base_data["seasonal"].get(month_str, 2.50)
    
    # ② 曜日IDX
    weekday_idx = get_weekday_index(target_date, indices)
    
    # ③ 節気別IDX (実データから算出済み — 拠点別)
    sekki_idx_dict = base_data.get("sekki_index", {})
    sekki_idx = sekki_idx_dict.get(sekki_name, 3.00)
    
    # ④ 週別IDX (実データから算出済み — 拠点別)
    iso_week = target_date.isocalendar()[1]
    if iso_week > 52:
        iso_week = 52
    weekly_idx_dict = base_data.get("weekly_index", {})
    weekly_idx = weekly_idx_dict.get(str(iso_week), 3.00)
    
    # ⑤ 日別IDX (特別日判定)
    daily_idx = _get_daily_index(target_date, indices)
    
    # KF① 計算: 日別が該当する場合は5層平均、しない場合は4層平均
    if daily_idx is not None:
        kf1 = round((monthly_idx + weekday_idx + sekki_idx + weekly_idx + daily_idx) / 5, 2)
        layers_used = 5
    else:
        kf1 = round((monthly_idx + weekday_idx + sekki_idx + weekly_idx) / 4, 2)
        daily_idx = 0.0  # 返却用
        layers_used = 4
    
    return {
        "sekki": sekki_name,
        "rank": rank,
        "season": season,
        "season_pt": season_pt,
        "monthly_idx": monthly_idx,
        "weekday_ja": get_weekday_ja(target_date),
        "weekday_idx": weekday_idx,
        "sekki_idx": sekki_idx,
        "weekly_idx": weekly_idx,
        "daily_idx": daily_idx,
        "layers_used": layers_used,
        "kf1": kf1,
    }


def _get_daily_index(target_date: date, indices: Dict) -> Optional[float]:
    """
    日別インデックスの取得。
    特別日に該当する場合はポイントを返し、通常日はNoneを返す。
    """
    daily = indices.get("daily_index", {})
    mm_dd = target_date.strftime("%m-%d")
    
    # 札幌イベント（固定祝日より優先）
    sapporo = daily.get("sapporo_events", {})
    if mm_dd in sapporo:
        return sapporo[mm_dd]["pt"]
    
    # 固定祝日
    fixed = daily.get("fixed_holidays", {})
    if mm_dd in fixed:
        return fixed[mm_dd]["pt"]
    
    return None


# ============================================================
# 内部ヘルパー
# ============================================================

_indices_cache = None

def _load_indices() -> Dict:
    """mp_indices.json を読み込む（キャッシュ付き）"""
    global _indices_cache
    if _indices_cache is not None:
        return _indices_cache
    
    indices_path = os.path.join(os.path.dirname(__file__), "mp_indices.json")
    with open(indices_path, "r", encoding="utf-8") as f:
        _indices_cache = json.load(f)
    return _indices_cache


# ============================================================
# CLI テスト
# ============================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        test_date = date.fromisoformat(sys.argv[1])
    else:
        test_date = date.today()
    
    base_id = sys.argv[2] if len(sys.argv) > 2 else "MOIWAYAMA"
    
    result = get_kf1(test_date, base_id)
    
    print(f"=== Momentum Peaks — 5層環境定数エンジン ===")
    print(f"日付:       {test_date} ({result['weekday_ja']})")
    print(f"節気:       {result['sekki']} (Level {result['rank']})")
    print(f"季節:       {result['season']} (PT: {result['season_pt']:.2f})")
    print(f"拠点:       {base_id}")
    print(f"─────────────────────────────")
    print(f"① 月別IDX:   {result['monthly_idx']:.2f}")
    print(f"② 曜日IDX:   {result['weekday_idx']:.2f}")
    print(f"③ 節気IDX:   {result['sekki_idx']:.2f}")
    print(f"④ 週別IDX:   {result['weekly_idx']:.2f}")
    print(f"⑤ 日別IDX:   {result['daily_idx']:.2f} ({'特別日' if result['layers_used'] == 5 else '通常日'})")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"KF① =        {result['kf1']:.2f} ({result['layers_used']}層平均)")
