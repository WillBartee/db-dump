(function() {
    'use strict';

    if (require.main === module) {
        require('./src/main');
    } else {
        module.exports = require('./src/Dump');
    }	
})();
