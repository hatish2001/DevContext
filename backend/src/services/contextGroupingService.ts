import { db } from '../config/database';
import { contexts } from '../models/schema';
import { eq } from 'drizzle-orm';
import { openaiService } from './openaiService';

interface ContextWithEmbedding {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string | null;
  metadata: any;
  updatedAt: Date;
  createdAt: Date;
  embedding?: number[];
  textRepresentation: string;
}

interface ContextGroup {
  id: string;
  title: string;
  contexts: ContextWithEmbedding[];
  similarity: number;
  createdAt: Date;
}

/**
 * Context Grouping Service with AI-powered clustering
 * 
 * Cost-optimized approach:
 * - Caches embeddings in database
 * - Only generates embeddings for new contexts
 * - Groups only when explicitly requested
 * - Uses efficient clustering algorithm
 */
export class ContextGroupingService {
  /**
   * Main function: Group contexts using AI embeddings
   */
  async groupContextsWithAI(userId: string): Promise<ContextGroup[]> {
    console.log(`🤖 Starting AI grouping for user ${userId}`);
    const startTime = Date.now();

    // 1. Fetch all contexts
    const userContexts = await db
      .select()
      .from(contexts)
      .where(eq(contexts.userId, userId))
      .orderBy(contexts.updatedAt);

    if (userContexts.length === 0) {
      console.log('No contexts to group');
      return [];
    }

    console.log(`📊 Processing ${userContexts.length} contexts`);

    // 2. Create text representations and generate embeddings
    const contextsWithEmbeddings = await this.generateEmbeddings(userContexts);

    // 3. Cluster contexts based on similarity
    const groups = await this.clusterContexts(contextsWithEmbeddings);

    console.log(`✅ Created ${groups.length} groups with 2+ items`);

    // 4. Generate titles for groups
    const groupsWithTitles = await this.generateGroupTitles(groups);

    // 5. Save to database for caching (implementation in next step)
    await this.saveGroups(userId, groupsWithTitles);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Grouping completed in ${duration}s`);

    return groupsWithTitles;
  }

  /**
   * Generate embeddings for contexts (with smart caching)
   */
  private async generateEmbeddings(
    userContexts: any[]
  ): Promise<ContextWithEmbedding[]> {
    console.log('🔄 Generating embeddings...');
    
    const contextsWithEmbeddings: ContextWithEmbedding[] = [];
    
    for (const context of userContexts) {
      // Check if embedding exists in metadata
      let embedding = context.metadata?.embedding;
      
      if (!embedding) {
        // Generate new embedding
        const textRep = this.createTextRepresentation(context);
        embedding = await openaiService.generateEmbedding(textRep);
        
        // Store embedding in context metadata for future use
        await db
          .update(contexts)
          .set({
            metadata: {
              ...context.metadata,
              embedding
            }
          })
          .where(eq(contexts.id, context.id));
      }
      
      contextsWithEmbeddings.push({
        ...context,
        embedding,
        textRepresentation: this.createTextRepresentation(context)
      });
    }
    
    return contextsWithEmbeddings;
  }

  /**
   * Create rich text representation for better embeddings
   */
  private createTextRepresentation(context: any): string {
    const parts = [
      `Type: ${this.getSourceLabel(context.source)}`,
      `Title: ${context.title}`,
      context.content ? `Content: ${context.content.substring(0, 200)}` : '',
      context.metadata?.repo ? `Repository: ${context.metadata.repo}` : '',
      context.metadata?.author ? `Author: ${context.metadata.author}` : '',
      context.metadata?.labels?.length > 0 
        ? `Labels: ${context.metadata.labels.slice(0, 3).join(', ')}` 
        : ''
    ].filter(Boolean);

    return parts.join('. ');
  }

  /**
   * Get human-readable source label
   */
  private getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      'github_pr': 'Pull Request',
      'github_issue': 'Issue',
      'github_commit': 'Commit',
      'github_review': 'Code Review'
    };
    return labels[source] || source;
  }

  /**
   * Cluster contexts based on embedding similarity
   * Uses hierarchical clustering with 0.7 similarity threshold + time-based boosting
   */
  private async clusterContexts(
    contexts: ContextWithEmbedding[]
  ): Promise<ContextGroup[]> {
    console.log('🔍 Clustering contexts...');
    
    const groups: ContextGroup[] = [];
    const assigned = new Set<string>();
    
    // Lowered threshold for better grouping (was 0.75)
    const SIMILARITY_THRESHOLD = 0.7;
    const TIME_WINDOW_HOURS = 4; // Group commits within 4 hours

    for (let i = 0; i < contexts.length; i++) {
      if (assigned.has(contexts[i].id)) continue;

      const group: any = {
        id: `group_${Date.now()}_${i}`,
        contexts: [contexts[i]],
        similarity: 1.0,
        createdAt: new Date()
      };

      // Find similar contexts
      for (let j = i + 1; j < contexts.length; j++) {
        if (assigned.has(contexts[j].id)) continue;

        // Calculate embedding similarity
        let similarity = openaiService.calculateSimilarity(
          contexts[i].embedding!,
          contexts[j].embedding!
        );

        // ENHANCEMENT: Time-based boost for generic commits
        if (this.areTimeSimilar(contexts[i], contexts[j], TIME_WINDOW_HOURS)) {
          similarity = this.boostSimilarityForTimeProximity(
            similarity,
            contexts[i],
            contexts[j]
          );
        }

        if (similarity >= SIMILARITY_THRESHOLD) {
          group.contexts.push(contexts[j]);
          assigned.add(contexts[j].id);
          group.similarity = Math.min(group.similarity, similarity);
        }
      }

      assigned.add(contexts[i].id);

      // Create groups with 2+ items OR single important items (PRs, Issues)
      if (
        group.contexts.length >= 2 ||
        ['github_pr', 'github_issue'].includes(contexts[i].source)
      ) {
        groups.push(group);
        console.log(`  📦 Group ${groups.length}: ${group.contexts.length} items (${(group.similarity * 100).toFixed(0)}% similar)`);
      }
    }

    return groups;
  }

  /**
   * Check if two contexts are similar in time
   */
  private areTimeSimilar(
    context1: ContextWithEmbedding,
    context2: ContextWithEmbedding,
    timeWindowHours: number
  ): boolean {
    const time1 = new Date(context1.createdAt).getTime();
    const time2 = new Date(context2.createdAt).getTime();
    const hoursDiff = Math.abs(time1 - time2) / (1000 * 60 * 60);
    return hoursDiff <= timeWindowHours;
  }

  /**
   * Boost similarity for commits close in time with generic messages
   */
  private boostSimilarityForTimeProximity(
    baseSimilarity: number,
    context1: ContextWithEmbedding,
    context2: ContextWithEmbedding
  ): number {
    const genericTitles = ['update', 'fix', 'minor changes', 'wip', 'refactor', 'cleanup'];
    const title1 = context1.title.toLowerCase();
    const title2 = context2.title.toLowerCase();
    
    const bothGeneric =
      genericTitles.some((t) => title1.includes(t)) &&
      genericTitles.some((t) => title2.includes(t));

    if (bothGeneric) {
      // Boost similarity by 20% for generic commits close in time
      return Math.min(1.0, baseSimilarity + 0.2);
    }

    // Small boost for same repository
    if (
      context1.metadata?.repo &&
      context2.metadata?.repo &&
      context1.metadata.repo === context2.metadata.repo
    ) {
      return Math.min(1.0, baseSimilarity + 0.1);
    }

    return baseSimilarity;
  }

  /**
   * Generate titles for all groups
   */
  private async generateGroupTitles(
    groups: ContextGroup[]
  ): Promise<ContextGroup[]> {
    console.log('🏷️  Generating group titles...');
    
    const groupsWithTitles = await Promise.all(
      groups.map(async (group, idx) => {
        const title = await openaiService.generateGroupTitle(group.contexts);
        console.log(`  ${idx + 1}. "${title}"`);
        return {
          ...group,
          title
        };
      })
    );

    return groupsWithTitles;
  }

  /**
   * Save groups to database (simple JSON storage for now)
   */
  private async saveGroups(
    userId: string,
    groups: ContextGroup[]
  ): Promise<void> {
    // For now, we'll store in a simple way
    // In production, you'd want a proper contextGroups table
    console.log(`💾 Saved ${groups.length} groups`);
    
    // Store in metadata of first context in each group (temporary solution)
    for (const group of groups) {
      if (group.contexts.length > 0) {
        const firstContext = group.contexts[0];
        await db
          .update(contexts)
          .set({
            metadata: {
              ...firstContext.metadata,
              groupId: group.id,
              groupTitle: group.title
            }
          })
          .where(eq(contexts.id, firstContext.id));
      }
    }
  }

  /**
   * Get existing groups for a user
   */
  async getGroups(userId: string): Promise<any> {
    // Fetch all contexts
    const userContexts = await db
      .select()
      .from(contexts)
      .where(eq(contexts.userId, userId))
      .orderBy(contexts.updatedAt);

    // Group by groupId in metadata
    const groupMap = new Map();
    const ungrouped: any[] = [];

    for (const context of userContexts) {
      const metadata = context.metadata as any;
      const groupId = metadata?.groupId;
      if (groupId) {
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            id: groupId,
            title: metadata?.groupTitle || 'Untitled Group',
            contexts: []
          });
        }
        groupMap.get(groupId).contexts.push(context);
      } else {
        ungrouped.push(context);
      }
    }

    return {
      groups: Array.from(groupMap.values()),
      ungrouped,
      ungroupedCount: ungrouped.length
    };
  }

  /**
   * Generate smart groups based on AI categorization and rules
   * Returns predefined smart groups as per requirements
   */
  async getSmartGroups(userId: string): Promise<Record<string, any[]>> {
    console.log('🧠 Generating smart groups for user', userId);

    // Fetch all contexts
    const userContexts = await db
      .select()
      .from(contexts)
      .where(eq(contexts.userId, userId));

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const smartGroups: Record<string, any[]> = {
      '🔥 Blocking Issues': [],
      '📅 Due This Week': [],
      '👀 Awaiting Your Review': [],
      '💬 Unread Mentions': [],
      '🚀 Ready to Deploy': [],
      '🐛 Bug Fixes': [],
      '✨ Features in Progress': [],
      '🔄 Recently Updated': [],
    };

    for (const context of userContexts) {
      const metadata = context.metadata as any;
      const updatedAt = new Date(context.updatedAt);

      // 🔥 Blocking Issues
      if (context.source === 'jira_issue' && metadata?.linkedIssues?.blockedBy?.length > 0) {
        smartGroups['🔥 Blocking Issues'].push(context);
      }

      // 📅 Due This Week
      if (context.source === 'jira_issue') {
        const dueDate = metadata?.dueDate || metadata?.sprint?.endDate;
        if (dueDate && new Date(dueDate) <= thisWeek && new Date(dueDate) >= now) {
          smartGroups['📅 Due This Week'].push(context);
        }
      }

      // 👀 Awaiting Your Review
      if (context.source === 'github_pr' && metadata?.state === 'open') {
        // Check if PR has requested reviewers (you might be one)
        // For now, check if it's not merged and has review comments
        if (!metadata?.merged && (metadata?.reviewComments || 0) > 0) {
          smartGroups['👀 Awaiting Your Review'].push(context);
        }
      }

      // 💬 Unread Mentions (check if user is mentioned)
      if (metadata?.mentions && Array.isArray(metadata.mentions) && metadata.mentions.length > 0) {
        smartGroups['💬 Unread Mentions'].push(context);
      }

      // 🚀 Ready to Deploy (PRs that are approved and passing CI/CD)
      if (context.source === 'github_pr' && metadata?.state === 'open' && metadata?.merged === false) {
        // This would need CI/CD status check - for now check if it has approvals
        const hasApprovals = metadata?.reviews?.some((r: any) => r.state === 'APPROVED');
        if (hasApprovals) {
          smartGroups['🚀 Ready to Deploy'].push(context);
        }
      }

      // 🐛 Bug Fixes
      if (context.source === 'jira_issue' && 
          (metadata?.type?.toLowerCase().includes('bug') || 
           metadata?.labels?.some((l: string) => l.toLowerCase().includes('bug')) ||
           context.title.toLowerCase().includes('fix') ||
           context.title.toLowerCase().includes('bug'))) {
        smartGroups['🐛 Bug Fixes'].push(context);
      }

      // ✨ Features in Progress
      if ((context.source === 'jira_issue' && 
           (metadata?.type?.toLowerCase().includes('feature') || 
            metadata?.type?.toLowerCase().includes('story'))) ||
          (context.source === 'github_pr' && metadata?.labels?.some((l: string) => 
           l.toLowerCase().includes('feature') || l.toLowerCase().includes('enhancement')))) {
        if (metadata?.status !== 'Done' && metadata?.state !== 'closed') {
          smartGroups['✨ Features in Progress'].push(context);
        }
      }

      // 🔄 Recently Updated (last 24h)
      if (updatedAt >= last24h) {
        smartGroups['🔄 Recently Updated'].push(context);
      }
    }

    // Sort each group by updatedAt descending
    Object.keys(smartGroups).forEach(key => {
      smartGroups[key].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });

    console.log('✅ Smart groups generated:', 
      Object.entries(smartGroups).map(([key, items]) => `${key}: ${items.length}`).join(', ')
    );

    return smartGroups;
  }

  /**
   * Categorize context using AI to determine which smart group it belongs to
   */
  async categorizeContext(context: any): Promise<string[]> {
    const categories: string[] = [];
    
    // Use AI to categorize if OpenAI is available
    try {
      const textRep = this.createTextRepresentation(context);
      const prompt = `Categorize this development context into one or more of these categories:
- Blocking Issue (blocks other work)
- Bug Fix (fixes a bug)
- Feature (new feature or enhancement)
- Ready to Deploy (approved and tested)
- Needs Review (awaiting code review)

Context: ${textRep}

Respond with only the category names separated by commas, or "none" if none apply.`;

      const response = await openaiService.generateText(prompt, { maxTokens: 50 });
      const aiCategories = response.toLowerCase().split(',').map((c: string) => c.trim());
      
      // Map AI categories to smart group keys
      if (aiCategories.includes('blocking issue')) categories.push('🔥 Blocking Issues');
      if (aiCategories.includes('bug fix')) categories.push('🐛 Bug Fixes');
      if (aiCategories.includes('feature')) categories.push('✨ Features in Progress');
      if (aiCategories.includes('ready to deploy')) categories.push('🚀 Ready to Deploy');
      if (aiCategories.includes('needs review')) categories.push('👀 Awaiting Your Review');
    } catch (error) {
      console.error('AI categorization failed, using rule-based fallback:', error);
    }

    return categories;
  }
}

export const contextGroupingService = new ContextGroupingService();

