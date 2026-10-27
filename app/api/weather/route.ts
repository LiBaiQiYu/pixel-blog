import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lon = Number(request.nextUrl.searchParams.get('lon'));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return NextResponse.json(
      { error: 'Invalid coordinates.' },
      { status: 400 }
    );
  }

  try {
    const core = await import('../../../server/weather-core.mjs');
    const config = core.getWeatherConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Weather service is not configured.' },
        { status: 503 }
      );
    }
    const data = await core.fetchWeatherForLocation(config, lat, lon);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[weather]', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather.' },
      { status: 502 }
    );
  }
}
