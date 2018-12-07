const secret = require('../secret');

function handleApi1() {
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

function handleApi2() {

  return {
    response: {
      statusCode: 200,
      header: {
        'Content-Type': 'text/html;charset=utf-8'
      },
      body: secret.fakeResponse.api2
    }
  }
}

module.exports = {
  summary: 'fake checkin',

  *beforeSendRequest(requestDetail) {
    const {requestOptions} = requestDetail;
    const {hostname, path} = requestOptions;

    if(hostname === secret.host && path === secret.api.api1) {
      return handleApi1(requestDetail);
    }

    if(hostname === secret.host && path === secret.api.api2) {
      return handleApi2(requestDetail);
    }

    return null;
  }
}