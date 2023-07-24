/**
 * Helper function to shorten addresses for readability
 *
 * @param address
 * @returns shortened address
 */
export const shortenAddress = (address: string): string => {
  return address.slice(0, 6) + '...' + address.slice(-4);
};
