const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const secret = require('../secret');
global.WebSocket = WebSocket;
const ws = new ReconnectingWebSocket(`ws://${secret.controller_host}:${secret.controller_ws_port}`, {
  maxReconnectionDelay: 10 * 3600 * 1000,
  minReconnectionDelay: 1000,
  reconnectionDelayGrowFactor: 1.3,
  maxRetries: Infinity,
});
const retryTimer = null;

ws.addEventListener('open', () => {
  console.log(`${new Date()} 控制服务器连接成功`);
});

ws.addEventListener('message', (message) => {
  console.log(message);
  // TODO Fetch And Report Echo Message to controller
})