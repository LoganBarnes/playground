/*
 * Explain yo.
 *
 */

////////////////////////////////////////////////////////////////////
//////////////////////////// BASIC SETUP ///////////////////////////
////////////////////////////////////////////////////////////////////

var shapes = [];

/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = ".";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

// the graphics contex
var gl;
var float_texture_ext;

/**
 * WebGL setup
 */
function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		float_texture_ext = gl.getExtension("OES_texture_float");
	} catch (e) {}

	if (!gl) {
		alert("These programs won't work without WebGL :-(. Try using a current version of Firefox or Chrome.");
	} else if (!float_texture_ext) {
		alert("Browser doesn't support the necessary texture extension sorry :-(")
	}

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	// Enable back-face culling, meaning only the front side of every face is rendered.
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	// Specify that the front face is represented by vertices in counterclockwise order (this is the default).
	gl.frontFace(gl.CCW);
}


var rayShaderInitialized = false;

var rayProgram;
/**
 * Loads all necessary shaders
 */
function initShaders() {
	//////////////////// ray shaders ////////////////////
	loadVertFragProgram(gl, variable.theme_url + "/res/shaders/fullquad.vert", variable.theme_url + "/res/shaders/render-ray.frag", function(program) {

		rayProgram = program;
		gl.useProgram(rayProgram);

		rayProgram.positionAttribute = gl.getAttribLocation(rayProgram, "aUV");
		gl.enableVertexAttribArray(rayProgram.positionAttribute);

		rayProgram.scaleViewInvUniform = gl.getUniformLocation(rayProgram, "uScaleViewInv");
		rayProgram.eyePosUniform = gl.getUniformLocation(rayProgram, "uEyePos");
		rayProgram.viewportUniform = gl.getUniformLocation(rayProgram, "uViewport");

		rayProgram.numShapesUniform = gl.getUniformLocation(rayProgram, "uNumShapes");

		rayProgram.lightLocationUniform = gl.getUniformLocation(rayProgram, "uLightLocation");
		rayProgram.useShadowsUniform = gl.getUniformLocation(rayProgram, "uUseShadows");
		rayProgram.brightnessUniform = gl.getUniformLocation(rayProgram, "uBrightness");
		// rayProgram.normalTexUniform = gl.getUniformLocation(rayProgram, "uNormalTex");

		rayShaderInitialized = true;
	});
}


var fullScreenQuadVBO;
/**
 * Initializes the vbos
 */
function initBuffers() {
	////////////////////// fullscreen vertices /////////////////////////
	fullScreenQuadVBO = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, fullScreenQuadVBO);

	var corners = [  1.0,  1.0,
					-1.0,  1.0,
				     1.0, -1.0,
				    -1.0, -1.0];
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
	fullScreenQuadVBO.itemSize = 2;
	fullScreenQuadVBO.numItems = corners.length / fullScreenQuadVBO.itemSize;
}


var Texture = Object.freeze({
	NORMAL:   0,
	PROJECTS: 1,
	ABOUT:    2,
	NUM_TEXTURES: 3
});

var textures = [];

/*
 *
 */
function handleSingleTexture(texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.FLOAT, texture.image);
	gl.bindTexture(gl.TEXTURE_2D, null);
}


function setUpTexture(initialArray, url) {
	var texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.FLOAT, initialArray);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// asynchronously load image
	texture.image = new Image();
	texture.image.onload = function() {
		handleSingleTexture(texture)
	}

	texture.image.src = url;

	return texture;
}


/*
 *
 */
function initTextures() {

	// for (var i = 0; i < TextureIndex.NUM_TEXTURES; ++i) {
		// textures.push(null);
	// }
	// textures[TextureIndex.NORMAL] = setUpTexture(new Float32Array([0.0, 0.0, 1.0]), variable.theme_url + "/images/bumps-normals.jpg");
}


