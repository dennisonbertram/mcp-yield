import { stakeKitYieldListResponseSchema } from './dist/types/stakekit.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testSchemaValidation() {
  const API_KEY = process.env.STAKEKIT_API_KEY;
  const API_BASE_URL = 'https://api.stakek.it/v2';

  try {
    const response = await axios.get(`${API_BASE_URL}/yields`, {
      headers: {
        'X-API-KEY': API_KEY,
        'Accept': 'application/json'
      },
      params: {
        limit: 2
      }
    });

    console.log('API Response received...');
    console.log('Response keys:', Object.keys(response.data));

    // Try to parse with our schema
    console.log('\nTrying to parse with our schema...');
    try {
      const parsed = stakeKitYieldListResponseSchema.parse(response.data);
      console.log('✅ Schema validation PASSED!');
      console.log('Parsed data has', parsed.data.length, 'items');
      console.log('First item ID:', parsed.data[0]?.id);
    } catch (zodError) {
      console.error('❌ Schema validation FAILED!');
      console.error('Zod error:', JSON.stringify(zodError.errors, null, 2));
    }
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

testSchemaValidation();