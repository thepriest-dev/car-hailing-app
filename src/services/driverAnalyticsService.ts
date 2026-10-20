// src/services/driverAnalyticsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DriverTripRecord {
  id: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  distance: number;
  duration: number;
  fare: number;
  driverEarnings: number;
  passengerName: string;
  passengerRating: number;
  rideType: 'standard' | 'comfort' | 'business' | 'luxury';
  status: 'completed' | 'cancelled';
  waitingTime: number;
}

export interface DriverStats {
  totalTrips: number;
  totalDistance: number;
  totalEarnings: number;
  averageEarningsPerTrip: number;
  averagePassengerRating: number;
  totalWaitingTime: number;
  averageWaitingTime: number;
  mostFrequentRoute: string;
  favoriteRideType: string;
  peakHours: { hour: string; trips: number }[];
  weeklyTrend: { day: string; earnings: number }[];
  monthlyTrend: { month: string; earnings: number }[];
  ratingDistribution: { rating: number; count: number }[];
}

const STORAGE_KEY = 'driver_trip_history';

class DriverAnalyticsService {
  private mockDriverTrips: DriverTripRecord[] = [
    {
      id: '1',
      date: '2024-05-20',
      time: '08:30 AM',
      pickup: 'Ikeja, Lagos',
      destination: 'Victoria Island, Lagos',
      distance: 4.2,
      duration: 12,
      fare: 1950,
      driverEarnings: 1658,
      passengerName: 'Ada Okonkwo',
      passengerRating: 4.8,
      rideType: 'standard',
      status: 'completed',
      waitingTime: 3,
    },
    {
      id: '2',
      date: '2024-05-20',
      time: '02:15 PM',
      pickup: 'Lekki, Lagos',
      destination: 'Surulere, Lagos',
      distance: 3.8,
      duration: 10,
      fare: 1800,
      driverEarnings: 1530,
      passengerName: 'John Doe',
      passengerRating: 5.0,
      rideType: 'comfort',
      status: 'completed',
      waitingTime: 2,
    },
    {
      id: '3',
      date: '2024-05-19',
      time: '07:45 AM',
      pickup: 'Yaba, Lagos',
      destination: 'Ajah, Lagos',
      distance: 5.5,
      duration: 18,
      fare: 3100,
      driverEarnings: 2635,
      passengerName: 'Blessing Okon',
      passengerRating: 4.5,
      rideType: 'standard',
      status: 'completed',
      waitingTime: 5,
    },
    {
      id: '4',
      date: '2024-05-19',
      time: '06:30 PM',
      pickup: 'Airport, Lagos',
      destination: 'Ikeja, Lagos',
      distance: 3.2,
      duration: 8,
      fare: 1600,
      driverEarnings: 1360,
      passengerName: 'Michael Okafor',
      passengerRating: 4.2,
      rideType: 'business',
      status: 'completed',
      waitingTime: 4,
    },
    {
      id: '5',
      date: '2024-05-18',
      time: '11:00 AM',
      pickup: 'Victoria Island, Lagos',
      destination: 'Lekki, Lagos',
      distance: 4.5,
      duration: 15,
      fare: 2100,
      driverEarnings: 1785,
      passengerName: 'Funke Adeleke',
      passengerRating: 4.9,
      rideType: 'standard',
      status: 'completed',
      waitingTime: 2,
    },
    {
      id: '6',
      date: '2024-05-18',
      time: '09:00 PM',
      pickup: 'Ikeja, Lagos',
      destination: 'Maryland, Lagos',
      distance: 2.5,
      duration: 7,
      fare: 1200,
      driverEarnings: 1020,
      passengerName: 'Chidi Obi',
      passengerRating: 4.0,
      rideType: 'standard',
      status: 'completed',
      waitingTime: 6,
    },
  ];

