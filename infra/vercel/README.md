# Vercel Deployment Guide

Deploy the Next.js application to Vercel.

## Root Directory
Set the **Root Directory** to `apps/web`.

## Domains
- `app.learnsystem.app` (Main Application)
- `learnsystem.app` (Optional: can point to the same app or redirect)

## Required Environment Variables
| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://app.learnsystem.app` |
| `NEXT_PUBLIC_API_URL` | `https://api.learnsystem.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | (From Supabase Dashboard) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (From Supabase Dashboard) |

*Note: Do not include backend-only secrets (like `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_PASSWORD`) in Vercel.*
