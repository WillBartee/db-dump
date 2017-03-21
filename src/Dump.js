(function() {
    'use strict';

    const path = require('path');
    const fs = require('fs');
    const cp = require('child_process');
    const log = require('ee-log');
    const readline = require('readline');





    // add sequential promise worker
    Promise.sequence = (promises) => {
        const results = [];

        const execute = (index) => {
            if (promises.length > index) {
                return promises[index]().then((result) => {
                    results.push(result);
                    return execute(index+1);
                });
            } else return Promise.resolve(results);
        };

        return execute(0);
    };










    module.exports = class DBDump {


        constructor(options) {
            this.dataDir = options.dataDir;
            this.configDir = options.configDir;
            this.config = options.config;
            this.silent = options.silent;
        }




        dump() {
            const configurations = new Set();

             if (!this.silent) log.info(`Starting to dump db schemas & data configured by ${this.configDir} to the data dir ${this.dataDir} ...`);


            // lets start
            return new Promise((resolve, reject) => {
                if (!this.silent) log.info(`Enumerating dump configurations ...`);

                // enumerate the configs
                fs.readdir(this.configDir, (err, files) => {
                    if (err) return reject(err);
                    else if (files && files.length) return resolve(files);
                    else return reject(new Error(`No dump configurations found ...`));
                });
            }).then((files) => {
                if (!this.silent) log.success(`Found ${files.length} configurations ...`);
                if (!this.silent) log.info(`Loading dump configurations ...`);

                // require the configs
                return Promise.all(files.map((file) => {
                    let config;

                    try {
                        config = require(path.join(this.configDir, file));
                    } catch (err) {
                        log(err);
                        return Promise.reject(err);
                    }

                    configurations.add(config);

                    return Promise.resolve();
                }));
            }).then(() => {
                if (!this.silent) log.success(`Loaded ${configurations.size} configurations ...`);
                if (!this.silent) log.info(`Starting extension dumps ...`);

                // set the indey
                Array.from(configurations.values()).forEach((configuration, index) => {
                    configuration.index = (index+10)*100;
                });


                // dump extensions
                return Promise.sequence(Array.from(configurations.values()).filter(c => c.extensions && c.extensions.length).map((configuration) => {
                    return () => {
                        log.debug(`Dumping extensions for ${configuration.schema} ...`);

                        
                        const dataFile = path.join(this.dataDir, `${configuration.index}-${configuration.schema}.extensions.sql`);
                        if (!this.silent) log.debug(`Extension dump for ${this.config.database}.${configuration.schema} succeeded ...`);

                        fs.writeFileSync(dataFile, configuration.extensions.map(e => `create extension ${e};`).join('\n'));
                        if (!this.silent) log.info(`Extension dump for ${this.config.database}.${configuration.schema} stored in file ${dataFile}`);
                        

                        return Promise.resolve();
                    };            
                }));
            }).then(() => {
                if (!this.silent) log.success(`Extensions for ${configurations.size} schemas dumped ...`);
                if (!this.silent) log.info(`Starting schema dumps ...`);

                // dump the structure
                return Promise.sequence(Array.from(configurations.values()).map((configuration, index) => {
                    return () => {
                        log.debug(`Dumping schema of ${configuration.schema} ...`);


                        return new Promise((resolve, reject) => {
                            cp.exec(`PGPASSWORD="${this.config.pass}" pg_dump -Fc --schema=${configuration.schema} -s -x --clean -U ${this.config.user} -h ${this.config.host} -p ${this.config.port} --create ${this.config.database}`, {
                                  maxBuffer: 1024*1024*20
                                , encoding: 'buffer'
                            }, (err, stdOut, stdErr) => {
                                if (err) reject(err);
                                else {
                                    const dataFile = path.join(this.dataDir, `${configuration.index+10}-${configuration.schema}.dump`);
                                    if (!this.silent) log.debug(`Dump for ${this.config.database}.${configuration.schema} succeeded ...`);

                                    fs.writeFileSync(dataFile, stdOut);
                                    if (!this.silent) log.info(`Dump for ${this.config.database}.${configuration.schema} stored in file ${dataFile}`);
                                    resolve();
                                }
                            });
                        });
                    };            
                }));
            }).then(() => {
                if (!this.silent) log.success(`Structure for ${configurations.size} schemas dumped ...`);
                if (!this.silent) log.info(`Starting data dumps ...`);


                // dump the data
                return Promise.sequence(Array.from(configurations.values()).filter(c => c.dataFrom && c.dataFrom.length).map((configuration) => {
                    return () => {
                        log.debug(`Dumping data from ${configuration.schema} ...`);

                        return new Promise((resolve, reject) => {
                            cp.exec(`PGPASSWORD="${this.config.pass}" pg_dump -Fc --schema=${configuration.schema} -a -t '"${configuration.schema}"."${configuration.dataFrom.join(`"' -t '"${configuration.schema}"."`)}"' -x -U ${this.config.user} -h ${this.config.host} -p ${this.config.port} --create ${this.config.database}`, {
                                  maxBuffer: 1024*1024*20
                                , encoding: 'buffer'
                            }, (err, stdOut, stdErr) => {
                                if (err) reject(err);
                                else {
                                    const dataFile = path.join(this.dataDir, `${configuration.index+20}-${configuration.schema}.data.dump`);
                                    if (!this.silent) log.debug(`Data dump for ${this.config.database}.${configuration.schema} succeeded ...`);

                                    fs.writeFileSync(dataFile, stdOut);
                                    if (!this.silent) log.info(`Data dump for ${this.config.database}.${configuration.schema} stored in file ${dataFile}`);
                                    resolve();
                                }
                            });
                        });
                    };            
                }));
            }).then(() => {
                if (!this.silent) log.success(`Data for ${configurations.size} schemas dumped ...`);
                if (!this.silent) log.success(`Thats it!`);

                return Promise.resolve();
            });
        }
    }   
})();
