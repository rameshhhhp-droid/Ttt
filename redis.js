const Redis = require('ioredis');
const config = require('../config');

class RedisService {
  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async setIfNotExists(key, ttlSeconds) {
    const result = await this.client.setnx(key, '1');
    if (result === 1) {
      await this.client.expire(key, ttlSeconds);
      return true;
    }
    return false;
  }

  async close() {
    await this.client.quit();
  }
}

module.exports = new RedisService();
