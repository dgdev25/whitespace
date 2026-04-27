# Whitespace Testing Strategy with Agentic QE

**Last Updated**: 2026-04-01
**Testing Framework**: Agentic QE v3 (AI-powered quality engineering)
**Target Coverage**: ≥95% line coverage across all components

---

## Overview

Whitespace uses **Agentic QE v3**, an AI-powered quality engineering framework that:
- Generates comprehensive test suites (unit, integration, property-based, BDD)
- Analyzes coverage gaps with risk-weighted prioritization
- Detects and fixes flaky tests automatically
- Learns project patterns and reuses them across tests
- Coordinates 60 specialized QE agents for end-to-end quality

**Initialization**: Already complete in `.agentic-qe/` directory

---

## Project Structure for Testing

### Frontend (React/TypeScript/Vitest)
```
frontend/
├── src/
│   ├── api/                    # API client layer
│   ├── components/             # Reusable components (10 base + 4 tabs)
│   ├── pages/                  # Page components (4 pages)
│   ├── hooks/                  # Custom hooks (sessions, industries, papers)
│   ├── types/                  # TypeScript types
│   └── App.tsx
└── __tests__/                  # Generated test files
```

### Backend (Python/FastAPI/pytest)
```
backend/
├── app/
│   ├── api/
│   │   ├── routes/            # API endpoints (6 route files)
│   │   └── deps.py            # Dependency injection
│   ├── db/
│   │   ├── models/            # 11 SQLAlchemy ORM models
│   │   └── session.py         # Database session management
│   ├── pipeline/              # Synthesis pipeline (7 modules)
│   ├── ingestion/             # Data ingestion (3 modules)
│   ├── output/                # Export formatters (3 modules)
│   ├── runners/               # LLM backends (4 implementations)
│   └── core/                  # Core utilities
└── tests/                      # Generated test files
```

---

## Testing Phases

### Phase 3.1: Frontend Unit & Component Tests

**Scope**: React components, hooks, API client

**Command**:
```bash
aqe generate-tests frontend/src \
  --coverage-target 95 \
  --framework vitest \
  --test-types "unit,component,integration"
```

**What Gets Tested**:
1. **Base Components** (10 components):
   - Badge, Button, Card, EmptyState, ErrorBanner
   - FormInput, FormSlider, FormTextarea, LoadingState, Section
   - Props validation, event handlers, rendering variants, accessibility

2. **Tab Components** (4 tabs):
   - PapersTab: paper list, arXiv URL input, PDF upload, pagination
   - IndustriesTab: industry CRUD, selection, error handling
   - SessionsTab: session creation, export (JSON/MD/PDF), SSE events
   - SettingsTab: config display, threshold sliders, save functionality

3. **Page Components** (4 pages):
   - DashboardPage: project list, quick access, routing
   - ProjectPage: tab switching, tab routing, project state
   - ResultsPage: synthesis results display, data visualization
   - SettingsPage: project configuration

4. **Custom Hooks** (5 hooks):
   - useProjects, useSessions, useSessionEvents, usePapers, useIndustries
   - React Query integration, error handling, loading states
   - SSE event streaming and processing

5. **API Client** (15+ endpoints):
   - System (health, config)
   - Projects (CRUD)
   - Papers (list, add)
   - Sessions (create, list, get, export)
   - Industries (CRUD, list)
   - Error handling, request/response validation

**Expected Output**:
- 100+ unit tests
- 50+ integration tests
- Coverage: 95%+
- Test files in `frontend/__tests__/`

---

### Phase 3.2: Backend Unit & Integration Tests

**Scope**: FastAPI routes, services, database layer, pipeline

**Command**:
```bash
aqe generate-tests backend/app \
  --coverage-target 95 \
  --framework pytest \
  --test-types "unit,integration,property"
```

**What Gets Tested**:
1. **API Routes** (6 route files):
   - System endpoints (health, config)
   - Projects CRUD operations
   - Papers ingestion and listing
   - Sessions creation, querying, export
   - Industries management
   - Error handling (400/404/500 responses)

