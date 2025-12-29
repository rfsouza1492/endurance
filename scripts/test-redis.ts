import { createClient } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

async function testRedis() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable is required');
    process.exit(1);
  }

  // Upstash requires rediss:// (with TLS) or redis:// with socket.tls
  const url = redisUrl.startsWith('redis://') && redisUrl.includes('upstash.io')
    ? redisUrl.replace('redis://', 'rediss://')
    : redisUrl;

  const client = createClient({
    url: url,
    socket: {
      tls: url.startsWith('rediss://'),
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Redis...');
    await client.connect();
    console.log('✅ Redis connected');

    // Test set/get
    await client.set('test:endurance', 'Hello from Endurance OS!');
    const value = await client.get('test:endurance');
    console.log(`✅ Test write/read: ${value}`);

    // Test TTL
    await client.setEx('test:ttl', 10, 'expires in 10s');
    const ttl = await client.ttl('test:ttl');
    console.log(`✅ TTL test: ${ttl} seconds remaining`);

    // Clean up
    await client.del('test:endurance', 'test:ttl');
    console.log('✅ Redis working perfectly!');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  } finally {
    await client.quit();
  }
}

testRedis();

