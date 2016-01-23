
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = ".";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

var PROGRAM_METHOD = 0; // uber shader
// var PROGRAM_METHOD = 1; // mixed
// var PROGRAM_METHOD = 2; // multiple programs

var PI = 3.141592653589793;

function next_pow2(x) {
	return Math.pow(2, Math.ceil(Math.log(x)/Math.log(2)));
}

/*
 * Solving modes
 */
var SolveMode = Object.freeze({

	UNMAPPED: 			0,
	HOG: 				1,
	NORM: 				2,
	FEATURES: 			3,
	FIND: 				4,
	REDUCE1: 			5,
	REDUCE2: 			6,
	NUM_SOLVE_MODES: 	7

});

var Hog = function(imageWidth, imageHeight, cellSize, hogTexName, normTexName) {
    this.dimension = 31;
    this.numOrientations = 9;
    this.cellSize = cellSize;

    // textures
    this.hogTex = hogTexName;
    this.normTex = normTexName;
// 
    // sizes
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.hogWidth = Math.floor((this.imageWidth + Math.floor(this.cellSize / 2)) / this.cellSize);
    this.hogHeight = Math.floor((this.imageHeight + Math.floor(this.cellSize / 2)) / this.cellSize);

    this.texWidth = this.hogWidth * 5;
    this.texHeight = this.hogHeight;

    this.featTexWidth = this.hogWidth * 4;
    this.featTexHeight = this.hogHeight * 2;

    this.texWidth2 = next_pow2(this.texWidth);
    this.texHeight2 = next_pow2(this.texHeight);

    console.log(this.hogWidth + ", " + this.hogHeight);
	}

/*
 * Create a sub LibGL class to override functions and add
 * advanced functionality without having to completely
 * recreate a new WebGL setup.
 */
 var FaceLibGL = function(vid) {
 	LibGL.call(this);

 	this.TEX_WIDTH = 128;
 	this.TEX_HEIGHT = 128;

 	this.wLoaded = false;

 	this.hog = new Hog(this.TEX_WIDTH, this.TEX_HEIGHT, 3, "hog", "norm");

	this.frameData = new Float32Array(20);

	this.corners = [-0.1, -0.1,
					-0.1, -0.1,
					-0.1, -0.1,
					-0.1, -0.1,
					-0.1, -0.1];

 	this.currTexture = "lenna";

 	if (vid) {
	 	this.currTexture = "vid";
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

// make FaceLibGL a subclass
FaceLibGL.prototype = Object.create(LibGL.prototype);
// Set the "constructor" property to refer to FaceLibGL
FaceLibGL.prototype.constructor = FaceLibGL;


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

FaceLibGL.prototype.setSolverUniforms = function(smb, program, args) {
	this.gl.uniform1i(this.getUniform(program, "uSolveMode"), args[0]);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(args[1]));
	this.gl.uniform1i(this.getUniform(program, "uTexture1"), 0);
	this.gl.uniform2f(this.getUniform(program, "uTexDim1"), args[2], args[3]);

	this.gl.uniform2i(this.getUniform(program, "uWorkDim"), args[4], args[5]);

	this.gl.activeTexture(this.gl.TEXTURE1);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(args[6]));
	this.gl.uniform1i(this.getUniform(program, "uTexture2"), 1);
	this.gl.uniform2f(this.getUniform(program, "uTexDim2"), args[7], args[8]);

	// this.gl.uniform2f(this.getUniform(program, "uOtherDim"), args[9], args[10]);
}


/*
 *
 */
FaceLibGL.prototype.doHOG_uber = function() {

	// solve for the original image
	var program = "solver";
	this.useProgram(program);

	// calculate unmapped
	this.bindFramebuffer("unmappedBuffer", "unmapped");
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.UNMAPPED, "orig", this.TEX_WIDTH, this.TEX_HEIGHT,
		this.TEX_WIDTH - 2, this.TEX_HEIGHT - 2,
		"", this.hog.hogWidth, this.hog.hogHeight]);

// // TEMPORARILY PRINTING RESULTS
// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
// 	var unmappedArray = new Float32Array((this.TEX_WIDTH) * (this.TEX_HEIGHT) * 4);
// 	this.gl.readPixels(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.RGBA, this.gl.FLOAT, unmappedArray);
// 	console.log("Unmapped:");
// 	console.log(unmappedArray);
// }

