var WebSocketServer = require("ws").Server
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

var mongodb = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/challenger_documents');
//var db = monk("mongodb://heroku_flqw08hw:dmlaalfcr40mtqht9hir6tt2sq@ds027825.mongolab.com:27825/heroku_flqw08hw")
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

app.get('/clients', function(req, res) {
    console.log("Lising Clients")
    res.send(Object.keys(clients))
});

app.get('/rooms', function(req, res) {
    console.log("Lising Rooms")
    var room = db.get('room');
    room.find({status:0,owner:{$in:Object.keys(clients)}},{},function(e,docs){
        res.send(docs)
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
var clients = {};

function broadcast(signal, data){
    console.log("Broadcasting")
    Object.keys(clients).forEach(function(id){
        console.log(id, "[", signal, "] data:(", data, ")")
        send(clients[id], signal, data)
    })
}

function send(ws, signal, data){
    ws.send(JSON.stringify({signal:signal,data:data}))
}

wss.on("connection", function(ws) {
    var id = ws.upgradeReq.headers['sec-websocket-key'];
    console.log("client connected: ",id)
    clients[id] = ws;
	ws.send(JSON.stringify({signal:"message",data:"welcome. hi"}))

	ws.on("close", function() {
		var id = ws.upgradeReq.headers['sec-websocket-key'];
		console.log("client disconnected ", id)
        delete clients[id]
	})

	ws.on('message', function incoming(message) {
		var id = ws.upgradeReq.headers['sec-websocket-key'];
        message = JSON.parse(message)
	    console.log('received: [', message.signal, "] data:(",message.data, ") id: ", id);
        if(message.signal){
            switch(message.signal){
                case "message":
                    console.log("message received")
                    broadcast("message",message.data)
                    break;

                case "create room":
                    console.log("creating room")
                    var room = db.get('room');
                    room.remove({owner: id, status:{$ne:0}});
                    room.find({owner: id, status:0}, {}, function (e,docs) {
                        if(docs.length==0){
                            obj = {"owner": id,"status" : 0}
                            room.insert(obj, function (err, doc) {
                                if (err) {
                                    console.log("There was a problem adding the information to the database.");
                                }
                                else {
                                    console.log("created room: "+ obj._id + " by " + obj.owner + ". status: " + doc.status + "(open)")
                                    send(ws, "create room", obj)
                                }
                            })
                        } else {
                            send(ws, "create room", docs[0])
                        }
                        broadcast("message","room created: " + obj._id)
                    })
                    break;

                case "join room":
                    console.log("joining room")
                    roomid = message.data
                    var room = db.get('room');
                    room.find({_id: roomid, status:0, owner:{$ne:id}}, {}, function(e, docs){
                        if(docs.length != 0){
                            // STATUS 1 for PLAYER JOINED OWNER
                            room.update({_id:roomid},{$set:{status:1,player:id}},function(e,d){
                                console.log("updated room status to 1(waiting): " + d)
                            });
                            if(docs[0].owner in clients){
                                owner = clients[docs[0].owner]
                            
                                var question = db.get('question');
                                question.find({},{},function(e,docs){
                                    data = {playerid: id, questions:docs}

                                    // SENDING QUESTION FOR BOTH PLAYERS
                                    send(owner, "join room", data)
                                    send(ws, "join room", data)
                                });
                            } else {
                                send(ws, "message", "Owner has left the room")
                            }
                        } else {
                            send(ws, "message", "Room not available")
                        }
                    })
                    break;
            }
        }
	});

})
