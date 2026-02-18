---
description: Regenerate TypeScript types from backend OpenAPI schema
---

// turbo-all

1. From the backend directory, generate the OpenAPI schema:

```bash
cd /Users/i/Documents/work/swimbuddz/swimbuddz-backend
python scripts/generate_openapi.py > openapi.json
```

2. From the frontend directory, generate TypeScript types:

```bash
cd /Users/i/Documents/work/swimbuddz/swimbuddz-frontend
npm run generate:types
```

3. Verify types compile:

```bash
npx tsc --noEmit
```

## When to run this workflow

- After modifying Pydantic schemas in the backend
- After adding new API endpoints
- Before committing frontend type changes
