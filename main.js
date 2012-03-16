var request = require('./request.js');

/* ARG */
var USERNAME = process.argv[2];
var PASSWORD = process.argv[3];

if (!USERNAME || !PASSWORD) {
	console.log('Usage: node server.js <twitter_username> <twitter_password>');
	return;
}

/* TWITTER STREAM */
var ts = require('twitter-stream');

//Connecting to Twitter Streaming API
var stream = ts.connect({
	screen_name: USERNAME,
	password: PASSWORD,
	action: 'filter',
	params: {track: '#nicovideo'},
});
stream.on('status', function(status) {
	parseVideoTweet(status.text, function(result) {
		if(io) {
			io.sockets.emit('posted', {data: result, user_image_url: status.user.profile_image_url, user_name: status.user.name});
		}
		console.log(result);
	});
});

stream.on('error', function(error) {
    console.error(error);
    return;
});

/* WEBSOCKET */
var io = require('socket.io').listen(2525);
io.set('log level', 1);
io.sockets.on('connection', function (socket) {
    
});

var redis  = require( "redis" ).createClient();
var parseVideoTweet = function(text, handler) {
	if(!text.match(/(sm|nm|so)\d+/)) return;
	
	var vid = text.match(/(sm|nm|so)\d+/)?text.match(/(sm|nm|so)\d+/)[0]:'';
	
	redis.hgetall(vid, function(err, res){
		if(isEmpty(res)) { 
			request.get('http://ext.nicovideo.jp/api/getthumbinfo/' + vid, function(res) {
				var title = res.match(/<title>(.+)<\/title>/)?res.match(/<title>(.+)<\/title>/)[1]:'';
				var thumbnail_url = res.match(/<thumbnail_url>(.+)<\/thumbnail_url>/)?res.match(/<thumbnail_url>(.+)<\/thumbnail_url>/)[1]:''; 
				var length = res.match(/<length>(.+)<\/length>/)?res.match(/<length>(.+)<\/length>/)[1]:''; 
				redis.hmset(vid, {title: title, thumbnail_url: thumbnail_url, length: length});
				console.log('FROM GET');
				make(vid, text, title, thumbnail_url, length, handler);
			});
		}else{
			console.log('FROM REDIS');
			make(vid, text, res.title, res.thumbnail_url, res.length, handler);
		}
	});
}

var make = function(vid, tweet, video_title, video_thumbnail_url, video_length, handler) {
	var returnVal = {
		vid: vid,
		is_retweet: tweet.match(/RT/)?true:false,
		title: video_title,
		thumbnail_url: video_thumbnail_url,
		length: video_length,
		comment: tweet.replace(video_title, '').replace(/https?:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+/, '').replace(/\(\d+:\d+\)/, '').replace(/#[A-Za-z0-9]+/g, '').replace(/[\s\n\r]/g, '').replace(/RT.+$/, ''),
		count: TweetCount.roleCount(vid),
		mostcount: TweetCount.getMostCount(),
	};
	handler(returnVal);
}

function isEmpty(obj){
    for(var b in obj) return false;
    return true;
}

/* counter */
var TweetCount = {};
TweetCount.expire = 10 * 60 * 1000; //ms
TweetCount.counter = {};
TweetCount.mostcounter = 0;
TweetCount.roleCount = function(key) {
	if(this.counter[key]==undefined) {
		this.counter[key] = 0;
	}
	this.counter[key]++;
	setTimeout(function() {
		if(TweetCount.counter[key]!=undefined) {
			TweetCount.counter[key]--;
		}
	}, this.expire);
	if(this.counter[key]>this.mostcounter) {
		this.mostcounter = this.counter[key];
	}
	return this.counter[key];
}
TweetCount.getMostCount = function() {
	return this.mostcounter;
}
setTimeout(function(){
	for (var i in TweetCount.counter) {
		if(TweetCount.counter[i]>TweetCount.mostcounter) {
			TweetCount.mostcounter = TweetCount.counter[i];
		}
	}
}, 60 * 1000);