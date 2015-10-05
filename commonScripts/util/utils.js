/*
 *
 * General util functions not necessarily related to WebGL.*
 *
 */


/*
 * Converts degrees to radians
 */
function degToRad(degrees) {
	return degrees * Math.PI / 180;
}


/*
 * Creates a new struct-like object with the specified variable names
 */
function makeStruct(names) {
	var names = names.split(' ');
	var count = names.length;

	function constructor() {
		for (var i = 0; i < count; i++) {
			this[names[i]] = arguments[i];
		}
	}
	return constructor;
}


/*
 * file and shader loading taken from David Roe's ingenious Stack Overflow answer at
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
 *	Handles calling loadFile() on multiple files.
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

// *Except this function. This is directly related to webgl.
/*
 * Creates a new gl program after loading and compiling a vertex and fragment shader pair.
 * Scripts that use this must have an initfunction that assigns the new program elsewhere or
 * it will be out of scope after the function returns.
 */
function loadVertFragProgram(gl, vertname, fragname, initFunction) {

	loadFiles([vertname, fragname], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		
		// store and compile the shaders
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.shaderSource(fragmentShader, shaderText[1]);

		gl.compileShader(vertexShader);
		gl.compileShader(fragmentShader);

		// make sure the shaders compiled successfully
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(vertexShader));
			return null;
		}
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(fragmentShader));
			return null;
		}

		// create and build the new program
		var program = gl.createProgram();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			alert("Could not initialize default shaders");
		}

		// program gets assigned to another var so it won't
		// be out of scope when the function finishes
		initFunction(program);

	}, function (url) { // loading failure callback
		alert('Failed to download "' + url + '"');
	}); 
	
}
