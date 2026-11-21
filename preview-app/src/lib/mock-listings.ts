/**
 * Demo data for the marketplace homepage. Nothing here comes from the
 * listings/dealers backends yet; shapes are kept close to what a listing card
 * needs so the swap to real data is mechanical.
 *
 * Photos are Unsplash placeholders. Most show the listed model (the Premio and
 * C-HR shots are from Dhaka); where no free photo of the exact model exists the
 * photo is the closest Toyota of the same body style, noted inline.
 */

export type Condition = "Reconditioned" | "Used"
export type Fuel = "Octane" | "Hybrid" | "Diesel" | "Plug-in hybrid"
export type Transmission = "Automatic" | "Manual"
export type BodyTypeSlug = "sedan" | "suv" | "microbus" | "hatchback" | "crossover" | "pickup"

export type City =
  | "Dhaka"
  | "Chattogram"
  | "Sylhet"
  | "Khulna"
  | "Rajshahi"
  | "Barishal"
  | "Rangpur"
  | "Mymensingh"
  | "Gazipur"
  | "Narayanganj"
  | "Cumilla"
  | "Bogura"

export type Photo = { src: string; alt: string }

export type Listing = {
  id: string
  make: string
  model: string
  trim: string
  year: number
  /** Asking price in taka. */
  priceBdt: number
  mileageKm: number
  engineCc: number
  fuel: Fuel
  transmission: Transmission
  condition: Condition
  bodyType: BodyTypeSlug
  city: City
  area: string
  seller: { name: string; kind: "Showroom" | "Owner" }
  /** Papers checked against BRTA records and the car inspected by CarBuy. */
  verified: boolean
  photo: Photo
}

/** Every Unsplash URL goes through here so next.config can pin the query string. */
export function unsplash(id: string): string {
  return `https://images.unsplash.com/${id}?fit=crop&w=2000&q=80`
}

export const cities: City[] = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Khulna",
  "Rajshahi",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Gazipur",
  "Narayanganj",
  "Cumilla",
  "Bogura",
]

