import { Injectable } from '@nestjs/common';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

@Injectable()
export class StoreDistanceService {
  private readonly EARTH_RADIUS_KM = 6371.0;

  /**
   * Validates if coordinates are within legitimate geographic ranges:
   * Latitude: [-90, 90], Longitude: [-180, 180].
   */
  isValidCoordinates(coords: { latitude?: number | null; longitude?: number | null }): boolean {
    if (coords.latitude === undefined || coords.latitude === null) return false;
    if (coords.longitude === undefined || coords.longitude === null) return false;
    if (typeof coords.latitude !== 'number' || isNaN(coords.latitude)) return false;
    if (typeof coords.longitude !== 'number' || isNaN(coords.longitude)) return false;

    return (
      coords.latitude >= -90.0 &&
      coords.latitude <= 90.0 &&
      coords.longitude >= -180.0 &&
      coords.longitude <= 180.0
    );
  }

  /**
   * Calculates straight-line distance in kilometres using the Haversine formula.
   * Input: Valid Customer Delivery Coordinates & Store Coordinates.
   * Output: Straight-line distance in km rounded to 2 decimal places.
   */
  calculateDistanceKm(origin: Coordinates, destination: Coordinates): number {
    const lat1Rad = this.toRadians(origin.latitude);
    const lon1Rad = this.toRadians(origin.longitude);
    const lat2Rad = this.toRadians(destination.latitude);
    const lon2Rad = this.toRadians(destination.longitude);

    const deltaLat = lat2Rad - lat1Rad;
    const deltaLon = lon2Rad - lon1Rad;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS_KM * c;

    return Math.round(distance * 100) / 100;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180.0;
  }
}
