define([
    'xapi/system/date',
    'xapi/system/coding',
    'xapi/system/logger'
], function (Date, coding, logger) {
    'use strict';

    // TODO: Module is pretty messy, the generation of data structure is no separated from the regular code and therefore not really testable
    // TODO: Move inline functions into modules

    /*
     * Tests the configuration of the lrs object
     */
    function testConfig() {
        try {
            return this.lrs.endpoint !== undefined && this.lrs.endpoint !== "";
        } catch (e) {
            return false;
        }
    }

    // parses the params in the url query string
    function parseQueryString() {
        var loc, qs, pairs, pair, ii, parsed;

        loc = window.location.href.split('?');
        if (loc.length === 2) {
            qs = loc[1];
            pairs = qs.split('&');
            parsed = {};
            for (ii = 0; ii < pairs.length; ii += 1) {
                pair = pairs[ii].split('=');
                if (pair.length === 2 && pair[0]) {
                    parsed[pair[0]] = decodeURIComponent(pair[1]);
                }
            }
        }

        return parsed;
    }

    // merges two object
    function mergeRecursive(obj1, obj2) {
        var prop;

        for (var p in obj2) {
            prop = obj2[p];
            logger.log(p + " : " + prop);
            try {
                // Property in destination object set; update its value.
                if (obj2[p].constructor === Object) {
                    obj1[p] = mergeRecursive(obj1[p], obj2[p]);

                }
                else {
                    if (obj1 === undefined) {
                        obj1 = {};
                    }
                    obj1[p] = obj2[p];
                }
            } catch (e) {
                if (obj1 === undefined) {
                    obj1 = {};
                }
                // Property in destination object not set; create it and set its value.
                obj1[p] = obj2[p];
            }
        }

        return obj1;
    }

    // iniitializes an lrs object with settings from
    // a config file and from the url query string
    function getLRSObject(config) {
        var lrsProps = ["endpoint", "auth", "actor", "registration", "activity_id", "grouping", "activity_platform"],
            lrs = {},
            qsVars,
            prop,
            i;

        qsVars = parseQueryString();
        if (qsVars !== undefined && Object.keys(qsVars).length !== 0) {
            for (i = 0; i < lrsProps.length; i += 1) {
                prop = lrsProps[i];
                if (qsVars[prop]) {
                    lrs[prop] = qsVars[prop];
                    delete qsVars[prop];
                }
            }
            if (Object.keys(qsVars).length !== 0) {
                lrs.extended = qsVars;
            }

            lrs = mergeRecursive(config, lrs);
        }
        else {
            lrs = config;
        }

        return lrs;
    }

    function delay() {
        var xhr = new XMLHttpRequest(),
            url = window.location + '?forcenocache=' + coding.ruuid();
        xhr.open('GET', url, false);
        xhr.send(null);
    }

    /*
     * formats a request in a way that IE will allow
     * @param {string} method   the http request method (ex: "PUT", "GET")
     * @param {string} url   the url to the request (ex: XAPIWrapper.lrs.endpoint + "statements")
     * @param {array} [headers]   headers to include in the request
     * @param {string} [data]   the body of the request, if there is one
     * @return {object} xhr response object
     */
    function ie_request(method, url, headers, data) {
        var newUrl = url,

        //Everything that was on query string goes into form vars
            formData = [],
            qsIndex = newUrl.indexOf('?');

        if (qsIndex > 0) {
            formData.push(newUrl.substr(qsIndex + 1));
            newUrl = newUrl.substr(0, qsIndex);
        }

        //Method has to go on querystring, and nothing else
        newUrl = newUrl + '?method=' + method;

        //Headers
        if (headers !== null) {
            for (var headerName in headers) {
                formData.push(headerName + "=" + encodeURIComponent(headers[headerName]));
            }
        }

        //The original data is repackaged as "content" form var
        if (data !== null) {
            formData.push('content=' + encodeURIComponent(data));
        }

        return {
            "method":  "POST",
            "url":     newUrl,
            "headers": {},
            "data":    formData.join("&")
        };
    }

    /*
     * Config object used w/ url params to configure the lrs object
     * change these to match your lrs
     * @return {object} config object
     * @example
     * var conf = {
     *    "endpoint" : "https://lrs.adlnet.gov/xapi/",
     *    "auth" : "Basic " + toBase64('tom:1234'),
     * };
     * XAPIWrapper.changeConfig(conf);
     */
    var Config = {
        endpoint: "http://localhost:8000/xapi/",
        auth:     "Basic " + coding.encodeBase64('tom:1234')
    };

    /**
     * XAPIWrapper Constructor
     * @constructor
     * @param {object} config   with a minimum of an endoint property
     * @param {boolean} verifyxapiversion   indicating whether to verify the version of the LRS is compatible with this wrapper
     */
    function XAPIWrapper(config, verifyxapiversion) {
        this.lrs = getLRSObject(config || {});
        if (this.lrs.user && this.lrs.password) {
            this.updateAuth(this.lrs, this.lrs.user, this.lrs.password);
        }
        this.base = getbase(this.lrs.endpoint);

        function getbase(url) {
            var l = document.createElement("a");
            l.href = url;
            if (l.protocol && l.host) {
                return l.protocol + "//" + l.host;
            }
            logger.log("Couldn't create base url from endpoint: " + this.lrs.endpoint);
        }

        if (verifyxapiversion && testConfig.call(this)) {
            this.xhrRequest(this.lrs, this.lrs.endpoint + "about", "GET", null, null,
                function (r) {
                    if (r.status === 200) {
                        try {
                            var lrsabout = JSON.parse(r.response),
                                versionOK = false;
                            for (var idx in lrsabout.version) {
                                if (lrsabout.version[idx] === XAPIWrapper.version) {
                                    versionOK = true;
                                    break;
                                }
                            }
                            if (!versionOK) {
                                logger.log("The lrs version [" + lrsabout.version + "]" +
                                    " does not match this wrapper's XAPI version [" + XAPIWrapper.version + "]");
                            }
                        } catch (e) {
                            logger.log("The response was not an about object")
                        }
                    } else {
                        logger.log("The request to get information about the LRS failed: " + r);
                    }
                });
        }

        this.searchParams = function () {
            var sp = {"format": "exact"};
            return sp;
        };

        this.hash = function (tohash) {
            if (!tohash) {
                return null;
            }
            try {
                return toSHA1(tohash);
            }
            catch (e) {
                logger.log("Error trying to hash -- " + e);
                return null;
            }
        };

        this.changeConfig = function (config) {
            try {
                logger.log("updating lrs object with new configuration");
                this.lrs = mergeRecursive(this.lrs, config);
                if (config.user && config.password) {
                    this.updateAuth(this.lrs, config.user, config.password);
                }
                this.base = getbase(this.lrs.endpoint);
            } catch (e) {
                logger.log("error while changing configuration -- " + e);
            }
        };
    }

    // This wrapper is based on the Experience API Spec version:
    XAPIWrapper.version = "1.0.1";

    /**
     * @param obj
     * @param username
     * @param password
     * @returns {*}
     */
    XAPIWrapper.prototype.updateAuth = function (obj, username, password) {
        obj.auth = "Basic " + coding.encodeBase64(username + ":" + password);
        return obj;
    };

    /*
     * Adds info from the lrs object to the statement, if available.
     * These values could be initialized from the Config object or from the url query string.
     * @param {object} stmt   the statement object
     */
    XAPIWrapper.prototype.prepareStatement = function (stmt) {
        if (stmt.actor === undefined) {
            stmt.actor = JSON.parse(this.lrs.actor);
        }
        else if (typeof stmt.actor === "string") {
            stmt.actor = JSON.parse(stmt.actor);
        }
        if (this.lrs.grouping ||
            this.lrs.registration ||
            this.lrs.activity_platform) {
            if (!stmt.context) {
                stmt.context = {};
            }
        }

        if (this.lrs.grouping) {
            if (!stmt.context.contextActivities) {
                stmt.context.contextActivities = {};
            }
            stmt.context.contextActivities.grouping = [{id: this.lrs.grouping}];
        }
        if (this.lrs.registration) {
            stmt.context.registration = this.lrs.registration;
        }
        if (this.lrs.activity_platform) {
            stmt.context.platform = this.lrs.activity_platform;
        }
    };

    // tests the configuration of the lrs object
    XAPIWrapper.prototype.testConfig = testConfig;

    // writes to the console if available
    XAPIWrapper.prototype.log = log;

    /**
     * Send a single statement to the LRS. Makes a Javascript object
     * with the statement id as 'id' available to the callback function.
     * @param {object} stmt   statement object to send
     * @param {function} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     *            and an object with an id property assigned the id
     *            of the statement
     * @return {object} object containing xhr object and id of statement
     * @example
     * // Send Statement
     * var stmt = {"actor" : {"mbox" : "mailto:tom@example.com"},
     *             "verb" : {"id" : "http://adlnet.gov/expapi/verbs/answered",
     *                       "display" : {"en-US" : "answered"}},
     *             "object" : {"id" : "http://adlnet.gov/expapi/activities/question"}};
     * var resp_obj = XAPIWrapper.sendStatement(stmt);
     * logger.log("[" + resp_obj.id + "]: " + resp_obj.xhr.status + " - " + resp_obj.xhr.statusText);
     * >> [3e616d1c-5394-42dc-a3aa-29414f8f0dfe]: 204 - NO CONTENT
     *
     * // Send Statement with Callback
     * var stmt = {"actor" : {"mbox" : "mailto:tom@example.com"},
     *             "verb" : {"id" : "http://adlnet.gov/expapi/verbs/answered",
     *                       "display" : {"en-US" : "answered"}},
     *             "object" : {"id" : "http://adlnet.gov/expapi/activities/question"}};
     * XAPIWrapper.sendStatement(stmt, function(resp, obj){
     *     logger.log("[" + obj.id + "]: " + resp.status + " - " + resp.statusText);});
     * >> [4edfe763-8b84-41f1-a355-78b7601a6fe8]: 204 - NO CONTENT
     */
    XAPIWrapper.prototype.sendStatement = function (stmt, callback) {
        if (this.testConfig()) {
            this.prepareStatement(stmt);
            var id;
            if (stmt['id']) {
                id = stmt['id'];
            }
            else {
                id = coding.ruuid();
                stmt['id'] = id;
            }
            var resp = this.xhrRequest(this.lrs, this.lrs.endpoint + "statements",
                "POST", JSON.stringify(stmt), this.lrs.auth, callback, {"id": id});
            if (!callback) {
                return {
                    "xhr": resp,
                    "id":  id
                };
            }
        }
    };

    /**
     * Send a list of statements to the LRS.
     * @param {array} stmtArray   the list of statement objects to send
     * @param {function} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object
     * @example
     * var stmt = {"actor" : {"mbox" : "mailto:tom@example.com"},
     *             "verb" : {"id" : "http://adlnet.gov/expapi/verbs/answered",
     *                       "display" : {"en-US" : "answered"}},
     *             "object" : {"id" : "http://adlnet.gov/expapi/activities/question"}};
     * var resp_obj = XAPIWrapper.sendStatement(stmt);
     * XAPIWrapper.getStatements({"statementId":resp_obj.id});
     * >> {"version": "1.0.0",
     *     "timestamp": "2013-09-09 21:36:40.185841+00:00",
     *     "object": {"id": "http://adlnet.gov/expapi/activities/question", "objectType": "Activity"},
     *     "actor": {"mbox": "mailto:tom@example.com", "name": "tom creighton", "objectType": "Agent"},
     *     "stored": "2013-09-09 21:36:40.186124+00:00",
     *     "verb": {"id": "http://adlnet.gov/expapi/verbs/answered", "display": {"en-US": "answered"}},
     *     "authority": {"mbox": "mailto:tom@adlnet.gov", "name": "tom", "objectType": "Agent"},
     *     "context": {"registration": "51a6f860-1997-11e3-8ffd-0800200c9a66"},
     *     "id": "ea9c1d01-0606-4ec7-8e5d-20f87b1211ed"}
     */
    XAPIWrapper.prototype.sendStatements = function (stmtArray, callback) {
        if (this.testConfig()) {
            for (var i in stmtArray) {
                this.prepareStatement(stmtArray[i]);
            }
            var resp = this.xhrRequest(this.lrs, this.lrs.endpoint + "statements",
                "POST", JSON.stringify(stmtArray), this.lrs.auth, callback);
            if (!callback) {
                return resp;
            }
        }
    };

    /**
     * Get statement(s) based on the searchparams or more url.
     * @param {object} searchparams   an XAPIWrapper.searchParams object of
     *                key(search parameter)-value(parameter value) pairs.
     *                Example:
     *                  var myparams = XAPIWrapper.searchParams();
     *                  myparams['verb'] = verbs.completed.id;
     *                  var completedStmts = XAPIWrapper.getStatements(myparams);
     * @param {string} more   the more url found in the StatementResults object, if there are more
     *        statements available based on your get statements request. Pass the
     *        more url as this parameter to retrieve those statements.
     * @param {function} [callback] - function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * var ret = XAPIWrapper.getStatements();
     * if (ret)
     *     logger.log(ret.statements);
     *
     * >> <Array of statements>
     */
    XAPIWrapper.prototype.getStatements = function (searchparams, more, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "statements";
            if (more) {
                url = this.base + more;
            } else {
                var urlparams = [];

                for (var s in searchparams) {
                    if (s === "until" || s === "since") {
                        var d = new Date(searchparams[s]);
                        urlparams.push(s + "=" + encodeURIComponent(d.toISOString()));
                    } else {
                        urlparams.push(s + "=" + encodeURIComponent(searchparams[s]));
                    }
                }
                if (urlparams.length > 0) {
                    url = url + "?" + urlparams.join("&");
                }
            }

            var res = this.xhrRequest(this.lrs, url, "GET", null, this.lrs.auth, callback);
            if (res === undefined || res.status === 404) {
                return null
            }

            try {
                return JSON.parse(res.response);
            }
            catch (e) {
                return res.response;
            }
        }
    };

    /**
     * Gets the Activity object from the LRS.
     * @param {string} activityid   the id of the Activity to get
     * @param {function} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * var res = XAPIWrapper.getActivities("http://adlnet.gov/expapi/activities/question");
     * logger.log(res);
     * >> <Activity object>
     */
    XAPIWrapper.prototype.getActivities = function (activityid, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "activities?activityId=<activityid>";
            url = url.replace('<activityid>', encodeURIComponent(activityid));

            var result = this.xhrRequest(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);

            if (result === undefined || result.status === 404) {
                return null;
            }

            try {
                return JSON.parse(result.response);
            } catch (e) {
                return result.response;
            }
        }
    };

    /**
     * Store activity state in the LRS
     * @param {string} activityid   the id of the Activity this state is about
     * @param {object} agent   the agent this Activity state is related to
     * @param {string} stateid   the id you want associated with this state
     * @param {string} [registration]   the registraton id associated with this state
     * @param {string} stateval   the state
     * @param {string} [matchHash]    the hash of the state to replace or * to replace any
     * @param {string} [noneMatchHash]    the hash of the current state or * to indicate no previous state
     * @param {function} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {boolean} false if no activity state is included
     * @example
     * var stateval = {"info":"the state info"};
     * XAPIWrapper.sendState("http://adlnet.gov/expapi/activities/question",
     *                    {"mbox":"mailto:tom@example.com"},
     *                    "questionstate", null, stateval);
     */
    XAPIWrapper.prototype.sendState = function (activityid, agent, stateid, registration, stateval, matchHash, noneMatchHash, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "activities/state?activityId=<activity ID>&agent=<agent>&stateId=<stateid>";

            url = url.replace('<activity ID>', encodeURIComponent(activityid));
            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<stateid>', encodeURIComponent(stateid));

            if (registration) {
                url += "&registration=" + encodeURIComponent(registration);
            }

            var headers = null;
            if (matchHash && noneMatchHash) {
                log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash) {
                headers = {"If-Match": '"' + matchHash + '"'};
            }
            else if (noneMatchHash) {
                headers = {"If-None-Match": '"' + noneMatchHash + '"'};
            }

            var method = "PUT";
            if (stateval) {
                if (Array.isArray(stateval)) {
                    stateval = JSON.stringify(stateval);
                    headers = headers || {};
                    headers["Content-Type"] = "application/json";
                } else if (stateval instanceof Object) {
                    stateval = JSON.stringify(stateval);
                    headers = headers || {};
                    headers["Content-Type"] = "application/json";
                    method = "POST";
                } else {
                    headers = headers || {};
                    headers["Content-Type"] = "application/octet-stream";
                }
            } else {
                logger.log("No activity state was included.");
                return false;
            }
            //TODO: You have already proven the complexity your signatures, pass in an object: (lrs, url, method, data, auth, callback, callbackargs, ignore404, extraHeaders)
            this.xhrRequest(this.lrs, url, method, stateval, this.lrs.auth, callback, null, null, headers);
        }
    };

    /**
     * Get activity state from the LRS
     * @param {string} activityid   the id of the Activity this state is about
     * @param {object} agent   the agent this Activity state is related to
     * @param {string} [stateid]    the id of the state, if not included, the response will be a list of stateids
     *            associated with the activity and agent)
     * @param {string} [registration]   the registraton id associated with this state
     * @param {object} [since]    date object or date string telling the LRS to return objects newer than the date supplied
     * @param {function} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * XAPIWrapper.getState("http://adlnet.gov/expapi/activities/question",
     *                  {"mbox":"mailto:tom@example.com"}, "questionstate");
     * >> {info: "the state info"}
     */
    XAPIWrapper.prototype.getState = function (activityid, agent, stateid, registration, since, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "activities/state?activityId=<activity ID>&agent=<agent>";

            url = url.replace('<activity ID>', encodeURIComponent(activityid));
            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));

            if (stateid) {
                url += "&stateId=" + encodeURIComponent(stateid);
            }

            if (registration) {
                url += "&registration=" + encodeURIComponent(registration);
            }

            if (since) {
                since = isDate(since);
                if (since != null) {
                    url += '&since=' + encodeURIComponent(since.toISOString());
                }
            }

            var result = this.xhrRequest(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);

            if (result === undefined || result.status === 404) {
                return null;
            }

            try {
                return JSON.parse(result.response);
            }
            catch (e) {
                return result.response;
            }
        }
    };

    /**
     * Delete activity state in the LRS
     * @param {string} activityid   the id of the Activity this state is about
     * @param {object} agent   the agent this Activity state is related to
     * @param {string} stateid   the id you want associated with this state
     * @param {string} [registration]   the registraton id associated with this state
     * @param {string} [matchHash]    the hash of the state to replace or * to replace any
     * @param {string} [noneMatchHash]    the hash of the current state or * to indicate no previous state
     * @param {string} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * var stateval = {"info":"the state info"};
     * XAPIWrapper.sendState("http://adlnet.gov/expapi/activities/question",
     *                           {"mbox":"mailto:tom@example.com"},
     *                           "questionstate", null, stateval);
     * XAPIWrapper.getState("http://adlnet.gov/expapi/activities/question",
     *                         {"mbox":"mailto:tom@example.com"}, "questionstate");
     * >> {info: "the state info"}
     *
     * XAPIWrapper.deleteState("http://adlnet.gov/expapi/activities/question",
     *                         {"mbox":"mailto:tom@example.com"}, "questionstate");
     * >> XMLHttpRequest {statusText: "NO CONTENT", status: 204, response: "", responseType: "", responseXML: null…}
     *
     * XAPIWrapper.getState("http://adlnet.gov/expapi/activities/question",
     *                         {"mbox":"mailto:tom@example.com"}, "questionstate");
     * >> 404
     */
    XAPIWrapper.prototype.deleteState = function (activityid, agent, stateid, registration, matchHash, noneMatchHash, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "activities/state?activityId=<activity ID>&agent=<agent>&stateId=<stateid>";

            url = url.replace('<activity ID>', encodeURIComponent(activityid));
            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<stateid>', encodeURIComponent(stateid));

            if (registration) {
                url += "&registration=" + encodeURIComponent(registration);
            }

            var headers = null;
            if (matchHash && noneMatchHash) {
                logger.log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash) {
                headers = {"If-Match": '"' + matchHash + '"'};
            }
            else if (noneMatchHash) {
                headers = {"If-None-Match": '"' + noneMatchHash + '"'};
            }

            var result = this.xhrRequest(this.lrs, url, "DELETE", null, this.lrs.auth, callback, null, headers);

            if (result === undefined || result.status === 404) {
                return null
            }

            try {
                return JSON.parse(result.response);
            }
            catch (e) {
                return result;
            }
        }
    };

    /**
     * Store activity profile in the LRS
     * @param {string} activityid   the id of the Activity this profile is about
     * @param {string} profileid   the id you want associated with this profile
     * @param {string} profileval   the profile
     * @param {string} [matchHash]    the hash of the profile to replace or * to replace any
     * @param {string} [noneMatchHash]    the hash of the current profile or * to indicate no previous profile
     * @param {string} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {bolean} false if no activity profile is included
     * @example
     * var profile = {"info":"the profile"};
     * XAPIWrapper.sendActivityProfile("http://adlnet.gov/expapi/activities/question",
     *                                     "actprofile", profile, null, "*");
     */
    XAPIWrapper.prototype.sendActivityProfile = function (activityid, profileid, profileval, matchHash, noneMatchHash, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "activities/profile?activityId=<activity ID>&profileId=<profileid>";

            url = url.replace('<activity ID>', encodeURIComponent(activityid));
            url = url.replace('<profileid>', encodeURIComponent(profileid));

            var headers = null;
            if (matchHash && noneMatchHash) {
                logger.log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash) {
                headers = {"If-Match": '"' + matchHash + '"'};
            }
            else if (noneMatchHash) {
                headers = {"If-None-Match": '"' + noneMatchHash + '"'};
            }

            var method = "PUT";
            if (profileval) {
                if (Array.isArray(profileval)) {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] = "application/json";
                } else if (profileval instanceof Object) {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] = "application/json";
                    method = "POST";
                } else {
                    headers = headers || {};
                    headers["Content-Type"] = "application/octet-stream";
                }
            } else {
                logger.log("No activity profile was included.");
                return false;
            }

            this.xhrRequest(this.lrs, url, method, profileval, this.lrs.auth, callback, null, false, headers);
        }
    };

    /*
     * Get activity profile from the LRS
     * @param {string} activityid   the id of the Activity this profile is about
     * @param {string} [profileid]    the id of the profile, if not included, the response will be a list of profileids
     *              associated with the activity
     * @param {object} [since]    date object or date string telling the LRS to return objects newer than the date supplied
     * @param {function [callback]    function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * XAPIWrapper.getActivityProfile("http://adlnet.gov/expapi/activities/question",
     *                                    "actprofile", null,
     *                                    function(r){logger.log(JSON.parse(r.response));});
     * >> {info: "the profile"}
     */
    XAPIWrapper.prototype.getActivityProfile = function (activityid, profileid, since, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "activities/profile?activityId=<activity ID>";

            url = url.replace('<activity ID>', encodeURIComponent(activityid));

            if (profileid) {
                url += "&profileId=" + encodeURIComponent(profileid);
            }

            if (since) {
                since = isDate(since);
                if (since != null) {
                    url += '&since=' + encodeURIComponent(since.toISOString());
                }
            }

            var result = this.xhrRequest(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);

            if (result === undefined || result.status === 404) {
                return null
            }

            try {
                return JSON.parse(result.response);
            }
            catch (e) {
                return result.response;
            }
        }
    };

    /*
     * Delete activity profile in the LRS
     * @param {string} activityid   the id of the Activity this profile is about
     * @param {string} profileid   the id you want associated with this profile
     * @param {string} [matchHash]    the hash of the profile to replace or * to replace any
     * @param {string} [noneMatchHash]    the hash of the current profile or * to indicate no previous profile
     * @param {string} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * XAPIWrapper.deleteActivityProfile("http://adlnet.gov/expapi/activities/question",
     *                                       "actprofile");
     * >> XMLHttpRequest {statusText: "NO CONTENT", status: 204, response: "", responseType: "", responseXML: null…}
     */
    XAPIWrapper.prototype.deleteActivityProfile = function (activityid, profileid, matchHash, noneMatchHash, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "activities/profile?activityId=<activity ID>&profileId=<profileid>";

            url = url.replace('<activity ID>', encodeURIComponent(activityid));
            url = url.replace('<profileid>', encodeURIComponent(profileid));

            var headers = null;
            if (matchHash && noneMatchHash) {
                logger.log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash) {
                headers = {"If-Match": '"' + matchHash + '"'};
            }
            else if (noneMatchHash) {
                headers = {"If-None-Match": '"' + noneMatchHash + '"'};
            }

            var result = this.xhrRequest(this.lrs, url, "DELETE", null, this.lrs.auth, callback, null, headers);

            if (result === undefined || result.status === 404) {
                return null
            }

            try {
                return JSON.parse(result.response);
            }
            catch (e) {
                return result;
            }
        }
    };

    /*
     * Gets the Person object from the LRS based on an agent object.
     * The Person object may contain more information about an agent.
     * See the xAPI Spec for details.
     * @param {object} agent   the agent object to get a Person
     * @param {function [callback]    function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * var res = XAPIWrapper.getAgents({"mbox":"mailto:tom@example.com"});
     * logger.log(res);
     * >> <Person object>
     */
    XAPIWrapper.prototype.getAgents = function (agent, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "agents?agent=<agent>";
            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));

            var result = this.xhrRequest(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);

            if (result === undefined || result.status === 404) {
                return null
            }

            try {
                return JSON.parse(result.response);
            }
            catch (e) {
                return result.response;
            }
        }
    };

    /**
     * Store agent profile in the LRS
     * @param {object} agent   the agent this profile is related to
     * @param {string} profileid   the id you want associated with this profile
     * @param {string} profileval   the profile
     * @param {string} [matchHash]    the hash of the profile to replace or * to replace any
     * @param {string} [noneMatchHash]    the hash of the current profile or * to indicate no previous profile
     * @param {string} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} false if no agent profile is included
     * @example
     * var profile = {"info":"the agent profile"};
     * XAPIWrapper.sendAgentProfile({"mbox":"mailto:tom@example.com"},
     *                                   "agentprofile", profile, null, "*");
     */
    XAPIWrapper.prototype.sendAgentProfile = function (agent, profileid, profileval, matchHash, noneMatchHash, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "agents/profile?agent=<agent>&profileId=<profileid>";

            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<profileid>', encodeURIComponent(profileid));

            var headers = null;
            if (matchHash && noneMatchHash) {
                logger.log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash) {
                headers = {"If-Match": '"' + matchHash + '"'};
            }
            else if (noneMatchHash) {
                headers = {"If-None-Match": '"' + noneMatchHash + '"'};
            }

            var method = "PUT";
            if (profileval) {
                if (profileval instanceof Array) {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] = "application/json";
                }
                else if (profileval instanceof Object) {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] = "application/json";
                    method = "POST";
                }
                else {
                    headers = headers || {};
                    headers["Content-Type"] = "application/octet-stream";
                }
            }
            else {
                logger.log("No agent profile was included.");
                return false;
            }

            this.xhrRequest(this.lrs, url, method, profileval, this.lrs.auth, callback, null, false, headers);
        }
    };

    /**
     * Get agnet profile from the LRS
     * @param {object} agent   the agent associated with this profile
     * @param {string} [profileid]    the id of the profile, if not included, the response will be a list of profileids
     *              associated with the agent
     * @param {object} [since]    date object or date string telling the LRS to return objects newer than the date supplied
     * @param {function} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * XAPIWrapper.getAgentProfile({"mbox":"mailto:tom@example.com"},
     *                                  "agentprofile", null,
     *                                  function(r){logger.log(JSON.parse(r.response));});
     * >> {info: "the agent profile"}
     */
    XAPIWrapper.prototype.getAgentProfile = function (agent, profileid, since, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "agents/profile?agent=<agent>";

            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<profileid>', encodeURIComponent(profileid));

            if (profileid) {
                url += "&profileId=" + encodeURIComponent(profileid);
            }

            if (since) {
                since = isDate(since);
                if (since != null) {
                    url += '&since=' + encodeURIComponent(since.toISOString());
                }
            }

            var result = this.xhrRequest(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);

            if (result === undefined || result.status === 404) {
                return null
            }

            try {
                return JSON.parse(result.response);
            } catch (e) {
                return result.response;
            }
        }
    };

    /**
     * Delete agent profile in the LRS
     * @param {oject} agent   the id of the Agent this profile is about
     * @param {string} profileid   the id you want associated with this profile
     * @param {string} [matchHash]    the hash of the profile to replace or * to replace any
     * @param {string} [noneMatchHash]    the hash of the current profile or * to indicate no previous profile
     * @param {string} [callback]   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     *            the function will be passed the XMLHttpRequest object
     * @return {object} xhr response object or null if 404
     * @example
     * XAPIWrapper.deleteAgentProfile({"mbox":"mailto:tom@example.com"},
     *                                     "agentprofile");
     * >> XMLHttpRequest {statusText: "NO CONTENT", status: 204, response: "", responseType: "", responseXML: null…}
     */
    XAPIWrapper.prototype.deleteAgentProfile = function (agent, profileid, matchHash, noneMatchHash, callback) {
        if (this.testConfig()) {
            var url = this.lrs.endpoint + "agents/profile?agent=<agent>&profileId=<profileid>";

            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<profileid>', encodeURIComponent(profileid));

            var headers = null;
            if (matchHash && noneMatchHash) {
                logger.log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash) {
                headers = {"If-Match": '"' + matchHash + '"'};
            }
            else if (noneMatchHash) {
                headers = {"If-None-Match": '"' + noneMatchHash + '"'};
            }

            var result = this.xhrRequest(this.lrs, url, "DELETE", null, this.lrs.auth, callback, null, headers);

            if (result === undefined || result.status === 404) {
                return null
            }

            try {
                return JSON.parse(result.response);
            } catch (e) {
                return result;
            }
        }
    };

    /**
     * TODO: way too big => decomposition
     * Synchronous if callback is not provided (not recommended)
     * makes a request to a server (if possible, use functions provided in XAPIWrapper)
     * @param {string} lrs   the lrs connection info, such as endpoint, auth, etc
     * @param {string} url   the url of this request
     * @param {string} method   the http request method
     * @param {string} data   the payload
     * @param {string} auth   the value for the Authorization header
     * @param {function} callback   function to be called after the LRS responds
     *            to this request (makes the call asynchronous)
     * @param {object} [callbackargs]   additional javascript object to be passed to the callback function
     * @param {boolean} [ignore404]    allow page not found errors to pass
     * @param {object} [extraHeaders]   other header key-values to be added to this request
     * @return {object} xhr response object
     */
    XAPIWrapper.prototype.xhrRequest = function (lrs, url, method, data, auth, callback, callbackargs, ignore404, extraHeaders) {
        var xhr,
            finished = false,
            xDomainRequest = false,
            ieXDomain = false,
            ieModeRequest,
            urlparts = url.toLowerCase().match(/^(.+):\/\/([^:\/]*):?(\d+)?(\/.*)?$/),
            location = window.location,
            urlPort,
            result,
            extended,
            prop,
            until;

        //Consolidate headers
        var headers = {};
        headers["Content-Type"] = "application/json";
        headers["Authorization"] = auth;
        headers['X-Experience-API-Version'] = XAPIWrapper.version;
        if (extraHeaders !== null) {
            for (var headerName in extraHeaders) {
                headers[headerName] = extraHeaders[headerName];
            }
        }

        //See if this really is a cross domain
        xDomainRequest = (location.protocol.toLowerCase() !== urlparts[1] || location.hostname.toLowerCase() !== urlparts[2]);
        if (!xDomainRequest) {
            urlPort = (urlparts[3] === null ? ( urlparts[1] === 'http' ? '80' : '443') : urlparts[3]);
            xDomainRequest = (urlPort === location.port);
        }

        //If it's not cross domain or we're not using IE, use the usual XmlHttpRequest
        if (!xDomainRequest || typeof(XDomainRequest) === 'undefined') {
            xhr = new XMLHttpRequest();
            xhr.open(method, url, callback != null);
            for (var headerName in headers) {
                xhr.setRequestHeader(headerName, headers[headerName]);
            }
        }
        //Otherwise, use IE's XDomainRequest object
        else {
            ieXDomain = true;
            ieModeRequest = ie_request(method, url, headers, data);
            xhr = new XDomainRequest();
            xhr.open(ieModeRequest.method, ieModeRequest.url);
        }

        //Setup request callback
        function requestComplete() {
            if (!finished) {
                // may be in sync or async mode, using XMLHttpRequest or IE XDomainRequest, onreadystatechange or
                // onload or both might fire depending upon browser, just covering all bases with event hooks and
                // using 'finished' flag to avoid triggering events multiple times
                finished = true;
                var notFoundOk = (ignore404 && xhr.status === 404);
                if (xhr.status === undefined || (xhr.status >= 200 && xhr.status < 400) || notFoundOk) {
                    if (callback) {
                        if (callbackargs) {
                            callback(xhr, callbackargs);
                        } else {
                            try {
                                var body = JSON.parse(xhr.responseText);
                                callback(xhr, body);
                            } catch (e) {
                                callback(xhr, xhr.responseText);
                            }
                        }
                    } else {
                        result = xhr;
                        return xhr;
                    }
                } else {
                    var warning;
                    try {
                        warning = "There was a problem communicating with the Learning Record Store. ( "
                            + xhr.status + " | " + xhr.response + " )" + url
                    } catch (ex) {
                        warning = ex.toString();
                    }
                    logger.log(warning);
                    this.xhrRequestOnError(xhr, method, url, callback, callbackargs);
                    result = xhr;
                    return xhr;
                }
            } else {
                return result;
            }
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                return requestComplete();
            }
        };

        xhr.onload = requestComplete;
        xhr.onerror = requestComplete;

        xhr.send(ieXDomain ? ieModeRequest.data : data);

        if (!callback) {
            // synchronous
            if (ieXDomain) {
                // synchronous call in IE, with no asynchronous mode available.
                until = 1000 + new Date();
                while (new Date() < until && xhr.readyState !== 4 && !finished) {
                    delay();
                }
            }
            return requestComplete();
        }
    };

    /**
     * Holder for custom global error callback
     * @param {object} xhr   xhr object or null
     * @param {string} method   XMLHttpRequest request method
     * @param {string} url   full endpoint url
     * @example
     * xhrRequestOnError = function(xhr, method, url, callback, callbackargs) {
     *   console.log(xhr);
     *   alert(xhr.status + " " + xhr.statusText + ": " + xhr.response);
     * };
     */
    XAPIWrapper.prototype.xhrRequestOnError = function (xhr, method, url, callback, callbackargs) {
        logger.error(method, url, callbackargs)
    };

    return new XAPIWrapper(Config, false);
});