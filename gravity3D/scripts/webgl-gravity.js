
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = ".";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

/*
 * Create a sub LibGL class to override functions and add
 * advanced functionality without having to completely
 * recreate a new WebGL setup.
 */
 function GravityLibGL() {
 	LibGL.call(this);

 	this.TEXTURE_SIZE = 128;
	this.MAX_PARTICLES = this.TEXTURE_SIZE * this.TEXTURE_SIZE;

	this.gridSize = 25;
	this.gridSize2 = this.gridSize * this.gridSize;

	this.totalParticles = 0;

	this.pixData = new Float32Array(4);
	this.pixDataFull = new Float32Array(this.MAX_PARTICLES * 4);
	this.pixDataPos = new Uint8Array(this.MAX_PARTICLES);
	this.oldDeltaTime = 0.1;

	this.viewModelMatrix = mat4.create();

	this.addParticleBlock = false;
	this.clearParticles = false;

	this.oldPoint = vec3.create();

	this.paused = false;
 };

// make GravityLibGL a subclass
GravityLibGL.prototype = Object.create(LibGL.prototype);
// Set the "constructor" property to refer to GravityLibGL
GravityLibGL.prototype.constructor = GravityLibGL;



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

/*
 * Returns the point where the mouse intersects the camera plane
 * passing through the origin.
 */
GravityLibGL.prototype.getPoint = function(mousePos) {

	var newPoint = vec3.create();

	var scaleViewInv = mat4.create();
	mat4.multiply(scaleViewInv, this.getScaleMatrix(), this.getViewMatrix());
	mat4.invert(scaleViewInv, scaleViewInv);

	var eye = this.getEye();

	// get the mouse ray into the scene
	var ray = this.getRayBare(eye, scaleViewInv, mousePos);

	// determine the intersection distance
	var n = vec3.create();
	vec3.normalize(n, eye);
	var t = -vec3.dot(n, eye) / vec3.dot(n, ray.d);

	// find the point based on the distance: p = ray.o + ray.d * t
	vec3.scale(newPoint, ray.d, t);
	vec3.add(newPoint, newPoint, ray.o);

	return vec3.clone(newPoint);
}

/*
 * Mouse Events
 */

GravityLibGL.prototype.handleMouseDown = function(mouseEvent) {
	this.mouseDown = true;
	var pos = this.getMousePos(mouseEvent);

	this.oldPoint = this.getPoint(pos);

	this.lastMouseX = pos.x;
	this.lastMouseY = pos.y;
}

GravityLibGL.prototype.handleMouseWheel = function(mouseEvent) {
	mouseEvent.preventDefault(); // no page scrolling when using the canvas

	var delta = mouseEvent.wheelDelta;
	if (!delta) {
		delta = mouseEvent.deltaY;
	} else {
		delta *= 0.5;
	}
	var scale = vec3.length(this.getEye());
	scale = Math.log(scale * 0.1 + 1.0) * 0.1;

	if (this.moveCamera) {
		this.updateZoomZ(delta);
		if (this.getZoomZ() > -0.001)
			this.setZoomZ(-0.001);
	} else {
		var trans = vec3.create();

		// look translation
		vec3.scale(trans, this.getLook(), delta);
		mat4.translate(this.getBuffer("indices").trans, this.getBuffer("indices").trans, trans);
	}

	this.updateView();
}

GravityLibGL.prototype.handleMouseMove = function(mouseEvent) {
	
	if (!this.mouseDown) {
		return;
	}
	var pos = this.getMousePos(mouseEvent);

	var deltaX = pos.x - this.lastMouseX;
	var deltaY = pos.y - this.lastMouseY;

	// change camera position
	if (this.moveCamera) {
		// mouse wheel: zoom
		if (mouseEvent.button == 1) {
			var scale = vec3.length(this.getEye());
			scale = Math.log(scale * 0.1 + 1.0) * -0.5;

			this.updateZoomZ(deltaY * scale);
			if (this.getZoomZ() > -0.001)
				this.setZoomZ(-0.001);
		} else { // other buttons: orbit origin	
			this.updateAngleX(deltaX * 0.25);
			this.updateAngleY(deltaY * 0.25);
		}
	} else { // move particles
		var trans = vec3.create();
		var newPoint = this.getPoint(pos);

		vec3.subtract(trans, newPoint, this.oldPoint);

		mat4.translate(this.getBuffer("indices").trans, this.getBuffer("indices").trans, trans);

		this.oldPoint = vec3.clone(newPoint);
	}

	this.lastMouseX = pos.x
	this.lastMouseY = pos.y;

	this.updateView();
}

