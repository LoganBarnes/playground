/*
 * A webgl implementation allowing for the visualization and manipulation
 * of various sounds and effects. The audio functions are handled in the
 * 'audio.js' file. Both files make use of various global parameters and
 * functions located in the 'globals.js' file.
 */


////////////////////////////////////////////////////////////////////
//////////////////////////// BASIC SETUP ///////////////////////////
////////////////////////////////////////////////////////////////////

// the graphics contex
var gl;

/**
 * WebGL setup
 */
function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	} catch (e) {}

	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}

	// Enable depth testing, so that objects are occluded based on depth instead of drawing order.
	gl.enable(gl.DEPTH_TEST);

	// Move the polygons back a bit so lines are still drawn even though they are coplanar with the polygons they came from, which will be drawn before them.
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(-1, -1);

	// Enable back-face culling, meaning only the front side of every face is rendered.
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	// Specify that the front face is represented by vertices in counterclockwise order (this is the default).
	gl.frontFace(gl.CCW);
}


var objectsInitialized = false;
var cubemapInitialized = false;

var visualizerProgram;
var cubemapProgram;
/**
 * Loads all necessary shaders
 */
function initShaders() {

	//////////////////// visualizer shaders ////////////////////
	loadVertFragProgram(gl, "res/shaders/visualizer.vert", "res/shaders/default.frag", function (program) {

		visualizerProgram = program;
		gl.useProgram(visualizerProgram);

		visualizerProgram.positionAttribute = gl.getAttribLocation(visualizerProgram, "aPosition");
		gl.enableVertexAttribArray(visualizerProgram.positionAttribute);

		visualizerProgram.normalAttribute = gl.getAttribLocation(visualizerProgram, "aNormal");
		gl.enableVertexAttribArray(visualizerProgram.normalAttribute);

		visualizerProgram.texCoordAttribute = gl.getAttribLocation(visualizerProgram, "aTexCoord");
		gl.enableVertexAttribArray(visualizerProgram.texCoordAttribute);
		
		visualizerProgram.pMatrixUniform = gl.getUniformLocation(visualizerProgram, "uPMatrix");
		visualizerProgram.mvMatrixUniform = gl.getUniformLocation(visualizerProgram, "uMVMatrix");
		visualizerProgram.mvMatrixITUniform = gl.getUniformLocation(visualizerProgram, "uMVMatrixIT");

		visualizerProgram.functionSizeUniform = gl.getUniformLocation(visualizerProgram, "uFunctionSize");
		visualizerProgram.functionUniform = gl.getUniformLocation(visualizerProgram, "uFunction");

		visualizerProgram.colorUniform = gl.getUniformLocation(visualizerProgram, "uColor");
		visualizerProgram.textureUniform = gl.getUniformLocation(visualizerProgram, "uTexture");
		visualizerProgram.useTextureUniform = gl.getUniformLocation(visualizerProgram, "uUseTexture");

		objectsInitialized = true;
	});


	//////////////////// cubemap shaders ////////////////////
	loadVertFragProgram(gl, "res/shaders/cubemap.vert", "res/shaders/cubemap.frag", function(program) {

		cubemapProgram = program;
		gl.useProgram(cubemapProgram);

		cubemapProgram.positionAttribute = gl.getAttribLocation(cubemapProgram, "aPosition");
		gl.enableVertexAttribArray(cubemapProgram.positionAttribute);
		
		// cubemapProgram.pMatrixUniform = gl.getUniformLocation(cubemapProgram, "uPMatrix"); // not used now
		cubemapProgram.vMatrixUniform = gl.getUniformLocation(cubemapProgram, "uVMatrix");
		cubemapProgram.useTexUniform = gl.getUniformLocation(cubemapProgram, "uUseTex");
		cubemapProgram.envMapUniform = gl.getUniformLocation(cubemapProgram, "uEnvMap");

		cubemapInitialized = true;
	});
}

var sphere = null;

function initShapes() {
	sphere = new Sphere(100, 100, 0.15);
	sphere.createVBO(gl, true, true);
}


// var shapeVBO = null;
var cubemapVBO = null;
/**
 * Initializes the vbos
 */
