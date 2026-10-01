import type { ReportInfo } from '@drawguess/shared';
import { ReportModel } from '../models';
import { dbReady } from './db';

export async function persistReport(report: ReportInfo, roomCode: string): Promise<void> {
  console.info(
    `[report] room=${roomCode} ${report.reporterName} -> ${report.targetName} (${report.reason})`,
  );
  if (!dbReady()) return;
  try {
    await ReportModel.create({
      roomCode,
      reporterName: report.reporterName,
      targetName: report.targetName,
      reason: report.reason,
      details: report.details,
    });
  } catch (err) {
    console.error('[report] persist failed:', (err as Error).message);
  }
}