/*
 * Key Events
 */

GravityLibGL.prototype.handleKeyUp = function(keyEvent) {
	this.currentlyPressedKeys[keyEvent.keyCode] = false;
	switch(keyEvent.keyCode) {
		case 16: // shift
			this.moveCamera = false;
			break;
		case 32: // space
			this.spaceDown = false;
			this.addParticleBlock = true;
			break;
		case 65: // A
			var axesElement = this.HTMLElements["axes"];
			axesElement.checked = !axesElement.checked;
			break;
		case 67: // C
			var collideElement = this.HTMLElements["collide"];
			collideElement.checked = !collideElement.checked;
			break;
		case 79: // O
			var trackerElement = this.HTMLElements["tracker"];
			trackerElement.checked = !trackerElement.checked;
			break;
		case 80: // P
			this.paused = !this.paused;
			if (!this.paused)
			{
				this.HTMLElements["error"].innerHTML = "";
				this.lastTime = new Date().getTime() - 20;
				this.tick();
			} else {
				this.HTMLElements["error"].innerHTML = "<p>PAUSED</p>";
			}
			break;
		case 82: // R
			this.clearParticles = true;
			break;
		case 88: // X
			this.setAngleX(-90);
			this.setAngleY(0);
			this.updateView();
			break;
		case 89: // Y
			this.setAngleX(0);
			this.setAngleY(90);
			this.updateView();
			break;
		case 90: // Z
			this.setAngleX(0);
			this.setAngleY(0);
			this.updateView();
			break;
		default:
			// console.log(keyEvent.keyCode);
			break;
	}
}

GravityLibGL.prototype.setAddBlockTrue = function() {
	this.addParticleBlock = true;
}
GravityLibGL.prototype.setClearParticlesTrue = function() {
	this.clearParticles = true;
}

GravityLibGL.prototype.setUpButtons = function() {
	var gravLib = this;
	this.HTMLElements["block_button"].onclick = function() { gravLib.setAddBlockTrue(); };
	this.HTMLElements["clear_button"].onclick = function() { gravLib.setClearParticlesTrue(); };
}

GravityLibGL.prototype.logslider = function(slider, outMin, outMax, log) {
	// position will be between 0 and 100
	var minp = slider.min;
	var maxp = slider.max;

	// The result should be between 100 an 10000000
	var minv = Math.log(outMin);
	var maxv = Math.log(outMax);

	// calculate adjustment factor
	var scale = (maxv-minv) / (maxp-minp);

	if (log) {
		return Math.exp(minv + scale*(slider.value-minp));
	} else {
		return (Math.log(value)-minv)/scale + min;
	}
}

/*
 * Gets called on every frame and updates settings
 * based on currently pressed keys.
 */
GravityLibGL.prototype.handleInput = function() {}


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

/*
 * Set uniforms for respective programs
 */

GravityLibGL.prototype.setParticleUniforms = function(buf, program, args) {
	this.gl.uniform1f(this.getUniform(program, "uDensity"), this.HTMLElements["density"].value);
	this.gl.uniform1i(this.getUniform(program, "uDetectCollisions"), this.HTMLElements["collide"].checked);
	this.gl.uniform1f(this.getUniform(program, "uGravityConstant"), this.HTMLElements["gravity"].value);

	this.gl.uniform2f(this.getUniform(program, "uViewport"), this.TEXTURE_SIZE, this.TEXTURE_SIZE);
	this.gl.uniform1f(this.getUniform(program, "uDeltaTime"), Math.min(args[0], 0.1));
	this.gl.uniform1f(this.getUniform(program, "uOldDeltaTime"), Math.min(this.oldDeltaTime, 0.1));
	
	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture("curr"));
	this.gl.uniform1i(this.getUniform(program, "uCurrPositions"), 0);

	this.gl.activeTexture(this.gl.TEXTURE1);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture("prev"));
	this.gl.uniform1i(this.getUniform(program, "uPrevPositions"), 1);

	this.gl.uniform1i(this.getUniform(program, "uNumParticles"), this.getBuffer("indices").vbo.numItems);
}

GravityLibGL.prototype.setReduceUniforms = function(buf, program, args) {
	this.gl.uniform1i(this.getUniform(program, "uInitialReduce"), args[0]);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(args[1]));
	this.gl.uniform1i(this.getUniform(program, "uTexture"), 0);
}

