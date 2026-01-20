import requests
import re
import sys

USERNAME = 'the-gardensapporo_s-iga'
PASSWORD = 'zhxsuvLqx5cG'
LOGIN_URL = 'https://the-gardensapporo.jp/wp/wp-login.php'
ADMIN_URL = 'https://the-gardensapporo.jp/wp/wp-admin/'
MEDIA_NEW_URL = 'https://the-gardensapporo.jp/wp/wp-admin/media-new.php'
UPLOAD_URL = 'https://the-gardensapporo.jp/wp/wp-admin/async-upload.php'
FILE_PATH = '/Users/satoshiiga/dotfiles/GA illumination layout.pdf'

def main():
    s = requests.Session()
    s.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    # 1. Get login page to set cookies
    print("1. Visiting login page...")
    r = s.get(LOGIN_URL)
    
    # 2. Login
    print("2. Logging in...")
    payload = {
        'log': USERNAME,
        'pwd': PASSWORD,
        'wp-submit': 'Log In',
        'redirect_to': ADMIN_URL,
        'testcookie': '1'
    }
    r = s.post(LOGIN_URL, data=payload)
    
    # Check if we are redirected to admin or still on login page
    if 'wp-login.php' in r.url and 'error' in r.text:
        print("Login Failed!")
        print("Error message snippet:", re.search(r'<div id="login_error">(.+?)</div>', r.text, re.DOTALL))
        sys.exit(1)
    
    print("Login successful (or redirected). URL:", r.url)
    
    # 3. Get Nonce from Media Page
    print("3. Getting upload nonce...")
    r = s.get(MEDIA_NEW_URL)
    
    # Look for _wpnonce
    # Pattern 1: var _wpPluploadSettings = {"defaults":{"file_data_name":"async-upload",...,"multipart_params":{"_wpnonce":"..."
    match = re.search(r'"_wpnonce":"([a-f0-9]+)"', r.text)
    if not match:
        print("Could not find nonce in JSON.")
        # Pattern 2: input type hidden
        match = re.search(r'name="_wpnonce" value="([a-f0-9]+)"', r.text)
        
    if not match:
        print("Could not find nonce.")
        sys.exit(1)
        
    nonce = match.group(1)
    print(f"Nonce found: {nonce}")
    
    # 4. Upload
    print("4. Uploading file...")
    files = {'async-upload': open(FILE_PATH, 'rb')}
    data = {
        'html-upload': 'Upload',
        'post_id': 0,
        '_wpnonce': nonce,
        'action': 'upload-attachment',
        'name': 'GA_illumination_layout.pdf'
    }
    
    r = s.post(UPLOAD_URL, files=files, data=data)
    
    print("Response Status:", r.status_code)
    print("Response Content Start:", r.text[:200])
    
    if '0' == r.text.strip():
        print("Upload failed (0).")
    elif 'error' in r.text.lower() and 'success' not in r.text.lower():
        print("Upload might have failed.")
    else:
        print("Upload likely successful. Check Media Library.")

if __name__ == '__main__':
    main()
