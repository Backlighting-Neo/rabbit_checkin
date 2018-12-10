const Koa = require('koa');
const router = require('koa-router')();
const koaBody = require('koa-body');
const WebSocket = require('ws');
const mysql = require('mysql');
const des = require('./des.js');
const secret = require('../secret');

function getFormatTime(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}\t`;
}

console.log(`${getFormatTime()} 程序开始运行`);
const mysqlConn = mysql.createConnection({
  host: secret.mysql.host,
  port: secret.mysql.port,
  user: secret.mysql.username,
  password: secret.mysql.password,
  database: 'fake_checkin'
});
mysqlConn.connect(function (err) {
  if (err) {
    console.error(`${getFormatTime()} Mysql连接异常: ${err.stack}`);
    process.exit(-1);
    return;
  }
  console.log(`${getFormatTime()} Mysql连接成功，线程号${mysqlConn.threadId}`);
});
mysqlConn.queryPromise = sql => new Promise((resolve, reject) => {
  mysqlConn.query(sql, function (error, results, fields) {
    if (error) reject(error);
    else resolve(results);
  })
})

let wsClient = null;
let lastClientAliveTime = null;
const wss = new WebSocket.Server({ port: secret.controller_ws_port });
console.log(`${getFormatTime()} Websocket服务启动 监听端口${secret.controller_ws_port}`);
wss.on('connection', function connection(client) {
  console.log(`${getFormatTime()} Websocket客户端请求连接`);
  if(wsClient) {
    console.log(`${getFormatTime()} 关闭既有客户端`);
    wsClient.close();
  }
  lastClientAliveTime = new Date();
  wsClient = client;

  wsClient.on('message', function(data) {
    if(data !== 'ping') return;
    lastClientAliveTime = new Date();
    wsClient.send('pong');
  })
  wsClient.on('close', function () {
    console.log(`${getFormatTime()} 客户端离线`);
    wsClient = null;
  })
});

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
  let taskId = -1;
  try {
    await mysqlConn.queryPromise(`Insert Into f_task(shell_command) Values('${JSON.stringify(body)}')`);
    const results = await mysqlConn.queryPromise(`Select id from f_task order by id desc limit 1`);
    taskId = results[0].id;
  }
  catch(err) {
    console.error(`${getFormatTime()} 数据库执行异常`, err);
  }
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
  if(taskId > 0) {
    await mysqlConn.queryPromise(`Update f_task Set shell_result='${response}' Where id=${taskId}`);
  }
  ctx.body = {
    code: 0,
    message: '任务更新成功'
  }
})
router.get('/task', async (ctx) => {
  const results = await mysqlConn.queryPromise('Select * From f_task Order by id DESC limit 5');
  ctx.body = JSON.stringify({
    lastActiveTime: getFormatTime(lastClientAliveTime),
    task_list: results.map(item => ({
      id: item.id,
      create_time: item.create_time,
      update_time: item.update_time,
      result: item.shell_result
    }))
  }, null, 2);
})
app.use(koaBody());
app.use(async (ctx, next) => {
  const startTime = Date.now();
  console.log(`--> ${getFormatTime()} ${ctx.request.path} ${JSON.stringify(ctx.request.body)}`);
  await next();
  console.log(`<-- ${getFormatTime()} ${ctx.request.path} ${JSON.stringify(ctx.body)} ${Date.now()-startTime}ms`);
})
app.use(router.routes());
app.listen(secret.controller_port);
console.log(`${getFormatTime()} Web(Koa)服务启动 监听端口${secret.controller_port}`);