/*
 * Solve for particle positions then determine number of particles.
 */
GravityLibGL.prototype.updateParticles = function(deltaTime) {

	// use previous particle positions to determine velocity
	var temp = this.textures["prev"];
	this.textures["prev"] = this.textures["curr"];
	this.textures["curr"] = this.textures["new"];
	this.textures["new"] = temp;

	// solve for particle positions
	var program = "solver";
	this.useProgram(program);

	this.bindFramebuffer("solverBuffer", "new");
	this.gl.viewport(0, 0, this.TEXTURE_SIZE, this.TEXTURE_SIZE);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setParticleUniforms.bind(this), [deltaTime]);

	// find total number of particles
	program = "reduce";
	this.useProgram(program);

	// reduce rows
	this.bindFramebuffer("reduceBuffer1", "reduce1");
	this.gl.viewport(0, 0, this.TEXTURE_SIZE, 1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setReduceUniforms.bind(this), [true, "new"]);

	// reduce cols
	this.bindFramebuffer("reduceBuffer2", "reduce2");
	this.gl.viewport(0, 0, 1, 1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	this.renderBuffer("fullQuad", program, this.setReduceUniforms.bind(this), [false, "reduce1"]);

	// read pixel data
	if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE) {
		this.updateHTML();
	}
}

/*
 * Updates the dynamic HTML info
 */
GravityLibGL.prototype.updateHTML = function() {
	// reduce framebuffer is currently bound when this is called
	this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.FLOAT, this.pixData);
	this.totalParticles = this.pixData[3];

	var str = "<p>Total Particles: " +
				this.totalParticles + "<br>";// +
				// this.pixData[0] + "<br>" +
				// this.pixData[1] + "<br>" +
				// this.pixData[2] + "<br>"
				// "</p>";

	// read biggest particle position
	this.bindFramebuffer("solverBuffer", "new");
	this.gl.readPixels(this.pixData[0], this.pixData[1], 1, 1, this.gl.RGBA, this.gl.FLOAT, this.pixData);

	var mass = this.pixData[3];
	// str += "(" + this.pixData[0].toFixed(2) + ", " +
	// 			 this.pixData[1].toFixed(2) + ", " +
	// 			 this.pixData[2].toFixed(2) + ", " +
	// 			 mass.toFixed(2) + ")" +
	// 			"</p>";
	str += "Mass of largest particle: " + mass + "</p>";

	this.HTMLElements["info"].innerHTML = str;

	// set origin to most massive particle position
	if (this.HTMLElements["tracker"].checked) {

		this.pixData[3] = 1.0;
		vec4.transformMat4(this.pixData, this.pixData, this.getBuffer("indices").trans);

		vec3.scale(this.pixData, this.pixData, -1);
		mat4.translate(this.getBuffer("indices").trans, this.getBuffer("indices").trans, this.pixData);
	}
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
GravityLibGL.prototype.tick = function() {
	// call this function again on the next frame
	if (!this.paused) {
		requestAnimFrame(this.tick.bind(this));
	}

	if (this.addParticleBlock) {
		this.createParticleBlock();
		this.addParticleBlock = false;
	}

	// update time example
	var timeNow = new Date().getTime(); // milliseconds
	var deltaTime = (timeNow - this.lastTime) / 1000.0; // seconds
	this.lastTime = timeNow;

	// this.handleInput();

	deltaTime *= this.HTMLElements["timeScale"].value;

	var solvesPerFrame = this.HTMLElements["speed"].value
	for (var i = 0; i < solvesPerFrame; ++i) {
		this.updateParticles(deltaTime);
		this.oldDeltaTime = deltaTime;
	}

	this.render();

	if (this.clearParticles) {
		this.clear();
		this.clearParticles = false;
	}
}

/*
 * Completes any required initialization before the update/render loop begins
 * @Override
 */
GravityLibGL.prototype.onStartTick = function() {
	// show the canvas and remove the loading screen
	this.show("page", true);
	this.show("loading", false);

	this.lastTime = new Date().getTime();

	// set the canvas size and begin the update/render loop
	this.resizeCanvas();
	this.tick();
}

/*
 * Sets the uniforms for the point buffer
 */
