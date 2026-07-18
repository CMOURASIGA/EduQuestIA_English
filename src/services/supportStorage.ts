import type {
  LocalSupportRecord,
  UsedReceiptCode
} from "../types/support";

const STORAGE_KEY = "eduquest_support_v1";

export function getSupportRecord():
  LocalSupportRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as LocalSupportRecord;

    if (
      parsed.schemaVersion !== 1 ||
      parsed.status !== "supported" ||
      parsed.supporterBadgeId !== "supporter_v1"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveSupportRecord(
  record: LocalSupportRecord
): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(record)
  );
}

export function wasReceiptCodeUsed(
  hash: string
): boolean {
  const record = getSupportRecord();

  return Boolean(
    record?.usedReceiptCodes?.some(
      item => item.hash === hash
    )
  );
}

export function addUsedReceiptCode(
  hash: string,
  amount?: number
): void {
  const current = getSupportRecord();

  const usedCode: UsedReceiptCode = {
    hash,
    usedAt: new Date().toISOString()
  };

  if (!current) {
    const newRecord: LocalSupportRecord = {
      schemaVersion: 1,
      status: "supported",
      supporterBadgeId: "supporter_v1",
      suggestedAmount: amount ?? 2,
      confirmedByResponsible: true,
      localStorageAcknowledged: true,
      validationMethod: "local_format_check",
      activatedAt: new Date().toISOString(),
      usedReceiptCodes: [usedCode]
    };

    saveSupportRecord(newRecord);
    return;
  }

  const updatedUsedCodes = [
    ...(current.usedReceiptCodes || []),
    usedCode
  ].slice(-100);

  saveSupportRecord({
    ...current,
    status: "supported",
    supporterBadgeId: "supporter_v1",
    suggestedAmount: amount ?? current.suggestedAmount ?? 2,
    usedReceiptCodes: updatedUsedCodes
  });
}

// Function to check if the supporter badge is currently active
export function isSupporterActive(): boolean {
  const record = getSupportRecord();
  return record !== null && record.status === "supported";
}

// Function to revoke/clear the supporter record if needed (e.g. debugging/testing)
export function clearSupportRecord(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface EduQuestExportData {
  version: 1;
  exportedAt: string;
  localStorageData: Record<string, string>;
}

export function exportAllData(): void {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("playenglish_") || key.startsWith("eduquest_"))) {
      const val = localStorage.getItem(key);
      if (val) {
        data[key] = val;
      }
    }
  }

  const exportPayload: EduQuestExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorageData: data
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eduquest_progresso_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importAllData(jsonString: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonString) as EduQuestExportData;
    if (parsed.version !== 1 || !parsed.localStorageData) {
      return { success: false, error: "Formato de arquivo inválido. Versão de backup não suportada." };
    }

    // Keep current keys in memory in case of rollback
    const backup: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("playenglish_") || key.startsWith("eduquest_"))) {
        const val = localStorage.getItem(key);
        if (val) backup[key] = val;
      }
    }

    try {
      // Clear only app keys
      for (const key of Object.keys(backup)) {
        localStorage.removeItem(key);
      }

      // Apply imported keys
      for (const [key, value] of Object.entries(parsed.localStorageData)) {
        if (key.startsWith("playenglish_") || key.startsWith("eduquest_")) {
          localStorage.setItem(key, value);
        }
      }
      return { success: true };
    } catch (err: any) {
      // Rollback on error
      for (const [key, value] of Object.entries(backup)) {
        localStorage.setItem(key, value);
      }
      return { success: false, error: `Erro ao restaurar dados: ${err.message}` };
    }
  } catch (err: any) {
    return { success: false, error: "Arquivo de backup corrompido ou inválido. Verifique o arquivo." };
  }
}

