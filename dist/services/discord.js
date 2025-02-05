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
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) {
            throw new Error('DISCORD_WEBHOOK_URL is not defined in environment variables');
        }
        this.webhookClient = new discord_js_1.WebhookClient({ url: webhookUrl });
    }
    async sendNotification(message, options) {
        try {
            const embed = new discord_js_1.EmbedBuilder().setDescription(message).setTimestamp();
            if (options === null || options === void 0 ? void 0 : options.title) {
                const titlePrefix = process.env.DISCORD_TITLE_PREFIX || '';
                embed.setTitle(`${titlePrefix} ${options.title}`);
            }
            // Set color based on level
            const colors = {
                info: 0x00ff00, // Green
                warning: 0xff9900, // Orange
                error: 0xff0000, // Red
            };
            embed.setColor((options === null || options === void 0 ? void 0 : options.level) ? colors[options.level] : colors.info);
            if (options === null || options === void 0 ? void 0 : options.fields) {
                embed.addFields(options.fields);
            }
            if ((0, env_1.isProduction)()) {
                await this.webhookClient.send({
                    embeds: [embed],
                });
            }
            else {
                console.log(embed);
            }
        }
        catch (error) {
            logger_1.default.error('Failed to send Discord notification', { error });
            throw error;
        }
    }
}
exports.discordNotifier = new DiscordNotificationService();
