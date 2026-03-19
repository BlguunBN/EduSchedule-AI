/**
 * clear-mock-logs.ts
 *
 * Safe one-shot script to purge MOCK provider email processing logs and any
 * orphaned ScheduleChange rows whose source was created during mock dev runs.
 *
 * Usage:
 *   npx tsx scripts/clear-mock-logs.ts [--dry-run]
 *
 * Flags:
 *   --dry-run   Print what would be deleted without actually deleting anything.
 *
 * Notes:
 * - Only removes rows with provider = "MOCK".
 * - Orphaned ScheduleChange rows are those with source = "EMAIL" and status = "DETECTED"
 *   that reference an emailProcessingLog with provider = "MOCK" via matchedChangeId.
 * - Real rows (provider = "MICROSOFT-GRAPH" etc.) are never touched.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN (no deletions)" : "LIVE (will delete)"}\n`);

  // 1. Find MOCK email processing logs
  const mockLogs = await prisma.emailProcessingLog.findMany({
    where: { provider: "MOCK" },
    select: { id: true, subject: true, studentId: true, matchedChangeId: true },
  });

  console.log(`Found ${mockLogs.length} MOCK emailProcessingLog rows.`);
  mockLogs.forEach((log) =>
    console.log(`  [log] ${log.id} — "${log.subject ?? "(no subject)"}" studentId=${log.studentId}`),
  );

  // 2. Collect any ScheduleChange IDs linked to those logs
  const orphanedChangeIds = mockLogs
    .map((log) => log.matchedChangeId)
    .filter((id): id is string => id != null);

  if (orphanedChangeIds.length > 0) {
    const orphanedChanges = await prisma.scheduleChange.findMany({
      where: { id: { in: orphanedChangeIds }, status: { in: ["DETECTED", "PENDING"] } },
      select: { id: true, title: true, status: true },
    });
    console.log(`\nFound ${orphanedChanges.length} orphaned ScheduleChange rows to clean up.`);
    orphanedChanges.forEach((c) => console.log(`  [change] ${c.id} — "${c.title}" status=${c.status}`));

    if (!dryRun && orphanedChanges.length > 0) {
      // Unlink before deleting to avoid FK constraint issues
      await prisma.emailProcessingLog.updateMany({
        where: { matchedChangeId: { in: orphanedChangeIds } },
        data: { matchedChangeId: null },
      });
      const deleted = await prisma.scheduleChange.deleteMany({
        where: { id: { in: orphanedChanges.map((c) => c.id) } },
      });
      console.log(`Deleted ${deleted.count} orphaned ScheduleChange rows.`);
    }
  }

  // 3. Delete MOCK logs
  if (!dryRun && mockLogs.length > 0) {
    const deleted = await prisma.emailProcessingLog.deleteMany({
      where: { provider: "MOCK" },
    });
    console.log(`\nDeleted ${deleted.count} MOCK emailProcessingLog rows.`);
  }

  console.log(dryRun ? "\nDry run complete — nothing was deleted." : "\nCleanup complete.");
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
