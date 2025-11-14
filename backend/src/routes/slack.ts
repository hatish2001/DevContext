import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { getDb } from '../config/database';
import { integrations, users } from '../models/schema';
import { and, eq } from 'drizzle-orm';
import { SlackService } from '../services/slackService';

/**
 * Verify Slack request signature for security
 */
function verifySlackSignature(
  timestamp: string,
  body: string,
  signature: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.warn('SLACK_SIGNING_SECRET not set - skipping signature verification');
    return true; // Allow in development
  }

  const hmac = crypto.createHmac('sha256', signingSecret);
  const [version, hash] = signature.split('=');
  const baseString = `${version}:${timestamp}:${body}`;
  hmac.update(baseString);
  const expectedSignature = hmac.digest('hex');

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedSignature)
  );
}

const router = Router();

// Store OAuth states temporarily (in production, use Redis)
const oauthStates = new Map<string, { userId: string; timestamp: number }>();

// Clean up old states (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) {
      oauthStates.delete(state);
    }
  }
}, 60 * 1000); // Run cleanup every minute

router.get('/auth/slack', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || '';
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Generate secure state token
  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, { userId, timestamp: Date.now() });

  // Comprehensive scopes as per documentation
  const botScopes = [
    'channels:history',
    'channels:read',
    'groups:history',
    'groups:read',
    'im:history',
    'im:read',
    'mpim:history',
    'mpim:read',
    'chat:write',
    'chat:write.customize',
    'chat:write.public',
    'files:read',
    'files:write',
    'users:read',
    'users:read.email',
    'users.profile:read',
    'team:read',
    'reactions:read',
    'reactions:write',
    'links:read',
    'links:write',
    'search:read',
  ].join(',');

  // Optional user scopes
  const userScopes = [
    'search:read',
    'identify',
  ].join(',');

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID || '',
    scope: botScopes,
    user_scope: userScopes,
    redirect_uri: `${process.env.BACKEND_URL}/api/slack/auth/callback`,
    state,
  });

  return res.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
});

