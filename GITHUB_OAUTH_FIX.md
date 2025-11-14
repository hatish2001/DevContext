# GitHub OAuth Redirect URI Fix

## Quick Fix Steps:

1. Go to: https://github.com/settings/developers
2. Click on "OAuth Apps"
3. Find your app (look for the Client ID: `Ov23lioi9xfPBuSzBvXy`)
4. Click on the app name to edit

## Update this field:

**Authorization callback URL:**
```
http://localhost:3000/api/oauth/github/callback
```

## Common Mistakes to Avoid:

❌ `http://localhost:3000/api/auth/github/callback` (wrong: auth instead of oauth)
❌ `http://localhost:5173/api/oauth/github/callback` (wrong: port 5173)
❌ `https://localhost:3000/api/oauth/github/callback` (wrong: https)
❌ `http://localhost:3000/oauth/github/callback` (wrong: missing /api)

✅ `http://localhost:3000/api/oauth/github/callback` (correct!)

## After Updating:

1. Click "Update application" on GitHub
2. Go back to DevContext (http://localhost:5173)
3. Click "Connect GitHub" again
4. It should work now!

## Still Having Issues?

Double-check that your backend .env file has:
```
GITHUB_CALLBACK_URL=http://localhost:3000/api/oauth/github/callback
```
