"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordNotifier = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = __importDefault(require("../config/logger"));
const env_1 = require("../utils/env");
class DiscordNotificationService {
    constructor() {
        const webhookUrl = env_1.envConfig.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) {
            throw new Error('DISCORD_WEBHOOK_URL is not defined in environment variables');
        }
        this.webhookClient = new discord_js_1.WebhookClient({ url: webhookUrl });
    }
    async sendNotification(message, options) {
        try {
            // Constants for Discord limits
            const TOTAL_LIMIT = 6000;
            const ELLIPSIS = '...';
            // Truncate message if too long (leaving room for timestamp and other fields)
            const safeLimit = TOTAL_LIMIT - 5000; // Reserve space for other fields
            if (message.length > safeLimit) {
                message = message.slice(0, safeLimit - ELLIPSIS.length) + ELLIPSIS;
            }
            const embed = new discord_js_1.EmbedBuilder().setDescription(message).setTimestamp();
            if (options === null || options === void 0 ? void 0 : options.title) {
                const titlePrefix = env_1.envConfig.DISCORD_TITLE_PREFIX || '';
                let title = `${titlePrefix} ${options.title}`;
                if (title.length > 256) {
                    title = title.slice(0, 253) + ELLIPSIS;
                }
                embed.setTitle(title);
            }
            // Set color based on level
            const colors = {
                info: 0x00ff00, // Green
                warning: 0xff9900, // Orange
                error: 0xff0000, // Red
            };
            embed.setColor((options === null || options === void 0 ? void 0 : options.level) ? colors[options.level] : colors.info);
            if (options === null || options === void 0 ? void 0 : options.fields) {
                // Constants for field limits
                const MAX_FIELDS = 10;
                const ELLIPSIS = '...';
                // Truncate number of fields if needed
                let fieldsToProcess = options.fields;
                if (fieldsToProcess.length > MAX_FIELDS) {
                    fieldsToProcess = fieldsToProcess.slice(0, MAX_FIELDS - 1);
                    // Add a field indicating that some fields were omitted
                    fieldsToProcess.push({
                        name: 'Note',
                        value: `${options.fields.length - MAX_FIELDS + 1} more fields were omitted...`,
                        inline: false,
                    });
                }
                // Truncate fields content if needed
                const processedFields = fieldsToProcess.map((field) => ({
                    name: field.name.length > 128 ? field.name.slice(0, 128) + ELLIPSIS : field.name,
                    value: field.value.length > 256 ? field.value.slice(0, 256) + ELLIPSIS : field.value,
                    inline: field.inline,
                }));
                embed.addFields(processedFields);
            }
            if ((0, env_1.isProduction)()) {
                await this.webhookClient.send({
                    embeds: [embed],
                });
            }
            else {
                console.log(embed);
                console.log(embed.data.fields);
            }
        }
        catch (error) {
            logger_1.default.error('Failed to send Discord notification', { error });
            throw error;
        }
    }
}
exports.discordNotifier = new DiscordNotificationService();
