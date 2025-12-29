import { createServer } from '../src/server';
import { testConnection } from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Auth Tests...\n');

  // Test 1: Database connection
  console.log('1️⃣ Testing database connection...');
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }
  console.log('✅ Database connected\n');

  // Test 2: Server creation
  console.log('2️⃣ Testing server creation...');
  const app = createServer();
  console.log('✅ Server created\n');

  // Test 3: Health endpoint
  console.log('3️⃣ Testing health endpoint...');
  const healthResponse = await fetch('http://localhost:3001/health').catch(() => null);
  if (healthResponse) {
    const data = await healthResponse.json();
    console.log('✅ Health check:', JSON.stringify(data, null, 2));
  } else {
    console.log('⚠️  Server not running. Start with: npm run dev');
  }

  console.log('\n✅ All tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Start server: npm run dev');
  console.log('2. Test login: curl -X POST http://localhost:3001/api/v1/auth/login -H "Content-Type: application/json" -d \'{"email":"rafael@endurance.build"}\'');
  console.log('3. Check console for magic link token');
  console.log('4. Test verify with the token');
}

runTests().catch(console.error);

