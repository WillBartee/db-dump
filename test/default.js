
    // push the env since mocha is stupid and doesnt acccept unknown args
    process.argv.push('--testing');


    var assert = require('assert');
    var path = require('path');
    var envr = require('../')



    describe('ENVR', function(){
        it('should get the correct env I', function() {
            assert.equal(envr.env, 'testing');
        });

        it('should get the correct env II', function() {
            assert(envr.isTesting());
        });

        it('should get the correct env III', function() {
            assert(!envr.isProduction());
        });

        it('should get the correct config', function() {
            const config = envr.config(path.join(__dirname, 'data'));

            assert(config);

            assert.equal(config.a, 1);
            assert.equal(config.b, 2);
            assert.equal(config.c, 3);
            assert.equal(config.pass, 'so-secure');
            assert.equal(config.yeah[0].thisIs.suchFun, 69);
        });
    });
