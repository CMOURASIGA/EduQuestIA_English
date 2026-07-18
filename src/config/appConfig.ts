function readBoolean(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

function readNumber(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

const env = (import.meta as any).env || {};

export const appConfig = {
  appPublicUrl:
    env.VITE_APP_PUBLIC_URL ??
    window.location.origin,

  pix: {
    enabled: readBoolean(
      env.VITE_PIX_ENABLED,
      false
    ),

    key:
      env.VITE_PIX_KEY ?? "",

    copyPaste:
      env.VITE_PIX_COPY_PASTE ?? "",

    receiverName:
      env.VITE_PIX_RECEIVER_NAME ?? "",

    receiverCity:
      env.VITE_PIX_RECEIVER_CITY ?? "",

    defaultAmount: readNumber(
      env.VITE_PIX_DEFAULT_AMOUNT,
      2
    ),

    description:
      env.VITE_PIX_DESCRIPTION ??
      "APOIO EDUQUEST"
  },

  supporterBadgeEnabled: readBoolean(
    env.VITE_SUPPORTER_BADGE_ENABLED,
    true
  )
};
