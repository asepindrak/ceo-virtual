import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // 1. Check IP headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip') || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    // 2. If localhost or private IP, return default Jakarta or sensible fallback
    if (realIp === '127.0.0.1' || realIp === '::1' || realIp.startsWith('192.168.') || realIp.startsWith('10.')) {
      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        city: 'Jakarta',
        country: 'Indonesia',
        countryCode: 'ID',
        latitude: -6.2088,
        longitude: 106.8456,
      });
    }

    // 3. For public IP, query lightweight geo-lookup with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const geoRes = await fetch(`https://ipapi.co/${realIp}/json/`, { signal: controller.signal });
      clearTimeout(timeout);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        return NextResponse.json({
          success: true,
          source: 'ip_lookup',
          city: geoData.city || 'Jakarta',
          country: geoData.country_name || 'Indonesia',
          countryCode: geoData.country_code || 'ID',
          latitude: geoData.latitude || -6.2088,
          longitude: geoData.longitude || 106.8456,
        });
      }
    } catch (e) {
      clearTimeout(timeout);
    }

    // Default fallback
    return NextResponse.json({
      success: true,
      source: 'default_fallback',
      city: 'Jakarta',
      country: 'Indonesia',
      countryCode: 'ID',
      latitude: -6.2088,
      longitude: 106.8456,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to detect location' },
      { status: 500 }
    );
  }
}
