/*
 * Explain yo.
 *
 */

////////////////////////////////////////////////////////////////////
//////////////////////////// BASIC SETUP ///////////////////////////
////////////////////////////////////////////////////////////////////

var TEXTURE_SIZE = 128;
var MAX_PARTICLES = TEXTURE_SIZE * TEXTURE_SIZE;

// the graphics contex
var gl;
var float_texture_ext;

/**
 * WebGL setup
 */
function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

		float_texture_ext = gl.getExtension('OES_texture_float');
	} catch (e) {}

	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	} else if (!float_texture_ext) {
		alert("Browser doesn't support the necessary texture extension sorry :-(")
	}

	// Enable depth testing, so that objects are occluded based on depth instead of drawing order.
	gl.enable(gl.DEPTH_TEST);
}



/*
 * shader loading taken from David Roe's ingenious Stack Overflow answer at
 * http://stackoverflow.com/questions/4878145/javascript-and-webgl-external-scripts
 */

/*
 *	Loads a single file via XMLHttpRequest
 */
function loadFile(url, data, callback, errorCallback) {
	
	// Set up an asynchronous request
	var request = new XMLHttpRequest();
	request.open('GET', url, true);

	// Hook the event that gets called as the request progresses
	request.onreadystatechange = function () {
		
		// If the request is "DONE" (completed or failed)
		if (request.readyState == 4) {
			
			// If we got HTTP status 200 (OK)
			if (request.status == 200) {
				callback(request.responseText, data)
			} else { // Failed
				errorCallback(url);
			}
		}
	};

	request.send(null);    
}


/*
 *	Handle calling loadFile() on multiple files.
 * 	Uses the callback function after all files are loaded.
 */
function loadFiles(urls, callback, errorCallback) {
	var numUrls = urls.length;
	var numComplete = 0;
	var result = [];

	// Callback for a single file
	function partialCallback(text, urlIndex) {
		result[urlIndex] = text;
		numComplete++;

		// When all files have downloaded
		if (numComplete == numUrls) {
			callback(result);
		}
	}

	for (var i = 0; i < numUrls; i++) {
		loadFile(urls[i], i, partialCallback, errorCallback);
	}
}

var pointShaderInitialized = false;
var solversInitialized = false;
var sparseShaderInitialized = false;

function loadVertFragProgram(vertname, fragname, initFunction) {

	loadFiles([vertname, fragname], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.shaderSource(fragmentShader, shaderText[1]);

		gl.compileShader(vertexShader);
		gl.compileShader(fragmentShader);

		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(vertexShader));
			return null;
		}
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(fragmentShader));
			return null;
		}

		var program = gl.createProgram();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			alert("Could not initialize default shaders");
		}

		// program gets assigned to a global var so it won't
		// be out of scope when the program finishes
		initFunction(program);

	}, function (url) {
		alert('Failed to download "' + url + '"');
	}); 
	
}


var pointsProgram;
var solverProgram;
var sparseProgram;
/**
 * Loads all necessary shaders
 */
function initShaders() {

	//////////////////// point shaders ////////////////////
	loadVertFragProgram("res/shaders/points.vert", "res/shaders/points.frag", function (program) {

		pointsProgram = program;
		gl.useProgram(pointsProgram);

		pointsProgram.vertexPositionAttribute = gl.getAttribLocation(pointsProgram, "aIndex");
		gl.enableVertexAttribArray(pointsProgram.vertexPositionAttribute);
		
		pointsProgram.pMatrixUniform = gl.getUniformLocation(pointsProgram, "uPMatrix");
		pointsProgram.textureSize = gl.getUniformLocation(pointsProgram, "uTextureSize");
		pointsProgram.mvMatrixUniform = gl.getUniformLocation(pointsProgram, "uMVMatrix");
		pointsProgram.screenHeightUniform = gl.getUniformLocation(pointsProgram, "uScreenHeight");
		pointsProgram.positions = gl.getUniformLocation(pointsProgram, "uPositions");

		pointShaderInitialized = true;
	});


	//////////////////// solver shaders ////////////////////
	loadVertFragProgram("res/shaders/solver.vert", "res/shaders/solver.frag", function(program) {

		solverProgram = program;
		gl.useProgram(solverProgram);

		solverProgram.vertexPositionAttribute = gl.getAttribLocation(solverProgram, "aUV");
		gl.enableVertexAttribArray(solverProgram.vertexPositionAttribute);
		
		solverProgram.currPositions = gl.getUniformLocation(solverProgram, "uCurrPositions");
		solverProgram.prevPositions = gl.getUniformLocation(solverProgram, "uPrevPositions");
		solverProgram.numParticles = gl.getUniformLocation(solverProgram, "uNumParticles");

		solverProgram.viewport = gl.getUniformLocation(solverProgram, "uViewport");
		solverProgram.deltaTime = gl.getUniformLocation(solverProgram, "uDeltaTime");
		solverProgram.oldDeltaTime = gl.getUniformLocation(solverProgram, "uOldDeltaTime");

		solversInitialized = true;
	});


	//////////////////// sparse shaders ////////////////////
	loadVertFragProgram("res/shaders/sparse.vert", "res/shaders/sparse.frag", function(program) {

		sparseProgram = program;
		gl.useProgram(sparseProgram);

		sparseProgram.vertexPositionAttribute = gl.getAttribLocation(sparseProgram, "aPosition");
		gl.enableVertexAttribArray(sparseProgram.vertexPositionAttribute);
		sparseProgram.vertexColorAttribute = gl.getAttribLocation(sparseProgram, "aColor");
		gl.enableVertexAttribArray(sparseProgram.vertexColorAttribute);
		
		sparseProgram.pMatrixUniform = gl.getUniformLocation(sparseProgram, "uPMatrix");
		sparseProgram.mvMatrixUniform = gl.getUniformLocation(sparseProgram, "uMVMatrix");

		sparseShaderInitialized = true;
	});
		// sparseShaderInitialized = true;
}


