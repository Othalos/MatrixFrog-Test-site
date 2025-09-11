import { NextApiRequest, NextApiResponse } from 'next'

const PEPU_RPC_URL = 'https://pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('RPC Request:', JSON.stringify(req.body, null, 2))
    
    const response = await fetch(PEPU_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    if (!response.ok) {
      console.error('RPC Response not ok:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      
      return res.status(response.status).json({
        error: `RPC request failed: ${response.status} ${response.statusText}`,
        details: errorText 
      })
    }

    const data = await response.json()
    console.log('RPC Response:', JSON.stringify(data, null, 2))

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return res.status(200).json(data)
  } catch (error) {
    console.error('RPC Proxy Error:', error)
    return res.status(500).json({
      error: 'RPC request failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
