sap.ui.define([
    "travelhub/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    // Travellers has no `role` field and Destinations/TravelledLocations have
    // no `amount` field (see fiori_dev_spec.md gaps agreed with the user):
    // Role column is dropped, the "spend" tile/chart become a trip-count
    // tile/donut, and lock state is read from UserManagement.Users.isLocked
    // (Travellers itself carries no lock flag) and merged in here.
    var STATUS_LABELS = { A: "Active", I: "Inactive", S: "Suspended", P: "Pending" };

    return BaseController.extend("travelhub.controller.AdminDashboard", {

        onInit: function () {
            this.attachAuthHeaderToODataModel();
            this._guardRole("ADMIN");

            this.getView().setModel(new JSONModel({ busy: false, tiles: {}, travellers: [] }), "admin");
            this.getView().setModel(new JSONModel({ chartTitle: "Trips by Destination (all travellers)", chartData: [] }), "view");

            this.getRouter().getRoute("adminDashboard").attachPatternMatched(this._loadData, this);
        },

        _loadData: function () {
            var oAdminModel = this.getView().getModel("admin");
            oAdminModel.setProperty("/busy", true);

            Promise.all([
                // OData V4: GET /catalog/Travellers — admin sees every row.
                this._ajax("/odata/v4/catalog/Travellers?$select=ID,firstName,lastName,email,status_code,userID", "GET"),
                // OData V4: GET /user-management/Users — used only to read isLocked (not exposed on Travellers).
                this._ajax("/odata/v4/user-management/Users?$select=ID,isLocked", "GET"),
                // OData V4: GET /catalog/TravelledLocations — admin sees every row, expanded for the trips-per-destination donut.
                this._ajax("/odata/v4/catalog/TravelledLocations?$expand=destination($select=name)", "GET")
            ]).then(function (aResults) {
                var aTravellers = aResults[0].value;
                var aUsers = aResults[1].value;
                var aLocations = aResults[2].value;

                var oLockByUserId = {};
                aUsers.forEach(function (oUser) { oLockByUserId[oUser.ID] = oUser.isLocked; });

                var aRows = aTravellers.map(function (oT) {
                    var bLocked = !!oLockByUserId[oT.userID];
                    return {
                        ID: oT.ID,
                        userID: oT.userID,
                        fullName: (oT.firstName || "") + " " + (oT.lastName || ""),
                        email: oT.email,
                        statusLabel: STATUS_LABELS[oT.status_code] || oT.status_code,
                        accountLocked: bLocked,
                        accountLabel: bLocked ? "Locked" : "Active"
                    };
                });

                oAdminModel.setProperty("/travellers", aRows);
                oAdminModel.setProperty("/tiles", {
                    total: aRows.length,
                    active: aRows.filter(function (r) { return !r.accountLocked; }).length,
                    locked: aRows.filter(function (r) { return r.accountLocked; }).length,
                    trips: aLocations.length
                });
                oAdminModel.setProperty("/busy", false);

                this.getView().getModel("view").setProperty("/chartData", this._aggregateByDestination(aLocations));
            }.bind(this)).catch(function (oErr) {
                oAdminModel.setProperty("/busy", false);
                this.showError(oErr.message);
            }.bind(this));
        },

        _aggregateByDestination: function (aLocations) {
            var oCounts = aLocations.reduce(function (oAcc, oLoc) {
                var sName = (oLoc.destination && oLoc.destination.name) || "Unknown";
                oAcc[sName] = (oAcc[sName] || 0) + 1;
                return oAcc;
            }, {});
            return Object.keys(oCounts).map(function (sName) {
                return { name: sName, value: oCounts[sName] };
            });
        },

        onToggleLock: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("admin");
            var oRow = oContext.getObject();
            var bUnlock = oEvent.getParameter("state");
            var sFn = bUnlock ? "unlockUser" : "lockUser";

            // OData V4: GET /user-management/{lockUser|unlockUser}(userId=...) — admin lock/unlock toggle.
            this._ajax("/odata/v4/user-management/" + sFn + "(userId='" + oRow.userID + "')", "GET")
                .then(function () {
                    this.getView().getModel("admin").setProperty(oContext.getPath() + "/accountLocked", !bUnlock);
                    this.getView().getModel("admin").setProperty(oContext.getPath() + "/accountLabel", bUnlock ? "Active" : "Locked");
                    this._recomputeLockTiles();
                }.bind(this)).catch(function (oErr) {
                    this.showError(oErr.message);
                }.bind(this));
        },

        _recomputeLockTiles: function () {
            var aRows = this.getView().getModel("admin").getProperty("/travellers");
            this.getView().getModel("admin").setProperty("/tiles/active", aRows.filter(function (r) { return !r.accountLocked; }).length);
            this.getView().getModel("admin").setProperty("/tiles/locked", aRows.filter(function (r) { return r.accountLocked; }).length);
        }

    });
});