2. **Database Layer** (11 ORM models):
   - Model creation, querying, relationships
   - Cascading deletes
   - Foreign key constraints
   - Async session management
   - Pagination and filtering

3. **Pipeline Stages** (7 modules):
   - analysis.py: LLM analysis per paper
   - gap_map.py: Cross-paper gap extraction
   - synthesis.py: Gap synthesis into ideas
   - scoring.py: Idea filtering and ranking
   - industry.py: Industry applicability assessment
   - orchestrator.py: Pipeline coordination
   - event_bus.py: Event pubsub

4. **Ingestion** (3 modules):
   - arxiv.py: arXiv metadata API, PDF download
   - pdf.py: PDF extraction with pdfplumber
   - text_cleaner.py: Text normalization

5. **Output Exporters** (3 modules):
   - json_exporter.py: JSON export
   - markdown_exporter.py: Markdown export
   - pdf_exporter.py: PDF generation with WeasyPrint

6. **LLM Runners** (4 implementations):
   - Base runner interface
   - Anthropic SDK implementation
   - Claude CLI implementation
   - OpenRouter implementation
   - Runner selection logic

**Expected Output**:
- 150+ unit tests
- 80+ integration tests
- 20+ property-based tests
- Coverage: 95%+
- Test files in `backend/tests/`

---

### Phase 3.3: Security & Dependency Scanning

**Command**:
```bash
aqe security-scan . --full
aqe dependency-check . --include-dev
```

**What Gets Scanned**:
1. **SAST** (Static Application Security Testing):
   - SQL injection vulnerabilities
   - XSS/HTML injection vulnerabilities
   - Hardcoded credentials
   - Insecure cryptography
   - Weak password validation

2. **Dependency Vulnerabilities**:
   - Frontend: npm dependencies (React, Vite, React Query, etc.)
   - Backend: pip dependencies (FastAPI, SQLAlchemy, pydantic, etc.)
   - Known CVEs in transitive dependencies

3. **API Security**:
   - Authentication/authorization validation
   - CORS configuration
   - Rate limiting implementation
   - Error message information leakage

4. **Data Security**:
   - Secrets in environment variables
   - Database connection security
   - API key storage and usage
   - PDF extraction security

---

### Phase 3.4: Flaky Test Detection & Analysis

**Command**:
```bash
aqe flaky-tests . --threshold 0.05
aqe root-cause <test-name>
```

**What Gets Fixed**:
1. Async/await race conditions (especially in SSE streaming)
2. Timing-dependent assertions (waitFor edge cases)
3. Database state not properly isolated between tests
4. Mock state not reset between test runs
5. Non-deterministic ordering in list assertions

---

### Phase 3.5: Coverage Gap Analysis

**Command**:
```bash
aqe coverage-gaps . --risk-weighted --output html
```

**Analysis Includes**:
1. **Risk-Weighted Gaps**:
   - Critical paths: session creation, synthesis execution, export
   - High-risk: database transactions, API error handling
   - Medium-risk: UI edge cases, optional features
   - Low-risk: logging, error messages

2. **Coverage Prioritization**:
   - Paths not yet exercised by tests
   - Error handling branches
   - Edge cases and boundary conditions
   - Concurrent/async code paths

3. **Mutation Testing**:
   - Validate test strength (can they catch bugs?)
   - Identify redundant assertions
   - Suggest missing edge case tests

---

### Phase 3.6: Full Quality Assessment

**Command**:
```bash
aqe full-assessment . \
  --comprehensive \
  --coverage-target 90 \
  --output json,html
```

**Generates**:
1. **Quality Report**:
   - Overall quality score (0-100)
   - Coverage metrics (line, branch, function)
   - Test metrics (count, runtime, reliability)
   - Security findings (count, severity)
   - Dependency health

2. **Deployment Recommendation**:
   - Ready to deploy (all gates pass)
   - Conditional (certain areas need attention)
   - Blocked (critical issues must be fixed)

3. **Risk Dashboard**:
   - High-risk untested code
   - Flaky tests by category
   - Security vulnerabilities by severity
   - Performance bottlenecks

---

