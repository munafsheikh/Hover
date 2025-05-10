# Chrome Web Store API Setup Instructions

1. Create a Google Cloud Project:

   - Go to https://console.cloud.google.com/
   - Create a new project
   - Enable Chrome Web Store API

2. Create OAuth credentials:

   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Desktop app
   - Download client configuration

3. Get refresh token:

   ```bash
   # Install chrome-webstore-upload-cli
   npm install -g chrome-webstore-upload-cli

   # Get refresh token
   chrome-webstore-upload-cli login
   ```

4. Get Extension ID:
   - Upload your extension manually first time
   - Get ID from Chrome Web Store URL
