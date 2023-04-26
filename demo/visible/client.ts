import { Socket, SocketState, visiblePlugin } from '../../src';
import { EVENT_NAME } from './config';

const socket = new Socket({
    url: `ws://${location.hostname}:${location.port}`,
    protocols: 'vite-hmr',
    plugins: [
        visiblePlugin({
            visible: (socket) => {
                socket.send({
                    type: 'visible',
                });
            },
            invisible: (socket) => {
                socket.send({
                    type: 'invisible',
                });
            },
        })
    ]
})

function initConnect() {
    const connectEl = document.getElementById('connect')!;
    const disconnectEl = document.getElementById('disconnect')!;

    connectEl.onclick = () => {
        socket.connect();
    }
    disconnectEl.onclick = () => {
        socket.disconnect();
    }
}

function initState() {
    const stateEl = document.getElementById('state')!;
    socket.stateEvent.listen((state) => {
        let text = '';
        switch (state) {
            case SocketState.stateless:
                text = 'Not connected';
                break;
            case SocketState.pending:
                text = 'Connecting';
                break;
            case SocketState.open:
                text = 'Successfully connected';
                break;
            case SocketState.close:
                text = 'Connection closed';
                break;
            case SocketState.error:
                text = 'Connection error';
                break;
        }
        stateEl.innerText = text;
    })
}

function initTime() {
    const timeEl = document.getElementById('time')!;

    socket.dataEvent.listen((result) => {
        if (result.event === EVENT_NAME) {
            timeEl.innerHTML += `<div>${result.data.date}<div/>`
        }
    });
}

export function initSubscribe() {
    const subscribeEl = document.getElementById('subscribe')!;
    const unsubscribe = document.getElementById('unsubscribe')!;

    subscribeEl.onclick = () => {
        socket.send({
            type: 'custom',
            event: EVENT_NAME,
            data: true,
        });
    }
    unsubscribe.onclick = () => {
        socket.send({
            type: 'custom',
            event: EVENT_NAME,
            data: false,
        });
    }

}

initConnect();
initState();
initTime();
initSubscribe();
