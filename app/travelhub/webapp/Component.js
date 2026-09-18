sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "travelhub/model/models",
    "travelhub/controller/BaseController"
], function (UIComponent, Device, models, BaseController) {
    "use strict";

    return UIComponent.extend("travelhub.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createUserModel(), "userModel");

            this.getRouter().initialize();
            this._restoreSession();
        },

        // Spec 5.1 — on app load: valid access token skips Login and routes
        // straight to the role dashboard; an expired token is refreshed first;
        // otherwise the default "" route already shows Login.
        _restoreSession: function () {
            var oCtrl = this._getBootController();
            var sAccess = oCtrl.getCookie("th_access");
            var sUser = oCtrl.getCookie("th_user");

            if (!sAccess) { return; }

            if (oCtrl.isAccessTokenValid()) {
                this._resumeFromCookies(oCtrl, sUser);
                return;
            }

            if (oCtrl.getCookie("th_refresh")) {
                oCtrl.refreshToken().then(function () {
                    this._resumeFromCookies(oCtrl, sUser);
                }.bind(this)).catch(function () {
                    oCtrl.onLogout();
                });
            }
        },

        _resumeFromCookies: function (oCtrl, sUser) {
            oCtrl.attachAuthHeaderToODataModel();
            if (sUser) {
                var oUserData = JSON.parse(sUser);
                this.getModel("userModel").setData(oUserData);
                this.getRouter().navTo(oUserData.role === "ADMIN" ? "adminDashboard" : "travellerDashboard");
            } else {
                oCtrl.fetchMe().then(function (oUserData) {
                    this.getRouter().navTo(oUserData.role === "ADMIN" ? "adminDashboard" : "travellerDashboard");
                }.bind(this));
            }
        },

        // A throwaway controller instance just to reuse BaseController's cookie/JWT
        // helpers during Component startup, before any view exists.
        _getBootController: function () {
            var oComponent = this;
            return Object.assign(Object.create(BaseController.prototype), {
                getOwnerComponent: function () { return oComponent; }
            });
        }

    });
});
