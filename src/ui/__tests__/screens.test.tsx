/**
 * Smoke-renders the real screens against a real game state. Compiling is not
 * the same as rendering: this catches broken hooks, bad styles and missing
 * providers that a type-check never sees.
 */
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/ui/components/ThemeProvider';
import { HeroCard } from '@/ui/components/HeroCard';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { ItemRow } from '@/ui/components/ItemRow';
import { StatBar } from '@/ui/components/StatBar';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/States';
import { colors } from '@/design/tokens';
import { createNewGame } from '@/game/newGame';
import { inventoryEntries } from '@/domain/items/inventory';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** RNTL 14's render is async: awaiting it is what populates `screen`. */
async function wrap(node: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>{node}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

const game = createNewGame({
  heroName: 'Jonny', classId: 'druid', originId: 'origin_grove',
  presentation: 'masculine', allocatedAttributes: { wisdom: 2 }, seedLabel: 'ui-0001',
});

describe('componentes principais renderizam', () => {
  it('HeroCard mostra nome, classe e recursos', async () => {
    await wrap(<HeroCard state={game} />);
    expect(screen.getByText('Jonny')).toBeTruthy();
    expect(screen.getByText(/Nv\. 1 · Druida/)).toBeTruthy();
    expect(screen.getByText(/Ano 1 · Dia 1/)).toBeTruthy();
  });

  it('ArtFrame desenha o placeholder com rótulo acessível', async () => {
    await wrap(<ArtFrame artKey="art.location.city" label="Verdália" sublabel="Cidade" />);
    expect(screen.getByLabelText('Ilustração de Verdália')).toBeTruthy();
    expect(screen.getByText('Verdália')).toBeTruthy();
  });

  it('ItemRow mostra nome, raridade em texto e atributos', async () => {
    const entry = inventoryEntries(game.player, game.items).find((item) => item.equipped)!;
    await wrap(<ItemRow item={entry.item} equipped />);
    expect(screen.getByText(entry.item.name)).toBeTruthy();
    expect(screen.getByText('Comum')).toBeTruthy();
    expect(screen.getByText('equipado')).toBeTruthy();
  });

  it('StatBar expõe valor legível por leitor de tela', async () => {
    await wrap(<StatBar value={30} max={60} color={colors.hp} trackColor={colors.hpTrack} label="Vida" />);
    expect(screen.getByLabelText('Vida 30 de 60')).toBeTruthy();
    expect(screen.getByText('30/60')).toBeTruthy();
  });

  it('Button respeita o estado desabilitado', async () => {
    await wrap(<Button label="Atacar" onPress={() => undefined} disabled />);
    expect(screen.getByLabelText('Atacar').props.accessibilityState.disabled).toBe(true);
  });

  it('EmptyState comunica ausência de conteúdo', async () => {
    await wrap(<EmptyState title="Nada aqui" description="Explore para preencher." />);
    expect(screen.getByText('Nada aqui')).toBeTruthy();
  });
});
