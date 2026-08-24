import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { shopRepository } from '@/src/db/repositories';
import { ShopSettings } from '@/src/models';

export function useShopSettings() {
  const [settings, setSettings] = useState<ShopSettings>({ allowMultipleShiftsPerDay: false });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await shopRepository.getShopSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { settings, loading, reload };
}
