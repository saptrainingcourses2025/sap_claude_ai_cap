sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("travelhub.controller.BaseController", {

        // -----------------------------------------------------------
        // Accessors
        // -----------------------------------------------------------

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getUserModel: function () {
            return this.getOwnerComponent().getModel("userModel");
        },

        getODataModel: function () {
            return this.getOwnerComponent().getModel();
        },

        getUserManagementModel: function () {
            return this.getOwnerComponent().getModel("userManagement");
        },

        // -----------------------------------------------------------
        // Cookie helpers
        // -----------------------------------------------------------

        setCookie: function (sName, sValue, iSeconds) {
            var sExpires = "";
            if (iSeconds) {
                var oDate = new Date();
                oDate.setTime(oDate.getTime() + iSeconds * 1000);
                sExpires = "; expires=" + oDate.toUTCString();
            }
            var sSecure = window.location.protocol === "https:" ? "; Secure" : "";
            document.cookie = sName + "=" + encodeURIComponent(sValue) + sExpires + "; path=/; SameSite=Strict" + sSecure;
        },

        getCookie: function (sName) {
            var aParts = document.cookie ? document.cookie.split(";") : [];
            for (var i = 0; i < aParts.length; i++) {
                var aPair = aParts[i].trim().split("=");
                if (aPair[0] === sName) {
                    return decodeURIComponent(aPair.slice(1).join("="));
                }
            }
            return null;
        },

        deleteCookie: function (sName) {
            document.cookie = sName + "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
        },

        getAccessToken: function () {
            return this.getCookie("th_access");
        },

        // -----------------------------------------------------------
        // JWT helper (decode only — never trust client-side for auth,
        // this is used purely to decide whether to skip Login on reload)
        // -----------------------------------------------------------

        _decodeJwtExpiry: function (sToken) {
            try {
                var sPayload = sToken.split(".")[1];
                var oPayload = JSON.parse(window.atob(sPayload.replace(/-/g, "+").replace(/_/g, "/")));
                return oPayload.exp ? oPayload.exp * 1000 : 0;
            } catch (e) {
                return 0;
            }
        },

        isAccessTokenValid: function () {
            var sToken = this.getAccessToken();
            if (!sToken) { return false; }
            return this._decodeJwtExpiry(sToken) > Date.now();
        },

        // -----------------------------------------------------------
        // OData V4 auth header
        // -----------------------------------------------------------

        attachAuthHeaderToODataModel: function () {
            var sToken = this.getCookie("th_access");
            if (!sToken) { return; }

            var oModel = this.getODataModel();
            if (oModel) {
                // OData V4: applies Authorization: Bearer <token> to every CatalogService call.
                oModel.changeHttpHeaders({ Authorization: "Bearer " + sToken });
            }

            var oUserMgmtModel = this.getUserManagementModel();
            if (oUserMgmtModel) {
                oUserMgmtModel.changeHttpHeaders({ Authorization: "Bearer " + sToken });
            }
        },

        // -----------------------------------------------------------
        // Fetch wrapper — auto-attaches Bearer, handles 401 -> refresh -> retry once
        // -----------------------------------------------------------

        _ajax: function (sUrl, sMethod, oData) {
            var that = this;

            function doFetch() {
                return fetch(sUrl, {
                    method: sMethod,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + (that.getAccessToken() || "")
                    },
                    body: oData !== undefined ? JSON.stringify(oData) : undefined
                });
            }

            return doFetch().then(function (oResponse) {
                if (oResponse.status === 401) {
                    return that.refreshToken().then(doFetch);
                }
                return oResponse;
            }).then(function (oResponse) {
                if (!oResponse.ok) {
                    return oResponse.json().catch(function () { return {}; }).then(function (oBody) {
                        var sMsg = (oBody.error && oBody.error.message) || "Request failed (" + oResponse.status + ")";
                        throw new Error(sMsg);
                    });
                }
                return oResponse.status === 204 ? null : oResponse.json();
            });
        },

        // -----------------------------------------------------------
        // AuthService calls (public actions — no Bearer needed for login/register/refresh)
        // -----------------------------------------------------------

        login: function (sLoginName, sPassword) {
            var that = this;

            // OData V4: POST /odata/v4/auth/login — exchange credentials for a JWT pair.
            return fetch("/odata/v4/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginName: sLoginName, password: sPassword })
            }).then(function (oResponse) {
                if (!oResponse.ok) {
                    return oResponse.json().catch(function () { return {}; }).then(function (oBody) {
                        throw new Error((oBody.error && oBody.error.message) || "Login failed");
                    });
                }
                return oResponse.json();
            }).then(function (oResult) {
                that.setCookie("th_access", oResult.accessToken, oResult.expiresIn);
                that.setCookie("th_refresh", oResult.refreshToken, 7 * 24 * 60 * 60);
                that.attachAuthHeaderToODataModel();
                return that.fetchMe();
            });
        },

        register: function (oPayload) {
            // OData V4: POST /odata/v4/auth/register — public self-registration, account starts locked.
            return fetch("/odata/v4/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oPayload)
            }).then(function (oResponse) {
                return oResponse.json().catch(function () { return {}; }).then(function (oBody) {
                    if (!oResponse.ok) {
                        throw new Error((oBody.error && oBody.error.message) || "Registration failed");
                    }
                    return oBody;
                });
            });
        },

        refreshToken: function () {
            var that = this;
            var sRefresh = this.getCookie("th_refresh");
            if (!sRefresh) { return Promise.reject(new Error("No refresh token")); }

            // OData V4: POST /odata/v4/auth/refresh — exchange refresh token for a new access token.
            return fetch("/odata/v4/auth/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: sRefresh })
            }).then(function (oResponse) {
                if (!oResponse.ok) { throw new Error("Session expired"); }
                return oResponse.json();
            }).then(function (oResult) {
                that.setCookie("th_access", oResult.accessToken, oResult.expiresIn);
                that.setCookie("th_refresh", oResult.refreshToken, 7 * 24 * 60 * 60);
                that.attachAuthHeaderToODataModel();
                return oResult;
            });
        },

        fetchMe: function () {
            var that = this;
            // OData V4: GET /odata/v4/auth/me — fetch current user info after login/refresh.
            return this._ajax("/odata/v4/auth/me", "GET").then(function (oUser) {
                var sRole = oUser.roles.indexOf("ADMIN") !== -1 ? "ADMIN" : "TRAVELLER";
                var oUserData = {
                    id: oUser.id,
                    loginName: oUser.loginName,
                    firstName: oUser.firstName,
                    lastName: oUser.lastName,
                    roles: oUser.roles,
                    role: sRole
                };
                that.getUserModel().setData(oUserData);
                that.setCookie("th_user", JSON.stringify(oUserData), 0);
                return oUserData;
            });
        },

        // -----------------------------------------------------------
        // Logout / role guard / errors
        // -----------------------------------------------------------

        onLogout: function () {
            this.deleteCookie("th_access");
            this.deleteCookie("th_refresh");
            this.deleteCookie("th_user");
            this.getUserModel().setData({});
            this.getRouter().navTo("login");
        },

        _guardRole: function (sRequired) {
            if (this.getUserModel().getProperty("/role") !== sRequired) {
                this.getRouter().navTo("login");
            }
        },

        showError: function (sMsg) {
            MessageBox.error(sMsg || "Something went wrong");
        }

    });
});
