module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        requirejs: {
            compile: {
                options: {
                    baseUrl:                 "./src",
                    include:                 ["xapi/xapiwrapper.js"],
                    mainConfigFile:          "require-config.js",
                    out:                     "dist/xapi.amd.min.js",
                    preserveLicenseComments: false,
                    findNestedDependencies:  true,
                    wrap:                    true,
                    wrapShim:                true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');

    // Default task(s).
    grunt.registerTask('default', ['requirejs:compile']);

};
