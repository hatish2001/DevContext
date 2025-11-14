# OAuth Setup Instructions

## GitHub OAuth Setup

To enable GitHub OAuth in DevContext, follow these steps:

### 1. Create a GitHub OAuth App

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the following details:
   - **Application name**: DevContext (or your preferred name)
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:3000/api/oauth/github/callback
4. Click "Register application"

### 2. Get Your Credentials

After creating the app:
1. Copy the **Client ID**
2. Click "Generate a new client secret"
3. Copy the **Client Secret** (save it securely, you won't see it again!)

### 3. Update Your .env File

Add these values to your `.env` file:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_actual_github_client_id
GITHUB_CLIENT_SECRET=your_actual_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/oauth/github/callback
```

### 4. Restart the Backend

After updating the .env file, restart the backend server:

```bash
# Stop the backend (Ctrl+C in the terminal)
# Then restart it:
npm run dev:backend
```

### 5. Test the Integration

1. Open http://localhost:5173
2. Login with your test account
3. Click "Connect GitHub"
4. Authorize the app on GitHub
5. You should be redirected back and see your GitHub account connected!

## Production Setup

For production deployment:

1. Update the URLs to your production domain
2. Use HTTPS for all URLs
3. Store secrets securely (e.g., in environment variables, not in code)
4. Update the GitHub OAuth app settings with production URLs

## Troubleshooting

- **"Redirect URI mismatch"**: Make sure the callback URL in GitHub exactly matches what's in your .env file
- **"Invalid client"**: Check that your client ID and secret are correct
- **Connection fails**: Ensure the backend is running and the frontend can reach it

## Security Notes

- Never commit your OAuth secrets to version control
- Use different OAuth apps for development and production
- Regularly rotate your client secrets
- Monitor your OAuth app usage in GitHub settings