// calculate hog
this.bindFramebuffer("hogBuffer", "hog");
this.gl.viewport(0, 0, this.hog.texWidth, this.hog.texHeight);
this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
	[SolveMode.HOG, "unmapped", this.TEX_WIDTH - 2, this.TEX_WIDTH - 2,
	this.hog.texWidth, this.hog.texHeight, "", 0, 0]);

// // TEMPORARILY PRINTING RESULTS
// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
// 	var hogArray = new Float32Array(this.hog.texWidth * this.hog.texHeight * 4);
// 	this.gl.readPixels(0, 0, this.hog.texWidth, this.hog.texHeight, this.gl.RGBA, this.gl.FLOAT, hogArray);
// 	console.log("Hog:");
// 	console.log(hogArray);
// }

// calculate norm
this.bindFramebuffer("normBuffer", "norm");
this.gl.viewport(0, 0, this.hog.hogWidth, this.hog.hogHeight);
this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
	[SolveMode.NORM, "hog", this.hog.texWidth, this.hog.texHeight,
	this.hog.hogWidth, this.hog.hogHeight, "", 0, 0]);

// // TEMPORARILY PRINTING RESULTS
// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
// 	var normArray = new Float32Array(this.hog.hogWidth * this.hog.hogHeight * 4);
// 	this.gl.readPixels(0, 0, this.hog.hogWidth, this.hog.hogHeight, this.gl.RGBA, this.gl.FLOAT, normArray);
// 	console.log("Norm:");
// 	console.log(normArray);
// }

// calculate features
this.bindFramebuffer("featBuffer", "feat");
this.gl.viewport(0, 0, this.hog.featTexWidth, this.hog.featTexHeight);
this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
	[SolveMode.FEATURES, "hog", this.hog.texWidth, this.hog.texHeight,
	this.hog.featTexWidth, this.hog.featTexHeight,
	"norm", this.hog.hogWidth, this.hog.hogHeight]);

// TEMPORARILY PRINTING RESULTS
if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
	var featArray = new Float32Array(this.hog.featTexWidth * this.hog.featTexHeight * 4);
	this.gl.readPixels(0, 0, this.hog.featTexWidth, this.hog.featTexHeight, this.gl.RGBA, this.gl.FLOAT, featArray);
	console.log("Feat:");
	console.log(featArray);
}

// find faces
this.bindFramebuffer("findBuffer", "find");
this.gl.viewport(0, 0, this.hog.hogWidth - 12, this.hog.hogHeight - 12);
this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
	[SolveMode.FIND, "feat", this.hog.featTexWidth, this.hog.featTexHeight,
	this.hog.hogWidth - 12, this.hog.hogHeight - 12,
	"w", 12 * 4, 12 * 2]);


// // TEMPORARILY PRINTING RESULTS
// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
// 	var findArray = new Float32Array((this.hog.hogWidth - 12) * (this.hog.hogHeight - 12) * 4);
// 	this.gl.readPixels(0, 0, this.hog.hogWidth - 12, this.hog.hogHeight - 12, this.gl.RGBA, this.gl.FLOAT, findArray);
// 	console.log("Find:");
// 	console.log(findArray);
// }

// reduce 1
this.bindFramebuffer("reduceBuffer1", "reduce1");
this.gl.viewport(0, 0, this.hog.hogWidth - 12, 1);
this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
	[SolveMode.REDUCE1, "find", this.hog.hogWidth - 12, this.hog.hogHeight - 12,
	this.hog.hogWidth - 12, 1, "", 0, 0]);

// reduce 2
this.bindFramebuffer("reduceBuffer2", "reduce2");
this.gl.viewport(0, 0, 1, 1);
this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
	[SolveMode.REDUCE2, "reduce1", this.hog.hogWidth - 12, 1,
	1, 1, "", 0, 0]);
}


/*
 *
 */
