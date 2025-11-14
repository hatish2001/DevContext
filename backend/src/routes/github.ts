import { Router } from 'express';
import { getDb } from '../config/database';
import { integrations } from '../models/schema';
import { and, eq } from 'drizzle-orm';
import { GitHubService } from '../services/githubService';

const router = Router();

// Get full PR details
router.get('/pr/:owner/:repo/:prNumber', async (req, res) => {
  try {
    const { owner, repo, prNumber } = req.params;
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const db = getDb();
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'github'), eq(integrations.active, true)))
      .limit(1);

    if (!integration || !integration.accessToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const githubService = new GitHubService(userId, integration.accessToken);
    const pr = await githubService.getPullRequestFull(owner, repo, parseInt(prNumber));

    return res.json(pr);
  } catch (e: any) {
    console.error('Error fetching PR details:', e);
    return res.status(500).json({ error: e.message || 'Failed to fetch PR' });
  }
});

// Create PR review
router.post('/pr/:owner/:repo/:prNumber/review', async (req, res) => {
  try {
    const { owner, repo, prNumber } = req.params;
    const { userId, event, body } = req.body;
    if (!userId || !event) return res.status(400).json({ error: 'Missing userId or event' });

    const db = getDb();
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'github'), eq(integrations.active, true)))
      .limit(1);

    if (!integration || !integration.accessToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const githubService = new GitHubService(userId, integration.accessToken);
    const review = await githubService.createReview(owner, repo, parseInt(prNumber), event, body);

    return res.json(review);
  } catch (e: any) {
    console.error('Error creating PR review:', e);
    return res.status(500).json({ error: e.message || 'Failed to create review' });
  }
});

// Add review comment
router.post('/pr/:owner/:repo/:prNumber/comment', async (req, res) => {
  try {
    const { owner, repo, prNumber } = req.params;
    const { userId, body, commitId, path, line, side } = req.body;
    if (!userId || !body || !commitId || !path || !line) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDb();
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'github'), eq(integrations.active, true)))
      .limit(1);

    if (!integration || !integration.accessToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const githubService = new GitHubService(userId, integration.accessToken);
    const comment = await githubService.createReviewComment(
      owner,
      repo,
      parseInt(prNumber),
      body,
      commitId,
      path,
      line,
      side || 'RIGHT'
    );

    return res.json(comment);
  } catch (e: any) {
    console.error('Error adding review comment:', e);
    return res.status(500).json({ error: e.message || 'Failed to add comment' });
  }
});

// Merge PR
router.post('/pr/:owner/:repo/:prNumber/merge', async (req, res) => {
  try {
    const { owner, repo, prNumber } = req.params;
    const { userId, mergeMethod, commitTitle } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const db = getDb();
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'github'), eq(integrations.active, true)))
      .limit(1);

    if (!integration || !integration.accessToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const githubService = new GitHubService(userId, integration.accessToken);
    const result = await githubService.mergePullRequest(owner, repo, parseInt(prNumber), mergeMethod || 'merge', commitTitle);

    return res.json(result);
  } catch (e: any) {
    console.error('Error merging PR:', e);
    return res.status(500).json({ error: e.message || 'Failed to merge PR' });
  }
});

export default router;

