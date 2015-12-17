define(['xapi/system/logger'], function (logger) {
    'use strict';

    function pad(number) {
        var r = String(number);
        if (r.length === 1) {
            r = '0' + r;
        }
        return r;
    }

    if (!Date.prototype.toISOString) {
        /**
         * adds toISOString to date objects if not there
         * from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
         * @returns {string}
         */
        Date.prototype.toISOString = function () {
            return this.getUTCFullYear()
                + '-' + pad(this.getUTCMonth() + 1)
                + '-' + pad(this.getUTCDate())
                + 'T' + pad(this.getUTCHours())
                + ':' + pad(this.getUTCMinutes())
                + ':' + pad(this.getUTCSeconds())
                + '.' + String((this.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5)
                + 'Z';
        };
    }

    /**
     * check if string or object is date, if it is, return date object
     * feburary 31st == march 3rd in this solution
     * @static
     * @param date
     * @returns {Date|null}
     */
    Date.isDate = function (date) {
        var d;
        // check if object is being passed
        if (Object.prototype.toString.call(date) === "[object Date]") {
            d = date;
        } else {
            d = new Date(date);
        }

        // deep check on date object
        if (Object.prototype.toString.call(d) === "[object Date]") {
            // it is a date
            if (isNaN(d.valueOf())) {
                logger.log("Invalid date String passed");
                return null;
            } else {
                return d;
            }
        } else {
            // not a date
            logger.log("Invalid date object");
            return null;
        }
    };

    /**
     * dateFromISOString
     * parses an ISO string into a date object
     * isostr - the ISO string
     * @static
     * @param {string} isostr
     * @returns {Date}
     */
    Date.dateFromISOString = function (isostr) {
        var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
                "([T| ]([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
                "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?",
            d = isostr.match(new RegExp(regexp)),
            offset = 0,
            date = new Date(d[1], 0, 1);

        if (d[3]) {
            date.setMonth(d[3] - 1);
        }
        if (d[5]) {
            date.setDate(d[5]);
        }
        if (d[7]) {
            date.setHours(d[7]);
        }
        if (d[8]) {
            date.setMinutes(d[8]);
        }
        if (d[10]) {
            date.setSeconds(d[10]);
        }
        if (d[12]) {
            date.setMilliseconds(Number("0." + d[12]) * 1000);
        }
        if (d[14]) {
            offset = (Number(d[16]) * 60) + Number(d[17]);
            offset *= ((d[15] == '-') ? 1 : -1);
        }

        offset -= date.getTimezoneOffset();

        var time = (Number(date) + (offset * 60 * 1000));
        var dateToReturn = new Date();
        dateToReturn.setTime(Number(time));
        return dateToReturn;
    };

    return Date;
});