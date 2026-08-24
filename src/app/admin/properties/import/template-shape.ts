// Single source of truth for the import template's columns, shared between
// the client-side review screen and the server-side .xlsx generator so they
// can never drift apart.
export const CSV_HEADERS = [
  'title', 'description', 'property_type', 'listing_type', 'ownership', 'bhk',
  'furnishing', 'carpet_area', 'built_up_area', 'floor', 'possession', 'price',
  'price_type', 'location_address', 'city', 'locality', 'rera_number',
  'demand_tag', 'status', 'primary_agent', 'amenities', 'highlights',
  'nearby_places', 'video_urls', 'youtube_url', 'image_urls',
] as const;

export const HEADER_LABELS: Record<(typeof CSV_HEADERS)[number], string> = {
  title: 'Title',
  description: 'Description',
  property_type: 'Property Type',
  listing_type: 'Listing Type',
  ownership: 'Ownership',
  bhk: 'BHK',
  furnishing: 'Furnishing',
  carpet_area: 'Carpet Area (sqft)',
  built_up_area: 'Built-up Area (sqft)',
  floor: 'Floor',
  possession: 'Possession',
  price: 'Price (Rs)',
  price_type: 'Price Type',
  location_address: 'Full Address',
  city: 'City',
  locality: 'Locality',
  rera_number: 'RERA Number',
  demand_tag: 'Demand',
  status: 'Status',
  primary_agent: 'Primary Agent (exact name)',
  amenities: 'Amenities (; separated)',
  highlights: 'Highlights (; separated)',
  nearby_places: 'Nearby Places (Name:Distance;...)',
  video_urls: 'Video URLs (; separated)',
  youtube_url: 'YouTube URL',
  image_urls: 'Image URLs (; separated, optional)',
};

// Fixed value sets — shared so the .xlsx template's dropdown lists (server
// side) and the review screen's <select> options (client side) can never
// drift apart from each other or from what createProperty actually accepts.
export const PROPERTY_TYPES = ['Apartment', 'Villa', 'Plot', 'Penthouse', 'Commercial', 'Row House'];
export const LISTING_TYPES = ['Sale', 'Rent', 'Resale'];
export const OWNERSHIPS = ['1st Owner', '2nd Owner', '3rd Owner', '4th+ Owner'];
export const FURNISHINGS = ['Unfurnished', 'Semi', 'Full'];
export const PRICE_TYPES = ['fixed', 'negotiable', 'starting_from'];
export const STATUSES = ['available', 'sold', 'reserved', 'coming_soon', 'on_hold'];
export const DEMAND_TAGS = ['high', 'moderate', 'low'];
export const BHKS = ['1', '2', '3', '4', '5'];

// Maps a header cell's text back to the internal field key. Includes both
// the human-readable label ("Property Type") used by the current template
// and the raw key itself ("property_type") so a file downloaded before this
// change (or a hand-typed CSV using the raw field names) still parses fine.
export const LABEL_TO_KEY: Record<string, (typeof CSV_HEADERS)[number]> = CSV_HEADERS.reduce((acc, key) => {
  acc[HEADER_LABELS[key].trim().toLowerCase()] = key;
  acc[key] = key;
  return acc;
}, {} as Record<string, (typeof CSV_HEADERS)[number]>);

export const TEMPLATE_EXAMPLE_ROW: Record<(typeof CSV_HEADERS)[number], string> = {
  title: 'Prestige Lakeside Habitat',
  description: 'Spacious 3BHK with lake views, close to tech parks.',
  property_type: 'Apartment',
  listing_type: 'Sale',
  ownership: '1st Owner',
  bhk: '3',
  furnishing: 'Semi',
  carpet_area: '1200',
  built_up_area: '1450',
  floor: '12th of 24',
  possession: 'Dec 2025',
  price: '12800000',
  price_type: 'fixed',
  location_address: 'ITPL Main Road, Whitefield, Bangalore - 560066',
  city: 'Bangalore',
  locality: 'Whitefield',
  rera_number: 'PRM/KA/RERA/1234/...',
  demand_tag: 'moderate',
  status: 'available',
  primary_agent: 'Exact name of an agent already in Agents',
  amenities: 'Covered Parking;24/7 Security;Gym & Pool',
  highlights: 'Near Metro Station;Gated Community',
  nearby_places: 'ITPL Tech Park:0.5 km;Metro Station:1.2 km',
  video_urls: '',
  youtube_url: '',
  image_urls: '',
};
