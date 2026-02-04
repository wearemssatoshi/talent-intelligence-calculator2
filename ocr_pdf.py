
import pypdf
import subprocess
import os
import sys

def extract_text_with_ocr(pdf_path, output_path):
    print(f"Processing: {pdf_path}")
    full_text = ""
    
    try:
        reader = pypdf.PdfReader(pdf_path)
        print(f"Total Pages: {len(reader.pages)}")
        
        for i, page in enumerate(reader.pages):
            print(f"Processing Page {i+1}...")
            
            # まずテキスト抽出を試みる
            text = page.extract_text()
            if text and len(text.strip()) > 50: # ある程度テキストがあれば採用
                full_text += f"\n\n--- Page {i+1} (Text Extraction) ---\n\n"
                full_text += text
                continue
            
            # テキストがない場合、画像を探す
            if not page.images:
                print(f"  No text and no images found on page {i+1}")
                continue
                
            for image_file in page.images:
                image_path = f"/tmp/page_{i+1}_{image_file.name}"
                with open(image_path, "wb") as fp:
                    fp.write(image_file.data)
                
                # Run Tesseract
                try:
                    # -l jpn+eng で日本語優先
                    result = subprocess.run(
                        ["tesseract", image_path, "stdout", "-l", "jpn+eng"],
                        capture_output=True,
                        check=True
                    )
                    # バイナリで受け取り、エラーを無視してデコード
                    ocr_text = result.stdout.decode('utf-8', errors='replace')
                    full_text += f"\n\n--- Page {i+1} (OCR) ---\n\n"
                    full_text += ocr_text
                    print(f"  OCR Success for {image_file.name} (Length: {len(ocr_text)})")
                except subprocess.CalledProcessError as e:
                    print(f"  Tesseract Error for {image_file.name}: {e.stderr.decode('utf-8', errors='replace')}")
                except Exception as e:
                    print(f"  OCR Failed for {image_file.name}: {e}")
                
                # Cleanup
                if os.path.exists(image_path):
                    os.remove(image_path)
                    
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
    
    extract_text_with_ocr(sys.argv[1], sys.argv[2])
