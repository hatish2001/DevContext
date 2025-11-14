import { Octokit } from '@octokit/rest';
import { db } from '../config/database';
import { contexts } from '../models/schema';
import { subDays } from 'date-fns';
import pLimit from 'p-limit';
import { eq, and } from 'drizzle-orm';

const limit = pLimit(5); // Max 5 concurrent API calls

interface GitHubSyncOptions {
  userId: string;
  accessToken: string;
  daysBack?: number; // How many days of history to fetch
}

interface SyncResult {
  pulls: number;
  issues: number;
  reviews: number;
  commits: number;
  total: number;
}

export class GitHubService {
  private octokit: Octokit;
  private userId: string;

  constructor(userId: string, accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
    this.userId = userId;
  }

  /**
   * Main sync function - orchestrates all GitHub data fetching
   */
  async syncAll(daysBack = 30): Promise<SyncResult> {
    console.log(`Starting GitHub sync for user ${this.userId}`);
    
    const since = subDays(new Date(), daysBack).toISOString();
    
    // Get authenticated user info
    const { data: user } = await this.octokit.users.getAuthenticated();
    const username = user.login;

    // Fetch everything in parallel with rate limiting
    const [pulls, issues, reviews, commits] = await Promise.all([
      this.fetchPullRequests(username, since),
      this.fetchIssues(username, since),
      this.fetchReviews(username, since),
      this.fetchCommits(username, since)
    ]);

    const total = pulls + issues + reviews + commits;
    
    console.log(`GitHub sync complete: ${total} items synchronized`);
    
    return { pulls, issues, reviews, commits, total };
  }

