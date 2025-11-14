# DevContext

> **Stop switching tabs. Start shipping code.**

Being a developer, you have to switch between Teams/Slack, JIRA, and GitHub to track tickets, workflows, and updates—causing you to lose valuable time. What if there was a way where you could get all of them in one place?

**I present DevContext.**

---

## 🎯 The Problem

Every day, developers waste **30+ minutes** context-switching between tools:

- 🔄 **Slack/Teams** → Check messages and notifications
- 🎫 **JIRA** → Track tickets and workflows  
- 💻 **GitHub** → Review PRs, issues, and commits
- 🔁 **Repeat** → Jump back and forth, losing focus

**The result?** Fragmented context, missed updates, and reduced productivity.

---

## ✨ The Solution

**DevContext** unifies your entire development workflow into a single, intelligent dashboard. See everything that matters—GitHub PRs, JIRA tickets, and Slack messages—in one beautiful interface.

### 🚀 Key Features

- **📊 Unified Dashboard** - All your GitHub PRs, JIRA tickets, and Slack messages in one place
- **🔍 Smart Search** - Semantic search across all your tools with intelligent filtering
- **🤖 AI-Powered Grouping** - Automatically groups related items using AI
- **⚡ Real-time Updates** - WebSocket-powered live notifications from all integrations
- **🎨 Beautiful UI** - Modern, dark-themed interface built for developers
- **📱 Responsive Design** - Works seamlessly on desktop and mobile

---

## 🎬 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker and Docker Compose
- PostgreSQL with pgvector extension

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devcontext
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys (see Environment Variables below)
   ```

4. **Start the database**
   ```bash
   docker-compose up -d
   ```

5. **Run migrations**
   ```bash
   cd backend
   npm run db:migrate
   ```

6. **Start development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following:

```env
# Database
DATABASE_URL=postgresql://devcontext:devcontext@localhost:5432/devcontext

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secure_jwt_secret

# App URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/oauth/github/callback

# JIRA OAuth
JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

> 📖 **Detailed setup guides:**
> - [GitHub Integration Setup](./OAUTH_SETUP.md)
> - [Slack Integration Setup](./SLACK_INTEGRATION_ENV.md)
> - [JIRA Integration Setup](./OAUTH_SETUP.md)

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **TailwindCSS** for styling
- **shadcn/ui** for beautiful components
- **Socket.IO** for real-time updates

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** with pgvector for embeddings
- **Redis** for caching
- **Drizzle ORM** for database management

### Integrations
- **GitHub** - PRs, Issues, Commits, Reviews
- **JIRA** - Tickets, Workflows, Comments
- **Slack** - Messages, Channels, DMs, Threads

---

## 📖 Documentation

- [Quick Start Guide](./QUICK_START.md) - Get up and running in 5 minutes
- [GitHub Sync Implementation](./GITHUB_SYNC_IMPLEMENTATION.md) - Complete GitHub integration
- [Slack Integration Guide](./SLACK_INTEGRATION_COMPLETE.md) - Full Slack setup
- [API Documentation](./QUICK_REFERENCE.md) - API endpoints reference

---

## 🎯 Use Cases

### For Individual Developers
- **Track your work** - See all your PRs, tickets, and messages in one place
- **Stay updated** - Real-time notifications from all your tools
- **Find context fast** - Smart search across all integrations

### For Teams
- **Unified visibility** - See team-wide activity across all tools
- **Better collaboration** - Connect GitHub PRs with JIRA tickets and Slack discussions
- **AI-powered insights** - Automatically group related work items

---

## 🚀 Features in Detail

### 📊 Unified Dashboard
View all your contexts in one place:
- **GitHub**: Pull Requests, Issues, Commits, Code Reviews
- **JIRA**: Tickets, Epics, Stories, Comments
- **Slack**: Messages, Threads, DMs, Channel Updates

### 🔍 Intelligent Search
- Semantic search across all tools
- Filter by source, date, author, status
- Natural language queries: "PRs from last week", "open tickets assigned to me"

### 🤖 AI-Powered Grouping
- Automatically groups related items
- Identifies connections between PRs, tickets, and messages
- Smart context ranking based on relevance

### ⚡ Real-time Updates
- WebSocket-powered live notifications
- Auto-sync every 5 minutes
- Manual sync on demand

---

## 🏗️ Project Structure

```
devcontext/
├── frontend/          # React TypeScript frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # React hooks
│   │   └── lib/          # Utilities and API client
│   └── package.json
├── backend/           # Node.js Express backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # Database models
│   │   └── middleware/  # Express middleware
│   └── package.json
├── docker/            # Docker configuration
└── docker-compose.yml # Local development setup
```

---

## 🧪 Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
```

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (recommended)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary and confidential.

---

## 🙏 Acknowledgments

- Built with ❤️ using React, Node.js, and PostgreSQL
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide React](https://lucide.dev/)

---

## 💬 Support

Having issues? Check out our documentation or open an issue on GitHub.

---

<div align="center">

**Stop switching tabs. Start shipping code.**

[Get Started](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>
