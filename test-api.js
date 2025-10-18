import fetch from 'node-fetch';

async function test() {
  const API_KEY = process.env.STAKEKIT_API_KEY;

  const response = await fetch('https://api.stakek.it/v2/yields?limit=2', {
    headers: {
      'X-API-KEY': API_KEY,
      'Accept': 'application/json'
    }
  });

  const data = await response.json();

  console.log('Response structure:', JSON.stringify(Object.keys(data)));
  console.log('Has data field:', 'data' in data);
  console.log('Has items field:', 'items' in data);
  console.log('Data is array:', Array.isArray(data.data));
  console.log('First item sample:', JSON.stringify(data.data?.[0], null, 2).slice(0, 200));
  console.log('Full response keys:', Object.keys(data));
}

test().catch(console.error);