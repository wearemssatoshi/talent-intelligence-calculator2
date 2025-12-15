#!/usr/bin/env python3
"""
SVD Payment Dashboard Generator
店舗別・月別・決済カテゴリ別の集計を行い、CSVとHTMLを生成する
"""

import pandas as pd
import glob
import os
import json
from datetime import datetime

def load_and_process_data(input_dir, start_date, end_date):
    """全決済データを読み込み、整形する"""
    
    credit_files = glob.glob(os.path.join(input_dir, 'Credit_Card_Summary_Daily_List*.csv'))
    credit_dfs = []
    for file in credit_files:
        df = pd.read_csv(file, encoding='utf-8', na_values=['-'])
        credit_dfs.append(df)
    df_credit = pd.concat(credit_dfs, ignore_index=True) if credit_dfs else pd.DataFrame()
    
    emoney_files = glob.glob(os.path.join(input_dir, 'Elecronic_Money_Summary_Daily_List*.csv'))
    emoney_dfs = []
    for file in emoney_files:
        df = pd.read_csv(file, encoding='utf-8', na_values=['-'])
        emoney_dfs.append(df)
    df_emoney = pd.concat(emoney_dfs, ignore_index=True) if emoney_dfs else pd.DataFrame()
    
    df_all = pd.concat([df_credit, df_emoney], ignore_index=True)
    df_all['営業日'] = pd.to_datetime(df_all['営業日'], format='%Y%m%d')
    df_all = df_all[(df_all['営業日'] >= start_date) & (df_all['営業日'] <= end_date)]
    
    id_vars = ['店舗コード', '店舗名', '直営店/フランチャイズ', '営業日']
    value_vars = [col for col in df_all.columns if '(売上金額)' in col]
    
    df_melted = df_all.melt(id_vars=id_vars, value_vars=value_vars, var_name='決済カテゴリ', value_name='売上金額')
    df_melted['決済カテゴリ'] = df_melted['決済カテゴリ'].str.replace('(売上金額)', '', regex=False)
    df_melted['売上金額'] = pd.to_numeric(df_melted['売上金額'].replace('[￥,]', '', regex=True), errors='coerce').fillna(0)
    
    df_melted['決済カテゴリ'] = df_melted['決済カテゴリ'].replace('AMEX', 'アメリカン・エキスプレス')
    df_melted['決済カテゴリ'] = df_melted['決済カテゴリ'].replace(['クレジット', 'クレジットカード'], 'その他クレジット')
    df_melted['決済カテゴリ'] = df_melted['決済カテゴリ'].replace(['電子マネー'], 'その他電子マネー')
    
    df_melted['年月'] = df_melted['営業日'].dt.to_period('M')
    
    return df_melted

def generate_csv_output(df, output_path):
    """CSVファイルを生成"""
    
    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        stores = df.groupby('店舗名')['売上金額'].sum()
        stores = stores[stores > 0].sort_values(ascending=False)
        
        grand_total = 0
        
        for store_name in stores.index:
            store_df = df[df['店舗名'] == store_name]
            
            sep = '=' * 60
            f.write(sep + "\n")
            f.write("■ " + store_name + "\n")
            f.write(sep + "\n\n")
            
            pivot = store_df.pivot_table(
                values='売上金額',
                index='年月',
                columns='決済カテゴリ',
                aggfunc='sum',
                fill_value=0
            )
            
            pivot = pivot.loc[:, (pivot != 0).any(axis=0)]
            pivot['月計'] = pivot.sum(axis=1)
            pivot.loc['合計'] = pivot.sum()
            
            f.write("【月別×決済カテゴリ別クロス集計】\n")
            pivot.to_csv(f)
            f.write("\n")
            
            category_summary = store_df.groupby('決済カテゴリ')['売上金額'].sum().sort_values(ascending=False)
            category_summary = category_summary[category_summary > 0]
            
            f.write("【決済カテゴリ別合計】\n")
            for cat, amount in category_summary.items():
                f.write(cat + "," + format(int(amount), ',') + "\n")
            
            store_total = int(store_df['売上金額'].sum())
            grand_total += store_total
            f.write("\n店舗合計," + format(store_total, ',') + "\n\n\n")
        
        f.write(sep + "\n")
        f.write("■ 全店舗総合計: " + format(grand_total, ',') + "円\n")
        f.write(sep + "\n")
    
    return grand_total

