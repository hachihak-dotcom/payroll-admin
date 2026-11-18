import { z } from "zod";
import { roles } from "@/lib/roles";

export const idSchema = z.uuid();
export const nameSchema = z.string().trim().min(1, "이름을 입력하세요.").max(80, "80자 이하로 입력하세요.");
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("올바른 이메일을 입력하세요."));
export const passwordSchema = z.string().min(12, "비밀번호는 12자 이상이어야 합니다.").max(128, "비밀번호는 128자 이하로 입력하세요.");
export const credentialsSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const adminSetupSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });
export const catalogSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{0,23}$/, "코드는 영문·숫자로 시작하는 24자 이하의 영문, 숫자, 마침표, 밑줄, 하이픈으로 입력하세요."),
  name: nameSchema,
  active: z.boolean(),
});
const userBase = z.object({
  name: nameSchema,
  email: emailSchema,
  role: z.enum(roles),
  active: z.boolean(),
  departmentId: z.union([idSchema, z.literal("")]).transform((value) => value || null),
});
function requireDepartment(data: z.output<typeof userBase>, ctx: z.RefinementCtx) {
  if (data.role === "DEPARTMENT_MANAGER" && !data.departmentId) {
    ctx.addIssue({ code: "custom", path: ["departmentId"], message: "부서 관리자에게 소속 부서를 지정하세요." });
  }
}
export const userCreateSchema = userBase.extend({ password: passwordSchema }).superRefine(requireDepartment);
export const userUpdateSchema = userBase.extend({ password: z.union([passwordSchema, z.literal("")]).optional() }).superRefine(requireDepartment);
