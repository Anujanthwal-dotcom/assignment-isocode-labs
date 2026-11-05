import { describe, it, expect } from 'vitest';
import { StoreDistanceService } from './store-distance.service';

describe('StoreDistanceService', () => {
  const service = new StoreDistanceService();

  it('validates coordinate boundaries correctly', () => {
    expect(service.isValidCoordinates({ latitude: 22.5726, longitude: 88.3639 })).toBe(true);
    expect(service.isValidCoordinates({ latitude: 91, longitude: 88.3639 })).toBe(false);
    expect(service.isValidCoordinates({ latitude: -91, longitude: 88.3639 })).toBe(false);
    expect(service.isValidCoordinates({ latitude: 22.5726, longitude: 181 })).toBe(false);
    expect(service.isValidCoordinates({ latitude: 22.5726, longitude: -181 })).toBe(false);
    expect(service.isValidCoordinates({ latitude: null, longitude: 88.3639 })).toBe(false);
    expect(service.isValidCoordinates({ latitude: 22.5726, longitude: null })).toBe(false);
    expect(service.isValidCoordinates({ latitude: undefined, longitude: 88.3639 })).toBe(false);
  });

  it('calculates straight-line Haversine distance correctly between Kolkata landmarks', () => {
    // Salt Lake Sector V: (22.5867, 88.4178)
    // Howrah Maidan: (22.5898, 88.3248)
    const distanceKm = service.calculateDistanceKm(
      { latitude: 22.5867, longitude: 88.4178 },
      { latitude: 22.5898, longitude: 88.3248 },
    );

    // Approximate straight-line distance across Kolkata is ~9.5 to 10 km
    expect(distanceKm).toBeGreaterThan(9.0);
    expect(distanceKm).toBeLessThan(11.0);
  });

  it('returns 0 for identical points', () => {
    const distanceKm = service.calculateDistanceKm(
      { latitude: 22.5867, longitude: 88.4178 },
      { latitude: 22.5867, longitude: 88.4178 },
    );
    expect(distanceKm).toBe(0);
  });
});
