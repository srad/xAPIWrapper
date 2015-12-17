define(function () {
    'use strict';

    /**
     * Describes an object that an agent interacts with
     * @alias module:xapi/activity
     * @constructor
     * @param {string} id   The unique activity IRI
     * @param {string} name   An English-language identifier for the activity, or a Language Map
     * @param {string} description   An English-language description of the activity, or a Language Map
     */
    function Activity(id, name, description) {
        // if first arg is activity, copy everything over
        if (id && id.id) {
            var act = id;
            for (var i in act) {
                this[i] = act[i];
            }
            return;
        }

        this.objectType = 'Activity';
        this.id = id;
        if (name || description) {
            this.definition = {};

            if (typeof(name) === 'string' || name instanceof String) {
                this.definition.name = {'en-US': name};
            } else if (name) {
                this.definition.name = name;
            }

            if (typeof(description) === 'string' || description instanceof String) {
                this.definition.description = {'en-US': description};
            } else if (description) {
                this.definition.description = description;
            }
        }
    }

    /**
     * @returns {string}
     */
    Activity.prototype.toString = function () {
        if (this.definition && this.definition.name && (this.definition.name['en-US'] || this.definition.name['en'])) {
            return this.definition.name['en-US'] || this.definition.name['en'];
        } else {
            return this.id;
        }
    };

    /**
     * @returns {boolean}
     */
    Activity.prototype.isValid = function () {
        return this.id && (!this.objectType || this.objectType === 'Activity');
    };

    return Activity;
});