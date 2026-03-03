#!/usr/bin/env python3
"""
import_onhand_to_gas.py — OnHandデータをGASバックエンドにインポート
parse_onhand.py の出力 (onhand_clean.json) を GAS MP_OnHand シートに全件投入する。

Usage:
    python3 import_onhand_to_gas.py
    python3 import_onhand_to_gas.py --dry-run  (データ送信せずに確認のみ)
"""

import json
import sys
import urllib.request
import urllib.parse
from pathlib import Path

# --- 設定 ---
GAS_URL = ''  # ← GASデプロイURLをここに設定（またはコマンドライン引数で渡す）
API_TOKEN = 'a6b93874301b54dac9a37afc89d04f56'
ONHAND_JSON = Path(__file__).parent / 'on_hand_output' / 'onhand_clean.json'


def load_onhand_data(filepath):
    """OnHand JSONファイルを読み込む"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def import_to_gas(records, gas_url, token, dry_run=False):
    """GASにOnHandデータを全件投入（importOnHand）"""
    payload = {
        'action': 'importOnHand',
        'records': records,
        'token': token,
        'user': 'IMPORT'
    }

    if dry_run:
        print(f"\n🔍 DRY RUN — 送信データプレビュー:")
        print(f"   レコード数: {len(records)}")
        print(f"   送信先: {gas_url[:50]}...")
        for r in records[:5]:
            print(f"   {r['date']} {r['store']} {r['type']} {r['count']}名 ¥{r['amount']}")
        if len(records) > 5:
            print(f"   ... 他{len(records) - 5}件")
        return {'status': 'dry_run', 'count': len(records)}

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        gas_url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    print(f"📡 GASに送信中... ({len(records)}件)")
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result
    except urllib.error.HTTPError as e:
        # GASはリダイレクトを使うため、302を自動追従
        if e.code in (301, 302):
            redirect_url = e.headers.get('Location', '')
            req2 = urllib.request.Request(redirect_url)
            with urllib.request.urlopen(req2) as resp2:
                return json.loads(resp2.read().decode('utf-8'))
        raise


def main():
    dry_run = '--dry-run' in sys.argv

    # GAS URLの解決
    gas_url = GAS_URL
    for arg in sys.argv[1:]:
        if arg.startswith('http'):
            gas_url = arg

    if not gas_url and not dry_run:
        print("⚠️ GAS URLが設定されていません。")
        print(f"   使い方: python3 {sys.argv[0]} <GAS_URL>")
        print(f"   または: python3 {sys.argv[0]} --dry-run")
        sys.exit(1)

    # OnHandデータ読み込み
    if not ONHAND_JSON.exists():
        print(f"❌ {ONHAND_JSON} が見つかりません。")
        print(f"   先に parse_onhand.py を実行してください。")
        sys.exit(1)

    records = load_onhand_data(ONHAND_JSON)
    print(f"📄 OnHandデータ読み込み: {len(records)}件")

    # サマリー表示
    by_store = {}
    for r in records:
        s = r.get('store', '')
        by_store[s] = by_store.get(s, 0) + 1
    for s, c in sorted(by_store.items()):
        print(f"   {s}: {c}件")

    # GASにインポート
    result = import_to_gas(records, gas_url, API_TOKEN, dry_run)

    if result.get('status') == 'ok':
        print(f"\n✅ インポート成功！")
        print(f"   投入件数: {result.get('count', len(records))}")
        print(f"   タイムスタンプ: {result.get('timestamp', '')}")
    elif result.get('status') == 'dry_run':
        print(f"\n✅ DRY RUN完了 — 実際のデータ送信はされていません。")
    else:
        print(f"\n❌ エラー: {result}")


if __name__ == '__main__':
    main()
