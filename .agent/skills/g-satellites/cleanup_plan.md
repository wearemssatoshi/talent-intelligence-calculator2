# SVD Codebase Cleanup & Organization Plan

## 🟢 稼働中の主要システム（Active Projects & OS Core）
以下のディレクトリはSVDの基幹システムや重要なプロジェクトであり、現在稼働中・開発中のものです。そのまま維持（またはさらに整理）すべき領域です。

*   **TSS** (Team Synergy Stage関連)
*   **SVD_L1_03_MINDFUL** (日々の習慣・コンディション管理)
*   **SVD_L1_08_Restaurant_Sales** (売上データ基盤 / Momentum Peaks プロジェクト)
*   **SVD_L1_03_TalentIntelligence** (人材評価・Chipsアサインメントシステム)
*   **SVD_L1_03_OS** (WINE OSやPL Autoなどのシステム群)
*   **SVD_L1_07_budget** (R7予算データ等)
*   **SVD_L1_02_Roadmap** / **SVD_L1_02_TACTICS** / **SVD_L1_02_Presentations** (戦略・方針説明資料関連)
*   **SVD_L1_01_RYB** (ルスツ羊蹄豚リブランディング等のブランド資料)
*   **SVD_L3_Deliciousness** (美味しさの言語化・定義プロジェクト)
*   **SAT_Vault** (Obsidianのローカルナレッジベース / 第二の脳)
*   **.agent** / **_agent** (AntigravityやOpenClawなどのAIエージェントのスキル・スクリプト群)

---

## 🟡 整理・統合・アーカイブ候補（Observation / Obsolete Candidates）
過去の検証用ディレクトリや、すでに本番環境へ移行した古いソースコード、一時的なファイル群です。これらは大半が不要（または `_archive` への移動が望ましい）と考えられます。

*   **7Habits_Daily** (初期の検証用。現在はMINDFUL等に統合されているか確認が必要)
*   **BeerGarden** (過去のデータ。SVD_L1_08等に統合可能か)
*   **KRMSALES** / **PaymentAnalysis** (過去の売上・支払分析。L1_08等へ統合すべきか)
*   **NoteArticles** / **Essays** / **Media** / **AudioTranscripts** / **Creative** (コンテンツ類。体系的な保管場所へ移動・統合を推奨)
*   **WINE_ITEMS** / **wine-list-generator** (SVD_L1_03_OS の WINE OS内に統合すべきか)
*   **wearems-design-system** / **design-system** / **wearems-lp** (過去のUI枠組み。現在はSVD_MINDFUL等で各自保有している場合は不要かも)
*   **payment_all** / **output** / **ocr_temp** / **svd_fix_temp** (一時的な出力ファイルやスクリプトの残骸。削除して問題ない可能性が高い)
*   **The 7 Habits of Highly Effective People" Study Group** (学習資料。SAT_Vault内に移動してObsidianで管理するほうが良いか)
*   **kaito-study-app** / **community-app** / **restaurant-os** / **svd_mindful_clone** (過去のプロトタイプやクローン保管庫)

---

## 🗑️ 削除推奨ファイル（Safe to Delete Candidates）
ルートディレクトリに直接置かれている、過去のスクリプトや一時ファイルです。

*   `generate_knowledge_csv.py` / `ocr_pdf.py` / `ocr_pdf_sips.py` / `upscale_logo.py` (役目を終えた一時スクリプト)
*   `TV2023_*Q_parsed.json` / `TV2025_1Q_parsed.json` (抽出済みの一時データ。L1_08内で管理されるべき)
*   `temp_page.png` / `カレンダー.png`
*   `SVD_Tax_Policy_Impact_Analysis.html` / `SBT_Promotional_Material.html` / `winter_campaign_snippet.html` / `media_page.html` / `index.html` (ルートに散乱しているHTMLファイル)
*   `tss_knowledge_base.csv` / `wine_list.csv` / `pdf_content.txt` / `pdf_extracted.txt` / `PROPOSAL>>NEWSERVICE.md` / `RestaurantGift.sol`
