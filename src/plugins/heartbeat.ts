import { Socket, SocketState } from '../socket';

export function heartbeatPlugin(socket: Socket) {
    let timer: NodeJS.Timeout | null = null;
    const defaultData ={
        type: 'heartbeat'
    }
    const start = () => {
        if (!timer) {
            const { heartbeatData = defaultData, heartbeatInterval = 0 } = socket.options;
            if (heartbeatInterval > 0) {
                timer = setTimeout(() => {
                    timer = null;
                    socket.send(heartbeatData)
                    start();
                }, heartbeatInterval);
            }
        }
    };
    const end = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }
    socket.subscribeState((state) => {
        if (state === SocketState.open) {
            start();
        } else {
            end()
        }
    })
}
