import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Chip } from '@/src/components/shared/Chip';
import { ColorWheelPicker } from '@/src/components/shared/ColorWheelPicker';
import { Slider } from '@/src/components/shared/Slider';
import { colors, applyTheme, applyFontColor } from '@/src/components/shared/colors';
import { applyFontScale } from '@/src/components/shared/typography';
import { useShopSettings } from '@/src/hooks/useShopSettings';
import { shopRepository, membershipRepository } from '@/src/db/repositories';
import { ShopSettings } from '@/src/models';
import { showAlert } from '@/src/utils/alert';
import { useThemeStore } from '@/src/store/themeStore';
import { useCurrentAuth } from '@/src/context/AuthContext';

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
  const { settings, reload: reloadSettings } = useShopSettings();
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

  const previewFontScale = (sliderValue: number) => {
    applyFontScale(MIN_FONT_SCALE + sliderValue * (MAX_FONT_SCALE - MIN_FONT_SCALE));
    bumpTheme();
  };

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
      {isOwner && (
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
            onChange={previewFontScale}
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
});
