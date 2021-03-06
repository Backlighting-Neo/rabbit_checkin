const AnyProxy = require('anyproxy');

const options = {
  port: 60008,
  rule: require('./rule/fake_checkin'),
}

const proxyServer = new AnyProxy.ProxyServer(options);

proxyServer.on('ready', () => {
  console.log('AnyProxy has been listen');
});
proxyServer.on('error', err => {
  console.error(err);
})


proxyServer.start();

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);
process.on('exit', proxyServer.close);