GravityLibGL.prototype.setPointUniforms = function(smb, program, args) {
	mat4.multiply(this.viewModelMatrix, this.getViewMatrix(), smb.trans);

	this.gl.uniformMatrix4fv(this.getUniform(program, "uPMatrix"), false, this.getProjMatrix());
	this.gl.uniformMatrix4fv(this.getUniform(program, "uMVMatrix"), false, this.viewModelMatrix);

	this.gl.uniform1f(this.getUniform(program, "uDensity"), this.HTMLElements["density"].value);
	this.gl.uniform1f(this.getUniform(program, "uTextureSize"), this.TEXTURE_SIZE);
	this.gl.uniform1i(this.getUniform(program, "uScreenHeight"), window.innerHeight);
}

/*
 * Sets the camera and lights for the specified program then renders all shapes in the scene.
 * @Override
 */
GravityLibGL.prototype.renderScene = function(program) {
	if (this.HTMLElements["axes"].checked) {
		program = "sparse"
		this.useProgram(program);
		this.gl.uniformMatrix4fv(this.getUniform(program, "uPVMatrix"), false, this.camera.projViewMatrix);
		this.renderPrimitives(program, this.setShapeUniforms.bind(this), []);
		this.renderBuffer("grid", program, this.setShapeUniforms.bind(this), []);
	}

	program = "points"
	this.useProgram(program);
	this.renderBuffer("indices", program, this.setPointUniforms.bind(this), []);
}

/*
 * Called on every frame. Renders everything needed for the current frame.
 * @Override
 */
GravityLibGL.prototype.render = function() {
	// bind null buffer
	this.bindFramebuffer(null, "");

	// set the viewport and clear the buffers
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// render the environment and shapes
	this.renderScene("");
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
 * Loads all necessary shaders.
 * @Override
 */
GravityLibGL.prototype.initShaders = function() {

	// sparse shaders
	this.addProgram("sparse", variable.theme_url + "/res/shaders/sparse.vert", variable.theme_url + "/res/shaders/sparse.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uPVMatrix", "uMMatrix", "uColor"]);

	// point shaders
	this.addProgram("points", variable.theme_url + "/res/shaders/points.vert", variable.theme_url + "/res/shaders/points.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uPMatrix", "uMVMatrix", "uTextureSize", "uScreenHeight",
					 "uTexture", "uDensity"]);

	// solver shaders
	this.addProgram("solver", variable.theme_url + "/res/shaders/solver.vert", variable.theme_url + "/res/shaders/solver.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uCurrPositions", "uPrevPositions", "uNumParticles",
					"uViewport", "uDeltaTime", "uOldDeltaTime", "uDetectCollisions",
					"uGravityConstant", "uDensity"]);

	this.addProgram("reduce", variable.theme_url + "/res/shaders/reduce.vert", variable.theme_url + "/res/shaders/reduce.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uTexture", "uInitialReduce"]);
}

/*
 * Loads all necessary textures.
 * @Override
 */
GravityLibGL.prototype.initTextures = function() {
	
	var pos = new Float32Array(this.MAX_PARTICLES * 4);

	for (var i = 0; i < this.TEXTURE_SIZE; i++) {
		for (var j = 0; j < this.TEXTURE_SIZE; j++) {
			var index = (i * this.TEXTURE_SIZE + j) * 4;
			pos[index  ] = 0.0;
			pos[index+1] = 0.0;
			pos[index+2] = 0.0;
			pos[index+3] = 0.0;
		}
	}
	this.addTexture("new", pos, this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, null);
	this.addTexture("curr", pos, this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, null);
	this.addTexture("prev", pos, this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, null);

	// textures and buffers for solving and analyzing particles
	this.addTexture("reduce1", null, this.TEXTURE_SIZE, 1, this.gl.FLOAT, null);
	this.addTexture("reduce2", null, 1, 1, this.gl.FLOAT, null);

	this.addFramebuffer("solverBuffer", this.TEXTURE_SIZE, this.TEXTURE_SIZE);
	this.addFramebuffer("reduceBuffer1", this.TEXTURE_SIZE, 1);
	this.addFramebuffer("reduceBuffer2", 1, 1);
}

GravityLibGL.prototype.clear = function() {
	var pos = new Float32Array(this.MAX_PARTICLES * 4);

	for (var i = 0; i < this.TEXTURE_SIZE; i++) {
		for (var j = 0; j < this.TEXTURE_SIZE; j++) {
			var index = (i * this.TEXTURE_SIZE + j) * 4;
			pos[index  ] = 0.0;
			pos[index+1] = 0.0;
			pos[index+2] = 0.0;
			pos[index+3] = 0.0;
		}
	}

	this.updateTextureArray("new", this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, pos);
	this.updateTextureArray("curr", this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, pos);
	this.updateTextureArray("prev", this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, pos);

	this.getBuffer("indices").vbo.numItems = 0;
	this.totalParticles = 0;

	mat4.identity(this.viewModelMatrix);
}

