import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'onboarded_v1';

type State = { loading: boolean; onboarded: boolean };

export function useOnboarding(): State & { complete: () => void } {
  const [state, setState] = useState<State>({ loading: true, onboarded: false });

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (active) setState({ loading: false, onboarded: v === '1' });
      })
      .catch(() => {
        if (active) setState({ loading: false, onboarded: true });
      });
    return () => {
      active = false;
    };
  }, []);

  function complete() {
    AsyncStorage.setItem(KEY, '1').catch(() => {});
    setState({ loading: false, onboarded: true });
  }

  return { ...state, complete };
}
