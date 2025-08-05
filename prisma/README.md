# Prisma Migrations Setup

This project uses Prisma Migrations to manage database schema changes. The migration commands have been added to the package.json file.

## Initial Migration Setup

To create the initial migration based on the current schema, run:

```bash
npm run db:migrate:dev -- --name init
```

This will create a `migrations` directory inside the `prisma` folder with the initial migration.

## Migration Commands

The following migration commands are available:

- `npm run db:migrate:dev` - Create a new migration based on schema changes during development
- `npm run db:migrate:deploy` - Apply pending migrations (used in production)
- `npm run db:migrate:status` - Check the status of migrations

## Automatic Migrations on Start

The `start` script has been updated to automatically run migrations on application start:

```json
"start": "npx prisma migrate deploy && next start"
```

This ensures that your database schema is always up-to-date with your application code.

## Best Practices

1. Always create a migration for schema changes instead of using `db:push`
2. Commit migration files to version control
3. Test migrations locally before deploying to production
4. Use descriptive names for migrations (e.g., `add-user-profile`, `update-shift-schema`)

## Troubleshooting

If you encounter issues with migrations:

1. Check your database connection in the `.env` file
2. Ensure you have the necessary permissions to create and modify database tables
3. Review the migration files in the `prisma/migrations` directory
4. Use `npm run db:migrate:status` to check the current migration state