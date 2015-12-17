define(function () {
    'use strict';

    /**
     * Provides an easy constructor for xAPI agent objects
     * @alias module:xapi/agent
     * @constructor
     * @param {string} identifier   One of the Inverse Functional Identifiers specified in the spec.
     *     That is, an email, a hashed email, an OpenID, or an account object.
     *     See (https://github.com/adlnet/xAPI-Spec/blob/master/xAPI.md#inversefunctional)
     * @param {string} [name]   The natural-language name of the agent
     */
    function Agent(identifier, name) {
        this.objectType = 'Agent';
        this.name = name;

        // figure out what type of identifier was given
        if (identifier && (identifier.mbox || identifier.mbox_sha1sum || identifier.openid || identifier.account)) {
            for (var i in identifier) {
                this[i] = identifier[i];
            }
        }
        else if (/^mailto:/.test(identifier)) {
            this.mbox = identifier;
        }
        else if (/^[0-9a-f]{40}$/i.test(identifier)) {
            this.mbox_sha1sum = identifier;
        }
        else if (/^http[s]?:/.test(identifier)) {
            this.openid = identifier;
        }
        else if (identifier && identifier.homePage && identifier.name) {
            this.account = identifier;
        }
    }

    /**
     * @returns {string}
     */
    Agent.prototype.toString = function () {
        return this.name || this.mbox || this.openid || this.mbox_sha1sum || this.account.name;
    };

    /**
     * @returns {boolean}
     */
    Agent.prototype.isValid = function () {
        return this.mbox || this.mbox_sha1sum || this.openid
            || (this.account.homePage && this.account.name)
            || (this.objectType === 'Group' && this.member);
    };

    return Agent;
});