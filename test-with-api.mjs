#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config();

const API_KEY = process.env.STAKEKIT_API_KEY;
if (!API_KEY) {
  console.error('ERROR: STAKEKIT_API_KEY not found in .env file');
  process.exit(1);
}

console.log('Starting MCP server test with VALID API key...\n');

// Test results collector
const results = {
  timestamp: new Date().toISOString(),
  apiKey: API_KEY.substring(0, 8) + '...',
  totalTests: 0,
  successful: 0,
  failed: 0,
  tools: [],
  responseTimes: [],
  errors: [],
  discoveries: {
    networks: new Set(),
    types: new Set(),
    categories: new Set(),
    protocols: new Set(),
    tokenSymbols: new Set()
  }
};

async function testTool(client, toolName, params, description) {
  console.log(`\nTesting: ${toolName}`);
  console.log(`  Params: ${JSON.stringify(params)}`);
  console.log(`  Description: ${description}`);

  const startTime = Date.now();
  const testResult = {
    tool: toolName,
    description,
    params,
    timestamp: new Date().toISOString(),
    responseTime: 0,
    success: false,
    error: null,
    dataQuality: {
      structureQuality: 0,
      dataCompleteness: 0,
      dataAccuracy: 'Cannot Verify',
      llmUsability: 0,
      performance: 'Poor'
    },
    response: null,
    keyFields: [],
    issues: [],
    positives: []
  };

  try {
    const response = await client.callTool({
      name: toolName,
      arguments: params
    });

    const responseTime = Date.now() - startTime;
    testResult.responseTime = responseTime;
    results.responseTimes.push(responseTime);

    // Evaluate performance
    if (responseTime < 2000) testResult.dataQuality.performance = 'Good';
    else if (responseTime < 5000) testResult.dataQuality.performance = 'Fair';
    else testResult.dataQuality.performance = 'Poor';

    console.log(`  Response time: ${responseTime}ms [${testResult.dataQuality.performance}]`);

    if (response.isError) {
      testResult.error = response.content[0]?.text || 'Unknown error';
      console.log(`  ERROR: ${testResult.error}`);
      results.failed++;
      results.errors.push({
        tool: toolName,
        params,
        error: testResult.error
      });
    } else {
      testResult.success = true;
      results.successful++;

      // Parse and analyze response
      const responseText = response.content[0]?.text || '';
      console.log(`  Success! Response length: ${responseText.length} chars`);

      try {
        const data = JSON.parse(responseText);
        testResult.response = data;

        // Analyze response structure and extract valuable data
        analyzeResponse(data, testResult, results.discoveries);

        // Show sample data
        const sample = JSON.stringify(data, null, 2).split('\n').slice(0, 20).join('\n');
        console.log(`  Sample response:\n${sample}${JSON.stringify(data, null, 2).split('\n').length > 20 ? '\n  ...(truncated)' : ''}`);

      } catch (parseError) {
        testResult.issues.push('Response is not valid JSON');
        console.log(`  Warning: Response is not JSON: ${responseText.substring(0, 200)}`);
      }
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    testResult.responseTime = responseTime;
    testResult.error = error.message;
    console.log(`  EXCEPTION: ${error.message} (${responseTime}ms)`);
    results.failed++;
    results.errors.push({
      tool: toolName,
      params,
      error: error.message
    });
  }

  results.totalTests++;
  results.tools.push(testResult);
}

function analyzeResponse(data, testResult, discoveries) {
  // Structure quality evaluation
  testResult.dataQuality.structureQuality = evaluateStructure(data);

  // Data completeness evaluation
  testResult.dataQuality.dataCompleteness = evaluateCompleteness(data);

  // LLM usability evaluation
  testResult.dataQuality.llmUsability = evaluateLLMUsability(data);

  // Extract key fields and discover enum values
  extractKeyFields(data, testResult, discoveries);

  // Identify issues and positives
  identifyQualityIssues(data, testResult);
}

function evaluateStructure(data) {
  let score = 10;

  // Check if response is an object or array
  if (typeof data !== 'object') score -= 3;

  // Check for consistent field naming
  const fields = getAllFields(data);
  const hasInconsistentCasing = fields.some(f => f.includes('_')) && fields.some(f => /[A-Z]/.test(f));
  if (hasInconsistentCasing) score -= 2;

  // Check nesting depth (very deep = harder to use)
  const depth = getMaxDepth(data);
  if (depth > 5) score -= 1;

  return Math.max(1, score);
}

function evaluateCompleteness(data) {
  let score = 10;

  // Check for null/empty fields
  const emptyCount = countEmptyFields(data);
  const totalFields = countTotalFields(data);

  if (totalFields === 0) return 1;

  const emptyRatio = emptyCount / totalFields;
  score -= Math.floor(emptyRatio * 5);

  return Math.max(1, score);
}

function evaluateLLMUsability(data) {
  let score = 10;

  // Prefer arrays with metadata
  if (Array.isArray(data) && data.length === 0) score -= 3;

  // Check for descriptive field names
  const fields = getAllFields(data);
  const hasDescriptiveNames = fields.some(f => f.length > 2);
  if (!hasDescriptiveNames) score -= 2;

  // Check for human-readable values (not just IDs)
  const hasDescriptions = hasDescriptiveContent(data);
  if (!hasDescriptions) score -= 2;

  return Math.max(1, score);
}

function extractKeyFields(data, testResult, discoveries) {
  if (Array.isArray(data)) {
    testResult.keyFields.push(`Array with ${data.length} items`);
    if (data.length > 0) {
      const firstItem = data[0];
      const fields = Object.keys(firstItem || {});
      testResult.keyFields.push(`Item fields: ${fields.join(', ')}`);

      // Extract enum discoveries
      data.forEach(item => discoverEnums(item, discoveries));
    }
  } else if (typeof data === 'object' && data !== null) {
    const topFields = Object.keys(data);
    testResult.keyFields.push(`Top-level fields: ${topFields.join(', ')}`);

    // Sample values for key fields
    topFields.slice(0, 5).forEach(field => {
      const value = data[field];
      const preview = typeof value === 'object'
        ? `{${Object.keys(value).length} keys}`
        : String(value).substring(0, 50);
      testResult.keyFields.push(`${field}: ${preview}`);
    });

    discoverEnums(data, discoveries);
  }
}

function discoverEnums(obj, discoveries) {
  if (typeof obj !== 'object' || obj === null) return;

  // Look for network/chain identifiers
  ['network', 'networkId', 'chain', 'chainId'].forEach(key => {
    if (obj[key] && typeof obj[key] === 'string') {
      discoveries.networks.add(obj[key]);
    }
  });

  // Look for types
  if (obj.type && typeof obj.type === 'string') {
    discoveries.types.add(obj.type);
  }

  // Look for categories
  if (obj.category && typeof obj.category === 'string') {
    discoveries.categories.add(obj.category);
  }

  // Look for protocols
  if (obj.protocol && typeof obj.protocol === 'string') {
    discoveries.protocols.add(obj.protocol);
  }
  if (obj.protocolId && typeof obj.protocolId === 'string') {
    discoveries.protocols.add(obj.protocolId);
  }

  // Look for token symbols
  if (obj.symbol && typeof obj.symbol === 'string') {
    discoveries.tokenSymbols.add(obj.symbol);
  }
  if (obj.tokenSymbol && typeof obj.tokenSymbol === 'string') {
    discoveries.tokenSymbols.add(obj.tokenSymbol);
  }

  // Recurse into nested objects and arrays
  Object.values(obj).forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(item => discoverEnums(item, discoveries));
    } else if (typeof value === 'object') {
      discoverEnums(value, discoveries);
    }
  });
}

