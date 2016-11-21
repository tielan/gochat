

var low = require('lowdb');
var socket = require('socket.io');
var express = require('express');
var router = express.Router();

var utils = require('../utils');
var L = require('../L');
var push = require('./push');


var socketIO;

/*********初始化文件夹**** */
//utils.mkdirsSync('static/config');
utils.mkdirsSync('static/db/user');
/*********初始化文件夹**** */

var SysDB = low('static/db/SysDB.json');
//当前在线的用户
var onlineUsers = {};//存储在线用户列表的对象

//Android 已经订阅的用户
var subscribeUsers = {};
//iOS 已经订阅的用户
var i_subscribeUsers = {};

/**
 * 初始化聊天服务
 */
var init = function (http) {
    socketIO = socket.listen(http);
    socketIO.on('connection', chat);
}

function chat(socket) {
    L.log('coming-->' + socket.id);
    //有人上线
    socket.on('online', function (data) {
        online(socket, data);
        offlineMsg(socket, data);
    });

    //收到新消息
    socket.on('newMsg', function (data, fun) {
        newMsg(socket, data);
        if (fun) {
            var ackMsg = new Object();
            ackMsg.msg_id = data.msg_id;
            ackMsg.to = data.to;
            fun(ackMsg);
        }

    });
    //获取离线消息
    socket.on('offlineMsg', function (data) {
        offlineMsg(socket, data);
    });
    //设置消息已读
    socket.on('readMsg', function (data) {
        readMsg(socket, data);
    });
    //收到订阅 命令
    socket.on('a_sub', function (data) {
        subscribe(socket, data);
    });
    socket.on('i_sub', function (data) {
        subscribe(socket, data);
    });

    // Android 取消订阅
    socket.on('a_unsub', function (data) {
        unsubscribe(socket, data);
    });
    //iOS 取消订阅
    socket.on('i_unsub', function (data) {
        unsubscribe(socket, data);
    });

    //有人下线
    socket.on('disconnect', function (data) {
        disconnect(socket, data);
    });

}

function getUserTable(userId, tableName) {
    var MsgDB = low('static/db/user/MsgDB_' + userId + '.json');
    if (!MsgDB.has(tableName).value()) {
        MsgDB.set(tableName, []).value()
    }
    return MsgDB.get(tableName);
}

//登录上线请求
function online(socket, data) {
    //将上线的用户名存储为 socket 对象的属性，以区分每个 socket 对象，方便后面使用
    if (!(data.username)) {
        L.log('无效登录(消息不完整) -->' + JSON.stringify(data), socket);
        return;
    }
    socket.username = data.username;
    L.log('online-->' + JSON.stringify(data), socket);
    //onlineUsers 对象中不存在该用户名则插入该用户名
    if (!onlineUsers[data.username]) {
        onlineUsers[data.username] = data.username;
    }
    //向所有用户广播该用户上线信息
    socketIO.sockets.emit('online', { users: onlineUsers, user: data.username });
}
function disconnect(socket, data) {
    L.log('disconnect-->' + socket, socket);
    //若 users 对象中保存了该用户名
    if (onlineUsers[socket.name]) {
        //从 users 对象中删除该用户名
        delete onlineUsers[socket.name];
        //向其他所有用户广播该用户下线信息
        socket.broadcast.emit('offline', { users: onlineUsers, user: socket.name });
    }
}
//订阅服务
function subscribe(socket, obj) {
    savesub('A', obj);
}

// 取消订阅
function unsubscribe(socket, data) {
    removesub('A', data);
}

function i_subscribe(socket, obj) {
    savesub('I', obj);
}

// 取消订阅
function i_unsubscribe(socket, data) {
    removesub('I', data);
}
function savesub(type, obj) {
    //clientId
    socket.clientId = obj.clientId;
    //根据用户ID 进行推送（一个用户只能订阅一次 以最后一次为准）
    if ('A' === type) {
        subscribeUsers[obj.userid] = obj;
    } else {
        i_subscribeUsers[obj.userid] = obj;
    }
    var tableName = "SUB_" + type;
    if (!SysDB.has(tableName).value()) {
        SysDB.set(tableName, []).value()
    }
    var oldObj = SysDB.get(tableName).find({ userid: obj.userid }).value();
    if (oldObj) {
        SysDB.get(tableName).remove(oldObj).value();
    }
    SysDB.get(tableName).push(obj).value();//添加到表
}
//移除订阅
function removesub(type, data) {
    if ('A' === type) {
        delete subscribeUsers[obj.userid];
    } else {
        delete i_subscribeUsers[obj.userid];
    }
    SysDB.get("SUB_" + type).remove(data).value();//移除表数据
}
//       "username": "68",
//       "to": "68",
//       "msg_id": "93b850fc-2ad3-41cc-a939-81fd35547c38",
//       "message": "[:-o][:-o][:-o][:-o]",
//       "msgTime": 1479460008837,
//       "isReaded": false,
//       "status": 1
//保存聊天数据 
function saveMessage(data) {
    data.isSend = true;
    getUserTable(data.to, 'chat').push(data).value();
    data.isSend = false;
    data.msg_id = data.msg_id + data.username;
    getUserTable(data.username, 'chat').push(data).value();
}

//签收消息
function ackMsg(ackData) {
    var tableName = "M_" + ackData.to;
    getUserTable(ackData.to, 'chat')
        .find({ msg_id: ackData.msg_id })
        .assign({ status: 1 })
        .value()

}
function newMsg(socket, data) {
    if (!(data.username && data.to && data.message && data.msg_id)) {
        L.log('忽略(消息不完整) -->' + JSON.stringify(data), socket);
        return;
    }
    L.log('newMsg-->' + JSON.stringify(data), socket);
    saveMessage(data);
    if (data.to == 'all') {
        //向其他所有用户广播该用户发话信息
        socket.broadcast.emit('newMsg', data);
    } else {
        //向特定用户发送该用户发话信息
        //clients 为存储所有连接对象的数组
        socketIO.clients(function (error, clients) {
            if (error) throw error;
            var targetClients = [];//目标连接
            var isOffline = true;
            clients.forEach(function (s) {
                //触发该用户客户端的 say 事件
                var client = socketIO.of('/').sockets[s];
                if (data.to === client.username) {
                    targetClients.push(client);
                    isOffline = false;
                } else {
                    var subClient = subscribeUsers[data.to];
                    if (subClient && subClient.clientId === client.clientId) {
                        targetClients.push(client);
                    }
                }
            });

            targetClients.forEach(function (client) {
                if (isOffline) {//离线状态  推送消息 Android
                    push.Androidpush(client, data);
                } else { //在线直接发送
                    if (client.username) {
                        client.emit('newMsg', data, function (ackData) {
                            L.log('签收消息' + JSON.stringify(ackData));
                            ackMsg(ackData);
                        });
                    }
                }
            });

            if (isOffline) {//离线状态  推送消息 iOS
                var obj = i_subscribeUsers[data.userid];
                push.iOSpush(obj.clientId, data);
            }

        });

    }
}
//设置消息已读
function readMsg(socket, data) {

}
//获取离线消息
//data{userId,start,count}
function offlineMsg(socket, data) {
    var tableName = "M_" + data.username;
    var msgs = MsgDB.get(tableName)
        .filter({ status: 1 })
        .sortBy('msgTime')
        .take(data.size)
        .value();
    if (msgs && msgs.length > 0){
        setTimeout(function () {
            //提交离线消息
            socket.emit('offlineMsg', msgs);
        }, 500);
    }


}

/**
 * 处理API请求
 */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

exports.push = router;
exports.init = init;
