
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = ".";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

/*
 * Create a sub LibGL class to override functions and add
 * advanced functionality without having to completely
 * recreate a new WebGL setup.
 */
 function FFTLibGL(vid) {
 	LibGL.call(this);

 	this.TEX_WIDTH = 256;
 	this.TEX_HEIGHT = 256;

 	this.currTexture = "vid";
 	this.currFilter = "filter0";

 	if (vid) {
		this.video = vid;
		this.video.width = this.TEX_WIDTH;
		this.video.height = this.TEX_HEIGHT;
		this.video.autoplay = true;

		var mediaOptions = { audio: false, video: true };

		if (!navigator.getUserMedia) {
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
		}

		if (!navigator.getUserMedia){
			return alert('getUserMedia not supported in this browser.');
		}

		var webcam = this.video;
		navigator.getUserMedia(mediaOptions, 
			function(stream){
				webcam.src = window.URL.createObjectURL(stream);
			}, function(e) {
				console.log(e);
			}
		);
 	} else {
 		this.video = null;
 	}
 };

// make FFTLibGL a subclass
FFTLibGL.prototype = Object.create(LibGL.prototype);
// Set the "constructor" property to refer to FFTLibGL
FFTLibGL.prototype.constructor = FFTLibGL;


/*
                                                                                               
   d888888o.       ,o888888o.     8 8888 `8.`888b           ,8' 8 8888888888   8 888888888o.   
 .`8888:' `88.  . 8888     `88.   8 8888  `8.`888b         ,8'  8 8888         8 8888    `88.  
 8.`8888.   Y8 ,8 8888       `8b  8 8888   `8.`888b       ,8'   8 8888         8 8888     `88  
 `8.`8888.     88 8888        `8b 8 8888    `8.`888b     ,8'    8 8888         8 8888     ,88  
  `8.`8888.    88 8888         88 8 8888     `8.`888b   ,8'     8 888888888888 8 8888.   ,88'  
   `8.`8888.   88 8888         88 8 8888      `8.`888b ,8'      8 8888         8 888888888P'   
    `8.`8888.  88 8888        ,8P 8 8888       `8.`888b8'       8 8888         8 8888`8b       
8b   `8.`8888. `8 8888       ,8P  8 8888        `8.`888'        8 8888         8 8888 `8b.     
`8b.  ;8.`8888  ` 8888     ,88'   8 8888         `8.`8'         8 8888         8 8888   `8b.   
 `Y8888P ,88P'     `8888888P'     8 888888888888  `8.`          8 888888888888 8 8888     `88. 
*/

FFTLibGL.prototype.setSolverUniforms = function(smb, program, args) {
	this.gl.uniform1i(this.getUniform(program, "uFFT"), args[0]);
	this.gl.uniform1i(this.getUniform(program, "uRows"), args[1]);
	this.gl.uniform2f(this.getUniform(program, "uTexDim"), this.TEX_WIDTH, this.TEX_HEIGHT);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(args[2]));
	this.gl.uniform1i(this.getUniform(program, "uTexture"), 0);
}

/*
 *
 */
FFTLibGL.prototype.doFFT = function() {

	// solve for the dft
	var program = "solver";
	this.useProgram(program);

	// solve rows
	this.bindFramebuffer("solverBuffer", "temp");
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this), [true, true, "orig"]);

	// solve cols
	this.bindFramebuffer("solverBuffer", "fft");
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this), [true, false, "temp"]);

	// find max value of fft
	program = "reduce";
	this.useProgram(program);

	// reduce rows
	this.bindFramebuffer("reduceBuffer1", "reduce1");
	this.gl.viewport(0, 0, this.TEX_WIDTH, 1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this), [true, true, "fft"]);

	// reduce cols
	this.bindFramebuffer("reduceBuffer2", "reduce2");
	this.gl.viewport(0, 0, 1, 1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this), [false, false, "reduce1"]);
}

/*
 *
 */
FFTLibGL.prototype.doIFFT = function() {

	// solve for the original image
	var program = "solver";
	this.useProgram(program);

	// solve rows
	this.bindFramebuffer("solverBuffer", "temp");
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this), [false, true, "edit"]);

	// solve cols
	this.bindFramebuffer("solverBuffer", "ifft");
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this), [false, false, "temp"]);
}


