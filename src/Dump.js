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

        // TODO improve with default options and option checking outside of the running code.
        constructor(options) {
            this.dataDir = options.dataDir;
            this.configDir = options.configDir;
            this.config = options.config;

            // TODO use this option to wrap a the logger so we can clean up the following code.
            this.silent = options.silent;
            this.maxBuffer = {
              maxBuffer: options.maxBuffer || 1024*1024*20
            }
        }

        // TODO test the ps_dump options order
        // TODO determine a strategy for performing this as individual tables
        clientCommand(configuration, isSchemaStep) {
          if (this.config.client === 'mysql') {

            let baseCommand = `mysqldump -h${this.config.host} -u${this.config.user} -p${this.config.pass} ${configuration.schema} `;
            // TODO determine a configuration strategy for ingnoring tables schema and data
            // eg.  `--ignore-table=${configuration.schema}.requests --ignore-table=${configuration.schema}.codes`
            let commandSuffix = ` ${configuration.dataFrom || ''} `;

            let stepOptions = isSchemaStep ? '--no-data'
              : '--no-create-info';
            return baseCommand + commandSuffix + stepOptions;
          } else {
            let baseCommand = `PGPASSWORD="${this.config.pass}" pg_dump --schema=${configuration.schema} `
            let commandSuffix = ` -U ${this.config.user} -h ${this.config.host} -p ${this.config.port} --create ${this.config.database}`
            if (isSchemaStep) {
              return baseCommand + ` -s -x --clean ` + commandSuffix;
            } else {
              return baseCommand
                + ` -a -t '"${configuration.schema}"."${configuration.dataFrom.join(`"' -t '"${configuration.schema}"."`)}"' -x `
                + commandSuffix;
            }
          }
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
                        config = require(path.resolve(this.configDir, file));
                    } catch (err) {
                        log(err);
                        return Promise.reject(err);
                    }

                    configurations.add(config);

                    return Promise.resolve();
                }));
            }).then(() => {
                if (!this.silent) log.success(`Loaded ${configurations.size} configurations ...`);
                if (!this.silent) log.info(`Starting schema dumps ...`);

                // dump the structure
                return Promise.sequence(Array.from(configurations.values()).map((configuration, index) => {
                    return () => {
                        log.debug(`Dumping schema of ${configuration.schema} ...`);

                        // TODO Improve this indexing strategy
                        configuration.index = (index+10)*100;

                        return new Promise((resolve, reject) => {
                            cp.exec(this.clientCommand(configuration, true), this.maxBuffer, (err, stdOut, stdErr) => {
                                if (err) reject(err);
                                else {
                                    const dataFile = path.join(this.dataDir, `${configuration.index}-${configuration.schema}.schema.sql`);
                                    if (!this.silent) log.debug(`Dump for ${this.config.database}.${configuration.schema} succeeded ...`);

                                    fs.writeFileSync(dataFile, stdOut.toString());
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
                return Promise.sequence(Array.from(configurations.values()).filter(c => true || c.dataFrom && c.dataFrom.length).map((configuration) => {
                    return () => {
                        log.debug(`Dumping data from ${configuration.schema} ...`);

                        return new Promise((resolve, reject) => {
                            // TODO determine a strategy for performing this as individual tables
                            cp.exec(this.clientCommand(configuration), this.maxBuffer, (err, stdOut, stdErr) => {
                                if (err) reject(err);
                                else {
                                    const dataFile = path.join(this.dataDir, `${configuration.index+1}-${configuration.schema}.data.sql`);
                                    if (!this.silent) log.debug(`Data dump for ${this.config.database}.${configuration.schema} succeeded ...`);

                                    fs.writeFileSync(dataFile, stdOut.toString());
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
