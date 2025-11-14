import { 
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  json,
  primaryKey,
  uuid,
  jsonb,
  real,
  boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActive: timestamp('last_active'),
  lastGithubSync: timestamp('last_github_sync'),
});

// Integrations table
export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  service: varchar('service', { length: 50 }).notNull(), // 'github', 'jira', 'slack'
  serviceUserId: varchar('service_user_id', { length: 255 }), // User ID in the service
  accessToken: text('access_token'), // Will be encrypted
  refreshToken: text('refresh_token'), // Will be encrypted
  workspaceId: varchar('workspace_id', { length: 255 }), // For Slack/Jira workspace
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata'), // Store additional service-specific data
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contexts table
export const contexts = pgTable('contexts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  source: varchar('source', { length: 50 }).notNull(), // 'github_pr', 'jira_ticket', 'slack_message'
  sourceId: varchar('source_id', { length: 255 }).notNull(), // Original ID from source system
  title: text('title'),
  content: text('content'),
  url: text('url'), // Direct link to source
  metadata: jsonb('metadata'),
  // embedding: vector('embedding', { dimensions: 1536 }), // TODO: Add pgvector support
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  relevanceScore: real('relevance_score'),
});

// Context relationships table
export const contextRelationships = pgTable('context_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  contextId1: uuid('context_id_1').references(() => contexts.id).notNull(),
  contextId2: uuid('context_id_2').references(() => contexts.id).notNull(),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull(), // 'references', 'mentions', 'related'
  confidenceScore: real('confidence_score'),
});

// User activity table
export const userActivity = pgTable('user_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contextId: uuid('context_id').references(() => contexts.id).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'view', 'click', 'dismiss'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// User preferences table
export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').references(() => users.id).primaryKey(),
  notificationSettings: jsonb('notification_settings'),
  uiPreferences: jsonb('ui_preferences'),
  defaultView: varchar('default_view', { length: 50 }),
  syncFrequency: integer('sync_frequency').default(300), // seconds
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  integrations: many(integrations),
  contexts: many(contexts),
  activities: many(userActivity),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));

export const contextsRelations = relations(contexts, ({ one, many }) => ({
  user: one(users, {
    fields: [contexts.userId],
    references: [users.id],
  }),
  activities: many(userActivity),
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id],
  }),
  context: one(contexts, {
    fields: [userActivity.contextId],
    references: [contexts.id],
  }),
}));
