import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Chip } from '@/src/components/shared/Chip';
import { ColorWheelPicker } from '@/src/components/shared/ColorWheelPicker';
import { Slider } from '@/src/components/shared/Slider';
import { colors, applyTheme, applyFontColor } from '@/src/components/shared/colors';
import { applyFontScale } from '@/src/components/shared/typography';
import { useShopSettings } from '@/src/hooks/useShopSettings';
import { shopRepository, membershipRepository } from '@/src/db/repositories';
import { ShopSettings } from '@/src/models';
import { BACKGROUND_PATTERN_OPTIONS, backgroundPatternCss } from '@/src/utils/backgroundPattern';
import { showAlert } from '@/src/utils/alert';
import { useThemeStore } from '@/src/store/themeStore';
import { useCurrentAuth } from '@/src/context/AuthContext';
import { strings } from '@/src/i18n/strings';

const DEFAULT_COLOR = '#4F46E5';
const MIN_FONT_SCALE = 0.85;
const MAX_FONT_SCALE = 1.5;

const FONT_COLOR_OPTIONS: { label: string; hex: string }[] = [
  { label: 'Nero', hex: '#0F172A' },
  { label: 'Grigio', hex: '#64748B' },
  { label: 'Bianco', hex: '#FFFFFF' },
];

