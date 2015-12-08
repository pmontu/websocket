var WebSocketServer = require("ws").Server
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

var mongodb = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/challenger_documents');
var ObjectId = mongodb.ObjectID;


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use(allowCrossDomain);
app.use(express.static(__dirname + "/"))

var server = http.createServer(app)
server.listen(port)

console.log("http server listening on %d", port)


app.get('/rooms', function(req, res) {
    console.log("Lising Rooms")
    var room = db.get('room');
    room.find({status:0},{},function(e,docs){
        res.send(docs)
    });
});

app.get('/last_room', function(req, res) {
    console.log("Lising Rooms")
    var room = db.get('room');
    room.find({status:0},{},function(e,docs){
        res.send(docs[docs.length-1])
    });
});

app.get('/questions', function(req, res) {
    var question = db.get('question');
    question.find({},{},function(e,docs){
        res.send(docs)
    });
});
var wss = new WebSocketServer({server: server})
console.log("server started")

wss.on("connection", function(ws) {
	ws.send("hi")
	var id = ws.upgradeReq.headers['sec-websocket-key'];
	console.log("client connected: ",id)

	ws.on("close", function() {
		var id = ws.upgradeReq.headers['sec-websocket-key'];
		console.log("client disconnected ", id)
	})

	ws.on('message', function incoming(message) {
		var id = ws.upgradeReq.headers['sec-websocket-key'];
	    console.log('received: %s', message, " id: ", id);
	    ws.send(message)
	});


})
