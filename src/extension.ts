import * as vscode from "vscode";

let statsPanel: vscode.WebviewPanel | undefined;

// TODAY STATS
let todayExplain = 0;
let todayComments = 0;
let todayLines = 0;
let todayFiles = new Set<string>();

// TOTAL STATS
let totalExplain = 0;
let totalComments = 0;
let totalLines = 0;
let totalFiles = new Set<string>();

export function activate(context: vscode.ExtensionContext) {

	 // Check if Ollama is running
    try {
        fetch("http://localhost:11434")
        .catch(() => {
            vscode.window.showErrorMessage(
 "Ollama is not running. Install from ollama.com and run a model like: ollama run qwen2:1.5b"
);
        });
    } catch {
        vscode.window.showErrorMessage(
            "Codexplain: Cannot connect to Ollama."
        );
    }

	todayExplain = context.globalState.get("todayExplain",0);
	todayComments = context.globalState.get("todayComments",0);
	todayLines = context.globalState.get("todayLines",0);

	totalExplain = context.globalState.get("totalExplain",0);
	totalComments = context.globalState.get("totalComments",0);
	totalLines = context.globalState.get("totalLines",0);

	const explainCmd = vscode.commands.registerCommand("codexplain.explainCode", async () => {

		const editor = vscode.window.activeTextEditor;
		if(!editor) return;

		const code = editor.document.getText(editor.selection);
		if(!code){
			vscode.window.showInformationMessage("Select code first.");
			return;
		}

		todayExplain++;
		totalExplain++;
		saveStats(context);

		const language = editor.document.languageId;

		const panel = createPanel(code,language,"explain");

		streamAI(panel,`Explain this ${language} code.

Return format:

Summary:
<summary>

Time Complexity:
<complexity>

Details:
<detailed explanation>

Code:
${code}`);

	});

	const commentCmd = vscode.commands.registerCommand("codexplain.generateComments", async () => {

		const editor = vscode.window.activeTextEditor;
		if(!editor) return;

		const code = editor.document.getText(editor.selection);
		if(!code){
			vscode.window.showInformationMessage("Select code first.");
			return;
		}

		todayComments++;
		totalComments++;
		saveStats(context);

		const language = editor.document.languageId;

		const panel = createPanel(code,language,"comments");

		streamAI(panel,`Rewrite the following ${language} code by adding clear helpful comments.

Return the FULL code with comments included.
Do not remove any code.

Code:
${code}`);

	});

	const statsCmd = vscode.commands.registerCommand("codexplain.showStats", () => {

		if(statsPanel){
			statsPanel.reveal();
			return;
		}

		statsPanel = vscode.window.createWebviewPanel(
			"codexplainStats",
			"Codexplain Stats",
			vscode.ViewColumn.Beside,
			{enableScripts:true}
		);

		statsPanel.webview.html = getStatsHTML();

		statsPanel.onDidDispose(()=> statsPanel = undefined);

		updateStats();

	});

	
const analyzeCmd = vscode.commands.registerCommand("codexplain.analyzeFile", async () => {

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage("Open a file first.");
		return;
	}

	// Get FULL file content
	const code = editor.document.getText();

	if (!code) {
		vscode.window.showInformationMessage("File is empty.");
		return;
	}

	// Prevent extremely large AI requests
	if (code.length > 12000) {
		vscode.window.showWarningMessage("File too large. Try analyzing a smaller file.");
		return;
	}

	const language = editor.document.languageId;

	// Create webview panel with ANALYZE mode
	const panel = createPanel(code, language, "analyze");

	streamAI(panel, `Analyze this entire ${language} source file.

Return the response EXACTLY in this format:

Overview:
<what this file does>

Main Components:
<functions, classes, modules>

Execution Flow:
<how the code executes step by step>

Dependencies:
<libraries, imports, APIs used>

Possible Improvements:
<suggest optimizations or better structure>

Code:
${code}`);

});


const errorCmd = vscode.commands.registerCommand("codexplain.explainError", async () => {

	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);

	if (diagnostics.length === 0) {
		vscode.window.showInformationMessage("No errors found in this file.");
		return;
	}

	const error = diagnostics[0];

	const code = editor.document.getText();
	const language = editor.document.languageId;

	const panel = createPanel(code, language, "error");

	streamAI(panel, `You are a senior developer helping debug code.

Language: ${language}

Error Message:
${error.message}

Error Line:
${error.range.start.line + 1}

Explain in this EXACT format:

Error:
<what the error means>

Cause:
<why this happens>

Fix:
<how to fix it>

Corrected Code:
<show corrected version>

Code:
${code}`);

});



	context.subscriptions.push(explainCmd,commentCmd,statsCmd , analyzeCmd, errorCmd);

	vscode.workspace.onDidChangeTextDocument(e=>{
		e.contentChanges.forEach(change=>{
			const lines = change.text.split("\n").length-1;
			todayLines += lines;
			totalLines += lines;
		});
		updateStats();
		saveStats(context);
	});

	vscode.workspace.onDidOpenTextDocument(doc=>{
		todayFiles.add(doc.fileName);
		totalFiles.add(doc.fileName);
		updateStats();
	});



	

}

export function deactivate(){}

function saveStats(context:vscode.ExtensionContext){

	context.globalState.update("todayExplain",todayExplain);
	context.globalState.update("todayComments",todayComments);
	context.globalState.update("todayLines",todayLines);

	context.globalState.update("totalExplain",totalExplain);
	context.globalState.update("totalComments",totalComments);
	context.globalState.update("totalLines",totalLines);

}

function updateStats(){

	if(!statsPanel) return;

	statsPanel.webview.postMessage({
		command:"updateStats",
		todayExplain,
		todayComments,
		todayLines,
		todayFiles:todayFiles.size,
		totalExplain,
		totalComments,
		totalLines,
		totalFiles:totalFiles.size
	});

}

function createPanel(code:string,language:string,mode:string){

	const panel = vscode.window.createWebviewPanel(
		"codexplain",
		"Codexplain",
		vscode.ViewColumn.Beside,
		{enableScripts:true}
	);

	panel.webview.html = getWebviewHTML(code,language,mode);

	return panel;

}

async function streamAI(panel:vscode.WebviewPanel,prompt:string){

	try{

	const res = await fetch("http://localhost:11434/api/generate",{

		method:"POST",

		headers:{
			"Content-Type":"application/json"
		},

		body:JSON.stringify({
			model: "qwen2:1.5b",
			prompt:prompt,
			stream:true
		})

	});

	const reader = res.body?.getReader();
	if(!reader) return;

	const decoder = new TextDecoder();
	let text="";

	while(true){

		const {done,value} = await reader.read();
		if(done) break;

		const chunk = decoder.decode(value);
		const lines = chunk.split("\n");

		for(const line of lines){

			if(!line.trim()) continue;

			try{

				const json = JSON.parse(line);

				if(json.response){

					text += json.response;

					panel.webview.postMessage({
						command:"update",
						text
					});

				}

			}catch{}

		}

	}

	}catch(err){

vscode.window.showErrorMessage(
"Codexplain: Failed to connect to Ollama. Make sure Ollama is running."
);

}

}

function getWebviewHTML(code:string,language:string,mode:string){

const explainSections = `

<div class="section">
<h3>Summary</h3>
<div id="summary"><span class="loader"></span> Analyzing...</div>
</div>

<div class="section">
<h3>Complexity</h3>
<div id="complexity"><span class="loader"></span> Calculating...</div>
</div>

<div class="section">
<button onclick="toggleDetails()">Show Details</button>

<div id="detailsSection" style="display:none">
<h3>Details</h3>
<div id="details"><span class="loader"></span> Generating explanation...</div>
</div>
</div>

`;


const analyzeSections = `

<div class="section">
<h3>Overview</h3>
<div id="overview"><span class="loader"></span> Understanding file...</div>
</div>

<div class="section">
<h3>Main Components</h3>
<div id="components"><span class="loader"></span> Finding functions & classes...</div>
</div>

<div class="section">
<h3>Execution Flow</h3>
<div id="flow"><span class="loader"></span> Analyzing logic flow...</div>
</div>

<div class="section">
<h3>Dependencies</h3>
<div id="deps"><span class="loader"></span> Detecting imports...</div>
</div>

<div class="section">
<h3>Possible Improvements</h3>
<div id="improve"><span class="loader"></span> Suggesting improvements...</div>
</div>

`;


const errorSections = `

<div class="section">
<h3>Error</h3>
<div id="error"><span class="loader"></span> Detecting error...</div>
</div>

<div class="section">
<h3>Cause</h3>
<div id="cause"><span class="loader"></span> Finding cause...</div>
</div>

<div class="section">
<h3>Fix</h3>
<div id="fix"><span class="loader"></span> Generating solution...</div>
</div>

<div class="section">
<h3>Corrected Code</h3>

<button onclick="copyCode()" class="btn btn-success">Copy Fix</button>

<pre><code id="fixedCode" class="${language}">
<span class="loader"></span> Generating corrected code...
</code></pre>

</div>
`;



const commentSections = `

<div class="section">
<h3>Commented Version</h3>

<button onclick="copyCode()" class="btn btn-success">Copy Code</button>

<pre><code id="commentedCode" class="${language}"><span class="loader"></span> Generating commented code...</code></pre>

</div>

`;

return `

<!DOCTYPE html>
<html>

<head>

<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">

<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

<style>

body{
font-family:Arial;
background:#0f172a;
color:white;
padding:20px;
}

.section{
background:#1e293b;
padding:15px;
margin-top:15px;
border-radius:8px;
}

pre{
background:#020617;
padding:10px;
border-radius:6px;
overflow:auto;
}

button{
background:#2563eb;
border:none;
padding:8px 14px;
color:white;
border-radius:6px;
cursor:pointer;
margin-bottom:10px;
}

.loader{
border:3px solid #f3f3f3;
border-top:3px solid #2563eb;
border-radius:50%;
width:14px;
height:14px;
display:inline-block;
animation:spin 1s linear infinite;
margin-right:6px;
}

@keyframes spin{
0%{transform:rotate(0deg)}
100%{transform:rotate(360deg)}
}

#toast{
position:fixed;
bottom:20px;
right:20px;
background:#22c55e;
color:white;
padding:10px 16px;
border-radius:6px;
font-size:14px;
opacity:0;
transition:opacity 0.3s ease;
}

</style>

</head>

<body>

<h2>Codexplain</h2>

<p><b>Language:</b> ${language}</p>

<div class="section">

<h3>Selected Code</h3>

<pre><code class="${language}">${escapeHtml(code)}</code></pre>

</div>

${mode==="explain"
	? explainSections
	: mode==="comments"
	? commentSections
	: mode==="analyze"
	? analyzeSections
	: errorSections}


<script>

hljs.highlightAll();

let full="";

function toggleDetails(){

const d=document.getElementById("detailsSection");

d.style.display = d.style.display==="none" ? "block" : "none";

}

function copyCode(){

let codeBlock =
document.getElementById("commentedCode") ||
document.getElementById("fixedCode");

const code = codeBlock.innerText;

navigator.clipboard.writeText(code);

const toast=document.getElementById("toast");

toast.style.opacity="1";

setTimeout(()=>{
toast.style.opacity="0";
},2000);

}

window.addEventListener("message",event=>{

if(event.data.command==="update"){

full=event.data.text;

if(document.getElementById("commentedCode")){

document.getElementById("commentedCode").innerText=full;
hljs.highlightAll();
return;

}

if("${mode}" === "explain"){
    parseExplain(full);
}

if("${mode}" === "analyze"){
    parseAnalyze(full);
}

if("${mode}" === "error"){
    parseError(full);
}



}

});

function parseExplain(text){

if(text.includes("Summary:")){

let s=text.split("Summary:")[1];

if(s.includes("Time Complexity")) s=s.split("Time Complexity")[0];

document.getElementById("summary").innerText=s.trim();

}

if(text.includes("Time Complexity")){

let c=text.split("Time Complexity:")[1];

if(c.includes("Details")) c=c.split("Details")[0];

document.getElementById("complexity").innerText=c.trim();

}

if(text.includes("Details")){

let d=text.split("Details:")[1];

document.getElementById("details").innerText=d.trim();

}

}

function parseAnalyze(text){

if(text.includes("Overview:")){
let v=text.split("Overview:")[1];
if(v.includes("Main Components")) v=v.split("Main Components")[0];
document.getElementById("overview").innerText=v.trim();
}

if(text.includes("Main Components")){
let v=text.split("Main Components:")[1];
if(v.includes("Execution Flow")) v=v.split("Execution Flow")[0];
document.getElementById("components").innerText=v.trim();
}

if(text.includes("Execution Flow")){
let v=text.split("Execution Flow:")[1];
if(v.includes("Dependencies")) v=v.split("Dependencies")[0];
document.getElementById("flow").innerText=v.trim();
}

if(text.includes("Dependencies")){
let v=text.split("Dependencies:")[1];
if(v.includes("Possible Improvements")) v=v.split("Possible Improvements")[0];
document.getElementById("deps").innerText=v.trim();
}

if(text.includes("Possible Improvements")){
let v=text.split("Possible Improvements:")[1];
document.getElementById("improve").innerText=v.trim();
}

}


function parseError(text){

if(text.includes("Error:")){

let e = text.split("Error:")[1];
if(e.includes("Cause:")) e = e.split("Cause:")[0];

document.getElementById("error").innerText = e.trim();

}

if(text.includes("Cause:")){

let c = text.split("Cause:")[1];
if(c.includes("Fix:")) c = c.split("Fix:")[0];

document.getElementById("cause").innerText = c.trim();

}

if(text.includes("Fix:")){

let f = text.split("Fix:")[1];
if(f.includes("Corrected Code:")) f = f.split("Corrected Code:")[0];

document.getElementById("fix").innerText = f.trim();

}

if(text.includes("Corrected Code:")){

let code = text.split("Corrected Code:")[1];

document.getElementById("fixedCode").innerText = code.trim();

}

}

</script>

<div id="toast"> Code Copied! </div>

</body>

</html>

`;

}

function escapeHtml(text:string){

return text
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;");

}

function getStatsHTML(){

return `

<!DOCTYPE html>
<html>

<head>

<style>

body{
font-family:Arial;
background:#0f172a;
color:white;
padding:20px;
}

.card{
background:#1e293b;
padding:15px;
margin-top:15px;
border-radius:8px;
}

</style>

</head>

<body>

<h2>📊 Codexplain Dashboard</h2>

<div class="card">

<h3>Today's Activity</h3>

<p>Files Edited: <b id="todayFiles">0</b></p>
<p>Lines Written: <b id="todayLines">0</b></p>
<p>Code Explained: <b id="todayExplain">0</b></p>
<p>Comments Generated: <b id="todayComments">0</b></p>

</div>

<div class="card">

<h3>Total Activity</h3>

<p>Total Files: <b id="totalFiles">0</b></p>
<p>Total Lines: <b id="totalLines">0</b></p>
<p>Total Explains: <b id="totalExplain">0</b></p>
<p>Total Comments: <b id="totalComments">0</b></p>

</div>

<script>

window.addEventListener("message",event=>{

const d=event.data;

if(d.command==="updateStats"){

document.getElementById("todayFiles").innerText=d.todayFiles;
document.getElementById("todayLines").innerText=d.todayLines;
document.getElementById("todayExplain").innerText=d.todayExplain;
document.getElementById("todayComments").innerText=d.todayComments;

document.getElementById("totalFiles").innerText=d.totalFiles;
document.getElementById("totalLines").innerText=d.totalLines;
document.getElementById("totalExplain").innerText=d.totalExplain;
document.getElementById("totalComments").innerText=d.totalComments;

}

});

</script>


</body>

</html>

`;

}