var indexBuffer;
var fullScreenQuadBuffer;
var axesBuffer;
/**
 * Initializes the vbos
 */
function initBuffers() {
	////////////////////// particle indices /////////////////////////
	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
	
	var indices = new Float32Array(MAX_PARTICLES);
	// var indices = new Float32Array(200);

	for (var i = 0; i < MAX_PARTICLES; i++) {
		indices[i] = i;// + 0.5;
	}
	
	gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	indexBuffer.itemSize = 1;
	indexBuffer.numItems = indices.length / indexBuffer.itemSize;

	////////////////////// fullscreen vertices /////////////////////////
	fullScreenQuadBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, fullScreenQuadBuffer);

	var corners = [ -1.0,  1.0,
					 1.0,  1.0,
				    -1.0, -1.0,
				     1.0, -1.0];
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
	fullScreenQuadBuffer.itemSize = 2;
	fullScreenQuadBuffer.numItems = corners.length / fullScreenQuadBuffer.itemSize;

	////////////////////// axis vertices /////////////////////////
	axesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, axesBuffer);

	var axes = [    0.0,    0.0,-1000.0,  0.0, 0.0, 0.5,
				    0.0,    0.0,    0.0,  0.0, 0.0, 0.5,
				    0.0,    0.0, 1000.0,  0.0, 0.0, 1.0,
				    0.0,    0.0,    0.0,  0.0, 0.0, 1.0,
				    0.0,-1000.0,    0.0,  0.0, 0.5, 0.0,
				    0.0,    0.0,    0.0,  0.0, 0.5, 0.0,
				    0.0, 1000.0,    0.0,  0.0, 1.0, 0.0,
				    0.0,    0.0,    0.0,  0.0, 1.0, 0.0,
				-1000.0,    0.0,    0.0,  0.5, 0.0, 0.0,
				    0.0,    0.0,    0.0,  0.5, 0.0, 0.0,
				 1000.0,    0.0,    0.0,  1.0, 0.0, 0.0,
				    0.0,    0.0,    0.0,  1.0, 0.0, 0.0];
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axes), gl.STATIC_DRAW);
	axesBuffer.itemSize = 6;
	axesBuffer.numItems = axes.length / axesBuffer.itemSize;
}


var solverFramebuffer;
/**
 * Initializes an alternate framebuffer and texture
 */
function initFramebuffer() {
	solverFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, solverFramebuffer);
	solverFramebuffer.width = TEXTURE_SIZE;
	solverFramebuffer.height = TEXTURE_SIZE;

	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, solverFramebuffer.width, solverFramebuffer.height);

	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

var particleArraySize = 0;
var prevTexture;
var currTexture;
var newTexture;
/**
 * Set particle positions and bind put them in a texture
 */