def generate_html_dashboard(df, output_path, period_label):
    """HTMLダッシュボードを生成"""
    
    stores = df.groupby('店舗名')['売上金額'].sum()
    stores = stores[stores > 0].sort_values(ascending=False)
    
    category_summary = df.groupby('決済カテゴリ')['売上金額'].sum().sort_values(ascending=False)
    category_summary = category_summary[category_summary > 0]
    
    monthly_summary = df.groupby('年月')['売上金額'].sum()
    
    stores_data = {}
    for store_name in stores.index:
        store_df = df[df['店舗名'] == store_name]
        monthly = store_df.groupby('年月')['売上金額'].sum()
        monthly_dict = {str(k): int(v) for k, v in monthly.items()}
        categories = store_df.groupby('決済カテゴリ')['売上金額'].sum()
        categories = categories[categories > 0]
        cat_dict = {k: int(v) for k, v in categories.items()}
        stores_data[store_name] = {
            'total': int(store_df['売上金額'].sum()),
            'monthly': monthly_dict,
            'categories': cat_dict
        }
    
    grand_total = int(df['売上金額'].sum())
    months = sorted([str(m) for m in monthly_summary.index])

    # 店舗名マッピング
    store_mapping = {
        'THE JEWELS': 'JW',
        'THE GARDEN SAPPORO HOKKAIDO GRILLE': 'GA',
        'LA BRIQUE': 'BQ',
        'LA BRIQUE SAPPORO Akarenga Terrace': 'BQ',
        'ヌーベルプース大倉山': 'NP',
        'NOUVELLE POUSSE': 'NP',
        'ルスツ羊蹄ぶた': 'RYB',
        'ルスツ羊蹄ぶた by BRIQUE': 'RYB'
    }
    
    def get_short_name(name):
        return store_mapping.get(name, name)
    
    # Build tab buttons
    q = "'"
    tab_btns = []
    for store in stores.index:
        short_name = get_short_name(store)
        btn = '<button class="tab-btn" onclick="showStore(' + q + store + q + ')">' + short_name + '</button>'
        tab_btns.append(btn)
    tab_buttons_html = ''.join(tab_btns)
    
    # Build store content sections
    store_sections = []
    for i, store in enumerate(stores.index):
        store_id = store.replace(' ', '_').replace('/', '_')
        short_name = get_short_name(store)
        total_formatted = format(stores_data[store]["total"], ',')
        section = '''
        <div id="store-''' + store_id + '''" class="store-content">
            <div class="section">
                <h2 class="section-title">''' + short_name + ''' - 月別売上推移</h2>
                <div class="chart-container">
                    <canvas id="chart-monthly-''' + str(i) + '''"></canvas>
                </div>
            </div>
            <div class="charts-grid">
                <div class="section">
                    <h2 class="section-title">決済カテゴリ別構成</h2>
                    <div class="chart-container" style="height: 350px;">
                        <canvas id="chart-cat-''' + str(i) + '''"></canvas>
                    </div>
                </div>
                <div class="section">
                    <h2 class="section-title">詳細情報</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 15px;">店舗合計: <strong style="color: var(--champagne-gold);">¥''' + total_formatted + '''</strong></p>
                </div>
            </div>
        </div>
        '''
        store_sections.append(section)
    store_html = ''.join(store_sections)
    
    html_content = '''<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SVD Cashless Payment Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --white: #FFFFFF;
            --champagne-gold: #C5A572;
            --dark-navy: #1A1F3D;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans JP', sans-serif;
            background: linear-gradient(135deg, var(--dark-navy) 0%, #2A2F4D 100%);
            min-height: 100vh;
            color: var(--white);
        }
        .header {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            padding: 20px 40px;
            border-bottom: 1px solid rgba(197, 165, 114, 0.3);
        }
        .header h1 {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 1.8rem;
            color: var(--champagne-gold);
            letter-spacing: 2px;
        }
        .header p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            margin-top: 5px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 30px;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 24px;
            border: 1px solid rgba(197, 165, 114, 0.2);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 40px rgba(197, 165, 114, 0.2);
        }
        .card-title {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .card-value {
            font-family: 'Montserrat', sans-serif;
            font-size: 2rem;
            font-weight: 700;
            color: var(--champagne-gold);
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .tab-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(197, 165, 114, 0.3);
            color: var(--white);
            padding: 12px 24px;
            border-radius: 30px;
            cursor: pointer;
            font-size: 0.95rem;
            transition: all 0.3s;
        }
        .tab-btn:hover, .tab-btn.active {
            background: var(--champagne-gold);
            color: var(--dark-navy);
            border-color: var(--champagne-gold);
        }
        .section {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid rgba(197, 165, 114, 0.15);
        }
        .section-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.3rem;
            color: var(--champagne-gold);
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(197, 165, 114, 0.2);
        }
        .chart-container {
            position: relative;
            height: 400px;
            width: 100%;
        }
        .store-content { display: none; }
        .store-content.active { display: block; }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }
        .footer {
            text-align: center;
            padding: 30px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.85rem;
            border-top: 1px solid rgba(197, 165, 114, 0.2);
            margin-top: 30px;
        }
        @media (max-width: 768px) {
            .header { padding: 15px 20px; }
            .container { padding: 15px; }
            .card { padding: 16px; }
            .card-value { font-size: 1.5rem; }
            .charts-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header class="header">
        <h1>SVD CASHLESS PAYMENT DASHBOARD</h1>
        <p>キャッシュレス決済分析レポート｜''' + period_label + '''</p>
    </header>
    
    <div class="container">
        <div class="summary-cards">
            <div class="card">
                <div class="card-title">総売上高</div>
                <div class="card-value">¥''' + format(grand_total, ',') + '''</div>
            </div>
            <div class="card">
                <div class="card-title">稼働店舗数</div>
                <div class="card-value">''' + str(len(stores)) + '''</div>
            </div>
            <div class="card">
                <div class="card-title">決済カテゴリ数</div>
                <div class="card-value">''' + str(len(category_summary)) + '''</div>
            </div>
            <div class="card">
                <div class="card-title">集計期間</div>
                <div class="card-value" style="font-size: 1.3rem;">''' + str(len(months)) + '''ヶ月</div>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showStore('all')">全店舗</button>
            ''' + tab_buttons_html + '''
        </div>
        
        <div id="store-all" class="store-content active">
            <div class="section">
                <h2 class="section-title">月別売上推移</h2>
                <div class="chart-container">
                    <canvas id="allMonthlyChart"></canvas>
                </div>
            </div>
            <div class="charts-grid">
                <div class="section">
                    <h2 class="section-title">店舗別売上構成（略称）</h2>
                    <div class="chart-container" style="height: 350px;">
                        <canvas id="allStoresChart"></canvas>
                    </div>
                </div>
                <div class="section">
                    <h2 class="section-title">決済カテゴリ別構成</h2>
                    <div class="chart-container" style="height: 350px;">
                        <canvas id="allCategoriesChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        ''' + store_html + '''
    </div>
    
    <footer class="footer">
        SAPPORO VIEWTIFUL DINING — ORIGIN<br>
        Generated: ''' + datetime.now().strftime('%Y-%m-%d %H:%M') + '''
    </footer>
    
    <script>
        const storesData = ''' + json.dumps(stores_data, ensure_ascii=False) + ''';
        const months = ''' + json.dumps(months) + ''';
        const storeMapping = ''' + json.dumps(store_mapping, ensure_ascii=False) + ''';
        
        function getShortName(name) {
            return storeMapping[name] || name;
        }
        
        const categoryColors = [
            '#C5A572', '#E8D5B7', '#6B8E7B', '#8FA4B8', '#D4A574',
            '#9B7B6B', '#7BA8A8', '#B8A894', '#A89B8B', '#8B9BA8',
            '#C9B896', '#7B9EA8', '#A8947B', '#8BA89B', '#B8A87B',
            '#7BB8A8', '#A87B8B', '#8BA87B', '#B87BA8', '#A8B87B'
        ];
        
        // Monthly chart
        const allMonthlyData = months.map(m => {
            let total = 0;
            Object.values(storesData).forEach(s => {
                if (s.monthly[m]) total += s.monthly[m];
            });
            return total;
        });
        
        new Chart(document.getElementById('allMonthlyChart'), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: '売上金額',
                    data: allMonthlyData,
                    backgroundColor: 'rgba(197, 165, 114, 0.7)',
                    borderColor: '#C5A572',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => '¥' + ctx.raw.toLocaleString()
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: 'rgba(255,255,255,0.7)',
                            callback: val => '¥' + (val/1000000).toFixed(1) + 'M'
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.7)' },
                        grid: { display: false }
                    }
                }
            }
        });
        
        // Stores chart
        new Chart(document.getElementById('allStoresChart'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(storesData).map(n => getShortName(n)),
                datasets: [{
                    data: Object.values(storesData).map(s => s.total),
                    backgroundColor: categoryColors.slice(0, Object.keys(storesData).length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: 'rgba(255,255,255,0.8)', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.label + ': ¥' + ctx.raw.toLocaleString()
                        }
                    }
                }
            }
        });
        
        // Categories chart
        const allCatData = {};
        Object.values(storesData).forEach(s => {
            Object.entries(s.categories).forEach(([cat, val]) => {
                allCatData[cat] = (allCatData[cat] || 0) + val;
            });
        });
        const sortedCats = Object.entries(allCatData).sort((a,b) => b[1] - a[1]);
        
        new Chart(document.getElementById('allCategoriesChart'), {
            type: 'doughnut',
            data: {
                labels: sortedCats.map(c => c[0]),
                datasets: [{
                    data: sortedCats.map(c => c[1]),
                    backgroundColor: categoryColors.slice(0, sortedCats.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: 'rgba(255,255,255,0.8)', font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.label + ': ¥' + ctx.raw.toLocaleString()
                        }
                    }
                }
            }
        });
        
        // Store-specific charts
        let storeIndex = 0;
        Object.entries(storesData).forEach(([name, data]) => {
            const monthlyCanvas = document.getElementById('chart-monthly-' + storeIndex);
            if (monthlyCanvas) {
                new Chart(monthlyCanvas, {
                    type: 'bar',
                    data: {
                        labels: months,
                        datasets: [{
                            label: '売上金額',
                            data: months.map(m => data.monthly[m] || 0),
                            backgroundColor: 'rgba(197, 165, 114, 0.7)',
                            borderColor: '#C5A572',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                ticks: {
                                    color: 'rgba(255,255,255,0.7)',
                                    callback: val => '¥' + (val/1000000).toFixed(1) + 'M'
                                },
                                grid: { color: 'rgba(255,255,255,0.1)' }
                            },
                            x: {
                                ticks: { color: 'rgba(255,255,255,0.7)' },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
            
            const catCanvas = document.getElementById('chart-cat-' + storeIndex);
            if (catCanvas) {
                const sortedStoreCats = Object.entries(data.categories).sort((a,b) => b[1] - a[1]);
                new Chart(catCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: sortedStoreCats.map(c => c[0]),
                        datasets: [{
                            data: sortedStoreCats.map(c => c[1]),
                            backgroundColor: categoryColors.slice(0, sortedStoreCats.length)
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { color: 'rgba(255,255,255,0.8)', font: { size: 10 } }
                            }
                        }
                    }
                });
            }
            storeIndex++;
        });
        
        function showStore(storeKey) {
            document.querySelectorAll('.store-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            
            if (storeKey === 'all') {
                document.getElementById('store-all').classList.add('active');
                document.querySelector('.tab-btn').classList.add('active');
            } else {
                const storeId = 'store-' + storeKey.replace(/ /g, '_').replace(/\\//g, '_');
                const el = document.getElementById(storeId);
                if (el) el.classList.add('active');
                
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    const shortName = getShortName(storeKey);
                    if (btn.textContent.includes(shortName)) {
                        btn.classList.add('active');
                    }
                });
            }
        }
    </script>
</body>
</html>
'''
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return grand_total

def main():
    INPUT_DIR = 'payment_all'
    START_DATE = '2024-11-01'
    END_DATE = '2025-10-31'
    
    OUTPUT_CSV = 'svd_payment_summary.csv'
    OUTPUT_HTML = 'svd_payment_dashboard.html'
    
    print("SVD Payment Dashboard Generator")
    print("=" * 50)
    
    print("データを読み込み中...")
    df = load_and_process_data(INPUT_DIR, START_DATE, END_DATE)
    print("  読み込んだレコード数: " + format(len(df), ','))
    
    period_label = START_DATE + " ～ " + END_DATE
    
    print("CSVファイルを生成中...")
    csv_total = generate_csv_output(df, OUTPUT_CSV)
    print("  CSV出力完了: " + OUTPUT_CSV)
    
    print("HTMLダッシュボードを生成中...")
    html_total = generate_html_dashboard(df, OUTPUT_HTML, period_label)
    print("  HTML出力完了: " + OUTPUT_HTML)
    
    print("=" * 50)
    print("総売上高: ¥" + format(csv_total, ','))
    print("完了！")

if __name__ == '__main__':
    main()
