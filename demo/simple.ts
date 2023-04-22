import { SocketConnect, SocketConnectState } from '../src';



const socket = new SocketConnect({
    url: 'ws://localhost:5173',
    protocols: 'vite-hmr'
})

const connectButton = document.getElementById('connect')!;
const disconnectButton = document.getElementById('disconnect')!;
const stateText = document.getElementById('state')!;

connectButton.onclick = () => {
    socket.connect()
}
disconnectButton.onclick = () => {
    socket.disconnect()
}

socket.subscribeState((state) => {
    let text = '';
    switch (state) {
        case SocketConnectState.stateless:
            text = 'Not connected';
            break;
        case SocketConnectState.pending:
            text = 'Connecting';
            break;
        case SocketConnectState.open:
            text = 'Successfully connected';
            break;
        case SocketConnectState.close:
            text = 'Connection closed';
            break;
        case SocketConnectState.error:
            text = 'Connection error';
            break;
    }
    stateText.innerText = text;
})

