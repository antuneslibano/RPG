/**
 * Boots the real App and walks a player through: splash -> menu -> new game ->
 * character creation -> home. Proves the app mounts, the providers wire up and
 * a world is actually generated and rendered on a phone-sized viewport.
 */
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '@/shell/App';

// Without measured metrics the real SafeAreaProvider renders nothing in tests,
// so we substitute a pass-through with phone-sized insets.
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 47, bottom: 34, left: 0, right: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
    SafeAreaView: ({ children }: { children: ReactNode }) => children,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

/** React 19 batches updates, so every interaction is flushed inside act. */
async function press(label: string): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

describe('fluxo do aplicativo', () => {
  it('vai do splash ao mundo jogável', async () => {
    await render(<App />);
    expect(screen.getByText('um mundo que lembra')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('fantasia medieval · single player')).toBeTruthy(), { timeout: 5000 });

    await press('Novo jogo');
    expect(screen.getByText('Semente do mundo')).toBeTruthy();

    await press('Criar herói');
    expect(screen.getByLabelText('Nome do herói')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Nome do herói'), 'Jonny');
    });
    await press('Druida');
    await press('Criado no Bosque');
    await press('Aumentar Sabedoria');

    await press('Começar a jornada');

    // Home: hero card and the action grid over the generated world.
    await waitFor(() => expect(screen.getByText('Jonny')).toBeTruthy(), { timeout: 15000 });
    expect(screen.getByLabelText('Aventura')).toBeTruthy();
    expect(screen.getByLabelText('Mapa')).toBeTruthy();
    expect(screen.getByLabelText('Missões')).toBeTruthy();
    expect(screen.getByText(/Ano 1 · Dia 1/)).toBeTruthy();
    expect(screen.getByText(/Nv\. 1 · Druida/)).toBeTruthy();
  }, 40000);

  it('navega da home para personagem, inventário e mapa', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText('fantasia medieval · single player')).toBeTruthy(), { timeout: 5000 });
    await press('Novo jogo');
    await press('Criar herói');
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Nome do herói'), 'Mira');
    });
    await press('Começar a jornada');
    await waitFor(() => expect(screen.getByText('Mira')).toBeTruthy(), { timeout: 15000 });

    await press('Personagem');
    await waitFor(() => expect(screen.getByText('Atributos derivados')).toBeTruthy());
    await press('Voltar');

    await press('Inventário');
    await waitFor(() => expect(screen.getByLabelText('Tudo')).toBeTruthy());
    await press('Voltar');

    await press('Mapa');
    await waitFor(() => expect(screen.getByText('Regiões conhecidas')).toBeTruthy());
    expect(screen.getByText('Viajar a partir daqui')).toBeTruthy();
  }, 40000);

  it('Aventura dentro da cidade leva ao mapa em vez de gerar combate', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText('fantasia medieval · single player')).toBeTruthy(), { timeout: 5000 });
    await press('Novo jogo');
    await press('Criar herói');
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Nome do herói'), 'Edrin');
    });
    await press('Começar a jornada');
    await waitFor(() => expect(screen.getByText('Edrin')).toBeTruthy(), { timeout: 15000 });

    await press('Aventura');
    await waitFor(() => expect(screen.getByText('Viajar a partir daqui')).toBeTruthy());
  }, 40000);
});
