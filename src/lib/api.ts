import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status });
}

function fromPrismaError(error: Prisma.PrismaClientKnownRequestError): ApiError {
  if (error.code === "P2002") {
    return new ApiError(409, "CONFLICT", "Unique constraint violation", error.meta);
  }
  if (error.code === "P2025") {
    return new ApiError(404, "NOT_FOUND", "Resource not found", error.meta);
  }
  return new ApiError(400, "DB_ERROR", "Database request failed", { code: error.code, meta: error.meta });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json<ApiFailure>(
      { ok: false, error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json<ApiFailure>(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() } },
      { status: 400 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrismaError(error);
    return NextResponse.json<ApiFailure>(
      { ok: false, error: { code: mapped.code, message: mapped.message, details: mapped.details } },
      { status: mapped.status },
    );
  }

  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code: "INTERNAL", message: "Internal server error" } },
    { status: 500 },
  );
}