router.get('/auth/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };
  
  if (!code || !state) {
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?slack=error`);
  }

  // Validate state token
  const stateData = oauthStates.get(state);
  if (!stateData) {
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?slack=error&reason=invalid_state`);
  }
  
  // Clean up used state
  oauthStates.delete(state);
  
  const userId = stateData.userId;

  try {
    const tokenResp = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        code,
        redirect_uri: `${process.env.BACKEND_URL}/api/slack/auth/callback`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const data = tokenResp.data as any;
    if (!data.ok) {
      throw new Error(data.error || 'Slack OAuth failed');
    }

    const accessToken = data.access_token as string;
    const botToken = data.access_token; // Bot user OAuth token
    const userToken = data.authed_user?.access_token; // User token (if user scopes requested)
    
    const db = getDb();
    const [existing] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'slack')))
      .limit(1);

    const metadata = {
      team: {
        id: data.team?.id,
        name: data.team?.name,
      },
      bot_user_id: data.bot_user_id,
      bot_token: botToken,
      user_token: userToken,
      scope: data.scope,
      authed_user: data.authed_user,
      token_type: data.token_type,
      installed_date: new Date().toISOString(),
    };

    if (existing) {
      await db
        .update(integrations)
        .set({
          accessToken: botToken,
          workspaceId: data.team?.id,
          serviceUserId: data.bot_user_id,
          metadata,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
    } else {
      await db.insert(integrations).values({
        userId,
        service: 'slack',
        accessToken: botToken,
        workspaceId: data.team?.id,
        serviceUserId: data.bot_user_id,
        metadata,
        active: true,
      });
    }

    // Update user's last sync timestamp
    await db
      .update(users)
      .set({ lastActive: new Date() })
      .where(eq(users.id, userId));

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (e: any) {
    console.error('Slack OAuth callback error:', e);
    const errorMsg = e.response?.data?.error || e.message || 'Unknown error';
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?slack=error&reason=${encodeURIComponent(errorMsg)}`);
  }
});

/**
 * POST /api/slack/events
 * Event Subscriptions endpoint for Slack Events API
 * Handles URL verification and event processing
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    // Verify request signature
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    
    if (!signature || !timestamp) {
      return res.status(401).send('Missing signature or timestamp');
    }

    // Check timestamp (prevent replay attacks - must be within 5 minutes)
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - requestTime) > 300) {
      return res.status(401).send('Request timestamp too old');
    }

    // Verify signature using raw body
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    if (!verifySlackSignature(timestamp, rawBody, signature)) {
      return res.status(401).send('Invalid signature');
    }

    const { type, challenge, event, team_id } = req.body;

    // URL verification challenge
    if (type === 'url_verification') {
      return res.json({ challenge });
    }

    // Handle event callbacks
    if (type === 'event_callback' && event) {
      // Acknowledge receipt immediately
      res.status(200).send('OK');

      // Process event asynchronously
      setImmediate(async () => {
        try {
          // Find integration by workspace ID
          const db = getDb();
          const [integration] = await db
            .select()
            .from(integrations)
            .where(and(eq(integrations.workspaceId, team_id), eq(integrations.service, 'slack')))
            .limit(1);

          if (!integration || !integration.accessToken) {
            console.error(`No integration found for workspace ${team_id}`);
            return;
          }

          // Process different event types
          const eventType = event.type;
          
          switch (eventType) {
            case 'message':
              // Handle message events
              if (event.subtype && ['message_changed', 'message_deleted'].includes(event.subtype)) {
                // Handle message updates/deletions
                console.log(`Message ${event.subtype} in channel ${event.channel}`);
              } else if (!event.subtype || event.subtype === 'bot_message') {
                // Handle new messages
                console.log(`New message in channel ${event.channel}`);
              }
              break;
            
            case 'reaction_added':
            case 'reaction_removed':
              console.log(`Reaction ${eventType} in channel ${event.item?.channel}`);
              break;
            
            case 'file_shared':
              console.log(`File shared: ${event.file_id}`);
              break;
            
            default:
              console.log(`Unhandled event type: ${eventType}`);
          }

          // Optional: Trigger incremental sync for relevant events
          // await SlackService.fromIntegration(integration.userId)?.syncMessages();
        } catch (error) {
          console.error('Error processing Slack event:', error);
        }
      });

      return; // Response already sent
    }

    // Default response
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Slack events endpoint error:', error);
    return res.status(500).send('Error');
  }
});

/**
 * POST /api/slack/sync
 * Full synchronization of Slack messages
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { userId, daysBack = 2 } = req.body as { userId?: string; daysBack?: number };
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    
    const svc = await SlackService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Slack not connected' });
    
    const result = await svc.syncAll(daysBack);
    return res.json(result);
  } catch (e: any) {
    console.error('Slack sync error:', e);
    return res.status(500).json({ 
      error: 'Failed to sync Slack messages',
      message: e.message 
    });
  }
});

/**
 * GET /api/slack/channels
 * Get list of channels/conversations
 */
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    
    const svc = await SlackService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Slack not connected' });
    
    const channels = await svc.getConversations();
    return res.json({ channels });
  } catch (e: any) {
    console.error('Error fetching Slack channels:', e);
    return res.status(500).json({ error: e.message || 'Failed to fetch channels' });
  }
});

/**
 * GET /api/slack/search
 * Search messages in workspace
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const query = req.query.query as string;
    if (!userId || !query) {
      return res.status(400).json({ error: 'Missing userId or query' });
    }
    
    const svc = await SlackService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Slack not connected' });
    
    const results = await svc.searchMessages(query);
    return res.json(results);
  } catch (e: any) {
    console.error('Error searching Slack messages:', e);
    return res.status(500).json({ error: e.message || 'Failed to search messages' });
  }
});

/**
 * GET /api/slack/messages/:channelId/:messageTs
 * Get full message with thread
 */
router.get('/messages/:channelId/:messageTs', async (req: Request, res: Response) => {
  try {
    const { channelId, messageTs } = req.params;
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    
    const svc = await SlackService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Slack not connected' });
    
    const message = await svc.getMessageFull(channelId, messageTs);
    return res.json(message);
  } catch (e: any) {
    console.error('Error fetching Slack message:', e);
    return res.status(500).json({ error: e.message || 'Failed to fetch message' });
  }
});

/**
 * POST /api/slack/messages/:channelId/:threadTs/reply
 * Reply to message/thread
 */
router.post('/messages/:channelId/:threadTs/reply', async (req: Request, res: Response) => {
  try {
    const { channelId, threadTs } = req.params;
    const { userId, text } = req.body;
    if (!userId || !text) return res.status(400).json({ error: 'Missing userId or text' });
    
    const svc = await SlackService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Slack not connected' });
    
    const result = await svc.replyToMessage(channelId, threadTs, text);
    return res.json(result);
  } catch (e: any) {
    console.error('Error replying to Slack message:', e);
    return res.status(500).json({ error: e.message || 'Failed to send reply' });
  }
});

/**
 * POST /api/slack/post
 * Post a message to a channel
 */
router.post('/post', async (req: Request, res: Response) => {
  try {
    const { userId, channelId, text, threadTs } = req.body;
    if (!userId || !channelId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const svc = await SlackService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Slack not connected' });
    
    const result = await svc.postMessage(channelId, text, threadTs);
    return res.json(result);
  } catch (e: any) {
    console.error('Error posting Slack message:', e);
    return res.status(500).json({ error: e.message || 'Failed to post message' });
  }
});

/**
 * POST /api/slack/dm
 * Send DM
 */
router.post('/dm', async (req: Request, res: Response) => {
  try {
    const { userId, targetUserId, text } = req.body;
    if (!userId || !targetUserId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const svc = await SlackService.fromIntegration(userId);
    if (!svc) return res.status(400).json({ error: 'Slack not connected' });
    
    const result = await svc.sendDM(targetUserId, text);
    return res.json(result);
  } catch (e: any) {
    console.error('Error sending Slack DM:', e);
    return res.status(500).json({ error: e.message || 'Failed to send DM' });
  }
});

export default router;



