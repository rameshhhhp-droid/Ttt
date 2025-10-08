require('dotenv').config();

module.exports = {
  rpc: {
    wss: process.env.RPC_PROVIDER_WSS,
    http: process.env.RPC_PROVIDER_HTTP
  },
  addresses: {
    token: process.env.TOKEN_ADDRESS,
    spender: process.env.SPENDER_ADDRESS
  },
  database: {
    mongodbUri: process.env.MONGODB_URI
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  },
  telegram: {
    token: process.env.TLEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  },
  webhook: {
    url: process.env.WEBHOOK_URL
  },
  app: {
    port: process.env.PORT || 3000,
    confirmations: parseInt(process.env.CONFIRMATIONS) || 3,
    dedupeTtlSeconds: parseInt(process.env.DEDUPE_TTL_SECONDS) || 86400,
    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS) || 30000,
    pollingChunkSize: parseInt(process.env.POLLING_CHUNK_SIZE) || 1000,
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH
  },
  token: {
    decimals: parseInt(process.env.TOKEN_DECIMALS) || 6
  }
};