function initParticlePositions() {
	
	var pos = new Float32Array(MAX_PARTICLES * 4);

	for (var i = 0; i < TEXTURE_SIZE; i++) {
		for (var j = 0; j < TEXTURE_SIZE; j++) {
			var index = (i * TEXTURE_SIZE + j) * 4;
			pos[index  ] = 0.0;
			pos[index+1] = 0.0;
			pos[index+2] = 0.0;
			pos[index+3] = 0.0;
		}
	}
	// for (var i = 0; i < 8; i++) {
	// 		pos[i*4  ] = i - 5;
	// 		pos[i*4+1] = i - 5;
	// 		pos[i*4+2] = i - 5;
	// 		pos[i*4+3] = 1.0;
	// }
	// particleArraySize = 8;

	// pos[0] =  10.0; pos[1] = 0.0; pos[2]  = 0.0; pos[3]  = 1.0;
	// pos[4] = -10.0; pos[5] = 0.0; pos[6]  = 0.0; pos[7]  = 1.0;
	// pos[8] =  0.0; pos[9] = 0.0; pos[10] = 10.0; pos[11] = 1.0;

	// particleArraySize = 3;

	// var index = 0;
	// for (var y = 0; y < 10; ++y) {
	// 	for (var x = 0; x < 60; ++x) {
	// 		pos[index++] = x - 30;
	// 		pos[index++] = y;
	// 		pos[index++] = 0.0;
	// 		pos[index++] = 1.0;
	// 	}
	// }
	// particleArraySize = 600;

	// original positions
	for (var b = 0; b < 10; b++) {
		for (var r = 0; r < 10; r++) {
			for (var c = 0; c < 10; c++) {

				var i = b * 100 + r * 10 + c;

				pos[i*4  ] = c * 4.0 - 18.0;
				pos[i*4+1] = r * 4.0 - 18.0;
				pos[i*4+2] = b * 4.0 - 18.0;
				pos[i*4+3] = 1.0;
				
			}
		}
	}
	particleArraySize = 1000;

	// new texture
	newTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, newTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, solverFramebuffer.width, solverFramebuffer.height, 0, gl.RGBA, gl.FLOAT, pos);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	// 'previous' positions for velocity calculations
	for (var b = 0; b < 10; b++) {
		for (var r = 0; r < 10; r++) {
			for (var c = 0; c < 10; c++) {

				var i = b * 100 + r * 10 + c;

				pos[i*4  ] += Math.random() * 0.3 - 0.15;
				pos[i*4+1] += Math.random() * 0.3 - 0.15;
				pos[i*4+2] += Math.random() * 0.3 - 0.15;
				
			}
		}
	}
	
	// curr texture
	currTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, currTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, solverFramebuffer.width, solverFramebuffer.height, 0, gl.RGBA, gl.FLOAT, pos);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	for (var b = 0; b < 10; b++) {
		for (var r = 0; r < 10; r++) {
			for (var c = 0; c < 10; c++) {

				var i = b * 100 + r * 10 + c;

				pos[i*4  ] = c * 2.0 - 4.0 + Math.random() * 0.3 - 0.15;
				pos[i*4+1] = r * 2.0 - 4.0 + Math.random() * 0.3 - 0.15;
				pos[i*4+2] = b * 2.0 - 4.0 + Math.random() * 0.3 - 0.15;
				pos[i*4+3] = 1.0;
				
			}
		}
	}

	// prevTexture
	prevTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, prevTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, solverFramebuffer.width, solverFramebuffer.height, 0, gl.RGBA, gl.FLOAT, pos);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	
	gl.bindTexture(gl.TEXTURE_2D, null);
}


// modelview and perspective matrices
var mMatrix = mat4.create();
var vMatrix = mat4.create();
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var look = vec4.create();
var up = vec4.create();
var right = vec4.create();

var angleX;
var angleY;
var zoomZ;

////////////////////////////////////////////////////////////////////
////////////////////////// CAMERA FUNCTIONS ////////////////////////
////////////////////////////////////////////////////////////////////

function setCamera() {
	mat4.identity(mMatrix);

	angleX = 0.0;
	angleY = 0.0;
	zoomZ = -50.0;

	updateView();
}

function updateView() {
	mat4.identity(vMatrix);

	mat4.translate(vMatrix, vMatrix, [0, 0, zoomZ]);
	mat4.rotate(vMatrix, vMatrix, degToRad(angleY), [1, 0, 0]);
	mat4.rotate(vMatrix, vMatrix, degToRad(angleX), [0, 1, 0]);

	// console.log(mat4.str(vMatrix));

	var temp = mat4.create();
	mat4.rotate(temp, temp, degToRad(angleX), [0, -1, 0]);
	mat4.rotate(temp, temp, degToRad(angleY), [-1, 0, 0]);


	vec4.transformMat4(look, [0, 0, -1, 0], temp);
	vec4.transformMat4(up, [0, 1, 0, 0], temp);
	vec4.transformMat4(right, [1, 0, 0, 0], temp);

	mat4.multiply(mvMatrix, vMatrix, mMatrix);
}


