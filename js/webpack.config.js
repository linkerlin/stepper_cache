const path = require('path');

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, './src/forum/index.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'forum.js',
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    externals: {
        'flarum/forum/app': 'app'
    }
};