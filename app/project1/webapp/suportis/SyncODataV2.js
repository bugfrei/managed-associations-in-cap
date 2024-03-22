// Version 1.4 240301
//      1.2 read Methode mit 2. Parameter: parameter
//                             Map of Parameters
//                              var p = {
//                                  "$select", "firstName,lastName"    
//                              }
//                  var daten = mng.read("/Daten", p);
//      1.3 create anstelle von createManager() funktioniert, gibt aber Hinweise im Log aus
//          createManager() mit Promise gibt Hinweis als error aus
//      1.4 Batchverbeitung hinzugefügt

const FILTER_OPERATORS = {
    AND: 1,
    OR: 2
};
// zur automatischen Erstellung einer GroupId für Batch
var groupIdNumber = 0;

sap.ui.define( [
],
    /**
     * provide app-view type models (as in the first "V" in MVVC)
     * 
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     * @param {typeof sap.ui.Device} Device
     * 
     * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
     */
    function() {
        "use strict";

        return {
            /** Erstellt einen SyncODataV2Manager mit dem mehrere Requests möglich sind ohne jedesmal das Model angeben zu müssen.
             * 
             * @param {typeof sap.ui.model.odata.v2.ODataModel}} model Das zu verwendente OData Model. Ermitteln z.B. mit this.getView().getModel()
             * @returns SyncODataV2Manager mit dem leicht CRUD Zugriffe möglich sind.
             */
            createManager: function( model ) {
                if ( model instanceof Promise ) {
                    console.error( "Model ist Promise!" );
                }
                return new SyncODataV2Manager( model );
            },
            createBatch: function( model, groupId ) {
                if (model instanceof Promise ) {
                    console.error( "Model ist Promise!" );
                }
                return new SyncODataV2Batch( model, groupId );
            },
            /** Erstellt ein Datensatz
             * 
             * @param {typeof sap.ui.model.odata.v2.ODataModel}} model Das zu verwendente OData Model. Ermitteln z.B. mit this.getView().getModel()
             * @param {string} path Pfad der die Entität für das neue Element definiert. z.B. "/Abteilungen"
             * @param {object} odata Auflistung der Properties. z.B. { id: 10, name: "John Doe", max: 50 } 
             * @returns Result Objekt mit den Daten des Requests 
             */
            create: function( model, path, odata ) {
                if ( path == undefined && odata == undefined ) {
                    console.log( "Create Methode ohne path/odata Parameter aufgerufen. Sollte es ein createManager()-Aufruf sein? (Manager wurde erstellt)" );
                    return this.createManager( model );
                }
                else {
                    return ( new SyncODataV2Manager( model ) ).create( path, odata );
                }
            },
            /** Liest eine Entität, ein Datensatz oder eine Properties eines Datensatzes
             * 
             * @param {typeof sap.ui.model.odata.v2.ODataModel}} model Das zu verwendente OData Model. Ermitteln z.B. mit this.getView().getModel()
             * @param {string} path Pfad der die Entität für das neue Element definiert. z.B. "/Abteilungen"
             * @returns Result Objekt mit den Daten des Requests
             */
            read: function( model, path, parameters ) {
                return ( new SyncODataV2Manager( model ) ).read( path, parameters );
            },
            /** Ändert Properties eines Datensatzes 
             * 
             * @param {typeof sap.ui.model.odata.v2.ODataModel}} model Das zu verwendente OData Model. Ermitteln z.B. mit this.getView().getModel()
             * @param {string} path Pfad der die Entität für das zu ändernde Element definiert. z.B. "/Abteilungen(1)"
             * @param {object} odata Auflistung der Properties die geändert werden sollen. z.B. { max: 40 } 
             * @returns Result Objekt mit den Daten des Requests 
             */
            update: function( model, path, odata ) {
                return ( new SyncODataV2Manager( model ) ).update( path, odata );
            },
            /** Löscht einen Datensatz
             * 
             * @param {typeof sap.ui.model.odata.v2.ODataModel}} model Das zu verwendente OData Model. Ermitteln z.B. mit this.getView().getModel()
             * @param {string} path Pfad der die Entität für das zu löschende Element definiert. z.B. "/Abteilungen(1)"
             * @returns Result Objekt mit den Daten des Requests 
             */
            delete: function( model, path ) {
                return ( new SyncODataV2Manager( model ) ).delete( path );
            },
            /** Löscht einen Datensatz
             * 
             * @param {typeof sap.ui.model.odata.v2.ODataModel}} model Das zu verwendente OData Model. Ermitteln z.B. mit this.getView().getModel()
             * @param {string} path Pfad der die Entität für das zu löschende Element definiert. z.B. "/Abteilungen(1)"
             * @returns Result Objekt mit den Daten des Requests 
             */
            remove: function( model, path ) {
                return ( new SyncODataV2Manager( model ) ).remove( path );
            }
        };
    } );

