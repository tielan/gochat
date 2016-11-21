var path = require('path');
var webpack = require('webpack');
var json = require('./package.json') // 这个路径视当前的路径进行对于修改
module.exports = {
    entry: {
        app: path.resolve(__dirname, 'src/app.js'),
        // 将 第三方依赖 单独打包
        vendor: Object.keys(json.dependencies)
    },
    target:'node',
    output: {
        path: __dirname + "/build",
        filename: "[name].js",
        publicPath: '/'
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            filename: '[name].js'
        })
    ]
}