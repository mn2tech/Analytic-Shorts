// Manual test script to check USASpending API format.
// Run with: node test-usaspending-api.js
//
// Note: This is NOT a unit test. It is excluded from `node --test` runs.
const axios = require('axios')

async function testUSASpendingAPI() {
  const apiUrl = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'
  
  // Try a minimal request - award_type_codes is REQUIRED
  const requestBody = {
    filters: {
      time_period: [
        {
          start_date: '2023-10-01',
          end_date: '2024-09-30'
        }
      ],
      award_type_codes: ['A', 'C'] // Required: 'A' = grants, 'C' = contracts
    },
    fields: [
      'award_id',
      'total_obligation',
      'action_date',
      'recipient_name'
    ],
    page: 1,
    limit: 10
  }
  
  try {
    console.log('Testing USASpending API...')
    console.log('Request:', JSON.stringify(requestBody, null, 2))
    
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    })
    
    console.log('Success!')
    console.log('Status:', response.status)
    console.log('Response keys:', Object.keys(response.data))
    console.log('Number of results:', response.data.results?.length || 0)
    if (response.data.results && response.data.results.length > 0) {
      console.log('First result keys:', Object.keys(response.data.results[0]))
      console.log('First result sample:', JSON.stringify(response.data.results[0], null, 2))
    }
  } catch (error) {
    console.error('Error:', error.message)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Error data:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

testUSASpendingAPI()

