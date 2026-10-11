import { NextResponse } from 'next/server';
import {
  getCompanyTelegramStatus,
  getCompanyTelegramConfig,
  saveCompanyTelegramConfig,
  testTelegramBotToken,
  startCompanyTelegramBot,
  stopCompanyTelegramBot,
  broadcastWarRoomMessageToTelegram,
  getCompanyChatHistory,
} from '@/lib/telegramManager';
import { TelegramConfig, OfficeGroupChatMessage } from '@/types/office';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || 'company-shadowmove';

    const status = getCompanyTelegramStatus(companyId);
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengambil status Telegram' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, companyId = 'company-shadowmove', botToken, config, message } = body;

    // 1. Test Bot Token
    if (action === 'test_token') {
      if (!botToken) {
        return NextResponse.json(
          { success: false, error: 'botToken wajib diisi untuk pengetesan.' },
          { status: 400 }
        );
      }
      const testResult = await testTelegramBotToken(botToken);
      return NextResponse.json(testResult);
    }

    // 2. Save Telegram Configuration
    if (action === 'save_config') {
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Config object wajib diisi.' },
          { status: 400 }
        );
      }
      saveCompanyTelegramConfig(companyId, config as TelegramConfig);
      const status = getCompanyTelegramStatus(companyId);
      return NextResponse.json({
        success: true,
        message: 'Konfigurasi Telegram perusahaan berhasil disimpan.',
        ...status,
      });
    }

    // 3. Start Bot
    if (action === 'start_bot') {
      const result = await startCompanyTelegramBot(companyId, config);
      const status = getCompanyTelegramStatus(companyId);
      return NextResponse.json({
        ...result,
        ...status,
      });
    }

    // 4. Stop Bot
    if (action === 'stop_bot') {
      const result = await stopCompanyTelegramBot(companyId);
      const status = getCompanyTelegramStatus(companyId);
      return NextResponse.json({
        ...result,
        ...status,
      });
    }

    // 5. Broadcast Web Message to Telegram
    if (action === 'broadcast_to_telegram') {
      if (!message) {
        return NextResponse.json(
          { success: false, error: 'Pesan kosong' },
          { status: 400 }
        );
      }
      const sent = await broadcastWarRoomMessageToTelegram(
        companyId,
        message as OfficeGroupChatMessage
      );
      return NextResponse.json({ success: sent });
    }

    // 6. Get Chat History (synced from Telegram)
    if (action === 'get_chat_history') {
      const history = getCompanyChatHistory(companyId);
      return NextResponse.json({ success: true, history });
    }

    return NextResponse.json(
      { success: false, error: `Action tidak dikenal: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan pada Telegram API' },
      { status: 500 }
    );
  }
}
