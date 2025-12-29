# Endurance Venture Builder

A complete operational system for managing ventures, agents, LLM operations, and integrations, inspired by the philosophy of exploration and the "Endurance" expedition.

---

## 🚀 Overview

Endurance is a venture builder platform with:

- **Operating Doctrine**: rules for agent state, logs, and decision gates
- **Schema SQL v2**: canonical database schema for ventures, agents, and operations
- **LLM Gateway v1**: unified interface for OpenAI + OSS LLMs with caching, throttling, and fallback
- **Agents**: modular autonomous workers handling data, infra, LLM tasks, and Notion integration
- **API Contracts v2**: complete set of REST endpoints for frontend and operational dashboards
- **Frontend Wireframes**: Command Deck, Venture View, Agent Control Room, Infra & LLM Ops Dashboard

---

## 🗂 Repository Structure

/endurance
│
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── tsconfig.json
├── .env.example
├── docs/                 # Documentation snapshots from Notion
│   ├── architecture.md
│   ├── operating_doctrine.md
│   ├── data_retention.md
│   └── api_contracts_v2.md
├── migrations/           # PostgreSQL migration files
├── scripts/              # Utility scripts (DB seeds, cron jobs)
├── src/
│   ├── config/           # Database & environment configs
│   ├── doctrine/         # Operating Doctrine logic
│   ├── llm/              # LLM Gateway, providers, cache, throttle
│   ├── agents/           # Individual agent modules (Notion Sync, Infra, Data Lab)
│   ├── routes/           # Express routes (API contracts v2)
│   ├── notion/           # Notion integration module
│   ├── types/            # Shared TypeScript types
│   ├── jobs/             # Background jobs (archive, weekly summaries)
│   └── index.ts          # Server entry point
├── tests/                # Unit & integration tests
└── public/               # Optional frontend assets

---

## ⚡ Environment Variables

Example `.env.example`:

```
DATABASE_URL=postgres://user:password@localhost:5432/endurance
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OSS_LLM_BASE_URL=http://localhost:11434
OSS_LLM_MODEL=llama2
NOTION_TOKEN=your_notion_integration_token
GUARDIAN_POLL_INTERVAL_MS=30000
NOTION_SYNC_POLL_INTERVAL_MS=30000
NOTION_SYNC_BATCH_SIZE=10
```

---

## 🏗 Setup

```bash
# Install dependencies
npm install

# Run migrations
psql $DATABASE_URL -f migrations/001_create_tables.sql

# Start development server
npm run dev

# Build production
npm run build
npm start
```

---

## 🧩 Agents Overview

| Agent | Responsibilities | Integration |
|-------|-----------------|-------------|
| Data Lab Agent | Data analysis, logging | Sends tasks to Notion Sync Agent |
| Infra Agent | Monitors infra usage & SLAs | Reports to Engine Room & Guardian |
| LLM Gateway Agent | Handles LLM requests, caching & fallback | Integrated with Operating Doctrine |
| Notion Sync Agent | Receives tasks & updates Notion | Pulls from DB queue, validates state, alerts Guardian |

---

## 📡 API Contracts v2 Highlights

- **Command Deck**
  - `GET /ventures` — List ventures
  - `POST /decision-gates` — Execute decision gate
- **Venture View**
  - `GET /ventures/:id` — Venture detail
- **Agent Control Room**
  - `GET /agents/:id` — Agent status, logs, cost
  - `POST /agents/:id/actions` — Activate, pause, kill
- **Engine Room**
  - `GET /llm/health` — LLM gateway health
  - `POST /llm/query` — LLM prompts

Full OpenAPI 3.0 spec is in `docs/api_contracts_v2.md`.

---

## 🛠 Development Notes

- Operating Doctrine ensures agents follow rules and logs are immutable after decision gates.
- LLM Gateway implements cache-first logic with fallback to OSS providers.
- Notion Sync Agent ensures documentation is updated automatically from tasks.
- Background Jobs handle log retention and weekly summaries.

---

## 📊 Frontend

Wireframes available for:
- Command Deck
- Venture View
- Agent Control Room
- Infra & LLM Ops Dashboard

Designed for seamless integration with backend API Contracts v2.

---

## 📝 Contribution Guidelines

- Use feature branches: `feature/<agent_name>` or `feature/<module>`
- Commit messages: conventional commits style
- PRs must reference Notion task IDs for traceability
- Run all tests and linting before merging

---

## 🔗 References

- Notion Documentation (source of truth)
- Schema SQL v2 canonical
- API Contracts v2
- LLM Gateway v1 Technical Spec
- Operating Doctrine & Decision Gate Templates
