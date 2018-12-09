const fetch = require('node-fetch');
const secret = require('../../secret');

function handleApi1(requestDetail) {
  return {
    response: {
      statusCode: 200,
      header: {
        'Content-Type': 'text/json;charset=utf-8'
      },
      body: secret.fakeResponse.api1
    }
  }
}

function handleApi2(requestDetail) {
  return fetch(`http://localhost:${secret.controller_port}/add_task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    /**
     * 任务详情格式
     *  url - 请求的网址
     *  method - 请求方式
     *  headers - 请求头
     *  data - 请求body
     */
    body: JSON.stringify({
      url: requestDetail.url,
      method: requestDetail.requestOptions.method,
      headers: requestDetail.requestOptions.headers,
      data: requestDetail.requestData.toString()
    })
  })
  .then(res => res.json())
  .then(json => ({
    response: {
      statusCode: 200,
      header: {
        'Content-Type': 'text/html;charset=utf-8'
      },
      body: `{"status":"0","info":"${json.message}"}`
    }
  }))
}

module.exports = {
  summary: 'fake checkin',

  *beforeSendRequest(requestDetail) {
    const {requestOptions} = requestDetail;
    const {hostname, path} = requestOptions;

    if(hostname === secret.host && path.startsWith(secret.api.api1)) {
      return handleApi1(requestDetail);
    }

    if(hostname === secret.host && path.startsWith(secret.api.api2)) {
      return handleApi2(requestDetail);
    }

    return null;
  },

  *beforeDealHttpsRequest(requestDetail) {
    return requestDetail.host === secret.host;
  }
}