FaceLibGL.prototype.doHOG_mixed = function() {

	// calculate unmapped
	var program = "prep";
	this.useProgram(program);

	this.bindFramebuffer("unmappedBuffer", "unmapped");
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.UNMAPPED, "orig", this.TEX_WIDTH, this.TEX_HEIGHT,
		this.TEX_WIDTH - 2, this.TEX_HEIGHT - 2,
		"", this.hog.hogWidth, this.hog.hogHeight]);

	// // TEMPORARILY PRINTING RESULTS
	// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
	// 	var unmappedArray = new Float32Array((this.TEX_WIDTH) * (this.TEX_HEIGHT) * 4);
	// 	this.gl.readPixels(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.RGBA, this.gl.FLOAT, unmappedArray);
	// 	console.log("Unmapped:");
	// 	console.log(unmappedArray);
	// }

	// calculate hog	
	var program = "hog";
	this.useProgram(program);

	this.bindFramebuffer("hogBuffer", "hog");
	this.gl.viewport(0, 0, this.hog.texWidth, this.hog.texHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.HOG, "unmapped", this.TEX_WIDTH - 2, this.TEX_WIDTH - 2,
		this.hog.texWidth, this.hog.texHeight, "", 0, 0]);

	// // TEMPORARILY PRINTING RESULTS
	// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
	// 	var hogArray = new Float32Array(this.hog.texWidth * this.hog.texHeight * 4);
	// 	this.gl.readPixels(0, 0, this.hog.texWidth, this.hog.texHeight, this.gl.RGBA, this.gl.FLOAT, hogArray);
	// 	console.log("Hog:");
	// 	console.log(hogArray);
	// }

	// calculate norm
	this.bindFramebuffer("normBuffer", "norm");
	this.gl.viewport(0, 0, this.hog.hogWidth, this.hog.hogHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.NORM, "hog", this.hog.texWidth, this.hog.texHeight,
		this.hog.hogWidth, this.hog.hogHeight, "", 0, 0]);

	// // TEMPORARILY PRINTING RESULTS
	// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
	// 	var normArray = new Float32Array(this.hog.hogWidth * this.hog.hogHeight * 4);
	// 	this.gl.readPixels(0, 0, this.hog.hogWidth, this.hog.hogHeight, this.gl.RGBA, this.gl.FLOAT, normArray);
	// 	console.log("Norm:");
	// 	console.log(normArray);
	// }

	// calculate features
	var program = "extract";
	this.useProgram(program);

	this.bindFramebuffer("featBuffer", "feat");
	this.gl.viewport(0, 0, this.hog.featTexWidth, this.hog.featTexHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.FEATURES, "hog", this.hog.texWidth, this.hog.texHeight,
		this.hog.featTexWidth, this.hog.featTexHeight,
		"norm", this.hog.hogWidth, this.hog.hogHeight]);

	// // TEMPORARILY PRINTING RESULTS
	// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
	// 	var featArray = new Float32Array(this.hog.featTexWidth * this.hog.featTexHeight * 4);
	// 	this.gl.readPixels(0, 0, this.hog.featTexWidth, this.hog.featTexHeight, this.gl.RGBA, this.gl.FLOAT, featArray);
	// 	console.log("Feat:");
	// 	console.log(featArray);
	// }

	// find faces
	var program = "find";
	this.useProgram(program);

	this.bindFramebuffer("findBuffer", "find");
	this.gl.viewport(0, 0, this.hog.hogWidth - 12, this.hog.hogHeight - 12);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.FIND, "feat", this.hog.featTexWidth, this.hog.featTexHeight,
		this.hog.hogWidth - 12, this.hog.hogHeight - 12,
		"w", 12 * 4, 12 * 2]);


	// // TEMPORARILY PRINTING RESULTS
	// if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
	// 	var reduce1Array = new Float32Array((this.hog.hogWidth - 12) * (this.hog.hogHeight - 12) * 4);
	// 	this.gl.readPixels(0, 0, this.hog.hogWidth - 12, this.hog.hogHeight - 12, this.gl.RGBA, this.gl.FLOAT, reduce1Array);
	// 	console.log("Find1:");
	// 	console.log(reduce1Array);
	// }

	// reduce 1
	this.bindFramebuffer("reduceBuffer1", "reduce1");
	this.gl.viewport(0, 0, this.hog.hogWidth - 12, 1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.REDUCE1, "find", this.hog.hogWidth - 12, this.hog.hogHeight - 12,
		this.hog.hogWidth - 12, 1, "", 0, 0]);

	// reduce 2
	this.bindFramebuffer("reduceBuffer2", "reduce2");
	this.gl.viewport(0, 0, 1, 1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setSolverUniforms.bind(this),
		[SolveMode.REDUCE2, "reduce1", this.hog.hogWidth - 12, 1,
		1, 1, "", 0, 0]);
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

