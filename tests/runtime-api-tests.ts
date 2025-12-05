/**
 * Runtime API Tests
 * Tests that require the actual server to be running
 * Run these tests with the server running: npm run dev
 */

interface TestResult {
  module: string;
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'AUTH_REQUIRED';
  statusCode?: number;
  message?: string;
}

const results: TestResult[] = [];
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testEndpoint(
  module: string,
  endpoint: string,
  method: string = 'GET',
  requiresAuth: boolean = true
): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result: TestResult = {
      module,
      endpoint,
      method,
      statusCode: response.status,
      status: 'FAIL',
    };

    if (requiresAuth && response.status === 401) {
      result.status = 'AUTH_REQUIRED';
      result.message = 'Authentication required (expected)';
    } else if (response.status === 200 || response.status === 201) {
      result.status = 'PASS';
      result.message = 'Success';
    } else if (response.status === 404) {
      result.status = 'FAIL';
      result.message = 'Endpoint not found';
    } else if (response.status === 405) {
      result.status = 'FAIL';
      result.message = 'Method not allowed';
    } else {
      result.message = `Unexpected status: ${response.status}`;
    }

    return result;
  } catch (err) {
    return {
      module,
      endpoint,
      method,
      status: 'FAIL',
      message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('Dashboard2 Application - Runtime API Tests');
  console.log('='.repeat(80) + '\n');

  console.log(`${colors.cyan}Testing server at: ${BASE_URL}${colors.reset}\n`);

  // Check if server is running
  console.log('Checking if server is running...');
  try {
    const response = await fetch(BASE_URL);
    if (response.ok || response.status === 401) {
      console.log(`${colors.green}✓ Server is running${colors.reset}\n`);
    } else {
      console.log(
        `${colors.red}✗ Server returned status: ${response.status}${colors.reset}\n`
      );
    }
  } catch {
    console.log(
      `${colors.red}✗ Server not running at ${BASE_URL}${colors.reset}`
    );
    console.log(`${colors.yellow}Start server with: npm run dev${colors.reset}\n`);
    process.exit(1);
  }

  // Test Authentication
  console.log(`${colors.blue}Testing Authentication Module...${colors.reset}`);
  results.push(await testEndpoint('Authentication', '/api/auth/providers', 'GET', false));
  results.push(await testEndpoint('Authentication', '/api/auth/csrf', 'GET', false));
  results.push(await testEndpoint('Authentication', '/api/auth/session', 'GET', false));

  // Test Health & Diagnostics
  console.log(`${colors.blue}Testing Health & Diagnostics...${colors.reset}`);
  results.push(await testEndpoint('Health', '/api/health', 'GET', false));
  results.push(await testEndpoint('Diagnostics', '/api/diagnostics', 'GET', true));

  // Test Dashboard
  console.log(`${colors.blue}Testing Dashboard Module...${colors.reset}`);
  results.push(await testEndpoint('Dashboard', '/api/dashboard/stats', 'GET', true));

  // Test Budget Management
  console.log(`${colors.blue}Testing Budget Management...${colors.reset}`);
  results.push(await testEndpoint('Budgets', '/api/budgets', 'GET', true));
  results.push(await testEndpoint('Budget Categories', '/api/budgets/categories', 'GET', true));

  // Test Tender Management
  console.log(`${colors.blue}Testing Tender Management...${colors.reset}`);
  results.push(await testEndpoint('Tenders', '/api/tenders', 'GET', true));
  results.push(await testEndpoint('Tender Stats', '/api/tenders/stats', 'GET', true));
  results.push(await testEndpoint('Tender Analytics', '/api/tenders/analytics', 'GET', true));

  // Test Customer Management
  console.log(`${colors.blue}Testing Customer Management...${colors.reset}`);
  results.push(await testEndpoint('Customers', '/api/customers', 'GET', true));

  // Test Inventory Management
  console.log(`${colors.blue}Testing Inventory Management...${colors.reset}`);
  results.push(await testEndpoint('Inventory', '/api/inventory', 'GET', true));

  // Test Expense Management
  console.log(`${colors.blue}Testing Expense Management...${colors.reset}`);
  results.push(await testEndpoint('Expenses', '/api/expenses', 'GET', true));

  // Test Invoice Management
  console.log(`${colors.blue}Testing Invoice Management...${colors.reset}`);
  results.push(await testEndpoint('Invoices', '/api/invoices', 'GET', true));

  // Test Document Management
  console.log(`${colors.blue}Testing Document Management...${colors.reset}`);
  results.push(await testEndpoint('Documents', '/api/documents', 'GET', true));

  // Test Supplier Management
  console.log(`${colors.blue}Testing Supplier Management...${colors.reset}`);
  results.push(await testEndpoint('Suppliers', '/api/suppliers', 'GET', true));

  // Test Reports
  console.log(`${colors.blue}Testing Reports...${colors.reset}`);
  results.push(await testEndpoint('Reports', '/api/reports', 'GET', true));
  results.push(await testEndpoint('Export', '/api/export', 'GET', true));

  // Test Admin Module
  console.log(`${colors.blue}Testing Admin Module...${colors.reset}`);
  results.push(await testEndpoint('Admin Users', '/api/admin/users', 'GET', true));
  results.push(await testEndpoint('Admin API Keys', '/api/admin/api-keys', 'GET', true));
  results.push(await testEndpoint('Admin Settings', '/api/admin/settings', 'GET', true));
  results.push(await testEndpoint('Admin Metrics', '/api/admin/metrics', 'GET', true));

  // Test AI & Forecasting
  console.log(`${colors.blue}Testing AI & Forecasting...${colors.reset}`);
  results.push(await testEndpoint('AI Usage', '/api/ai/usage', 'GET', true));
  results.push(await testEndpoint('Test AI', '/api/test-ai', 'GET', true));

  // Test Settings
  console.log(`${colors.blue}Testing Settings...${colors.reset}`);
  results.push(await testEndpoint('User Preferences', '/api/user/preferences', 'GET', true));
  results.push(await testEndpoint('Company Profile', '/api/company/profile', 'GET', true));

  // Test Utilities
  console.log(`${colors.blue}Testing Utilities...${colors.reset}`);
  results.push(await testEndpoint('Currencies', '/api/currencies', 'GET', true));

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('Test Results Summary');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const authRequired = results.filter((r) => r.status === 'AUTH_REQUIRED').length;
  const total = results.length;

  // Group by module
  const byModule: { [key: string]: TestResult[] } = {};
  results.forEach((result) => {
    if (!byModule[result.module]) {
      byModule[result.module] = [];
    }
    byModule[result.module].push(result);
  });

  // Print detailed results
  Object.keys(byModule).forEach((module) => {
    console.log(`\n${colors.cyan}${module}${colors.reset}`);
    console.log('-'.repeat(80));

    byModule[module].forEach((result) => {
      const statusColor =
        result.status === 'PASS'
          ? colors.green
          : result.status === 'AUTH_REQUIRED'
            ? colors.yellow
            : colors.red;
      const statusSymbol =
        result.status === 'PASS'
          ? '✓'
          : result.status === 'AUTH_REQUIRED'
            ? '🔒'
            : '✗';

      console.log(
        `  ${statusColor}${statusSymbol}${colors.reset} ${result.method} ${result.endpoint} - ${result.status}${result.statusCode ? ` (${result.statusCode})` : ''}`
      );
      if (result.message && result.status === 'FAIL') {
        console.log(`    ${colors.red}${result.message}${colors.reset}`);
      }
    });
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Overall Summary');
  console.log('='.repeat(80));
  console.log(
    `${colors.green}✓ Passed (Working): ${passed}${colors.reset}`
  );
  console.log(
    `${colors.yellow}🔒 Auth Required (Protected): ${authRequired}${colors.reset}`
  );
  console.log(
    `${colors.red}✗ Failed (Not Working): ${failed}${colors.reset}`
  );
  console.log(`Total Endpoints Tested: ${total}`);
  console.log('='.repeat(80) + '\n');

  // Working vs Not Working
  console.log(`${colors.cyan}Working Features:${colors.reset}`);
  console.log(
    `- ${passed} public endpoints are working`
  );
  console.log(
    `- ${authRequired} protected endpoints require authentication (as expected)`
  );
  console.log(
    `- Total working: ${passed + authRequired} / ${total} (${Math.round(((passed + authRequired) / total) * 100)}%)\n`
  );

  if (failed > 0) {
    console.log(`${colors.red}Not Working Features:${colors.reset}`);
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((result) => {
        console.log(`- ${result.module}: ${result.method} ${result.endpoint}`);
        if (result.message) {
          console.log(`  Reason: ${result.message}`);
        }
      });
  } else {
    console.log(`${colors.green}All tested endpoints are functioning correctly!${colors.reset}\n`);
  }

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Test execution failed:${colors.reset}`, error);
  process.exit(1);
});
