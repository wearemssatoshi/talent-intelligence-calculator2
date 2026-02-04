
import pypdf
import subprocess
import os
import sys

def process_pdf_with_sips_ocr(pdf_path, output_path):
    print(f"Processing: {pdf_path}")
    full_text = ""
    # /tmp はアクセス権限の問題があるため、入力ファイルと同じディレクトリのサブフォルダを使用
    base_dir = os.path.dirname(os.path.abspath(pdf_path))
    temp_dir = os.path.join(base_dir, "ocr_temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        reader = pypdf.PdfReader(pdf_path)
        total_pages = len(reader.pages)
        print(f"Total Pages: {total_pages}")
        
        for i, page in enumerate(reader.pages):
            page_num = i + 1
            print(f"Processing Page {page_num}/{total_pages}...")
            
            # 1. ページ単体のPDFを作成
            writer = pypdf.PdfWriter()
            writer.add_page(page)
            temp_pdf_path = f"{temp_dir}/page_{page_num}.pdf"
            temp_img_path = f"{temp_dir}/page_{page_num}.png"
            
            with open(temp_pdf_path, "wb") as f:
                writer.write(f)
            
            # 2. sipsで画像化 (PDF -> PNG)
            try:
                subprocess.run(
                    ["sips", "-s", "format", "png", temp_pdf_path, "--out", temp_img_path],
                    check=True,
                    capture_output=True
                )
            except subprocess.CalledProcessError as e:
                print(f"  Sips conversion failed for page {page_num}: {e}")
                continue

            # 3. TesseractでOCR
            try:
                result = subprocess.run(
                    ["tesseract", temp_img_path, "stdout", "-l", "jpn+eng"],
                    capture_output=True,
                    check=True
                )
                ocr_text = result.stdout.decode('utf-8', errors='replace')
                
                full_text += f"\n\n--- Page {page_num} ---\n\n"
                full_text += ocr_text
                print(f"  OCR Success (Length: {len(ocr_text)})")
                
            except subprocess.CalledProcessError as e:
                print(f"  OCR Failed for page {page_num}: {e}")
            
            # Cleanup
            if os.path.exists(temp_pdf_path): os.remove(temp_pdf_path)
            if os.path.exists(temp_img_path): os.remove(temp_img_path)
                    
    except Exception as e:
        print(f"Critical Error: {e}")
        return

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_text)
    
    print(f"Done! Text saved to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py <input_pdf> <output_txt>")
        sys.exit(1)
    
    process_pdf_with_sips_ocr(sys.argv[1], sys.argv[2])