  /**
   * Fetch user's pull requests
   */
  private async fetchPullRequests(username: string, since: string): Promise<number> {
    try {
      // Search for PRs where user is author
      const { data } = await this.octokit.search.issuesAndPullRequests({
        q: `is:pr author:${username} updated:>=${since.split('T')[0]}`,
        sort: 'updated',
        order: 'desc',
        per_page: 100
      });

      const contextsList = await Promise.all(
        data.items.map((pr) => limit(async () => {
          // Parse repository info from URL
          const repoMatch = pr.repository_url.match(/repos\/(.+)\/(.+)$/);
          const [, owner, repo] = repoMatch || [, 'unknown', 'unknown'];

          return {
            userId: this.userId,
            source: 'github_pr',
            sourceId: pr.id.toString(),
            title: pr.title,
            content: pr.body || '',
            url: pr.html_url,
            metadata: {
              state: pr.state,
              number: pr.number,
              author: pr.user?.login,
              repo: `${owner}/${repo}`,
              labels: pr.labels.map(l => typeof l === 'string' ? l : l.name),
              comments: pr.comments,
              created_at: pr.created_at,
              updated_at: pr.updated_at,
              merged: pr.pull_request?.merged_at ? true : false,
              draft: pr.draft || false,
              reviewers: [],
            }
          };
        }))
      );

      // Insert or update to database
      for (const context of contextsList) {
        try {
          // Check if it exists
          const existing = await db
            .select()
            .from(contexts)
            .where(
              and(
                eq(contexts.userId, context.userId),
                eq(contexts.source, context.source),
                eq(contexts.sourceId, context.sourceId)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            // Update
            await db
              .update(contexts)
              .set({
                title: context.title,
                content: context.content,
                metadata: context.metadata,
                url: context.url,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(contexts.userId, context.userId),
                  eq(contexts.source, context.source),
                  eq(contexts.sourceId, context.sourceId)
                )
              );
          } else {
            // Insert
            await db.insert(contexts).values(context);
          }
        } catch (error) {
          console.error('Error saving PR context:', error);
        }
      }

      console.log(`Synced ${contextsList.length} pull requests`);
      return contextsList.length;
    } catch (error) {
      console.error('Error fetching pull requests:', error);
      return 0;
    }
  }

  /**
   * Fetch user's issues
   */
  private async fetchIssues(username: string, since: string): Promise<number> {
    try {
      // Search for issues where user is involved
      const { data } = await this.octokit.search.issuesAndPullRequests({
        q: `is:issue involves:${username} updated:>=${since.split('T')[0]}`,
        sort: 'updated',
        order: 'desc',
        per_page: 100
      });

      const contextsList = await Promise.all(
        data.items
          .filter(item => !item.pull_request) // Exclude PRs
          .map((issue) => limit(async () => {
            const repoMatch = issue.repository_url.match(/repos\/(.+)\/(.+)$/);
            const [, owner, repo] = repoMatch || [, 'unknown', 'unknown'];

            return {
              userId: this.userId,
              source: 'github_issue',
              sourceId: issue.id.toString(),
              title: issue.title,
              content: issue.body || '',
              url: issue.html_url,
              metadata: {
                state: issue.state,
                number: issue.number,
                author: issue.user?.login,
                repo: `${owner}/${repo}`,
                labels: issue.labels.map(l => typeof l === 'string' ? l : l.name),
                comments: issue.comments,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                assignees: issue.assignees?.map(a => a.login) || []
              }
            };
          }))
      );

      // Insert or update to database
      for (const context of contextsList) {
        try {
          const existing = await db
            .select()
            .from(contexts)
            .where(
              and(
                eq(contexts.userId, context.userId),
                eq(contexts.source, context.source),
                eq(contexts.sourceId, context.sourceId)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(contexts)
              .set({
                title: context.title,
                content: context.content,
                metadata: context.metadata,
                url: context.url,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(contexts.userId, context.userId),
                  eq(contexts.source, context.source),
                  eq(contexts.sourceId, context.sourceId)
                )
              );
          } else {
            await db.insert(contexts).values(context);
          }
        } catch (error) {
          console.error('Error saving issue context:', error);
        }
      }

      console.log(`Synced ${contextsList.length} issues`);
      return contextsList.length;
    } catch (error) {
      console.error('Error fetching issues:', error);
      return 0;
    }
  }

  /**
   * Fetch code reviews user has participated in
   */
  private async fetchReviews(username: string, since: string): Promise<number> {
    try {
      // Search for PRs where user is a reviewer
      const { data } = await this.octokit.search.issuesAndPullRequests({
        q: `is:pr reviewed-by:${username} updated:>=${since.split('T')[0]}`,
        sort: 'updated',
        order: 'desc',
        per_page: 50
      });

      const contextsList = data.items.map(pr => {
        const repoMatch = pr.repository_url.match(/repos\/(.+)\/(.+)$/);
        const [, owner, repo] = repoMatch || [, 'unknown', 'unknown'];

        return {
          userId: this.userId,
          source: 'github_review',
          sourceId: `review_${pr.id}`,
          title: `Review: ${pr.title}`,
          content: pr.body || '',
          url: pr.html_url,
          metadata: {
            state: pr.state,
            number: pr.number,
            author: pr.user?.login,
            repo: `${owner}/${repo}`,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            review_type: 'requested'
          }
        };
      });

      // Save to database
      for (const context of contextsList) {
        try {
          const existing = await db
            .select()
            .from(contexts)
            .where(
              and(
                eq(contexts.userId, context.userId),
                eq(contexts.source, context.source),
                eq(contexts.sourceId, context.sourceId)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(contexts)
              .set({
                title: context.title,
                content: context.content,
                metadata: context.metadata,
                url: context.url,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(contexts.userId, context.userId),
                  eq(contexts.source, context.source),
                  eq(contexts.sourceId, context.sourceId)
                )
              );
          } else {
            await db.insert(contexts).values(context);
          }
        } catch (error) {
          console.error('Error saving review context:', error);
        }
      }

      console.log(`Synced ${contextsList.length} reviews`);
      return contextsList.length;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return 0;
    }
  }

  /**
   * Fetch recent commits
   */
  private async fetchCommits(username: string, since: string): Promise<number> {
    try {
      // Get user's repositories
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'pushed',
        per_page: 10,
        affiliation: 'owner,collaborator,organization_member'
      });

      const contextsList: any[] = [];

      // Fetch commits from each repository
      for (const repo of repos) {
        try {
          const { data: commits } = await this.octokit.repos.listCommits({
            owner: repo.owner.login,
            repo: repo.name,
            author: username,
            since,
            per_page: 10
          });

          commits.forEach((commit) => {
            contextsList.push({
              userId: this.userId,
              source: 'github_commit',
              sourceId: commit.sha,
              title: `Commit: ${commit.commit.message.split('\n')[0].substring(0, 100)}`,
              content: commit.commit.message,
              url: commit.html_url,
              metadata: {
                sha: commit.sha,
                author: commit.commit.author?.name || username,
                repo: repo.full_name,
                created_at: commit.commit.author?.date,
                branch: repo.default_branch || 'main'
              }
            });
          });
        } catch (repoError: any) {
          // Skip repos we can't access (403, 404, etc.)
          if (repoError.status !== 403 && repoError.status !== 404 && repoError.status !== 409) {
            console.error(`Error fetching commits from ${repo.full_name}:`, repoError.message);
          }
        }
      }

      // Save to database
      for (const context of contextsList) {
        try {
          const existing = await db
            .select()
            .from(contexts)
            .where(
              and(
                eq(contexts.userId, context.userId),
                eq(contexts.source, context.source),
                eq(contexts.sourceId, context.sourceId)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            // Skip updating commits - they don't change
            continue;
          } else {
            await db.insert(contexts).values(context);
          }
        } catch (err) {
          // Skip duplicates
          console.log('Skipping duplicate commit:', context.sourceId);
        }
      }

      console.log(`Synced ${contextsList.length} commits`);
      return contextsList.length;
    } catch (error) {
      console.error('Error fetching commits:', error);
      return 0;
    }
  }

  /**
   * Get full PR details including diff, review comments, CI/CD status
   */
  async getPullRequestFull(owner: string, repo: string, prNumber: number) {
    try {
      // Get PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: 'diff'
        }
      });

      // Get PR files (for diff view)
      const { data: files } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber
      });

      // Get review comments
      const { data: reviewComments } = await this.octokit.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber
      });

      // Get reviews (approvals, etc.)
      const { data: reviews } = await this.octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: prNumber
      });

      // Get CI/CD status (check runs)
      let checkRuns: any[] = [];
      try {
        const { data: checks } = await this.octokit.checks.listForRef({
          owner,
          repo,
          ref: pr.head.sha
        });
        checkRuns = checks.check_runs || [];
      } catch (e) {
        // Checks might not be available
      }

      // Get commit statuses
      let commitStatuses: any[] = [];
      try {
        const { data: statuses } = await this.octokit.repos.listCommitStatusesForRef({
          owner,
          repo,
          ref: pr.head.sha
        });
        commitStatuses = statuses || [];
      } catch (e) {
        // Statuses might not be available
      }

      // Get requested reviewers
      const requestedReviewers = [
        ...(pr.requested_reviewers || []).map((r: any) => ({ type: 'user', login: r.login, avatar: r.avatar_url })),
        ...(pr.requested_teams || []).map((t: any) => ({ type: 'team', slug: t.slug, name: t.name }))
      ];

      // Get diff stats
      const additions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
      const deletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0);
      const changedFiles = files.length;

      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        bodyHtml: pr.body_html || pr.body,
        state: pr.state,
        merged: pr.merged,
        mergeable: pr.mergeable,
        mergeableState: pr.mergeable_state,
        draft: pr.draft,
        locked: pr.locked,
        author: {
          login: pr.user.login,
          avatar: pr.user.avatar_url,
          type: pr.user.type
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha,
          label: pr.base.label
        },
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
          label: pr.head.label
        },
        created: pr.created_at,
        updated: pr.updated_at,
        closed: pr.closed_at,
        mergedAt: pr.merged_at,
        mergeCommitSha: pr.merge_commit_sha,
        htmlUrl: pr.html_url,
        diffUrl: pr.diff_url,
        patchUrl: pr.patch_url,
        comments: pr.comments,
        reviewCommentsCount: pr.review_comments,
        commits: pr.commits,
        additions,
        deletions,
        changedFiles,
        requestedReviewers,
        labels: (pr.labels || []).map((l: any) => ({
          id: l.id,
          name: l.name,
          color: l.color,
          description: l.description
        })),
        milestone: pr.milestone ? {
          id: pr.milestone.id,
          title: pr.milestone.title,
          state: pr.milestone.state,
          dueOn: pr.milestone.due_on
        } : null,
        files: files.map(f => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          blobUrl: f.blob_url,
          rawUrl: f.raw_url,
          contentsUrl: f.contents_url,
          patch: f.patch,
          sha: f.sha
        })),
        reviewComments: reviewComments.map(rc => ({
          id: rc.id,
          body: rc.body,
          bodyHtml: rc.body_html || rc.body,
          author: {
            login: rc.user.login,
            avatar: rc.user.avatar_url
          },
          created: rc.created_at,
          updated: rc.updated_at,
          path: rc.path,
          line: rc.line,
          originalLine: rc.original_line,
          startLine: rc.start_line,
          originalStartLine: rc.original_start_line,
          diffHunk: rc.diff_hunk,
          htmlUrl: rc.html_url
        })),
        reviews: reviews.map(r => ({
          id: r.id,
          body: r.body,
          state: r.state, // APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED
          author: {
            login: r.user.login,
            avatar: r.user.avatar_url
          },
          submittedAt: r.submitted_at,
          commitId: r.commit_id,
          htmlUrl: r.html_url
        })),
        checkRuns: checkRuns.map(cr => ({
          id: cr.id,
          name: cr.name,
          status: cr.status, // queued, in_progress, completed
          conclusion: cr.conclusion, // success, failure, neutral, cancelled, skipped, timed_out, action_required
          startedAt: cr.started_at,
          completedAt: cr.completed_at,
          htmlUrl: cr.html_url,
          detailsUrl: cr.details_url
        })),
        commitStatuses: commitStatuses.map(cs => ({
          id: cs.id,
          state: cs.state, // success, failure, pending, error
          context: cs.context,
          description: cs.description,
          targetUrl: cs.target_url,
          createdAt: cs.created_at
        }))
      };
    } catch (e) {
      console.error('Error fetching full PR details:', e);
      throw e;
    }
  }

  /**
   * Create a PR review (approve, request changes, or comment)
   */
  async createReview(owner: string, repo: string, prNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body?: string) {
    try {
      const { data } = await this.octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event,
        body: body || ''
      });
      return data;
    } catch (e) {
      console.error('Error creating PR review:', e);
      throw e;
    }
  }

  /**
   * Add a review comment to a specific line
   */
  async createReviewComment(owner: string, repo: string, prNumber: number, body: string, commitId: string, path: string, line: number, side: 'LEFT' | 'RIGHT' = 'RIGHT') {
    try {
      const { data } = await this.octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body,
        commit_id: commitId,
        path,
        line,
        side
      });
      return data;
    } catch (e) {
      console.error('Error creating review comment:', e);
      throw e;
    }
  }

  /**
   * Merge a PR
   */
  async mergePullRequest(owner: string, repo: string, prNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge', commitTitle?: string) {
    try {
      const { data } = await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        merge_method: mergeMethod,
        commit_title: commitTitle
      });
      return data;
    } catch (e) {
      console.error('Error merging PR:', e);
      throw e;
    }
  }
}

