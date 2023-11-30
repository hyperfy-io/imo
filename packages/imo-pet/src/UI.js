/** @jsx jsx */
import { jsx, css } from "@emotion/react";
import React, {
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
} from "react";
import { produce } from "immer";
import { cloneDeep, isNumber } from "lodash";
import { File as FileIcon, CaretDown, X } from "@phosphor-icons/react";

import { useDropZone } from "./useDropZone";
import { classy, downloadFile } from "./utils";
import { Engine } from "./Engine";

export function UI() {
  const engineRef = useRef();
  const viewportRef = useRef();
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const drop = useDropZone(document.body);
  const engine = engineRef.current;
  useEffect(() => {
    const viewport = viewportRef.current;
    const engine = new Engine(viewport);
    engineRef.current = engine;
    engine.on("loaded", () => setLoaded((n) => n + 1));
    return () => {
      engine.destroy();
    };
  }, []);
  useEffect(() => {
    if (drop.hover) return;
    if (!drop.file) return;
    const engine = engineRef.current;
    engine.load(drop.file);
    setActive(true);
  }, [drop.hover, drop.file]);
  useEffect(() => {
    const engine = engineRef.current;
    engine.onResize();
  }, [active]);
  return (
    <div
      css={css`
        position: absolute;
        inset: 0;
        display: flex;
        align-items: stretch;
        .UI__side {
          width: 400px;
          padding: 20px 0 20px 20px;
          display: flex;
          flex-direction: column;
        }
        .UI__content {
          flex: 1;
          position: relative;
        }
        .UI__viewport {
          position: absolute;
          inset: 0;
        }
        .UI__drop {
          position: absolute;
          inset: 20px;
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          &.-visible {
            opacity: 1;
          }
          &.-active {
            border-color: rgba(255, 255, 255, 0.8);
          }
        }
      `}
    >
      {active && (
        <div className="UI__side">
          {loaded && <Config key={loaded} engine={engine} />}
        </div>
      )}
      <div className="UI__content">
        <div className="UI__viewport" ref={viewportRef} css={css``} />
        <div
          className={classy(
            { visible: !drop.file, active: drop.hover },
            "UI__drop"
          )}
        >
          <div>Drop a GLB file here.</div>
        </div>
      </div>
    </div>
  );
}

function Config({ engine }) {
  const [spec, setSpec] = useState(() => cloneDeep(engine.imo.spec));
  const animationOptions = useMemo(() => {
    const options = engine.animations.slice();
    options.unshift({ label: "", value: "" });
    return options;
  }, []);
  const valid = useMemo(() => {
    return engine.imo.isValid();
  }, [spec]);
  const edit = (write) => {
    const nextSpec = produce(spec, (draft) => {
      write(draft);
    });
    engine.imo.spec = nextSpec;
    setSpec(nextSpec);
  };
  const set = (key, value) => {
    edit((spec) => (spec[key] = value));
  };
  const addEmote = () => {
    edit((spec) => spec.emotes.push({ name: "", animation: "", audio: "" }));
  };
  const setEmote = (idx, key, value) => {
    edit((spec) => (spec.emotes[idx][key] = value));
  };
  const removeEmote = (idx) => {
    edit((spec) => spec.emotes.splice(idx, 1));
  };
  const download = () => {
    const file = engine.imo.toFile();
    downloadFile(file);
  };
  return (
    <div
      css={css`
        flex: 1;
        background: #1a1a20;
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        .Config__gap {
          flex: 1;
        }
        .Config__title {
          display: flex;
          align-items: center;
          margin: 10px 0 20px;
        }
        .Config__title-text {
          font-weight: 500;
          line-height: 1;
          flex: 1;
          &.-h1 {
            font-size: 20px;
          }
          &.-h2 {
            font-size: 16px;
          }
        }
        .Config__title-extras {
          // ...
        }
        .Config__rm {
          color: rgba(255, 255, 255, 0.3);
          &:hover {
            cursor: pointer;
            color: white;
          }
        }
      `}
    >
      <div className="Config__title">
        <div className="Config__title-text -h1">Schema</div>
      </div>
      <Label text="Name*" />
      <Input value={spec.name} onChange={(value) => set("name", value)} />
      <Label text="Description*" />
      <Input
        value={spec.description}
        onChange={(value) => set("description", value)}
      />
      <Label text="Speed*" />
      <Input
        numeric
        value={spec.speed}
        onChange={(value) => set("speed", value)}
      />
      {spec.emotes.map((emote, idx) => (
        <>
          <div className="Config__title ">
            <div className="Config__title-text -h2">Emote #{idx + 1}</div>
            <div className="Config__title-extras">
              <div className="Config__rm" onClick={() => removeEmote(idx)}>
                Remove
              </div>
            </div>
          </div>
          <Label text="Name*" />
          <Input
            value={emote.name}
            onChange={(value) => setEmote(idx, "name", value)}
          />
          <Label text="Animation*" />
          <Select
            options={animationOptions}
            value={emote.animation}
            onChange={(value) => setEmote(idx, "animation", value)}
          />
          <Label text="Audio" />
          <File
            value={emote.audio}
            onChange={(value) => setEmote(idx, "audio", value)}
            accept=".mp3"
          />
        </>
      ))}
      <div onClick={addEmote}>Add Emote</div>
      <div className="Config__gap" />
      <Button text="Download" disabled={!valid} onClick={download} />
    </div>
  );
}

