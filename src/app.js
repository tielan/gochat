var express = require('express');
var logger = require('morgan');
var uploads = require('./routes/uploads');
var chat = require('./component/chat');
var L = require('./L');
var env = require('./env');

var app = express();
var http = require('http').Server(app);

//初始化 express
app.use(logger('dev'));
app.use(express.static('public'));

//处理http请求
app.get('/', function (req, res) {
    res.send('<h1> socketIO </h1>');
});

//处理上传请求
app.use('/uploads', uploads);
app.use('/push', chat.push);
//创建socket.io 聊天
chat.init(http);

//http
http.listen(env.port ? env.port : 3000, function () {
    L.log('listening on '+(env.port ? env.port : 3000));
});




