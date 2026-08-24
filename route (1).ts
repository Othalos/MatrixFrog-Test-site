// File: app/api/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://rpc-pepu-v2-mainnet-0.t.conduit.xyz';

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    // Return raw text — do NOT call response.json() here.
    // Batch RPC responses are JSON arrays; single responses are JSON objects.
    // Both work fine as raw text. Calling .json() on a batch then re-serializing
    // can corrupt the array structure and causes 500s.
    const text = await response.text();

    return new NextResponse(text, {
      status: response.ok ? 200 : response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('RPC proxy error:', error);
    return NextResponse.json(
      { error: 'RPC request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'RPC proxy running',
      network: 'PEPU v2 Mainnet (Chain ID: 97741)',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://rpc-pepu-v2-mainnet-0.t.conduit.xyz',
    },
    { status: 200 }
  );
}
