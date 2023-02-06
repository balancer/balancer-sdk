export const oneSecondInMs = 1000;
export const twentyFourHoursInSecs = 24 * 60 * 60;

export function toJsTimestamp(unixTimestamp: number): number {
  return unixTimestamp * oneSecondInMs;
}

export function toUnixTimestamp(jsTimestamp: number): number {
  return Math.round(jsTimestamp / oneSecondInMs);
}

export function isLessThan24Hours(incomingDateInSec: number): boolean {
  const now = Math.round(Date.now() / 1000);
  const difference = now - incomingDateInSec;

  return difference < twentyFourHoursInSecs;
}