/*
                                                                
8 8888         ,o888888o.         ,o888888o.     8 888888888o   
8 8888      . 8888     `88.    . 8888     `88.   8 8888    `88. 
8 8888     ,8 8888       `8b  ,8 8888       `8b  8 8888     `88 
8 8888     88 8888        `8b 88 8888        `8b 8 8888     ,88 
8 8888     88 8888         88 88 8888         88 8 8888.   ,88' 
8 8888     88 8888         88 88 8888         88 8 888888888P'  
8 8888     88 8888        ,8P 88 8888        ,8P 8 8888         
8 8888     `8 8888       ,8P  `8 8888       ,8P  8 8888         
8 8888      ` 8888     ,88'    ` 8888     ,88'   8 8888         
8 888888888888 `8888888P'         `8888888P'     8 8888         
*/

/*
 * The repeating 'update' function called each frame by requestAnimFrame()
 */
FFTLibGL.prototype.tick = function() {
	// call this function again on the next frame
	// requestFrame(this.tick.bind(this), 5000);
	window.setTimeout(this.tick.bind(this), 1000/20);

	// console.log("tick");

	this.handleInput();
	this.render();
}

FFTLibGL.prototype.setDrawUniforms = function(smb, program, args) {
	this.gl.uniform1i(this.getUniform(program, "uSwitchX"), args[0]);
	this.gl.uniform1i(this.getUniform(program, "uToBW"), args[1]);

	this.gl.uniform1i(this.getUniform(program, "uIsFFT"), args[2]);
	this.gl.uniform1f(this.getUniform(program, "uThreshold"), 0.0);

	this.gl.uniform1i(this.getUniform(program, "uFilter"), args[3]);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(args[4]));
	this.gl.uniform1i(this.getUniform(program, "uTexture"), 0);

	this.gl.activeTexture(this.gl.TEXTURE1);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(args[5]));
	this.gl.uniform1i(this.getUniform(program, "uMaxTex"), 1);
}

FFTLibGL.prototype.drawToBuffer = function(buffer, texture, program, callback, args) {
	this.bindFramebuffer(buffer, texture);
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setDrawUniforms.bind(this), args);
}

