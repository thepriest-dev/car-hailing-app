// src/services/rideHistoryService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RideRecord {
  id: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  distance: number;
  duration: number;
  fare: number;
  driverName: string;
  driverRating: number;
  rideType: 'standard' | 'comfort' | 'business' | 'luxury';
  status: 'completed' | 'cancelled' | 'pending';
  paymentMethod: 'card' | 'wallet';
}

export interface RideStats {
  totalRides: number;
  totalDistance: number;
  totalSpent: number;
  averageFare: number;
  averageRating: number;
  mostFrequentRoute: string;
  favoriteRideType: string;
  weeklyTrend: { day: string; rides: number }[];
  monthlyTrend: { month: string; spent: number }[];
}

const STORAGE_KEY = 'ride_history';

class RideHistoryService {
  // Mock ride data - will come from backend
  private mockRides: RideRecord[] = [
    {
      id: '1',
      date: '2024-05-20',
      time: '08:30 AM',
      pickup: 'Ikeja, Lagos',
      destination: 'Victoria Island, Lagos',
      distance: 4.2,
      duration: 12,
      fare: 1950,
      driverName: 'James Adeyemi',
      driverRating: 4.8,
      rideType: 'standard',
      status: 'completed',
      paymentMethod: 'card',
    },
    {
      id: '2',
      date: '2024-05-19',
      time: '06:45 PM',
      pickup: 'Lekki, Lagos',
      destination: 'Surulere, Lagos',
      distance: 3.8,
      duration: 10,
      fare: 1800,
      driverName: 'Blessing Okon',
      driverRating: 4.9,
      rideType: 'comfort',
      status: 'completed',
      paymentMethod: 'wallet',
    },
    {
      id: '3',
      date: '2024-05-18',
      time: '07:15 AM',
      pickup: 'Yaba, Lagos',
      destination: 'Ajah, Lagos',
      distance: 5.5,
      duration: 18,
      fare: 3100,
      driverName: 'Michael Okafor',
      driverRating: 4.7,
      rideType: 'standard',
      status: 'completed',
      paymentMethod: 'card',
    },
    {
      id: '4',
      date: '2024-05-17',
      time: '09:30 PM',
      pickup: 'Airport, Lagos',
      destination: 'Ikeja, Lagos',
      distance: 3.2,
      duration: 8,
      fare: 1600,
      driverName: 'Ada Nwachukwu',
      driverRating: 4.6,
      rideType: 'business',
      status: 'cancelled',
      paymentMethod: 'card',
    },
    {
      id: '5',
      date: '2024-05-16',
      time: '02:15 PM',
      pickup: 'Victoria Island, Lagos',
      destination: 'Lekki, Lagos',
      distance: 4.5,
      duration: 15,
      fare: 2100,
      driverName: 'Emeka Johnson',
      driverRating: 5.0,
      rideType: 'standard',
      status: 'completed',
      paymentMethod: 'wallet',
    },
    {
      id: '6',
      date: '2024-05-15',
      time: '11:00 AM',
      pickup: 'Ikeja, Lagos',
      destination: 'Maryland, Lagos',
      distance: 2.5,
      duration: 7,
      fare: 1200,
      driverName: 'Funke Adeleke',
      driverRating: 4.8,
      rideType: 'standard',
      status: 'completed',
      paymentMethod: 'card',
    },
    {
      id: '7',
      date: '2024-05-14',
      time: '05:20 PM',
      pickup: 'Surulere, Lagos',
      destination: 'Yaba, Lagos',
      distance: 2.8,
      duration: 8,
      fare: 1350,
      driverName: 'Chidi Obi',
      driverRating: 4.5,
      rideType: 'standard',
      status: 'completed',
      paymentMethod: 'wallet',
    },
  ];

  async getRideHistory(): Promise<RideRecord[]> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      // Return mock data for demo
      return this.mockRides;
    } catch (error) {
      console.log('Error loading ride history:', error);
      return this.mockRides;
    }
  }

  async addRide(ride: Omit<RideRecord, 'id'>): Promise<void> {
    const rides = await this.getRideHistory();
    const newRide = { ...ride, id: Date.now().toString() };
    rides.unshift(newRide);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rides));
  }

  async getRideList(): Promise<RideRecord[]> {
  return this.getRideHistory();
}

  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  calculateStats(rides: RideRecord[]): RideStats {
    const completedRides = rides.filter(r => r.status === 'completed');
    const totalRides = completedRides.length;
    const totalDistance = completedRides.reduce((sum, r) => sum + r.distance, 0);
    const totalSpent = completedRides.reduce((sum, r) => sum + r.fare, 0);
    const averageFare = totalRides > 0 ? totalSpent / totalRides : 0;
    const averageRating = totalRides > 0 
      ? completedRides.reduce((sum, r) => sum + r.driverRating, 0) / totalRides 
      : 0;

    // Find most frequent route
    const routeCount: { [key: string]: number } = {};
    completedRides.forEach(r => {
      const route = `${r.pickup} → ${r.destination}`;
      routeCount[route] = (routeCount[route] || 0) + 1;
    });
    const mostFrequentRoute = Object.keys(routeCount).reduce((a, b) => 
      routeCount[a] > routeCount[b] ? a : b, '');

    // Find favorite ride type
    const rideTypeCount: { [key: string]: number } = {};
    completedRides.forEach(r => {
      rideTypeCount[r.rideType] = (rideTypeCount[r.rideType] || 0) + 1;
    });
    const favoriteRideType = Object.keys(rideTypeCount).reduce((a, b) => 
      rideTypeCount[a] > rideTypeCount[b] ? a : b, 'standard');

    // Weekly trend (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyTrend = days.map(day => ({ day, rides: 0 }));
    const now = new Date();
    completedRides.forEach(ride => {
      const rideDate = new Date(ride.date);
      const diffDays = Math.floor((now.getTime() - rideDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        const dayIndex = rideDate.getDay();
        weeklyTrend[dayIndex].rides++;
      }
    });

    // Monthly trend (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend: { month: string; spent: number }[] = [];
    const currentMonth = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      monthlyTrend.push({ month: months[monthIndex], spent: 0 });
    }
    completedRides.forEach(ride => {
      const rideDate = new Date(ride.date);
      const rideMonth = rideDate.getMonth();
      const monthDiff = (currentMonth - rideMonth + 12) % 12;
      if (monthDiff < 6) {
        const trendIndex = 5 - monthDiff;
        if (trendIndex >= 0 && trendIndex < monthlyTrend.length) {
          monthlyTrend[trendIndex].spent += ride.fare;
        }
      }
    });

    return {
      totalRides,
      totalDistance,
      totalSpent,
      averageFare,
      averageRating,
      mostFrequentRoute,
      favoriteRideType,
      weeklyTrend,
      monthlyTrend,
    };
  }
}

export default new RideHistoryService();