function initBuffers() {

	// skybox
	radius = 1.0; // skybox size

	data = [ -radius ,  radius,  radius, // 4
			  radius ,  radius,  radius, // 3
			 -radius , -radius,  radius, // 7
			  radius , -radius,  radius, // 8

			  radius , -radius, -radius, // 5
			  radius ,  radius,  radius, // 3
			  radius ,  radius, -radius, // 1

			 -radius ,  radius,  radius, // 4
			 -radius ,  radius, -radius, // 2
			 -radius , -radius,  radius, // 7

			 -radius , -radius, -radius, // 6
			  radius , -radius, -radius, // 5
			 -radius ,  radius, -radius, // 2
			  radius ,  radius, -radius];// 1
	
	cubemapVBO = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubemapVBO);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	cubemapVBO.itemSize = 3;
	cubemapVBO.numItems = data.length / 3;
}

var shapeTexture = null;
var cubemapTexture = null;
/*
 *
 */
function handleSingleTexture(texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

var cubemapRendered = false;
/*
 *
 */
function handleCubemapTexture(texture, side, image) {
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
	gl.texImage2D(side, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}


/*
 *
 */
function initTextures() {
	// set up single texture for quad
	shapeTexture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([225, 225, 0, 255]));

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// asynchronously load image
	shapeTexture.image = new Image();
	shapeTexture.image.onload = function() {
		handleSingleTexture(shapeTexture)
	}
	// shapeTexture.image.src = "res/images/cheese.png";
	// shapeTexture.image.src = "res/images/circles.jpg";
	// shapeTexture.image.src = "res/images/tin.jpg";
	shapeTexture.image.src = "res/images/snow.jpg";


	// set up cubemap textures
	cubemapTexture = gl.createTexture();

	// temporary gray image while other images load
	var grayImage = new Uint8Array(1024 * 1024 * 4);
	var index = 0;
	for (var r = 0; r < 1024; ++r) {
		for (var c = 0; c < 1024; ++c) {
			grayImage[index++] = 127;
			grayImage[index++] = 127;
			grayImage[index++] = 127;
			grayImage[index++] = 255;
		}
	}

	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, grayImage);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, grayImage);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, grayImage);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, grayImage);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, grayImage);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, grayImage);

	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	// gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE); // not in webgl?
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

	// asynchronously load cubemap images
	var pximg = new Image();
	var nximg = new Image();
	var pyimg = new Image();
	var nyimg = new Image();
	var pzimg = new Image();
	var nzimg = new Image();

	pximg.onload = function() {
		handleCubemapTexture(cubemapTexture, gl.TEXTURE_CUBE_MAP_POSITIVE_X, pximg);
	}
	nximg.onload = function() {
		handleCubemapTexture(cubemapTexture, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, nximg);
	}
	pyimg.onload = function() {
		handleCubemapTexture(cubemapTexture, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, pyimg);
	}
	nyimg.onload = function() {
		handleCubemapTexture(cubemapTexture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, nyimg);
	}
	pzimg.onload = function() {
		handleCubemapTexture(cubemapTexture, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, pzimg);
	}
	nzimg.onload = function() {
		handleCubemapTexture(cubemapTexture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, nzimg);
	}

	pximg.src = "res/images/sky/posx.jpg";
	nximg.src = "res/images/sky/negx.jpg";
	pyimg.src = "res/images/sky/posy.jpg";
	nyimg.src = "res/images/sky/negy.jpg";
	pzimg.src = "res/images/sky/posz.jpg";
	nzimg.src = "res/images/sky/negz.jpg";
}


// modelview and perspective matrices
var mMatrix = mat4.create();

var vMatrix = mat4.create();
var mvMatrix = mat4.create();
var mvMatrixIT = mat4.create();
var pMatrix = mat4.create();
var sMatrix = mat4.create();

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
	zoomZ = -3.5;

	updateView();
}

