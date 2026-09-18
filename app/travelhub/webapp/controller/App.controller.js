sap.ui.define([
    "travelhub/controller/BaseController"
], function (BaseController) {
    "use strict";

    // App.controller.js — the persistent shell. It exists only so the Header
    // fragment's Logout button (press=".onLogout") resolves against a
    // BaseController instance; it holds no page-specific logic.
    return BaseController.extend("travelhub.controller.App", {

        onInit: function () {
            this.attachAuthHeaderToODataModel();
        }

    });
});
