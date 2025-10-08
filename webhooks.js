const fetch = require('node-fetch');
const config = require('../config');

class WebhookService {
  constructor() {
    this.url = config.webhook.url;
  }

  async sendPayload(data) {
    if (!this.url) return;

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      console.log('Webhook payload sent successfully');
    } catch (error) {
      console.error('Error sending webhook:', error);
    }
  }
}

module.exports = new WebhookService();
