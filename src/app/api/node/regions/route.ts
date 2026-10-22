import { NextResponse } from 'next/server';
import { getAvailableRegions } from '@/lib/nodeIdentityManager';

export async function GET() {
  try {
    const regions = getAvailableRegions();
    return NextResponse.json({ success: true, regions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}
