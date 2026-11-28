import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BugReportModal from '../BugReportModal';

const fakeServices = (overrides = {}) => ({
  loadConfig: vi.fn(async () => ({ contactEmail: 'prof@ecole.fr', endpoint: 'http://x' })),
  getLogs: vi.fn(() => [{ level: 'error', message: 'boom' }]),
  readFiles: vi.fn(async (files) => files.map((f) => ({ name: f.name }))),
  build: vi.fn((input, logs) => ({ id: 'bug-1', ...input, logs })),
  send: vi.fn(async () => ({ method: 'endpoint' })),
  ...overrides,
});

const renderModal = (services = fakeServices(), onClose = vi.fn()) => {
  render(<BugReportModal isOpen onClose={onClose} services={services} />);
  return { services, onClose };
};

const typeDescription = (text) =>
  fireEvent.change(screen.getByLabelText(/what happened/i), { target: { value: text } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: /send report/i }));

describe('BugReportModal', () => {
  it('fermée -> rien n’est affiché', () => {
    const { container } = render(<BugReportModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche le contact configuré', async () => {
    renderModal();
    expect(await screen.findByText('prof@ecole.fr')).toBeInTheDocument();
  });

  it('description trop courte -> message, rien n’est envoyé', async () => {
    const { services } = renderModal();
    typeDescription('court');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 10 characters/);
    expect(services.send).not.toHaveBeenCalled();
  });

  it('envoi complet : description, étapes, e-mail, captures, fichiers de jeu, logs', async () => {
    const { services } = renderModal();
    await screen.findByText('prof@ecole.fr');
    typeDescription('Le thème Spy ne change pas');
    fireEvent.change(screen.getByLabelText(/steps to reproduce/i), {
      target: { value: 'Menu > Thèmes > Spy' },
    });
    fireEvent.change(screen.getByLabelText(/your e-mail/i), {
      target: { value: 'eleve@ecole.fr' },
    });
    const capture = new File(['x'], 'capture.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/screenshots/i), { target: { files: [capture] } });
    submit();

    expect(await screen.findByText(/your report has been sent/i)).toBeInTheDocument();
    expect(services.readFiles).toHaveBeenCalledWith([capture]);
    expect(services.build).toHaveBeenCalledWith(
      {
        description: 'Le thème Spy ne change pas',
        steps: 'Menu > Thèmes > Spy',
        reporterEmail: 'eleve@ecole.fr',
        includeGameData: true,
        includeLogs: true,
        attachments: [{ name: 'capture.png' }],
      },
      [{ level: 'error', message: 'boom' }],
    );
    expect(services.send).toHaveBeenCalledWith(expect.objectContaining({ id: 'bug-1' }), {
      contactEmail: 'prof@ecole.fr',
      endpoint: 'http://x',
    });
  });

  it('le joueur peut décocher les fichiers de jeu et les logs', async () => {
    const { services } = renderModal();
    typeDescription('Un bug assez long');
    fireEvent.click(screen.getByLabelText(/game files/i));
    fireEvent.click(screen.getByLabelText(/error logs/i));
    submit();
    await screen.findByText(/your report has been sent/i);
    expect(services.getLogs).not.toHaveBeenCalled();
    expect(services.build).toHaveBeenCalledWith(
      expect.objectContaining({ includeGameData: false, includeLogs: false }),
      [],
    );
  });

  it('pièce jointe refusée (pas une image) -> message', () => {
    renderModal();
    const text = new File(['x'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText(/screenshots/i), { target: { files: [text] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/only image files/i);
  });

  it('sélection de fichiers annulée -> aucune erreur', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/screenshots/i), { target: { files: null } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('repli téléchargement + e-mail -> consigne de pièce jointe', async () => {
    const send = vi.fn(async () => ({
      method: 'download',
      fileName: 'bug-1.json',
      emailOpened: true,
    }));
    renderModal(fakeServices({ send }));
    typeDescription('Un bug assez long');
    submit();
    expect(await screen.findByText('bug-1.json')).toBeInTheDocument();
    expect(screen.getByText(/attach this file/i)).toBeInTheDocument();
  });

  it('repli téléchargement sans contact -> consigne générique', async () => {
    const send = vi.fn(async () => ({
      method: 'download',
      fileName: 'bug-1.json',
      emailOpened: false,
    }));
    renderModal(
      fakeServices({ send, loadConfig: vi.fn(async () => ({ contactEmail: '', endpoint: '' })) }),
    );
    typeDescription('Un bug assez long');
    submit();
    expect(await screen.findByText(/person in charge/i)).toBeInTheDocument();
  });

  it('configuration pas encore chargée -> envoi avec configuration vide', async () => {
    const { services } = renderModal(
      fakeServices({ loadConfig: vi.fn(() => new Promise(() => {})) }),
    );
    typeDescription('Un bug assez long');
    submit();
    await screen.findByText(/your report has been sent/i);
    expect(services.send).toHaveBeenCalledWith(expect.anything(), {
      contactEmail: '',
      endpoint: '',
    });
  });

  it('échec de préparation -> message d’erreur, formulaire conservé', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderModal(
      fakeServices({ readFiles: vi.fn(async () => Promise.reject(new Error('disque'))) }),
    );
    typeDescription('Un bug assez long');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be prepared/i);
    expect(screen.getByLabelText(/what happened/i)).toHaveValue('Un bug assez long');
  });

  it('bouton « Close » après envoi : réinitialise et ferme', async () => {
    const { onClose } = renderModal();
    typeDescription('Un bug assez long');
    submit();
    await screen.findByText(/your report has been sent/i);
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('clic sur le fond ou sur la croix -> fermeture', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('services par défaut : charge la configuration réelle', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ contactEmail: 'vrai@ecole.fr' }) });
    render(<BugReportModal isOpen onClose={() => {}} />);
    expect(await screen.findByText('vrai@ecole.fr')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith('bug-report.config.json');
  });

  it('services par défaut : rapport réel construit et envoyé au serveur configuré', async () => {
    localStorage.setItem('currentProfile_v1', '1');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) =>
        url === 'bug-report.config.json'
          ? {
              ok: true,
              json: async () => ({ contactEmail: '', endpoint: 'http://serveur/bug-reports' }),
            }
          : { ok: true, status: 201 },
      );
    render(<BugReportModal isOpen onClose={() => {}} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    typeDescription('Le jeu plante au démarrage');
    submit();
    expect(await screen.findByText(/your report has been sent/i)).toBeInTheDocument();
    const [url, options] = fetchSpy.mock.calls[1];
    expect(url).toBe('http://serveur/bug-reports');
    const sent = JSON.parse(options.body);
    expect(sent).toMatchObject({
      description: 'Le jeu plante au démarrage',
      gameData: { currentProfile_v1: '1' },
      attachments: [],
    });
    expect(Array.isArray(sent.logs)).toBe(true);
  });
});