function updateView() {
	mat4.identity(vMatrix);

	mat4.translate(vMatrix, vMatrix, [0, 0, zoomZ]);
	mat4.rotate(vMatrix, vMatrix, degToRad(angleY), [1, 0, 0]);
	mat4.rotate(vMatrix, vMatrix, degToRad(angleX), [0, 1, 0]);

	var temp = mat4.create();
	mat4.rotate(temp, temp, degToRad(angleX), [0, -1, 0]);
	mat4.rotate(temp, temp, degToRad(angleY), [-1, 0, 0]);


	vec4.transformMat4(look, [0, 0, -1, 0], temp);
	vec4.transformMat4(up, [0, 1, 0, 0], temp);
	vec4.transformMat4(right, [1, 0, 0, 0], temp);

	mat4.multiply(mvMatrix, vMatrix, mMatrix);
	mat4.invert(mvMatrixIT, mvMatrix);
	mat4.transpose(mvMatrixIT, mvMatrixIT);

	mat4.invert(vMatrixInv, vMatrix);

	var pos = vec4.create();
	vec4.transformMat4(pos, [0, 0, 0, 1], vMatrixInv);
	vec3.scale(pos, pos, audioScale);
	audioContext.listener.setPosition(pos[0], pos[1], pos[2]);
	audioContext.listener.setOrientation(look[0], look[1], look[2], up[0], up[1], up[2]);

	var ori = vec4.create();
	for (i = 0; i < audioObjects.length; ++i) {
		vec4.transformMat4(ori, [0, 0, 0, 1], audioObjects[i].model);
		vec4.subtract(ori, pos, ori);
		vec3.normalize(ori, ori);
		audioObjects[i].panner.setOrientation(ori[0], ori[1], ori[2]);
	}
	var i = 2;
	vec4.transformMat4(ori, [0, 0, 0, 1], audioObjects[i].model);
	vec4.subtract(ori, pos, ori);
	vec3.normalize(ori, ori);
	audioObjects[i].panner.setOrientation(ori[0], ori[1], ori[2]);
}

var fovy = 45;
var aspect = 1;
var near = 0.1;
var far = 100.0;
var H = far * Math.tan(degToRad(fovy));
var C = -near / far;

// set perspective matrix
function updatePerspective() {
	aspect = gl.viewportWidth / gl.viewportHeight;
	// mat4.perspective(pMatrix, fovy, aspect, near, far);
	// console.log(mat4.str(pMatrix));

    var W = aspect * H;

    sMatrix[0]  = 1.0 / (W / 2.0);
    sMatrix[5]  = 1.0 / (H / 2.0);
    sMatrix[10] = 1.0 / far;

    mat4.identity(pMatrix);
    pMatrix[10] = -1.0/(1.0+C);
    pMatrix[11] = -1.0;
    pMatrix[14] = C/(1.0+C);
    pMatrix[15] = 0.0;

    mat4.multiply(pMatrix, pMatrix, sMatrix);
    // console.log(mat4.str(pMatrix));

}

////////////////////////////////////////////////////////////////////
////////////////////////// HELPER FUNCTIONS ////////////////////////
////////////////////////////////////////////////////////////////////

function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

function setCubemapUniforms() {
	// gl.uniformMatrix4fv(cubemapProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(cubemapProgram.vMatrixUniform, false, vMatrix);

	if (cubemapTexture) {
		gl.uniform1i(cubemapProgram.useTexUniform, 1);
		gl.uniform1i(cubemapProgram.envMapUniform, 1);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
		gl.activeTexture(gl.TEXTURE0);
	} else {
		gl.uniform1i(cubemapProgram.useTexUniform, 0);
		gl.uniform1i(cubemapProgram.envMapUniform, 0);
	}
}

function setShapeCameraAndTextureUniforms() {
	gl.uniformMatrix4fv(visualizerProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(visualizerProgram.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix4fv(visualizerProgram.mvMatrixITUniform, false, mvMatrixIT);

	if (shapeTexture) {
		gl.uniform1i(visualizerProgram.useTextureUniform, 1);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
		gl.uniform1i(visualizerProgram.samplerUniform, 0);
	} else {
		gl.uniform1i(visualizerProgram.useTextureUniform, 0);
	}
}

function setShapeFunctionUniforms(audioObj) {
	mat4.multiply(mvMatrix, vMatrix, audioObj.model);
	mat4.invert(mvMatrixIT, mvMatrix);
	mat4.transpose(mvMatrixIT, mvMatrixIT);


	gl.uniformMatrix4fv(visualizerProgram.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix4fv(visualizerProgram.mvMatrixITUniform, false, mvMatrixIT);

	var color = new Float32Array(audioObj.color);
	if (audioObj.muted) {
		color = [0, 0, 0];
	}
	if (audioObj.selected) {
		color = [1, 1, 1];
	}
	gl.uniform3f(visualizerProgram.colorUniform, color[0], color[1], color[2]);

	if (audioObj.inUse) {
		audioObj.analyser.getFloatFrequencyData(audioObj.dataArray);

		var average;
		var halfDivisor = bufferDivisor / 2;

		var length = audioObj.dataArray.length / bufferDivisor;

		for (var i = 0; i < length; i++) {

			average = 0;
			
			for (var j = 0; j < halfDivisor; j++) {
				average += audioObj.dataArray[i*halfDivisor+j];
				
			}
			
			audioObj.dataArray[i] = average / halfDivisor;
			audioObj.dataArray[i] = Math.max(0.0, (audioObj.dataArray[i] + 100.0) / 70.0);
		}

		gl.uniform1i(visualizerProgram.functionSizeUniform, length);
		gl.uniform1fv(visualizerProgram.functionUniform, audioObj.dataArray.subarray(0, length));

	} else {
		gl.uniform1i(visualizerProgram.functionSizeUniform, 0);
	}
}


function castRay(screenX, screenY) {
	var x = screenX * 2.0 / gl.canvas.width - 1.0;
	var y = 1.0 - screenY * 2.0 / gl.canvas.height;
	
	mat4.multiply(filmToWorld, sMatrix, vMatrix);
	mat4.invert(filmToWorld, filmToWorld);

	vec4.transformMat4(camEye, [0, 0, 0, 1], vMatrixInv);

	// rayDir = farWorld temporarily
	vec4.transformMat4(rayDir, [x, y, -1, 1], filmToWorld);
	vec4.subtract(rayDir, rayDir, camEye);
	vec4.normalize(rayDir, rayDir);

	var radius;
	var center = vec4.create();
	var obj;
	for (var i = 0; i < audioObjects.length; ++i) {
		radius = 0.15;
		obj = audioObjects[i];
		// if (obj.inUse) {
			// radius = 0.9;
		// }
		vec4.transformMat4(center, [0, 0, 0, 1], obj.model);
		if (Sphere.intersectsRay(camEye, rayDir, center, radius)) {
			obj.selected = true;
		} else {
			obj.selected = false;
			
		}
	}

	// console.log(vec4.str(rayDir));
}

/////////////////////////////////////////////////////////////////////
/////////////////////////// KEY MOVEMNTS ////////////////////////////
/////////////////////////////////////////////////////////////////////

function handleKeys() {
	/* potentially add continuous forces or
	   animations based on key positions */
}

////////////////////////////////////////////////////////////////////
/////////////////////////// RENDER LOOP ////////////////////////////
////////////////////////////////////////////////////////////////////

/**
 * Renders the scene to the canvas
 */
function drawScene() {
	
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	if (cubemapInitialized && objectsInitialized) {
		drawCubeMap();
		drawShapes();
	}

}

function drawCubeMap() {
	if (!cubemapRendered) {
		cubemapRendered = true;
		return;
	}

	if (!cubemapInitialized)
		return;

	gl.useProgram(cubemapProgram);

	var step = Float32Array.BYTES_PER_ELEMENT;

	// bind the buffer and set the uniforms
	gl.bindBuffer(gl.ARRAY_BUFFER, cubemapVBO);
	var stride = step * cubemapVBO.itemSize;
	gl.vertexAttribPointer(cubemapProgram.positionAttribute, 3, gl.FLOAT, false, stride, 0);

	setCubemapUniforms();
	gl.depthMask(gl.FALSE);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, cubemapVBO.numItems);

	gl.depthMask(true);
	gl.useProgram(null);
	
}

function drawShapes() {
	if (!objectsInitialized)
		return;

	gl.useProgram(visualizerProgram);

	sphere.bindBuffer(gl, visualizerProgram.positionAttribute,
						  visualizerProgram.normalAttribute,
						  visualizerProgram.texCoordAttribute);
	setShapeCameraAndTextureUniforms();

	// send the audio data to the shader then draw the sphere
	for (var i = 0; i < audioObjects.length; i++) {
		setShapeFunctionUniforms(audioObjects[i]);
		sphere.render(gl);
	}
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
	drawScene();
}

function initVisuals () {
	canvas = document.getElementById("canvas");
	initGL(canvas);
	initShaders();
	initShapes();
	initBuffers();
	initTextures();

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

	// canvas = document.getElementById("canvas");
	// canvasCtx = canvas.getContext('2d');

	// canvas.width = window.innerWidth;
	// canvas.height = window.innerHeight;

	// resize the canvas to fill browser window dynamically
	window.onresize = resizeCanvas;
	
	resizeCanvas();
	tick();
}