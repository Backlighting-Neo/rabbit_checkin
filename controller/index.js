const Koa = require('koa');
const router = require('koa-router')();
const koaBody = require('koa-body');
const WebSocket = require('ws');
const mysql = require('mysql');
const des = require('./des.js');
const secret = require('../secret');

console.log(`${new Date()} 程序开始运行`);
const mysqlConn = mysql.createConnection({
  host: secret.mysql.host,
  port: secret.mysql.port,
  user: secret.mysql.username,
  password: secret.mysql.password,
  database: 'fake_checkin'
});
mysqlConn.connect(function (err) {
  if (err) {
    console.error(`${new Date()} Mysql连接异常: ${err.stack}`);
    process.exit(-1);
    return;
  }
  console.error(`${new Date()} Mysql连接成功，线程号${mysqlConn.threadId}`);
});
mysqlConn.queryPromise = sql => new Promise((resolve, reject) => {
  mysqlConn.query(sql, function (error, results, fields) {
    if (error) reject(error);
    else resolve(results);
  })
})

let wsClient = null;
const wss = new WebSocket.Server({ port: secret.controller_ws_port });
console.log(`${new Date()} Websocket服务启动 监听端口${secret.controller_ws_port}`);
wss.on('connection', function connection(client) {
  console.log(`${new Date()} Websocket客户端请求连接`);
  if(wsClient) {
    console.log(`${new Date()} 关闭既有客户端`);
    wsClient.close();
  }
  wsClient = client;
});
wss.on('close', function () {
  console.log(`${new Date()} 客户端离线`);
  wsClient = null;
})

const app = new Koa();
router.post('/add_task', async (ctx) => {
  const body = ctx.request.body;
  if(!wsClient) {
    ctx.body = {
      code: 2,
      message: '没有上线的执行端'
    }
    return;
  }
  await mysqlConn.queryPromise(`Insert Into f_task(shell_command) Values('${JSON.stringify(body)}')`);
  const results = await mysqlConn.queryPromise(`Select id from f_task order by id desc limit 1`);
  const taskId = results[0].id;
  /**
   * 任务详情格式（body）
   *  url - 请求的网址
   *  method - 请求方式
   *  headers - 请求头
   *  data - 请求body
   */
  wsClient.send(des.desEncrypt(JSON.stringify({
    type: 'fetch',
    taskId,
    payload: body
  }), secret.des.key));
  ctx.body = {
    code: 0,
    message: `执行成功，任务编号${taskId}`
  };
});
router.post('/update_task', async (ctx) => {
  const {taskId, response} = ctx.request.body;
  await mysqlConn.queryPromise(`Update f_task Set shell_result='${response}' Where id=${taskId}`);
  ctx.body = {
    code: 0,
    message: '任务更新成功'
  }
})
router.get('/task', async (ctx) => {
  const results = await mysqlConn.queryPromise('Select * From f_task Order by id DESC limit 5');
  ctx.body = JSON.stringify(results.map(item => ({
    id: item.id,
    create_time: item.create_time,
    update_time: item.update_time,
    result: item.shell_result
  })), null, 2);
})
app.use(koaBody());
app.use(async (ctx, next) => {
  const startTime = Date.now();
  console.log(`--> ${new Date()} ${ctx.request.path} ${JSON.stringify(ctx.request.body)}`);
  await next();
  console.log(`<-- ${new Date()} ${ctx.request.path} ${JSON.stringify(ctx.body)} ${Date.now()-startTime}ms`);
})
app.use(router.routes());
app.listen(secret.controller_port);
console.log(`${new Date()} Web(Koa)服务启动 监听端口${secret.controller_port}`);