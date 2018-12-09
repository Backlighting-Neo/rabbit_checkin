const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const fetch = require('node-fetch');
const des = require('./des');
const secret = require('../secret');
global.WebSocket = WebSocket;
const ws = new ReconnectingWebSocket(`ws://${secret.controller_host}:${secret.controller_ws_port}`, {
  maxReconnectionDelay: 10 * 3600 * 1000,
  minReconnectionDelay: 1000,
  reconnectionDelayGrowFactor: 1.3,
  maxRetries: Infinity,
});

console.log(`${new Date()} 尝试连接服务器`);
ws.addEventListener('open', () => {
  console.log(`${new Date()} 控制服务器连接成功`);
});

ws.addEventListener('message', (message) => {
  const taskInfo = JSON.parse(des.desDecrypt(message.data, secret.des.key));
  console.log(`${new Date()} 收到新任务 任务详情${JSON.stringify(taskInfo)}`);
  /**
     * 任务详情格式
     *  url - 请求的网址
     *  method - 请求方式
     *  headers - 请求头
     *  data - 请求body
     */
  const {type, taskId, payload} = taskInfo;
  const {url, method, headers, data} = payload;
  console.log(`${new Date()} 开始请求`);
  fetch(url, {
    method,
    headers,
    body: data || null
  })
  .then(res => res.text())
  .then(text => {
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
    console.log(`${new Date()} 任务${taskId}状态回写完成`);
  })
})