export type MarketConfig = {
  code: "BD" | "ID" | "TH"
  status: "active_demo" | "discovery"
  currency: "BDT" | "IDR" | "THB"
  languages: readonly string[]
  defaultLanguage: string
  locationLevels: readonly string[]
  ownershipDocuments: readonly string[]
  paymentProviderKeys: readonly string[]
  vehicleDataSources: readonly string[]
}

// Discovery markets are schema examples only. No provider or legal integration is enabled.
export const markets: Record<MarketConfig["code"], MarketConfig> = {
  BD: {
    code: "BD", status: "active_demo", currency: "BDT", languages: ["bn", "en"], defaultLanguage: "bn",
    locationLevels: ["division", "district", "upazila", "area"],
    ownershipDocuments: ["registration_certificate", "tax_token", "fitness_certificate"],
    paymentProviderKeys: [], vehicleDataSources: ["curated_vehicle_catalogue"],
  },
  ID: {
    code: "ID", status: "discovery", currency: "IDR", languages: ["id"], defaultLanguage: "id",
    locationLevels: ["province", "city", "district"], ownershipDocuments: [],
    paymentProviderKeys: [], vehicleDataSources: [],
  },
  TH: {
    code: "TH", status: "discovery", currency: "THB", languages: ["th"], defaultLanguage: "th",
    locationLevels: ["province", "district", "subdistrict"], ownershipDocuments: [],
    paymentProviderKeys: [], vehicleDataSources: [],
  },
}

export function enabledMarket(code: MarketConfig["code"]): MarketConfig {
  const market = markets[code]
  if (market.status !== "active_demo") throw new Error(`${code} requires discovery and launch approval`)
  return market
}
