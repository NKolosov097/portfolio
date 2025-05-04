// api > hello > route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const greeting = 'Hello World!!'
  const json = {
    greeting,
  }

  return NextResponse.json(json)
}
