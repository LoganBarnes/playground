/*
 * Explain file yo.
 */

/////////////////////////////////////////////////////////////////////
///////////////////////////// VARIABLES /////////////////////////////
/////////////////////////////////////////////////////////////////////

var AudioObj = makeStruct("id analyser panner buffer dataArray sound inUse model color, muted, selected");

var audioContext;
var listener;

var audioScale = 0.2;

var bellURL = "res/audio/ogg/bells.ogg";
var pianoURL = "res/audio/ogg/piano.ogg";
var guitarURL = "res/audio/ogg/guitar.ogg";
var bassURL = "res/audio/ogg/bass.ogg";
var drumURL = "res/audio/ogg/drums.ogg";

var bells = new AudioObj("", null, null, null, null, null, false, mat4.create(), [1, 1, 1], false, false);
var piano = new AudioObj("", null, null, null, null, null, false, mat4.create(), [1, 1, 1], false, false);
var guitar = new AudioObj("", null, null, null, null, null, false, mat4.create(), [1, 1, 1], false, false);
var bass = new AudioObj("", null, null, null, null, null, false, mat4.create(), [1, 1, 1], false, false);
var drums = new AudioObj("", null, null, null, null, null, false, mat4.create(), [1, 1, 1], false, false);

var audioObjects = [bells, piano, guitar, bass, drums];

// true if any music is playing
var playing = false;

var bufferDivisor;

var audioInitialized;

var filmToWorld = mat4.create();
var vMatrixInv = mat4.create();

var camEye = vec4.create();
var rayDir = vec4.create();

/////////////////////////////////////////////////////////////////////
/////////////////////////// MOUSE EVENTS ////////////////////////////
/////////////////////////////////////////////////////////////////////

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

var moonRotationMatrix = mat4.create();
mat4.identity(moonRotationMatrix);

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
	var newX = event.clientX;
	var newY = event.clientY;

	if (!mouseDown) {
		castRay(newX, newY);
		return;
	}

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

var firstPressSpace = false;

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
			event.preventDefault();
			if (!firstPressSpace && !playing) {
				playSound();
				firstPressSpace = true;
			} else if (!firstPressSpace && playing) {
				stopSound();
			}
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
			firstPressSpace = false;
			break;
		default:
			break;
	}
}


/////////////////////////////////////////////////////////////////////
/////////////////////////////// MAIN ////////////////////////////////
/////////////////////////////////////////////////////////////////////

function main() {
	initAudio();
	initVisuals();

}