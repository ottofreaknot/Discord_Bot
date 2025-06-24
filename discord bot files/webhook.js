// webhook.js
const express = require('express');
const bot     = require('./bot');
const logger  = require('./utils/logger');
const { validateEventData } = require('./utils/validator');

const router = express.Router();

/**
 * POST /webhook/google-scripts
 * Expects payload: { guildId, eventData: { name, description, scheduledStartTime, scheduledEndTime, privacyLevel, entityType, entityMetadata } }
 */
router.post('/google-scripts', async (req, res) => {
  // 1) Log incoming payload
  logger.info('🔥 Webhook payload:', JSON.stringify(req.body));

  // 2) Validate top-level and nested eventData
  const { guildId, eventData } = req.body;
  if (!guildId || typeof eventData !== 'object') {
    logger.error('❌ Missing guildId or eventData:', req.body);
    return res.status(400).json({
      success: false,
      error: 'Invalid payload shape',
      details: ['guildId is required','eventData object is required']
    });
  }
  const validation = validateEventData(eventData);
  if (!validation.isValid) {
    logger.error('❌ EventData validation failed:', validation.errors);
    return res.status(400).json({
      success: false,
      error: 'Invalid eventData fields',
      details: validation.errors
    });
  }

  try {
    // 3) Create the Scheduled Event via your bot module
    const event = await bot.createEventFromWebhook(guildId, eventData);
    logger.info(`✅ Created Scheduled Event ${event.name} (${event.id})`);

    // 4) Optionally send a chat confirmation (if your bot module supports it)
    if (typeof bot.sendChatNotification === 'function') {
      await bot.sendChatNotification(guildId, process.env.NOTIFY_CHANNEL_ID, event);
      logger.info(`💬 Sent notification in channel ${process.env.NOTIFY_CHANNEL_ID}`);
    }

    // 5) Return success payload
    return res.json({
      success: true,
      eventId: event.id,
      eventName: event.name,
      scheduledStartTime: event.scheduledStartTime.toISOString()
    });
  } catch (err) {
    // 6) Error handling & mapping to status codes
    logger.error('❌ Error processing webhook:', err);

    let statusCode = 500;
    let message    = 'Internal server error';

    if (err.message.includes('Bot is not ready')) {
      statusCode = 503; message = 'Discord bot not ready';
    } else if (err.message.includes('Guild') && err.message.includes('not found')) {
      statusCode = 404; message = 'Discord server (guild) not found';
    } else if (err.message.includes('Missing Permissions')) {
      statusCode = 403; message = 'Bot lacks permissions to create events';
    }

    return res.status(statusCode).json({
      success: false,
      error: message,
      details: err.message
    });
  }
});

// Simple health check
router.get('/health', (req, res) => {
  res.json({
    status:   'OK',
    service:  'Discord Event Webhook',
    timestamp:new Date().toISOString(),
    botReady: bot.isReady || false
  });
});

module.exports = router;
