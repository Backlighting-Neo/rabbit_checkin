const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const fetch = require('node-fetch');
const des = require('./des');
const secret = require('../secret');

function getFormatTime(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}\t`;
}

global.WebSocket = WebSocket;
const ws = new ReconnectingWebSocket(`ws://${secret.controller_host}:${secret.controller_ws_port}`, {
  maxReconnectionDelay: 10 * 3600 * 1000,
  minReconnectionDelay: 1000,
  reconnectionDelayGrowFactor: 1.3,
  maxRetries: Infinity,
  debug: true
});
let lastPongTimestamp = null;
let heartBeatTimer = null;
const heartBeatDuration = 10 * 1000;

console.log(`${getFormatTime()} 尝试连接服务器`);
ws.addEventListener('open', () => {
  console.log(`${getFormatTime()} 控制服务器连接成功`);

  lastPongTimestamp = Date.now();
  if(heartBeatTimer) clearInterval(heartBeatTimer);
  heartBeatTimer = setInterval(() => {
    ws.send('ping');

    if(Date.now - lastPongTimestamp > 3*heartBeatDuration) {
      console.log(`${getFormatTime()} 超过${3*heartBeatDuration/1000}秒未收到pong，开始重连`);
      ws.reconnect();
    }
  }, heartBeatDuration);
});

ws.addEventListener('close', () => {
  console.log(`${getFormatTime()} 控制服务器离线`);
});

ws.addEventListener('message', (message) => {
  if(message.data === 'pong') {
    lastPongTimestamp = Date.now();
    return;
  }

  const taskInfo = JSON.parse(des.desDecrypt(message.data, secret.des.key));
  console.log(`${getFormatTime()} 收到新任务 任务详情${JSON.stringify(taskInfo)}`);
  /**
     * 任务详情格式
     *  url - 请求的网址
     *  method - 请求方式
     *  headers - 请求头
     *  data - 请求body
     */
  const {type, taskId, payload} = taskInfo;
  const {url, method, headers, data} = payload;
  console.log(`${getFormatTime()} 开始请求`);
  fetch(url, {
    method,
    headers,
    body: data || null
  })
  .then(res => res.text())
  .then(text => {
    console.log(`${getFormatTime()} ${url}开始完成`);
    console.log(`${getFormatTime()} 返回内容：${text}`);
    console.log(`${getFormatTime()} 任务${taskId}状态开始回写`);
    return fetch(`http://${secret.controller_host}:${secret.controller_port}/update_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId, 
        response: text
      })
    })
  })
  .then(() => {
    console.log(`${getFormatTime()} 任务${taskId}状态回写完成`);
  })
})