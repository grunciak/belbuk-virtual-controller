# Belbuk Virtual Controller

Virtual controller compatible with Belbuk Data Broker system.

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/...)

## Endpoints

- `GET /` - Info
- `GET /health` - Health check
- `POST /graphql` - GraphQL API
- `POST /api/graphql.php` - GraphQL API (PHP-style compatibility)

## Example Query

```graphql
query {
  configuration {
    globalControllerIdentifier
    zones { id name }
    resource {
      points { id name type value }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | Server port (set by Railway) |
| GLOBAL_ID | auto | Controller identifier |