class SyncODataV2Batch {
    constructor( model, groupId ) {
        if ( !model ) {
            throw new Error( "Cant create a SyncODataV2 Batch without a model" );
        }
        this._model = model;
        if (groupId) {
            this._groupId = groupId;
        }
        else {
            groupIdNumber++;
            this._groupId = `batch${groupIdNumber}`;
        }

        this._oEntries = [];
    }
    get model() { return this._model; }
    get groupId() { return this._groupId; }
    get useBatch() { return this._model.bUseBatch; }
    setUseBatch(value) { this._model.setUseBatch( value ?? true ); }
    unsetUseBatch() { this._model.setUseBatch( false ); }

    getResults() {
        return this._oEntries.map( (e) => e.getObject() );
    }

    /** Erstellt ein Datensatz
     * 
     * @param {string} path Pfad der die Entität für das neue Element definiert. z.B. "/Abteilungen"
     * @param {object} odata Auflistung der Properties. z.B. { id: 10, name: "John Doe", max: 50 } - Auch als Array möglich
     * @returns Result Objekt mit den Daten des Requests 
     */
    create( path, odata ) {
        if (!!odata && (odata.constructor === Array)) {
            // Es ist ein Array, einzeln durchlaufen mittels recursivem Aufruf
            for(var item of odata) {
                this.create(path, item);
            }
            return;
        }

        var oEntry = this._model.createEntry(path, {
            "groupId": this._groupId,
            "properties": odata
        });
        this._oEntries.push(oEntry);
    }
    /** Führt den Batch Request aus
     * 
     * @param {string} path Pfad der die Entität für das neue Element definiert. z.B. "/Abteilungen"
     * @param {object} odata Auflistung der Properties. z.B. { id: 10, name: "John Doe", max: 50 } 
     * @returns Result Objekt mit den Daten des Requests 
     */
    async submitChanges( ) {
        function executeSubmitChanges( model, groupId ) {
            return new Promise( function( resolve, reject ) {
                var state = STATUS.Error;

                model.attachBatchRequestCompleted( function( oEvent ) {
                    var data = Object.keys(oEvent.oSource.oData).map( e => { var o = oEvent.oSource.oData[e]; o.__name = e; return o }  )

                    resolve( new Result( state, data, oEvent ) );
                });
                model.submitChanges( { "groupId": groupId,
                    success: function(  ) {
                        state = STATUS.Success;
                    },
                    error: function( error ) {
                        state = STATUS.Error;
                        resolve( new Result( STATUS.Error, error ) );
                    }
                } );
            } );
        }
        return executeSubmitChanges( this._model, this._groupId );
    }

    hasPendingChanges() {
        return this._model.hasPendingChanges();
    }
    getPendingChanges() {
        return this._model.getPendingChanges();
    }
}

class SyncODataV2Manager {
    constructor( model ) {
        if ( !model ) {
            throw new Error( "Cant create a SyncODataV2 Manager without a model" );
        }
        this._model = model;
        this._filters = [];
        this._sorters = [];
        this._activeFilterList = null;
        this._batches = [];
    }

    get model() { return this._model; }
    get filters() { return this._filters; }
    get sorters() { return this._sorters; }

    updateBindings() {
        this._model.updateBindings();
    }
    refresh() {
        this._model.refresh();
    }

    batch(groupId) {
        if (groupId) {
            const existingBatch = this._batches.find(batch => batch.groupId === groupId);
            if (existingBatch) {
                return existingBatch;
            }
        }
        var newBatch = new SyncODataV2Batch( this._model, groupId );
        this._batches.push(newBatch);
        return newBatch;
    }

    clearSorters() {
        this._sorters = [];
    }
    addSorter( fieldName, descending, group, comparator ) {
        var sorter = new sap.ui.model.Sorter( fieldName, descending, group, comparator );
        this.sorters.push( sorter );
    }

