/*
* render.jupyter.test.ts
*
* Copyright (C) 2020 by RStudio, PBC
*
*/
import { testRender } from "./render.ts";

testRender("docs/test-jupyter.md", "pdf", true);
testRender("docs/unpaired.ipynb", "html", false);
testRender("docs/unpaired-md.md", "html", false);
