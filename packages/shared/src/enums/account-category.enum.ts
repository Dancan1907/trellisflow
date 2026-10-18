/**
 * The fundamental split for accounts:
 * - ASSET: things the user owns (adds to net worth)
 * - LIABILITY: things the user owes (subtracts from net worth)
 */
export enum AccountCategory {
  ASSET = 'asset',
  LIABILITY = 'liability',
}