function identifyQualityIssues(data, testResult) {
  // Check for missing expected pagination metadata
  if (Array.isArray(data)) {
    testResult.issues.push('Response is raw array without pagination metadata');
  }

  // Check for useful metadata
  if (typeof data === 'object' && data !== null) {
    if (data.data || data.items || data.results) {
      testResult.positives.push('Response includes proper data wrapping');
    }
    if (data.pagination || data.total || data.hasMore) {
      testResult.positives.push('Response includes pagination metadata');
    }
  }

  // Check for empty results
  if (Array.isArray(data) && data.length === 0) {
    testResult.issues.push('Response returned empty array - check if expected');
  }
}

// Helper functions
function getAllFields(obj, prefix = '') {
  if (typeof obj !== 'object' || obj === null) return [];
  const fields = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    fields.push(fullKey);
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      fields.push(...getAllFields(obj[key], fullKey));
    }
  }
  return fields;
}

function getMaxDepth(obj, currentDepth = 0) {
  if (typeof obj !== 'object' || obj === null) return currentDepth;
  const depths = Object.values(obj).map(v => getMaxDepth(v, currentDepth + 1));
  return Math.max(currentDepth, ...depths);
}

function countEmptyFields(obj) {
  if (typeof obj !== 'object' || obj === null) return 0;
  let count = 0;
  for (const value of Object.values(obj)) {
    if (value === null || value === undefined || value === '') count++;
    if (typeof value === 'object' && value !== null) {
      count += countEmptyFields(value);
    }
  }
  return count;
}