function Label({ text }) {
  return (
    <div
      className="Label"
      css={css`
        display: flex;
        align-items: center;
        font-size: 13px;
        // font-weight: 500;
        line-height: 1;
        margin: 0 0 8px;
      `}
    >
      <span>{text}</span>
    </div>
  );
}

function File({ value, onChange, placeholder, inline, accept }) {
  const [key, setKey] = useState(0);
  function handleChange(e) {
    setKey((key) => key + 1);
    const file = e.target.files[0];
    if (!file) return;
    const source = {
      type: "file",
      name: file.name,
      file,
    };
    onChange(source);
    e.target.blur();
  }
  function handleRemove(e) {
    e.preventDefault();
    onChange(null);
  }
  return (
    <label
      className={classy({ set: !!value, inline }, "File")}
      css={css`
        display: flex;
        align-items: center;
        padding: 0 12px;
        background: #252630;
        height: 40px;
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        margin: 0 0 20px;
        &:focus-within {
          background: #252630;
        }
        > input {
          position: absolute;
          top: -999px;
        }
        > span {
          flex: 1;
          color: rgba(255, 255, 255, 0.3);
          white-space: nowrap;
          margin-left: 6px;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .File__remove {
          cursor: pointer;
        }
        &.-set {
          > span {
            color: white;
          }
        }
        &.-inline {
          margin-bottom: 0;
        }
      `}
    >
      <FileIcon size={18} />
      <input key={key} type="file" onChange={handleChange} accept={accept} />
      <span>{value?.name || placeholder || "None"}</span>
      {value && <X size={16} className="File__remove" onClick={handleRemove} />}
    </label>
  );
}

function Input({ value, onChange, inline, numeric }) {
  let [internalValue, setInternalValue] = useState(value);
  const handleChange = (e) => {
    let val = e.target.value;
    if (numeric) {
      setInternalValue(val);
      onChange(parseFloat(val) || 0);
    } else {
      setInternalValue(val);
      onChange(val);
    }
  };
  const handleBlur = () => {
    if (numeric) {
      setInternalValue(value);
    }
  };
  if (!numeric) {
    internalValue = internalValue || "";
  }
  // console.log('value', value)
  // console.log('internalValue', internalValue)
  return (
    <label
      className={classy({ inline }, "Input")}
      css={css`
        background: #252630;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        padding: 0 12px;
        margin: 0 0 20px;
        &.-inline {
          margin-bottom: 0;
        }
      `}
    >
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </label>
  );
}

function Select({ options, value, onChange, inline }) {
  return (
    <label
      className={classy({ inline }, "Select")}
      css={css`
        background: #252630;
        margin: 0 0 20px;

        border-radius: 12px;
        display: flex;
        align-items: center;
        position: relative;

        > select {
          padding: 0 26px 0 12px;
          height: 40px;
          appearance: none;
          outline: 0;
          display: block;
          width: 100%;
          flex: 1;
          background: none;
          option {
            background: black;
          }
          option[default] {
            color: rgba(255, 255, 255, 0.5);
          }
        }
        > svg {
          color: rgba(255, 255, 255, 0.4);
          position: absolute;
          right: 0;
          margin-right: 12px;
          pointer-events: none;
        }
        &.-inline {
          margin-bottom: 0;
        }
      `}
    >
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.blur();
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            default={option.default}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown size={18} />
    </label>
  );
}

function Button({ text, onClick, disabled }) {
  const handleClick = () => {
    if (disabled) return;
    onClick();
  };
  return (
    <div
      className={classy({ disabled }, "Button")}
      css={css`
        height: 44px;
        border-radius: 12px;
        background: #6a31de;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        &:hover:not(.-disabled) {
          cursor: pointer;
          background: #7e3eff;
        }
        &.-disabled {
          color: rgba(255, 255, 255, 0.2);
        }
      `}
      onClick={handleClick}
    >
      <span>{text}</span>
    </div>
  );
}
