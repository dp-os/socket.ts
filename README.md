# socket.ts
A simple, easy-to-use, high-performance, and plug-in Socket solution.
## Install
```bash
npm install socket.ts
```

## Quick Start
```ts
import { Socket, SocketState } from 'socket.ts';

const socket = new Socket({
    url: 'ws://localhost:3000'
});

// Subscribe to Socket state changes
socket.subscribeState((state) => {
    console.log(state);
});

// Listen for server data push
socket.subscribeMessage((messageEvent) => {
    console.log(messageEvent);
});

// Send data to the server
socket.send({ msg: 'I am ready.' });

socket.connect();

// Disconnect
// socket.disconnect();

// Dispose memory and remove all event listeners
// socket.dispose()

```

## Options
```ts
export interface SocketOptions {
    /**
     * The URL of the Socket request.
     */
    url?: string;
    /**
     * The protocol of the Socket request.
     */
    protocols?: string | string[];
    /**
     * The interval between reconnection attempts after the connection is lost, in milliseconds. Default is: 1000 * 30.
     */
    retryInterval?: number;
    /**
     * The interval between sending heartbeats, in milliseconds. Default is: 1000 * 60.
     */
    pingInterval?: number;
    /**
     * The data to be sent with the heartbeat.
     */
    pingData?: any;
    /**
     * Create a bridge. The default bridge is WorkerSocketBridge.
     * @param socket The current Socket instance.
     * @returns 
     */
    createBridge: (socket: Socket) => SocketBridge;
    /**
     * The plugins used.
     */
    plugins?: SocketPlugin[]
}
```