// File: app/api/rpc/route.js

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('RPC Request received:', body);
    
    // Use environment variable or fallback to public RPC
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';
    console.log('Using RPC URL:', rpcUrl);
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('RPC Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RPC Error:', errorText);
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('RPC Response data:', data);
    
    // Return with proper headers
    return Response.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('RPC proxy error:', error);
    return Response.json(
      { 
        error: 'RPC request failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Handle other methods
export async function GET() {
  return Response.json(
    { 
      error: 'Method not allowed. Use POST for RPC calls.',
      status: 'RPC endpoint is running',
      timestamp: new Date().toISOString()
    }, 
    { status: 405 }
  );
}