function initScene() {
	var trans = mat4.create();
	var inv = mat4.create();

	shapes.push(new Shape(ShapeType.SPHERE, mat4.clone(trans), mat4.clone(inv), [1.0, 1.0, 1.0, 1.0], [64.0, 1.0, 0.0, 0.1]));

	mat4.identity(trans);
	mat4.translate(trans, trans, [0, -7, 0]);
	mat4.rotate(trans, trans, degToRad(90), [1, 0, 0]);
	mat4.scale(trans, trans, [15, 15, 1]);
	mat4.invert(inv, trans);
	shapes.push(new Shape(ShapeType.PLANE, mat4.clone(trans), mat4.clone(inv), [1.0, 1.0, 1.0, 1.0], [512.0, 1.0, 0.0, 0.1]));

	mat4.identity(trans);
	mat4.translate(trans, trans, [-5, 0, 0]);
	mat4.invert(inv, trans);
	shapes.push(new Shape(ShapeType.CONE, mat4.clone(trans), mat4.clone(inv), [1.0, 1.0, 1.0, 1.0], [64.0, 1.0, 0.0, 0.1]));

	mat4.identity(trans);
	mat4.rotate(trans, trans, degToRad(90), [0, 0, 1]);
	mat4.translate(trans, trans, [-5, 0, 0]);
	mat4.invert(inv, trans);
	shapes.push(new Shape(ShapeType.CYLINDER, mat4.clone(trans), mat4.clone(inv), [1.0, 1.0, 1.0, 1.0], [64.0, 1.0, 0.0, 0.1]));

	mat4.identity(trans);
	mat4.rotate(trans, trans, degToRad(180), [0, 0, 1]);
	mat4.translate(trans, trans, [-5, 0, 0]);
	mat4.invert(inv, trans);
	shapes.push(new Shape(ShapeType.HOLLOW_CYLINDER, mat4.clone(trans), mat4.clone(inv), [1.0, 1.0, 1.0, 1.0], [64.0, 1.0, 0.0, 0.1]));
	
	mat4.identity(trans);
	mat4.rotate(trans, trans, degToRad(270), [0, 0, 1]);
	mat4.translate(trans, trans, [-5, 0, 0]);
	mat4.invert(inv, trans);
	shapes.push(new Shape(ShapeType.CUBE, mat4.clone(trans), mat4.clone(inv), [1.0, 1.0, 1.0, 1.0], [128.0, 1.0, 0.0, 0.1]));

	// mat4.identity(trans);
	// mat4.translate(trans, trans, [3 * Math.cos(degToRad(lightAngle)), 10, 3 * Math.sin(degToRad(lightAngle))]);
	// mat4.scale(trans, trans, [0.1, 0.1, 0.1]);
	// mat4.invert(inv, trans);
	// shapes.push(new Shape(ShapeType.SPHERE, mat4.clone(trans), mat4.clone(inv), [1.0, 1.0, 1.0, 1.0], [64.0, 1.0, 0.0, 1.0]));
}

var shadowButton;
var brightnessSlider;
var brightnessValue;
function initControls() {
	shadowButton = document.querySelector(".shadows");
	brightnessSlider = document.querySelector(".brightness-slider");
	brightnessValue = document.querySelector(".brightness");

	brightnessSlider.oninput = function () {
		brightnessValue.innerHTML = brightnessSlider.value;
		console.log(brightnessSlider.value);
	};
}


// modelview and perspective matrices
var mMatrix = mat4.create();
var vMatrix = mat4.create();
var sMatrix = mat4.create();
var pMatrix = mat4.create();
var mvMatrix = mat4.create();

var pvMatrix = mat4.create();
var vMatrixInv = mat4.create();
var svMatrixInv = mat4.create();
var eyePos = vec4.create();

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
	zoomZ = -15.0;

	updateView();
}