var totalTime = 0;

var num_iterations = 1000;
var counter = num_iterations / 2;

/*
 * The repeating 'update' function called each frame by requestAnimFrame()
 */
FaceLibGL.prototype.tick = function() {
	// call this function again on the next frame
	// requestFrame(this.tick.bind(this), 5000);


	window.setTimeout(this.tick.bind(this), 1000/60);

	this.handleInput();
	var t0 = performance.now();
	this.render();
	var t1 = performance.now();

	if (counter >= num_iterations)
	{
		counter = 0;
		if (PROGRAM_METHOD == 0)
			console.log("Render function average completion time (uber): " + (totalTime / num_iterations));
		else if (PROGRAM_METHOD == 1)
			console.log("Render function average completion time (mixed): " + (totalTime / num_iterations));
		else if (PROGRAM_METHOD == 2)
			console.log("Render function average completion time (multiple): " + (totalTime / num_iterations));
		totalTime = 0;
	}

	totalTime += (t1 - t0);
	counter++;	

}

FaceLibGL.prototype.setDrawUniforms = function(smb, program, args) {
	this.gl.uniform1i(this.getUniform(program, "uFrame"), args[0]);
	this.gl.uniform1i(this.getUniform(program, "uSwitchX"), args[1]);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(args[2]));
	this.gl.uniform1i(this.getUniform(program, "uTexture"), 0);
}

FaceLibGL.prototype.drawToBuffer = function(buffer, texture, program, callback, args) {
	this.bindFramebuffer(buffer, texture);
	this.gl.viewport(0, 0, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setDrawUniforms.bind(this), args);
}

FaceLibGL.prototype.drawToScreen = function(x, y, program, bufferName, args) {
	this.bindFramebuffer(null, "");
	this.gl.viewport(x, y, this.TEX_WIDTH, this.TEX_HEIGHT);
	this.renderBuffer(bufferName, program, this.setDrawUniforms.bind(this), args);
}

/*
 * Sets the camera and lights for the specified program then renders all shapes in the scene.
 * @Override
 */
FaceLibGL.prototype.renderScene = function(program) {

	// create save image to appropriately sized texture
	this.useProgram(program);
	this.drawToBuffer("origBuffer", "orig", program, this.setDrawUniforms.bind(this), [false, (this.currTexture == "vid" ? true : false), this.currTexture]);
	this.drawToScreen(0, 0, program, "fullQuad", [false, false, "orig"]);

	// solve for frequency domain
	if (PROGRAM_METHOD == 0)
		this.doHOG_uber();
	else if (PROGRAM_METHOD == 1)
		this.doHOG_mixed();
	else if (PROGRAM_METHOD == 2)
		this.doHOG_programs();

	this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.FLOAT, this.frameData);
	// console.log("Confidence: " + this.frameData[0]);
	// console.log(this.frameData);

	this.corners[0] = this.frameData[1] * 3;
	this.corners[1] = this.frameData[2] * 3;
	this.corners[2] = this.corners[0];
	this.corners[3] = this.corners[1] + 36;
	this.corners[4] = this.corners[0] + 36;
	this.corners[5] = this.corners[1] + 36;
	this.corners[6] = this.corners[0] + 36;
	this.corners[7] = this.corners[1];
	this.corners[8] = this.corners[0];
	this.corners[9] = this.corners[1];
	for (var i = 0; i < 5; ++i) {
		this.corners[i*2  ] /= this.TEX_WIDTH;
		this.corners[i*2+1] /= this.TEX_HEIGHT;
	}
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers["frame"].vbo);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.corners), this.gl.DYNAMIC_DRAW);

	// draw gradient image
	this.useProgram(program);
	this.drawToScreen(0, 0, program, "frame", [true, false, "orig"]);
}

/*
 * Called on every frame. Renders everything needed for the current frame.
 */
