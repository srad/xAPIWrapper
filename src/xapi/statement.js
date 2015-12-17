define(function () {
    'use strict';

    /**
     * @param obj
     * @param path
     * @returns {*}
     * @private
     */
    function _getobj(obj, path) {
        var parts = path.split('.'),
            part = parts[0];

        path = parts.slice(1).join('.');

        if (!obj[part]) {
            if (/\[\]$/.test(part)) {
                part = part.slice(0, -2);
                obj[part] = [];
            } else {
                obj[part] = {};
            }
        }

        if (!path) {
            return obj[part];
        }
        return _getobj(obj[part], path);
    }

    /*******************************************************************************
     * XAPIStatement - a convenience class to wrap statement objects
     *
     * This sub-API is supposed to make it easier to author valid xAPI statements
     * by adding constructors and encouraging best practices. All objects in this
     * API are fully JSON-compatible, so anything expecting an xAPI statement can
     * take an improved statement and vice versa.
     *
     * A working knowledge of what exactly the LRS expects is still expected,
     * but it's easier to map an 'I did this' statement to xAPI now.
     *
     * Tech note: All constructors also double as shallow clone functions. E.g.
     *
     *   var activity1 = new Activity('A walk in the park');
     *   var activity2 = new Activity(activity1);
     *   var activity3 = new Activity(stmt_from_lrs.object);
     *
     *******************************************************************************/

    /**
     * A convenient JSON-compatible xAPI statement wrapper
     * All args are optional, but the statement may not be complete or valid
     * Can also pass an Agent IFI, Verb ID, and an Activity ID in lieu of these args
     * @alias module:xapi/statement
     * @constructor
     * @param {string} [actor]   The Agent or Group committing the action described by the statement
     * @param {string} [verb]   The Verb for the action described by the statement
     * @param {string} [object]   The receiver of the action. An Agent, Group, Activity, SubStatement, or StatementRef
     * @example
     * var stmt = new ADL.XAPIStatement(
     *     'mailto:steve.vergenz.ctr@adlnet.gov',
     *    'http://adlnet.gov/expapi/verbs/launched',
     *    'http://vwf.adlnet.gov/xapi/virtual_world_sandbox'
     * );
     * >> {
     * "actor": {
     *     "objectType": "Agent",
     *     "mbox": "mailto:steve.vergenz.ctr@adlnet.gov" },
     * "verb": {
     *     "id": "http://adlnet.gov/expapi/verbs/launched" },
     * "object": {
     *     "objectType": "Activity",
     *     "id": "http://vwf.adlnet.gov/xapi/virtual_world_sandbox" }}
     */
    function XAPIStatement(actor, verb, object) {
        // if first arg is an xapi statement, parse
        if (actor && actor.actor && actor.verb && actor.object) {
            var stmt = actor;
            for (var i in stmt) {
                if (i != 'actor' && i != 'verb' && i != 'object') {
                    this[i] = stmt[i];
                }
            }
            actor = stmt.actor;
            verb = stmt.verb;
            object = stmt.object;
        }

        if (actor) {
            if (actor instanceof Agent) {
                this.actor = actor;
            } else if (actor.objectType === 'Agent' || !actor.objectType) {
                this.actor = new Agent(actor);
            } else if (actor.objectType === 'Group') {
                this.actor = new Group(actor);
            }
        } else {
            this.actor = null;
        }

        if (verb) {
            if (verb instanceof Verb) {
                this.verb = verb;
            } else {
                this.verb = new Verb(verb);
            }
        } else {
            this.verb = null;
        }

        // decide what kind of object was passed
        if (object) {
            if (object.objectType === 'Activity' || !object.objectType) {
                if (object instanceof Activity) {
                    this.object = object;
                } else {
                    this.object = new Activity(object);
                }
            } else if (object.objectType === 'Agent') {
                if (object instanceof Agent) {
                    this.object = object;
                } else {
                    this.object = new Agent(object);
                }
            } else if (object.objectType === 'Group') {
                if (object instanceof Group) {
                    this.object = object;
                } else {
                    this.object = new Group(object);
                }
            } else if (object.objectType === 'StatementRef') {
                if (object instanceof StatementRef) {
                    this.object = object;
                } else {
                    this.object = new StatementRef(object);
                }
            } else if (object.objectType === 'SubStatement') {
                if (object instanceof SubStatement) {
                    this.object = object;
                } else {
                    this.object = new SubStatement(object);
                }
            } else {
                this.object = null;
            }
        } else {
            this.object = null;
        }

        this.generateId = function () {
            this.id = ADL.ruuid();
        };
    }

    /**
     * @returns {string}
     */
    XAPIStatement.prototype.toString = function () {
        return this.actor.toString() + " " + this.verb.toString() + " " + this.object.toString();
    };

    /**
     * @returns {boolean}
     */
    XAPIStatement.prototype.isValid = function () {
        return this.actor && this.actor.isValid()
            && this.verb && this.verb.isValid()
            && this.object && this.object.isValid();
    };

    XAPIStatement.prototype.generateRegistration = function () {
        _getobj(this, 'context').registration = ADL.ruuid();
    };

    XAPIStatement.prototype.addParentActivity = function (activity) {
        _getobj(this, 'context.contextActivities.parent[]').push(new Activity(activity));
    };

    XAPIStatement.prototype.addGroupingActivity = function (activity) {
        _getobj(this, 'context.contextActivities.grouping[]').push(new Activity(activity));
    };

    XAPIStatement.prototype.addOtherContextActivity = function (activity) {
        _getobj(this, 'context.contextActivities.other[]').push(new Activity(activity));
    };

    return XAPIStatement;
});