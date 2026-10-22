import { NextResponse } from 'next/server';
import { setupNodeIdentity } from '@/lib/nodeIdentityManager';
import { NodeSetupPayload } from '@/types/office';

export async function POST(req: Request) {
  try {
    const body: NodeSetupPayload = await req.json();

    if (!body.mnemonic || !body.companyName || !body.regionId) {
      return NextResponse.json(
        { success: false, error: 'Data setup tidak lengkap (Mnemonic, Nama Kantor, dan Region wajib diisi)' },
        { status: 400 }
      );
    }

    const result = setupNodeIdentity(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Return safe identity (strip mnemonic from response)
    const safeIdentity = { ...result.identity };
    delete safeIdentity.mnemonic;

    return NextResponse.json({
      success: true,
      identity: safeIdentity,
      message: body.mode === 'restore' 
        ? 'Perusahaan dan identitas node berhasil dipulihkan!' 
        : 'Perusahaan dan identitas node baru berhasil diinisialisasi!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menjalankan setup node' },
      { status: 500 }
    );
  }
}
