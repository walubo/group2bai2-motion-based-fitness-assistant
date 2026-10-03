// TEMPORARY demo screen for the SystemFX kit: shows every effect so the team
// can feel them and Torres can copy the patterns into the real components.
// Press = finger/mouse down (phones). Hover = mouse over (web/previews).

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { GlowPressable, PulsingGlow, FadeSlideIn } from '../components/fx/SystemFX';

const CYAN = '#4de8ff';
const GREEN = '#7dff9b';
const RED = '#ff5c7a';
const PURPLE = '#a855f7';
const INK = '#a9b8d0';

// EXP bar that fills itself on mount (scaleX keeps it on the native driver).
function ExpBar() {
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [fill]);
  return (
    <View style={styles.barOuter}>
      <Animated.View style={[styles.barInner, { transform: [{ scaleX: fill }] }]} />
    </View>
  );
}

function QuestCard({ title, description, color, delay }) {
  return (
    <FadeSlideIn delay={delay} style={{ width: '100%' }}>
      <GlowPressable glowColor={color} onPress={() => {}} style={styles.cardWrap}>
        <View style={[styles.card, { borderColor: color }]}>
          <Text style={[styles.cardTitle, { color }]}> {title} </Text>
          <Text style={styles.cardText}>{description}</Text>
        </View>
      </GlowPressable>
    </FadeSlideIn>
  );
}

export default function FxDemoScreen({ onBack }) {
  return (
    <View style={styles.screen}>
      <FadeSlideIn>
        <Text style={styles.title}>SYSTEM FX</Text>
        <Text style={styles.subtitle}>{'> touch / hover anything, Hunter'}</Text>
      </FadeSlideIn>

      <FadeSlideIn delay={80}>
        <Text style={styles.section}>BUTTONS - glow ignites on press & hover</Text>
      </FadeSlideIn>
      <FadeSlideIn delay={140} style={styles.row}>
        <GlowPressable glowColor={CYAN} onPress={onBack} style={styles.button}>
          <Text style={styles.buttonText}>BEGIN QUEST</Text>
        </GlowPressable>
        <GlowPressable glowColor={RED} onPress={onBack} style={styles.button}>
          <Text style={[styles.buttonText, { color: RED }]}>ABORT QUEST</Text>
        </GlowPressable>
        <GlowPressable glowColor={GREEN} onPress={onBack} style={styles.button}>
          <Text style={[styles.buttonText, { color: GREEN }]}>RESET QUEST</Text>
        </GlowPressable>
      </FadeSlideIn>

      <FadeSlideIn delay={220}>
        <Text style={styles.section}>QUEST CARDS - hover to select a gate</Text>
      </FadeSlideIn>
      <QuestCard
        title="GATE CLEARANCE: DAILY SPRINT"
        description="Run a randomized 1.5-5.0 km route. GPS tracked. 100 EXP per km."
        color={CYAN}
        delay={280}
      />
      <QuestCard
        title="SHADOW EXTRACTION: PUSH-UPS"
        description="Motion-sensor counted reps. 10 EXP per rep."
        color={PURPLE}
        delay={340}
      />

      <FadeSlideIn delay={420} style={styles.rowBetween}>
        <Text style={styles.section}>PULSING GLOW + ENTRANCES</Text>
      </FadeSlideIn>
      <FadeSlideIn delay={460} style={styles.row}>
        <PulsingGlow color={PURPLE} borderRadius={18}>
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: PURPLE }]}>LV 7 HUNTER</Text>
          </View>
        </PulsingGlow>
        <PulsingGlow color={GREEN} borderRadius={18} durationMs={900}>
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: GREEN }]}>QUEST CLEARED</Text>
          </View>
        </PulsingGlow>
      </FadeSlideIn>

      <FadeSlideIn delay={520}>
        <Text style={styles.section}>ANIMATED EXP BAR</Text>
        <ExpBar />
        <Text style={styles.note}>
          For Torres: use GlowPressable instead of Pressable, wrap screens in FadeSlideIn,
          and put PulsingGlow on badges. Everything runs on the native driver.
        </Text>
      </FadeSlideIn>

      <FadeSlideIn delay={600} style={styles.footer}>
        <GlowPressable glowColor={CYAN} onPress={onBack} style={styles.backButton}>
          <Text style={styles.buttonText}>{'< BACK TO MENU'}</Text>
        </GlowPressable>
      </FadeSlideIn>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05080f', padding: 20, paddingTop: 48, gap: 14 },
  title: { color: '#fff', fontSize: 34, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: CYAN, marginBottom: 6 },
  section: { color: INK, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rowBetween: { marginTop: 4 },
  button: { borderColor: CYAN, borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#0b1220' },
  buttonText: { color: CYAN, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  cardWrap: { borderRadius: 12 },
  card: { borderWidth: 1.5, borderRadius: 12, backgroundColor: '#0b1220', padding: 16, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  cardText: { color: INK, fontSize: 13 },
  chip: { borderColor: '#12203a', borderWidth: 1, borderRadius: 18, backgroundColor: '#0b1220', paddingVertical: 10, paddingHorizontal: 18 },
  chipText: { fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  barOuter: { height: 10, backgroundColor: '#12203a', borderRadius: 5, overflow: 'hidden' },
  barInner: { height: 10, width: '100%', backgroundColor: GREEN, borderRadius: 5, transform: [{ scaleX: 0 }] },
  note: { color: INK, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  footer: { marginTop: 'auto', alignItems: 'flex-start' },
  backButton: { borderColor: CYAN, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
});
