# GitHub Sync - Quick Start Guide

## 🚀 What's New

DevContext can now sync your GitHub activity! View all your PRs, issues, commits, and code reviews in one unified dashboard.

---

## ⚡ Quick Start (3 Steps)

### 1. Start the Services
```bash
# Terminal 1: Database
cd devcontext && docker-compose up -d

# Terminal 2: Backend
cd devcontext/backend && npm run dev

# Terminal 3: Frontend  
cd devcontext/frontend && npm run dev
```

### 2. Login with GitHub
- Go to `http://localhost:5173`
- Click "Login with GitHub"
- Authorize the app

### 3. Sync Your Data
- Click the "Sync GitHub" button in the dashboard
- Wait 5-15 seconds
- Your GitHub activity appears!

---

## 🎯 Features

✅ **Pull Requests** - All PRs you've created  
✅ **Issues** - Issues you're involved in  
✅ **Commits** - Your recent commits  
✅ **Code Reviews** - PRs you've reviewed  

✅ **Filter by Type** - View specific activity  
✅ **Stats Dashboard** - See counts at a glance  
✅ **Direct Links** - Click to open in GitHub  
✅ **Smart Deduplication** - No duplicate entries  

---

## 📊 What You'll See

```
┌─────────────────────────────────────────────────┐
│  DevContext                                     │
│                                                 │
│  [🔄 Sync GitHub]                              │
│                                                 │
│  ┌───────────────┐                            │
│  │ Total: 71     │                            │
│  │ Last sync:    │                            │
│  │ 5 minutes ago │                            │
│  └───────────────┘                            │
│                                                 │
│  📄 All Contexts          71                   │
│  🔀 Pull Requests        15                   │
│  🐛 Issues                8                   │
│  💻 Commits              42                   │
│  💬 Reviews               6                   │
└─────────────────────────────────────────────────┘
```

---

## 🔧 API Endpoints

### Trigger Sync
```bash
POST /api/contexts/sync
Body: { "userId": "...", "daysBack": 30 }
```

### Get Contexts
```bash
GET /api/contexts?userId=...&source=github_pr&limit=50
```

### Get Stats
```bash
GET /api/contexts/stats?userId=...
```

---

## 🐛 Troubleshooting

**Problem**: No data after sync  
**Solution**: Check that you have GitHub activity in the last 30 days

**Problem**: "GitHub integration not found"  
**Solution**: Make sure you logged in with GitHub OAuth first

**Problem**: Sync taking too long  
**Solution**: Normal for users with lots of activity. Wait up to 30 seconds.

---

## 📝 Technical Details

- **Backend**: Express + Drizzle ORM + Octokit
- **Frontend**: React + TypeScript + Radix UI
- **Database**: PostgreSQL with UUID primary keys
- **Auth**: JWT tokens + OAuth 2.0

---

## 🎓 How It Works

```
1. User clicks "Sync GitHub"
2. Backend fetches from GitHub API using user's token
3. Data is saved to PostgreSQL contexts table
4. Frontend refreshes and displays the contexts
5. User can filter, search, and click through to GitHub
```

---

## 📚 Files Modified

**Backend**:
- `src/services/githubService.ts` - NEW
- `src/routes/contexts.ts` - Updated
- `src/models/schema.ts` - Added url field

**Frontend**:
- `src/pages/Dashboard.tsx` - Complete redesign
- `src/lib/api.ts` - Added sync methods
- `src/stores/auth.ts` - Save userId

---

## 🚀 Next Steps

1. **Test it out** - Sync your GitHub data
2. **Try filtering** - Click different context types
3. **Click links** - Open items in GitHub
4. **Check stats** - View your activity summary

---

## 💡 Pro Tips

- Sync regularly to keep data fresh
- Use filters to focus on specific work
- Click external links to see full details in GitHub
- Check "Last sync" to know when data was updated

---

## 🎉 Success!

You now have a unified view of all your GitHub activity. No more switching between tabs or losing context!

**Happy coding! 🚀**

