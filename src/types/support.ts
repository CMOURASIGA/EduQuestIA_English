export interface UsedReceiptCode {
  hash: string;
  usedAt: string;
}

export interface LocalSupportRecord {
  schemaVersion: 1;
  status: "supported";
  supporterBadgeId: "supporter_v1";
  suggestedAmount?: number;
  confirmedByResponsible: true;
  localStorageAcknowledged: true;
  validationMethod: "local_format_check";
  activatedAt: string;
  usedReceiptCodes: UsedReceiptCode[];
}
