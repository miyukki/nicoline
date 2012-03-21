var url = require("url");
var http = require("http");
var events = require("events");
var querystring = require('querystring');

exports.post = function( request_url , parameters , handler , headerOptions ){
    return request( 'POST' , request_url , parameters , handler , headerOptions );
}
exports.get = function( request_url , handler , headerOptions ){
    return request( 'GET' , request_url , {} , handler , headerOptions );
}


var request = function( method , request_url , parameters , handler , headerOptions ){
    var parsedURL = url.parse( request_url,false );
    if( !parameters ){
	parameters = {};
	}
    var postData = querystring.stringify(parameters);
    var reqOptions = {
      "host": parsedURL['host'],
      "port": parsedURL['port']?parsedURL['port']:'80',
      "path": parsedURL['path'],
      "method": method,
      "headers": {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
      }
	};
    if( typeof headerOptions == 'object' ){
	for( var i in headerOptions ){
	    reqOptions[i] = headerOptions[i];
	    }
	}
    var req = http.request(reqOptions, function(res){
	res.setEncoding('utf-8');
	res.on('data', function (data) {
	    handler(data);
	    });
	});
    req.write(postData);
    req.end();
    return req;
};