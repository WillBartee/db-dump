

    const envr = require('../../');

    
    module.exports = {
          a: 100
        , c: 3
        , yeah: [{
            thisIs: {
                suchFun: envr.get('fancy')
            }
        }]
    };