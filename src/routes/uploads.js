var utils = require('../utils');
var uuid = require('uuid');
var path = require('path');
var multer = require('multer');
var express = require('express');
var router = express.Router();

var storage = multer.diskStorage({
    //设置上传后文件路径，uploads文件夹会自动创建。
    destination: function(req, file, cb) {
        var time = new Date();
        var uri = time.getFullYear() + '/' + (time.getMonth()+1) + '/' + time.getDate();
        var dirPath = 'public/' + uri;
        utils.mkdirsSync(dirPath);
        file.uri = uri;
        cb(null, dirPath)
    },
    //给上传文件重命名，获取添加后缀名
    filename: function(req, file, cb) {
        var fileFormat = (file.originalname).split(".");
        cb(null, uuid.v1() + "." + fileFormat[fileFormat.length - 1]);
    }
});
//添加配置文件到muler对象。
var upload = multer({
    storage: storage
});

//附件上传
router.post('/', upload.single('file'), function(req, res, next) {
    var file = req.file;
    var resData = {
        code: 0,
        desc: '操作失败!',
    };
    if (file) {
        resData.code = 1;
        resData.desc = '操作成功';
        resData.data = file.uri + '/' + file.filename;
    }
    res.send(resData);

});


module.exports = router;