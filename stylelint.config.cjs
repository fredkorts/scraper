/** @type {import('stylelint').Config} */
module.exports = {
    extends: ["stylelint-config-standard-scss"],
    rules: {
        "selector-class-pattern": null,
        "declaration-empty-line-before": null,
        "at-rule-empty-line-before": null,
        "custom-property-empty-line-before": null,
        "media-feature-range-notation": null,
        "color-hex-length": null,
        "color-function-alias-notation": null,
        "color-function-notation": null,
        "alpha-value-notation": null,
        "value-keyword-case": null,
        "property-no-deprecated": null,
        "selector-pseudo-class-no-unknown": [
            true,
            {
                ignorePseudoClasses: ["global", "local", "export", "import"],
            },
        ],
        "property-no-unknown": [
            true,
            {
                ignoreProperties: ["composes"],
            },
        ],
    },
};
