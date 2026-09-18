sap.ui.define([
    "travelhub/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";

    return BaseController.extend("travelhub.controller.TravellerDashboard", {

        onInit: function () {
            this.attachAuthHeaderToODataModel();
            this._guardRole("TRAVELLER");

            this.getView().setModel(new JSONModel({ busy: false, profile: {} }), "traveller");
            this.getView().setModel(new JSONModel({ chartTitle: "My Trips by Destination", chartData: [] }), "view");

            this.getRouter().getRoute("travellerDashboard").attachPatternMatched(this._loadProfile, this);
        },

        _loadProfile: function () {
            var oTravellerModel = this.getView().getModel("traveller");
            oTravellerModel.setProperty("/busy", true);

            // OData V4: GET /catalog/Travellers — row-filtered server-side to the caller's own record.
            this._ajax("/odata/v4/catalog/Travellers?$expand=addressType,locations($expand=destination)", "GET")
                .then(function (oResult) {
                    var oMe = oResult.value[0];
                    if (!oMe) { throw new Error("No traveller profile found for this account"); }

                    oTravellerModel.setProperty("/profile", {
                        fullName: (oMe.firstName || "") + " " + (oMe.lastName || ""),
                        addressLabel: (oMe.addressType ? oMe.addressType.name : "—") + " • " + (oMe.phone || "—")
                    });
                    oTravellerModel.setProperty("/busy", false);

                    this.getView().getModel("view").setProperty("/chartData", this._aggregateByDestination(oMe.locations || []));

                    // Bind the page element to the traveller's own row so the Addresses tab's
                    // Input/Select and the Locations tab's list binding resolve relatively,
                    // and edits queue into the "travellerChanges" batch group.
                    this.getView().bindElement({
                        path: "/Travellers('" + oMe.ID + "')",
                        parameters: { $$updateGroupId: "travellerChanges" }
                    });
                }.bind(this)).catch(function (oErr) {
                    oTravellerModel.setProperty("/busy", false);
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

        onAddLocation: function () {
            var sDestId = this.byId("selNewDestination").getSelectedKey();
            var oFrom = this.byId("dpNewFrom").getDateValue();
            var oTo = this.byId("dpNewTo").getDateValue();
            var sNotes = this.byId("inpNewNotes").getValue();

            if (!sDestId || !oFrom || !oTo) {
                this.showError("Destination, travel from and travel to are required");
                return;
            }

            // OData V4: POST /catalog/Travellers('<id>')/locations — new row queued in "travellerChanges".
            var oListBinding = this.byId("tblLocations").getBinding("items");
            oListBinding.create({
                destination_ID: sDestId,
                travelFrom: oFrom.toISOString().slice(0, 10),
                travelTo: oTo.toISOString().slice(0, 10),
                notes: sNotes
            });

            this.byId("dpNewFrom").setDateValue(null);
            this.byId("dpNewTo").setDateValue(null);
            this.byId("inpNewNotes").setValue("");
        },

        onDeleteLocation: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (!oContext) { return; }

            // OData V4: DELETE /catalog/TravelledLocations(<key>) — remove the selected trip immediately.
            oContext.delete().then(function () {
                MessageToast.show("Deleted");
            }).catch(function (oErr) {
                this.showError(oErr.message);
            }.bind(this));
        },

        onSave: function () {
            var oTravellerModel = this.getView().getModel("traveller");
            oTravellerModel.setProperty("/busy", true);

            // OData V4: $batch — flushes the queued Addresses PATCH and any new/deleted locations.
            this.getODataModel().submitBatch("travellerChanges").then(function () {
                oTravellerModel.setProperty("/busy", false);
                MessageToast.show("Saved");
                this._loadProfile();
            }.bind(this)).catch(function (oErr) {
                oTravellerModel.setProperty("/busy", false);
                this.showError(oErr.message);
            }.bind(this));
        }

    });
});
