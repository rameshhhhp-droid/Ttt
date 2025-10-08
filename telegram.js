const { Telegraf } = require('telegraf');
const config = require('../config');

class TelegramService {
  constructor() {
    if (config.telegram.token && config.telegram.chatId) {
      this.bot = new Telegraf(config.telegram.token);
      this.chatId = config.telegram.chatId;
      console.log('Telegram bot initialized');
    } else {
      console.log('Telegram not configured');
    }
  }

  async sendNotification(data) {
    if (!this.bot) return;

    try {
      const message = `
🚨 *Unlimited Approval Detected*

🔹 *Owner:* \`${data.owner}\`
🔹 *Spender:* \`${data.spender}\`
🔹 *Allowance:* ${data.allowanceHuman} (${data.unlimitedFlag ? 'UNLIMITED' : ''})
🔹 *Balance:* ${data.balanceHuman}
🔹 *Will Cover:* ${data.willCover ? '✅ Yes' : '❌ No'}
🔹 *Block:* ${data.blockNumber}
🔹 *Confirmed:* ${data.confirmedAt.toLocaleString()}

[${data.txHash.substring(0, 10)}...](${data.explorerLink})
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: 'Open Admin', url: `http://localhost:${config.app.port}` },
            { text: 'Mark Processed', callback_data: `mark_${data.txHash}` }
          ]
        ]
      };

      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log('Telegram notification sent');
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }
}

module.exports = new TelegramService();
