require.config({
    baseUrl: "src/",
    paths:   {
        "cryptojs.core":   "vendor/cryptojslib/components/core",
        "cryptojs.base64": "vendor/cryptojslib/components/enc-base64",
        "cryptojs.sha1":   "vendor/cryptojslib/components/sha1"
    },
    shim:    {
        "cryptojs.core":   {
            exports: "CryptoJS"
        },
        "cryptojs.sha1":   {
            deps:    ["cryptojs.core"],
            exports: "CryptoJS"
        },
        "cryptojs.base64": {
            deps:    ["cryptojs.core"],
            exports: "CryptoJS"
        }
    }
});