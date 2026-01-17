#!/bin/bash
COOKIE_FILE="cookies.txt"
LOGIN_URL="https://the-gardensapporo.jp/wp/wp-login.php"
MEDIA_URL="https://the-gardensapporo.jp/wp/wp-admin/media-new.php"
UPLOAD_URL="https://the-gardensapporo.jp/wp/wp-admin/async-upload.php"
FILE_PATH="/Users/satoshiiga/dotfiles/GA illumination layout.pdf"

# Clean up old cookies
rm -f "$COOKIE_FILE"

# 1. Login
echo "Logging in..."
curl -s -c "$COOKIE_FILE" -d "log=the-gardensapporo_s-iga&pwd=zhxsuvLqx5cG&wp-submit=Log+In&testcookie=1" "$LOGIN_URL" > /dev/null

# 2. Get Nonce
echo "Getting Nonce..."
# We look for _wpnonce in the media-new page. It's often in a JS object or hidden input.
PAGE_CONTENT=$(curl -s -b "$COOKIE_FILE" "$MEDIA_URL")
NONCE=$(echo "$PAGE_CONTENT" | grep -o '"_wpnonce":"[a-f0-9]*"' | head -n 1 | cut -d'"' -f4)

if [ -z "$NONCE" ]; then
    # Fallback search pattern
    NONCE=$(echo "$PAGE_CONTENT" | grep -o 'name="_wpnonce" value="[a-f0-9]*"' | head -n 1 | cut -d'"' -f4)
fi

if [ -z "$NONCE" ]; then
    echo "Error: Could not retrieve nonce."
    # echo "$PAGE_CONTENT" > debug_media.html # Debug if needed
    exit 1
fi

echo "Nonce found: $NONCE"

# 3. Upload
echo "Uploading file..."
curl -s -b "$COOKIE_FILE" \
    -F "async-upload=@$FILE_PATH" \
    -F "html-upload=Upload" \
    -F "post_id=0" \
    -F "_wpnonce=$NONCE" \
    -F "action=upload-attachment" \
    -F "name=GA_illumination_layout.pdf" \
    "$UPLOAD_URL"
