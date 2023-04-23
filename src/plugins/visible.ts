import { Socket, SocketState } from '../socket';


export interface VisibilityPluginOptions {
    visible: (socket: Socket) => void;
    invisible: (socket: Socket) => void;
}

export function visiblePlugin(options: VisibilityPluginOptions) {
    return (socket: Socket) => {
        const isWindow = typeof window === 'object';
        if (!isWindow) return;
        const visibilitychange = () => {
            if (document.hidden) {
                options.invisible(socket);
            } else {
                options.visible(socket);
            }
        }
        const start = () => {
            visibilitychange();
            document.addEventListener('visibilitychange', visibilitychange);
        }
        const end = () => {
            document.removeEventListener('visibilitychange', visibilitychange);
        }
        socket.subscribeState((state: SocketState) => {
            switch (state) {
                case SocketState.open:
                    start();
                    break;
                default:
                    end();
                    break;
            }
        })
    }
}