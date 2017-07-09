"use strict";
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const yaml = require('js-yaml');
const fs = require('fs-extended');
const path = require('path');
const sh = require('shelljs');
const args = process.argv.slice(2);
const devConfig = require("./webpack/dev/bundle");
const productionConfig = require("./webpack/production/bundle");

// do this with a symlink now

// ['dark', 'light'].forEach(function (theme) {
//     console.log('copy templates to', theme, 'theme');
//     ['stylus'].forEach(function (preprocessor) {
//         const templatePath = path.join(__dirname, 'src', 'templates', preprocessor);
//         const sharedPath = path.join(__dirname, 'src', theme, preprocessor, 'shared');
//         try {
//             fs.unlinkSync(sharedPath);
//         } catch (e) {}
//         fs.copyDirSync(templatePath, sharedPath);
//     })
// });

if (process.env.NODE_ENV == "production") {
    webpack(productionConfig).run(function (err, stats) {
        if (err) console.log(err.message);
        else console.log('built themes');
    });
} else {
    const settingsPath = 'settings.yaml';
    let settings;

    try {
        settings = yaml.load(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
        console.log('error reading settings file @', process.cwd() + '/' + settingsPath);
        console.log(e.message);
        settings = {
            webpack: {
                dev: {
                    server: {
                        domain: '10.200.10.1',
                        port: process.env.PORT,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
                        }
                    }
                }
            }
        }
    }

    var options = {
        cached: true,
        colors: true
    };

    new WebpackDevServer(webpack(devConfig), {
        historyApiFallback: true,
        hot: true,
        stats: options
    }).listen(settings.webpack.dev.server.port, settings.webpack.dev.server.domain, function (err) {
        var urlString = settings.webpack.dev.server.domain + ':' + settings.webpack.dev.server.port;
        if (err) console.log(err);
        console.log("Webpack Server launched with at " + urlString + " (Hot Module Replacement [HMR] enabled)");
    });

}
