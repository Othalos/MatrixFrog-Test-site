import { NextRequest, NextResponse } from 'next/server'

const PEPU_RPC_URL = 'https://pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'

export async function GET() {
  return NextResponse.json({ message: 'RPC Proxy is running' }, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('RPC Request:', JSON.stringify(body, null, 2))
    
    const response = await fetch(PEPU_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error('RPC Response not ok:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      
      return NextResponse.json(
        { 
          error: `RPC request failed: ${response.status} ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('RPC Response:', JSON.stringify(data, null, 2))

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('RPC Proxy Error:', error)
    return NextResponse.json(
      { 
        error: 'RPC request failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
