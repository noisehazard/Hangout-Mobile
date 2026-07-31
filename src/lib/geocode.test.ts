import { parseSearchResults } from './geocode';

describe('parseSearchResults', () => {
  it('maps Nominatim rows to PlaceResult with numeric coords', () => {
    const out = parseSearchResults([
      { display_name: 'Cathedral Park, Chișinău', lat: '47.0245', lon: '28.8322' },
      { display_name: 'Valea Morilor, Chișinău', lat: '47.0289', lon: '28.8100' },
    ]);
    expect(out).toEqual([
      { name: 'Cathedral Park, Chișinău', latitude: 47.0245, longitude: 28.8322 },
      { name: 'Valea Morilor, Chișinău', latitude: 47.0289, longitude: 28.81 },
    ]);
  });

  it('returns [] for empty input', () => {
    expect(parseSearchResults([])).toEqual([]);
  });
});
