// api > contact > send_message > route.ts
import { IResponse } from '@/types/requests/request.type'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('request', await request?.json())

  return NextResponse.json<IResponse>({
    status: true,
    message: 'A new message has been sended to Nikita 🙂. Thank you! Good luck 😉',
  })
}
