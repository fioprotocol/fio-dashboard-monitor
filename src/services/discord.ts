import { WebhookClient, EmbedBuilder } from 'discord.js';
import logger from '../config/logger';
import { isProduction } from '../utils/env';

class DiscordNotificationService {
  private webhookClient: WebhookClient;

  constructor() {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('DISCORD_WEBHOOK_URL is not defined in environment variables');
    }
    this.webhookClient = new WebhookClient({ url: webhookUrl });
  }

  async sendNotification(
    message: string,
    options?: {
      title?: string;
      level?: 'info' | 'warning' | 'error';
      fields?: { name: string; value: string; inline?: boolean }[];
    },
  ) {
    try {
      const embed = new EmbedBuilder().setDescription(message).setTimestamp();

      if (options?.title) {
        const titlePrefix = process.env.DISCORD_TITLE_PREFIX || '';
        embed.setTitle(`${titlePrefix} ${options.title}`);
      }

      // Set color based on level
      const colors = {
        info: 0x00ff00,    // Green
        warning: 0xff9900,  // Orange
        error: 0xff0000,    // Red
      };
      embed.setColor(options?.level ? colors[options.level] : colors.info);

      if (options?.fields) {
        embed.addFields(options.fields);
      }

      if (isProduction()) {
        await this.webhookClient.send({
          embeds: [embed],
        });
      } else {
        console.log(embed);
      }
    } catch (error) {
      logger.error('Failed to send Discord notification', { error });
      throw error;
    }
  }
}

export const discordNotifier = new DiscordNotificationService();
