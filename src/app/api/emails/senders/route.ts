import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";

const emailSchema = z.object({ email: z.string().email() });

function parseSenders(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function getOrCreatePrefs(studentId: string) {
  return prisma.studentPreferences.upsert({
    where: { studentId },
    create: { studentId },
    update: {},
  });
}

export async function GET() {
  try {
    const { student } = await requireCurrentStudent();
    const prefs = await getOrCreatePrefs(student.id);
    return jsonOk({ senders: parseSenders(prefs.trustedSenders) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const { email } = emailSchema.parse(await req.json());
    const prefs = await getOrCreatePrefs(student.id);
    const current = parseSenders(prefs.trustedSenders);
    const normalized = email.toLowerCase().trim();
    if (current.includes(normalized)) {
      return jsonOk({ senders: current });
    }
    const updated = [...current, normalized];
    await prisma.studentPreferences.update({
      where: { studentId: student.id },
      data: { trustedSenders: JSON.stringify(updated) },
    });
    return jsonOk({ senders: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const { email } = emailSchema.parse(await req.json());
    const prefs = await getOrCreatePrefs(student.id);
    const current = parseSenders(prefs.trustedSenders);
    const normalized = email.toLowerCase().trim();
    const updated = current.filter((s) => s !== normalized);
    await prisma.studentPreferences.update({
      where: { studentId: student.id },
      data: { trustedSenders: JSON.stringify(updated) },
    });
    return jsonOk({ senders: updated });
  } catch (error) {
    return jsonError(error);
  }
}
