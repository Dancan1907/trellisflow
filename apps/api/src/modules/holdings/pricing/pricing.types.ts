export interface PriceQuote {
  price: number; // per unit, in the holding's currency
  currency: string;
  provider: string;
  fetchedAt: Date;
}

export interface PriceProvider {
  readonly name: string;
  supports(assetClass: string): boolean;
  fetchPrice(providerSymbol: string): Promise<PriceQuote>;
}
