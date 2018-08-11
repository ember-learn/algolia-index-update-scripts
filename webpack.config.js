const path = require('path');

module.exports = {
    entry: {
        index: './src/index.js',
        api: './src/api.js',
        guides: './src/guides.js'
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js'
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