function updateView() {
	mat4.identity(vMatrix);

	mat4.translate(vMatrix, vMatrix, [0, 0, zoomZ]);
	mat4.rotate(vMatrix, vMatrix, degToRad(angleY), [1, 0, 0]);
	mat4.rotate(vMatrix, vMatrix, degToRad(angleX), [0, 1, 0]);
	// mat4.rotate(vMatrix, vMatrix, degToRad(angleY), [1, 0, 0]);

	mat4.multiply(mvMatrix, vMatrix, mMatrix);

	// update look, up, and right
	var temp = mat4.create();
	mat4.rotate(temp, temp, degToRad(angleX), [0, -1, 0]);
	mat4.rotate(temp, temp, degToRad(angleY), [-1, 0, 0]);

	vec4.transformMat4(look, [0, 0, -1, 0], temp);
	vec4.transformMat4(up, [0, 1, 0, 0], temp);
	vec4.transformMat4(right, [1, 0, 0, 0], temp);

	// update eyePos and inverse matrices
	mat4.invert(vMatrixInv, vMatrix);
	vec4.transformMat4(eyePos, [0, 0, 0, 1], vMatrixInv);

	mat4.multiply(svMatrixInv, sMatrix, vMatrix);
	mat4.invert(svMatrixInv, svMatrixInv);
}

var fovy = 45;
var aspect = 1.0 / 0.56;
var near = 0.1;
var far = 100.0;
var H = far * Math.tan(degToRad(fovy));
var C = -near / far;

// set perspective matrix
function updatePerspective() {
	aspect = gl.viewportWidth / gl.viewportHeight;

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

	mat4.multiply(svMatrixInv, sMatrix, vMatrix);
	mat4.invert(svMatrixInv, svMatrixInv);

	mat4.multiply(pvMatrix, pMatrix, vMatrix);
}


////////////////////////////////////////////////////////////////////
///////////////////////// UNIFORM FUNCTIONS ////////////////////////
////////////////////////////////////////////////////////////////////

var lightAngle = 0.0;
function setRayUniforms() {
	gl.uniformMatrix4fv(rayProgram.scaleViewInvUniform, false, svMatrixInv);
	gl.uniform4fv(rayProgram.eyePosUniform, eyePos);
	gl.uniform2f(rayProgram.viewportUniform, gl.viewportWidth, gl.viewportHeight);

	lightAngle += 1.0;
	// gl.uniform3f(rayProgram.lightLocationUniform, 100 * Math.cos(degToRad(lightAngle)), 100, 100 * Math.sin(degToRad(lightAngle)));
	gl.uniform3f(rayProgram.lightLocationUniform, 3 * Math.cos(degToRad(lightAngle)), 10, 3 * Math.sin(degToRad(lightAngle)));
	// gl.uniform3f(rayProgram.lightLocationUniform, 0, 10, 0);

	var numShapes = shapes.length;

	// var trans = mat4.create();
	// mat4.identity(trans);
	// mat4.translate(trans, trans, [3 * Math.cos(degToRad(lightAngle)), 10, 3 * Math.sin(degToRad(lightAngle))]);
	// mat4.scale(trans, trans, [0.1, 0.1, 0.1]);
	// shapes[numShapes-1].trans = trans;
	// mat4.invert(trans, trans);
	// shapes[numShapes-1].inv = trans;


	var s;
	for (var i = 0; i < numShapes; ++i) {
		s = shapes[i];
		gl.uniform1i(gl.getUniformLocation(rayProgram, "shapes[" + i + "].type"), s.type);
		gl.uniformMatrix4fv(gl.getUniformLocation(rayProgram, "shapes[" + i + "].trans"), false, s.trans);
		gl.uniformMatrix4fv(gl.getUniformLocation(rayProgram, "shapes[" + i + "].inv"), false, s.inv);
		gl.uniform4fv(gl.getUniformLocation(rayProgram, "shapes[" + i + "].color"), s.color);
		gl.uniform4fv(gl.getUniformLocation(rayProgram, "shapes[" + i + "].settings"), s.settings);
	}

	gl.uniform1i(rayProgram.numShapesUniform, numShapes);

	// global settings:
	gl.uniform1i(rayProgram.useShadowsUniform, shadowButton.checked);
	gl.uniform1f(rayProgram.brightnessUniform, brightnessSlider.value);

	// console.log("\tBEGIN");
	// console.log(mat4.str(svMatrixInv));
	// console.log(vec4.str(eyePos));
	// console.log(gl.viewportWidth + ", " + gl.viewportHeight);
	// console.log(mat4.str(trans));
	// console.log(mat4.str(inv));
	// console.log(numShapes);

}



