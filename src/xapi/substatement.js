define(['xapi/statement'], function (Statement) {
    'use strict';

    /**
     * A self-contained statement as the object of another statement
     * See XAPIStatement for constructor details
     * @alias module:xapi/substatement
     * @extends module:xapi/statement
     * @constructor
     * @param {string} actor   The Agent or Group committing the action described by the statement
     * @param {string} verb   The Verb for the action described by the statement
     * @param {string} object   The receiver of the action. An Agent, Group, Activity, or StatementRef
     */
    function SubStatement(actor, verb, object) {
        Statement.call(this, actor, verb, object);
        this.objectType = 'SubStatement';

        delete this.id;
        delete this.stored;
        delete this.version;
        delete this.authority;
    }

    SubStatement.prototype = new Statement();

    /**
     * @returns {string}
     */
    SubStatement.prototype.toString = function () {
        return '"' + SubStatement.prototype.prototype.toString.call(this) + '"';
    };

    return SubStatement;
});