#!/usr/bin/env node

if (require.main === module) {
  var express = require('express');
  var app = express();


  var smeter = require('./lib/smeterengine').SmeterEngine();

  var renderResult = function(req, res, err, json){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    if (err) {
      console.log(err);
      return res.end(err);
    }
    // res.setHeader('Content-Type', 'text/xml; charset=UTF-8');
    var out = '';
    if (req.query.callback) {
      callback = req.query.callback.replace(/\W/g, '');
      out = callback + '(';
    }
    out += JSON.stringify(json);
    if (req.query.callback) {
      out += ');';
    }
    res.end(out);
  };

  var getSmeterValues = function(req, res){
    smeter.get({
        begin: req.query.begin || new Date().toISOString().split('T')[0] + ' 00:00:00',
        end: req.query.end  || new Date().toISOString().split('T')[0] + ' 23:59:59',
        district: req.query.district
      }, function(err, json, xml){
        renderResult(req, res, err, json);
      });
  };

  var getLatestValues = function(req, res){
    smeter.get({
        begin: req.query.begin || new Date().toISOString().split('T')[0] + ' 00:00:00',
        end: req.query.end  || new Date().toISOString().split('T')[0] + ' 23:59:59',
        district: req.query.district
      }, function(err, json, xml){
        if (err) {
          return renderResult(req, res, err, data);
        }
        var data = [];
        for (var i = 0; i < json.length; i += 1) {
          var foundData = false;
          var lastData = null;
          for (var j = 0; j < json[i].results.length; j += 1) {
            if (json[i].results[j].usage === 0 && lastData) {
              break;
            }
            lastData = json[i].results[j];
          }
          data.push({'district': json[i].district, 'result': lastData});
        }
        renderResult(req, res, null, data);
      });
  };

  app.get('/', function(req, res){
    getSmeterValues(req, res);
  });

  app.get('/latest', function(req, res){
    getLatestValues(req, res);
  });

  port = process.env.PORT || 3000;
  app.listen(port);
  console.log('Listening on port ' + port);
} else {
  module.exports = require('./lib/smeterengine');
}