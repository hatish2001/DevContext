import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { getDb } from './database';
import { users, integrations } from '../models/schema';
import { eq, and } from 'drizzle-orm';

// Initialize Passport
export function initializePassport() {
  // GitHub OAuth Strategy
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: process.env.GITHUB_CALLBACK_URL!,
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const db = getDb();
      const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
      
      // Check if user exists
      let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      // If user doesn't exist, create one
      if (!user) {
        [user] = await db.insert(users).values({
          email,
          name: profile.displayName || profile.username,
        }).returning();
      }
      
      // Check if GitHub integration exists
      const [existingIntegration] = await db.select().from(integrations)
        .where(
          and(
            eq(integrations.userId, user.id),
            eq(integrations.service, 'github')
          )
        )
        .limit(1);
      
      if (existingIntegration) {
        // Update the access token
        await db.update(integrations)
          .set({ 
            accessToken,
            updatedAt: new Date(),
            metadata: {
              ...(existingIntegration.metadata as any || {}),
              profile: {
                id: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                profileUrl: profile.profileUrl,
                avatar: profile._json.avatar_url,
              }
            }
          })
          .where(eq(integrations.id, existingIntegration.id));
      } else {
        // Create new integration
        await db.insert(integrations).values({
          userId: user.id,
          service: 'github',
          serviceUserId: profile.id,
          accessToken,
          metadata: {
            profile: {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              profileUrl: profile.profileUrl,
              avatar: profile._json.avatar_url,
            }
          },
          active: true,
        });
      }
      
      // Update last active
      await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id));
      
      return done(null, { ...user, githubAccessToken: accessToken });
    } catch (error) {
      return done(error, null);
    }
  }));

  // Serialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id: string, done) => {
    try {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  return passport;
}
