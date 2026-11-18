import { useEffect, useState } from 'react';
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
} from 'react-native-purchases';
import { PAYWALL_CONFIG } from './config';

export type PriceInfo = {
  /** Satın alınacak paket. */
  pkg: PurchasesPackage;
  /** Yenileme (normal) yıllık fiyat, ör. "₺12.000,00". */
  regularPrice: string;
  /** İlk yıl indirimli fiyat (intro offer), yoksa null. */
  introPrice: string | null;
  /** Aylık karşılığı, ör. "₺600". Mağaza fiyatından hesaplanır. */
  monthlyEquivalent: string;
};

function monthly(price: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(price / 12);
  } catch {
    return `${Math.round(price / 12)} ${currencyCode}`;
  }
}

function toPriceInfo(pkg: PurchasesPackage): PriceInfo {
  const p = pkg.product;
  const intro = p.introPrice;
  const firstYear = intro ? intro.price : p.price;
  return {
    pkg,
    regularPrice: p.priceString,
    introPrice: intro ? intro.priceString : null,
    monthlyEquivalent: monthly(firstYear, p.currencyCode),
  };
}

/**
 * RevenueCat'ten iki paketi çeker:
 *  - launch: %40 indirimli ilk yıl (intro offer'lı ürün)
 *  - regular: süre dolunca gösterilen normal fiyatlı ürün
 *
 * Fiyatlar ASLA koda yazılmaz; mağazadan gelir. Böylece App Store Connect'te
 * fiyat değişince ekran kendiliğinden güncellenir.
 */
export function useLunaElitPackages() {
  const [launch, setLaunch] = useState<PriceInfo | null>(null);
  const [regular, setRegular] = useState<PriceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const launchOffering = offerings.all[PAYWALL_CONFIG.launchOfferingId];
        const regularOffering =
          offerings.all[PAYWALL_CONFIG.regularOfferingId] ?? offerings.current;
        if (cancelled) return;
        if (launchOffering?.annual) setLaunch(toPriceInfo(launchOffering.annual));
        if (regularOffering?.annual) setRegular(toPriceInfo(regularOffering.annual));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Fiyatlar yüklenemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { launch, regular, loading, error };
}

export type PurchaseResult =
  | { status: 'success'; customerInfo: CustomerInfo }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function buyPackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[PAYWALL_CONFIG.entitlementId];
    return active
      ? { status: 'success', customerInfo }
      : { status: 'error', message: 'Abonelik etkinleştirilemedi.' };
  } catch (e: any) {
    if (e?.userCancelled) return { status: 'cancelled' };
    return { status: 'error', message: e?.message ?? 'Satın alma başarısız.' };
  }
}

export async function restore(): Promise<PurchaseResult> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const active = customerInfo.entitlements.active[PAYWALL_CONFIG.entitlementId];
    return active
      ? { status: 'success', customerInfo }
      : { status: 'error', message: 'Geri yüklenecek aktif abonelik bulunamadı.' };
  } catch (e: any) {
    return { status: 'error', message: e?.message ?? 'Geri yükleme başarısız.' };
  }
}
