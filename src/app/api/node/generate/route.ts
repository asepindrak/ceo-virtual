import { NextResponse } from 'next/server';
import { generateMnemonic, deriveAddressAndKeys } from '@/lib/nodeIdentityManager';

export async function POST() {
  try {
    const mnemonic = generateMnemonic(12);
    const { address, publicKey } = deriveAddressAndKeys(mnemonic);

    return NextResponse.json({
      success: true,
      mnemonic,
      address,
      publicKey,
      createdAt: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate identity' },
      { status: 500 }
    );
  }
}
