import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { contexts, integrations, users } from '../models/schema';
import { GitHubService } from '../services/githubService';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/contexts/sync
 * Trigger GitHub data synchronization
 */
router.post('/sync', async (req: Request, res: Response) => {
  const { userId, daysBack = 30 } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get user's GitHub integration
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.service, 'github'),
          eq(integrations.active, true)
        )
      )
      .limit(1);

    if (!integration) {
      return res.status(404).json({
        error: 'GitHub integration not found'
      });
    }

    // Initialize GitHub service and sync
    const githubService = new GitHubService(userId, integration.accessToken!);
    const result = await githubService.syncAll(daysBack);

    // Update last sync time
    await db
      .update(users)
      .set({ lastGithubSync: new Date() })
      .where(eq(users.id, userId));

    return res.json({
      success: true,
      message: 'GitHub sync completed',
      stats: result
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      error: 'Failed to sync GitHub data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/contexts/smart-sync
 * Intelligently syncs based on last sync time
 */
router.post('/smart-sync', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get user's last sync time
    const [user] = await db
      .select({ lastGithubSync: users.lastGithubSync })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const lastSync = user?.lastGithubSync;
    const now = new Date();

    // Only sync if:
    // 1. Never synced before
    // 2. Last sync was more than 5 minutes ago
    const shouldSync = !lastSync || 
      (now.getTime() - new Date(lastSync).getTime()) > 5 * 60 * 1000;

    if (!shouldSync) {
      return res.json({
        success: true,
        message: 'Recently synced, skipping',
        skipped: true,
        lastSync
      });
    }

    // Get integration
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.service, 'github'),
          eq(integrations.active, true)
        )
      )
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: 'GitHub not connected' });
    }

    // Perform sync with shorter time range for auto-sync
    const githubService = new GitHubService(userId, integration.accessToken!);
    const result = await githubService.syncAll(7); // Only last 7 days for auto-sync

    // Update last sync time
    await db
      .update(users)
      .set({ lastGithubSync: now })
      .where(eq(users.id, userId));

    return res.json({
      success: true,
      message: 'Auto-sync completed',
      stats: result,
      lastSync: now
    });

  } catch (error) {
    console.error('Smart sync error:', error);
    return res.status(500).json({ 
      error: 'Failed to perform smart sync' 
    });
  }
});

/**
 * GET /api/contexts
 * Fetch user's contexts with filtering
 */
router.get('/', async (req: Request, res: Response) => {
  const { userId, source, limit = '50', offset = '0' } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Build where clause
    let whereClause = eq(contexts.userId, userId);
    if (source && typeof source === 'string') {
      whereClause = and(whereClause, eq(contexts.source, source)) as any;
    }

    // Fetch contexts with pagination
    const contextsList = await db
      .select()
      .from(contexts)
      .where(whereClause)
      .orderBy(desc(contexts.updatedAt))
      .limit(limitNum)
      .offset(offsetNum);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contexts)
      .where(whereClause);

    return res.json({
      contexts: contextsList,
      pagination: {
        total: Number(count),
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < Number(count)
      }
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch contexts'
    });
  }
});

/**
 * GET /api/contexts/stats
 * Get statistics about user's contexts
 */
router.get('/stats', async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(contexts)
      .where(eq(contexts.userId, userId));

    // Get counts by source
    const bySourceResults = await db
      .select({
        source: contexts.source,
        count: sql<number>`count(*)`
      })
      .from(contexts)
      .where(eq(contexts.userId, userId))
      .groupBy(contexts.source);

    const bySource = bySourceResults.reduce((acc, item) => ({
      ...acc,
      [item.source]: Number(item.count)
    }), {});

    // Get last sync time
    const [lastSyncRecord] = await db
      .select({ createdAt: contexts.createdAt })
      .from(contexts)
      .where(eq(contexts.userId, userId))
      .orderBy(desc(contexts.createdAt))
      .limit(1);

    return res.json({
      total: Number(total),
      bySource,
      lastSync: lastSyncRecord?.createdAt || null
    });

  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({
      error: 'Failed to fetch stats'
    });
  }
});

