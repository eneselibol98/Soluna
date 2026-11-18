import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CustomerInfo } from 'react-native-purchases';

import { colors, fonts } from './theme';
import { LUNA_ELIT_FEATURES, PAYWALL_CONFIG } from './config';
import { useLimitedOffer, markLaunchPaywallSeen } from './useLimitedOffer';
import { buyPackage, restore, useLunaElitPackages } from './useLunaElitPackages';

const logo = require('./assets/logo.png');
const watch = require('./assets/watch.png');

export type LunaElitPaywallProps = {
  /** Kapat (X) – her zaman görünür olmalı. */
  onClose: () => void;
  /** "İlk ilanımı ücretsiz ver" – ilan verme akışına yönlendirin. */
  onFreeListing: () => void;
  /** Satın alma ya da geri yükleme başarılı olunca. */
  onPurchased: (info: CustomerInfo) => void;
};

export default function LunaElitPaywall({ onClose, onFreeListing, onPurchased }: LunaElitPaywallProps) {
  const offer = useLimitedOffer();
  const { launch, regular, loading: pricesLoading } = useLunaElitPackages();
  const [busy, setBusy] = useState(false);

  // Teklif aktifse ve launch paketi geldiyse indirimli paket; aksi halde normal paket.
  // Süre dolduktan sonra launch paketine ASLA düşmeyiz (indirim sızmasın).
  const showDiscount = offer.isLive && !!launch?.introPrice;
  const active = showDiscount ? launch : regular;

  const close = async () => {
    await markLaunchPaywallSeen();
    onClose();
  };

  const freeListing = async () => {
    await markLaunchPaywallSeen();
    onFreeListing();
  };

  const purchase = async () => {
    if (!active || busy) return;
    setBusy(true);
    const res = await buyPackage(active.pkg);
    setBusy(false);
    if (res.status === 'success') {
      await markLaunchPaywallSeen();
      onPurchased(res.customerInfo);
    } else if (res.status === 'error') {
      Alert.alert('Satın alma tamamlanamadı', res.message);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    const res = await restore();
    setBusy(false);
    if (res.status === 'success') {
      await markLaunchPaywallSeen();
      onPurchased(res.customerInfo);
    } else if (res.status === 'error') {
      Alert.alert('Geri yükleme', res.message);
    }
  };

  const loading = offer.loading || pricesLoading;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} bounces={false}>
        {/* Üst bar */}
        <View style={s.topBar}>
          <Image source={logo} style={s.logo} resizeMode="contain" accessibilityLabel="SOLUNA Watch" />
          <Pressable onPress={close} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={8}>
            <Svg width={18} height={18} viewBox="0 0 18 18">
              <Path d="M4 4l10 10M14 4L4 14" stroke={colors.creamSoft} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        {/* Saat + rozet */}
        <View style={s.hero}>
          <Svg width={260} height={260} style={s.glow} pointerEvents="none">
            <Defs>
              <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={colors.gold} stopOpacity={0.28} />
                <Stop offset="0.7" stopColor={colors.gold} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={260} height={260} fill="url(#g)" />
          </Svg>
          <Image source={watch} style={s.watch} resizeMode="contain" accessibilityLabel="Tiffany mavisi kadranlı saat" />
          {showDiscount && (
            <View style={s.badge}>
              <Text style={s.badgeBig}>%40</Text>
              <Text style={s.badgeSmall}>İNDİRİM</Text>
            </View>
          )}
        </View>

        {/* Sayaç / süre doldu */}
        <View style={s.center}>
          {offer.isLive ? (
            <View style={s.timerPill}>
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Circle cx={8} cy={8} r={6.5} stroke={colors.gold} strokeWidth={1.6} fill="none" />
                <Path d="M8 4.5V8l2.4 1.6" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" fill="none" />
              </Svg>
              <Text style={s.timerLabel}>SANA ÖZEL TEKLİF</Text>
              <Text style={s.timer} accessibilityLabel={`Kalan süre ${offer.timerLabel}`}>{offer.timerLabel}</Text>
            </View>
          ) : offer.isExpired ? (
            <View style={s.expiredPill}>
              <Text style={s.expiredLabel}>TEKLİF SÜRESİ DOLDU</Text>
            </View>
          ) : null}
        </View>

        <Text style={s.title}>Luna Elit</Text>
        <Text style={s.subtitle}>Satıcılar için yıllık elit üyelik</Text>

        {/* Fiyat – mağazadan gelir */}
        <View style={[s.center, { marginTop: 12, minHeight: 72 }]}>
          {loading || !active ? (
            <ActivityIndicator color={colors.gold} />
          ) : showDiscount ? (
            <>
              <View style={s.priceRow}>
                <Text style={s.strike}>{active.regularPrice}</Text>
                <Text style={s.price}>{active.introPrice}</Text>
                <Text style={s.per}>/ yıl</Text>
              </View>
              <Text style={s.monthly}>Aylık {active.monthlyEquivalent}'ye denk geliyor</Text>
            </>
          ) : (
            <>
              <View style={s.priceRow}>
                <Text style={s.price}>{active.regularPrice}</Text>
                <Text style={s.per}>/ yıl</Text>
              </View>
              <Text style={s.monthly}>Aylık {active.monthlyEquivalent}'ye denk geliyor</Text>
            </>
          )}
        </View>

        {/* Özellikler */}
        <View style={s.features}>
          {LUNA_ELIT_FEATURES.map((f) => (
            <View key={f} style={s.featureRow}>
              <Svg width={22} height={22} viewBox="0 0 22 22">
                <Circle cx={11} cy={11} r={11} fill={colors.gold} />
                <Path d="M6.5 11.2l3 3 6-6.2" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexGrow: 1 }} />

        {/* Aksiyonlar */}
        <Pressable
          onPress={purchase}
          disabled={!active || busy}
          style={({ pressed }) => [s.cta, (pressed || busy) && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={s.ctaText}>Luna Elit'e Geç</Text>}
        </Pressable>
        <Pressable onPress={freeListing} style={s.secondary} accessibilityRole="button">
          <Text style={s.secondaryText}>İlk ilanımı ücretsiz ver</Text>
        </Pressable>

        {/* Yasal metin – yenileme fiyatı açıkça yazmalı */}
        {active && (
          <Text style={s.fine}>
            {showDiscount
              ? `İlk yıl ${active.introPrice}, ardından yıllık ${active.regularPrice} olarak otomatik yenilenir. `
              : `Yıllık ${active.regularPrice}, otomatik yenilenir. `}
            App Store ayarlarından istediğin zaman iptal edebilirsin.
          </Text>
        )}
        <View style={s.links}>
          <Text style={s.link} onPress={() => Linking.openURL(PAYWALL_CONFIG.termsUrl)} accessibilityRole="link">
            Kullanım Koşulları
          </Text>
          <Text style={s.link} onPress={() => Linking.openURL(PAYWALL_CONFIG.privacyUrl)} accessibilityRole="link">
            Gizlilik
          </Text>
          <Text style={s.link} onPress={doRestore} accessibilityRole="button">
            Satın Alımları Geri Yükle
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 6, paddingBottom: 18 },
  topBar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { height: 30, width: 110 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.closeBg, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 172, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  glow: { position: 'absolute' },
  watch: { height: 176, width: 100 },
  badge: {
    position: 'absolute', right: 44, top: 10, width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '10deg' }],
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
  },
  badgeBig: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.ink, lineHeight: 28 },
  badgeSmall: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.5, color: colors.ink, marginTop: 2 },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 16, borderRadius: 18,
    backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.goldBorder, gap: 10,
  },
  timerLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12, letterSpacing: 2.4, color: colors.gold },
  timer: { fontFamily: fonts.mono, fontSize: 15, fontWeight: '700', color: '#F6EFE0', minWidth: 48, fontVariant: ['tabular-nums'] },
  expiredPill: {
    height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center',
    backgroundColor: colors.mutedTint, borderWidth: 1, borderColor: colors.mutedBorder,
  },
  expiredLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12, letterSpacing: 2.4, color: colors.gray },
  title: { marginTop: 12, textAlign: 'center', fontFamily: fonts.serifBold, fontSize: 40, color: colors.white },
  subtitle: { marginTop: 4, textAlign: 'center', fontFamily: fonts.sansRegular, fontSize: 14, color: colors.gray },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  strike: { fontFamily: fonts.sansRegular, fontSize: 18, color: colors.gray, textDecorationLine: 'line-through' },
  price: { fontFamily: fonts.serifBold, fontSize: 44, color: colors.goldLight },
  per: { fontFamily: fonts.sansRegular, fontSize: 16, color: colors.creamSoft },
  monthly: { marginTop: 6, fontFamily: fonts.sansRegular, fontSize: 13, color: colors.gray, textAlign: 'center' },
  features: { marginTop: 18, gap: 9 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontFamily: fonts.sansRegular, fontSize: 14.5, color: colors.cream, flexShrink: 1 },
  cta: {
    marginTop: 16, height: 56, borderRadius: 28, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.gold, shadowOpacity: 0.25, shadowRadius: 15, shadowOffset: { width: 0, height: 10 },
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.ink },
  secondary: { height: 44, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.gold },
  fine: { marginTop: 6, fontFamily: fonts.sansRegular, fontSize: 11, lineHeight: 16, color: colors.gray, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 6 },
  link: { fontFamily: fonts.sansRegular, fontSize: 11, color: colors.gold, paddingVertical: 4 },
});
