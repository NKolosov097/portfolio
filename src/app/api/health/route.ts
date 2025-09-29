import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Простая проверка здоровья приложения
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    }

    return NextResponse.json(healthCheck, { status: 200 })
  } catch (error) {
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function HEAD() {
  // Для простых health checks без body
  return new NextResponse(null, { status: 200 })
}
