export function normalizeReceiptCode(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function isReceiptCodeFormatValid(
  value: string
): boolean {
  const normalized = normalizeReceiptCode(value);

  // Normal length checks
  if (
    normalized.length < 20 ||
    normalized.length > 100
  ) {
    return false;
  }

  // Letters and numbers only
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return false;
  }

  // Not all identical characters (e.g. "AAAAAAAAAAAAAAAAAAAA")
  if (/^(.)\1+$/.test(normalized)) {
    return false;
  }

  return true;
}

export async function hashReceiptCode(
  value: string
): Promise<string> {
  const normalized = normalizeReceiptCode(value);
  const encoded = new TextEncoder().encode(normalized);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded
  );

  return Array.from(new Uint8Array(digest))
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}
