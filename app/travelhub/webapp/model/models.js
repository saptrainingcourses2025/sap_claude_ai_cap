sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
    "use strict";

    return {
        // Global user session model: { loginName, id, firstName, lastName, roles, role }.
        // Empty object means "not logged in" — Header.fragment.xml's logout button
        // visibility and BaseController._guardRole both key off /loginName.
        createUserModel: function () {
            return new JSONModel({});
        }
    };
});
