import requests
import re
import sys
import json

USERNAME = 'the-gardensapporo_s-iga'
PASSWORD = 'zhxsuvLqx5cG'
LOGIN_URL = 'https://the-gardensapporo.jp/wp/wp-login.php'
ADMIN_URL = 'https://the-gardensapporo.jp/wp/wp-admin/'
MEDIA_NEW_URL = 'https://the-gardensapporo.jp/wp/wp-admin/media-new.php'
UPLOAD_URL = 'https://the-gardensapporo.jp/wp/wp-admin/async-upload.php'
FILE_PATH = '/Users/satoshiiga/dotfiles/GA illumination layout.pdf'

def main():
    session = requests.Session()
    
    # 1. Login
    print("Attempting login...")
    payload = {
        'log': USERNAME,
        'pwd': PASSWORD,
        'wp-submit': 'Log In',
        'redirect_to': ADMIN_URL,
        'testcookie': '1'
    }
    r = session.post(LOGIN_URL, data=payload)
    
    if 'wp-admin' not in r.url and 'dashboard' not in r.text.lower():
        print("Login failed. URL:", r.url)
        # Check if 2FA or other issues
        sys.exit(1)
        
    print("Login successful.")
    
    # 2. Get Nonce
    print("Fetching upload nonce...")
    r = session.get(MEDIA_NEW_URL)
    
    # Try to find the nonce in the _wpPluploadSettings
    match = re.search(r'"_wpnonce":"([a-f0-9]+)"', r.text)
    if not match:
        # Fallback to standard input
        match = re.search(r'name="_wpnonce" value="([a-f0-9]+)"', r.text)
        
    if not match:
        print("Could not find nonce.")
        # Debug: print a bit of text
        # print(r.text[:1000])
        sys.exit(1)
        
    nonce = match.group(1)
    print(f"Nonce found: {nonce}")
    
    # 3. Upload File
    print("Uploading file...")
    files = {'async-upload': open(FILE_PATH, 'rb')}
    data = {
        'html-upload': 'Upload',
        'post_id': 0,
        '_wpnonce': nonce,
        'action': 'upload-attachment',
        'name': 'GA_illumination_layout.pdf'
    }
    
    r = session.post(UPLOAD_URL, files=files, data=data)
    
    try:
        # The response for async-upload is typically JSON
        # But sometimes it returns "0" on failure or HTML
        if r.text.strip() == '0':
            print("Upload failed (server returned 0).")
            sys.exit(1)
            
        # It might be JSON
        if r.headers.get('Content-Type', '').startswith('application/json'):
            resp_json = r.json()
            if resp_json.get('success'):
                print("Upload SUCCESS!")
                print("URL:", resp_json['data']['url'])
                print("ID:", resp_json['data']['id'])
            else:
                print("Upload failed:", resp_json)
        else:
            # Sometimes it returns ID directly or mixed content
            print("Response text:", r.text[:500])
            
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(r.text[:500])

if __name__ == '__main__':
    main()