## Quick Start Commands

```bash
# Initialize (already done)
cd /media/lyle/datadisk/dev/whitespace
aqe status  # Verify healthy

# Frontend tests
aqe generate-tests frontend/src --coverage-target 95 --framework vitest

# Backend tests
aqe generate-tests backend/app --coverage-target 95 --framework pytest

# Full quality pipeline
aqe full-assessment . --comprehensive

# Coverage analysis
aqe coverage . --report html

# Run generated tests
npm test                  # Frontend (uses Vitest)
pytest -q               # Backend (uses pytest)

# Security audit
aqe security-scan . --full

# Flaky test detection
aqe flaky-tests . --threshold 0.05
```

---

## Integration with CI/CD

Generated test commands for GitHub Actions:

```yaml
# Frontend tests
npm install
npm test -- --coverage --coverage-threshold 95

# Backend tests
pip install -e ".[test]"
pytest tests/ -q --cov=app --cov-threshold 95

# Security
aqe security-scan . --full --fail-on critical,high

# Coverage report
aqe coverage . --report json
```

---

## Agentic QE Agents Used

| Agent | Purpose | When Used |
|-------|---------|-----------|
| test-architect | Generate comprehensive test suites | `aqe generate-tests` |
| coverage-specialist | Analyze test coverage and gaps | `aqe coverage-gaps` |
| gap-detector | Identify untested code paths | Automatic during generation |
| flaky-hunter | Detect intermittent test failures | `aqe flaky-tests` |
| root-cause-analyzer | Find root cause of flaky tests | `aqe root-cause <test>` |
| quality-gate | Validate quality thresholds | `aqe quality-gate` |
| security-scanner | Scan for security vulnerabilities | `aqe security-scan` |
| mutation-tester | Validate test effectiveness | Automatic during coverage analysis |
| deployment-advisor | Recommend deployment readiness | `aqe full-assessment` |
| queen-coordinator | Orchestrate all agents | `aqe full-assessment --comprehensive` |

---

## Learning & Optimization

Agentic QE learns from your project:
- **Pattern Storage**: Test fixtures, mock strategies, assertion patterns
- **Reuse Rate**: Currently 0%, increases with test generation
- **Model Routing**: Automatically selects Haiku (simple), Sonnet (medium), or Opus (complex) for each task
- **Cost Optimization**: Learns which model tier handles your code patterns best

**Check Learning Progress**:
```bash
aqe patterns status
aqe model-routing stats
```

---

## Expected Outcomes

### Test Coverage
- **Frontend**: 95%+ (React components, hooks, pages)
- **Backend**: 95%+ (API routes, services, pipeline)
- **Overall**: 92%+ (weighted by criticality)

### Test Count
- **Frontend**: 150+ tests (generated + written)
- **Backend**: 250+ tests (unit + integration + property)
- **Total**: 400+ tests

### Test Execution Time
- **Frontend**: <30 seconds (Vitest parallel)
- **Backend**: <60 seconds (pytest with fixtures)
- **Combined**: <2 minutes

### Quality Metrics
- **Flaky Tests**: <5% (detected and fixed automatically)
- **Security Issues**: 0 critical/high (scanned and flagged)
- **Code Smell**: <10 instances (auto-fixed)

---

## Next Steps

1. **Run Phase 3.1**: Generate frontend tests
   ```bash
   aqe generate-tests frontend/src --coverage-target 95
   ```

2. **Run Phase 3.2**: Generate backend tests
   ```bash
   aqe generate-tests backend/app --coverage-target 95
   ```

3. **Run Phase 3.3**: Security audit
   ```bash
   aqe security-scan . --full
   ```

4. **Run Phase 3.5**: Coverage analysis and recommendations
   ```bash
   aqe coverage-gaps . --risk-weighted
   ```

5. **Run Phase 3.6**: Full quality assessment
   ```bash
   aqe full-assessment . --comprehensive
   ```

6. **Review Results** and integrate into CI/CD pipeline

---

**Status**: Framework initialized, ready for test generation
**Estimated Time**: 2-3 hours for full test suite generation and analysis
