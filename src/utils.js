var fs = require('fs');
var path = require('path');

exports.mkdirsSync = function mkdirsSync(dirpath) {
    if (fs.existsSync(dirpath)) {
        return true;
    } else {
        var tmp = path.dirname(dirpath);
        if (mkdirsSync(tmp)) {
            fs.mkdirSync(dirpath);
            return true;
        }
    }
}