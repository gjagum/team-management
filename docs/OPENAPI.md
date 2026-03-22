# OpenAPI Support in Hono

Hono has excellent OpenAPI support! Here's how to add API documentation:

## Quick Setup

### Option 1: Using @hono/swagger-ui (Simple)

```bash
cd backend
npm install @hono/swagger-ui --save
```

Add to `src/index.ts`:

```typescript
import { swaggerUI } from '@hono/swagger-ui';
import { app } from './index';

app.get('/docs', swaggerUI({ url: '/doc' }));
app.get('/doc', (c) => c.json(openApiSpec));
```

### Option 2: Using @hono/zod-openapi (Recommended)

```bash
npm install @hono/zod-openapi zod@4 --save
```

**Note:** Requires Zod 4.x (may need to update zod version).

```typescript
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Health check',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({
              status: z.string(),
            }),
          },
        },
      },
    },
  }),
  (c) => c.json({ status: 'ok' })
);

// Generate OpenAPI spec
app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Team Management API',
  },
});

// Serve Swagger UI
app.get('/docs', swaggerUI({ url: '/doc' }));
```

## Benefits of OpenAPI

1. **Auto-generated Documentation** - No need to maintain separate docs
2. **Client Generation** - Generate API clients automatically
3. **Testing Interface** - Try endpoints directly from Swagger UI
4. **Type Safety** - Zod schemas ensure request/response types
5. **Validation** - Automatic request validation

## Example for Your Project

Here's how to add OpenAPI to your existing routes:

### Update Users Route (`src/routes/users.ts`)

```typescript
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const usersRouter = new OpenAPIHono();

usersRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Users'],
    summary: 'List all users',
    responses: {
      200: {
        description: 'List of users',
        content: {
          'application/json': {
            schema: z.array(
              z.object({
                id: z.number(),
                email: z.string().email(),
                fullName: z.string(),
                role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
              })
            ),
          },
        },
      },
    },
  }),
  requirePermission('users.read'),
  async (c) => {
    const users = await prisma.user.findMany();
    return c.json(users);
  }
);
```

### Access Documentation

After setup:
- Swagger UI: `http://localhost:3001/docs`
- OpenAPI Spec: `http://localhost:3001/doc`

## Tools That Work with OpenAPI

### Client Generation
```bash
npm install -g @openapitools/openapi-generator-cli
openapi-generator-cli generate -i http://localhost:3001/doc -g typescript-axios -o ./generated-client
```

### Validation
```bash
npm install openapi-validator-cli
openapi-validator-cli http://localhost:3001/doc
```

### Documentation Sites
- **Swagger UI** - Interactive API docs (included)
- **Redoc** - Beautiful documentation
- **Stoplight** - Modern docs with testing

## Recommendation

For your project:

1. **Use @hono/zod-openapi** - Provides type-safe schemas
2. **Update Zod to 4.x** - Required for latest features
3. **Add to existing routes** - Gradual migration
4. **Generate TypeScript client** - For frontend type safety

## Files Created

I've created example files:
- `backend/src/openapi.ts` - Example OpenAPI server
- `backend/src/swagger.ts` - Swagger UI example

These demonstrate the approach, but the best way is to integrate directly into your existing routes.

## Resources

- [Hono OpenAPI Docs](https://hono.dev/docs/openapi)
- [Zod Schemas](https://zod.dev)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
