// RevenueCat ve teklif ayarları. Ürün/offering kimlikleri App Store Connect ve
// RevenueCat panelindekilerle birebir aynı olmalı (README > "Mağaza kurulumu").

export const PAYWALL_CONFIG = {
  /** Teklif süresi (saniye). */
  offerDurationSeconds: 5 * 60,

  /** RevenueCat entitlement kimliği. */
  entitlementId: 'luna_elit',

  /** %40 indirimli ilk yıl teklifi: intro offer'lı ürünü içeren offering. */
  launchOfferingId: 'luna_elit_launch',

  /** Teklif süresi dolunca gösterilecek normal fiyatlı offering. */
  regularOfferingId: 'default',

  /** Yasal linkler (Apple zorunlu tutar). */
  termsUrl: 'https://soluna.watch/kullanim-kosullari',
  privacyUrl: 'https://soluna.watch/gizlilik',

  /** AsyncStorage anahtarları. */
  storageKeys: {
    offerStartedAt: 'soluna.lunaElit.offerStartedAt',
    launchPaywallSeen: 'soluna.lunaElit.launchPaywallSeen',
  },
};

/** Paywall'daki özellik listesi (sıra önemli). */
export const LUNA_ELIT_FEATURES = [
  '20 ilana kadar, 12 ay yayında',
  'Ana sayfada öncelikli gösterim',
  'Elit Satıcı rozeti',
  'Detaylı analiz paneli',
  'Öncelikli destek',
  'Satışlarından %0 komisyon',
];
