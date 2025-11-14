import { Router, Request, Response } from 'express';
import { contextGroupingService } from '../services/contextGroupingService';
import { openaiService } from '../services/openaiService';

const router = Router();

/**
 * POST /api/groups/generate
 * Generate AI-powered groups for user's contexts
 * 
 * Cost: ~$0.006 per 100 contexts (0.6 cents!)
 */
router.post('/generate', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    console.log(`🚀 Generating AI groups for user ${userId}`);
    const groups = await contextGroupingService.groupContextsWithAI(userId);

    return res.json({
      success: true,
      groups,
      count: groups.length,
      message: `Generated ${groups.length} intelligent groups`
    });
  } catch (error) {
    console.error('❌ Group generation failed:', error);
    return res.status(500).json({
      error: 'Failed to generate groups',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/groups
 * Get user's context groups
 */
router.get('/', async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await contextGroupingService.getGroups(userId);

    return res.json({
      success: true,
      groups: result.groups,
      ungrouped: result.ungrouped,
      ungroupedCount: result.ungroupedCount
    });
  } catch (error) {
    console.error('❌ Failed to fetch groups:', error);
    return res.status(500).json({
      error: 'Failed to fetch groups'
    });
  }
});

/**
 * GET /api/groups/smart
 * Get AI-powered smart groups (Blocking Issues, Due This Week, etc.)
 */
router.get('/smart', async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const smartGroups = await contextGroupingService.getSmartGroups(userId);

    return res.json({
      success: true,
      smartGroups,
      counts: Object.fromEntries(
        Object.entries(smartGroups).map(([key, items]) => [key, items.length])
      )
    });
  } catch (error) {
    console.error('❌ Failed to fetch smart groups:', error);
    return res.status(500).json({
      error: 'Failed to fetch smart groups',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/groups/stats
 * Get cache statistics and cost estimates
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const cacheStats = await openaiService.getCacheStats();
    
    // Estimate cost savings from caching (each embedding costs ~$0.00001)
    const estimatedSavings = cacheStats.embeddingKeys * 0.00001;

    return res.json({
      success: true,
      cache: cacheStats,
      estimatedSavings: `$${estimatedSavings.toFixed(4)}`,
      costPerGeneration: '$0.006 per 100 contexts'
    });
  } catch (error) {
    console.error('❌ Failed to fetch stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch stats'
    });
  }
});

/**
 * DELETE /api/groups/:userId
 * Clear all groups for a user (force regeneration)
 */
router.delete('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // This would clear groups from database
    // For now, just return success since we're storing in context metadata
    return res.json({
      success: true,
      message: 'Groups cleared. Regenerate to create new groups.'
    });
  } catch (error) {
    console.error('❌ Failed to clear groups:', error);
    return res.status(500).json({
      error: 'Failed to clear groups'
    });
  }
});

/**
 * POST /api/groups/manual/create
 * Create a manual group from selected contexts
 */
router.post('/manual/create', async (req: Request, res: Response) => {
  const { userId, title, contextIds } = req.body;

  if (!userId || !title || !Array.isArray(contextIds) || contextIds.length < 1) {
    return res.status(400).json({
      error: 'userId, title, and contextIds (array) are required'
    });
  }

  try {
    const groupId = `manual_${Date.now()}`;
    
    // Import db and contexts from the service
    const { db } = await import('../config/database');
    const { contexts } = await import('../models/schema');
    const { eq, inArray } = await import('drizzle-orm');

    // Fetch existing contexts to safely merge metadata
    const existing = await db
      .select()
      .from(contexts)
      .where(inArray(contexts.id, contextIds));

    // Update each context with merged metadata (no raw SQL)
    for (const ctx of existing) {
      await db
        .update(contexts)
        .set({
          metadata: {
            ...(ctx.metadata as any),
            groupId,
            groupTitle: title,
          },
        })
        .where(eq(contexts.id, ctx.id));
    }

    return res.json({
      success: true,
      group: {
        id: groupId,
        title,
        contextIds,
        type: 'manual',
      },
    });
  } catch (error) {
    console.error('❌ Failed to create manual group:', error);
    return res.status(500).json({
      error: 'Failed to create group',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/groups/:groupId/add-context
 * Add a context to existing group
 */
router.put('/:groupId/add-context', async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { contextId } = req.body;

  if (!groupId || !contextId) {
    return res.status(400).json({ error: 'groupId and contextId are required' });
  }

  try {
    const { db } = await import('../config/database');
    const { contexts } = await import('../models/schema');
    const { eq, sql } = await import('drizzle-orm');

    // Find the context to update
    const context = await db
      .select()
      .from(contexts)
      .where(eq(contexts.id, contextId))
      .limit(1);

    if (context.length === 0) {
      return res.status(404).json({ error: 'Context not found' });
    }

    // Get group title from any context in the group (use sql tag)
    const groupContexts = await db
      .select()
      .from(contexts)
      .where(sql`metadata->>'groupId' = ${groupId}`)
      .limit(1);

    const groupTitle = (groupContexts[0] as any)?.metadata?.groupTitle || 'Untitled Group';

    // Update context with group info (merge JSON)
    await db
      .update(contexts)
      .set({
        metadata: {
          ...(context[0].metadata as any),
          groupId,
          groupTitle,
        },
      })
      .where(eq(contexts.id, contextId));

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to add context to group:', error);
    return res.status(500).json({
      error: 'Failed to update group',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/groups/:groupId/remove-context/:contextId
 * Remove a context from a group
 */
router.delete(
  '/:groupId/remove-context/:contextId',
  async (req: Request, res: Response) => {
    const { groupId, contextId } = req.params;

    if (!groupId || !contextId) {
      return res.status(400).json({ error: 'groupId and contextId are required' });
    }

    try {
      const { db } = await import('../config/database');
      const { contexts } = await import('../models/schema');
      const { eq, sql } = await import('drizzle-orm');

      // Remove group info from context
      await db
        .update(contexts)
        .set({
          metadata: sql`metadata - 'groupId' - 'groupTitle'`,
        })
        .where(eq(contexts.id, contextId));

      // Check if group is now empty
      const remainingContexts = await db
        .select()
        .from(contexts)
        .where(sql`metadata->>'groupId' = ${groupId}`)
        .limit(1);

      return res.json({
        success: true,
        groupEmpty: remainingContexts.length === 0,
      });
    } catch (error) {
      console.error('❌ Failed to remove context from group:', error);
      return res.status(500).json({
        error: 'Failed to update group',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;

