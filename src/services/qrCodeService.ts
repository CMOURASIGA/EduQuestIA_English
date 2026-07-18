import QRCode from "qrcode";

export async function createPixQrCode(
  payload: string
): Promise<string> {
  if (!payload.trim()) {
    throw new Error("Pix payload is required.");
  }

  return QRCode.toDataURL(payload, {
    width: 320,
    margin: 2,
    color: {
      dark: "#1E293B", // slate-800
      light: "#FFFFFF"
    },
    errorCorrectionLevel: "M"
  });
}

/**
 * Generates a simple Pix Static Payload (BR Code) fallback if only a raw key is provided.
 * Standard Pix EMV elements:
 * 00: Payload Format Indicator ("01")
 * 26: Merchant Account Information - Pix (GUI "br.gov.bcb.pix")
 * 52: Merchant Category Code ("0000")
 * 53: Transaction Currency ("986" - BRL)
 * 54: Transaction Amount (optional)
 * 58: Country Code ("BR")
 * 59: Merchant Name
 * 60: Merchant City
 * 62: Additional Data Field Template (TXID)
 * 63: CRC16 (Calculated checksum)
 */
export function generatePixPayload({
  key,
  name,
  city,
  amount,
  description
}: {
  key: string;
  name: string;
  city: string;
  amount: number;
  description: string;
}): string {
  // Simple helper to format EMV tag
  const f = (tag: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${tag}${len}${value}`;
  };

  const gui = "br.gov.bcb.pix";
  const formattedKey = key.trim();
  const formattedDesc = description.slice(0, 25).trim();

  // Tag 26 structure: Tag 00 (GUI), Tag 01 (Key), Tag 02 (Desc - optional)
  let tag26Value = f("00", gui) + f("01", formattedKey);
  if (formattedDesc) {
    tag26Value += f("02", formattedDesc);
  }

  const merchantAccountInfo = f("26", tag26Value);
  const merchantCategoryCode = f("52", "0000");
  const transactionCurrency = f("53", "986");
  const transactionAmount = amount > 0 ? f("54", amount.toFixed(2)) : "";
  const countryCode = f("58", "BR");
  const merchantName = f("59", name.slice(0, 25).trim() || "EDUQUEST");
  const merchantCity = f("60", city.slice(0, 15).trim() || "BRASILIA");
  const additionalData = f("62", f("05", "***")); // standard txid ***

  let payload = 
    f("00", "01") +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantName +
    merchantCity +
    additionalData +
    "6304"; // Tag 63 (CRC) followed by "04" length, then CRC value is appended

  // CRC-16/CCITT-FALSE implementation
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    const charCode = payload.charCodeAt(i);
    crc ^= (charCode << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }

  const crcString = crc.toString(16).toUpperCase().padStart(4, "0");
  return payload + crcString;
}