FaceLibGL.prototype.render = function() {

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
FaceLibGL.prototype.onStartTick = function() {
	// show the canvas and remove the loading screen
	this.show("page", true);
	this.show("loading", false);

	// set the canvas size and begin the update/render loop
	this.resizeCanvas();
	this.tick();
}



/*
 * Continuously checks if the shaders are initialized then starts
 * the update/render loop once the program is ready.
 * @Override
 */
FaceLibGL.prototype.continueLoadingScreen = function() {
	
	if (this.isTicking) {
		this.onStartTick();
		return;
	}

	// call this function again on the next frame
	this.requestId = requestAnimFrame(this.continueLoadingScreen.bind(this));

	// check if the shaders are done loading
	if (this.isAllProgramsInitialized() && this.wLoaded) {
		this.isTicking = true;
	}
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

FaceLibGL.prototype.setButtonActions = function() {

	var fftLib = this;
	document.getElementById("vid_button").onclick = function() {
		fftLib.currTexture = "vid";
	}
	document.getElementById("lenna_button").onclick = function() {
		fftLib.currTexture = "lenna";
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
FaceLibGL.prototype.handleVideoTexture = function(textName) {
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
FaceLibGL.prototype.initShaders = function() {

	// default shaders
	this.addProgram("default", variable.theme_url + "/res/shaders/default.vert", variable.theme_url + "/res/shaders/default.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uFrame", "uSwitchX", "uTexture"]);

if (PROGRAM_METHOD == 0) {
	// solver shaders
	this.addProgram("solver", variable.theme_url + "/res/shaders/solver.vert", variable.theme_url + "/res/shaders/solver.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture1", "uTexture2", "uTexDim1", "uTexDim2", "uWorkDim", "uSolveMode"]);
} else if (PROGRAM_METHOD == 1) {
	// solver shaders
	this.addProgram("prep", variable.theme_url + "/res/shaders/solver.vert", variable.theme_url + "/res/shaders/prep.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture1", "uTexture2", "uTexDim1", "uTexDim2", "uWorkDim", "uSolveMode"]);

	// solver shaders
	this.addProgram("hog", variable.theme_url + "/res/shaders/solver.vert", variable.theme_url + "/res/shaders/hog.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture1", "uTexture2", "uTexDim1", "uTexDim2", "uWorkDim", "uSolveMode"]);

	// solver shaders
	this.addProgram("extract", variable.theme_url + "/res/shaders/solver.vert", variable.theme_url + "/res/shaders/extract.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture1", "uTexture2", "uTexDim1", "uTexDim2", "uWorkDim", "uSolveMode"]);

	// solver shaders
	this.addProgram("find", variable.theme_url + "/res/shaders/solver.vert", variable.theme_url + "/res/shaders/find_reduce.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture1", "uTexture2", "uTexDim1", "uTexDim2", "uWorkDim", "uSolveMode"]);
}
}

/*
 * Loads all necessary textures.
 * @Override
 */
