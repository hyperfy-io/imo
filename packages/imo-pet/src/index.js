/** @jsx jsx */
import { jsx, css, Global } from "@emotion/react";
import { Heart, IconContext } from "@phosphor-icons/react";
import React from "react";
import ReactDOM from "react-dom";

import { UI } from "./UI";

function App() {
  return (
    <IconContext.Provider
      value={{
        color: "white",
        size: 24,
        weight: "regular",
      }}
    >
      <Global
        styles={css`
          body,
          html {
            font-family: "Roboto", sans-serif;
            font-size: 16px;
            font-weight: 400;
            line-height: 1.4;
            background: black;
            color: white;
            -webkit-font-smoothing: antialiased;
          }
          input {
            border: 0;
            background: none;
            outline: 0;
            padding: 0;
            margin: 0;
            display: block;
            width: 100%;
            font-family: inherit;
            font-size: inherit;
            &::placeholder {
              color: rgba(255, 255, 255, 0.3);
            }
          }
          select {
            font-family: inherit;
            font-size: inherit;
          }
        `}
      />
      <UI />
    </IconContext.Provider>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
