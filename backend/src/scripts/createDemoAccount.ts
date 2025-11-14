import { getDb, initDatabase, closeDatabase } from '../../src/config/database';
import { contexts, users } from '../../src/models/schema';
import { eq } from 'drizzle-orm';

function randomChoice<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  await initDatabase();
  const db = getDb();

  const email = 'demo@devcontext.app';
  const name = 'Demo User';

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const userId = existing?.id || (await db.insert(users).values({ email, name }).returning({ id: users.id }))[0].id;

  const githubSources = ['github_commit','github_pr','github_issue'];
  const titles = [
    'Refactor auth middleware for clarity',
    'Fix race condition in auto-sync',
    'Implement Slack search and indexing',
    'Add Jira OAuth callback handler',
    'Optimize Redis cache keys',
  ];

  // Create GitHub-like contexts
  for (let i = 0; i < 20; i++) {
    const source = randomChoice(githubSources);
    await db.insert(contexts).values({
      userId,
      source,
      sourceId: `demo-${source}-${i}`,
      title: randomChoice(titles),
      content: 'Sample content for demo context. This represents activity from GitHub.',
      url: 'https://github.com/demo/repo',
      metadata: {
        repo: 'demo/sample-app',
        author: 'demo-user',
        state: randomChoice(['open','closed','merged']),
        labels: ['demo','sample'],
      },
    });
  }

  // Create Jira-like contexts
  for (let i = 1; i <= 12; i++) {
    const key = `DEMO-${i}`;
    await db.insert(contexts).values({
      userId,
      source: 'jira_issue',
      sourceId: `jira-${i}`,
      title: `${key}: ${randomChoice(titles)}`,
      content: 'Sample Jira ticket content for demo.',
      url: `https://demo.atlassian.net/browse/${key}`,
      metadata: {
        key,
        type: randomChoice(['Bug','Story','Task']),
        status: randomChoice(['To Do','In Progress','Done']),
        priority: randomChoice(['High','Medium','Low']),
        labels: ['frontend','backend'],
      },
    });
  }

  // Create Slack-like contexts
  for (let i = 0; i < 8; i++) {
    await db.insert(contexts).values({
      userId,
      source: 'slack_message',
      sourceId: `slack-${i}`,
      title: `Slack: Discussion about PR #${100 + i}`,
      content: 'Please review the PR and check the failing tests. Link: https://github.com/demo/repo/pull/123',
      url: 'https://slack.com/app_redirect?channel=demo',
      metadata: {
        channel: 'dev-team',
        username: 'demo-user',
        timestamp: Date.now().toString(),
      },
    });
  }

  console.log(`Demo account ready: ${email} (userId=${userId})`);
  await closeDatabase();
}

main().catch(async (e) => { console.error(e); await closeDatabase(); process.exit(1); });



