import { randomUUID } from "node:crypto";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
export type ApprovalRequest = { idempotencyKey: string; batchId: string; title: string };

export type ApprovalSnapshot = {
  externalDocumentId: string;
  status: ApprovalStatus;
  rejectionReason?: string;
};

export interface GroupwareApprovalProvider {
  readonly mode: "test" | "live";
  request(input: ApprovalRequest): Promise<ApprovalSnapshot>;
  status(externalDocumentId: string): Promise<ApprovalSnapshot>;
}

export class MockGroupwareApprovalProvider implements GroupwareApprovalProvider {
  readonly mode = "test";
  private readonly documents = new Map<string, ApprovalSnapshot>();
  private readonly requests = new Map<string, { batchId: string; documentId: string }>();

  constructor() {
    if (process.env.NODE_ENV === "production") throw new Error("운영 환경에서는 모의 결재를 사용할 수 없습니다.");
  }

  async request(input: ApprovalRequest) {
    const existing = this.requests.get(input.idempotencyKey);
    if (existing) {
      if (existing.batchId !== input.batchId) throw new Error("결재 요청 키가 이미 사용되었습니다.");
      return this.status(existing.documentId);
    }
    const document = { externalDocumentId: "mock-" + randomUUID(), status: "PENDING" as const };
    this.requests.set(input.idempotencyKey, { batchId: input.batchId, documentId: document.externalDocumentId });
    this.documents.set(document.externalDocumentId, document);
    return { ...document };
  }

  async status(externalDocumentId: string) {
    const document = this.documents.get(externalDocumentId);
    if (!document) throw new Error("결재 문서를 찾을 수 없습니다.");
    return { ...document };
  }

  async setTestStatus(externalDocumentId: string, status: Exclude<ApprovalStatus, "PENDING">, rejectionReason?: string) {
    const existing = await this.status(externalDocumentId);
    if (existing.status === status) return existing;
    if (existing.status !== "PENDING") throw new Error("완료된 결재 상태는 변경할 수 없습니다.");
    if (status === "REJECTED" && !rejectionReason?.trim()) throw new Error("반려 사유를 입력하세요.");
    const document = { ...existing, status, rejectionReason: status === "REJECTED" ? rejectionReason : undefined };
    this.documents.set(externalDocumentId, document);
    return { ...document };
  }
}
