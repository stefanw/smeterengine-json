var request = require('request');
var async = require('async');
var dom = require('xmldom').DOMParser;
var select = require('xpath.js');
var Iconv  = require('iconv').Iconv;
var iconv = new Iconv('ISO-8859-1', 'UTF8');
var encode = new Iconv('UTF8', 'ISO-8859-1');
var fs = require('fs');


REQUEST = ''+
'<smeterengine>'+
'  <scale>#scale#</scale>'+
'  <city>#city#</city>'+
'  <district#districtname#>'+
'      <time_period begin="#begin#" end="#end#" time_zone="#timezone#"/>'+
'</district>'+
'</smeterengine>'+
'';

DISTRICTS = {
  'BERLIN': ['Pankow', 'Lichtenberg', 'Marzahn-Hellersdorf', 'Treptow-Koepenick', 'Neukoelln',
    'Friedrichshain-Kreuzberg', 'Mitte', 'Tempelhof-Schöneberg', 'Steglitz-Zehlendorf',
     'Charlottenburg-Wilmersdorf', 'Reinickendorf', 'Spandau']
};


module.exports.SmeterEngine = function(options) {
  options = options || {};
  options.endpoint = options.endpoint || 'https://www.vattenfall.de/SmeterEngine/networkcontrol';
  options.city = options.city || 'BERLIN';
  options.timezone = options.timezone || 'CET';
  options.scale = options.scale || 'DAY';

  var makeSmeterRequest = function(begin, end, name) {
    return function(callback) {
      var body = REQUEST
        .replace(/#scale#/g, options.scale)
        .replace(/#city#/g, options.city)
        .replace(/#begin#/g, begin)
        .replace(/#end#/g, end)
        .replace(/#timezone#/g, options.timezone);

      if (name) {
        body = body.replace(/#districtname#/g, ' name="' + name + '"');
      } else {
        body = body.replace(/#districtname#/g, '');
      }

      makeRequest(options.endpoint, body, function(err, body){
        if (err) {
          return callback(err);
        }
        callback(null, {'district': name, results: parseResult(body)});
      });
    };
  };

  return {
    get: function(config, clb) {
      var clbs = [];
      if (config.district && !config.district.push){
        config.district = [config.district];
      }
      if (!config.district) {
        config.district = [''];
      }
      for (var i = 0; i < config.district.length; i += 1) {
        clbs.push(makeSmeterRequest(config.begin, config.end, config.district[i]));
      }
      async.parallel(clbs, function(err, results){
        clb(err, results);
      });
    }
  };
};

var makeRequest = function(endpoint, body, clb){
  // body = encode.convert(body);
  // var r = request.defaults({'proxy': 'http://localhost:8080'});
  request({
    url: endpoint,
    method: 'POST',
    body: body,
    headers: {'Content-Type': 'text/xml'},
    encoding: null
  }, function (error, response, body) {
    if (error) {
      return clb(error);
    }
    if (response.statusCode != 200) {
      return clb(new Error(response));
    }
    // body = iconv.convert(body).toString();
    body = body.toString();
    clb(null, body);
  });
};

var parseResult = function(body) {
  var doc = new dom().parseFromString(body);
  var districtTimestampData = select(doc, "//districtTimestampData");
  var data = [];
  for (var i = 0; i < districtTimestampData.length; i += 1) {
    data.push({
      'timestamp': select(districtTimestampData[i], "@value")[0].value,
      'usage': parseFloat(select(districtTimestampData[i], './/usage/text()')[0].data),
      'generation': parseFloat(select(districtTimestampData[i], './/generation/text()')[0].data),
      'feed': parseFloat(select(districtTimestampData[i], './/feed/text()')[0].data),
      'key-acount-usage': parseFloat(select(districtTimestampData[i], './/key-acount-usage/text()')[0].data)
    });
  }
  return data;
}