/*
 * Creates a new block of particles at the origin.
 */
GravityLibGL.prototype.createParticleBlock = function() {
	this.HTMLElements["error"].innerHTML = "";

	var origin = [0, 0, 0, 1];
	vec4.transformMat4(origin, origin, this.getBuffer("indices").trans);

	this.gridSize = this.HTMLElements["block"].value;
	this.gridSize2 = this.gridSize * this.gridSize;
	var mass = this.HTMLElements["mass"].value;
	var sizeScale = (Math.log(mass) + 1) * 4.0;

	this.bindFramebuffer("solverBuffer", "new");
	this.gl.readPixels(0, 0, this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.RGBA, this.gl.FLOAT, this.pixDataFull);

	// original positions
	var i = 0;
	for (var b = 0; b < this.gridSize; b++) {
		for (var r = 0; r < this.gridSize; r++) {
			for (var c = 0; c < this.gridSize; c++) {

				while (i < this.MAX_PARTICLES && this.pixDataFull[i*4+3] > 0.0) {
					this.pixDataPos[i] = 1;
					++i;
				}

				if (i >= this.MAX_PARTICLES) {
					this.HTMLElements["error"].innerHTML =  "<p>Can't add that many new particles<br>" + 
															"Maximum allowed particles: 16384</p>";
					break;
				}

				this.pixDataFull[i*4  ] = (c - (this.gridSize - 1) * 0.5) * sizeScale - origin[0];
				this.pixDataFull[i*4+1] = (r - (this.gridSize - 1) * 0.5) * sizeScale - origin[1];
				this.pixDataFull[i*4+2] = (b - (this.gridSize - 1) * 0.5) * sizeScale - origin[2];
				this.pixDataFull[i*4+3] = mass;
				
				this.pixDataPos[i] = 0;
				++i;
			}
		}
	}
	this.updateTextureArray("new", this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, this.pixDataFull);
	for (var x = i; x < this.MAX_PARTICLES; ++x) {
		if (this.pixDataFull[x*4+3] > 0.0) {
			this.pixDataPos[x] = 1;
			i = x;
		} else {
			this.pixDataPos[x] = 0;
		}
	}

	this.getBuffer("indices").vbo.numItems = i;

	this.bindFramebuffer("solverBuffer", "curr");
	this.gl.readPixels(0, 0, this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.RGBA, this.gl.FLOAT, this.pixDataFull);

	var tangent = vec3.create();
	var velocityMag = this.HTMLElements["velocity"].value;
	var randomCoeff = this.HTMLElements["random"].value;

	velocityMag *= sizeScale * 0.2;
	randomCoeff *= 2.0;

	velocityMag *= this.oldDeltaTime;
	randomCoeff *= this.oldDeltaTime;


	// 'previous' this.pixDataFullitions for velocity calculations
	i = 0;
	for (var b = 0; b < this.gridSize; b++) {
		for (var r = 0; r < this.gridSize; r++) {
			for (var c = 0; c < this.gridSize; c++) {

				while (i < this.MAX_PARTICLES && this.pixDataPos[i] == 1) {
					++i;
				}

				if (i >= this.MAX_PARTICLES) {
					break;
				}

				// original positions
				this.pixDataFull[i*4  ] = (c - (this.gridSize - 1) * 0.5) * sizeScale;
				this.pixDataFull[i*4+1] = (r - (this.gridSize - 1) * 0.5) * sizeScale;
				this.pixDataFull[i*4+2] = (b - (this.gridSize - 1) * 0.5) * sizeScale;
				this.pixDataFull[i*4+3] = mass;

				// tangential velocity corrections
				tangent[0] = -this.pixDataFull[i*4+2]; // -z
				tangent[1] = 0.0;
				tangent[2] =  this.pixDataFull[i*4  ]; //  x
				vec3.normalize(tangent, tangent);

				this.pixDataFull[i*4  ] += 	tangent[0] * velocityMag +  // velocity calculation
											(Math.random() - 0.5) * randomCoeff; // randomization
				this.pixDataFull[i*4+1] += 	tangent[1] * velocityMag +
											(Math.random() - 0.5) * randomCoeff;
				this.pixDataFull[i*4+2] += 	tangent[2] * velocityMag +
											(Math.random() - 0.5) * randomCoeff;

				this.pixDataFull[i*4  ] -= origin[0];
				this.pixDataFull[i*4+1] -= origin[1];
				this.pixDataFull[i*4+2] -= origin[2];

				++i;
			}
		}
	}
	this.updateTextureArray("curr", this.TEXTURE_SIZE, this.TEXTURE_SIZE, this.gl.FLOAT, this.pixDataFull);
}

