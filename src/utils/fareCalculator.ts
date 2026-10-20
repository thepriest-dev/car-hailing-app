interface FareCalculation {
  baseFare: number;
  perKmRate: number;
  perStopFee: number;
  waitingTimeRate: number;
}

const DEFAULT_RATES: FareCalculation = {
  baseFare: 300,
  perKmRate: 150,
  perStopFee: 200,
  waitingTimeRate: 50,
};

const RIDE_MULTIPLIERS = {
  standard: 1,
  comfort: 1.67,
  business: 2.92,
  luxury: 5,
};

export const calculateFareWithStops = (
  rideType: string,
  totalDistance: number,
  numberOfStops: number,
  estimatedTime: number
): number => {
  const multiplier = RIDE_MULTIPLIERS[rideType as keyof typeof RIDE_MULTIPLIERS] || 1;
  
  let fare = DEFAULT_RATES.baseFare;
  fare += totalDistance * DEFAULT_RATES.perKmRate;
  fare += numberOfStops * DEFAULT_RATES.perStopFee;
  fare += estimatedTime * DEFAULT_RATES.waitingTimeRate;
  fare = fare * multiplier;
  
  return Math.round(fare);
};

export const getStopCountText = (count: number): string => {
  if (count === 0) return 'Direct trip';
  if (count === 1) return '1 intermediate stop';
  return `${count} intermediate stops`;
};

export const getEstimatedTimeWithStops = (
  baseTime: number,
  numberOfStops: number
): number => {
  return baseTime + (numberOfStops * 5);
};

export const getTotalDistanceWithStops = (
  baseDistance: number,
  numberOfStops: number
): number => {
  return baseDistance + (numberOfStops * 1.5);
};