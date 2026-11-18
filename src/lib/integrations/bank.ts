export type TransferEntry = { reference: string; bankCode: string; accountNumber: string; holder: string; amountWon: bigint };
export type TransferFile = { filename: string; contentType: string; body: string; count: number; totalWon: bigint };
export interface BankFileAdapter {
  readonly format: string;
  readonly bankSpecific: boolean;
  generate(entries: readonly TransferEntry[]): TransferFile;
}

function csvField(value: string, forceText = false) {
  const text = forceText || /^[\s\uFEFF]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]|^[\t\r\n]/u.test(value) ? "'" + value : value;
  return '"' + text.replace(/"/g, '""') + '"';
}

export class GenericCsvBankFileAdapter implements BankFileAdapter {
  readonly format = "범용 CSV";
  readonly bankSpecific = false;

  generate(entries: readonly TransferEntry[]) {
    if (!entries.length) throw new Error("이체 대상이 없습니다.");
    const identifiers = new Set<string>();
    let totalWon = 0n;
    const rows = entries.map(({ reference, bankCode, accountNumber, holder, amountWon }) => {
      if (!reference.trim() || identifiers.has(reference) || !/^\d{2,4}$/.test(bankCode) ||
          !/^\d[\d-]{4,30}\d$/.test(accountNumber) || !holder.trim() || amountWon <= 0n) {
        throw new Error("이체 항목의 식별번호, 계좌 정보 또는 금액을 확인하세요.");
      }
      identifiers.add(reference);
      totalWon += amountWon;
      return [csvField(reference), csvField(bankCode, true), csvField(accountNumber, true), csvField(holder), amountWon.toString()].join(",");
    });
    return {
      filename: "generic-transfer.csv", contentType: "text/csv; charset=utf-8",
      body: "\uFEFF" + ["참조번호,은행코드,계좌번호,예금주,이체금액", ...rows].join("\r\n") + "\r\n",
      count: entries.length, totalWon,
    };
  }
}
