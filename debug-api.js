import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testAPI() {
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

    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(response.data));
    console.log('Has "data" field:', 'data' in response.data);
    console.log('Has "items" field:', 'items' in response.data);

    if (response.data.data) {
      console.log('Data is array:', Array.isArray(response.data.data));
      console.log('Data length:', response.data.data.length);
      if (response.data.data.length > 0) {
        console.log('First item keys:', Object.keys(response.data.data[0]));
      }
    }

    console.log('\nFull response (first 500 chars):');
    console.log(JSON.stringify(response.data, null, 2).slice(0, 500));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();