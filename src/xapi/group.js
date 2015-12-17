define(['xapi/agent'], function (Agent) {
    'use strict';

    /**
     * A type of agent, can contain multiple agents
     * @alias module:xapi/group
     * @constructor
     * @param {string} [identifier]   (optional if `members` specified) See Agent.
     * @param {string} [members]    An array of Agents describing the membership of the group
     * @param {string} [name]   The natural-language name of the agent
     */
    var Group = function (identifier, members, name) {
        Agent.call(this, identifier, name);
        this.member = members;
        this.objectType = 'Group';
    };

    Group.prototype = new Agent();

    return Group;
});
