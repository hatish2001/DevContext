import axios, { AxiosInstance } from 'axios';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../config/database';
import { contexts, integrations } from '../models/schema';

export class JiraService {
  private api: AxiosInstance;
  private cloudId: string;
  private userId: string;
  private accountId?: string;
  private siteUrl?: string;

  constructor(userId: string, accessToken: string, cloudId: string, accountId?: string, siteUrl?: string) {
    this.userId = userId;
    this.cloudId = cloudId;
    this.accountId = accountId;
    this.siteUrl = siteUrl;
    this.api = axios.create({
      baseURL: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  static async fromIntegration(userId: string): Promise<JiraService | null> {
    const db = getDb();
    const [intg] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, 'jira')))
      .limit(1);
    if (!intg || !intg.accessToken || !intg.workspaceId) return null;

    const metadata = intg.metadata as any;
    const accountId = metadata?.user?.accountId;
    const siteUrl = metadata?.site?.url;

    // Check if token is expired and refresh if needed
    if (intg.expiresAt && new Date(intg.expiresAt) < new Date(Date.now() + 5 * 60 * 1000)) {
      console.log('Jira token expired, refreshing...');
      try {
        const refreshResp = await axios.post('https://auth.atlassian.com/oauth/token', {
          grant_type: 'refresh_token',
          client_id: process.env.JIRA_CLIENT_ID,
          client_secret: process.env.JIRA_CLIENT_SECRET,
          refresh_token: intg.refreshToken,
        });
        const { access_token, refresh_token, expires_in } = refreshResp.data as any;
        await db.update(integrations)
          .set({
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: new Date(Date.now() + expires_in * 1000),
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, intg.id));
        console.log('Jira token refreshed');
        return new JiraService(userId, access_token, intg.workspaceId, accountId, siteUrl);
      } catch (e) {
        console.error('Failed to refresh Jira token:', e);
      }
    }

    return new JiraService(userId, intg.accessToken, intg.workspaceId, accountId, siteUrl);
  }

  async syncIssues(): Promise<number> {
    try {
      // Use the new /search/jql endpoint (old /search was deprecated)
      let jql = 'assignee = currentUser() OR reporter = currentUser() ORDER BY updated DESC';
      console.log('Jira syncIssues - Using JQL:', jql);
      
      let resp: any;
      try {
        resp = await this.api.post('/search/jql', {
          jql,
          maxResults: 50,
          fields: [
            'summary','description','status','priority','assignee','reporter','created','updated','labels','project','issuetype','components','fixVersions','resolved','resolution'
          ],
        });
      } catch (e: any) {
        console.log('First attempt failed:', e.response?.status, e.response?.data);
        // If currentUser() fails (401/410), try without filter
        if (e.response?.status === 410 || e.response?.status === 401) {
          console.log('currentUser() failed, trying without filter...');
          jql = 'updated >= -7d ORDER BY updated DESC'; // Last 7 days
          resp = await this.api.post('/search/jql', {
            jql,
            maxResults: 50,
            fields: [
              'summary','description','status','priority','assignee','reporter','created','updated','labels','project','issuetype','components','fixVersions','resolved','resolution'
            ],
          });
        } else {
          throw e;
        }
      }

      const db = getDb();
      let count = 0;
      for (const issue of resp.data.issues || []) {
        // Build the proper Jira URL using the site URL from metadata
        const jiraUrl = this.siteUrl 
          ? `${this.siteUrl}/browse/${issue.key}`
          : null;

        // Parse JIRA timestamps - they come in ISO format
        const jiraCreated = issue.fields.created ? new Date(issue.fields.created) : new Date();
        const jiraUpdated = issue.fields.updated ? new Date(issue.fields.updated) : new Date();

        const ctx = {
          userId: this.userId,
          source: 'jira_issue',
          sourceId: issue.id as string,
          title: `${issue.key}: ${issue.fields.summary}` as string,
          content: (issue.fields.description || '') as string,
          url: jiraUrl,
          createdAt: jiraCreated,
          updatedAt: jiraUpdated,
          metadata: {
            key: issue.key,
            type: issue.fields.issuetype?.name,
            status: issue.fields.status?.name,
            priority: issue.fields.priority?.name,
            assignee: issue.fields.assignee?.displayName,
            reporter: issue.fields.reporter?.displayName,
            project: issue.fields.project?.key,
            projectName: issue.fields.project?.name,
            created: issue.fields.created,
            updated: issue.fields.updated,
            labels: issue.fields.labels,
            components: issue.fields.components,
            fixVersions: issue.fields.fixVersions,
            resolved: issue.fields.resolved,
            resolution: issue.fields.resolution?.name,
          },
        } as const;

        // Upsert by userId+source+sourceId
        const [existing] = await db
          .select()
          .from(contexts)
          .where(and(eq(contexts.userId, this.userId), eq(contexts.source, 'jira_issue'), eq(contexts.sourceId, issue.id)))
          .limit(1);

        if (existing) {
          await db
            .update(contexts)
            .set({ 
              title: ctx.title, 
              content: ctx.content, 
              url: ctx.url, 
              metadata: ctx.metadata, 
              // Use actual JIRA timestamps, not sync time
              createdAt: jiraCreated,
              updatedAt: jiraUpdated
            })
            .where(eq(contexts.id, existing.id));
        } else {
          await db.insert(contexts).values(ctx as any);
        }
        count++;
      }
      return count;
    } catch (e) {
      console.error('Jira syncIssues error:', e);
      return 0;
    }
  }

