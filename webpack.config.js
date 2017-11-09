const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js'
    },
    target: 'node',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: [require('babel-plugin-transform-object-rest-spread')]
                    }
                }
            },
            { test: /\.json$/, loader: 'json-loader' }
        ]
    },
    resolve: {
        alias: {

            src: path.resolve(__dirname, './src')
        }
    },
    node: {
        console: true,
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    }
};