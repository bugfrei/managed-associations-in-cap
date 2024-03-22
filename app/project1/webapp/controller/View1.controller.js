sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "project1/suportis/SyncODataV2"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, SyncODataV2) {
        "use strict";

        return Controller.extend("project1.controller.View1", {
            onInit: function () {

            },
            onBtnTestPress: async function() {
                var mng = SyncODataV2.createManager(this.getView().getModel());
                var r = await mng.read("/Books", {
                    "$expand": "authors($expand=author)"
                });
                debugger;
            }
        });
    });
