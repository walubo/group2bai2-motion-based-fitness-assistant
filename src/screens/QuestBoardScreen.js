// QUEST BOARD: the Hunter picks a quest. Pure UI — every card routes to a
// screen; all data is static quest definitions. Themed after the System
// (blue panel look from src/theme/theme.js) with SystemFX motion.

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, textGlow, glow } from '../theme/theme';
import { GlowPressable, FadeSlideIn } from '../components/fx/SystemFX';

const QUESTS = [
  {
    key: 'rep',
    icon: 'sword-cross',
    lib: 'MaterialCommunityIcons',
    title: 'SHADOW EXTRACTION',
    subtitle: 'PUSH-UP PROTOCOL',
    description: 'Motion-sensor counted reps. Place the phone on your back and extract.',
    reward: '10 EXP per rep',
    color: colors.blueLight,
  },
  {
    key: 'gps',
    icon: 'run-fast',
    lib: 'MaterialCommunityIcons',
    title: 'GATE CLEARANCE',
    subtitle: 'DAILY SPRINT',
    description: 'A randomized 1.5-5.0 km run, tracked live on the map behind you.',
    reward: '100 EXP per km',
    color: colors.cyan,
  },
  {
    key: 'calib',
    icon: 'scan-helper',
    lib: 'MaterialCommunityIcons',
    title: 'SYSTEM SCAN',
    subtitle: 'BODY CALIBRATION',
    description: 'Fit the T-pose outline so the System can measure your body.',
    reward: 'Required before camera quests',
    color: colors.success,
  },
];

function QuestCard({ quest, onPress, delay }) {
  const Icon = quest.lib === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
  return (
    <FadeSlideIn delay={delay} style={{ width: '100%' }}>
      <GlowPressable glowColor={quest.color} borderRadius={14} onPress={onPress} style={styles.cardWrap}>
        <View style={[styles.card, { borderColor: quest.color }]}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBox, { borderColor: quest.color }]}>
              <Icon name={quest.icon} size={30} color={quest.color} />
            </View>
            <View style={styles.cardTitles}>
              <Text style={[styles.cardTitle, { color: quest.color }]}>{quest.title}</Text>
              <Text style={styles.cardSubtitle}>{quest.subtitle}</Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{quest.description}</Text>
          <View style={styles.cardBottom}>
            <Text style={[styles.cardReward, { color: quest.color }]}>{quest.reward}</Text>
            <Text style={styles.cardArrow}>{'>'}{'>'}</Text>
          </View>
        </View>
      </GlowPressable>
    </FadeSlideIn>
  );
}

export default function QuestBoardScreen({ onBack, onSelect }) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeSlideIn>
          <View style={styles.header}>
            <Text style={[styles.title, textGlow(colors.blue)]}>QUEST BOARD</Text>
            <Text style={styles.subtitle}>{'> Choose your gate, Hunter'}</Text>
          </View>
        </FadeSlideIn>

        {QUESTS.map((q, i) => (
          <QuestCard key={q.key} quest={q} delay={100 + i * 90} onPress={() => onSelect(q.key)} />
        ))}

        <FadeSlideIn delay={400} style={styles.footer}>
          <GlowPressable glowColor={colors.mutedText} onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>{'< STATUS WINDOW'}</Text>
          </GlowPressable>
        </FadeSlideIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: 56, gap: spacing.md },
  header: { marginBottom: spacing.sm },
  title: {
    color: '#ffffff',
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  subtitle: { color: colors.blueLight, fontFamily: fonts.body, fontSize: 12, letterSpacing: 2, marginTop: 2 },
  cardWrap: { borderRadius: 14 },
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: colors.panelBlue,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { borderWidth: 1.5, borderRadius: 12, padding: 10 },
  cardTitles: { flex: 1 },
  cardTitle: { fontFamily: fonts.heading, fontSize: 17, fontWeight: 'bold', letterSpacing: 1 },
  cardSubtitle: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 11, letterSpacing: 2, marginTop: 2 },
  cardDescription: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 13 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  cardReward: { fontFamily: fonts.body, fontSize: 12, fontWeight: 'bold' },
  cardArrow: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 14 },
  footer: { marginTop: spacing.sm, alignItems: 'flex-start', paddingBottom: spacing.xl },
  backButton: { borderColor: colors.mutedText, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  backText: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold' },
});
