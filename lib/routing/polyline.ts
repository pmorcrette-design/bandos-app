export type PolylinePoint = {
  latitude: number;
  longitude: number;
};

export function decodePolyline(encoded: string, precision = 5) {
  const coordinates: PolylinePoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const factor = 10 ** precision;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const latitudeChange = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += latitudeChange;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const longitudeChange = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += longitudeChange;

    coordinates.push({
      latitude: latitude / factor,
      longitude: longitude / factor
    });
  }

  return coordinates;
}