/////////////////////////////////////////////////////////////////////
////////////////////////// RAY FUNCTIONS ////////////////////////////
/////////////////////////////////////////////////////////////////////

// function getMousePos(canvas, evt) {
// 	var rect = canvas.getBoundingClientRect();
// 	return {
// 		x: evt.clientX - rect.left,
// 		y: evt.clientY - rect.top
// 	};
// }

var rayDir = vec4.create();
var rayDirInv, sign;

function castRay(mouseEvent) {

	var pos = getMousePos(gl.canvas, mouseEvent);
	if (!pos) {
		return;
	}

	var x = pos.x * 2.0 / gl.canvas.width - 1.0;
	var y = 1.0 - pos.y * 2.0 / gl.canvas.height;

	// rayDir = farWorld temporarily
	vec4.transformMat4(rayDir, [x, y, -1, 1], svMatrixInv);
	vec4.subtract(rayDir, rayDir, eyePos);
	vec4.normalize(rayDir, rayDir);

	return intersectWorld(eyePos, rayDir, shapes);
}

/////////////////////////////////////////////////////////////////////
/////////////////////////// MOUSE EVENTS ////////////////////////////
/////////////////////////////////////////////////////////////////////

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

// should move to util
function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

function getRayBare(viewInv, scaleViewInv, canvas, mouseEvent) {

	var pos = getMousePos(gl.canvas, mouseEvent);

	var x = pos.x * 2.0 / gl.canvas.width - 1.0;
	var y = 1.0 - pos.y * 2.0 / gl.canvas.height;

	var orig = vec4.create();
	vec4.transformMat4(orig, [0, 0, 0, 1], viewInv);

	var dir = vec4.create();
	vec4.transformMat4(dir, [x, y, -1, 1], scaleViewInv);
	vec4.subtract(dir, dir, orig);
	vec3.normalize(dir, dir);

	return {
		o: orig,
		d: dir
	}
}

function getRay(viewInv, scaleViewInv, canvas, mouseEvent) {

	var pos = getMousePos(gl.canvas, mouseEvent);

	var x = pos.x * 2.0 / gl.canvas.width - 1.0;
	var y = 1.0 - pos.y * 2.0 / gl.canvas.height;

	var orig = vec4.create();
	vec4.transformMat4(orig, [0, 0, 0, 1], viewInv);

	var dir = vec4.create();
	vec4.transformMat4(dir, [x, y, -1, 1], scaleViewInv);
	vec4.subtract(dir, dir, orig);
	vec4.normalize(dir, dir);

	dirInv = [1.0 / dir[0], 1.0 / dir[1], 1.0 / dir[2]];
	var sgn = [(dirInv[0] < 0.0 ? 1 : 0), (dirInv[1] < 0.0 ? 1 : 0), (dirInv[2] < 0.0 ? 1 : 0)];

	return {
		o: orig,
		d: dir,
		di: dirInv,
		sign: sgn
	}
}

function handleMouseDown(mouseEvent) {
	mouseDown = true;
	var pos = getMousePos(gl.canvas, mouseEvent);
	lastMouseX = pos.x;
	lastMouseY = pos.y;

	// var ray = getRayBare(vMatrixInv, svMatrixInv, gl.canvas, mouseEvent);

	// var t = (lightHeight - ray.o[1]) / ray.d[1];

	// vec3.scale(lightPos, ray.d, t);
	// vec3.add(lightPos, lightPos, ray.o);
}

function handleMouseUp(mouseEvent) {
	mouseDown = false;
	// var index = castRay(mouseEvent);
	// if (index != selected) {
		// selectIcon(index);
	// }
}

