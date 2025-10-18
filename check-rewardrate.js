import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function checkRewardRate() {
  const API_KEY = process.env.STAKEKIT_API_KEY;
  const API_BASE_URL = 'https://api.stakek.it/v2';

  try {
    const response = await axios.get(`${API_BASE_URL}/yields`, {
      headers: {
        'X-API-KEY': API_KEY,
        'Accept': 'application/json'
      },
      params: {
        limit: 5
      }
    });

    console.log('Checking rewardRate field in yields...\n');

    response.data.data.forEach((item, index) => {
      console.log(`Yield ${index + 1} (${item.id}):`);
      console.log(`  rewardRate type: ${typeof item.rewardRate}`);
      console.log(`  rewardRate value: ${JSON.stringify(item.rewardRate)}`);
      console.log(`  rewardType: ${item.rewardType}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRewardRate();