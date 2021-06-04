/*
* verify.ts
*
* Copyright (C) 2020 by RStudio, PBC
*
*/

import { existsSync } from "fs/exists.ts";
import { assert } from "testing/asserts.ts";

import { ExecuteOutput, Verify } from "./test.ts";
import { outputForInput } from "./utils.ts";

export const noErrorsOrWarnings = {
  name: "No Errors or Warnings",
  verify: (outputs: ExecuteOutput[]) => {
    return !outputs.some((output) =>
      output.levelName === "warning" || output.levelName === "error"
    );
  },
};

export const printsMessage = (
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR",
  regex: RegExp,
): Verify => {
  return {
    name: `${level} matches ${String(regex)}`,
    verify: (outputs: ExecuteOutput[]) => {
      const printedMessage = outputs.some((output) => {
        return output.levelName === level && output.msg.match(regex);
      });
      assert(printedMessage, `Missing ${level} ${String(regex)}`);
    },
  };
};

export const fileExists = (file: string): Verify => {
  return {
    name: `File ${file} exists`,
    verify: (_output: ExecuteOutput[]) => {
      verifyPath(file);
    },
  };
};

export const outputCreated = (input: string, to: string): Verify => {
  return {
    name: "Output Created",
    verify: (outputs: ExecuteOutput[]) => {
      // Check for output created message
      const outputCreatedMsg = outputs.find((outMsg) =>
        outMsg.msg.startsWith("Output created:")
      );
      assert(outputCreatedMsg !== undefined, "No output created message");

      // Check for existence of the output
      const outputFile = outputForInput(input, to);
      verifyPath(outputFile.outputPath);
    },
  };
};

export const noSupportingFiles = (input: string, to: string): Verify => {
  return {
    name: "No Supporting Files Dir",
    verify: (_output: ExecuteOutput[]) => {
      const outputFile = outputForInput(input, to);
      verifyNoPath(outputFile.supportPath);
    },
  };
};

export const hasSupportingFiles = (input: string, to: string): Verify => {
  return {
    name: "Has Supporting Files Dir",
    verify: (_output: ExecuteOutput[]) => {
      const outputFile = outputForInput(input, to);
      verifyPath(outputFile.supportPath);
    },
  };
};

export function verifyPath(path: string) {
  const pathExists = existsSync(path);
  assert(pathExists, `Path ${path} doesn't exist`);
}

export function verifyNoPath(path: string) {
  const pathExists = existsSync(path);
  assert(!pathExists, `Unexpected directory: ${path}`);
}
