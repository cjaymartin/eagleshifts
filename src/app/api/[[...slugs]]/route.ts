// app/api/[[...slugs]]/route.ts
import { Elysia } from 'elysia';
import app from '@/api/app';

export const GET = app.handle;
export const POST = app.handle;
