/**
 * Test script to debug GitHub sync
 */

import { Octokit } from '@octokit/rest';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testGitHubSync() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://devcontext:devcontext@localhost:5432/devcontext'
  });

  try {
    // Get GitHub integration
    const result = await pool.query(
      "SELECT access_token FROM integrations WHERE service = 'github' AND active = true LIMIT 1"
    );

    if (result.rows.length === 0) {
      console.error('❌ No active GitHub integration found');
      return;
    }

    const accessToken = result.rows[0].access_token;
    console.log('✅ Found GitHub integration');

    // Initialize Octokit
    const octokit = new Octokit({ auth: accessToken });

    // Test 1: Get authenticated user
    console.log('\n📋 Test 1: Checking authenticated user...');
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Username: ${user.login}`);
    console.log(`   Account created: ${user.created_at}`);
    console.log(`   Public repos: ${user.public_repos}`);

    // Test 2: Search for PRs
    console.log('\n📋 Test 2: Searching for pull requests...');
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split('T')[0];
    
    try {
      const { data: prData } = await octokit.search.issuesAndPullRequests({
        q: `is:pr author:${user.login} updated:>=${sinceStr}`,
        per_page: 10
      });
      console.log(`   Found ${prData.total_count} PRs (showing ${prData.items.length})`);
      prData.items.forEach((pr, i) => {
        console.log(`   ${i + 1}. ${pr.title} (${pr.state})`);
      });
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Search for issues
    console.log('\n📋 Test 3: Searching for issues...');
    try {
      const { data: issueData } = await octokit.search.issuesAndPullRequests({
        q: `is:issue involves:${user.login} updated:>=${sinceStr}`,
        per_page: 10
      });
      console.log(`   Found ${issueData.total_count} issues (showing ${issueData.items.length})`);
      issueData.items.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.title} (${issue.state})`);
      });
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Get recent events
    console.log('\n📋 Test 4: Checking recent events...');
    try {
      const { data: events } = await octokit.activity.listEventsForAuthenticatedUser({
        username: user.login,
        per_page: 10
      });
      console.log(`   Found ${events.length} recent events`);
      events.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.type} on ${event.repo.name} (${event.created_at})`);
      });
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Check token scopes
    console.log('\n📋 Test 5: Checking token scopes...');
    try {
      const response = await octokit.request('GET /user');
      const scopes = response.headers['x-oauth-scopes'];
      console.log(`   Token scopes: ${scopes || 'none'}`);
      
      const requiredScopes = ['repo', 'user:email', 'read:user'];
      const hasAllScopes = requiredScopes.every(scope => 
        scopes?.includes(scope)
      );
      
      if (hasAllScopes) {
        console.log('   ✅ Token has all required scopes');
      } else {
        console.log('   ⚠️  Token might be missing some scopes');
        console.log(`   Required: ${requiredScopes.join(', ')}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testGitHubSync();

