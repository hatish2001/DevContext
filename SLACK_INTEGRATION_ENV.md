# Slack Integration Environment Variables

## Required Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Slack OAuth Configuration
SLACK_CLIENT_ID=xoxb-your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret

# OAuth Redirect URLs
BACKEND_URL=https://your-backend.com
FRONTEND_URL=https://your-frontend.com

# Optional: Socket Mode (for development without public URL)
SLACK_APP_TOKEN=xapp-your-app-token
```

## Where to Find These Values

### 1. SLACK_CLIENT_ID and SLACK_CLIENT_SECRET
1. Go to https://api.slack.com/apps
2. Select your app (or create a new one)
3. Navigate to **Basic Information** → **App Credentials**
4. Copy:
   - **Client ID** → `SLACK_CLIENT_ID`
   - **Client Secret** → `SLACK_CLIENT_SECRET`

### 2. SLACK_SIGNING_SECRET
1. In your Slack app settings
2. Navigate to **Basic Information** → **App Credentials**
3. Copy **Signing Secret** → `SLACK_SIGNING_SECRET`

**Important**: This is required for verifying event requests from Slack.

### 3. SLACK_APP_TOKEN (Optional - Socket Mode)
1. In your Slack app settings
2. Navigate to **Socket Mode**
3. Enable Socket Mode
4. Generate an App-Level Token with `connections:write` scope
5. Copy the token → `SLACK_APP_TOKEN`

**Note**: Socket Mode is optional but recommended for development as it doesn't require a public URL.

### 4. BACKEND_URL and FRONTEND_URL
- `BACKEND_URL`: Your backend API URL (e.g., `https://api.yourdomain.com` or `http://localhost:3000` for development)
- `FRONTEND_URL`: Your frontend URL (e.g., `https://yourdomain.com` or `http://localhost:5173` for development)

## OAuth Redirect URI

Make sure to add this redirect URI in your Slack app settings:

1. Go to **OAuth & Permissions** in your Slack app
2. Add **Redirect URL**: `https://your-backend.com/api/slack/auth/callback`
3. For development: `http://localhost:3000/api/slack/auth/callback`

## Event Subscriptions URL

For production, configure this in your Slack app:

1. Go to **Event Subscriptions** in your Slack app
2. Enable Events
3. Set **Request URL**: `https://your-backend.com/api/slack/events`

**Note**: Slack will verify this URL on save. Make sure your endpoint is accessible and returns the challenge value.

## Example .env File

```env
# Backend Configuration
NODE_ENV=production
PORT=3000
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/devcontext

# Slack Integration
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here
SLACK_SIGNING_SECRET=your-slack-signing-secret-here
SLACK_APP_TOKEN=your-slack-app-token-here

# Other integrations...
GITHUB_CLIENT_ID=...
JIRA_CLIENT_ID=...
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate secrets** if compromised
3. **Use environment-specific values** (dev, staging, prod)
4. **Enable request signature verification** (handled automatically when `SLACK_SIGNING_SECRET` is set)
5. **Use HTTPS** in production for all URLs

## Verification Checklist

- [ ] `SLACK_CLIENT_ID` is set and correct
- [ ] `SLACK_CLIENT_SECRET` is set and correct
- [ ] `SLACK_SIGNING_SECRET` is set (required for events)
- [ ] `BACKEND_URL` matches your actual backend URL
- [ ] `FRONTEND_URL` matches your actual frontend URL
- [ ] Redirect URI is added in Slack app settings
- [ ] Event Subscriptions URL is configured (if using events)

## Troubleshooting

**Error: "invalid_client"**
- Check that `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are correct
- Ensure no extra spaces or quotes in `.env` file

**Error: "Invalid signature"**
- Verify `SLACK_SIGNING_SECRET` is correct
- Check that your server time is synchronized (NTP)

**OAuth callback fails**
- Verify redirect URI matches exactly in Slack app settings
- Check `BACKEND_URL` is correct and accessible
- Ensure backend is running and route is registered

**Events not working**
- Verify Event Subscriptions URL is accessible
- Check that `SLACK_SIGNING_SECRET` is set
- Review server logs for signature verification errors