FFTLibGL.prototype.drawToScreen = function(x, y, program, args) {
	this.bindFramebuffer(null, "");
	this.gl.viewport(x, y, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.renderBuffer("fullQuad", program, this.setDrawUniforms.bind(this), args);
}

/*
 * Sets the camera and lights for the specified program then renders all shapes in the scene.
 * @Override
 */
FFTLibGL.prototype.renderScene = function(program) {

	// draw video
	this.useProgram(program);
	this.drawToBuffer("origBuffer", "orig", program, this.setDrawUniforms.bind(this), [(this.currTexture == "vid" ? true : false), true, false, false, this.currTexture, "reduce2"]);
	this.drawToScreen(0, this.TEX_HEIGHT, program, [false, false, false, false, "orig", "reduce2"]);

	// solve for frequency domain
	this.doFFT();

	// draw fft
	this.useProgram(program);
	this.drawToScreen(this.TEX_WIDTH, this.TEX_HEIGHT, program, [false, false, true, false, "fft", "reduce2"]);

	// filter fft
	this.drawToBuffer("editBuffer", "edit", program, this.setDrawUniforms.bind(this), [false, false, false, true, "fft", this.currFilter]);
	this.drawToScreen(this.TEX_WIDTH, 0, program, [false, false, true, false, "edit", "reduce2"]);

	// solve for the spectral domain
	this.doIFFT();

	// draw image
	this.useProgram(program);
	this.drawToScreen(0, 0, program, [false, false, false, false, "ifft", "reduce2"]);
}

/*
 * Called on every frame. Renders everything needed for the current frame.
 */
FFTLibGL.prototype.render = function() {

	// console.log(this.gl.viewportWidth + ", " + this.gl.viewportHeight);
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// render the textures and solve
	this.renderScene("default");

	// update the video texture if possible
	if (this.video && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
		this.handleVideoTexture("vid");
	}
}

/*
 * Completes any required initialization before the update/render loop begins
 */
FFTLibGL.prototype.onStartTick = function() {
	// show the canvas and remove the loading screen
	this.show("page", true);
	this.show("loading", false);

	// set the canvas size and begin the update/render loop
	this.resizeCanvas();
	this.tick();
}


/*
                                                                          
 8 8888 b.             8 8 888888888o   8 8888      88 8888888 8888888888 
 8 8888 888o.          8 8 8888    `88. 8 8888      88       8 8888       
 8 8888 Y88888o.       8 8 8888     `88 8 8888      88       8 8888       
 8 8888 .`Y888888o.    8 8 8888     ,88 8 8888      88       8 8888       
 8 8888 8o. `Y888888o. 8 8 8888.   ,88' 8 8888      88       8 8888       
 8 8888 8`Y8o. `Y88888o8 8 888888888P'  8 8888      88       8 8888       
 8 8888 8   `Y8o. `Y8888 8 8888         8 8888      88       8 8888       
 8 8888 8      `Y8o. `Y8 8 8888         ` 8888     ,8P       8 8888       
 8 8888 8         `Y8o.` 8 8888           8888   ,d8P        8 8888       
 8 8888 8            `Yo 8 8888            `Y88888P'         8 8888       
*/

FFTLibGL.prototype.setButtonActions = function() {

	var fftLib = this;
	document.getElementById("vid_button").onclick = function() {
		fftLib.currTexture = "vid";
	}
	document.getElementById("earth_button").onclick = function() {
		fftLib.currTexture = "earth";
	}
	document.getElementById("logo_button").onclick = function() {
		fftLib.currTexture = "logo";
	}
	document.getElementById("grass_button").onclick = function() {
		fftLib.currTexture = "grass";
	}
	document.getElementById("lenna_button").onclick = function() {
		fftLib.currTexture = "lenna";
	}
	document.getElementById("sine_button").onclick = function() {
		fftLib.currTexture = "sine";
	}
	document.getElementById("stripes_button").onclick = function() {
		fftLib.currTexture = "stripes";
	}
	document.getElementById("monkey_button").onclick = function() {
		fftLib.currTexture = "monkey";
	}

	// filters
	document.getElementById("filter0_button").onclick = function() {
		fftLib.currFilter = "filter0";
	}
	document.getElementById("filter1_button").onclick = function() {
		fftLib.currFilter = "filter1";
	}
	document.getElementById("filter2_button").onclick = function() {
		fftLib.currFilter = "filter2";
	}
	document.getElementById("filter3_button").onclick = function() {
		fftLib.currFilter = "filter3";
	}
	document.getElementById("filter4_button").onclick = function() {
		fftLib.currFilter = "filter4";
	}
	document.getElementById("filter5_button").onclick = function() {
		fftLib.currFilter = "filter5";
	}
	document.getElementById("filter6_button").onclick = function() {
		fftLib.currFilter = "filter6";
	}
	document.getElementById("filter7_button").onclick = function() {
		fftLib.currFilter = "filter7";
	}
	document.getElementById("filter8_button").onclick = function() {
		fftLib.currFilter = "filter8";
	}
	document.getElementById("filter9_button").onclick = function() {
		fftLib.currFilter = "filter9";
	}
	document.getElementById("filter10_button").onclick = function() {
		fftLib.currFilter = "filter10";
	}
	document.getElementById("filter11_button").onclick = function() {
		fftLib.currFilter = "filter11";
	}
	document.getElementById("filter12_button").onclick = function() {
		fftLib.currFilter = "filter12";
	}
	document.getElementById("filter13_button").onclick = function() {
		fftLib.currFilter = "filter13";
	}
	document.getElementById("filter14_button").onclick = function() {
		fftLib.currFilter = "filter14";
	}
	document.getElementById("filter15_button").onclick = function() {
		fftLib.currFilter = "filter15";
	}
}


/*
                                                                             
   d888888o.   8 8888888888 8888888 8888888888 8 8888      88 8 888888888o   
 .`8888:' `88. 8 8888             8 8888       8 8888      88 8 8888    `88. 
 8.`8888.   Y8 8 8888             8 8888       8 8888      88 8 8888     `88 
 `8.`8888.     8 8888             8 8888       8 8888      88 8 8888     ,88 
  `8.`8888.    8 888888888888     8 8888       8 8888      88 8 8888.   ,88' 
   `8.`8888.   8 8888             8 8888       8 8888      88 8 888888888P'  
    `8.`8888.  8 8888             8 8888       8 8888      88 8 8888         
8b   `8.`8888. 8 8888             8 8888       ` 8888     ,8P 8 8888         
`8b.  ;8.`8888 8 8888             8 8888         8888   ,d8P  8 8888         
 `Y8888P ,88P' 8 888888888888     8 8888          `Y88888P'   8 8888         
*/

/*
 * Stores a video texture.
 */
FFTLibGL.prototype.handleVideoTexture = function(textName) {
	var texture = this.getTexture(textName);
	this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
	this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
	this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.video);
	this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

/*
 * Loads all necessary shaders.
 * @Override
 */
FFTLibGL.prototype.initShaders = function() {

	// default shaders
	this.addProgram("default", variable.theme_url + "/res/shaders/default.vert", variable.theme_url + "/res/shaders/default.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uIsFFT", "uMaxTex", "uThreshold", "uFilter",
					 "uTexture", "uSwitchX", "uToBW"]);

	// solver shaders
	this.addProgram("solver", variable.theme_url + "/res/shaders/solver.vert", variable.theme_url + "/res/shaders/solver.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture", "uTexDim", "uFFT", "uRows"]);

	// reduce shaders
	this.addProgram("reduce", variable.theme_url + "/res/shaders/reduce.vert", variable.theme_url + "/res/shaders/reduce.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture", "uTexDim", "uFFT", "uRows"]);
}

