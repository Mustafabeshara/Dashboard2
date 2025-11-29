/**
 * Comprehensive test for local database
 */
const path = require('path');
const os = require('os');

// Set up the database path
const dbPath = path.join(os.homedir(), 'Library/Application Support/Medical Distribution Dashboard/local.db');
console.log('Database path:', dbPath);

// Check if file exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  console.error('ERROR: Database file does not exist!');
  process.exit(1);
}

console.log('Database file exists, size:', fs.statSync(dbPath).size, 'bytes');

// Test Prisma client
const { PrismaClient } = require('./node_modules/.prisma/local-client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:' + dbPath
    }
  }
});

async function runTests() {
  console.log('\n========================================');
  console.log('   LOCAL DATABASE COMPREHENSIVE TEST');
  console.log('========================================\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function test(name, passed, error = null) {
    results.tests.push({ name, passed, error });
    if (passed) {
      results.passed++;
      console.log(`✅ ${name}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}: ${error}`);
    }
  }
  
  try {
    // Test 1: Connection
    console.log('\n--- Connection Tests ---');
    try {
      await prisma.$connect();
      test('Database connection', true);
    } catch (e) {
      test('Database connection', false, e.message);
    }
    
    // Test 2: Check all tables exist
    console.log('\n--- Table Existence Tests ---');
    const tables = ['company', 'product', 'tender', 'customer', 'inventory', 'invoice', 'expense', 'user', 'session', 'offlineQueue', 'syncMetadata', 'appSettings'];
    
    for (const table of tables) {
      try {
        await prisma[table].findFirst();
        test(`Table '${table}' accessible`, true);
      } catch (e) {
        test(`Table '${table}' accessible`, false, e.message);
      }
    }
    
    // Test 3: CRUD on Company
    console.log('\n--- CRUD Tests (Company) ---');
    const testId = 'test-' + Date.now();
    
    // Create
    try {
      const created = await prisma.company.create({
        data: {
          id: testId,
          name: 'Test Company',
          type: 'manufacturer',
          syncStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      test('CREATE company', created.id === testId);
    } catch (e) {
      test('CREATE company', false, e.message);
    }
    
    // Read
    try {
      const found = await prisma.company.findUnique({ where: { id: testId } });
      test('READ company', found && found.name === 'Test Company');
    } catch (e) {
      test('READ company', false, e.message);
    }
    
    // Update
    try {
      const updated = await prisma.company.update({
        where: { id: testId },
        data: { name: 'Updated Company' }
      });
      test('UPDATE company', updated.name === 'Updated Company');
    } catch (e) {
      test('UPDATE company', false, e.message);
    }
    
    // Delete
    try {
      await prisma.company.delete({ where: { id: testId } });
      const deleted = await prisma.company.findUnique({ where: { id: testId } });
      test('DELETE company', deleted === null);
    } catch (e) {
      test('DELETE company', false, e.message);
    }
    
    // Test 4: Offline Queue
    console.log('\n--- Offline Queue Tests ---');
    const queueId = 'queue-' + Date.now();
    
    try {
      await prisma.offlineQueue.create({
        data: {
          id: queueId,
          entityType: 'Company',
          entityId: 'test-entity',
          operation: 'CREATE',
          payload: '{"test": true}',
          status: 'pending',
          createdAt: new Date()
        }
      });
      test('CREATE queue item', true);
      
      const stats = {
        pending: await prisma.offlineQueue.count({ where: { status: 'pending' } }),
        total: await prisma.offlineQueue.count()
      };
      test('COUNT queue items', stats.pending >= 1);
      
      await prisma.offlineQueue.delete({ where: { id: queueId } });
      test('DELETE queue item', true);
    } catch (e) {
      test('Offline queue operations', false, e.message);
    }
    
    // Test 5: App Settings
    console.log('\n--- App Settings Tests ---');
    const settingId = 'setting-test-' + Date.now();
    
    try {
      await prisma.appSettings.create({
        data: {
          id: settingId,
          key: 'test_setting',
          value: '{"enabled": true}',
          updatedAt: new Date()
        }
      });
      test('CREATE setting', true);
      
      await prisma.appSettings.delete({ where: { id: settingId } });
      test('DELETE setting', true);
    } catch (e) {
      test('App settings operations', false, e.message);
    }
    
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
  
  // Summary
  console.log('\n========================================');
  console.log('              SUMMARY');
  console.log('========================================');
  console.log(`Total: ${results.passed + results.failed} tests`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('========================================\n');
  
  if (results.failed > 0) {
    console.log('Failed tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }
  
  return results.failed === 0;
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
});
