define(function () {
    'use strict';

    /**
     * An object that refers to a separate statement
     * @alias module:xapi/statementref
     * @constructor
     * @param {string} id   The UUID of another xAPI statement
     */
    function StatementRef(id) {
        if (id && id.id) {
            for (var i in id) {
                this[i] = id[i];
            }
        }
        else {
            this.objectType = 'StatementRef';
            this.id = id;
        }
    }

    /**
     * @returns {string}
     */
    StatementRef.prototype.toString = function () {
        return 'statement(' + this.id + ')';
    };

    /**
     * @returns {boolean}
     */
    StatementRef.prototype.isValid = function () {
        return this.id && this.objectType && this.objectType === 'StatementRef';
    };

    return StatementRef;
});