function countTotalFields(obj) {
  if (typeof obj !== 'object' || obj === null) return 0;
  let count = Object.keys(obj).length;
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      count += countTotalFields(value);
    }
  }
  return count;
}

function hasDescriptiveContent(obj) {
  if (typeof obj !== 'object' || obj === null) return false;
  return Object.keys(obj).some(k =>
    k.includes('description') ||
    k.includes('name') ||
    k.includes('title')
  );
}

// Main test execution
async function runTests() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: {
      ...process.env,
      STAKEKIT_API_KEY: API_KEY
    }
  });

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log('Connected to MCP server\n');

    // Priority test cases
    await testTool(client, 'get-yield-opportunities', {}, 'Basic discovery - default pagination');
    await testTool(client, 'get-yield-opportunities', { limit: 5, network: 'ethereum' }, 'Filter by ethereum network');
    await testTool(client, 'get-yield-opportunities', { limit: 3, type: 'staking' }, 'Filter by staking type');

    // Try to get a specific yield (we'll use data from previous response if available)
    await testTool(client, 'list-supported-chains', {}, 'Get all supported chains');
    await testTool(client, 'list-supported-chains', { includeTestnets: false }, 'Get only mainnets');

    await testTool(client, 'list-supported-tokens', { limit: 10 }, 'Get supported tokens');
    await testTool(client, 'list-supported-tokens', { limit: 5, networkId: 'ethereum' }, 'Get ethereum tokens');

    await testTool(client, 'get-staking-yields', { limit: 5 }, 'Get staking yields');
    await testTool(client, 'get-staking-yields', { limit: 5, includeLiquid: true }, 'Get staking including liquid');

    await testTool(client, 'get-top-yields', { limit: 5 }, 'Get top 5 yields');
    await testTool(client, 'get-top-yields', { limit: 3, minTvlUsd: 1000000 }, 'Get top yields with min TVL');

    await testTool(client, 'get-yields-by-network', { networkId: 'ethereum', limit: 5 }, 'Get ethereum yields');

    await testTool(client, 'get-yields-by-token', { tokenSymbol: 'ETH', limit: 5 }, 'Get ETH yields');

    // Test the error case we found in previous report
    await testTool(client, 'get-token-details', {}, 'Test error message bug - no params');
    await testTool(client, 'get-token-details', { symbol: 'ETH' }, 'Get ETH token details by symbol');

    await testTool(client, 'list-protocols', {}, 'List all protocols');

    console.log('\n\n=== TEST SUMMARY ===');
    console.log(`Total tests: ${results.totalTests}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);

    if (results.responseTimes.length > 0) {
      const avg = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
      const max = Math.max(...results.responseTimes);
      const min = Math.min(...results.responseTimes);
      console.log(`\nResponse Times:`);
      console.log(`  Average: ${avg.toFixed(0)}ms`);
      console.log(`  Min: ${min}ms`);
      console.log(`  Max: ${max}ms`);
    }

    console.log(`\nDiscovered Enum Values:`);
    console.log(`  Networks: ${results.discoveries.networks.size} unique values`);
    console.log(`  Types: ${results.discoveries.types.size} unique values`);
    console.log(`  Categories: ${results.discoveries.categories.size} unique values`);
    console.log(`  Protocols: ${results.discoveries.protocols.size} unique values`);
    console.log(`  Token Symbols: ${results.discoveries.tokenSymbols.size} unique values`);

    // Save detailed results
    const outputPath = '/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/test-results-with-api.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      ...results,
      discoveries: {
        networks: Array.from(results.discoveries.networks),
        types: Array.from(results.discoveries.types),
        categories: Array.from(results.discoveries.categories),
        protocols: Array.from(results.discoveries.protocols),
        tokenSymbols: Array.from(results.discoveries.tokenSymbols)
      }
    }, null, 2));
    console.log(`\nDetailed results saved to: ${outputPath}`);

    await client.close();

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

runTests().catch(console.error);
