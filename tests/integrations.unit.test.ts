import { afterEach, describe, expect, it, vi } from "vitest";
import { MockGroupwareApprovalProvider } from "@/lib/integrations/approval";
import { GenericCsvBankFileAdapter } from "@/lib/integrations/bank";

afterEach(() => vi.unstubAllEnvs());
describe("전자결재 모의 제공자", () => {
  it("요청 키를 재사용하고 결정 상태를 조회할 수 있다", async () => {
    const provider = new MockGroupwareApprovalProvider();
    const request = { idempotencyKey: "first", batchId: "batch-1", title: "검증용 결재" };
    const response = await provider.request(request);
    await expect(provider.request(request)).resolves.toEqual(response);
    await expect(provider.request({ ...request, batchId: "batch-2" })).rejects.toThrow("이미 사용");
    await provider.setTestStatus(response.externalDocumentId, "REJECTED", "검증용 사유");
    await expect(provider.status(response.externalDocumentId)).resolves.toMatchObject({ status: "REJECTED", rejectionReason: "검증용 사유" });
    await expect(provider.setTestStatus(response.externalDocumentId, "APPROVED")).rejects.toThrow("변경할 수 없습니다");
  });

  it("운영 환경에서는 초기화가 차단된다", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => new MockGroupwareApprovalProvider()).toThrow("운영 환경");
  });
});

describe("범용 CSV 이체 파일", () => {
  const entry = { reference: "T-1", bankCode: "001", accountNumber: "000-111-222", holder: "=TEST", amountWon: 9007199254740993n };
  it("정수 원화 합계를 보존하고 식 수식 및 선행 0을 처리한다", () => {
    const adapter = new GenericCsvBankFileAdapter();
    const result = adapter.generate([entry, { ...entry, reference: "T-2", amountWon: 8n }]);
    expect(result.totalWon).toBe(9007199254741001n);
    expect(result.count).toBe(2);
    expect(result.body).toContain(`"'001","'000-111-222","'=TEST",9007199254740993`);
    expect(adapter.bankSpecific).toBe(false);
  });

  it("중복 대상, 빈 입력, 음수 및 잘못된 계좌를 차단한다", () => {
    const adapter = new GenericCsvBankFileAdapter();
    for (const invalid of [[], [entry, entry], [{ ...entry, amountWon: -1n }], [{ ...entry, accountNumber: "invalid" }]]) {
      expect(() => adapter.generate(invalid)).toThrow();
    }
  });
});