function handleMouseWheel(mouseEvent) {
	mouseEvent.preventDefault(); // no page scrolling when using the canvas

	if (moveCamera) {
		zoomZ += mouseEvent.deltaY * 0.03;
	} else {
		var trans = vec3.create();

		// look translation
		vec3.scale(trans, look, mouseEvent.deltaY * 0.03);
		mat4.translate(mMatrix, mMatrix, trans);
	}
	updateView();
}

function handleMouseMove(mouseEvent) {
	
	if (!mouseDown) {
		var indexBest = castRay(mouseEvent);

		var length = shapes.length;
		for (var i = 0; i < length; ++i) {
			shapes[i].settings[2] = 0.0;
		}
		if (indexBest[0] >= 0) {
			shapes[indexBest[0]].settings[2] = 1.0;
		}

		return;
	}

	var pos = getMousePos(gl.canvas, mouseEvent);

	// var translation
	var deltaX = pos.x - lastMouseX;
	var deltaY = pos.y - lastMouseY;

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

	lastMouseX = pos.x
	lastMouseY = pos.y;
}

/////////////////////////////////////////////////////////////////////
//////////////////////////// KEY EVENTS /////////////////////////////
/////////////////////////////////////////////////////////////////////

var currentlyPressedKeys = {};
var moveCamera = false;
var spaceDown = false;
var showGrid = true;

function handleKeyDown(keyEvent) {
	currentlyPressedKeys[keyEvent.keyCode] = true;
	switch(keyEvent.keyCode) {
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
			// console.log(keyEvent.keyCode);
			break;
	}
}


function handleKeyUp(keyEvent) {
	currentlyPressedKeys[keyEvent.keyCode] = false;
	switch(keyEvent.keyCode) {
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
		case 84: // space
			showGrid = !showGrid;
			break;
		default:
			// console.log(keyEvent.keyCode);
			break;
	}
}

function handleKeys() {}


////////////////////////////////////////////////////////////////////
/////////////////////////// RENDER LOOP ////////////////////////////
////////////////////////////////////////////////////////////////////

/**
 * Renders the scene to the canvas
 */
function render() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	renderRay();
}


function renderRay() {
	if (!rayShaderInitialized)
		return;

	gl.useProgram(rayProgram);

	gl.bindBuffer(gl.ARRAY_BUFFER, fullScreenQuadVBO);
	gl.vertexAttribPointer(rayProgram.positionAttribute, 2, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * fullScreenQuadVBO, 0);
	setRayUniforms();

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, fullScreenQuadVBO.numItems);
}

function tick() {
	requestAnimFrame(tick);
	render();
}


function resizeCanvas() {
	gl.canvas.width = canvas_div.offsetWidth;
	gl.canvas.height = canvas.width * 1.0;

	gl.viewportWidth = gl.canvas.width;
	gl.viewportHeight = gl.canvas.height;

	updatePerspective();

	render();
}


var startTicking = false;
function continueLoadingScreen() {
	if (startTicking) {
		show("loading_div", true);
		show("loading", false);
		resizeCanvas();
		tick();
		return;
	}

	requestAnimFrame(continueLoadingScreen);

	// update last time
	var lastTime = new Date().getTime();

	if (rayShaderInitialized)
		startTicking = true;
}

function show(id, value) {
	document.getElementById(id).style.display = value ? "block" : "none";
}

var canvas_div;
function main() {
	canvas_div = document.getElementById("canvas_div");
	var canvas = document.getElementById("canvas");
	initGL(canvas);
	initShaders();
	initBuffers();
	initTextures();
	initScene();
	initControls();

	setCamera();
	
	gl.clearColor(1.0, 0.0, 1.0, 1.0);

	// mouse and keyboard events
	canvas.onmousedown = handleMouseDown;
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;
	document.onwheel = handleMouseWheel;

	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;

	// resize the canvas to fill browser window dynamically
	window.onresize = resizeCanvas;
	
	continueLoadingScreen();
}




