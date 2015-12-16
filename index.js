var WebSocketServer = require("ws").Server
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

var mongodb = require('mongodb');
var monk = require('monk');
var url = process.env.MONGOLAB_URI || 'localhost:27017/challenger_documents'
var db = monk(url);
var ObjectId = mongodb.ObjectID;


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use(allowCrossDomain);
app.use(express.static(__dirname + "/"))
app.use('/app', express.static('public'));
app.use('/bower_components', express.static('bower_components'));

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

                case "ask question":
                    // Question
                    questionids = message.data
                    console.log(id + " has asked " + questionids.length + " questions")
                    var room = db.get("room")
                    roomid = null

                    room.find({owner:id, status:1},{},function(e,docs){
                        if(docs.length != 0){
                            console.log("owner")
                            console.log(docs)
                            roomid = docs[0]._id
                            if(docs[0].player in clients){
                                player = clients[docs[0].player]
                                room.update({_id:docs[0]._id},{$set:{owner_question:questionids}},function(e,d){
                                    console.log("updated owner questions: " + d)
                                })
                                if("player_question" in docs[0]){
                                    console.log("game starts ",id," ",player.id)
                                    // STATUS 2 FOR GAME STARTED
                                    room.update({_id:roomid},{$set:{status:2}},function(e,d){
                                        console.log("updated room status to 2(started): " + d)
                                    })
                                    send(player, "answer", questionids)
                                    send(ws, "answer", docs[0].player_question)
                                }
                            } else {
                                send(ws, "message", "Player has left the room")
                            }
                        }
                    });
                    room.find({player:id, status:1},{},function(e,docs){
                        if(docs.length != 0){
                            console.log("player")
                            console.log(docs)
                            roomid = docs[0]._id
                            if(docs[0].owner in clients){
                                owner = clients[docs[0].owner]
                                room.update({_id:docs[0]._id},{$set:{player_question:questionids}},function(e,d){
                                    console.log("updated player questions: " + d)
                                })
                                if("owner_question" in docs[0]){
                                    console.log("game starts ",owner.id," ",id)
                                    // STATUS 2 FOR GAME STARTED
                                    room.update({_id:roomid},{$set:{status:2}},function(e,d){
                                        console.log("updated room status to 2(started): " + d)
                                    })
                                    send(ws, "answer", docs[0].owner_question)
                                    send(owner, "answer", questionids)
                                }
                            } else {
                                send(ws, "message", "Owner has left the room")
                            }
                        }
                    });
                    break;

                case "submit":
                    // Evaluation
                    answers = message.data
                    ans_arr = {}
                    ques_arr = []
                    answers.forEach(function(answer) {
                        ans_arr[answer.questionid] = answer.answer;
                        ques_arr.push(answer.questionid)
                    })

                    var correct = {1:0,2:0,3:0}, wrong = {1:0,2:0,3:0}
                    ques_arr = ques_arr.map(ObjectId);
                    var question = db.get("question")
                    question.find({_id:{$in:ques_arr}},{},function(e,questions){
                        if(questions.length>0){
                            questions.forEach(function(question){
                                console.log(question._id," actual:",question.answer," provided:",ans_arr[question._id])
                                if(question.answer == ans_arr[question._id]){
                                    correct[question.level]++;
                                } else {
                                    wrong[question.level]++;
                                }
                            })
                            console.log("correct: ",correct[1],correct[2],correct[3])
                            console.log("wrong: ",wrong[1],wrong[2],wrong[3])
                            var score = correct[1]+correct[2]*3+correct[3]*5
                            console.log("score",score)
                            var stuff = {"correct":correct,"wrong":wrong,"score":score}

                            var room = db.get("room");
                            room.find({owner:id,status:2},{},function(e,docs){
                                console.log("owner", id," length: ",docs.length)
                                if(docs.length!=0){
                                    if(docs[0].player in clients){
                                        player = clients[docs[0].player]
                                        room.update({_id:docs[0]._id},{$set:{owner_answer:stuff}})
                                        // RESULTS
                                        if("player_answer" in docs[0]){
                                            other_stuff = docs[0].player_answer
                                            room.update({_id:roomid},{$set:{status:3}},function(e,d){
                                                console.log("updated room status to 3(over): " + d)
                                            })
                                            console.log("game over owner",stuff,other_stuff)
                                            send(ws, "close", {"yours":other_stuff,"mine":stuff})
                                            send(player, "close", {"yours":stuff,"mine":other_stuff})
                                        }
                                    } else {
                                        send(ws, "message", "Player has left the room")
                                    }
                                }
                            })
                            room.find({player:id,status:2},{},function(e,docs){
                                console.log("player", id," length: ",docs.length)
                                if(docs.length!=0){
                                    if(docs[0].owner in clients){
                                        owner = clients[docs[0].owner]
                                        room.update({_id:docs[0]._id},{$set:{player_answer:stuff}})
                                        // RESULTS
                                        if("owner_answer" in docs[0]){
                                            other_stuff = docs[0].owner_answer
                                            room.update({_id:roomid},{$set:{status:3}},function(e,d){
                                                console.log("updated room status to 3(over): " + d)
                                            })
                                            console.log("game over player",stuff,other_stuff)
                                            send(owner, "close", {"yours":stuff,"mine":other_stuff})
                                            send(ws, "close", {"yours":other_stuff,"mine":stuff})
                                        }
                                    } else {
                                        send(ws, "message", "Player has left the room")
                                    }
                                }
                            })
                        }
                    })

                    
                    break;
            }
        }
	});

})
