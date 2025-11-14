# Backend Scripts

Utility scripts for DevContext backend management.

## Available Scripts

### `apply-optimization-indexes.sh`
Applies performance optimization database indexes.

**Usage:**
```bash
cd backend/scripts
./apply-optimization-indexes.sh
```

**What it does:**
- Checks database connection
- Detects existing indexes
- Applies 6 performance indexes:
  - Full-text search index (GIN)
  - User + source composite
  - User + date composite
  - Metadata JSONB index
  - Source ID index
  - Integrations lookup
- Analyzes tables for query optimization

**Expected output:**
```
🚀 DevContext - Applying Performance Optimization Indexes
==========================================================

Database Configuration:
  Host: localhost
  Port: 5432
  Database: devcontext
  User: devcontext

📡 Checking database connection...
✅ Database connection successful

📝 Applying performance indexes...
CREATE INDEX
CREATE INDEX
...
✅ Performance indexes created successfully!

🎉 Optimization complete!
```

---

### `test-commits.ts`
Tests GitHub commit syncing (existing).

**Usage:**
```bash
npm run build
node dist/scripts/test-commits.js
```

---

### `test-github-sync.ts`
Tests full GitHub synchronization (existing).

**Usage:**
```bash
npm run build
node dist/scripts/test-github-sync.js
```

---

### `add-unique-index.ts`
Adds unique index for context deduplication (existing).

**Usage:**
```bash
npm run build
node dist/scripts/add-unique-index.js
```

---

## Quick Reference

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `apply-optimization-indexes.sh` | Performance indexes | After optimization sprint |
| `test-commits.ts` | Test commit sync | Debugging GitHub sync |
| `test-github-sync.ts` | Test full sync | Debugging integration |
| `add-unique-index.ts` | Prevent duplicates | Before production |

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
pg_isready

# Check credentials in .env
cat ../.env | grep POSTGRES

# Try manual connection
psql -U devcontext -d devcontext
```

### "Permission denied"
```bash
# Make script executable
chmod +x apply-optimization-indexes.sh
```

### "Index already exists"
The script will detect existing indexes and ask if you want to recreate them. Answer `y` to proceed.

---

## Creating New Scripts

When adding new utility scripts:

1. **TypeScript scripts**: Add to `backend/src/scripts/`
2. **Shell scripts**: Add to `backend/scripts/`
3. **Update this README** with usage instructions
4. **Make shell scripts executable**: `chmod +x script-name.sh`

Example template for shell scripts:
```bash
#!/bin/bash
set -e

echo "🚀 Script Name"
echo "=============="

# Load environment variables
if [ -f ../.env ]; then
    source ../.env
fi

# Your script logic here

echo "✅ Done!"
```





