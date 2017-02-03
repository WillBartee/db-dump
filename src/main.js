(function() {
    'use strict';

    const Dump = require('./Dump');
    const log = require('ee-log');
    const readline = require('readline');
    const path = require('path');



    // get cli arguments
    const args = process.argv;
    const pwd = process.env.PWD;

    let configFilePath = path.join(pwd, 'config.js');
    let dumpConfigDir  = path.join(pwd, 'config');
    let dataDir        = path.join(pwd, 'data');
    let config;



    args.forEach((arg) => {
        const parts = /\-\-([^=]+)=(.+)/gi.exec(arg);

        if (parts) {
            switch (parts[1]) {
                case 'config':
                    return configFilePath = path.join((parts[2][0] === '/' ? '' : pwd), parts[2]);
                case 'config-dir':
                    return dumpConfigDir = path.join((parts[2][0] === '/' ? '' : pwd), parts[2]);
                case 'data-dir':
                    return dataDir = path.join((parts[2][0] === '/' ? '' : pwd), parts[2]);
            }
        }
    });




    try {
        config = require(configFilePath);
    } catch (err) {
        log.error('Failed to load config!');
        log(err);
        process.exit();
    }




    const rl = readline.createInterface({
       input: process.stdin,
       output: process.stdout
    });






    rl.question(`Dumping ${config.database} db from ${config.host}:${config.port} using the user ${config.user}. Continue [Ny]?`, (answer) => {
        rl.close();

        if (answer === 'y' || answer === 'Y') {
            const dump = new Dump({
                  dataDir: dataDir
                , configDir: dumpConfigDir
                , config: config
                , silent: false
            });


            dump.dump();
        }
    });
})();