/*
 * Loads all necessary textures.
 * @Override
 */
FFTLibGL.prototype.initTextures = function() {

	// images
	this.addTexture("earth", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/earth.jpg", true);
	this.addTexture("logo", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/webgl-logo.png", true);
	this.addTexture("grass", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/grass.png", true);
	this.addTexture("lenna", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/lenna.png", true);
	this.addTexture("sine", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/sine.png", true);
	this.addTexture("stripes", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/stripes.png", true);
	this.addTexture("monkey", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/monkey.jpg", true);

	// filters
	this.addTexture("filter0", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter0.png", true);
	this.addTexture("filter1", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter1.png", true);
	this.addTexture("filter2", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter2.png", true);
	this.addTexture("filter3", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter3.png", true);
	this.addTexture("filter4", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter4.png", true);
	this.addTexture("filter5", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter5.png", true);
	this.addTexture("filter6", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter6.png", true);
	this.addTexture("filter7", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter7.png", true);
	this.addTexture("filter8", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter8.png", true);
	this.addTexture("filter9", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter9.png", true);
	this.addTexture("filter10", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter10.png", true);
	this.addTexture("filter11", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter11.png", true);
	this.addTexture("filter12", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter12.png", true);
	this.addTexture("filter13", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter13.png", true);
	this.addTexture("filter14", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter14.png", true);
	this.addTexture("filter15", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/filters/filter15.png", true);

	
	// fft textures
	this.addTexture("orig", null, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.FLOAT, null);
	this.addTexture("fft", null, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.FLOAT, null);
	this.addTexture("edit", null, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.FLOAT, null);
	this.addTexture("ifft", null, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.FLOAT, null);

	this.addTexture("temp", null, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.FLOAT, null);


	var data = new Uint8Array(this.TEX_WIDTH * this.TEX_HEIGHT * 4);
	for (var i = 0; i < data.length; ++i) {
		data[i*4+0] = 126;
		data[i*4+1] = 126;
		data[i*4+2] = 126;
		data[i*4+3] = 255;
	}
	this.addTexture("vid", data, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.UNSIGNED_BYTE, null);
	this.setTextureParams("vid", this.gl.LINEAR, this.gl.LINEAR, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);

	this.addTexture("reduce1", null, this.TEX_WIDTH, 1, this.gl.FLOAT, null);
	this.addTexture("reduce2", null, 1, 1, this.gl.FLOAT, null);

	this.addFramebuffer("origBuffer", this.TEX_WIDTH, this.TEX_HEIGHT);
	this.addFramebuffer("editBuffer", this.TEX_WIDTH, this.TEX_HEIGHT);

	this.addFramebuffer("solverBuffer", this.TEX_WIDTH, this.TEX_HEIGHT);
	this.addFramebuffer("reduceBuffer1", this.TEX_WIDTH, 1);
	this.addFramebuffer("reduceBuffer2", 1, 1);
}

/*
 * Creates a scene of basic primitive shapes and lights.
 * @Override
 */
FFTLibGL.prototype.setScene = function() {

	// add shapes
	var trans = mat4.create();

	// fullscreen quad
	mat4.identity(trans);

	data = [ 1.0,  1.0,
			-1.0,  1.0,
			 1.0, -1.0,
			-1.0, -1.0];
	this.addBuffer("fullQuad", data, 2, trans, [1, 1, 1], [0, 0, 0, 0], "", this.gl.TRIANGLE_STRIP);
}

/*
 * The function specifying what to do when the window is resized.
 * @Override
 */
FFTLibGL.prototype.resizeCanvas = function() {
	this.resize(this.TEX_WIDTH * 2, this.TEX_HEIGHT * 2);
	this.render();
}

/*
 * 'main' function where program starts
 */
function main() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var vid = document.getElementById("video");

	var fftLibGL = new FFTLibGL(vid);
	fftLibGL.init(canvas, canvas_div, ["OES_texture_float"]);

	fftLibGL.setButtonActions();

	fftLibGL.start();
}