  async getDriverTrips(): Promise<DriverTripRecord[]> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return this.mockDriverTrips;
    } catch (error) {
      return this.mockDriverTrips;
    }
  }

  calculateDriverStats(trips: DriverTripRecord[]): DriverStats {
    const completedTrips = trips.filter(t => t.status === 'completed');
    const totalTrips = completedTrips.length;
    const totalDistance = completedTrips.reduce((sum, t) => sum + t.distance, 0);
    const totalEarnings = completedTrips.reduce((sum, t) => sum + t.driverEarnings, 0);
    const averageEarningsPerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 0;
    const averagePassengerRating = totalTrips > 0 
      ? completedTrips.reduce((sum, t) => sum + t.passengerRating, 0) / totalTrips 
      : 0;
    const totalWaitingTime = completedTrips.reduce((sum, t) => sum + t.waitingTime, 0);
    const averageWaitingTime = totalTrips > 0 ? totalWaitingTime / totalTrips : 0;

    // Most frequent route
    const routeCount: { [key: string]: number } = {};
    completedTrips.forEach(t => {
      const route = `${t.pickup} → ${t.destination}`;
      routeCount[route] = (routeCount[route] || 0) + 1;
    });
    const mostFrequentRoute = Object.keys(routeCount).reduce((a, b) => 
      routeCount[a] > routeCount[b] ? a : b, '');

    // Favorite ride type
    const rideTypeCount: { [key: string]: number } = {};
    completedTrips.forEach(t => {
      rideTypeCount[t.rideType] = (rideTypeCount[t.rideType] || 0) + 1;
    });
    const favoriteRideType = Object.keys(rideTypeCount).reduce((a, b) => 
      rideTypeCount[a] > rideTypeCount[b] ? a : b, 'standard');

    // Peak hours
    const hourCount: { [key: string]: number } = {};
    completedTrips.forEach(t => {
      const hour = t.time.split(' ')[0].split(':')[0];
      const period = t.time.split(' ')[1];
      let hourNum = parseInt(hour);
      if (period === 'PM' && hourNum !== 12) hourNum += 12;
      if (period === 'AM' && hourNum === 12) hourNum = 0;
      const hourKey = `${hourNum}:00`;
      hourCount[hourKey] = (hourCount[hourKey] || 0) + 1;
    });
    const peakHours = Object.entries(hourCount)
      .map(([hour, trips]) => ({ hour, trips }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 5);

    // Weekly trend
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyTrend = days.map(day => ({ day, earnings: 0 }));
    const now = new Date();
    completedTrips.forEach(trip => {
      const tripDate = new Date(trip.date);
      const diffDays = Math.floor((now.getTime() - tripDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        const dayIndex = tripDate.getDay();
        weeklyTrend[dayIndex].earnings += trip.driverEarnings;
      }
    });

    // Monthly trend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend: { month: string; earnings: number }[] = [];
    const currentMonth = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      monthlyTrend.push({ month: months[monthIndex], earnings: 0 });
    }
    completedTrips.forEach(trip => {
      const tripDate = new Date(trip.date);
      const tripMonth = tripDate.getMonth();
      const monthDiff = (currentMonth - tripMonth + 12) % 12;
      if (monthDiff < 6) {
        const trendIndex = 5 - monthDiff;
        if (trendIndex >= 0 && trendIndex < monthlyTrend.length) {
          monthlyTrend[trendIndex].earnings += trip.driverEarnings;
        }
      }
    });

    // Rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: completedTrips.filter(t => Math.floor(t.passengerRating) === rating).length,
    }));

    return {
      totalTrips,
      totalDistance,
      totalEarnings,
      averageEarningsPerTrip,
      averagePassengerRating,
      totalWaitingTime,
      averageWaitingTime,
      mostFrequentRoute,
      favoriteRideType,
      peakHours,
      weeklyTrend,
      monthlyTrend,
      ratingDistribution,
    };
  }
}

export default new DriverAnalyticsService();