/**
 * Signal entre onglets du même appareil : changement de réglage anti-spoil ou fin de session.
 * Les autres onglets jettent alors leur catalogue en cache (il pourrait contenir des titres).
 */
type Message = 'catalog-stale' | 'signed-out';

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('jojo-tracker');

export const sessionChannel = {
  post(message: Message): void {
    channel?.postMessage(message);
  },
  subscribe(listener: (message: Message) => void): () => void {
    if (!channel) return () => undefined;
    const handler = (event: MessageEvent<Message>) => {
      listener(event.data);
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
    };
  },
};
