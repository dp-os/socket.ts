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