/*
 * Creates a scene of basic primitive shapes and lights.
 * @Override
 */
GravityLibGL.prototype.setScene = function() {

	// don't need normals or texture for cylinder
	this.cylinder.createVBO(this.gl, false, false);

	// add shapes
	var trans = mat4.create();

	// add axes
	mat4.identity(trans);
	mat4.scale(trans, trans, [0.15, 1000.0, 0.15]);
	this.addPrimitive(ShapeType.CYLINDER, trans, [0.0, 0.7, 0.0, 1.0], [64.0, 0.0, 1.0, 0.0], "");

	mat4.identity(trans);
	mat4.rotateX(trans, trans, degToRad(90));
	mat4.scale(trans, trans, [0.15, 1000.0, 0.15]);
	this.addPrimitive(ShapeType.CYLINDER, trans, [0.0, 0.0, 0.7, 1.0], [64.0, 0.0, 1.0, 0.0], "");

	mat4.identity(trans);
	mat4.rotateZ(trans, trans, degToRad(90));
	mat4.scale(trans, trans, [0.15, 1000.0, 0.15]);
	this.addPrimitive(ShapeType.CYLINDER, trans, [0.7, 0.0, 0.0, 1.0], [64.0, 0.0, 1.0, 0.0], "");

	// add grid
	mat4.identity(trans);

	var data = [];
	var curr;
	for (var i = 0; i <= 2000; i+=20) {
		curr = i - 1000;
		data.push(-1000); data.push(0); data.push(curr);
		data.push( 1000); data.push(0); data.push(curr);
		data.push(curr); data.push(0); data.push(-1000);
		data.push(curr); data.push(0); data.push( 1000);
	}
	this.addBuffer("grid", data, 3, trans, [0.25, 0.25, 0.25], [64.0, 0.0, 0.0, 0.0], "", this.gl.LINES);

	// add particle indices
	mat4.identity(trans);

	data = new Float32Array(this.MAX_PARTICLES);
	for (var i = 0; i < this.MAX_PARTICLES; i++) {
		data[i] = i;// + 0.5;
	}
	this.addBuffer("indices", data, 1, trans, [1, 1, 1], [64, 0, 1, 0], "new", this.gl.POINTS);
	this.getBuffer("indices").vbo.numItems = 0;

	// fullscreen quad
	mat4.identity(trans);

	data = [ 1.0,  1.0,
			-1.0,  1.0,
			 1.0, -1.0,
			-1.0, -1.0];
	this.addBuffer("fullQuad", data, 2, trans, [1, 1, 1], [0, 0, 0, 0], "", this.gl.TRIANGLE_STRIP);
}

/*
 * 'main' function where program starts
 */
function main() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var gravityLibGL = new GravityLibGL();
	gravityLibGL.init(canvas, canvas_div, ["OES_texture_float"]);
	gravityLibGL.addOrbitCam(-50.0, -45.0, 20.0, [0, 0, 0], 45.0, 1.0, 0.1, 5000.0);

	// html input
	gravityLibGL.addLinkedInput("timeScale", "timeScaleText");
	gravityLibGL.addLinkedInput("speed", "speedText");
	gravityLibGL.addLinkedInput("gravity", "gravityText");
	gravityLibGL.addLinkedInput("density", "densityText");
	gravityLibGL.addHTMLElement("collide");
	gravityLibGL.addHTMLElement("info");
	gravityLibGL.addHTMLElement("error");
	gravityLibGL.addHTMLElement("tracker");
	gravityLibGL.addHTMLElement("axes");
	gravityLibGL.addLinkedInput("block", "blockText");
	gravityLibGL.addLinkedInput("random", "randomText");
	gravityLibGL.addLinkedInput("mass", "massText");
	gravityLibGL.addLinkedInput("velocity", "velocityText");
	
	gravityLibGL.addHTMLElement("block_button");
	gravityLibGL.addHTMLElement("clear_button");
	gravityLibGL.setUpButtons();

	gravityLibGL.setTogglePanels([["settingsHeader", "settingsToggle"], ["controlsHeader", "controlsToggle"]]);


	gravityLibGL.start();
}



