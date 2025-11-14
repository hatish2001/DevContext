import { WebClient, WebClientOptions } from '@slack/web-api';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../config/database';
import { contexts, integrations } from '../models/schema';
import pLimit from 'p-limit';

interface SlackMessage {
  ts: string;
  text?: string;
  user?: string;
  thread_ts?: string;
  subtype?: string;
  files?: any[];
  reactions?: any[];
  reply_count?: number;
  reply_users_count?: number;
  permalink?: string;
}

interface SyncResult {
  messages: number;
  channels: number;
  dms: number;
  groupDms: number;
  errors: string[];
}

export class SlackService {
  private client: WebClient;
  private userId: string;
  private rateLimiter: ReturnType<typeof pLimit>;
  private retryCount = 3;
  private baseDelay = 1000; // 1 second

  constructor(userId: string, accessToken: string) {
    this.userId = userId;
    
    // Configure WebClient with better defaults
    const options: WebClientOptions = {
      token: accessToken,
      retryConfig: {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
      },
    };
    
    this.client = new WebClient(options);
    
    // Rate limiting: max 5 concurrent requests (Slack recommends 1-2 per second)
    this.rateLimiter = pLimit(5);
  }

  static async fromIntegration(userId: string): Promise<SlackService | null> {
    const db = getDb();
    const [intg] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'slack'), eq(integrations.active, true)))
      .limit(1);
    if (!intg || !intg.accessToken) return null;
    return new SlackService(userId, intg.accessToken);
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = this.retryCount,
    delay = this.baseDelay
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries === 0 || error.data?.error === 'invalid_auth') {
        throw error;
      }

      // Check for rate limit
      if (error.data?.error === 'rate_limited') {
        const retryAfter = error.data.retryAfter || delay;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.withRetry(fn, retries, delay * 2);
      }

      // Exponential backoff for other errors
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  /**
   * Convert Slack timestamp to Date
   */
  private tsToDate(ts: string): Date {
    return new Date(parseFloat(ts) * 1000);
  }

  /**
   * Check if timestamp is within daysBack
   */
  private isWithinDays(ts: string, daysBack: number): boolean {
    const messageDate = this.tsToDate(ts);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    return messageDate >= cutoffDate;
  }

  /**
   * Extract @mentions from message text
   */
  private extractMentions(text: string): string[] {
    const mentions: string[] = [];
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }

  /**
   * Get user info with caching
   */
  private userCache = new Map<string, any>();
  private async getUserInfo(userId: string): Promise<any> {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    try {
      const result = await this.rateLimiter(() =>
        this.withRetry(() => this.client.users.info({ user: userId }))
      );

      const userInfo = {
        id: result.user?.id,
        name: result.user?.name,
        real_name: result.user?.real_name,
        display_name: result.user?.profile?.display_name,
        email: result.user?.profile?.email,
        image_48: result.user?.profile?.image_48,
        image_72: result.user?.profile?.image_72,
        is_bot: result.user?.is_bot,
        timezone: result.user?.tz,
      };

      this.userCache.set(userId, userInfo);
      return userInfo;
    } catch (e) {
      return {
        id: userId,
        name: 'Unknown',
      };
    }
  }

  /**
   * Sync a single message to database
   */
  private async syncMessage(
    channel: { id: string; name: string; is_private?: boolean; is_im?: boolean; is_mpim?: boolean },
    message: SlackMessage,
    db: ReturnType<typeof getDb>
  ): Promise<void> {
    // Skip system messages and bot messages (unless they mention user)
    if (message.subtype && !['bot_message', 'thread_broadcast'].includes(message.subtype)) {
      return;
    }

    // Skip thread replies in initial sync (handled separately)
    if (message.thread_ts && message.thread_ts !== message.ts) {
      return;
    }

    const sourceId = `${channel.id}_${message.ts}`;
    
    // Get user info for author
    let userInfo: any = {};
    if (message.user) {
      userInfo = await this.getUserInfo(message.user);
    }

    // Get thread replies if exists
    let threadReplies: any[] = [];
    if (message.ts && message.reply_count && message.reply_count > 0) {
      try {
        const threadResult = await this.rateLimiter(() =>
          this.withRetry(() =>
            this.client.conversations.replies({
              channel: channel.id,
              ts: message.ts!,
            })
          )
        );
        
        threadReplies = await Promise.all(
          (threadResult.messages || []).slice(1).map(async (msg: any) => {
            let replyUserInfo: any = {};
            if (msg.user) {
              replyUserInfo = await this.getUserInfo(msg.user);
            }
            return {
              user: msg.user,
              text: msg.text,
              ts: msg.ts,
              files: msg.files || [],
              author: replyUserInfo,
            };
          })
        );
      } catch (e) {
        // Thread might not exist or no access
      }
    }

    // Get file information if any
    const files = (message.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimetype: f.mimetype,
      size: f.size,
      url_private: f.url_private,
      thumb_64: f.thumb_64,
      thumb_360: f.thumb_360,
      title: f.title,
      permalink: f.permalink,
    }));

    // Build message preview for title
    const textPreview = String(message.text || '').replace(/<[^>]+>/g, '').slice(0, 80);
    const channelType = channel.is_im ? 'DM' : channel.is_mpim ? 'Group DM' : channel.is_private ? 'Private' : '';
    const title = `Slack${channelType ? ` ${channelType}` : ''}: ${channel.name} - ${textPreview || '(No text)'}`;

    const ctx = {
      userId: this.userId,
      source: 'slack_message',
      sourceId,
      title,
      content: message.text || '',
      url: message.permalink || `slack://channel?team=${channel.id}&id=${channel.id}&message=${message.ts}`,
      metadata: {
        channel: {
          id: channel.id,
          name: channel.name,
          is_private: channel.is_private || false,
          is_im: channel.is_im || false,
          is_mpim: channel.is_mpim || false,
        },
        message: {
          ts: message.ts,
          user: message.user,
          text: message.text,
          thread_ts: message.thread_ts,
          reply_count: message.reply_count || 0,
          reply_users_count: message.reply_users_count || 0,
        },
        author: userInfo,
        files,
        threadReplies,
        reactions: message.reactions || [],
        mentions: this.extractMentions(message.text || ''),
      },
    };

    // Upsert message
    const [existing] = await db
      .select()
      .from(contexts)
      .where(
        and(
          eq(contexts.userId, this.userId),
          eq(contexts.source, 'slack_message'),
          eq(contexts.sourceId, sourceId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(contexts)
        .set({
          title: ctx.title,
          content: ctx.content,
          url: ctx.url,
          metadata: ctx.metadata,
          updatedAt: new Date(),
        })
        .where(eq(contexts.id, existing.id));
    } else {
      await db.insert(contexts).values(ctx as any);
    }
  }

  /**
   * Sync messages from a conversation
   */
  private async syncConversation(
    channel: any,
    daysBack: number,
    db: ReturnType<typeof getDb>
  ): Promise<number> {
    let count = 0;
    let cursor: string | undefined;
    const oldestTs = daysBack > 0 
      ? String(Math.floor((Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000))
      : undefined;

    try {
      do {
        const result = await this.rateLimiter(() =>
          this.withRetry(() =>
            this.client.conversations.history({
              channel: channel.id,
              limit: 100,
              cursor,
              oldest: oldestTs,
            })
          )
        );

        const messages = (result.messages || []) as SlackMessage[];
        
        // Process messages in batches
        const messagePromises = messages
          .filter(m => this.isWithinDays(m.ts, daysBack))
          .map(m => 
            this.syncMessage(channel, m, db).then(() => count++).catch(e => {
              console.error(`Error syncing message ${m.ts} in ${channel.name}:`, e);
            })
          );

        await Promise.all(messagePromises);
        
        cursor = result.response_metadata?.next_cursor;
      } while (cursor);

      return count;
    } catch (error: any) {
      if (error.data?.error === 'channel_not_found' || error.data?.error === 'not_in_channel') {
        // Channel access denied - skip silently
        return 0;
      }
      throw error;
    }
  }

  /**
   * Comprehensive sync of all Slack data
   */
  async syncAll(daysBack: number = 2): Promise<SyncResult> {
    const result: SyncResult = {
      messages: 0,
      channels: 0,
      dms: 0,
      groupDms: 0,
      errors: [],
    };

    try {
      const db = getDb();

      // Get all conversation types
      const conversationsResult = await this.rateLimiter(() =>
        this.withRetry(() =>
          this.client.conversations.list({
            types: 'public_channel,private_channel,mpim,im',
            exclude_archived: true,
            limit: 1000,
          })
        )
      );

      const conversations = (conversationsResult.channels || []) as any[];
      
      // Separate by type
      const channels = conversations.filter(c => !c.is_im && !c.is_mpim);
      const dms = conversations.filter(c => c.is_im);
      const groupDms = conversations.filter(c => c.is_mpim);

      // Sync channels
      for (const channel of channels) {
        try {
          const count = await this.syncConversation(channel, daysBack, db);
          result.messages += count;
          result.channels++;
        } catch (error: any) {
          result.errors.push(`Channel ${channel.name}: ${error.message}`);
        }
      }

      // Sync DMs
      for (const dm of dms) {
        try {
          const count = await this.syncConversation(dm, daysBack, db);
          result.messages += count;
          result.dms++;
        } catch (error: any) {
          result.errors.push(`DM ${dm.id}: ${error.message}`);
        }
      }

      // Sync Group DMs
      for (const groupDm of groupDms) {
        try {
          const count = await this.syncConversation(groupDm, daysBack, db);
          result.messages += count;
          result.groupDms++;
        } catch (error: any) {
          result.errors.push(`Group DM ${groupDm.id}: ${error.message}`);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Slack syncAll error:', error);
      throw error;
    }
  }

  /**
   * Legacy syncMessages method for backwards compatibility
   */
  async syncMessages(): Promise<number> {
    const result = await this.syncAll(2);
    return result.messages;
  }

  /**
   * Get all conversations (channels, DMs, group DMs)
   */
  async getConversations() {
    try {
      const result = await this.withRetry(() =>
        this.client.conversations.list({
          types: 'public_channel,private_channel,mpim,im',
          exclude_archived: true,
          limit: 1000,
        })
      );

      return (result.channels || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.user || 'Unknown',
        is_private: c.is_private || false,
        is_archived: c.is_archived || false,
        is_im: c.is_im || false,
        is_mpim: c.is_mpim || false,
        member_count: c.num_members || 0,
        purpose: c.purpose?.value || '',
        topic: c.topic?.value || '',
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Search messages using Slack search API
   */
  async searchMessages(query: string, count = 50) {
    try {
      const result = await this.withRetry(() =>
        this.client.search.messages({
          query,
          sort: 'timestamp',
          count,
        })
      );

      return {
        query,
        total: result.messages?.total || 0,
        messages: (result.messages?.matches || []).map((m: any) => ({
          text: m.text,
          user: m.user,
          ts: m.ts,
          channel: m.channel,
          permalink: m.permalink,
        })),
      };
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Get full message with thread context
   */
  async getMessageFull(channelId: string, messageTs: string) {
    try {
      // Get the main message
      const historyResult = await this.withRetry(() =>
        this.client.conversations.history({
          channel: channelId,
          latest: messageTs,
          inclusive: true,
          limit: 1,
        })
      );

      const message = (historyResult.messages || [])[0] as SlackMessage;
      if (!message) return null;

      // Get thread replies
      let threadReplies: any[] = [];
      if (message.thread_ts || message.ts) {
        const threadTs = message.thread_ts || message.ts;
        const threadResult = await this.withRetry(() =>
          this.client.conversations.replies({
            channel: channelId,
            ts: threadTs!,
          })
        );
        
        threadReplies = await Promise.all(
          (threadResult.messages || []).slice(1).map(async (msg: any) => {
            let userInfo: any = {};
            if (msg.user) {
              userInfo = await this.getUserInfo(msg.user);
            }
            return {
              user: msg.user,
              text: msg.text,
              ts: msg.ts,
              files: msg.files || [],
              author: userInfo,
            };
          })
        );
      }

      // Get files
      const files = (message.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mimetype: f.mimetype,
        size: f.size,
        url_private: f.url_private,
        thumb_64: f.thumb_64,
        thumb_360: f.thumb_360,
        title: f.title,
        permalink: f.permalink,
      }));

      // Get author info
      let authorInfo: any = {};
      if (message.user) {
        authorInfo = await this.getUserInfo(message.user);
      }

      return {
        ts: message.ts,
        text: message.text,
        user: message.user,
        author: authorInfo,
        channel: channelId,
        thread_ts: message.thread_ts,
        files,
        threadReplies,
        reactions: message.reactions || [],
        mentions: this.extractMentions(message.text || ''),
        permalink: message.permalink,
      };
    } catch (e) {
      console.error('Error fetching full Slack message:', e);
      throw e;
    }
  }

  /**
   * Post a message to a channel
   */
  async postMessage(channelId: string, text: string, threadTs?: string) {
    try {
      const result = await this.withRetry(() =>
        this.client.chat.postMessage({
          channel: channelId,
          text,
          thread_ts: threadTs,
        })
      );
      return result;
    } catch (e) {
      console.error('Error posting Slack message:', e);
      throw e;
    }
  }

  /**
   * Send a reply to a message or thread
   */
  async replyToMessage(channelId: string, threadTs: string, text: string) {
    return this.postMessage(channelId, text, threadTs);
  }

  /**
   * Send a direct message
   */
  async sendDM(userId: string, text: string) {
    try {
      // Open DM channel
      const conversationResult = await this.withRetry(() =>
        this.client.conversations.open({
          users: userId,
        })
      );

      if (!conversationResult.channel?.id) {
        throw new Error('Failed to open DM channel');
      }

      // Send message
      const result = await this.postMessage(conversationResult.channel.id, text);
      return result;
    } catch (e) {
      console.error('Error sending Slack DM:', e);
      throw e;
    }
  }
}