export const modelsByMake: Record<string, string[]> = {
  Toyota: [
    "Axio",
    "Allion",
    "Premio",
    "Corolla Cross",
    "C-HR",
    "Noah",
    "Harrier",
    "Prado",
    "Aqua",
    "Hilux",
  ],
  Honda: ["Vezel", "Grace", "Fit", "CR-V", "Civic"],
  Nissan: ["X-Trail", "Note", "Sylphy", "Kicks"],
  Mitsubishi: ["Outlander", "Pajero Sport", "Eclipse Cross"],
  Mazda: ["Axela", "CX-5", "Demio"],
  Suzuki: ["Swift", "Ciaz", "Vitara"],
  Hyundai: ["Tucson", "Creta", "Elantra"],
  Kia: ["Sportage", "Seltos", "Carnival"],
  Lexus: ["NX", "RX", "LX"],
  BMW: ["3 Series", "5 Series", "X1", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC"],
  Audi: ["A4", "Q5", "Q7"],
}

export const makes = Object.keys(modelsByMake)

export const budgets = [
  { value: "0-10", label: "Under ৳10 lakh" },
  { value: "10-20", label: "৳10 – 20 lakh" },
  { value: "20-35", label: "৳20 – 35 lakh" },
  { value: "35-60", label: "৳35 – 60 lakh" },
  { value: "60-100", label: "৳60 lakh – 1 crore" },
  { value: "100-", label: "Above ৳1 crore" },
]

export const years = [
  { value: "2023", label: "2023 & newer" },
  { value: "2021", label: "2021 & newer" },
  { value: "2018", label: "2018 & newer" },
  { value: "2015", label: "2015 & newer" },
  { value: "2010", label: "2010 & newer" },
]

export const featuredListings: Listing[] = [
  {
    id: "cb-10421",
    make: "Toyota",
    model: "Premio",
    trim: "F EX",
    year: 2019,
    priceBdt: 3_390_000,
    mileageKm: 48_000,
    engineCc: 1500,
    fuel: "Octane",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "sedan",
    city: "Dhaka",
    area: "Tejgaon",
    seller: { name: "Motorhaus Tejgaon", kind: "Showroom" },
    verified: true,
    photo: {
      src: unsplash("photo-1706117948438-826d8018505a"),
      alt: "Black Toyota Premio on a Dhaka road",
    },
  },
  {
    id: "cb-10388",
    make: "Toyota",
    model: "Corolla Cross",
    trim: "Z Hybrid",
    year: 2022,
    priceBdt: 4_650_000,
    mileageKm: 18_000,
    engineCc: 1800,
    fuel: "Hybrid",
    transmission: "Automatic",
    condition: "Reconditioned",
    bodyType: "crossover",
    city: "Dhaka",
    area: "Gulshan",
    seller: { name: "Lakeside Autos", kind: "Showroom" },
    verified: true,
    photo: {
      src: unsplash("photo-1732357834595-ad3b5324a961"),
      alt: "Rear three-quarter of a white Toyota Corolla Cross",
    },
  },
  {
    id: "cb-10377",
    make: "Honda",
    model: "Vezel",
    trim: "Hybrid Z",
    year: 2018,
    priceBdt: 2_480_000,
    mileageKm: 54_000,
    engineCc: 1500,
    fuel: "Hybrid",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "crossover",
    city: "Dhaka",
    area: "Uttara",
    seller: { name: "Private owner", kind: "Owner" },
    verified: true,
    photo: {
      src: unsplash("photo-1627395427294-d01af2f943ac"),
      alt: "Red Honda Vezel on a tree-lined road",
    },
  },
  {
    id: "cb-10356",
    make: "Toyota",
    model: "Axio",
    trim: "X",
    year: 2012,
    priceBdt: 1_580_000,
    mileageKm: 86_000,
    engineCc: 1500,
    fuel: "Octane",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "sedan",
    city: "Chattogram",
    area: "Agrabad",
    seller: { name: "Agrabad Auto Point", kind: "Showroom" },
    verified: true,
    photo: {
      src: unsplash("photo-1631930998583-72cddce04c69"),
      alt: "White Toyota Corolla Axio parked by a lake",
    },
  },
  {
    id: "cb-10342",
    make: "Toyota",
    model: "Harrier",
    trim: "Z Hybrid",
    year: 2021,
    priceBdt: 7_850_000,
    mileageKm: 24_000,
    engineCc: 2500,
    fuel: "Hybrid",
    transmission: "Automatic",
    condition: "Reconditioned",
    bodyType: "suv",
    city: "Dhaka",
    area: "Banani",
    seller: { name: "Lakeside Autos", kind: "Showroom" },
    verified: true,
    photo: {
      // Stand-in: a Toyota RAV4 Hybrid (Harrier's platform twin).
      src: unsplash("photo-1706509234538-9831b1b33d66"),
      alt: "Dark Toyota hybrid SUV parked under trees at dusk",
    },
  },
  {
    id: "cb-10331",
    make: "Nissan",
    model: "X-Trail",
    trim: "20Xi",
    year: 2017,
    priceBdt: 2_950_000,
    mileageKm: 79_000,
    engineCc: 2000,
    fuel: "Octane",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "suv",
    city: "Chattogram",
    area: "Khulshi",
    seller: { name: "Port City Motors", kind: "Showroom" },
    verified: true,
    photo: {
      src: unsplash("photo-1630861825105-cefce2a4720a"),
      alt: "Black Nissan X-Trail on a forest track",
    },
  },
  {
    id: "cb-10318",
    make: "Toyota",
    model: "Allion",
    trim: "A15 G",
    year: 2018,
    priceBdt: 2_650_000,
    mileageKm: 62_000,
    engineCc: 1500,
    fuel: "Octane",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "sedan",
    city: "Sylhet",
    area: "Zindabazar",
    seller: { name: "Private owner", kind: "Owner" },
    verified: false,
    photo: {
      src: unsplash("photo-1699553887264-5b6fdcc50366"),
      alt: "White Toyota Allion beside a bridge railing under tropical trees",
    },
  },
  {
    id: "cb-10305",
    make: "Mitsubishi",
    model: "Outlander",
    trim: "PHEV G",
    year: 2019,
    priceBdt: 4_200_000,
    mileageKm: 46_000,
    engineCc: 2400,
    fuel: "Plug-in hybrid",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "suv",
    city: "Dhaka",
    area: "Mirpur DOHS",
    seller: { name: "Northside Autos", kind: "Showroom" },
    verified: true,
    photo: {
      src: unsplash("photo-1727547081348-19f2393099a9"),
      alt: "Silver Mitsubishi Outlander PHEV driving on an open road",
    },
  },
  {
    id: "cb-10297",
    make: "Toyota",
    model: "Noah",
    trim: "Si Hybrid",
    year: 2018,
    priceBdt: 3_150_000,
    mileageKm: 71_000,
    engineCc: 1800,
    fuel: "Hybrid",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "microbus",
    city: "Sylhet",
    area: "Upashahar",
    seller: { name: "Surma Car Gallery", kind: "Showroom" },
    verified: true,
    photo: {
      // Stand-in: a Toyota Vellfire, the Noah's larger sibling.
      src: unsplash("photo-1558101847-e017d5e414a4"),
      alt: "Front of a black Toyota microbus on a city street",
    },
  },
  {
    id: "cb-10284",
    make: "Honda",
    model: "Grace",
    trim: "Hybrid EX",
    year: 2017,
    priceBdt: 1_750_000,
    mileageKm: 68_000,
    engineCc: 1500,
    fuel: "Hybrid",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "sedan",
    city: "Rajshahi",
    area: "Shaheb Bazar",
    seller: { name: "Private owner", kind: "Owner" },
    verified: true,
    photo: {
      src: unsplash("photo-1614152204567-04903fff36b0"),
      alt: "White Honda Grace sedan on a wooded road",
    },
  },
  {
    id: "cb-10276",
    make: "Toyota",
    model: "C-HR",
    trim: "G-LED Hybrid",
    year: 2018,
    priceBdt: 2_790_000,
    mileageKm: 58_000,
    engineCc: 1800,
    fuel: "Hybrid",
    transmission: "Automatic",
    condition: "Used",
    bodyType: "crossover",
    city: "Dhaka",
    area: "Bashundhara",
    seller: { name: "Motorhaus Tejgaon", kind: "Showroom" },
    verified: true,
    photo: {
      src: unsplash("photo-1706117948467-91727d5ef03c"),
      alt: "Silver Toyota C-HR on a Dhaka street",
    },
  },
]

export type BodyType = {
  slug: BodyTypeSlug
  name: string
  blurb: string
  count: number
  photo: Photo
}

export const bodyTypes: BodyType[] = [
  {
    slug: "sedan",
    name: "Sedan",
    blurb: "Axio, Allion, Premio, Grace",
    count: 5_214,
    photo: {
      src: unsplash("photo-1621846970446-5ca1afc09cc8"),
      alt: "White Toyota Premio facing the camera on a rural road",
    },
  },
  {
    slug: "suv",
    name: "SUV",
    blurb: "Harrier, X-Trail, Prado",
    count: 2_386,
    photo: {
      src: unsplash("photo-1613859492095-85d9944f09f6"),
      alt: "Silver Toyota Land Cruiser Prado, front view",
    },
  },
  {
    slug: "microbus",
    name: "Microbus",
    blurb: "Noah, Voxy, Hiace",
    count: 1_472,
    photo: {
      src: unsplash("photo-1771248647341-9d8f567b051d"),
      alt: "Toyota Alphard grille lit in a dark car park",
    },
  },
  {
    slug: "hatchback",
    name: "Hatchback",
    blurb: "Aqua, Fit, Vitz, Swift",
    count: 1_908,
    photo: {
      src: unsplash("photo-1685783230956-87ebcaf7f171"),
      alt: "Red Toyota Vitz with its doors open on a dealer lot",
    },
  },
  {
    slug: "crossover",
    name: "Crossover",
    blurb: "C-HR, Vezel, Corolla Cross",
    count: 1_265,
    photo: {
      src: unsplash("photo-1728315640904-b38019d170a1"),
      alt: "White Toyota C-HR seen from above",
    },
  },
  {
    slug: "pickup",
    name: "Pickup",
    blurb: "Hilux, Navara, Triton",
    count: 438,
    photo: {
      src: unsplash("photo-1663576268373-0bef1214f700"),
      alt: "Silver Toyota Hilux pickup on a road",
    },
  },
]

export const makeCounts: { name: string; count: number }[] = [
  { name: "Toyota", count: 8_412 },
  { name: "Honda", count: 1_386 },
  { name: "Nissan", count: 742 },
  { name: "Mitsubishi", count: 518 },
  { name: "Mazda", count: 296 },
  { name: "Suzuki", count: 341 },
  { name: "Hyundai", count: 389 },
  { name: "Kia", count: 214 },
  { name: "Lexus", count: 167 },
  { name: "BMW", count: 133 },
  { name: "Mercedes-Benz", count: 158 },
  { name: "Audi", count: 92 },
]

export const heroPlates: { listingId: string; photo: Photo }[] = [
  {
    listingId: "cb-10421",
    photo: {
      src: unsplash("photo-1706117948438-826d8018505a"),
      alt: "Black Toyota Premio on a Dhaka road",
    },
  },
  {
    listingId: "cb-10305",
    photo: {
      src: unsplash("photo-1727547081348-19f2393099a9"),
      alt: "Silver Mitsubishi Outlander PHEV on an open road",
    },
  },
  {
    listingId: "cb-10276",
    photo: {
      src: unsplash("photo-1706117948467-91727d5ef03c"),
      alt: "Silver Toyota C-HR on a Dhaka street",
    },
  },
]

export function getListing(id: string): Listing | undefined {
  return featuredListings.find((listing) => listing.id === id)
}