// set perspective matrix
function updatePerspective() {
	mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0);
}


////////////////////////////////////////////////////////////////////
////////////////////////// HELPER FUNCTIONS ////////////////////////
////////////////////////////////////////////////////////////////////

var mvMatrixStack = [];

function mvPushMatrix() {
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
}
function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
		throw "Invalid popMatrix!";
	}
	mvMatrix = mvMatrixStack.pop();
}

function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

function setSolverUniforms(deltaTime, oldDeltaTime) {
	gl.uniform2f(solverProgram.viewport, TEXTURE_SIZE, TEXTURE_SIZE);
	gl.uniform1f(solverProgram.deltaTime, Math.min(deltaTime / 1000.0, 0.1));
	gl.uniform1f(solverProgram.oldDeltaTime, Math.min(oldDeltaTime / 1000.0, 0.1));
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, currTexture);
	gl.uniform1i(solverProgram.currPositions, 0);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, prevTexture);
	gl.uniform1i(solverProgram.prevPositions, 1);

	gl.uniform1i(solverProgram.numParticles, particleArraySize);
}

function setPointUniforms() {
	gl.uniform1f(pointsProgram.textureSize, TEXTURE_SIZE);
	gl.uniformMatrix4fv(pointsProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(pointsProgram.mvMatrixUniform, false, mvMatrix);
	gl.uniform1i(pointsProgram.screenHeightUniform, window.innerHeight);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, newTexture);
	gl.uniform1i(pointsProgram.positions, 0);
}

function setSparseUniforms() {
	gl.uniformMatrix4fv(sparseProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(sparseProgram.mvMatrixUniform, false, vMatrix);
}


/////////////////////////////////////////////////////////////////////
/////////////////////////// MOUSE EVENTS ////////////////////////////
/////////////////////////////////////////////////////////////////////

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

function handleMouseDown(event) {
	mouseDown = true;
	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
}

function handleMouseUp(event) {
	mouseDown = false;
}

function handleMouseWheel(event) {
	if (moveCamera) {
		zoomZ += event.deltaY * 0.03;
	} else {
		var trans = vec3.create();

		// look translation
		vec3.scale(trans, look, event.deltaY * 0.03);
		mat4.translate(mMatrix, mMatrix, trans);
	}
	updateView();
}

function handleMouseMove(event) {
	if (!mouseDown) {
		return;
	}
	var newX = event.clientX;
	var newY = event.clientY;

	// var translation
	var deltaX = newX - lastMouseX;
	var deltaY = newY - lastMouseY;

	if (moveCamera) {
		mat4.identity(vMatrix);
		angleX += deltaX;
		angleY += deltaY;
	} else {
		var trans = vec3.create();

		// horizontal translation
		vec3.scale(trans, right, deltaX * 0.03);
		mat4.translate(mMatrix, mMatrix, trans);

		// verticle translation
		vec3.scale(trans, up, -deltaY * 0.03);
		mat4.translate(mMatrix, mMatrix, trans);
	}

	updateView();

	lastMouseX = newX
	lastMouseY = newY;
}

/////////////////////////////////////////////////////////////////////
//////////////////////////// KEY EVENTS /////////////////////////////
/////////////////////////////////////////////////////////////////////

var currentlyPressedKeys = {};
var moveCamera = false;
var spaceDown = false;

function handleKeyDown(event) {
	currentlyPressedKeys[event.keyCode] = true;
	switch(event.keyCode) {
		// cmd key (MAC)
		case 224: // firefox
		case 17:  // Opera
		case 91:  // Chrome/Safari (left)
		case 93:  // Chrome/Safari (right)
			break;
		case 16: // shift
			moveCamera = true;
			break;
		case 32: // space
			spaceDown = true;
			break;
		default:
			// console.log(event.keyCode);
			break;
	}
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
	switch(event.keyCode) {
		// cmd key (MAC)
		case 224: // firefox
		case 17:  // Opera
		case 91:  // Chrome/Safari (left)
		case 93:  // Chrome/Safari (right)
			break;
		case 16: // shift
			moveCamera = false;
			break;
		case 32: // space
			spaceDown = false;
			break;
		default:
			// console.log(event.keyCode);
			break;
	}
}

function handleKeys() {}

////////////////////////////////////////////////////////////////////
/////////////////////////// SOLVER LOOP ////////////////////////////
////////////////////////////////////////////////////////////////////

var lastTime = 100;
var deltaTime = 100;
var pixData = new Float32Array(MAX_PARTICLES * 4);
/**
 *
 */
function updateParticles() {
	// update time
	var timeNow = new Date().getTime();
	
	var oldDeltaTime = deltaTime;
	if (lastTime != 0) {
		deltaTime = timeNow - lastTime;
		lastTime = timeNow;
	} else {
		lastTime = timeNow;
		return;
	}

	var temp = prevTexture;
	prevTexture = currTexture;
	currTexture = newTexture;
	newTexture = temp;

	gl.bindFramebuffer(gl.FRAMEBUFFER, solverFramebuffer);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, newTexture, 0);

	gl.viewport(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// set program and uniforms
	gl.useProgram(solverProgram);

	// bind the buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, fullScreenQuadBuffer);
	gl.vertexAttribPointer(pointsProgram.vertexPositionAttribute, 2, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * fullScreenQuadBuffer.itemSize, 0);
	setSolverUniforms(deltaTime, oldDeltaTime);

	// draw the quad
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, fullScreenQuadBuffer.numItems);

	// check if you can read from this type of texture.
	if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {

		gl.readPixels(0, 0, TEXTURE_SIZE, TEXTURE_SIZE, gl.RGBA, gl.FLOAT, pixData);

	}

	// var i = 1;
	// console.log("START");
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 0]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 1]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 2]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 3]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 4]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 5]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 6]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 7]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 8]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 9]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 10]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 11]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 12]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 13]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 14]);
	// console.log(pixData[i * 4 * TEXTURE_SIZE + 15]);
	// console.log("END");
}


