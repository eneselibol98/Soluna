import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAYWALL_CONFIG } from './config';

/**
 * 5 dakikalık teklif sayacı.
 *
 * Sayacın başlangıç zamanı cihazda saklanır: uygulama kapatılıp açılsa da
 * süre KALDIĞI YERDEN devam eder ve dolduktan sonra bir daha başlamaz.
 * (Her açılışta sıfırlanan sayaç, Apple ve tüketici mevzuatı açısından
 * yanıltıcı sayılır.) Uygulama silinip yeniden kurulursa AsyncStorage
 * temizlenir; bunu da engellemek isterseniz başlangıç zamanını kullanıcı
 * hesabına bağlı olarak sunucuda tutun.
 */
export function useLimitedOffer(durationSeconds = PAYWALL_CONFIG.offerDurationSeconds) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const compute = () => {
      if (startedAt.current == null) return;
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const left = Math.max(0, durationSeconds - elapsed);
      setSecondsLeft(left);
      if (left <= 0 && timer) clearInterval(timer);
    };

    (async () => {
      const key = PAYWALL_CONFIG.storageKeys.offerStartedAt;
      let stored = await AsyncStorage.getItem(key);
      if (!stored) {
        stored = String(Date.now());
        await AsyncStorage.setItem(key, stored);
      }
      if (cancelled) return;
      startedAt.current = Number(stored);
      compute();
      timer = setInterval(compute, 1000);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [durationSeconds]);

  const loading = secondsLeft == null;
  const left = secondsLeft ?? durationSeconds;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return {
    loading,
    secondsLeft: left,
    timerLabel: `${mm}:${ss}`,
    isLive: !loading && left > 0,
    isExpired: !loading && left <= 0,
  };
}

/** Açılış paywall'u daha önce gösterildi mi? (Uygulama açılışında kontrol edin.) */
export async function shouldShowLaunchPaywall(): Promise<boolean> {
  const seen = await AsyncStorage.getItem(PAYWALL_CONFIG.storageKeys.launchPaywallSeen);
  return seen !== '1';
}

/** Kullanıcı paywall'u kapattığında / satın aldığında çağırın. */
export async function markLaunchPaywallSeen(): Promise<void> {
  await AsyncStorage.setItem(PAYWALL_CONFIG.storageKeys.launchPaywallSeen, '1');
}
