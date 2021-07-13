import React, { Component } from "react";
import io from "socket.io-client";
import { IconButton, Badge, Input, Button } from "@material-ui/core";
import VideocamIcon from "@material-ui/icons/Videocam";
import VideocamOffIcon from "@material-ui/icons/VideocamOff";
import MicIcon from "@material-ui/icons/Mic";
import MicOffIcon from "@material-ui/icons/MicOff";
import ScreenShareIcon from "@material-ui/icons/ScreenShare";
import StopScreenShareIcon from "@material-ui/icons/StopScreenShare";
import CallEndIcon from "@material-ui/icons/CallEnd";
import ChatIcon from "@material-ui/icons/Chat";
import "antd/dist/antd.css";
import faker from "faker";

import { Row } from "reactstrap";
import Modal from "react-bootstrap/Modal";
import "bootstrap/dist/css/bootstrap.css";
import "./client.css";
var grid = 0;
const server_url =
  process.env.NODE_ENV === "production"
    ? "https://newgamevideo.herokuapp.com"
    : "http://localhost:3000";
//stun servers urls
var rtcpeerconnections = {};
const peerConnectionConfig = {
  iceServers: [
    { url: "stun:stun01.sipphone.com" },
    { url: "stun:stun.ekiga.net" },
    { url: "stun:stun.fwdnet.net" },
    { url: "stun:stun.ideasip.com" },
    { url: "stun:stun.iptel.org" },
    { url: "stun:stun.rixtelecom.se" },
    { url: "stun:stun.schlund.de" },
    { url: "stun:stun.l.google.com:19302" },
    { url: "stun:stun1.l.google.com:19302" },
    { url: "stun:stun2.l.google.com:19302" },
    { url: "stun:stun3.l.google.com:19302" },
    { url: "stun:stun4.l.google.com:19302" },
    { url: "stun:stunserver.org" },
    { url: "stun:stun.softjoys.com" },
    { url: "stun:stun.voiparound.com" },
    { url: "stun:stun.voipbuster.com" },
    { url: "stun:stun.voipstunt.com" },
    { url: "stun:stun.voxgratia.org" },
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};
var websocket = null;
var socketId = null;

class client extends Component {
  constructor(props) {
    super(props);

    this.localVideoref = React.createRef();

    this.videoPermission = false;
    this.audioPermission = false;

    this.state = {
      screen: false,
      video: false,
      audio: false,
      showModal: false,
      screenAvailable: false,
      askForUsername: true,
      messages: [],
      message: "",
      newmessages: 0,
      username: faker.internet.userName(),
    };
    rtcpeerconnections = {};

    this.Permissions();
  }

  Permissions = async () => {
    try {
      await navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => (this.videoPermission = true))
        .catch(() => (this.videoPermission = false));

      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => (this.audioPermission = true))
        .catch(() => (this.audioPermission = false));

      if (navigator.mediaDevices.getDisplayMedia) {
        this.setState({ screenAvailable: true });
      } else {
        this.setState({ screenAvailable: false });
      }

      if (this.videoPermission || this.audioPermission) {
        navigator.mediaDevices
          .getUserMedia({
            video: this.videoPermission,
            audio: this.audioPermission,
          })
          .then((stream) => {
            window.localStream = stream;
            this.localVideoref.current.srcObject = stream;
          })
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    } catch (e) {
      console.log(e);
    }
  };
  //get audio and video streaming permissions from browsers

  getMedia = () => {
    this.setState(
      {
        video: this.videoPermission,
        audio: this.audioPermission,
      },
      () => {
        this.getUserMedia();
        this.connectToSocketServer();
      }
    );
  };
  //get video and audio streaming
  getUserMedia = () => {
    if (
      (this.state.video && this.videoPermission) ||
      (this.state.audio && this.audioPermission)
    ) {
      navigator.mediaDevices
        .getUserMedia({ video: this.state.video, audio: this.state.audio })
        .then(this.getUserMediaSuccess)
        .then((stream) => {})
        .catch((e) => console.log(e));
    } else {
      try {
        let tracks = this.localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    this.localVideoref.current.srcObject = stream;

    for (let identity in rtcpeerconnections) {
      if (identity !== socketId) {
        rtcpeerconnections[identity].addStream(window.localStream);

        rtcpeerconnections[identity].createOffer().then((description) => {
          rtcpeerconnections[identity]
            .setLocalDescription(description)
            .then(() => {
              websocket.emit(
                "signal",
                identity,
                JSON.stringify({
                  sdp: rtcpeerconnections[identity].localDescription,
                })
              );
            })
            .catch((e) => console.log(e));
        });
      }
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          this.setState(
            {
              video: false,
              audio: false,
            },
            () => {
              try {
                let tracks = this.localVideoref.current.srcObject.getTracks();
                tracks.forEach((track) => track.stop());
              } catch (e) {
                console.log(e);
              }

              let noAudioVideo = (...args) =>
                new MediaStream([
                  this.createEmptyVideoTrack(...args),
                  this.createEmptyAudioTrack(),
                ]);
              window.localStream = noAudioVideo();
              this.localVideoref.current.srcObject = window.localStream;

              for (let identity in rtcpeerconnections) {
                if (identity !== socketId) {
                  rtcpeerconnections[identity].addStream(window.localStream);

                  rtcpeerconnections[identity]
                    .createOffer()
                    .then((description) => {
                      rtcpeerconnections[identity]
                        .setLocalDescription(description)
                        .then(() => {
                          websocket.emit(
                            "signal",
                            identity,
                            JSON.stringify({
                              sdp: rtcpeerconnections[identity]
                                .localDescription,
                            })
                          );
                        })
                        .catch((e) => console.log(e));
                    });
                }
              }
            }
          );
        })
    );
  };
  // used to display the media
  getDislayMedia = () => {
    if (this.state.screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(this.getDislayMediaSuccess)
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    }
  };

  getDislayMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    this.localVideoref.current.srcObject = stream;

    for (let identity in rtcpeerconnections) {
      if (identity !== socketId) {
        rtcpeerconnections[identity].addStream(window.localStream);

        rtcpeerconnections[identity].createOffer().then((description) => {
          rtcpeerconnections[identity]
            .setLocalDescription(description)
            .then(() => {
              websocket.emit(
                "signal",
                identity,
                JSON.stringify({
                  sdp: rtcpeerconnections[identity].localDescription,
                })
              );
            })
            .catch((e) => console.log(e));
        });
      }
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          this.setState(
            {
              screen: false,
            },
            () => {
              try {
                let tracks = this.localVideoref.current.srcObject.getTracks();
                tracks.forEach((track) => track.stop());
              } catch (e) {
                console.log(e);
              }

              let noAudioVideo = (...args) =>
                new MediaStream([
                  this.createEmptyVideoTrack(...args),
                  this.createEmptyAudioTrack(),
                ]);
              window.localStream = noAudioVideo();
              this.localVideoref.current.srcObject = window.localStream;

              this.getUserMedia();
            }
          );
        })
    );
  };

  gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketId) {
      if (signal.sdp) {
        rtcpeerconnections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              rtcpeerconnections[fromId]
                .createAnswer()
                .then((description) => {
                  rtcpeerconnections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      websocket.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: rtcpeerconnections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        rtcpeerconnections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  changeCssVideos = (admin) => {
    let widthAdmin = admin.offsetWidth;
    let minimumWidth = "32%";
    if ((widthAdmin * 30) / 100 < 300) {
      minimumWidth = "300px";
    }

    let width = "";
    let height = String(100 / grid) + "%";
    let minimumHeight = "40%";
    if (grid === 0 || grid === 1) {
      height = "100%";
      width = "100%";
    } else if (grid === 2) {
      height = "100%";
      width = "47%";
    } else if (grid === 3 || grid === 4) {
      height = "47%";
      width = "46%";
    } else if (grid === 5 || grid === 6) {
      height = "30";
      width = "40";
    } else {
      width = String(100 / grid) + "%";
    }

    let videos = admin.querySelectorAll("video");
    for (let i = 0; i < videos.length; i = i + 1) {
      videos[i].style.minimumWidth = minimumWidth;
      videos[i].style.minimumHeight = minimumHeight;
      videos[i].style.setProperty("width", width);
      videos[i].style.setProperty("height", height);
    }

    return { minimumWidth, minimumHeight, width, height };
  };

  connectToSocketServer = () => {
    const server_url =
      process.env.NODE_ENV === "production"
        ? "https://video.sebastienbiollo.com"
        : "http://localhost:3000";
    websocket = io.connect(server_url, { secure: true });

    websocket.on("signal", this.gotMessageFromServer);

    websocket.on("connect", () => {
      websocket.emit("join-call", window.location.href);
      socketId = websocket.id;

      websocket.on("chat-message", this.addMessage);

      websocket.on("user-left", (identity) => {
        let video = document.querySelector(`[data-socket="${identity}"]`);
        if (video !== null) {
          grid--;
          video.parentNode.removeChild(video);

          let admin = document.getElementById("admin");
          this.changeCssVideos(admin);
        }
      });

      websocket.on("user-joined", (identity, clients) => {
        clients.forEach((socketListId) => {
          rtcpeerconnections[socketListId] = new RTCPeerConnection(
            peerConnectionConfig
          );
          //waiting for users to join
          rtcpeerconnections[socketListId].onicecandidate = function (event) {
            if (event.candidate != null) {
              websocket.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          // Wait for their video stream
          rtcpeerconnections[socketListId].onaddstream = (event) => {
            var videoaudiosearch = document.querySelector(
              `[data-socket="${socketListId}"]`
            );
            if (videoaudiosearch === null) {
              grid = clients.length;
              let admin = document.getElementById("admin");
              let cssMesure = this.changeCssVideos(admin);

              let video = document.createElement("video");

              let css = {
                minimumWidth: cssMesure.minimumWidth,
                maxHeight: "100%",
                margin: "10px",
                minimumHeight: cssMesure.minimumHeight,
                borderStyle: "solid",
                objectFit: "fill",
                borderColor: "#150766",
              };
              for (let i in css) video.style[i] = css[i];

              video.style.setProperty("width", cssMesure.width);
              video.style.setProperty("height", cssMesure.height);
              video.setAttribute("data-socket", socketListId);
              video.srcObject = event.stream;
              video.playsinline = true;
              video.autoplay = true;

              admin.appendChild(video);
            } else {
              videoaudiosearch.srcObject = event.stream;
            }
          };

          // Add the local video stream
          if (window.localStream !== undefined && window.localStream !== null) {
            rtcpeerconnections[socketListId].addStream(window.localStream);
          } else {
            let noAudioVideo = (...args) =>
              new MediaStream([
                this.createEmptyVideoTrack(...args),
                this.createEmptyAudioTrack(),
              ]);
            window.localStream = noAudioVideo();
            rtcpeerconnections[socketListId].addStream(window.localStream);
          }
        });

        if (identity === socketId) {
          for (let id2 in rtcpeerconnections) {
            if (id2 === socketId) continue;

            try {
              rtcpeerconnections[id2].addStream(window.localStream);
            } catch (e) {}

            rtcpeerconnections[id2].createOffer().then((description) => {
              rtcpeerconnections[id2]
                .setLocalDescription(description)
                .then(() => {
                  websocket.emit(
                    "signal",
                    id2,
                    JSON.stringify({
                      sdp: rtcpeerconnections[id2].localDescription,
                    })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };
  //creating empty audio track
  createEmptyAudioTrack = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    const track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
  };
  //creating empty video track

  createEmptyVideoTrack = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);

    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];

    return Object.assign(track, { enabled: false });
  };
  // copy link to clipboard so that user can easily share it
  copytoclipboard = () => {
    var inputc = document.body.appendChild(document.createElement("input"));
    inputc.value = window.location.href;
    inputc.focus();
    inputc.select();
    document.execCommand("copy");
    inputc.parentNode.removeChild(inputc);
    alert("URL Copied.");
  };
  //to hang up the call
  EndCall = () => {
    try {
      let tracks = this.localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}
    window.location.href = "/";
  };
  ScreenShare = () =>
    this.setState({ screen: !this.state.screen }, () => this.getDislayMedia());

  VideoCall = () =>
    this.setState({ video: !this.state.video }, () => this.getUserMedia());
  AudioCall = () =>
    this.setState({ audio: !this.state.audio }, () => this.getUserMedia());

  openChat = () => this.setState({ showModal: true, newmessages: 0 });
  closeChat = () => this.setState({ showModal: false });
  handleMessage = (e) => this.setState({ message: e.target.value });

  addMessage = (data, sender, socketIdSender) => {
    this.setState((prevState) => ({
      messages: [...prevState.messages, { sender: sender, data: data }],
    }));
    if (socketIdSender !== socketId) {
      this.setState({ newmessages: this.state.newmessages + 1 });
    }
  };

  handleUsername = (e) => this.setState({ username: e.target.value });

  sendMessage = () => {
    websocket.emit("chat-message", this.state.message, this.state.username);
    this.setState({ message: "", sender: this.state.username });
  };

  connect = () =>
    this.setState({ askForUsername: false }, () => this.getMedia());
  // compatible with major browsers including Mozilla Firefox and Google Chrome
  browser_get = function () {
    let userAgent = (navigator && (navigator.userAgent || "")).toLowerCase();
    let vendor = (navigator && (navigator.vendor || "")).toLowerCase();
    let matchSafari =
      /Apple Computer, Inc./.test(vendor) &&
      !/Chrome/.test(navigator.userAgent);
    let matchChrome = /google inc/.test(vendor)
      ? userAgent.match(/(?:chrome|crios)\/(\d+)/)
      : null;
    let matchFirefox = /Mozilla./.test(vendor)
      ? userAgent.match(/(?:firefox|fxios)\/(\d+)/)
      : null;
    return matchChrome !== null || matchSafari != null || matchFirefox != null;
  };
  render() {
    if (this.browser_get() === false) {
      return (
        <div
          style={{
            background: "white",
            width: "30%",
            height: "auto",
            padding: "20px",
            minimumWidth: "400px",
            textAlign: "center",
            margin: "auto",
            marginTop: "50px",
            justifyContent: "center",
          }}
        >
          <h1 style={{ fontWeight: "bold" }}>
            Sorry,Change the browser please
          </h1>
        </div>
      );
    }
    return (
      <div>
        {this.state.askForUsername === true ? (
          <div>
            <div
              style={{
                background: "white",
                width: "40%",
                height: "auto",
                padding: "22px",
                minimumWidth: "400px",
                textAlign: "center",
                margin: "auto",
                marginTop: "50px",
                justifyContent: "center",
              }}
            >
              <h3
                style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}
              >
                Set your username
              </h3>
              <Input
                placeholder="Username"
                value={this.state.username}
                onChange={(e) => this.handleUsername(e)}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={this.connect}
                style={{ margin: "20px" }}
              >
                Connect
              </Button>
            </div>

            <div
              style={{
                justifyContent: "center",
                textAlign: "center",
                paddingTop: "40px",
              }}
            >
              <video
                id="my-video"
                ref={this.localVideoref}
                autoPlay
                muted
                style={{
                  borderStyle: "solid",
                  borderColor: "#150766",
                  objectFit: "fill",
                  margin: "auto",
                  width: "60%",
                  height: "40%",
                }}
              ></video>
            </div>
          </div>
        ) : (
          <div>
            <div
              className="btn-down"
              style={{
                backgroundColor: "black",
                color: "black",
                textAlign: "center",
              }}
            >
              <IconButton style={{ color: "#00FF7F" }} onClick={this.VideoCall}>
                {this.state.video === true ? (
                  <VideocamIcon />
                ) : (
                  <VideocamOffIcon />
                )}
              </IconButton>
              <IconButton style={{ color: "#00FF7F" }} onClick={this.AudioCall}>
                {this.state.audio === true ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
              <IconButton style={{ color: "#C70039" }} onClick={this.EndCall}>
                <CallEndIcon />
              </IconButton>

              {this.state.screenAvailable === true ? (
                <IconButton
                  style={{ color: "#5190ED" }}
                  onClick={this.ScreenShare}
                >
                  {this.state.screen === true ? (
                    <ScreenShareIcon />
                  ) : (
                    <StopScreenShareIcon />
                  )}
                </IconButton>
              ) : null}

              <Badge
                badgeContent={this.state.newmessages}
                max={999}
                color="secondary"
                onClick={this.openChat}
              >
                <IconButton
                  style={{ color: "#5190ED" }}
                  onClick={this.openChat}
                >
                  <ChatIcon />
                </IconButton>
              </Badge>
            </div>

            <Modal
              show={this.state.showModal}
              onHide={this.closeChat}
              style={{ zIndex: "999999" }}
            >
              <Modal.Header closeButton>
                <Modal.Title>Chat Room</Modal.Title>
              </Modal.Header>
              <Modal.Body
                style={{
                  overflow: "auto",
                  overflowY: "auto",
                  height: "400px",
                  textAlign: "left",
                }}
              >
                {this.state.messages.length > 0 ? (
                  this.state.messages.map((item, index) => (
                    <div key={index} style={{ textAlign: "left" }}>
                      <p style={{ wordBreak: "break-all" }}>
                        <b>{item.sender}</b>: {item.data}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No message yet!!</p>
                )}
              </Modal.Body>
              <Modal.Footer className="div-send-msg">
                <Input
                  placeholder="Message"
                  value={this.state.message}
                  onChange={(e) => this.handleMessage(e)}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={this.sendMessage}
                >
                  Send
                </Button>
              </Modal.Footer>
            </Modal>

            <div className="mirror">
              <div style={{ paddingTop: "20px" }}>
                <Input value={window.location.href} disable="true"></Input>
                <Button
                  variant="contained"
                  style={{
                    marginLeft: "20px",
                    marginTop: "10px",
                    width: "120px",
                    fontSize: "10px",
                  }}
                  color="secondary"
                  onClick={this.copytoclipboard}
                >
                  Click to Copy
                </Button>
              </div>

              <Row
                id="admin"
                className="container"
                style={{ margin: 0, padding: 0 }}
              >
                <video
                  id="my-video"
                  ref={this.localVideoref}
                  autoPlay
                  muted
                  style={{
                    borderStyle: "solid",
                    borderColor: "#150766",
                    margin: "10px",
                    objectFit: "fill",
                    width: "100%",
                    height: "100%",
                  }}
                ></video>
              </Row>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default client;
