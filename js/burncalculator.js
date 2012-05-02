(function() {
  var ChartTime, burnCalculator, lumenize, root, timeSeriesCalculator, utils;
  var __hasProp = Object.prototype.hasOwnProperty, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

  root = this;

  if (typeof exports !== "undefined" && exports !== null) {
    lumenize = require('../lib/lumenize');
  } else {
    lumenize = require('/lumenize');
  }

  ChartTime = lumenize.ChartTime, timeSeriesCalculator = lumenize.timeSeriesCalculator;

  utils = lumenize.utils;

  burnCalculator = function(results, config) {
	//loop through and check for missing lookback data  
	for(var i = 0; i < results.length; i++){
		if(!results[i].hasOwnProperty('PlanEstimate')) {
		    results[i]['PlanEstimate'] = 0;
	    }
		if(!results[i].hasOwnProperty('ScheduleState')) {
		    results[i]['ScheduleState'] = 0;
	    }
	}

    /*
      Takes the "results" from a query to Rally's Analytics API (or similar MVCC-based implementation)
      and returns the series for burn charts.
    */
    var aggregationAtArray, aggregations, categories, ct, derivedFields, f, field, granularity, i, idealData, idealStep, listOfAtCTs, maxTaskEstimateTotal, name, originalPointCount, pastEnd, rangeSpec, s, series, seriesFound, seriesNames, start, end, timeSeriesCalculatorConfig, type, yAxis, _i, _len, _ref, _ref2, _ref3;
    var todayIndex = -1;
    rIndex = [];
    if (config.granularity != null) {
      granularity = config.granularity;
    } else {
      granularity = 'day';
    }
    var todayCT = new ChartTime(config.today, granularity, config.workspaceConfiguration.TimeZone);
    var rDates = [];
    for(var i = 0; i<config.rDates.length; i++){
    	rDates[i] = new ChartTime(config.rDates[i], granularity, config.workspaceConfiguration.TimeZone);
    }	
    start = config.start;
    start = new ChartTime(start, granularity, config.workspaceConfiguration.TimeZone);
    end = config.end;
    pastEnd = new ChartTime(end, granularity, config.workspaceConfiguration.TimeZone);
    rangeSpec = {
      workDays: config.workspaceConfiguration.WorkDays,
      holidays: config.holidays,
      start: start,
      pastEnd: pastEnd
    };
    if (config.upSeriesType == null) config.upSeriesType = 'Sums';
    derivedFields = [];
    if (config.upSeriesType === 'Points') {
      derivedFields.push({
        name: 'Accepted',
        f: function(row) {
          var _ref;
          if (_ref = row.ScheduleState, __indexOf.call(config.acceptedStates, _ref) >= 0) {
            return row.PlanEstimate;
          } else {
            return 0;
          }
        }
      });
    } else if (config.upSeriesType === 'Story Count') {
      derivedFields.push({
        name: 'Accepted',
        f: function(row) {
          var _ref;
          if (_ref = row.ScheduleState, __indexOf.call(config.acceptedStates, _ref) >= 0) {
            return 1;
          } else {
            return 0;
          }
        }
      });
    } else {
      console.error("Unrecognized upSeriesType: " + config.upSeriesType);
    }
    seriesNames = [];
    aggregations = [];
    _ref = config.series;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      s = _ref[_i];
      seriesFound = true;
      switch (s) {
        case 'down':
          name = 'Task To Do (Hours)';
          f = '$sum';
          field = 'TaskRemainingTotal';
          yAxis = 0;
          type = 'column';
          break;
        case 'ideal':
          name = "Ideal (Hours)";
          f = '$sum';
          field = 'TaskEstimateTotal';
          yAxis = 0;
          type = 'line';
          break;
        case 'up':
          name = "Accepted (" + config.upSeriesType + ")";
          f = '$sum';
          field = 'Accepted';
          yAxis = 0;
          type = 'area';
          break;
        case 'scope':
          name = "Scope (" + config.upSeriesType + ")";
          if (config.upSeriesType === 'Story Count') {
            f = '$count';
          } else if (config.upSeriesType === 'Points') {
            f = '$sum';
          }
          field = 'PlanEstimate';
          yAxis = 0;
          type = 'line';
          break;
        case 'projection':
            name = "Ideal (Points)";
            f = '$sum';
            field = 'Ideal';
            yAxis = 0;
            type = 'line';
            break;
        case 'rDates':
            name = "Release";
            f = '$sum';
            field = 'Release';
            yAxis = 0;
            type = 'area';
            break;
        default:
          if ((s.name != null) && (s.f != null) && (s.field != null)) {
            name = s.name;
            f = s.f;
            field = s.field;
            type = 'column';
          } else {
            seriesFound = false;
            console.error("Unrecognizable series: " + s);
          }
      }
      if (seriesFound) {
        aggregations.push({
          name: name,
          as: name,
          f: f,
          field: field,
          yAxis: yAxis,
          type: type
        });
        seriesNames.push(name);
      }
    }
    timeSeriesCalculatorConfig = {
      rangeSpec: rangeSpec,
      derivedFields: derivedFields,
      aggregations: aggregations,
      timezone: config.workspaceConfiguration.TimeZone,
      snapshotValidFromField: '_ValidFrom',
      snapshotValidToField: '_ValidTo',
      snapshotUniqueID: 'ObjectID'
    };
    _ref2 = lumenize.timeSeriesCalculator(results, timeSeriesCalculatorConfig), listOfAtCTs = _ref2.listOfAtCTs, aggregationAtArray = _ref2.aggregationAtArray;
    series = lumenize.aggregationAtArray_To_HighChartsSeries(aggregationAtArray, aggregations);
    categories = (function() {
      var _j, _len2, _results;
      _results = [];
      for (_j = 0, _len2 = listOfAtCTs.length; _j < _len2; _j++) {
        ct = listOfAtCTs[_j];
        _results.push("" + (ct.toString()));
        if(ct.toString() === todayCT.toString()) {
        	todayIndex = _j;
        }
        for(var k = 0; k<rDates.length; k++){
        	if(ct.toString() === rDates[k].toString()){
        		rIndex.push(_j);
        	}
        }
      }
      return _results;
    })();
    originalPointCount = categories.length;
    if (__indexOf.call(config.series, "Ideal") >= 0) {
      i = 0;
      while (series[i].name.indexOf("Ideal") < 0) {
        i++;
      }
      idealData = series[i].data;
      maxTaskEstimateTotal = lumenize.functions.$max(idealData);
      idealStep = maxTaskEstimateTotal / (originalPointCount - 1);
      for (i = 0, _ref3 = originalPointCount - 2; 0 <= _ref3 ? i <= _ref3 : i >= _ref3; 0 <= _ref3 ? i++ : i--) {
        idealData[i] = (originalPointCount - 1 - i) * idealStep;
      }
      idealData[originalPointCount - 1] = 0;
    }
    if ((__indexOf.call(config.series, "projection") >= 0) && (todayIndex >= 0)) {
        i = 0;
        while (series[i].name.indexOf("Ideal (Points)") < 0) {
          i++;
        }
        var j = 0;
        while (series[j].name.indexOf("Accepted") < 0) {
            j++;
        }
        var upData = series[j].data;
        idealData = series[i].data;
        
        //calculate ideal burn up line based on previous X number of days
        var delta = (upData[todayIndex] - upData[todayIndex-21])/21;
        idealData[todayIndex-21] = upData[todayIndex-21];
        for (i = 0; i<idealData.length; i++) {
        	if(i < todayIndex - 21) {
        		idealData[i] = null;
        	} else if (i > todayIndex - 21){
                idealData[i] = idealData[i-1] + delta;
        	}
        }
        for (i = todayIndex+1; i<upData.length; i++) {
            upData[i] = null;
        }
      }
    if ((__indexOf.call(config.series, "rDates") >= 0) && (todayIndex >= 0)) {
        i = 0;
        while (series[i].name.indexOf("Release") < 0) {
          i++;
        }
        var j = 0;
        while (series[j].name.indexOf("Scope") < 0) {
            j++;
        }
        var sData = series[j].data;
        var rData = series[i].data;
        
        var sMax = lumenize.functions.$max(sData);
        sMax = sMax + 250;
        
        for(i=0; i<rData.length; i++){
        	for(j=0; j<rIndex.length; j++){
        		if((i === (rIndex[j]-1))||(i === rIndex[j])){
        			rData[i] = sMax;
        			break;
        		} else {
        			rData[i] = null;
        		}
        	}
        }
      }
    return {
      categories: categories,
      series: series
    };
  };

  root.burnCalculator = burnCalculator;

}).call(this);