////////////////////////////////////////////////////////////////////
/////////////////////////// RENDER LOOP ////////////////////////////
////////////////////////////////////////////////////////////////////

/**
 * Renders the scene to the canvas
 */
function drawScene() {}

function drawPoints() {
	if (!pointShaderInitialized)
		return;

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

	gl.useProgram(pointsProgram);

	var step = Float32Array.BYTES_PER_ELEMENT;

	// bind the buffer and set the uniforms
	var stride = step * indexBuffer.itemSize;
	gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
	gl.vertexAttribPointer(pointsProgram.vertexPositionAttribute, 1, gl.FLOAT, false, stride, 0);
	setPointUniforms();
	
	// draw the points
	gl.drawArrays(gl.POINTS, 0, particleArraySize);
}

function drawGrid() {
	if (!sparseShaderInitialized)
		return;

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(sparseProgram);

	var step = Float32Array.BYTES_PER_ELEMENT;

	// bind the buffer and set the uniforms
	gl.bindBuffer(gl.ARRAY_BUFFER, axesBuffer);
	var stride = step * axesBuffer.itemSize;
	gl.enableVertexAttribArray(sparseProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(sparseProgram.vertexColorAttribute);
	gl.vertexAttribPointer(sparseProgram.vertexPositionAttribute, 3, gl.FLOAT, false, stride, 0);
	gl.vertexAttribPointer(sparseProgram.vertexColorAttribute, 3, gl.FLOAT, false, stride, step * 3);
	setSparseUniforms();

	// draw the axes
	gl.drawArrays(gl.LINES, 0, axesBuffer.numItems);
}


function resizeCanvas() {
	gl.canvas.width = window.innerWidth;
	gl.canvas.height = window.innerHeight;

	gl.viewportWidth = gl.canvas.width;
	gl.viewportHeight = gl.canvas.height;

	updatePerspective();

	drawScene();
}


function tick() {
	requestAnimFrame(tick);
	handleKeys();

	if (pointShaderInitialized && solversInitialized && sparseShaderInitialized) {
		drawGrid();
		updateParticles();
		drawPoints();
	} else {
		showLoadingScreen();
	}
}

function showLoadingScreen() {}


function webGLStart() {
	var canvas = document.getElementById("canvas");
	initGL(canvas);
	initFramebuffer();
	initParticlePositions();
	initShaders();
	initBuffers();

	setCamera();
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	// mouse and keyboard events
	canvas.onmousedown = handleMouseDown;
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;
	document.onwheel = handleMouseWheel;

	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;

	// resize the canvas to fill browser window dynamically
	window.addEventListener('resize', resizeCanvas, false);
	
	resizeCanvas();
	tick();
}
