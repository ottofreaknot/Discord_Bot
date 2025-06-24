# Discord Event Bot

Discord bot that creates scheduled events from Google Apps Script webhooks.

## Deploy to Render.com

1. Upload all files to GitHub repository
2. Connect repository to Render.com
3. Add environment variables:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `NODE_ENV=production`

## Webhook Endpoint
`POST /webhook/google-scripts`

Creates Discord scheduled events from webhook payloads.