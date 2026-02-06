# Contributing to LeadPilot

Thanks for your interest in contributing! This guide will help you get started.

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/Rishet11/LeadPilot.git
cd LeadPilot
```

2. **Install dependencies:**
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Add your API keys: APIFY_API_TOKEN, GEMINI_API_KEY
```

4. **Run locally:**
```bash
# Option 1: Docker Compose (recommended)
make docker-up

# Option 2: Manual
make dev  # Runs both API and frontend
```

---

## Development Workflow

### Running Tests
```bash
make test        # Run all tests
make test-cov    # Run with coverage report
```

### Code Quality
```bash
make lint        # Check code style
make format      # Auto-format code
make fix         # Auto-fix linting issues
```

### Making Changes

1. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation if needed

3. **Run tests and linting:**
```bash
make test
make lint
```

4. **Commit with clear messages:**
```bash
git commit -m "feat: add batch export feature"
```

**Commit prefixes:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

5. **Push and create PR:**
```bash
git push origin feature/your-feature-name
```

---

## Code Style

### Python
- Follow PEP 8
- Use type hints where applicable
- Maximum line length: 100 characters
- Use `ruff` for formatting

### TypeScript/React
- Use functional components with hooks
- Prefer `const` over `let`
- Use TypeScript types (avoid `any`)

---

## Project Structure

```
LeadPilot/
├── api/              # FastAPI backend
│   ├── routers/      # API endpoints
│   ├── database.py   # SQLAlchemy models
│   └── schemas.py    # Pydantic schemas
├── frontend/         # Next.js frontend
│   └── src/
│       ├── app/      # Pages
│       └── components/
├── tests/            # Pytest tests
├── *.py              # CLI pipeline modules
└── docs/             # Documentation
```

---

## Testing Guidelines

### Writing Tests

1. **Unit tests** for business logic (cleaner, scorer)
2. **Integration tests** for API endpoints
3. **Test naming:** `test_<function>_<scenario>`

**Example:**
```python
def test_clean_phone_with_country_code():
    result = clean_phone("+1 (555) 123-4567")
    assert result == "+15551234567"
```

### Test Coverage

- Aim for 70%+ coverage on critical paths
- Don't skip error cases
- Test edge cases (empty inputs, None values)

---

## Pull Request Guidelines

### Before Submitting

- ✅ All tests pass
- ✅ No linting errors
- ✅ Code is documented
- ✅ Changes are tested

### PR Description Template

```markdown
## What
Brief description of changes

## Why
Motivation for this change

## How
Technical approach

## Testing
How you tested these changes
```

---

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Bug?** Open an Issue with reproduction steps
- **Feature idea?** Open an Issue with use case

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
