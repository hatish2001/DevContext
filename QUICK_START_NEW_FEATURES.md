# Quick Start Guide - New Features

## 🚀 Getting Started

### Step 1: Run Database Migration

Before starting the application, apply the database schema changes:

```bash
# Make sure PostgreSQL is running
cd devcontext
docker-compose up -d

# Apply the migration (password: devcontext, port: 5433)
cd backend
PGPASSWORD=devcontext psql -h localhost -p 5433 -U devcontext -d devcontext -f drizzle/add_last_github_sync.sql
```

Expected output:
```
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

### Step 2: Start the Backend

```bash
cd backend
npm run dev
```

The backend should start on `http://localhost:3000`

### Step 3: Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:5173`

### Step 4: Login and Test

1. Open `http://localhost:5173` in your browser
2. Login with GitHub OAuth
3. Watch for the **auto-sync** to start automatically! 🎉

## 🎯 Testing the New Features

### Feature 1: Auto-Sync ⚡

**What to look for:**
- Blue "Auto-syncing..." indicator appears in the sidebar on login
- Contexts load automatically without clicking "Sync GitHub"
- Auto-sync runs every 5 minutes in the background
- Toast notification shows when new data is synced

**Test it:**
```
1. Login to the app
2. Look for the auto-sync indicator (should appear immediately)
3. Wait 5 minutes - should sync again automatically
4. Click manual sync, refresh page - should skip auto-sync (already synced recently)
```

### Feature 2: Search 🔍

**What to look for:**
- Search bar at the top of the dashboard
- Real-time search results as you type
- Highlighted matching text in results
- Icons showing source type (PR, Issue, Commit, Review)

**Test it:**
```
1. Type in the search bar (minimum 2 characters)
2. See results appear after 300ms
3. Click a result - opens in new GitHub tab
4. Click the X button to clear search
```

**Try these searches:**
- "update" - find all updates
- "fix" - find all bug fixes
- "feature" - find feature work
- Your repository name - find all contexts from that repo

### Feature 3: Command Palette ⌨️

**What to look for:**
- Press `Cmd+K` (Mac) or `Ctrl+K` (Windows) to open
- Modal overlay with command list
- Search functionality integrated
- Keyboard navigation works smoothly

**Test it:**
```
1. Press Cmd+K to open the command palette
2. See quick actions listed:
   - Go to Dashboard
   - Sync GitHub
   - Settings
   - Logout
3. Type to search contexts
4. Use arrow keys (↑↓) to navigate
5. Press Enter to select
6. Press Escape to close
```

**Available Shortcuts:**
- `Cmd/Ctrl + K` - Toggle command palette
- `Cmd/Ctrl + D` - Go to dashboard (from palette)
- `Cmd/Ctrl + S` - Sync GitHub (from palette)
- `Cmd/Ctrl + ,` - Settings (from palette)
- `Cmd/Ctrl + Q` - Logout (from palette)

## 📊 What Each Feature Does

### Auto-Sync
- **Runs on login** - No more manual clicking!
- **Smart caching** - Only syncs if data is older than 5 minutes
- **Background updates** - Syncs every 5 minutes automatically
- **Efficient** - Only fetches last 7 days (vs 30 for manual sync)

### Search
- **Full-text search** - Searches titles, content, and metadata
- **Intelligent ranking** - Title matches ranked higher than content
- **Real-time results** - 300ms debounce for smooth typing
- **Visual feedback** - Highlighted search terms in results

### Command Palette
- **Keyboard-first** - Navigate without touching the mouse
- **Global access** - Available from any page
- **Quick actions** - Common tasks at your fingertips
- **Integrated search** - Find contexts without leaving the keyboard

## 🐛 Common Issues

### Issue: Auto-sync not working

**Check:**
```bash
# 1. Verify migration was applied
PGPASSWORD=devcontext psql -h localhost -p 5433 -U devcontext -d devcontext -c "\d users"
# Should show "last_github_sync" column

# 2. Check backend logs
# Look for "Auto-sync completed" or "Smart sync error"

# 3. Check browser console
# Should see "Auto-sync completed: { stats }" logs
```

