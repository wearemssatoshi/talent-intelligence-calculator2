import csv
from collections import defaultdict

def generate_report():
    # Step 1: Read the source CSV data
    all_rows = []
    try:
        with open('/Users/satoshiiga/dotfiles/KRMSALES/2023_sales_report.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                all_rows.append(row)
    except FileNotFoundError:
        print("Error: 2023_sales_report.csv not found.")
        return

    # Step 2: Calculate all necessary values
    report_data = {}
    grand_total_sales = sum(int(r["Sales"]) for r in all_rows if r.get("Sales"))
    fiscal_year_months = [(2023, m) for m in range(4, 13)] + [(2024, m) for m in range(1, 4)]
    day_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for year, month in fiscal_year_months:
        month_key = f"{year}-{month:02d}"
        
        monthly_rows = [
            r for r in all_rows 
            if r.get("Date") and (r["Date"].startswith(f"{year}/{month}/") or r["Date"].startswith(f"{year}/0{month}/"))
        ]

        if not monthly_rows:
            continue

        monthly_total = sum(int(r["Sales"]) for r in monthly_rows if r.get("Sales"))
        
        sales_by_day = defaultdict(lambda: {"total": 0, "count": 0})
        for row in monthly_rows:
            try:
                day = row.get("Day")
                sales = int(row.get("Sales", 0))
                if day and sales > 0:
                    sales_by_day[day]["total"] += sales
                    sales_by_day[day]["count"] += 1
            except (ValueError, TypeError):
                continue
                
        monthly_averages = []
        for day_en in day_order:
            data = sales_by_day[day_en]
            avg_sales = data["total"] / data["count"] if data["count"] > 0 else 0
            monthly_averages.append(int(round(avg_sales)))

        report_data[month_key] = {
            "total": monthly_total,
            "averages": monthly_averages,
            "daily_rows": monthly_rows
        }

    # Step 3: Generate the HTML string
    html = """<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2023年度 売上レポート</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 20px auto; padding: 0 20px; }
        h1, h2, h3 { color: #2c3e50; }
        h1 { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { border-left: 5px solid #3498db; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background-color: #f2f2f2; }
        td:first-child, th:first-child { text-align: left; }
        .total-row { font-weight: bold; background-color: #eafaf1; }
        .grand-total { text-align: center; font-size: 1.5em; padding: 20px; background-color: #3498db; color: white; border-radius: 5px; margin-top: 40px; }
        .report-container { display: flex; gap: 30px; }
        .daily-sales { flex: 2; }
        .summary { flex: 1; }
    </style>
</head>
<body>
    <h1>2023年度 売上レポート (2023年4月 - 2024年3月)</h1>
"""

    for year, month in fiscal_year_months:
        key = f"{year}-{month:02d}"
        if key not in report_data:
            continue
        
        month_data = report_data[key]
        monthly_total_formatted = f"¥{month_data['total']:,}"
        
        html += f"""
    <section>
        <h2>{year}年{month:02d}月</h2>
        <div class="report-container">
            <div class="daily-sales">
                <h3>日別売上</h3>
                <table>
                    <thead><tr><th>日付</th><th>曜日</th><th>売上</th></tr></thead>
                    <tbody>
"""
        for row in month_data['daily_rows']:
            try:
                _, m, d = row["Date"].split("/")
                sales_formatted = f"¥{int(row['Sales']):,}"
                html += f"                        <tr><td>{int(m)}/{int(d)}</td><td>{row['Day']}</td><td>{sales_formatted}</td></tr>\n"
            except (ValueError, KeyError):
                continue
        html += """
                    </tbody>
                </table>
            </div>
            <div class="summary">
                <h3>曜日別平均売上</h3>
                <table>
                    <thead><tr><th>曜日</th><th>平均売上</th></tr></thead>
                    <tbody>
"""
        for i, day_en in enumerate(day_order):
            avg_sales_formatted = f"¥{month_data['averages'][i]:,}"
            html += f"                        <tr><td>{day_en}</td><td>{avg_sales_formatted}</td></tr>\n"
        html += """
                    </tbody>
                </table>
                <h3>月間合計</h3>
"""
        html += f'                <table><tr class="total-row"><td>合計売上</td><td>{monthly_total_formatted}</td></tr></table>'
        html += """
            </div>
        </div>
    </section>
"""

    grand_total_formatted = f"¥{grand_total_sales:,}"
    html += f"""
    <div class="grand-total">
        2023年度 年間総売上: {grand_total_formatted}
    </div>
</body>
</html>"""

    # Step 4: Write the generated HTML to the file
    try:
        with open("/Users/satoshiiga/dotfiles/KRMSALES/2023_sales_report.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Report regenerated successfully.")
    except IOError as e:
        print(f"Error writing to file: {e}")

if __name__ == "__main__":
    generate_report()
