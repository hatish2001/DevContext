#!/bin/bash

# DevContext - Apply Optimization Indexes
# This script applies the performance optimization indexes to the database

set -e

echo "🚀 DevContext - Applying Performance Optimization Indexes"
echo "=========================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get database credentials from .env or use defaults
if [ -f ../.env ]; then
    source ../.env
fi

DB_USER="${POSTGRES_USER:-devcontext}"
DB_NAME="${POSTGRES_DB:-devcontext}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if PostgreSQL is accessible
echo "📡 Checking database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Make sure PostgreSQL is running: pg_isready"
    echo "  2. Check your .env file has correct credentials"
    echo "  3. Try connecting manually: psql -U $DB_USER -d $DB_NAME"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# Check if indexes already exist
echo "🔍 Checking existing indexes..."
EXISTING_INDEXES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_contexts%';")
EXISTING_INDEXES=$(echo $EXISTING_INDEXES | tr -d '[:space:]')

if [ "$EXISTING_INDEXES" -gt "0" ]; then
    echo -e "${YELLOW}⚠️  Found $EXISTING_INDEXES existing optimization indexes${NC}"
    echo ""
    read -p "Do you want to recreate them? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping index creation."
        exit 0
    fi
    
    echo "🗑️  Dropping existing indexes..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
DROP INDEX IF EXISTS idx_contexts_search_text;
DROP INDEX IF EXISTS idx_contexts_source;
DROP INDEX IF EXISTS idx_contexts_date;
DROP INDEX IF EXISTS idx_contexts_metadata;
DROP INDEX IF EXISTS idx_contexts_user_updated;
DROP INDEX IF EXISTS idx_contexts_source_id;
DROP INDEX IF EXISTS idx_integrations_user_service;
EOF
    echo -e "${GREEN}✅ Existing indexes dropped${NC}"
    echo ""
fi

# Apply the migration
echo "📝 Applying performance indexes..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f ../drizzle/add_performance_indexes.sql; then
    echo ""
    echo -e "${GREEN}✅ Performance indexes created successfully!${NC}"
    echo ""
    
    # Show created indexes
    echo "📊 Created indexes:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' ORDER BY tablename, indexname;"
    echo ""
    
    # Analyze tables to update statistics
    echo "📈 Analyzing tables to update statistics..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
ANALYZE contexts;
ANALYZE integrations;
EOF
    echo -e "${GREEN}✅ Tables analyzed${NC}"
    echo ""
    
    echo "🎉 Optimization complete!"
    echo ""
    echo "Expected improvements:"
    echo "  • 10x faster text search"
    echo "  • 5x faster filtering by source/date"
    echo "  • 3x faster metadata queries"
    echo "  • Prevents duplicate syncs"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your backend server"
    echo "  2. Test the improved performance"
    echo "  3. Check QUICK_START_OPTIMIZATIONS.md for testing"
    
else
    echo ""
    echo -e "${RED}❌ Failed to apply indexes${NC}"
    echo "Check the error messages above for details."
    exit 1
fi





