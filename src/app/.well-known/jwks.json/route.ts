import { NextResponse } from 'next/server'
import { generateJWKS } from '@/lib/oauth/utils'

// GET /.well-known/jwks.json - JSON Web Key Set endpoint
export async function GET() {
  try {
    const jwks = await generateJWKS()

    return NextResponse.json(jwks, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('JWKS endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to generate JWKS' },
      { status: 500 }
    )
  }
}
