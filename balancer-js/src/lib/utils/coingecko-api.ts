export function getCoingeckoApiBaseUrl(isDemoApi = true) {
  if (isDemoApi) {
    return 'https://api.coingecko.com/api/v3/';
  }
  return 'https://pro-api.coingecko.com/api/v3/';
}

export function getCoingeckoApiKeyHeaderName(isDemoApi = true) {
  if (isDemoApi) {
    return 'x-cg-demo-api-key';
  }
  return 'x-cg-pro-api-key';
}
