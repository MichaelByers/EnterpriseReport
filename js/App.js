Ext.define('BurnChartApp', {
    extend:'Rally.app.App',
    mixins: {
        messageable: 'Rally.Messageable'
    },
    appName:'Burn Chart',
    cls:'burnchart',
    
    launch: function () {

    	this.sDate = new Date();
		this.sDate.setYear(2100);
		this.eDate = new Date(0);
		this.rDates = [];
		
    	this.add({
    		xtype: 'rallycombobox',
    		fieldLabel: 'Select an Enterprise Release',
    		width: '400px',
	        storeConfig: {
	            autoLoad: true,
	            model: 'Program',
	            fetch: 'Releases,ReleaseStartDate,ReleaseDate'
	        },
	        listeners: {
	            select: this._onSelect,
	            scope: this
	        }
    	});
    },
    
    _onSelect: function(comboBox, records) {
    	
    	 var cmp = this.add({
             id: 'loadCmp',
             xtype: 'component',
             flex: 1
         });
    	 cmp.setLoading('Building your chart...');
    	 
		var oidReleaseArray = new Array();
		
    	//loop through records, get min start date and max end date
		var releases = records[0].get('Releases');
    	for(var i=0; i < releases.length; i++){
    		var myRelease = releases[i];
    		this.rDates.push(new Date(Date.parse(myRelease.ReleaseDate)));
    		if(Date.parse(myRelease.ReleaseStartDate) < this.sDate)
    			this.sDate = new Date(Date.parse(myRelease.ReleaseStartDate));
    		if(Date.parse(myRelease.ReleaseDate) > this.eDate)
    			this.eDate = new Date(Date.parse(myRelease.ReleaseDate));
    	}
    	//temp work around for missing data
    	//this.sDate.setFullYear(2012, 02, 01);
    	filter = [];
    	for(var i = 0; i < releases.length; i++) {
    		var newFilter = new Rally.data.QueryFilter({
				property: 'Name',
				operator: '=',
				value: releases[i]._refObjectName
			});
    		
    		if(i == 0) {
    			filter = newFilter;
    		}
    		else {
    			filter = filter.or(newFilter);
    		}
    	}
    	var context = this.context.getDataContext();
    	context.projectScopeDown = true;
    	var releaseStore = Ext.create('Rally.data.WsapiDataStore', {
    		autoLoad: true,
    	    model: 'Release',
    	    filters: filter,
    	    fetch: 'ObjectID,Project',
    	    context: context,
    	    listeners: {
    	    	load: {
    	    		fn: this._onReleasesLoad,
    	    		scope: this
    	    	}
    	    }
    	});
    },
    
    _onReleasesLoad: function(store, data) {
    	var releases = [];
    	for(var i = 0; i < data.length; i++) {
    		releases.push(data[i].get('ObjectID')); 
    	}
    	
    	//this.startTime = '2012-01-01T00:00:00Z';
        this.chartQuery = {
            find:{
            	_Type: {'$in': ['HierarchicalRequirement','Defect']},
                Children:null,
                Release: {'$in': releases},
                _ValidFrom: {
                    $gte: this.sDate //this.startTime
                }
            }
        };

        this.chartConfigBuilder = Ext.create('Rally.app.analytics.BurnChartBuilder');
        this.chartConfigBuilder.build(this.chartQuery, 'Where\'s my Hasenpfeffer', Ext.bind(this._afterChartConfigBuilt, this), {
        	startDate: this.sDate,
        	endDate: this.eDate,
        	releaseDates: this.rDates
        });
    },

    _afterChartConfigBuilt: function (success, chartConfig) {
        this._removeChartComponent();
        if (success){
            this.add({
                id: 'chartCmp',
                xtype: 'highchart',
                flex: 1,
                chartConfig: chartConfig
            });
        } else {
            var formattedId = this.selectedRowRecord.get('FormattedID');
            this.add({
                id: 'chartCmp',
                xtype: 'component',
                html: '<div>No data found starting from: ' + this.sDate + '</div>'
            });
        }
    },

    _removeChartComponent: function() {
        var chartCmp = this.down('#chartCmp');
        if (chartCmp) {
            this.remove(chartCmp);
        }
        
        var loadCmp = this.down('#loadCmp');
        if (loadCmp) {
        	this.remove(loadCmp);
        }
    },

    _onTreeRowAdd: function(tree, treeRow) {
        treeRow.on('afterrender', this._afterTreeRowRendered, this);
    },

    _afterTreeRowRendered: function(treeRow) {
        treeRow.getEl().on('click', this._onTreeRowClick, this, {stopEvent: true});
    },

    _onTreeRowClick: function(event, treeRowTextEl) {
        var treeItem = Ext.getCmp(Ext.get(treeRowTextEl).findParentNode('.treeItem').id);
        var treeRowRecord = treeItem.getRecord();
        var itemId = treeRowRecord.get('ObjectID');
        var title = treeRowRecord.get('FormattedID') + ' - ' + treeRowRecord.get('Name');
        this._refreshChart(treeRowRecord, itemId, title);
    },

    _refreshChart: function(treeRowRecord, itemId, title) {
        this.selectedRowRecord = treeRowRecord;
        this.chartQuery.find._ItemHierarchy = itemId;
        this.down('#chartCmp').getEl().mask('Loading...');
        this.chartConfigBuilder.build(this.chartQuery, title, Ext.bind(this._afterChartConfigBuilt, this));
    }
});
