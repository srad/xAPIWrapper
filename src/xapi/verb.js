define(function () {
    'use strict';

    /**
     * Really only provides a convenient language map
     * @alias module:xapi/verb
     * @constructor
     * @param {string} id   The IRI of the action taken
     * @param {string} [description]    An English-language description, or a Language Map
     */
    function Verb(id, description) {
        // if passed a verb object then copy and return
        if (id && id.id) {
            for (var i in id) {
                this[i] = id[i];
            }
            return;
        }

        // save id and build language map
        this.id = id;
        if (description) {
            if (typeof(description) === 'string' || description instanceof String) {
                this.display = {'en-US': description};
            }
            else {
                this.display = description;
            }
        }
    }

    /**
     * @returns {string}
     */
    Verb.prototype.toString = function () {
        if (this.display && (this.display['en-US'] || this.display['en'])) {
            return this.display['en-US'] || this.display['en'];
        } else {
            return this.id;
        }
    };

    /**
     * @returns {boolean}
     */
    Verb.prototype.isValid = function () {
        return this.id;
    };

    return Verb;
});