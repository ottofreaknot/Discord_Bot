const express = require('express');
const bot = require('./bot');
const logger = require('./utils/logger');
const { validateEventData } = require('./utils/validator');

const router = express.Router();

// Webhook endpoint for Google Scripts
router.post('/google-scripts', async (req, res) => {
    try {
        logger.info('Received webhook request from Google Scripts:', req.body);

        // Validate the incoming data
        const validation = validateEventData(req.body);
        if (!validation.isValid) {
            logger.error('Invalid event data:', validation.errors);
            return res.status(400).json({
                success: false,
                error: 'Invalid event data',
                details: validation.errors
            });
        }

        const { guildId, eventData } = req.body;

        // Create the Discord event
        const event = await bot.createEventFromWebhook(guildId, eventData);

        logger.info(`Successfully created event: ${event.name} (${event.id})`);

        res.json({
            success: true,
            message: 'Event created successfully',
            eventId: event.id,
            eventName: event.name,
            scheduledStartTime: event.scheduledStartTime
        });

    } catch (error) {
        logger.error('Error processing webhook:', error);

        let statusCode = 500;
        let errorMessage = 'Internal server error';

        if (error.message.includes('Bot is not ready')) {
            statusCode = 503;
            errorMessage = 'Discord bot is not ready';
        } else if (error.message.includes('Guild') && error.message.includes('not found')) {
            statusCode = 404;
            errorMessage = 'Discord server not found';
        } else if (error.message.includes('Missing Permissions')) {
            statusCode = 403;
            errorMessage = 'Bot lacks permissions to create events';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: error.message
        });
    }
});

// Health check for webhook endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Discord Event Webhook',
        timestamp: new Date().toISOString(),
        botReady: bot.isReady
    });
});

// Example endpoint to show expected payload format
router.get('/example-payload', (req, res) => {
    const examplePayload = {
        guildId: "your-discord-server-id",
        eventData: {
            name: "Event Name",
            description: "Event Description",
            scheduledStartTime: "2025-06-25T15:00:00.000Z",
            scheduledEndTime: "2025-06-25T17:00:00.000Z",
            privacyLevel: 2,
            entityType: 3,
            entityMetadata: {
                location: "Event Location"
            }
        }
    };

    res.json({
        message: "Example payload for creating Discord events via webhook",
        example: examplePayload,
        notes: {
            guildId: "Required - Your Discord server ID",
            scheduledStartTime: "Required - ISO 8601 format",
            scheduledEndTime: "Optional - ISO 8601 format",
            privacyLevel: "Optional - 2 for guild only (default)",
            entityType: "Optional - 3 for external location (default)",
            location: "Optional - Event location (default: 'TBD')"
        }
    });
});

module.exports = router;
