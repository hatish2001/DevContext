import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import integrationRoutes from './routes/integrations';
import contextRoutes from './routes/contexts';
import settingsRoutes from './routes/settings';
import groupRoutes from './routes/groups';
import summaryRoutes from './routes/summaries';
import jiraRoutes from './routes/jira';
import slackRoutes from './routes/slack';
import githubRoutes from './routes/github';
import { initDatabase } from './config/database';
import { initRedis } from './config/redis';
import { initializePassport } from './config/passport';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(morgan('dev'));

// Capture raw body for Slack signature verification
app.use('/api/slack/events', express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(rateLimiter);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'DevContext API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      oauth: '/api/oauth',
      contexts: '/api/contexts',
      settings: '/api/settings',
      groups: '/api/groups'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/contexts', contextRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/github', githubRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-user-room', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  socket.on('request-sync', async (data: { userId: string; service?: string }) => {
    const { userId, service } = data;
    console.log(`Sync requested for user ${userId}, service: ${service || 'all'}`);
    
    try {
      // Trigger sync based on service
      if (!service || service === 'github') {
        // Import here to avoid circular dependencies
        const { GitHubService } = await import('./services/githubService');
        const { db } = await import('./config/database');
        const { integrations } = await import('./models/schema');
        const { eq, and } = await import('drizzle-orm');
        
        const [integration] = await db
          .select()
          .from(integrations)
          .where(and(eq(integrations.userId, userId), eq(integrations.service, 'github'), eq(integrations.active, true)))
          .limit(1);
        
        if (integration?.accessToken) {
          const githubService = new GitHubService(userId, integration.accessToken);
          const result = await githubService.syncAll(7); // Last 7 days
          io.to(`user:${userId}`).emit('sync-complete', { service: 'github', result });
        }
      }
      
      if (!service || service === 'jira') {
        const { JiraService } = await import('./services/jiraService');
        const svc = await JiraService.fromIntegration(userId);
        if (svc) {
          const issues = await svc.syncIssues();
          io.to(`user:${userId}`).emit('sync-complete', { service: 'jira', result: { issues } });
        }
      }
      
      if (!service || service === 'slack') {
        const { SlackService } = await import('./services/slackService');
        const svc = await SlackService.fromIntegration(userId);
        if (svc) {
          const messages = await svc.syncMessages();
          io.to(`user:${userId}`).emit('sync-complete', { service: 'slack', result: { messages } });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      io.to(`user:${userId}`).emit('sync-error', { 
        service: service || 'all', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper function to emit updates to specific user
export function emitContextUpdate(userId: string, context: any, action: 'created' | 'updated' | 'deleted') {
  io.to(`user:${userId}`).emit('context-update', { context, action });
}

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('Database connected successfully');
    
    // Initialize Passport strategies
    initializePassport();
    console.log('Passport strategies initialized');
    
    // Initialize Redis (optional - server can run without it)
    const redis = await initRedis();
    if (redis) {
    console.log('Redis connected successfully');
    } else {
      console.log('Redis not available - continuing without cache (this is optional)');
    }
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Export for use in other modules
export { io };
