import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Real-time Code Editor API is running on Vercel',
    version: '1.0.0'
  });
}
