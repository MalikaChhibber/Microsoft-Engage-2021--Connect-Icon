import React, { Component } from "react";
import { Input, Button, IconButton } from "@material-ui/core";
import "./main.css";

class House extends Component {
  constructor(props) {
    super(props);
    this.state = {
      link: "",
    };
  }

  buttonpress = (event) => this.setState({ link: event.target.value });

  connect = () => {
    if (this.state.link !== "") {
      var link = this.state.link.split("/");
      window.location.href = `/${link[link.length - 1]}`;
    } else {
      var link = Math.random().toString(36).substring(2, 7);
      window.location.href = `/${link}`;
    }
  };

  render() {
    return (
      <div className="shape">
        <div>
          <h1 style={{ fontSize: "45px", fontWeight: "bold" }}>
            Connect-Icon{" "}
          </h1>
          <p style={{ fontWeight: "bold" }}>
            Video Calling Application to bring friends & families together{" "}
          </p>
        </div>

        <img
          src="icon.png"
          alt="Simply Easy Learning"
          width="200"
          height="200"
        ></img>

        <div
          style={{
            width: "35%",
            padding: "20px",
            height: "auto",
            minWidth: "400px",
            marginTop: "100px",
            textAlign: "center",
            margin: "auto",
            marginTop: "100px",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}>
            Join a meeting!!
          </p>
          <Input
            placeholder="Enter Code"
            onChange={(e) => this.buttonpress(e)}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={this.connect}
            style={{ margin: "20px" }}
          >
            JOIN
          </Button>
        </div>
      </div>
    );
  }
}

export default House;
