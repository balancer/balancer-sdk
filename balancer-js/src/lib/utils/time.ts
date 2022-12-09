export const oneSecondInMs = 1000;

export function toJsTimestamp(unixTimestamp: number): number {
  return unixTimestamp * oneSecondInMs;
}

export function toUnixTimestamp(jsTimestamp: number): number {
  return Math.round(jsTimestamp / oneSecondInMs);
}