/**
 * Parse search query for special patterns and operators
 */
interface ParsedQuery {
  type: 'date' | 'author' | 'status' | 'repo' | 'text' | 'combined';
  text?: string;
  dateRange?: { from: Date; to: Date };
  author?: string;
  status?: string;
  repo?: string;
  filters: {
    hasDate?: boolean;
    hasAuthor?: boolean;
    hasStatus?: boolean;
    hasRepo?: boolean;
  };
}

function parseSearchQuery(query: string): ParsedQuery {
  const q = query.trim();
  const lowerQ = q.toLowerCase();
  
  const filters: ParsedQuery['filters'] = {};
  let remainingText = q;
  let parsedQuery: ParsedQuery = {
    type: 'text',
    filters,
    text: q
  };

  // Helper: Get date range for temporal queries
  const getDateRange = (pattern: string): { from: Date; to: Date } | null => {
    const now = new Date();
    const startOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const endOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    switch (pattern) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      }
      case 'this week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return { from: startOfDay(startOfWeek), to: endOfDay(now) };
      }
      case 'last week': {
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return { from: startOfDay(lastWeekStart), to: endOfDay(lastWeekEnd) };
      }
      default:
        return null;
    }
  };

  // Check for date queries
  const datePatterns = ['today', 'yesterday', 'this week', 'last week'];
  for (const pattern of datePatterns) {
    if (lowerQ.includes(pattern)) {
      const dateRange = getDateRange(pattern);
      if (dateRange) {
        parsedQuery.dateRange = dateRange;
        filters.hasDate = true;
        remainingText = remainingText.replace(new RegExp(pattern, 'gi'), '').trim();
      }
    }
  }

  // Check for author queries (@username or "username's")
  const authorMatch = q.match(/@(\w+)|(\w+)'s\s/);
  if (authorMatch) {
    parsedQuery.author = authorMatch[1] || authorMatch[2];
    filters.hasAuthor = true;
    remainingText = remainingText.replace(authorMatch[0], '').trim();
  }

  // Check for status queries (is:open, is:closed, is:merged)
  const statusMatch = q.match(/is:(\w+)/i);
  if (statusMatch) {
    parsedQuery.status = statusMatch[1].toLowerCase();
    filters.hasStatus = true;
    remainingText = remainingText.replace(statusMatch[0], '').trim();
  }

  // Check for repo queries (repo:name)
  const repoMatch = q.match(/repo:(\S+)/i);
  if (repoMatch) {
    parsedQuery.repo = repoMatch[1];
    filters.hasRepo = true;
    remainingText = remainingText.replace(repoMatch[0], '').trim();
  }

  // Determine query type
  const filterCount = Object.keys(filters).length;
  if (filterCount > 1) {
    parsedQuery.type = 'combined';
  } else if (filters.hasDate) {
    parsedQuery.type = 'date';
  } else if (filters.hasAuthor) {
    parsedQuery.type = 'author';
  } else if (filters.hasStatus) {
    parsedQuery.type = 'status';
  } else if (filters.hasRepo) {
    parsedQuery.type = 'repo';
  }

  // Store remaining text for full-text search
  parsedQuery.text = remainingText.trim() || undefined;

  return parsedQuery;
}

/**
 * GET /api/contexts/search
 * Intelligent search with multiple query strategies
 */
