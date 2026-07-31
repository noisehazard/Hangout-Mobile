import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { CHISINAU_REGION, DEFAULT_REGION } from '@/data/mockEvents';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type LocationState = {
  region: Region;
  loading: boolean;
  usingFallback: boolean;
};

export function useUserLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    region: DEFAULT_REGION,
    loading: true,
    usingFallback: true,
  });

  useEffect(() => {
    let cancelled = false;

    if (__DEV__) {
      setState({ region: CHISINAU_REGION, loading: false, usingFallback: false });
      return;
    }

    async function resolve() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setState({ region: DEFAULT_REGION, loading: false, usingFallback: true });
          }
          return;
        }

        const position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((res) => setTimeout(() => res(null), 8000)),
        ]);
        if (cancelled) return;

        if (!position) {
          setState({ region: DEFAULT_REGION, loading: false, usingFallback: true });
          return;
        }

        setState({
          region: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: DEFAULT_REGION.latitudeDelta,
            longitudeDelta: DEFAULT_REGION.longitudeDelta,
          },
          loading: false,
          usingFallback: false,
        });
      } catch {
        if (!cancelled) {
          setState({ region: DEFAULT_REGION, loading: false, usingFallback: true });
        }
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
