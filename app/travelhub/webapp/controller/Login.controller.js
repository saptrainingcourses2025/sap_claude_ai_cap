sap.ui.define([
    "travelhub/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, Fragment, MessageToast) {
    "use strict";

    var ADDRESS_TYPES = [
        { code: "H", name: "Home" },
        { code: "O", name: "Office" },
        { code: "P", name: "Permanent" },
        { code: "T", name: "Temporary" }
    ];

    return BaseController.extend("travelhub.controller.Login", {

        onInit: function () {
            this.getView().setModel(new JSONModel({ loginName: "", password: "", busy: false }), "login");
            this.getView().setModel(new JSONModel({
                busy: false,
                addressTypes: ADDRESS_TYPES,
                draft: { firstName: "", lastName: "", loginName: "", password: "", phone: "", addressType: "H" }
            }), "register");
        },

        onLogin: function () {
            var oLoginModel = this.getView().getModel("login");
            var sLoginName = oLoginModel.getProperty("/loginName");
            var sPassword = oLoginModel.getProperty("/password");

            if (!sLoginName || !sPassword) {
                this.showError("Email and password are required");
                return;
            }

            oLoginModel.setProperty("/busy", true);
            this.login(sLoginName, sPassword).then(function (oUser) {
                oLoginModel.setProperty("/busy", false);
                this.getRouter().navTo(oUser.role === "ADMIN" ? "adminDashboard" : "travellerDashboard");
            }.bind(this)).catch(function (oErr) {
                oLoginModel.setProperty("/busy", false);
                this.showError(oErr.message);
            }.bind(this));
        },

        onOpenRegister: function () {
            var that = this;
            if (!this._oRegisterDialog) {
                Fragment.load({
                    name: "travelhub.fragment.RegisterDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oRegisterDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oRegisterDialog.open();
            }
        },

        onRegisterSubmit: function () {
            var oRegisterModel = this.getView().getModel("register");
            var oDraft = oRegisterModel.getProperty("/draft");

            if (!oDraft.firstName || !oDraft.lastName || !oDraft.loginName || !oDraft.password) {
                this.showError("First name, last name, email and password are required");
                return;
            }

            oRegisterModel.setProperty("/busy", true);
            this.register(oDraft).then(function (oResult) {
                oRegisterModel.setProperty("/busy", false);
                this._oRegisterDialog.close();
                MessageToast.show(oResult.message);
            }.bind(this)).catch(function (oErr) {
                oRegisterModel.setProperty("/busy", false);
                this.showError(oErr.message);
            }.bind(this));
        },

        onRegisterCancel: function () {
            this._oRegisterDialog.close();
        }

    });
});
