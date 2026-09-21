import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider, useGame } from '@/shell/GameProvider';
import { NavigationProvider, useNavigation } from '@/shell/navigation';
import { ThemeProvider } from '@/ui/components/ThemeProvider';
import { ErrorState } from '@/ui/components/States';
import { AppText } from '@/ui/components/Text';
import { Button } from '@/ui/components/Button';
import { colors, spacing } from '@/design/tokens';
import { telemetry } from '@/shell/telemetry';
import { SplashScreen } from '@/ui/screens/SplashScreen';
import { MainMenuScreen } from '@/ui/screens/MainMenuScreen';
import { NewGameScreen } from '@/ui/screens/NewGameScreen';
import { CharacterCreationScreen } from '@/ui/screens/CharacterCreationScreen';
import { HomeScreen } from '@/ui/screens/HomeScreen';
import { CharacterScreen } from '@/ui/screens/CharacterScreen';
import { InventoryScreen } from '@/ui/screens/InventoryScreen';
import { EquipmentScreen } from '@/ui/screens/EquipmentScreen';
import { SkillsScreen } from '@/ui/screens/SkillsScreen';
import { WorldMapScreen } from '@/ui/screens/WorldMapScreen';
import { RegionScreen } from '@/ui/screens/RegionScreen';
import { CityScreen } from '@/ui/screens/CityScreen';
import { NpcListScreen } from '@/ui/screens/NpcListScreen';
import { DialogueScreen } from '@/ui/screens/DialogueScreen';
import { QuestJournalScreen } from '@/ui/screens/QuestJournalScreen';
import { CombatScreen } from '@/ui/screens/CombatScreen';
import { DungeonScreen } from '@/ui/screens/DungeonScreen';
import { LootScreen } from '@/ui/screens/LootScreen';
import { BestiaryScreen } from '@/ui/screens/BestiaryScreen';
import { ChronicleScreen } from '@/ui/screens/ChronicleScreen';
import { FactionsScreen } from '@/ui/screens/FactionsScreen';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { SaveLoadScreen } from '@/ui/screens/SaveLoadScreen';
import { DevPanelScreen } from '@/ui/screens/DevPanelScreen';
import type { ScreenName } from '@/shell/navigation';

const SCREENS: Record<ScreenName, () => ReactNode> = {
  splash: SplashScreen,
  mainMenu: MainMenuScreen,
  newGame: NewGameScreen,
  characterCreation: CharacterCreationScreen,
  home: HomeScreen,
  character: CharacterScreen,
  inventory: InventoryScreen,
  equipment: EquipmentScreen,
  skills: SkillsScreen,
  worldMap: WorldMapScreen,
  region: RegionScreen,
  city: CityScreen,
  npcList: NpcListScreen,
  dialogue: DialogueScreen,
  questJournal: QuestJournalScreen,
  combat: CombatScreen,
  dungeon: DungeonScreen,
  loot: LootScreen,
  bestiary: BestiaryScreen,
  chronicle: ChronicleScreen,
  factions: FactionsScreen,
  settings: SettingsScreen,
  saveLoad: SaveLoadScreen,
  devPanel: DevPanelScreen,
};

/** Keeps a runtime failure from becoming a blank screen on a player's phone. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    telemetry.error('erro de renderização', `${error.message} ${info.componentStack ?? ''}`);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
          <ErrorState
            title="Algo quebrou"
            description={this.state.error.message}
            onRetry={() => this.setState({ error: null })}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const { route } = useNavigation();
  const { state } = useGame();
  const Screen = SCREENS[route.name];

  // Screens that need a live game must not render without one.
  const needsGame = !['splash', 'mainMenu', 'newGame', 'characterCreation', 'saveLoad', 'settings'].includes(route.name);
  if (needsGame && !state) return <NoGame />;

  return <Screen />;
}

function NoGame() {
  const { reset } = useNavigation();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
      <AppText variant="heading" align="center">Nenhum jogo carregado</AppText>
      <Button label="Ir para o menu" variant="primary" onPress={() => reset('mainMenu')} />
    </View>
  );
}

function Themed() {
  const { state } = useGame();
  return (
    <ThemeProvider scale={state?.settings.uiScale ?? 1} reduceAnimations={state?.settings.reduceAnimations ?? false}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <Router />
      </View>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GameProvider>
          <NavigationProvider initial="splash">
            <Themed />
          </NavigationProvider>
        </GameProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
