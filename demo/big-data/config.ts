export const EVENT_NAME = 'big-data';

export enum EVENT_ACTION {
    // 向服务端拉取品种
    pullServerSymbol = 'pullServerSymbol',
    // 向客户端推送品种
    pushClientSymbol = 'pushClientSymbol',
    // 订阅报价
    subscribeServerQuote = 'subscribeServerQuote',
    // 取消报价订阅
    unSubscribeServerQuote = 'unSubscribeServerQuote',
    // 推送报价
    pushQuote = 'pushQuote'
}

export interface SymbolDetail {
    symbol: string;
    digits: number;
    lastAskPx: number;
    lastBidPx: number;
}