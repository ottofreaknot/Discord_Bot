const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const logger = require('./utils/logger');

class DiscordBot {
    constructor() {
        this.client = null;
        this.isReady = false;
    }

    initialize(client) {
        this.client = client;
        this.setupEventHandlers();
        this.registerCommands();
        this.login();
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            logger.info(`Bot logged in as ${this.client.user.tag}`);
            this.isReady = true;
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const { commandName } = interaction;

            try {
                switch (commandName) {
                    case 'ping':
                        await this.handlePingCommand(interaction);
                        break;
                    case 'test-event':
                        await this.handleTestEventCommand(interaction);
                        break;
                    default:
                        await interaction.reply('Unknown command!');
                }
            } catch (error) {
                logger.error('Error handling interaction:', error);
                const errorMessage = 'There was an error while executing this command!';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        });

        this.client.on('error', (error) => {
            logger.error('Discord client error:', error);
        });
    }

    async registerCommands() {
        const commands = [
            new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Check if the bot is responsive'),
            new SlashCommandBuilder()
                .setName('test-event')
                .setDescription('Create a test scheduled event')
        ];

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

        try {
            logger.info('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commands }
            );

            logger.info('Successfully reloaded application (/) commands.');
        } catch (error) {
            logger.error('Error registering commands:', error);
        }
    }

    async handlePingCommand(interaction) {
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓 Pong! Latency: ${latency}ms`);
    }

    async handleTestEventCommand(interaction) {
        try {
            const guild = interaction.guild;
            if (!guild) {
                await interaction.reply('This command can only be used in a server!');
                return;
            }

            const eventData = {
                name: 'Test Event',
                description: 'This is a test event created by the bot',
                scheduledStartTime: new Date(Date.now() + 3600000), // 1 hour from now
                privacyLevel: 2, // Guild only
                entityType: 3, // External
                entityMetadata: {
                    location: 'Test Location'
                }
            };

            const event = await this.createScheduledEvent(guild, eventData);
            await interaction.reply(`✅ Test event created successfully! Event ID: ${event.id}`);
        } catch (error) {
            logger.error('Error creating test event:', error);
            await interaction.reply('❌ Failed to create test event. Please check bot permissions.');
        }
    }

    async createScheduledEvent(guild, eventData) {
        try {
            // For external events, Discord requires an end time
            let endTime = eventData.scheduledEndTime;
            if (!endTime && (eventData.entityType === 3 || !eventData.entityType)) {
                // Default to 2 hours after start time for external events
                const startTime = new Date(eventData.scheduledStartTime);
                endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
            }

            const event = await guild.scheduledEvents.create({
                name: eventData.name,
                description: eventData.description || 'Event created via Google Scripts integration',
                scheduledStartTime: eventData.scheduledStartTime,
                scheduledEndTime: endTime,
                privacyLevel: eventData.privacyLevel || 2,
                entityType: eventData.entityType || 3,
                entityMetadata: eventData.entityMetadata || { location: 'TBD' }
            });

            logger.info(`Created scheduled event: ${event.name} (${event.id})`);
            return event;
        } catch (error) {
            logger.error('Error creating scheduled event:', error);
            throw error;
        }
    }

    async createEventFromWebhook(guildId, eventData) {
        if (!this.isReady) {
            throw new Error('Bot is not ready');
        }

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            throw new Error(`Guild with ID ${guildId} not found`);
        }

        return await this.createScheduledEvent(guild, eventData);
    }

    login() {
        const token = process.env.DISCORD_BOT_TOKEN;
        if (!token) {
            logger.error('DISCORD_BOT_TOKEN is not set in environment variables');
            process.exit(1);
        }

        this.client.login(token).catch((error) => {
            logger.error('Failed to login to Discord:', error);
            process.exit(1);
        });
    }
}

const botInstance = new DiscordBot();
module.exports = botInstance;
