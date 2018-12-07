const Koa = require('koa');
const router = require('koa-router')();
const koaBody = require('koa-body');
const WebSocket = require('ws');
const mysql = require('mysql');
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
    wsClient.send(JSON.stringify({
      type: 'fetch',
      payload: body
    }));
    ctx.body = {
      code: 0,
      message: `执行成功，任务编号${results[0].id}`
    };
  }
);
// TODO update task echo api
app.use(koaBody());
app.use(async (ctx, next) => {
  const startTime = Date.now();
  console.log(`--> ${new Date()} ${ctx.request.path} ${JSON.stringify(ctx.request.body)}`);
  await next();
  console.log(`<-- ${new Date()} ${ctx.request.path} ${JSON.stringify(ctx.body)} ${Date.now()-startTime}ms`);
})
app.use(router.routes());
app.listen(secret.controller_port);
console.log(`${new Date()} Web(Koa)服务启动 监听端口${secret.controller_ws_port}`);