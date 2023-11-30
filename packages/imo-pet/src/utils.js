import { forEach } from "lodash";

export function classy(obj, className) {
  let str = "";
  if (className) str += className;
  forEach(obj, (value, key) => {
    if (value) str += " -" + key;
  });
  return str;
}

export function downloadFile(file) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function stringToHex(str) {
  if (str.length > 4) {
    throw new Error("Input string should be 4 characters or less");
  }
  let hex = "0x";
  // Pad the string from the right to make it 4 characters
  while (str.length < 4) {
    str += "\0";
  }
  for (let i = str.length - 1; i >= 0; i--) {
    let byte = str.charCodeAt(i).toString(16).toUpperCase();
    while (byte.length < 2) byte = "0" + byte; // ensure two characters for each byte
    hex += byte;
  }
  // return hex
  return parseInt(hex);
}

export function hexToString(hex) {
  if (typeof hex !== "number") {
    throw new Error("Input should be a hexadecimal number");
  }
  // Convert the number to a hexadecimal string
  let hexString = hex.toString(16);
  // Pad the string with leading zeros to ensure it's 8 digits long
  hexString = hexString.padStart(8, "0");
  // Add the '0x' prefix
  hexString = "0x" + hexString;
  let str = "";
  for (let i = 2; i < hexString.length; i += 2) {
    let byte = parseInt(hexString.slice(i, i + 2), 16);
    if (byte !== 0) {
      // Append the character representation of the byte
      str = String.fromCharCode(byte) + str;
    }
  }
  return str;
}
