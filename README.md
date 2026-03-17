<h1>Codexplain</h1>

Codexplain is an AI-powered extension for Visual Studio Code that helps developers understand, analyze, and debug code directly inside the editor using a local AI model.

It allows developers to quickly generate explanations, comments, file summaries, and error analysis without leaving the editor.

---

<h2>Demo</h2>


Demo

<p align="center">
  <img src="https://github.com/Chandanan14/Codexplain/blob/main/images/demo.gif?raw=true" width="800">
</p>

---

<h1>Features</h1>

<b>Explain Code</b>

Select any portion of code and get a structured explanation including:

- Summary
- Time complexity
- Detailed explanation
- Code walkthrough

<b>Generate Comments</b>

Automatically generate meaningful comments for selected code to improve readability and documentation.

<b>Analyze Entire File</b>

Analyze the complete file to understand:

- Overall purpose
- Functions and components
- Code structure
- Execution flow

<b>Explain Errors</b>

Understand coding errors directly inside VS Code. Codexplain explains:

- What the error means
- Why it happened
- How to fix it
- A corrected example

<b>Coding Statistics</b>

Track your coding usage such as:

- Number of explanations used
- Comments generated
- Files analyzed

---

<b>Keyboard Shortcuts</b>

Feature| Shortcut
Explain Selected Code| Ctrl + Shift + E
Generate Comments| Ctrl + Shift + C
Show Coding Stats| Ctrl + Shift + S
Analyze Entire File| Ctrl + Shift + A
Explain Error| Ctrl + Shift + X

---

<h1>How To Use</h1>

<b>Method 1 — Right Click Menu</b>

1. Open any code file
2. Select code (for explanation or comments)
3. Right click inside editor
4. Choose a Codexplain feature

<b>Available commands:</b>

- Codexplain: Explain Code
- Codexplain: Generate Comments
- Codexplain: Analyze Entire File
- Codexplain: Explain Error
- Codexplain: Show Coding Stats

<b>Method 2 — Keyboard Shortcuts</b>

Use the keyboard shortcuts listed above for faster workflow.

---

<h1>Requirements</h1>

Codexplain runs using a local AI model, so you must install Ollama.

Install Ollama from:
https://ollama.com

After installing, run a model such as:

ollama run qwen2:1.5b

This model will power the AI responses inside the extension.

---

<h1>Extension Settings</h1>

No additional configuration is required.

---

<h1>Known Issues</h1>

Large files may take longer to process depending on system performance and AI model speed.

---

<h1>Author</h1>

Created by Chandana N.

---

<h1>License</h1>

This project is licensed under the MIT License.