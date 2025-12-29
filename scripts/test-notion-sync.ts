/**
 * Test script for Notion Sync Agent
 * Verifica se todos os módulos estão funcionando corretamente
 */

import { testConnection } from '../src/config/database';
import { createServer } from '../src/server';
import { startNotionSyncAgent } from '../src/agents/notion-sync-agent';
import { enqueueTask } from '../src/agents/notion-sync-agent/taskQueue';
import { appendAgentLog, createPage } from '../src/notion/write';
import { readPage, getAgentLogPage } from '../src/notion/read';
import dotenv from 'dotenv';

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Notion Sync Agent Tests...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: '✅' | '❌'; message: string }>,
  };

  function test(name: string, fn: () => Promise<void> | void) {
    return async () => {
      try {
        await fn();
        results.passed++;
        results.tests.push({ name, status: '✅', message: 'Passed' });
        console.log(`✅ ${name}`);
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : String(error);
        results.tests.push({ name, status: '❌', message });
        console.error(`❌ ${name}: ${message}`);
      }
    };
  }

  // Test 1: Database connection
  await test('Database connection', async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
  })();

  // Test 2: Server creation
  await test('Server creation', () => {
    const app = createServer();
    if (!app) {
      throw new Error('Server creation failed');
    }
  })();

  // Test 3: Notion module imports
  await test('Notion module imports', () => {
    // Verifica se as funções podem ser importadas
    if (typeof appendAgentLog !== 'function') {
      throw new Error('appendAgentLog is not a function');
    }
    if (typeof createPage !== 'function') {
      throw new Error('createPage is not a function');
    }
    if (typeof readPage !== 'function') {
      throw new Error('readPage is not a function');
    }
    if (typeof getAgentLogPage !== 'function') {
      throw new Error('getAgentLogPage is not a function');
    }
  })();

  // Test 4: Notion write functions (placeholder mode)
  await test('Notion write functions (placeholder)', async () => {
    // Testa createPage em modo placeholder
    const pageId = await createPage('test-agent', 'Test Page', {});
    if (!pageId || !pageId.startsWith('page-')) {
      throw new Error('createPage did not return valid pageId');
    }

    // Testa appendAgentLog em modo placeholder
    await appendAgentLog('test-agent', pageId, 'Test log entry');
  })();

  // Test 5: Notion read functions (placeholder mode)
  await test('Notion read functions (placeholder)', async () => {
    const page = await readPage('test-page-id');
    if (!page || !page.id) {
      throw new Error('readPage did not return valid page');
    }

    const logPage = await getAgentLogPage('test-agent');
    // Em modo placeholder, pode retornar null
  })();

  // Test 6: Task queue functions
  await test('Task queue functions', async () => {
    // Verifica se enqueueTask pode ser importada
    if (typeof enqueueTask !== 'function') {
      throw new Error('enqueueTask is not a function');
    }

    // Tenta enfileirar uma tarefa (pode falhar se tabela não existir)
    try {
      const taskId = await enqueueTask({
        type: 'create',
        content: 'Test task',
        sourceAgentId: 'test-agent',
        priority: 'normal',
      });
      if (!taskId) {
        throw new Error('enqueueTask did not return taskId');
      }
      console.log(`   → Task enqueued with ID: ${taskId}`);
    } catch (error) {
      // Se a tabela não existir, é esperado
      if (error instanceof Error && error.message.includes('relation "notion_sync_tasks" does not exist')) {
        console.log('   ⚠️  Table notion_sync_tasks does not exist. Run migration first.');
        throw new Error('Migration required: Run psql $DATABASE_URL -f migrations/001_create_notion_sync_tasks.sql');
      }
      throw error;
    }
  })();

  // Test 7: Notion Sync Agent start
  await test('Notion Sync Agent start function', () => {
    if (typeof startNotionSyncAgent !== 'function') {
      throw new Error('startNotionSyncAgent is not a function');
    }
    // Não inicia o agent aqui, apenas verifica se a função existe
  })();

  // Test 8: MCP client functions
  await test('MCP client functions', async () => {
    const { createPageMCP, updatePageMCP, fetchPageMCP, searchPagesMCP } = await import('../src/notion/mcpClient');
    
    if (typeof createPageMCP !== 'function') {
      throw new Error('createPageMCP is not a function');
    }
    if (typeof updatePageMCP !== 'function') {
      throw new Error('updatePageMCP is not a function');
    }
    if (typeof fetchPageMCP !== 'function') {
      throw new Error('fetchPageMCP is not a function');
    }
    if (typeof searchPagesMCP !== 'function') {
      throw new Error('searchPagesMCP is not a function');
    }
  })();

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.passed + results.failed}\n`);

  if (results.failed > 0) {
    console.log('❌ Some tests failed:\n');
    results.tests
      .filter(t => t.status === '❌')
      .forEach(t => {
        console.log(`   ${t.status} ${t.name}: ${t.message}`);
      });
    process.exit(1);
  }

  console.log('✅ All tests passed!\n');
  console.log('📝 Next steps:');
  console.log('1. Run migration: psql $DATABASE_URL -f migrations/001_create_notion_sync_tasks.sql');
  console.log('2. Start server: npm run dev');
  console.log('3. Test API: curl -X POST http://localhost:3000/notion-sync/tasks \\');
  console.log('   -H "Content-Type: application/json" \\');
  console.log('   -H "x-agent-id: test-agent" \\');
  console.log('   -H "x-agent-state: active" \\');
  console.log('   -d \'{"type":"create","content":"Test task"}\'');
}

runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