FaceLibGL.prototype.initTextures = function() {

	// images
	this.addTexture("lenna", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/lenna.png", true);
	this.setTextureParams("lenna", this.gl.LINEAR, this.gl.LINEAR, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);
	
	// TODO: LOAD TEXTURE FROM FILE
	var w = new Float32Array(12 * 12 * 32);
	var faceLibGL = this;
	loadFile(variable.theme_url + "/res/data/w.mat", w,
		function(fileText, w) {

			var size = 12 * 12 * 32;
			var lines = fileText.split('\n');
			for(var i = 0; i < lines.length; i++) {
				if (i >= size)
					break;
				w[i] = parseFloat(lines[i]);
			}

			faceLibGL.addTexture("w", w, 12 * 4, 12 * 2, faceLibGL.gl.FLOAT, null);
			faceLibGL.setTextureParams("w", faceLibGL.gl.NEAREST, faceLibGL.gl.NEAREST, faceLibGL.gl.CLAMP_TO_EDGE, faceLibGL.gl.CLAMP_TO_EDGE);

			faceLibGL.wLoaded = true;
		} ,
		function(url) {
			console.log("Failed to load '" + url + "'");
		}
	);

	// face textures
	this.addTexture("orig", null, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.FLOAT, null);
	this.addTexture("unmapped", null, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.FLOAT, null);

	this.addTexture("hog", null, this.hog.texWidth, this.hog.texHeight, this.gl.FLOAT, null);
	this.addTexture("norm", null, this.hog.hogWidth, this.hog.hogHeight, this.gl.FLOAT, null);
	this.addTexture("feat", null, this.hog.featTexWidth, this.hog.featTexHeight, this.gl.FLOAT, null);

	this.setTextureParams("hog", this.gl.NEAREST, this.gl.NEAREST, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);
	this.setTextureParams("norm", this.gl.NEAREST, this.gl.NEAREST, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);
	this.setTextureParams("feat", this.gl.NEAREST, this.gl.NEAREST, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);

	this.addTexture("find", null, this.hog.hogWidth - 12, this.hog.hogHeight - 12, this.gl.FLOAT, null);
	this.addTexture("reduce1", null, this.hog.hogWidth - 12, 1, this.gl.FLOAT, null);
	this.addTexture("reduce2", null, 1, 1, this.gl.FLOAT, null);

	this.setTextureParams("find", this.gl.NEAREST, this.gl.NEAREST, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);
	this.setTextureParams("reduce1", this.gl.NEAREST, this.gl.NEAREST, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);
	this.setTextureParams("reduce2", this.gl.NEAREST, this.gl.NEAREST, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);
	


	var data = new Uint8Array(this.TEX_WIDTH * this.TEX_HEIGHT * 4);
	for (var i = 0; i < data.length; ++i) {
		data[i*4+0] = 126;
		data[i*4+1] = 126;
		data[i*4+2] = 126;
		data[i*4+3] = 255;
	}
	this.addTexture("vid", data, this.TEX_WIDTH, this.TEX_HEIGHT, this.gl.UNSIGNED_BYTE, null);
	this.setTextureParams("vid", this.gl.LINEAR, this.gl.LINEAR, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);

	// this.addTexture("reduce1", null, this.TEX_WIDTH, 1, this.gl.FLOAT, null);
	// this.addTexture("reduce2", null, 1, 1, this.gl.FLOAT, null);

	this.addFramebuffer("origBuffer", this.TEX_WIDTH, this.TEX_HEIGHT);
	this.addFramebuffer("unmappedBuffer", this.TEX_WIDTH, this.TEX_HEIGHT);
	this.addFramebuffer("hogBuffer", this.hog.texWidth, this.hog.texHeight);
	this.addFramebuffer("normBuffer", this.hog.hogWidth, this.hog.hogHeight);
	this.addFramebuffer("featBuffer", this.hog.featTexWidth, this.hog.featTexHeight);

	this.addFramebuffer("findBuffer", this.hog.hogWidth - 12, this.hog.hogHeight - 12);
	this.addFramebuffer("reduceBuffer1", this.hog.hogWidth - 12, 1);
	this.addFramebuffer("reduceBuffer2", 1, 1);
}

/*
 * Creates a scene of basic primitive shapes and lights.
 * @Override
 */
FaceLibGL.prototype.setScene = function() {

	// add shapes
	var trans = mat4.create();

	// fullscreen quad
	mat4.identity(trans);

	data = [ 1.0,  1.0,
			-1.0,  1.0,
			 1.0, -1.0,
			-1.0, -1.0];
	this.addBuffer("fullQuad", data, 2, trans, [1, 1, 1], [0, 0, 0, 0], "", this.gl.TRIANGLE_STRIP);

	this.addBuffer("frame", this.corners, 2, trans, [1, 1, 1], [0, 0, 0, 0], "", this.gl.LINE_STRIP);
}

/*
 * The function specifying what to do when the window is resized.
 * @Override
 */
FaceLibGL.prototype.resizeCanvas = function() {
	this.resize(this.TEX_WIDTH, this.TEX_HEIGHT);
	this.render();
	if (window.innerWidth < 1080) {
		this.gl.canvas.style.position = "absolute";
	} else {
		this.gl.canvas.style.position = "fixed";
	}
}

/*
 * 'main' function where program starts
 */
function main() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var vid = document.getElementById("video");

	var faceLibGL = new FaceLibGL(null);
	// var faceLibGL = new FaceLibGL(vid);
	faceLibGL.init(canvas, canvas_div, ["OES_texture_float"]);

	faceLibGL.setButtonActions();

	// alert("need to load 'w' texture from file still");

	faceLibGL.start();
}





