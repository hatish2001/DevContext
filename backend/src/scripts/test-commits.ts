/**
 * Test script to debug commit fetching
 */

import { Octokit } from '@octokit/rest';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testCommits() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://devcontext:devcontext@localhost:5432/devcontext'
  });

  try {
    // Get GitHub integration
    const result = await pool.query(
      "SELECT access_token FROM integrations WHERE service = 'github' AND active = true LIMIT 1"
    );

    const accessToken = result.rows[0].access_token;
    const octokit = new Octokit({ auth: accessToken });

    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Username: ${user.login}\n`);

    // Calculate since date
    const since = new Date();
    since.setDate(since.getDate() - 30);
    console.log(`Fetching events since: ${since.toISOString()}\n`);

    // Test with the correct API call
    console.log('📋 Testing listEventsForAuthenticatedUser (with username):');
    try {
      const { data: events1 } = await octokit.activity.listEventsForAuthenticatedUser({
        username: user.login,
        per_page: 100
      });
      console.log(`   Found ${events1.length} events`);
      const pushEvents1 = events1.filter(e => e.type === 'PushEvent');
      console.log(`   Found ${pushEvents1.length} PushEvents`);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    // Test without username (correct way for authenticated user)
    console.log('\n📋 Testing without username parameter:');
    try {
      const response = await octokit.request('GET /users/{username}/events', {
        username: user.login,
        per_page: 100
      });
      const events2 = response.data;
      console.log(`   Found ${events2.length} events`);
      
      const pushEvents2 = events2.filter((e: any) => e.type === 'PushEvent');
      console.log(`   Found ${pushEvents2.length} PushEvents`);
      
      // Filter by date
      const recentPushEvents = pushEvents2.filter((e: any) => 
        e.created_at && new Date(e.created_at) >= since
      );
      console.log(`   Found ${recentPushEvents.length} PushEvents in last 30 days`);
      
      // Extract commits
      let totalCommits = 0;
      recentPushEvents.forEach((event: any) => {
        const payload = event.payload as any;
        const commits = payload.commits || [];
        totalCommits += commits.length;
        console.log(`   - ${event.repo.name}: ${commits.length} commits`);
        commits.slice(0, 2).forEach((commit: any) => {
          console.log(`      • ${commit.sha.substring(0, 7)}: ${commit.message.split('\n')[0].substring(0, 50)}`);
        });
      });
      
      console.log(`\n   Total commits that should be synced: ${totalCommits}`);
      
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testCommits();

