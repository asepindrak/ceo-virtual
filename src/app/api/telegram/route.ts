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
  sendSprintProgressReport,
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
      { success: false, error: err.message || 'Failed to retrieve Telegram status' },
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
          { success: false, error: 'botToken is required for testing.' },
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
          { success: false, error: 'Config object is required.' },
          { status: 400 }
        );
      }
      saveCompanyTelegramConfig(companyId, config as TelegramConfig);
      const status = getCompanyTelegramStatus(companyId);
      return NextResponse.json({
        success: true,
        message: 'Company Telegram configuration saved successfully.',
        ...status,
      });
    }

    // 3. Start Bot
    if (action === 'start_bot') {
      const result = await startCompanyTelegramBot(companyId, config, true);
      const status = getCompanyTelegramStatus(companyId);
      return NextResponse.json({
        ...result,
        ...status,
      });
    }

    // 3b. Auto-Start Bot on System Ready
    if (action === 'auto_start') {
      const status = getCompanyTelegramStatus(companyId);
      if (status.isRunning) {
        return NextResponse.json({
          success: true,
          message: 'Telegram bot is already running.',
          ...status,
        });
      }
      const existingConfig = getCompanyTelegramConfig(companyId);
      if (existingConfig && existingConfig.botToken && existingConfig.isEnabled !== false) {
        const result = await startCompanyTelegramBot(companyId, existingConfig, true);
        const updatedStatus = getCompanyTelegramStatus(companyId);
        return NextResponse.json({
          ...result,
          ...updatedStatus,
        });
      }
      return NextResponse.json({
        success: false,
        message: 'No Bot Token configured for auto-connect.',
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
          { success: false, error: 'Empty message' },
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

    // 7. Sprint Progress Report from Leader or Team Member
    if (action === 'report_sprint_progress') {
      const {
        senderAgentId,
        senderName,
        senderRoleTitle,
        senderAvatarColor,
        reportType = 'member_progress',
        taskTitle,
        progressPercent,
        message: reportMsg,
      } = body;

      const result = await sendSprintProgressReport({
        companyId,
        senderAgentId: senderAgentId || 'agent-lead',
        senderName: senderName || 'Leader',
        senderRoleTitle: senderRoleTitle || 'Team Member',
        senderAvatarColor,
        reportType,
        taskTitle: taskTitle || 'Sprint Deliverable',
        progressPercent: Number(progressPercent || 0),
        message: reportMsg || 'Update progres sprint tim.',
      });

      return NextResponse.json({ ...result });
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
