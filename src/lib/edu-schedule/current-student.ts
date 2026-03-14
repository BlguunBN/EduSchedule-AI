import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

function buildStudentNumber(userId: string) {
  return `USR-${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase()}`;
}

export async function requireCurrentStudent() {
  const session = await auth();
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