router.get('/search', async (req: Request, res: Response) => {
  const { userId, query, limit = '20' } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.json({ results: [], query: query || '', count: 0, type: 'empty' });
  }

  try {
    const parsedQuery = parseSearchQuery(query);
    const limitNum = Number(limit);

    // Build where conditions based on parsed query
    const conditions: any[] = [eq(contexts.userId, userId)];

    // Add date filter
    if (parsedQuery.dateRange) {
      conditions.push(
        sql`${contexts.createdAt} >= ${parsedQuery.dateRange.from}`,
        sql`${contexts.createdAt} <= ${parsedQuery.dateRange.to}`
      );
    }

    // Add author filter
    if (parsedQuery.author) {
      conditions.push(
        sql`${contexts.metadata}->>'author' ILIKE ${`%${parsedQuery.author}%`}`
      );
    }

    // Add status filter
    if (parsedQuery.status) {
      const statusMapping: Record<string, string[]> = {
        'open': ['open', 'opened'],
        'closed': ['closed'],
        'merged': ['merged'],
        'draft': ['draft']
      };
      const statuses = statusMapping[parsedQuery.status] || [parsedQuery.status];
      conditions.push(
        or(...statuses.map(s => sql`${contexts.metadata}->>'state' ILIKE ${s}`))
      );
    }

    // Add repo filter
    if (parsedQuery.repo) {
      conditions.push(
        sql`${contexts.metadata}->>'repo' ILIKE ${`%${parsedQuery.repo}%`}`
      );
    }

    // Build text search conditions with enhanced relevance
    let textConditions: any[] = [];
    let relevanceCase = sql`0`;

    if (parsedQuery.text && parsedQuery.text.length > 0) {
      const searchTerm = parsedQuery.text.toLowerCase();
      const likeTerm = `%${searchTerm}%`;
      const firstWord = searchTerm.split(' ')[0];
      const firstWordTerm = `%${firstWord}%`;

      textConditions = [
        ilike(contexts.title, likeTerm),
        ilike(contexts.content, likeTerm),
        sql`${contexts.metadata}::text ILIKE ${likeTerm}`
      ];

      // Enhanced relevance scoring
      relevanceCase = sql`
        CASE
          WHEN LOWER(${contexts.title}) = ${searchTerm} THEN 100
          WHEN LOWER(${contexts.title}) LIKE ${likeTerm} THEN 50
          WHEN LOWER(${contexts.title}) LIKE ${firstWordTerm} THEN 40
          WHEN LOWER(${contexts.content}) LIKE ${likeTerm} THEN 30
          WHEN ${contexts.metadata}->>'repo' ILIKE ${likeTerm} THEN 20
          WHEN ${contexts.metadata}->>'author' ILIKE ${likeTerm} THEN 15
          WHEN ${contexts.metadata}::text ILIKE ${likeTerm} THEN 10
          ELSE 1
        END
      `;
    } else {
      // If only filters, no text search needed, give all results equal relevance
      relevanceCase = sql`1`;
    }

    // Combine all conditions
    if (textConditions.length > 0) {
      conditions.push(or(...textConditions));
    }

    // Execute search with relevance scoring
    const results = await db
      .select({
        id: contexts.id,
        userId: contexts.userId,
        source: contexts.source,
        sourceId: contexts.sourceId,
        title: contexts.title,
        content: contexts.content,
        url: contexts.url,
        metadata: contexts.metadata,
        createdAt: contexts.createdAt,
        updatedAt: contexts.updatedAt,
        relevanceScore: contexts.relevanceScore,
        relevance: relevanceCase.as('relevance')
      })
      .from(contexts)
      .where(and(...conditions))
      .orderBy(desc(sql`relevance`), desc(contexts.updatedAt))
      .limit(limitNum);

    // Helper function to highlight search terms
    const highlightText = (text: string | null, searchTerms: string[]): string => {
      if (!text || searchTerms.length === 0) return text || '';
      
      let highlighted = text;
      searchTerms.forEach(term => {
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      });
      return highlighted;
    };

    // Collect all search terms for highlighting
    const searchTerms: string[] = [];
    if (parsedQuery.text) searchTerms.push(parsedQuery.text);
    if (parsedQuery.author) searchTerms.push(parsedQuery.author);
    if (parsedQuery.repo) searchTerms.push(parsedQuery.repo);

    // Highlight matching text
    const highlightedResults = results.map(result => ({
      ...result,
      titleHighlighted: highlightText(result.title, searchTerms),
      contentHighlighted: highlightText(result.content, searchTerms)
    }));

    return res.json({
      results: highlightedResults,
      query,
      count: highlightedResults.length,
      type: parsedQuery.type,
      filters: parsedQuery.filters
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Failed to search contexts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