  /**
   * Get full issue details including comments, attachments, history, subtasks, and linked issues
   */
  async getIssueFull(issueIdOrKey: string) {
    try {
      // Get basic issue info
      const issueResp = await this.api.get(`/issue/${issueIdOrKey}`, {
        params: {
          expand: 'changelog,renderedFields,names,schema',
          fields: [
            'summary', 'description', 'status', 'priority', 'assignee', 'reporter',
            'created', 'updated', 'labels', 'project', 'issuetype', 'components',
            'fixVersions', 'resolved', 'resolution', 'parent', 'subtasks',
            'attachment', 'comment', 'issuelinks', 'watches', 'timeoriginalestimate',
            'timeestimate', 'timespent', 'aggregatetimeoriginalestimate',
            'aggregatetimeestimate', 'aggregatetimespent', 'customfield_10020' // Sprint field
          ].join(',')
        }
      });

      const issue = issueResp.data;

      // Get comments
      const commentsResp = await this.api.get(`/issue/${issueIdOrKey}/comment`, {
        params: { expand: 'renderedBody' }
      });
      const comments = (commentsResp.data.comments || []).map((c: any) => ({
        id: c.id,
        author: c.author?.displayName || c.author?.name,
        authorAvatar: c.author?.avatarUrls?.['48x48'],
        body: c.body,
        renderedBody: c.renderedBody,
        created: c.created,
        updated: c.updated
      }));

      // Get attachments
      const attachments = (issue.fields.attachment || []).map((a: any) => ({
        id: a.id,
        filename: a.filename,
        size: a.size,
        mimeType: a.mimeType,
        content: a.content,
        thumbnail: a.thumbnail,
        created: a.created,
        author: a.author?.displayName || a.author?.name
      }));

      // Get changelog/history
      const changelog = (issue.changelog?.histories || []).slice(-10).map((h: any) => ({
        id: h.id,
        author: h.author?.displayName || h.author?.name,
        created: h.created,
        items: h.items.map((item: any) => ({
          field: item.field,
          fieldtype: item.fieldtype,
          from: item.fromString || item.from,
          to: item.toString || item.to
        }))
      }));

      // Get subtasks
      const subtasks = (issue.fields.subtasks || []).map((st: any) => ({
        id: st.id,
        key: st.key,
        summary: st.fields?.summary,
        status: st.fields?.status?.name,
        type: st.fields?.issuetype?.name
      }));

      // Get linked issues
      const linkedIssues = {
        blocks: [] as any[],
        blockedBy: [] as any[],
        relates: [] as any[]
      };

      (issue.fields.issuelinks || []).forEach((link: any) => {
        const linkedIssue = link.inwardIssue || link.outwardIssue;
        if (!linkedIssue) return;

        const issueData = {
          id: linkedIssue.id,
          key: linkedIssue.key,
          summary: linkedIssue.fields?.summary,
          status: linkedIssue.fields?.status?.name,
          type: linkedIssue.fields?.issuetype?.name
        };

        if (link.type?.inward === 'is blocked by') {
          linkedIssues.blockedBy.push(issueData);
        } else if (link.type?.outward === 'blocks') {
          linkedIssues.blocks.push(issueData);
        } else {
          linkedIssues.relates.push(issueData);
        }
      });

      // Get watchers
      let watchers: string[] = [];
      try {
        const watchersResp = await this.api.get(`/issue/${issueIdOrKey}/watchers`);
        watchers = (watchersResp.data.watchers || []).map((w: any) => w.displayName || w.name);
      } catch (e) {
        // Watchers endpoint might not be available
      }

      // Build full issue object
      return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        renderedDescription: issue.renderedFields?.description || issue.fields.description,
        status: {
          id: issue.fields.status?.id,
          name: issue.fields.status?.name,
          statusCategory: issue.fields.status?.statusCategory?.name
        },
        priority: issue.fields.priority ? {
          id: issue.fields.priority.id,
          name: issue.fields.priority.name,
          iconUrl: issue.fields.priority.iconUrl
        } : null,
        assignee: issue.fields.assignee ? {
          accountId: issue.fields.assignee.accountId,
          displayName: issue.fields.assignee.displayName,
          emailAddress: issue.fields.assignee.emailAddress,
          avatarUrls: issue.fields.assignee.avatarUrls
        } : null,
        reporter: issue.fields.reporter ? {
          accountId: issue.fields.reporter.accountId,
          displayName: issue.fields.reporter.displayName,
          emailAddress: issue.fields.reporter.emailAddress
        } : null,
        project: {
          id: issue.fields.project.id,
          key: issue.fields.project.key,
          name: issue.fields.project.name
        },
        issueType: {
          id: issue.fields.issuetype.id,
          name: issue.fields.issuetype.name,
          iconUrl: issue.fields.issuetype.iconUrl
        },
        created: issue.fields.created,
        updated: issue.fields.updated,
        resolved: issue.fields.resolved,
        resolution: issue.fields.resolution?.name || null,
        labels: issue.fields.labels || [],
        components: (issue.fields.components || []).map((c: any) => ({
          id: c.id,
          name: c.name
        })),
        fixVersions: (issue.fields.fixVersions || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          released: v.released,
          releaseDate: v.releaseDate
        })),
        timeTracking: {
          originalEstimate: issue.fields.timeoriginalestimate || 0,
          remainingEstimate: issue.fields.timeestimate || 0,
          timeSpent: issue.fields.timespent || 0,
          aggregateOriginalEstimate: issue.fields.aggregatetimeoriginalestimate || 0,
          aggregateRemainingEstimate: issue.fields.aggregatetimeestimate || 0,
          aggregateTimeSpent: issue.fields.aggregatetimespent || 0
        },
        sprint: issue.fields.customfield_10020?.[0] ? {
          id: issue.fields.customfield_10020[0].id,
          name: issue.fields.customfield_10020[0].name,
          state: issue.fields.customfield_10020[0].state,
          startDate: issue.fields.customfield_10020[0].startDate,
          endDate: issue.fields.customfield_10020[0].endDate
        } : null,
        parent: issue.fields.parent ? {
          id: issue.fields.parent.id,
          key: issue.fields.parent.key,
          summary: issue.fields.parent.fields?.summary
        } : null,
        subtasks,
        linkedIssues,
        comments,
        attachments,
        changelog,
        watchers,
        url: this.siteUrl ? `${this.siteUrl}/browse/${issue.key}` : null
      };
    } catch (e) {
      console.error('Error fetching full Jira issue:', e);
      throw e;
    }
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueIdOrKey: string, body: string) {
    try {
      // Jira API v3 requires ADF format for comments
      const commentBody = {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: body,
                },
              ],
            },
          ],
        },
      };
      const resp = await this.api.post(`/issue/${issueIdOrKey}/comment`, commentBody);
      return resp.data;
    } catch (e) {
      console.error('Error adding Jira comment:', e);
      throw e;
    }
  }

  /**
   * Update issue status
   */
  async updateStatus(issueIdOrKey: string, statusId: string, transitionId?: string) {
    try {
      // First, get available transitions
      const transitionsResp = await this.api.get(`/issue/${issueIdOrKey}/transitions`);
      const transitions = transitionsResp.data.transitions;

      // Find the transition to the desired status
      let targetTransition = transitions.find((t: any) => 
        t.to.id === statusId || t.to.name.toLowerCase() === statusId.toLowerCase()
      );

      // If transitionId provided, use it directly
      if (transitionId) {
        targetTransition = transitions.find((t: any) => t.id === transitionId);
      }

      if (!targetTransition) {
        throw new Error(`No transition found to status: ${statusId}`);
      }

      const resp = await this.api.post(`/issue/${issueIdOrKey}/transitions`, {
        transition: { id: targetTransition.id }
      });

      return resp.data;
    } catch (e) {
      console.error('Error updating Jira status:', e);
      throw e;
    }
  }

  /**
   * Assign issue to a user
   */
  async assignIssue(issueIdOrKey: string, accountId: string | null) {
    try {
      const resp = await this.api.put(`/issue/${issueIdOrKey}/assignee`, {
        accountId
      });
      return resp.data;
    } catch (e) {
      console.error('Error assigning Jira issue:', e);
      throw e;
    }
  }

  /**
   * Update story points or other custom fields
   */
  async updateFields(issueIdOrKey: string, fields: Record<string, any>) {
    try {
      const resp = await this.api.put(`/issue/${issueIdOrKey}`, { fields });
      return resp.data;
    } catch (e) {
      console.error('Error updating Jira fields:', e);
      throw e;
    }
  }
}



