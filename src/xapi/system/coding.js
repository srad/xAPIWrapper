define(function () {
    'use strict';

    /**
     * @alias module:xapi/system/coding
     * @namespace
     * @type {{encodeBase64: exports.encodeBase64, decodeBase64: exports.decodeBase64, toSHA1: exports.toSHA1, ruuid: exports.ruuid}}
     */
    var exports = {
        encodeBase64: function (str) {
            return window.btoa(unescape(encodeURIComponent(str)));
        },

        decodeBase64: function (str) {
            return decodeURIComponent(escape(window.atob(str)));
        },

        /**
         * shim for old-style crypto lib
         * @param text
         * @returns {*}
         */
        toSHA1: function (text) {
            if (CryptoJS && CryptoJS.SHA1) {
                return CryptoJS.SHA1(text).toString();
            } else {
                return Crypto.util.bytesToHex(Crypto.SHA1(text, {asBytes: true}));
            }
        },

        /**
         *          Excerpt from: Math.uuid.js (v1.4)
         http://www.broofa.com
         mailto:robert@broofa.com
         Copyright (c) 2010 Robert Kieffer
         Dual licensed under the MIT and GPL licenses.
         * @returns {string}
         */
        ruuid: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    };

    return exports;
});