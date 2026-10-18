/**
 * The list of asset classes an investment holding can belong to.
 * This list is fixed; users pick one when creating a holding.
 */
export enum AssetClass {
  STOCK = 'stock',
  ETF = 'etf',
  BOND = 'bond',
  CRYPTO = 'crypto',
  REAL_ESTATE = 'real_estate',
  RETIREMENT_ACCOUNT = 'retirement_account',
  VENTURE = 'venture',
  COMMODITY = 'commodity',
  COLLECTIBLE = 'collectible',
  OTHER = 'other',
}
