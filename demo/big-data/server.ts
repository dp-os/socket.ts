import { Plugin, WebSocket } from 'vite';
import {  EVENT_ACTION } from './config';
import { symbolData } from './symbol-data';

export const BigDataPlugin: Plugin = {
    name: 'big-data',
    configureServer({ ws }) {
        ws.on('connection', (client) => {
            serverTime(client);
        });
    }
}

function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function serverTime(client: WebSocket) {

    let timer: NodeJS.Timer | null = null;
    let updateCount = 0;
    const unsubscribe = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }
    const send = () => {

        // 推送的数量
        const pushCount = randomNumber(10, 50);

        for (let i =0; i < pushCount; i++)  {
            const index = randomNumber(0, 100);
            const item = symbolData[index];
            // 判断是否上涨还是下跌
            const isUp = randomNumber(0, 10) > 5 ? true : false;
            const ratio = randomNumber(0,10) / 10000;
            if (isUp) {
                item.lastAskPx = +(item.lastAskPx + item.lastAskPx * ratio)
                item.lastBidPx = +(item.lastAskPx + item.lastAskPx * ratio)
            } else {
                item.lastAskPx = +(item.lastAskPx - item.lastAskPx * ratio)
                item.lastBidPx = +(item.lastAskPx - item.lastAskPx * ratio)
            }
            updateCount++;
            client.send(JSON.stringify({
                event: EVENT_ACTION.pushQuote,
                count: updateCount,
                symbol: item
            }))
        }
    }
    const subscribe = (subscribe: boolean) => {
        if (subscribe) {
            if (timer) return;
            timer = setInterval(send, 10)
            send();
        } else {
            unsubscribe();
        }
    }
    client.on('close', () => {
        unsubscribe();
    });
    client.on('message', (ev) => {
        const result = JSON.parse(ev.toString());
        switch (result.event) {
            case EVENT_ACTION.pullServerSymbol:
                client.send(JSON.stringify({
                    event: EVENT_ACTION.pushClientSymbol,
                    symbols: symbolData
                }))
                break;
            case EVENT_ACTION.subscribeServerQuote:
                subscribe(true);
                break;
            case EVENT_ACTION.unSubscribeServerQuote:
                subscribe(false);
                break;
        }
    })
}