define(function () {
    'use strict';

    /**
     * @type {{log: exports.log}}
     */
    var exports = {
        log:   function (message) {
            console.log(message);
        },
        error: function (message) {
            console.error(message);
        },
        warn:  function (message) {
            console.warn(message);
        }
    };

    return exports;
});