### Issue: Search returns nothing

**Check:**
```bash
# 1. Verify you have contexts
PGPASSWORD=devcontext psql -h localhost -p 5433 -U devcontext -d devcontext -c "SELECT COUNT(*) FROM contexts;"

# 2. Run a manual sync first
# Click "Sync GitHub" button in the dashboard

# 3. Try a different search term
# Search for something you know exists
```

### Issue: Command palette won't open

**Check:**
```bash
# 1. Verify cmdk is installed
cd frontend
npm list cmdk
# Should show: cmdk@1.x.x

# 2. Try a different browser
# Some browser extensions conflict with Cmd+K

# 3. Check browser console for errors
# Look for React component errors
```

### Issue: Database migration fails

**Solution:**
```bash
# If PostgreSQL is not running:
docker-compose up -d

# If wrong credentials:
# Update connection string in the migration command

# If table already exists:
# Migration is idempotent, safe to run again
```

## 🎨 UI/UX Highlights

### Auto-Sync Indicator
- **Color**: Blue with subtle background
- **Animation**: Spinning refresh icon
- **Position**: Top of sidebar, above sync button
- **Behavior**: Only shows when actively syncing

### Search Bar
- **Size**: Full width, max 2xl (48rem)
- **Icons**: 
  - 🔀 Pull Requests (green)
  - 🐛 Issues (blue)
  - 💾 Commits (purple)
  - 👀 Reviews (yellow)
- **Highlighting**: Yellow `<mark>` tags on matching text
- **Position**: Top of main content area

### Command Palette
- **Theme**: Matches your app theme automatically
- **Backdrop**: Semi-transparent black overlay
- **Position**: Centered, 20vh from top
- **Groups**: Sections for "Quick Actions" and "Search Results"
- **Footer**: Keyboard hints (↑↓ Navigate, ↵ Select, ESC Close)

## 🚀 Pro Tips

### For Power Users

1. **Use Command Palette for Everything**
   - `Cmd+K` → Type "sync" → Enter (faster than clicking)
   - `Cmd+K` → Type search term → Arrow keys → Enter

2. **Search Shortcuts**
   - Search in the main bar for browsing
   - Search in command palette for quick access
   - Both use the same backend, pick what feels natural

3. **Let Auto-Sync Work**
   - Don't manually sync unless you need immediate updates
   - Auto-sync keeps data fresh in the background
   - Manual sync is still available for on-demand updates

### For Developers

1. **API Endpoints Added:**
   ```
   POST /api/contexts/smart-sync
   GET  /api/contexts/search?userId=X&query=Y&limit=20
   ```

2. **New React Hooks:**
   ```typescript
   useAutoSync(userId, enabled)
   useDebounce(value, delay)
   useKeyboardShortcuts(shortcuts)
   ```

3. **New Components:**
   ```typescript
   <SearchBar userId={id} onSelectResult={fn} />
   <CommandPalette userId={id} onSync={fn} />
   ```

## 📈 Performance

Expected performance benchmarks:

- **Auto-sync**: < 2 seconds for 7 days of data
- **Search**: < 200ms response time
- **Command palette**: < 50ms to open
- **UI interactions**: 60fps animations

## ✅ Checklist

Before considering implementation complete:

- [ ] Database migration applied successfully
- [ ] Auto-sync indicator appears on login
- [ ] Search returns relevant results
- [ ] Command palette opens with Cmd+K
- [ ] All keyboard shortcuts work
- [ ] No console errors
- [ ] Backend logs show successful syncs
- [ ] Toast notifications appear appropriately

## 🎉 Success!

If all the above works, congratulations! You now have:

✅ **Automatic data synchronization** - Fresh data, no clicks
✅ **Powerful search** - Find anything instantly  
✅ **Keyboard navigation** - Power user efficiency

Enjoy your enhanced DevContext experience! 🚀

---

*Need help? Check the main IMPLEMENTATION_COMPLETE.md for detailed troubleshooting.*

