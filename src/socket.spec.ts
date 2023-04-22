import { SocketConnect, } from './socket';
import { SocketConnectState, SocketConnectInstance } from './socket-options';
import { test, assert } from 'vitest'

test('createSocket', async () => {
    let testUrl = '';
    let testProtocols: string | string[] | undefined = '';
    const testDataArr: any[] = [];
    const stateArr: SocketConnectState[] = [];
    const socketMock: SocketConnectInstance = {
        onclose: null,
        onerror: null,
        onmessage: null,
        onopen: null,
        send(data) {
            testDataArr.push(data);
        },
        close() {
            socketMock.onclose && socketMock.onclose({});
        },
    }
    const socket = new SocketConnect({
        url: '/test',
        protocols: '123',
        createSocket(url, protocols) {
            testUrl = url;
            testProtocols = protocols;

            return socketMock
        },
    });

    socket.sendJson({ value: 'stateless' });

    setTimeout(() => {
        socketMock.onopen && socketMock.onopen({});
    }, 100)

    socket.subscribeState((state) => {
        stateArr.push(state);
    });

    assert.equal(socket.state, SocketConnectState.stateless);
    assert.deepEqual(testDataArr, []);

    // Successfully connected
    let ok = await socket.connect();

    socket.sendJson({ value: 'open' });

    assert.isTrue(true);
    assert.equal(socket.state, SocketConnectState.open);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open])

    // Call again in connected state
    ok = await socket.connect();

    assert.isTrue(true);
    assert.equal(socket.state, SocketConnectState.open);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open])

    socket.disconnect();
    assert.equal(socket.state, SocketConnectState.close);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open, SocketConnectState.close])


    socket.sendJson({ value: 'disconnect' });
    setTimeout(() => {
        socketMock.onerror && socketMock.onerror({});
    }, 100)
    ok = await socket.connect();
    assert.isTrue(true);
    assert.equal(socket.state, SocketConnectState.error);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isFalse(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open, SocketConnectState.close, SocketConnectState.pending, SocketConnectState.error])

    socket.dispose();

    assert.equal(socket.state, SocketConnectState.close);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open, SocketConnectState.close, SocketConnectState.pending, SocketConnectState.error, SocketConnectState.close])
})

test('onmessage', async () => {
    const socketMock: SocketConnectInstance = {
        onclose: null,
        onerror: null,
        onmessage: null,
        onopen: null,
        send() {}, 
        close() { 
            socketMock.onclose && socketMock.onclose({});
        },
    }
    const socket = new SocketConnect({
        url: '',
        createSocket() {
            return socketMock
        },
    });
    setTimeout(() => {
        socketMock.onopen && socketMock.onopen({});
    }, 100)
    await socket.connect();
    const dataArr: any[] = [];
    const un = socket.subscribeMessage((data) => {
        dataArr.push(data);
    })
    socketMock.onmessage && socketMock.onmessage({ value: 1 })
    socketMock.onmessage && socketMock.onmessage({ value: 2 })

    un();
    socketMock.onmessage && socketMock.onmessage({ value: 3 })
    assert.deepEqual(dataArr, [
        {
            value: 1
        },
        {
            value: 2
        }
    ])
});

test('asyncOptions', async () => {
    const socketMock: SocketConnectInstance = {
        onclose: null,
        onerror: null,
        onmessage: null,
        onopen: null,
        send() {
        },
        close() {
            socketMock.onclose && socketMock.onclose({});
        },
    }
    let testUrl = '';
    let testProtocols: any = [];
    const socket = new SocketConnect(async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    url: '/test',
                    protocols: ['1', '2'],
                    createSocket(url, protocols) {
                        testUrl = url;
                        testProtocols = protocols;
                        return socketMock;
                    },
                });
            }, 100)
        })
    });
    setTimeout(() => {
        socketMock.onopen && socketMock.onopen({});
    }, 200)
    await socket.connect();

    assert.equal(testUrl, '/test');
    assert.deepEqual(testProtocols, ['1', '2']);
})