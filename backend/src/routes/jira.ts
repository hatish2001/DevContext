import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { getDb } from '../config/database';
import { integrations } from '../models/schema';
import { and, eq } from 'drizzle-orm';
import { JiraService } from '../services/jiraService';

const router = Router();
const oauthStates = new Map<string, string>();

router.get('/auth/jira', async (req, res) => {
  const userId = (req.query.userId as string) || '';
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, userId);

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.JIRA_CLIENT_ID || '',
    scope: 'read:jira-work write:jira-work read:jira-user offline_access',
    redirect_uri: `${process.env.BACKEND_URL}/api/jira/auth/callback`,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  const url = `https://auth.atlassian.com/authorize?${params.toString()}`;
  return res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) return res.redirect(`${process.env.FRONTEND_URL}/?jira=error`);

  const userId = oauthStates.get(state);
  oauthStates.delete(state);
  if (!userId) return res.redirect(`${process.env.FRONTEND_URL}/?jira=error`);

  try {
    // Exchange code for token
    const tokenResp = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.BACKEND_URL}/api/jira/auth/callback`,
    });

    const { access_token, refresh_token, expires_in } = tokenResp.data as {
      access_token: string; refresh_token: string; expires_in: number;
    };

    // Get accessible sites
    const sitesResp = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const sites = sitesResp.data as Array<{ id: string; name: string; url: string }>;
    if (!sites.length) return res.redirect(`${process.env.FRONTEND_URL}/?jira=error`);
    const site = sites[0];

    // Basic user info (optional)
    const meResp = await axios.get(`https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/myself`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const me = meResp.data as any;

    // Upsert integration
    const db = getDb();
    const [existing] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'jira')))
      .limit(1);

    if (existing) {
      await db.update(integrations)
        .set({
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          workspaceId: site.id,
          metadata: {
            ...(existing.metadata as any || {}),
            site,
            user: { accountId: me.accountId, displayName: me.displayName, email: me.emailAddress },
          },
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
    } else {
      await db.insert(integrations).values({
        userId,
        service: 'jira',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        workspaceId: site.id,
        metadata: {
          site,
          user: { accountId: me.accountId, displayName: me.displayName, email: me.emailAddress },
        },
        active: true,
      });
    }

    return res.redirect(`${process.env.FRONTEND_URL}/?jira=connected`);
  } catch (e) {
    console.error('Jira OAuth callback error:', e);
    return res.redirect(`${process.env.FRONTEND_URL}/?jira=error`);
  }
});

export default router;

// Sync endpoint
router.post('/sync', async (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const svc = await JiraService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Jira not connected' });
    const issues = await svc.syncIssues();
    return res.json({ issues });
  } catch (e) {
    console.error('Jira sync error:', e);
    return res.status(500).json({ error: 'Failed to sync Jira' });
  }
});

// Get full issue details
router.get('/issues/:issueKey', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    
    const svc = await JiraService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Jira not connected' });
    
    const issue = await svc.getIssueFull(issueKey);
    return res.json(issue);
  } catch (e: any) {
    console.error('Error fetching Jira issue:', e);
    return res.status(500).json({ error: e.message || 'Failed to fetch issue' });
  }
});

// Add comment to issue
router.post('/issues/:issueKey/comment', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { userId, body } = req.body;
    if (!userId || !body) return res.status(400).json({ error: 'Missing userId or body' });
    
    const svc = await JiraService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Jira not connected' });
    
    const comment = await svc.addComment(issueKey, body);
    return res.json(comment);
  } catch (e: any) {
    console.error('Error adding Jira comment:', e);
    const status = e.response?.status || 500;
    const errorMsg = e.response?.data?.message || e.message || 'Failed to add comment';
    
    // Check if it's a scope error
    if (status === 401 && errorMsg.includes('scope')) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Please reconnect your Jira integration to grant write permissions.',
        code: 'INSUFFICIENT_SCOPES',
        requiresReconnect: true
      });
    }
    
    return res.status(status).json({ error: errorMsg });
  }
});

// Update issue status
router.post('/issues/:issueKey/status', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { userId, statusId, transitionId } = req.body;
    if (!userId || !statusId) return res.status(400).json({ error: 'Missing userId or statusId' });
    
    const svc = await JiraService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Jira not connected' });
    
    await svc.updateStatus(issueKey, statusId, transitionId);
    return res.json({ success: true });
  } catch (e: any) {
    console.error('Error updating Jira status:', e);
    const status = e.response?.status || 500;
    const errorMsg = e.response?.data?.message || e.message || 'Failed to update status';
    
    // Check if it's a scope error
    if (status === 401 && errorMsg.includes('scope')) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Please reconnect your Jira integration to grant write permissions.',
        code: 'INSUFFICIENT_SCOPES',
        requiresReconnect: true
      });
    }
    
    return res.status(status).json({ error: errorMsg });
  }
});

// Assign issue
router.post('/issues/:issueKey/assign', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { userId, accountId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    
    const svc = await JiraService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Jira not connected' });
    
    await svc.assignIssue(issueKey, accountId || null);
    return res.json({ success: true });
  } catch (e: any) {
    console.error('Error assigning Jira issue:', e);
    const status = e.response?.status || 500;
    const errorMsg = e.response?.data?.message || e.message || 'Failed to assign issue';
    
    // Check if it's a scope error
    if (status === 401 && errorMsg.includes('scope')) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Please reconnect your Jira integration to grant write permissions.',
        code: 'INSUFFICIENT_SCOPES',
        requiresReconnect: true
      });
    }
    
    return res.status(status).json({ error: errorMsg });
  }
});

// Update issue fields (story points, labels, etc.)
router.put('/issues/:issueKey/fields', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { userId, fields } = req.body;
    if (!userId || !fields) return res.status(400).json({ error: 'Missing userId or fields' });
    
    const svc = await JiraService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Jira not connected' });
    
    await svc.updateFields(issueKey, fields);
    return res.json({ success: true });
  } catch (e: any) {
    console.error('Error updating Jira fields:', e);
    const status = e.response?.status || 500;
    const errorMsg = e.response?.data?.message || e.message || 'Failed to update fields';
    
    // Check if it's a scope error
    if (status === 401 && errorMsg.includes('scope')) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Please reconnect your Jira integration to grant write permissions.',
        code: 'INSUFFICIENT_SCOPES',
        requiresReconnect: true
      });
    }
    
    return res.status(status).json({ error: errorMsg });
  }
});


