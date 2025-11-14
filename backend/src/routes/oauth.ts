import { Router } from 'express';
import passport from 'passport';
import { AuthRequest, generateToken, authMiddleware } from '../middleware/auth';
import { getDb } from '../config/database';
import { integrations } from '../models/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GitHub OAuth routes
router.get('/github', 
  passport.authenticate('github', { 
    scope: ['user:email', 'read:user', 'repo'] 
  })
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  async (req: AuthRequest, res) => {
    try {
      // Generate JWT token for the user
      const user = req.user as any;
      const token = generateToken(user.id);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=github`);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

// Get connected integrations
router.get('/integrations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();
    const userIntegrations = await db.select({
      id: integrations.id,
      service: integrations.service,
      serviceUserId: integrations.serviceUserId,
      active: integrations.active,
      createdAt: integrations.createdAt,
      metadata: integrations.metadata,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, req.userId),
        eq(integrations.active, true)
      )
    );

    const integrationStatus = {
      github: userIntegrations.find(i => i.service === 'github') || null,
      jira: userIntegrations.find(i => i.service === 'jira') || null,
      slack: userIntegrations.find(i => i.service === 'slack') || null,
    };

    res.json(integrationStatus);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to get integrations' });
  }
});

// Disconnect integration
router.delete('/integrations/:service', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { service } = req.params;
    const db = getDb();
    
    await db.update(integrations)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(integrations.userId, req.userId),
          eq(integrations.service, service)
        )
      );

    res.json({ message: 'Integration disconnected' });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

export default router;
