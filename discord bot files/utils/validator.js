/**
 * Validates event data received from Google Scripts webhook
 * @param {Object} data - The webhook payload
 * @returns {Object} - Validation result with isValid flag and errors array
 */
function validateEventData(data) {
    const errors = [];

    // Check if data exists
    if (!data || typeof data !== 'object') {
        errors.push('Request body must be a valid JSON object');
        return { isValid: false, errors };
    }

    // Validate guildId
    if (!data.guildId) {
        errors.push('guildId is required');
    } else if (typeof data.guildId !== 'string') {
        errors.push('guildId must be a string');
    }

    // Validate eventData
    if (!data.eventData) {
        errors.push('eventData is required');
        return { isValid: false, errors };
    }

    const eventData = data.eventData;

    // Validate event name
    if (!eventData.name) {
        errors.push('eventData.name is required');
    } else if (typeof eventData.name !== 'string') {
        errors.push('eventData.name must be a string');
    } else if (eventData.name.length > 100) {
        errors.push('eventData.name must be 100 characters or less');
    }

    // Validate scheduled start time
    if (!eventData.scheduledStartTime) {
        errors.push('eventData.scheduledStartTime is required');
    } else {
        const startTime = new Date(eventData.scheduledStartTime);
        if (isNaN(startTime.getTime())) {
            errors.push('eventData.scheduledStartTime must be a valid ISO 8601 date');
        } else if (startTime <= new Date()) {
            errors.push('eventData.scheduledStartTime must be in the future');
        }
    }

    // Validate scheduled end time (optional)
    if (eventData.scheduledEndTime) {
        const endTime = new Date(eventData.scheduledEndTime);
        const startTime = new Date(eventData.scheduledStartTime);
        
        if (isNaN(endTime.getTime())) {
            errors.push('eventData.scheduledEndTime must be a valid ISO 8601 date');
        } else if (endTime <= startTime) {
            errors.push('eventData.scheduledEndTime must be after scheduledStartTime');
        }
    }

    // Validate description (optional)
    if (eventData.description && typeof eventData.description !== 'string') {
        errors.push('eventData.description must be a string');
    } else if (eventData.description && eventData.description.length > 1000) {
        errors.push('eventData.description must be 1000 characters or less');
    }

    // Validate privacy level (optional)
    if (eventData.privacyLevel !== undefined) {
        if (!Number.isInteger(eventData.privacyLevel) || eventData.privacyLevel < 1 || eventData.privacyLevel > 2) {
            errors.push('eventData.privacyLevel must be 1 (public) or 2 (guild only)');
        }
    }

    // Validate entity type (optional)
    if (eventData.entityType !== undefined) {
        if (!Number.isInteger(eventData.entityType) || eventData.entityType < 1 || eventData.entityType > 3) {
            errors.push('eventData.entityType must be 1 (stage instance), 2 (voice channel), or 3 (external)');
        }
    }

    // Validate entity metadata (optional)
    if (eventData.entityMetadata) {
        if (typeof eventData.entityMetadata !== 'object') {
            errors.push('eventData.entityMetadata must be an object');
        } else if (eventData.entityMetadata.location && typeof eventData.entityMetadata.location !== 'string') {
            errors.push('eventData.entityMetadata.location must be a string');
        } else if (eventData.entityMetadata.location && eventData.entityMetadata.location.length > 100) {
            errors.push('eventData.entityMetadata.location must be 100 characters or less');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates Discord guild ID format
 * @param {string} guildId - Discord guild ID
 * @returns {boolean} - Whether the guild ID is valid
 */
function isValidDiscordId(guildId) {
    return typeof guildId === 'string' && /^\d{17,19}$/.test(guildId);
}

/**
 * Sanitizes user input to prevent XSS and other injection attacks
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/[&]/g, '&amp;')
        .replace(/["']/g, '') // Remove quotes
        .trim();
}

module.exports = {
    validateEventData,
    isValidDiscordId,
    sanitizeInput
};