export default function AppearanceScreen() {
  const { profile, reloadProfile } = useCurrentAuth();
  const isOwner = profile?.role === 'owner';
  const { settings, loading: settingsLoading, reload: reloadSettings } = useShopSettings();
  const bumpTheme = useThemeStore((s) => s.bump);

  // Fonte di verità per le modifiche in corso: si aggiorna in modo sincrono ad ogni scelta
  // (anteprima o salvataggio), quindi non risente di eventuali ricariche dal database ancora in
  // corso. Usare invece `settings` (stato React) per unire le modifiche creerebbe una corsa: se
  // si sceglie un colore e poi si sposta subito lo slider della trasparenza, il secondo salvataggio
  // partirebbe da un `settings` non ancora aggiornato con il colore appena scelto, cancellandolo.
  const draftRef = useRef(settings);
  useEffect(() => {
    draftRef.current = settings;
  }, [settings]);

  // Anteprima immediata mentre si trascina sulla ruota/sul cursore: aggiorna solo lo stato
  // locale del tema, senza scrivere sul database (verrebbe chiamato troppo spesso durante il
  // trascinamento).
  const previewTheme = (patch: Partial<ShopSettings>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    applyTheme(next);
    bumpTheme();
  };

  // Salva sul database: chiamato al rilascio del dito/mouse.
  const commitTheme = async (patch: Partial<ShopSettings>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    applyTheme(next);
    bumpTheme();
    try {
      await shopRepository.updateShopSettings(next);
      await reloadSettings();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    }
  };

  const currentFontScale = profile?.fontScale ?? 1;
  const fontScaleSliderValue = (currentFontScale - MIN_FONT_SCALE) / (MAX_FONT_SCALE - MIN_FONT_SCALE);

  // A differenza degli altri cursori, qui NON si applica lo zoom durante il trascinamento: lo
  // zoom cambierebbe le dimensioni della schermata (quindi anche del cursore stesso) mentre lo
  // si trascina, creando un cortocircuito che lo rende pressoché impossibile da usare. Il
  // cursore si sposta comunque fluido (gestito internamente da Slider): il testo cambia solo al
  // rilascio.
  const commitFontScale = async (sliderValue: number) => {
    const scale = MIN_FONT_SCALE + sliderValue * (MAX_FONT_SCALE - MIN_FONT_SCALE);
    applyFontScale(scale);
    bumpTheme();
    try {
      await membershipRepository.updateOwnFontSettings(scale, profile?.fontColor);
      await reloadProfile();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    }
  };

  // Il colore del testo è usato da moltissimi componenti condivisi in tutta l'app, calcolato una
  // sola volta al caricamento di ciascuno: per essere sicuri che il nuovo colore si applichi
  // ovunque in modo affidabile, dopo averlo salvato si ricarica la pagina (solo web).
  const commitFontColor = async (hex: string) => {
    applyFontColor(hex);
    bumpTheme();
    try {
      await membershipRepository.updateOwnFontSettings(currentFontScale, hex);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.reload();
        return;
      }
      await reloadProfile();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ScreenContainer>
      {isOwner && settingsLoading && (
        <Text style={styles.hint}>{strings.common.loading}</Text>
      )}

      {isOwner && !settingsLoading && (
        <>
          <Text style={styles.sectionTitle}>Colori</Text>
          <Text style={styles.hint}>
            Scegli i colori e lo sfondo dell'app. Le scelte si applicano subito a tutti gli account
            dell'azienda.
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Colore principale</Text>
            <ColorWheelPicker
              initialValue={settings.primaryColor ?? DEFAULT_COLOR}
              onChange={(hex) => previewTheme({ primaryColor: hex })}
              onChangeComplete={(hex) => commitTheme({ primaryColor: hex })}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Colore secondario</Text>
            <ColorWheelPicker
              initialValue={settings.accentColor ?? DEFAULT_COLOR}
              onChange={(hex) => previewTheme({ accentColor: hex })}
              onChangeComplete={(hex) => commitTheme({ accentColor: hex })}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Colore sfondo</Text>
            <ColorWheelPicker
              initialValue={settings.backgroundColor ?? settings.primaryColor ?? DEFAULT_COLOR}
              onChange={(hex) => previewTheme({ backgroundColor: hex })}
              onChangeComplete={(hex) => commitTheme({ backgroundColor: hex })}
            />

            <Text style={[styles.label, styles.spacedLabel]}>Trasparenza sfondo</Text>
            <Text style={styles.hint}>
              Da sinistra (invisibile) a destra (colore pieno su tutta la schermata).
            </Text>
            <Slider
              initialValue={(settings.backgroundOpacity ?? 0) / 100}
              onChange={(value) => previewTheme({ backgroundOpacity: Math.round(value * 100) })}
              onChangeComplete={(value) => commitTheme({ backgroundOpacity: Math.round(value * 100) })}
            />

            <Text style={[styles.label, styles.spacedLabel]}>Motivo di sfondo</Text>
            <Text style={styles.hint}>
              Al posto del colore pieno, un motivo ripetuto nei due colori dell'app (visibile solo
              sul sito, non ancora sull'app nativa).
            </Text>
            <View style={styles.patternRow}>
              {BACKGROUND_PATTERN_OPTIONS.map((option) => {
                const patternCss =
                  Platform.OS === 'web'
                    ? backgroundPatternCss(option.id, settings.primaryColor ?? DEFAULT_COLOR, settings.accentColor ?? DEFAULT_COLOR)
                    : null;
                const selected = (settings.backgroundPattern ?? 'none') === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => commitTheme({ backgroundPattern: option.id })}
                    style={[styles.patternSwatch, selected && styles.patternSwatchSelected]}
                  >
                    <View
                      style={[
                        styles.patternPreview,
                        (patternCss ? { background: patternCss } : { backgroundColor: colors.background }) as object,
                      ]}
                    />
                    <Text style={styles.patternLabel} numberOfLines={2}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Intensità ombre</Text>
            <Text style={styles.hint}>
              Regola quanto sono marcate le ombre di card, pulsanti e riquadri (utile su sfondi
              molto chiari o molto scuri).
            </Text>
            <Slider
              initialValue={Math.max(0, Math.min(2, (settings.shadowIntensity ?? 100) / 100)) / 2}
              onChange={(value) => previewTheme({ shadowIntensity: Math.round(value * 200) })}
              onChangeComplete={(value) => commitTheme({ shadowIntensity: Math.round(value * 200) })}
            />
          </View>
        </>
      )}

      <Text style={[styles.sectionTitle, isOwner && styles.spacedSection]}>Carattere</Text>
      <Text style={styles.hint}>
        Impostazioni personali di lettura: valgono solo per il tuo account, su questo dispositivo.
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Dimensione testo</Text>
        <View style={styles.fontScaleRow}>
          <Slider
            initialValue={Math.max(0, Math.min(1, fontScaleSliderValue))}
            onChange={() => {}}
            onChangeComplete={commitFontScale}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Colore testo</Text>
        <Text style={styles.hint}>Assicurati che resti leggibile rispetto allo sfondo.</Text>
        <View style={styles.chipsRow}>
          {FONT_COLOR_OPTIONS.map((option) => (
            <Chip
              key={option.hex}
              label={option.label}
              color={option.hex === '#FFFFFF' ? colors.border : option.hex}
              selected={(profile?.fontColor ?? '#0F172A') === option.hex}
              onPress={() => commitFontColor(option.hex)}
            />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  spacedSection: {
    marginTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
  },
  spacedLabel: {
    marginTop: 20,
  },
  fontScaleRow: {
    alignItems: 'flex-start',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patternRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  patternSwatch: {
    width: 88,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  patternSwatchSelected: {
    borderColor: colors.accent,
  },
  patternPreview: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  patternLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
