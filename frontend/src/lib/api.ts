const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Try to get token from localStorage on init
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { token, headers: customHeaders, ...restOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    // Add auth header
    const authToken = token || this.token;
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...restOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async signup(email: string, password: string, name?: string) {
    const response = await this.request<{
      user: { id: string; email: string; name: string };
      token: string;
    }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    this.setToken(response.token);
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      user: { id: string; email: string; name: string };
      token: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(response.token);
    return response;
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request<{
      user: {
        id: string;
        email: string;
        name: string;
        createdAt: string;
        lastActive: string;
      };
    }>('/api/auth/me');
  }

  async checkAuthStatus() {
    return this.request<{
      authenticated: boolean;
      userId?: string;
    }>('/api/auth/status');
  }

  // OAuth endpoints
  async getIntegrations() {
    return this.request<{
      github: { id: string; service: string; metadata: any } | null;
      jira: { id: string; service: string; metadata: any } | null;
      slack: { id: string; service: string; metadata: any } | null;
    }>('/api/oauth/integrations');
  }

  async disconnectIntegration(service: string) {
    return this.request(`/api/oauth/integrations/${service}`, {
      method: 'DELETE',
    });
  }

  getOAuthUrl(provider: 'github' | 'jira' | 'slack') {
    return `${API_BASE_URL}/api/oauth/${provider}`;
  }

  // Context endpoints
  async syncGitHub(userId: string, daysBack = 30) {
    return this.request<{
      success: boolean;
      message: string;
      stats: {
        pulls: number;
        issues: number;
        reviews: number;
        commits: number;
        total: number;
      };
    }>('/api/contexts/sync', {
      method: 'POST',
      body: JSON.stringify({ userId, daysBack }),
    });
  }

  async getContexts(
    userId: string,
    options?: {
      source?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const params = new URLSearchParams({
      userId,
      ...(options?.source && { source: options.source }),
      ...(options?.limit && { limit: String(options.limit) }),
      ...(options?.offset && { offset: String(options.offset) }),
    });

    return this.request<{
      contexts: Array<{
        id: string;
        userId: string;
        source: string;
        sourceId: string;
        title: string;
        content: string;
        url: string | null;
        metadata: any;
        createdAt: Date;
        updatedAt: Date;
      }>;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/api/contexts?${params}`);
  }

  async getStats(userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request<{
      total: number;
      bySource: Record<string, number>;
      lastSync: string | null;
    }>(`/api/contexts/stats?${params}`);
  }

  // Jira endpoints
  getJiraAuthUrl(userId: string) {
    const params = new URLSearchParams({ userId });
    return `${API_BASE_URL}/api/jira/auth/jira?${params.toString()}`;
  }

  async syncJira(userId: string) {
    return this.request<{ issues: number }>(`/api/jira/sync`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Slack endpoints
  getSlackAuthUrl(userId: string) {
    const params = new URLSearchParams({ userId });
    return `${API_BASE_URL}/api/slack/auth/slack?${params.toString()}`;
  }

  async syncSlack(userId: string, daysBack = 2) {
    return this.request<{
      messages: number;
      channels: number;
      dms: number;
      groupDms: number;
      errors: string[];
    }>(`/api/slack/sync`, {
      method: 'POST',
      body: JSON.stringify({ userId, daysBack }),
    });
  }

  async getSlackChannels(userId: string) {
    return this.request<{
      channels: Array<{
        id: string;
        name: string;
        is_private: boolean;
        is_archived: boolean;
        is_im: boolean;
        is_mpim: boolean;
        member_count: number;
        purpose: string;
        topic: string;
      }>;
    }>(`/api/slack/channels?userId=${userId}`);
  }

  async searchSlackMessages(userId: string, query: string) {
    return this.request<{
      query: string;
      total: number;
      messages: Array<{
        text: string;
        user: string;
        ts: string;
        channel: { id: string; name: string };
        permalink: string;
      }>;
    }>(`/api/slack/search?userId=${userId}&query=${encodeURIComponent(query)}`);
  }

  async postSlackMessage(userId: string, channelId: string, text: string, threadTs?: string) {
    return this.request(`/api/slack/post`, {
      method: 'POST',
      body: JSON.stringify({ userId, channelId, text, threadTs }),
    });
  }

  async createContext(data: any) {
    return this.request('/api/contexts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Jira enhanced endpoints
  async getJiraIssueFull(issueKey: string, userId: string) {
    return this.request(`/api/jira/issues/${issueKey}?userId=${userId}`);
  }

  async addJiraComment(issueKey: string, userId: string, body: string) {
    return this.request(`/api/jira/issues/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify({ userId, body }),
    });
  }

  async updateJiraStatus(issueKey: string, userId: string, statusId: string, transitionId?: string) {
    return this.request(`/api/jira/issues/${issueKey}/status`, {
      method: 'POST',
      body: JSON.stringify({ userId, statusId, transitionId }),
    });
  }

  async assignJiraIssue(issueKey: string, userId: string, accountId: string | null) {
    return this.request(`/api/jira/issues/${issueKey}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userId, accountId }),
    });
  }

  async updateJiraFields(issueKey: string, userId: string, fields: Record<string, any>) {
    return this.request(`/api/jira/issues/${issueKey}/fields`, {
      method: 'PUT',
      body: JSON.stringify({ userId, fields }),
    });
  }

  // GitHub enhanced endpoints
  async getPRFull(owner: string, repo: string, prNumber: number, userId: string) {
    return this.request(`/api/github/pr/${owner}/${repo}/${prNumber}?userId=${userId}`);
  }

  async createPRReview(owner: string, repo: string, prNumber: number, userId: string, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body?: string) {
    return this.request(`/api/github/pr/${owner}/${repo}/${prNumber}/review`, {
      method: 'POST',
      body: JSON.stringify({ userId, event, body }),
    });
  }

  async addPRComment(owner: string, repo: string, prNumber: number, userId: string, body: string, commitId: string, path: string, line: number, side: 'LEFT' | 'RIGHT' = 'RIGHT') {
    return this.request(`/api/github/pr/${owner}/${repo}/${prNumber}/comment`, {
      method: 'POST',
      body: JSON.stringify({ userId, body, commitId, path, line, side }),
    });
  }

  async mergePR(owner: string, repo: string, prNumber: number, userId: string, mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge', commitTitle?: string) {
    return this.request(`/api/github/pr/${owner}/${repo}/${prNumber}/merge`, {
      method: 'POST',
      body: JSON.stringify({ userId, mergeMethod, commitTitle }),
    });
  }

  // Slack enhanced endpoints
  async getSlackMessageFull(channelId: string, messageTs: string, userId: string) {
    return this.request(`/api/slack/messages/${channelId}/${messageTs}?userId=${userId}`);
  }

  async replyToSlackMessage(channelId: string, threadTs: string, userId: string, text: string) {
    return this.request(`/api/slack/messages/${channelId}/${threadTs}/reply`, {
      method: 'POST',
      body: JSON.stringify({ userId, text }),
    });
  }

  async sendSlackDM(targetUserId: string, userId: string, text: string) {
    return this.request(`/api/slack/dm`, {
      method: 'POST',
      body: JSON.stringify({ userId, targetUserId, text }),
    });
  }

  // Smart Groups
  async getSmartGroups(userId: string) {
    return this.request(`/api/groups/smart?userId=${userId}`);
  }
}

export const api = new ApiClient();