    clearFilters() {
        this._filters = [];
        this._activeFilterList = null;
    }
    addFilter( filter ) {
        if ( this._activeFilterList == null ) {
            this.addFilterList( FILTER_OPERATORS.AND );
        }
        this._activeFilterList.aFilters.push( filter );
    }
    addFilterList( filterOperator ) {
        var filterList = new sap.ui.model.Filter( {
            filters: [],
            and: ( FILTER_OPERATORS.AND === filterOperator )
        } );
        this._filters.push( filterList );
        this._activeFilterList = filterList;
        return filterList;
    }

    addFilter_Between( fieldName, start, end ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.BT, start, end );
        this.addFilter( filter );
        return filter;
    }
    addFilter_BT( fieldName, start, end ) {
        return this.addFilter_Between( fieldName, start, end );
    }
    addFilter_NotBetween( fieldName, start, end ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.NB, start, end );
        this.addFilter( filter );
        return filter;
    }
    addFilter_NB( fieldName, start, end ) {
        return this.addFilter_NotBetween( fieldName, start, end );
    }
    addFilter_Contains( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.Contains, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_NotContains( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.NotContains, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_EndsWith( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.EndsWith, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_NotEndsWith( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.NotEndsWith, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_StartsWith( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.StartsWith, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_NotStartsWith( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.NotStartsWith, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_Equals( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.EQ, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_EQ( fieldName, value ) {
        return this.addFilter_Equals( fieldName, value );
    }
    addFilter_NotEquals( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.NE, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_NE( fieldName, value ) {
        return this.addFilter_NotEquals( fieldName, value );
    }
    addFilter_GreaterEquals( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.GE, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_GE( fieldName, value ) {
        return this.addFilter_GreaterEquals( fieldName, value );
    }
    addFilter_GreaterThan( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.GT, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_GT( fieldName, value ) {
        return this.addFilter_GreaterThan( fieldName, value );
    }
    addFilter_LowerEquals( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.LE, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_LE( fieldName, value ) {
        return this.addFilter_LowerEquals( fieldName, value );
    }
    addFilter_LowerThan( fieldName, value ) {
        var filter = new sap.ui.model.Filter( fieldName, sap.ui.model.FilterOperator.LT, value );
        this.addFilter( filter );
        return filter;
    }
    addFilter_LT( fieldName, value ) {
        return this.addFilter_LowerThan( fieldName, value );
    }



    makeFilter( fieldName, operator, value1, value2 ) {
        var filter = new sap.ui.model.Filter( fieldName, operator, value1, value2 );
        return filter;
    }


    /** Erstellt ein Datensatz
     * 
     * @param {string} path Pfad der die Entität für das neue Element definiert. z.B. "/Abteilungen"
     * @param {object} odata Auflistung der Properties. z.B. { id: 10, name: "John Doe", max: 50 } 
     * @returns Result Objekt mit den Daten des Requests 
     */
    async create( path, odata ) {
        if (!!odata && (odata.constructor === Array)) {
            // Array, d.h. Batch verwenden
            const batch = this.batch();
            batch.create(path, odata);
            return batch.submitChanges();;
        }
        function executeCreate( model ) {
            return new Promise( function( resolve, reject ) {
                model.create( path, odata, {
                    success: function( data ) {
                        resolve( new Result( STATUS.Success, data ) );
                    },
                    error: function( error ) {
                        resolve( new Result( STATUS.Error, error ) );
                    }
                } );
            } );
        }
        return executeCreate( this._model );
    }
    /** Liest eine Entität, ein Datensatz oder eine Properties eines Datensatzes
     * 
     * @param {string} path Pfad der die Entität für das neue Element definiert. z.B. "/Abteilungen"
     * @returns Result Objekt mit den Daten des Requests
     */
    async read( path, parameters ) {
        var that = this;
        if ( parameters == undefined ) {
            parameters = {};
        }
        function executeRead( model ) {
            return new Promise( function( resolve, reject ) {
                let options = {
                    urlParameters: parameters,
                    filters: that._filters,
                    sorters: that._sorters,
                    success: function( data ) {
                        resolve( new Result( STATUS.Success, data ) );
                    },
                    error: function( error ) {
                        resolve( new Result( STATUS.Error, error ) );
                    }
                };
                model.read( path, options );
            } );
        }
        // Without Filters
        function executeReadWOF( model ) {
            return new Promise( function( resolve, reject ) {
                let options = {
                    urlParameters: parameters,
                    sorters: that._sorters,
                    success: function( data ) {
                        resolve( new Result( STATUS.Success, data ) );
                    },
                    error: function( error ) {
                        resolve( new Result( STATUS.Error, error ) );
                    }
                };
                model.read( path, options );
            } );
        }
        if ( this._filters.length > 0 ) {
            return executeRead( this._model );
        }
        else {
            return executeReadWOF( this._model );
        }
    }
    /** Ändert Properties eines Datensatzes 
     * 
     * @param {string} path Pfad der die Entität für das zu ändernde Element definiert. z.B. "/Abteilungen(1)"
     * @param {object} odata Auflistung der Properties die geändert werden sollen. z.B. { max: 40 } 
     * @returns Result Objekt mit den Daten des Requests 
     */
    async update( path, odata ) {
        function executeUpdate( model ) {
            return new Promise( function( resolve, reject ) {
                model.update( path, odata, {
                    success: function( data ) {
                        resolve( new Result( STATUS.Success, data ) );
                    },
                    error: function( error ) {
                        resolve( new Result( STATUS.Error, error ) );
                    }
                } );
            } );
        }
        return executeUpdate( this._model );
    }
    /** Löscht einen Datensatz
     * 
     * @param {string} path Pfad der die Entität für das zu löschende Element definiert. z.B. "/Abteilungen(1)"
     * @returns Result Objekt mit den Daten des Requests 
     */
    async remove( path ) {
        function executeDelete( model ) {
            return new Promise( function( resolve, reject ) {
                model.remove( path, {
                    success: function( data ) {
                        resolve( new Result( STATUS.Success, data ) );
                    },
                    error: function( error ) {
                        resolve( new Result( STATUS.Error, error ) );
                    }
                } );
            } );
        }
        return executeDelete( this._model );
    }
    /** Löscht einen Datensatz
     * 
     * @param {string} path Pfad der die Entität für das zu löschende Element definiert. z.B. "/Abteilungen(1)"
     * @returns Result Objekt mit den Daten des Requests 
     */
    async delete( path ) {
        this.remove( path );
    }
}
const STATUS = {
    Success: true,
    Error: false
};

class Result {
    constructor( status, data, batchCompletedData ) {
        this._status = status;
        this._data = data;
        this._batchCompletedData = batchCompletedData;
        if ( data ) {
            Object.keys( data ).forEach( k => {
                if ( k != "status" && k != "data" ) {
                    this[ k ] = data[ k ];
                }
            } );
        }
    }

    valueOf() {
        const values = Object.values( this._data );
        const keys = Object.keys( this._data );
        if ( values.length == 1 ) {
            return values[ 0 ];
        }
        for ( var k of keys ) {
            if ( k.toLowerCase() == "id" || k.toLocaleLowerCase() == "uuid" ) {
                return this._data[ k ];
                break;
            }
        }
        return this._data;
    }

    toString() {
        if ( Object.values( this._data ).length == 1 ) {
            return Object.values( this._data )[ 0 ].toString();
        }
        return JSON.stringify( this._data, 0, 2 );
    }

    get odata() { return this.toOData(); }
    get batchCompletedData() { return this._batchCompletedData; }


    /** Wandelt die Daten in ein OData Format um.
     * 
     * @param {string} exclude String oder Array zum ausschließen von Properties z.B. "id" oder ["id", "uuid"]
     * @param {string} include String oder Array zum einschließen von Properties z.B. "id" oder ["id", "uuid"]
     * @param {boolean} withMetadata Bei true werden auch die Metadaten übernommen.
     * @returns Daten im OData-Format (nutzbar für create() oder update() Methoden)
     */
    toOData( exclude, include, withMetadata ) {
        var odata = {};
        if ( !exclude ) {
            exclude = [];
        }
        if ( typeof ( exclude ) == "string" ) {
            exclude = [ exclude ];
        }
        if ( !include ) {
            include = [];
        }
        if ( typeof ( include ) == "string" ) {
            include = [ include ];
        }
        if ( withMetadata ) {
            include.push( "__metadata" );
        }
        Object.keys( this._data ).forEach( k => {
            if ( ( k != "__metadata" && !exclude.some( a => a == k ) ) || include.some( a => a == k ) ) {
                odata[ k ] = this._data[ k ];
            }
        } );
        return odata;
    }


    get status() { return this._status; }
    get data() { return this._data; }
}
