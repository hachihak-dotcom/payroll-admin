import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminError, listAdminRecords, saveAdminRecord } from "@/lib/admin";
import { isResource } from "@/lib/resources";
import { getActor } from "@/lib/session";
import { idSchema } from "@/lib/validation";

type Context = { params: Promise<{ resource: string; id?: string[] }> };

function json(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function errorResponse(error: unknown) {
  if (error instanceof AdminError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError) return json({ error: error.issues[0]?.message ?? "입력값을 확인하세요." }, 422);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return json({ error: "이미 등록된 코드 또는 이메일입니다." }, 409);
    if (error.code === "P2025") return json({ error: "항목을 찾을 수 없습니다." }, 404);
  }
  console.error("Admin API request failed", error instanceof Error ? error.name : "UnknownError");
  return json({ error: "요청을 처리하는 중 문제가 발생했습니다." }, 500);
}

async function execute(request: NextRequest, context: Context) {
  try {
    const actor = await getActor();
    if (!actor) return json({ error: "로그인이 필요합니다." }, 401);
    const { resource, id: path } = await context.params;
    if (!isResource(resource) || (path && (path.length !== 1 || !idSchema.safeParse(path[0]).success))) {
      return json({ error: "항목을 찾을 수 없습니다." }, 404);
    }
    const id = path?.[0];
    if (request.method === "GET") {
      const records = await listAdminRecords(actor, resource, id);
      if (id && !records.length) return json({ error: "항목을 찾을 수 없습니다." }, 404);
      return json({ data: id ? records[0] : records });
    }
    if (actor.role !== "SYSTEM_ADMIN") return json({ error: "시스템 관리자 권한이 필요합니다." }, 403);
    if ((request.method === "POST" && id) || (request.method === "PATCH" && !id)) {
      return json({ error: "잘못된 요청 경로입니다." }, 405);
    }
    const expectedOrigin = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : request.nextUrl.origin;
    if (request.headers.get("origin") !== expectedOrigin) return json({ error: "허용되지 않은 요청 출처입니다." }, 403);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
      return json({ error: "JSON 요청만 지원합니다." }, 415);
    }
    const body = await request.text();
    if (Buffer.byteLength(body) > 8192) return json({ error: "입력 크기 제한을 초과했습니다." }, 413);
    let input: unknown;
    try { input = JSON.parse(body); }
    catch { return json({ error: "잘못된 JSON 형식입니다." }, 400); }
    const data = await saveAdminRecord(actor, resource, input, id);
    return json({ data }, request.method === "POST" ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = execute;
export const POST = execute;
export const PATCH = execute;
