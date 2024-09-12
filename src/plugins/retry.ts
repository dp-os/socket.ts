import type { Socket } from '../socket';
import { SocketState } from '../socket-options'

export function retryPlugin(socket: Socket) {
    if (typeof window !=='object') {
        return;
    }
    let timer: NodeJS.Timeout | null = null;
    const connect =() => {
        socket.connect();
    }
    const end = () => {
        if (timer) {
            window.removeEventListener('online', connect);
            window.removeEventListener('offline', end);
            document.removeEventListener('visibilitychange', visibilitychange);
            clearTimeout(timer);
            timer = null;
        }
    }
    const start = () => {
        if (!timer) {
            window.addEventListener('online', connect);
            window.addEventListener('offline', end);
            document.addEventListener('visibilitychange', visibilitychange);
            timer = setTimeout(() => {
                connect();
            }, socket.options.retryInterval || 3000);
        }
    }
    const visibilitychange = () => {
        if (document.visibilityState === 'visible') {
            connect()
        }
    }

    socket.subscribeState((state) => {
        if (socket.disabled) return;
        switch (state) {
            case SocketState.stateless:
            case SocketState.open:
                end();
                break;
            case SocketState.close:
            case SocketState.error:
                start();
                break;
        }
    });
}