import { auth, db } from '../config/firebase';
import { ref, get, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';

export interface FavoritePlace {
  id: string;
  name: string;
  address: string;
  icon: string;
  color: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

class FavoritePlacesService {
  // Get all favorite places for the current user
  async getFavoritePlaces(): Promise<FavoritePlace[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return [];

      const favoritesRef = ref(db, `favorite_places/${currentUser.uid}`);
      const snapshot = await get(favoritesRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const data = snapshot.val();
      const places: FavoritePlace[] = [];
      
      // Convert object to array
      for (const [id, value] of Object.entries(data)) {
        const item = value as any;
        places.push({
          id: id,
          name: item.name,
          address: item.address,
          icon: item.icon || '📍',
          color: item.color || '#0EA5E9',
          latitude: item.latitude,
          longitude: item.longitude,
          isDefault: item.isDefault || false,
        });
      }
      
      return places;
    } catch (error) {
      console.log('Error getting favorite places:', error);
      return [];
    }
  }

  // Add a new favorite place
  async addFavoritePlace(place: Omit<FavoritePlace, 'id'>): Promise<FavoritePlace | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      // Generate a unique ID
      const newId = Date.now().toString();
      const favoriteRef = ref(db, `favorite_places/${currentUser.uid}/${newId}`);
      
      const newPlace = {
        name: place.name,
        address: place.address,
        icon: place.icon || '📍',
        color: place.color || '#0EA5E9',
        latitude: place.latitude || null,
        longitude: place.longitude || null,
        isDefault: place.isDefault || false,
        createdAt: new Date().toISOString(),
      };
      
      await set(favoriteRef, newPlace);

      return {
        id: newId,
        name: place.name,
        address: place.address,
        icon: place.icon || '📍',
        color: place.color || '#0EA5E9',
        latitude: place.latitude,
        longitude: place.longitude,
        isDefault: place.isDefault || false,
      };
    } catch (error) {
      console.log('Error adding favorite place:', error);
      return null;
    }
  }

  // Update a favorite place
  async updateFavoritePlace(id: string, updates: Partial<FavoritePlace>): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const favoriteRef = ref(db, `favorite_places/${currentUser.uid}/${id}`);
      
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
      if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
      if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;

      await update(favoriteRef, updateData);
      return true;
    } catch (error) {
      console.log('Error updating favorite place:', error);
      return false;
    }
  }

  // Delete a favorite place
  async deleteFavoritePlace(id: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const favoriteRef = ref(db, `favorite_places/${currentUser.uid}/${id}`);
      await remove(favoriteRef);
      return true;
    } catch (error) {
      console.log('Error deleting favorite place:', error);
      return false;
    }
  }
}

export default new FavoritePlacesService();