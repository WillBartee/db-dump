# db-dump

[![Greenkeeper badge](https://badges.greenkeeper.io/eventEmitter/db-dump.svg)](https://greenkeeper.io/)

dumps a postgres db and some of its tables to sql files

### Usage

    db-dump --config=config.js --data-dir=../data-dir --config-dir=/path/to/config/dir


all options are optional. if you ommit one the following defaults are used:

- config: $pwd/config.js
- data-dir: $pwd/data/
- config-dir: $pwd/config/


All paths may be relative and will be resolved rtelative to $pwd


#### Option --config=

Contains the path to a config file which must export the following object:

    module.exports = {
          database: 'myDb'
        , user: 'root'
        , pass: 'secure'
        , host: 'somne.domain'
        , port: 5432
    };


#### Option --data-dir=

Specifies the folder where the dumps will be stored


#### Option --config-dir=

Specifies where the config files for the dumps are stored. The folde must contain js files that export obejct of the following form:


    module.exports = {
          schema: 'authentication_condition_service'
        , dataFrom: [ // list of tables for which the data must be dumped
              'status'
        ]
    };

