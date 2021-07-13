const express = require("express");
var cors = require("cors");
const http = require("http");
const path = require("path");
var xss = require("xss");
const bodyParser = require("body-parser");
const app = express();
var server = http.createServer(app);
var io = require("socket.io")(server);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));
if (process.env.NODE_ENV !== "development") {
  console.log("hello");
  app.use(express.static(__dirname + "/public"));
  app.get("*", function (req, res) {
    res.sendFile(path.join(__dirname + "/public/index.html"));
  });
}
app.get("/ping", (req, res) => {
  res
    .send({
      success: true,
    })
    .status(200);
});

app.set("port", process.env.PORT || 3000);

rtcpeerconnections = {};

sitescripting = (str) => {
  return xss(str);
};
memo = {};
io.on("connection", (socket) => {
  socket.on("join-call", (path) => {
    if (rtcpeerconnections[path] === undefined) {
      rtcpeerconnections[path] = [];
      rtcpeerconnections[path].push(socket.id);

      for (let a = 0; a < rtcpeerconnections[path].length; ++a) {
        io.to(rtcpeerconnections[path][a]).emit(
          "user-joined",
          socket.id,
          rtcpeerconnections[path]
        );
      }

      if (memo[path] !== undefined) {
        for (let a = 0; a < memo[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            memo[path][a]["data"],
            memo[path][a]["sender"],
            memo[path][a]["socket-id-sender"]
          );
        }
      }

      console.log(path, rtcpeerconnections[path]);
    } else {
      rtcpeerconnections[path].push(socket.id);

      for (let a = 0; a < rtcpeerconnections[path].length; ++a) {
        io.to(rtcpeerconnections[path][a]).emit(
          "user-joined",
          socket.id,
          rtcpeerconnections[path]
        );
      }

      if (memo[path] !== undefined) {
        for (let a = 0; a < memo[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            memo[path][a]["data"],
            memo[path][a]["sender"],
            memo[path][a]["socket-id-sender"]
          );
        }
      }

      console.log(path, rtcpeerconnections[path]);
    }
  });

  socket.on("signal", (toId, message) => {
    io.to(toId).emit("signal", socket.id, message);
  });

  socket.on("chat-message", (data, sender) => {
    data = sitescripting(data);
    sender = sitescripting(sender);

    var pointer;
    var boolvalue = false;
    for (const [k, v] of Object.entries(rtcpeerconnections)) {
      for (let i = 0; i < v.length; ++i) {
        if (v[i] !== socket.id) {
          console.log("not equal");
        } else {
          boolvalue = true;
          pointer = k;
        }
      }
    }

    if (boolvalue === true) {
      if (memo[pointer] === undefined) {
        memo[pointer] = [];
      }
      memo[pointer].push({
        sender: sender,
        data: data,
        "socket-id-sender": socket.id,
      });

      for (let i = 0; i < rtcpeerconnections[pointer].length; ++i) {
        io.to(rtcpeerconnections[pointer][i]).emit(
          "chat-message",
          data,
          sender,
          socket.id
        );
      }
    }
  });
  socket.on("disconnect", () => {
    var pointer;
    for (const [k, v] of JSON.parse(
      JSON.stringify(Object.entries(rtcpeerconnections))
    )) {
      for (let i = 0; i < v.length; ++i) {
        if (v[i] === socket.id) {
          pointer = k;

          for (let i = 0; i < rtcpeerconnections[pointer].length; ++i) {
            io.to(rtcpeerconnections[pointer][a]).emit("user-left", socket.id);
          }

          var index = rtcpeerconnections[pointer].indexOf(socket.id);
          rtcpeerconnections[pointer].splice(index, 1);

          if (rtcpeerconnections[pointer].length === 0) {
            delete rtcpeerconnections[pointer];
          }
        }
      }
    }
  });
});

server.listen(app.get("port"), () => {
  console.log("listening on", app.get("port"));
});
