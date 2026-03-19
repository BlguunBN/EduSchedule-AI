import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";
import { ensureDemoStudent } from "@/lib/edu-schedule/demo-student";

function buildStudentNumber(userId: string) {
  return `USR-${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase()}`;
}

export async function requireCurrentStudent() {
  // Prefer a real signed-in session whenever available.
  // In local dev with bypass enabled, only fall back to demo if there is no session.
  const session = await auth();

  if (!session?.user?.id && isDevAuthBypassEnabled()) {
    const student = await ensureDemoStudent();
    if (!student.userId) {
      throw new ApiError(500, "DEMO_SETUP_ERROR", "Demo student has no linked user");
    }
    const user = await prisma.user.findUnique({ where: { id: student.userId } });
    if (!user) {
      throw new ApiError(500, "DEMO_SETUP_ERROR", "Demo user record missing");
    }
    const fakeSession = {
      user: {
        id: user.id,
        name: user.name ?? "Demo Student",
        email: user.email ?? "demo@eduschedule.local",
        role: "STUDENT",
      },
      expires: new Date(Date.now() + 86400_000).toISOString(),
    };
    return { session: fakeSession, user, student };
  }

  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Sign in required");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "User session is invalid");
  }

  const email = user.email ?? `${user.id}@local.eduschedule`;
  const studentNumber = buildStudentNumber(user.id);

  const student = await prisma.student.upsert({
    where: { studentNumber },
    update: {
      userId: user.id,
      fullName: user.name ?? "Student",
      email,
    },
    create: {
      userId: user.id,
      studentNumber,
      fullName: user.name ?? "Student",
      email,
      timezone: "Asia/Shanghai",
      campus: "XJTLU",
    },
  });

  return { session, user, student };
}
