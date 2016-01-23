
/*
                                                .         .                                                                
    ,o888888o.           .8.                   ,8.       ,8.          8 8888888888   8 888888888o.            .8.          
   8888     `88.        .888.                 ,888.     ,888.         8 8888         8 8888    `88.          .888.         
,8 8888       `8.      :88888.               .`8888.   .`8888.        8 8888         8 8888     `88         :88888.        
88 8888               . `88888.             ,8.`8888. ,8.`8888.       8 8888         8 8888     ,88        . `88888.       
88 8888              .8. `88888.           ,8'8.`8888,8^8.`8888.      8 888888888888 8 8888.   ,88'       .8. `88888.      
88 8888             .8`8. `88888.         ,8' `8.`8888' `8.`8888.     8 8888         8 888888888P'       .8`8. `88888.     
88 8888            .8' `8. `88888.       ,8'   `8.`88'   `8.`8888.    8 8888         8 8888`8b          .8' `8. `88888.    
`8 8888       .8' .8'   `8. `88888.     ,8'     `8.`'     `8.`8888.   8 8888         8 8888 `8b.       .8'   `8. `88888.   
   8888     ,88' .888888888. `88888.   ,8'       `8        `8.`8888.  8 8888         8 8888   `8b.    .888888888. `88888.  
    `8888888P'  .8'       `8. `88888. ,8'         `         `8.`8888. 8 888888888888 8 8888     `88. .8'       `8. `88888. 
                                                                                    
    ,o888888o.    8 8888                  .8.            d888888o.      d888888o.   
   8888     `88.  8 8888                 .888.         .`8888:' `88.  .`8888:' `88. 
,8 8888       `8. 8 8888                :88888.        8.`8888.   Y8  8.`8888.   Y8 
88 8888           8 8888               . `88888.       `8.`8888.      `8.`8888.     
88 8888           8 8888              .8. `88888.       `8.`8888.      `8.`8888.    
88 8888           8 8888             .8`8. `88888.       `8.`8888.      `8.`8888.   
88 8888           8 8888            .8' `8. `88888.       `8.`8888.      `8.`8888.  
`8 8888       .8' 8 8888           .8'   `8. `88888.  8b   `8.`8888. 8b   `8.`8888. 
   8888     ,88'  8 8888          .888888888. `88888. `8b.  ;8.`8888 `8b.  ;8.`8888 
    `8888888P'    8 888888888888 .8'       `8. `88888. `Y8888P ,88P'  `Y8888P ,88P' 
*
*
*
* A basic class defining a simple camera and it's appropriate matrices
*
* Sub classes OrbitCam and ActionCam (not defined yet) expand on the
* Camera class allowing for more complex actions.
*
*/

/*
 * Camera constructor. Creates view scale and projection
 * matrices based on the initial parameters.
 */
var Camera = function(fovy, aspect, near, far) {
	
	// camera matrices
	this.viewMatrix = mat4.create();
	this.scaleMatrix = mat4.create();
	this.projMatrix = mat4.create();
	this.projViewMatrix = mat4.create();
	this.scaleViewInvMatrix = mat4.create();

	// camera vectors
	this.eye = vec4.create();
	this.look = vec4.create();
	this.up = vec4.create();
	this.right = vec4.create();

	// camera settings
	this.fovy = fovy;
	this.aspect = aspect;
	this.near = near;
	this.far = far;
	this.H = this.far * Math.tan(degToRad(this.fovy / 2.0));
	this.C = -this.near / this.far;

	// build the projection matrix
	this.updateProjection();

}

/*
 * Updates the projection matrix. Should be called after changing
 * the aspect ratio, fovy, near plane, or far plane.
 */
Camera.prototype.updateProjection = function() {

	var W = this.aspect * this.H;

	// build the scale matrix
	this.scaleMatrix[0]  = 1.0 / W;
	this.scaleMatrix[5]  = 1.0 / this.H;
	this.scaleMatrix[10] = 1.0 / this.far;

	// build the perspective matrix
	mat4.identity(this.projMatrix);
	this.projMatrix[10] = -1.0 / (1.0 + this.C);
	this.projMatrix[11] = -1.0;
	this.projMatrix[14] = this.C / (1.0 + this.C);
	this.projMatrix[15] = 0.0;

	// create projection matrix
	mat4.multiply(this.projMatrix, this.projMatrix, this.scaleMatrix);
	// mat4.perspective(this.projMatrix, degToRad(this.fovy), this.aspect, this.near, this.far);
	
	// update projView matrix
	mat4.multiply(this.projViewMatrix, this.projMatrix, this.viewMatrix);
}


/*

    ,o888888o.     8 888888888o.   8 888888888o    8 8888 8888888 8888888888 
 . 8888     `88.   8 8888    `88.  8 8888    `88.  8 8888       8 8888       
,8 8888       `8b  8 8888     `88  8 8888     `88  8 8888       8 8888       
88 8888        `8b 8 8888     ,88  8 8888     ,88  8 8888       8 8888       
88 8888         88 8 8888.   ,88'  8 8888.   ,88'  8 8888       8 8888       
88 8888         88 8 888888888P'   8 8888888888    8 8888       8 8888       
88 8888        ,8P 8 8888`8b       8 8888    `88.  8 8888       8 8888       
`8 8888       ,8P  8 8888 `8b.     8 8888      88  8 8888       8 8888       
 ` 8888     ,88'   8 8888   `8b.   8 8888    ,88'  8 8888       8 8888       
    `8888888P'     8 8888     `88. 8 888888888P    8 8888       8 8888       
*/

/*
 * A camera class allowing the camera to orbit around a specified point.
 */
function OrbitCam(zoomZ, angleX, angleY, orbitPoint, fovy, aspect, near, far) {
	Camera.call(this, fovy, aspect, near, far);

	// orbit distance and angles
	this.zoomZ = zoomZ;
	this.angleX = angleX;
	this.angleY = angleY;

	// point to orbit around
	this.orbitPoint = vec3.create();
	vec3.scale(this.orbitPoint, orbitPoint, -1.0);

	// update view matrix
	this.updateView();
};

// make OrbitCam a sub class
OrbitCam.prototype = Object.create(Camera.prototype);
// Set the "constructor" property to refer to OrbitCam
OrbitCam.prototype.constructor = OrbitCam;

/*
 * Updates the view matrix based on the orbit cam specs. Should be
 * called after changing the zoom, angleX, angleY, or orbit point.
 */
OrbitCam.prototype.updateView = function() {
	mat4.identity(this.viewMatrix);

	// build view matrix
	mat4.translate(this.viewMatrix, this.viewMatrix, [0, 0, this.zoomZ]);
	mat4.rotate(this.viewMatrix, this.viewMatrix, degToRad(this.angleY), [1, 0, 0]);
	mat4.rotate(this.viewMatrix, this.viewMatrix, degToRad(this.angleX), [0, 1, 0]);
	mat4.translate(this.viewMatrix, this.viewMatrix, this.orbitPoint);

	// set eye vector
	var temp = mat4.create();
	mat4.invert(temp, this.viewMatrix);
	vec4.transformMat4(this.eye, [0, 0, 0, 1], temp);

	// set look, up, and right vectors
	mat4.identity(temp);
	mat4.rotate(temp, temp, degToRad(this.angleX), [0, -1, 0]);
	mat4.rotate(temp, temp, degToRad(this.angleY), [-1, 0, 0]);

	vec4.transformMat4(this.look, [0, 0, -1, 0], temp);
	vec4.transformMat4(this.up, [0, 1, 0, 0], temp);
	vec4.transformMat4(this.right, [1, 0, 0, 0], temp);

	// update projView matrix
	mat4.multiply(this.projViewMatrix, this.projMatrix, this.viewMatrix);

	// update scale view matrix
	mat4.multiply(this.scaleViewInvMatrix, this.scaleMatrix, this.viewMatrix);
	mat4.invert(this.scaleViewInvMatrix, this.scaleViewInvMatrix);
}

/*
 * Moves the orbit point by deltaDir amount in a direction based on the look vector.
 */
OrbitCam.prototype.updateOrbitPoint = function(deltaDir) {

	var deltaLook = vec3.create();
	var deltaRight = vec3.create();

	// move deltaDir[2] amount in the look direction
	vec3.normalize(deltaLook, [this.look[0], 0, this.look[2]]);
	vec3.scale(deltaLook, deltaLook, deltaDir[2]);

	// move deltaDir[0] amount in the right direction
	vec3.normalize(deltaRight, [this.right[0], 0, this.right[2]]);
	vec3.scale(deltaRight, deltaRight, deltaDir[0]);

	// move deltaDir[1] amound in the y direction
	vec3.add(deltaDir, deltaLook, [0, (this.up[1] < 0.0 ? -deltaDir[1] : deltaDir[1]), 0]);
	vec3.add(deltaDir, deltaRight, deltaDir);

	// update the orbit point position
	vec3.subtract(this.orbitPoint, this.orbitPoint, deltaDir);
}

/*
 * Moves the orbit point by deltaDir amount in a direction based on the look vector.
 */
OrbitCam.prototype.setOrbitPoint = function(point) {

	this.orbitPoint = vec3.clone(point);
	vec3.scale(this.orbitPoint, this.orbitPoint, -1);
}

/////////////// END CAMERA CLASSES ///////////////




/*

8 8888          8 8888 8 888888888o       ,o888888o.    8 8888         
8 8888          8 8888 8 8888    `88.    8888     `88.  8 8888         
8 8888          8 8888 8 8888     `88 ,8 8888       `8. 8 8888         
8 8888          8 8888 8 8888     ,88 88 8888           8 8888         
8 8888          8 8888 8 8888.   ,88' 88 8888           8 8888         
8 8888          8 8888 8 8888888888   88 8888           8 8888         
8 8888          8 8888 8 8888    `88. 88 8888   8888888 8 8888         
8 8888          8 8888 8 8888      88 `8 8888       .8' 8 8888         
8 8888          8 8888 8 8888    ,88'    8888     ,88'  8 8888         
8 888888888888  8 8888 8 888888888P       `8888888P'    8 888888888888 
                                                                                    
    ,o888888o.    8 8888                  .8.            d888888o.      d888888o.   
   8888     `88.  8 8888                 .888.         .`8888:' `88.  .`8888:' `88. 
,8 8888       `8. 8 8888                :88888.        8.`8888.   Y8  8.`8888.   Y8 
88 8888           8 8888               . `88888.       `8.`8888.      `8.`8888.     
88 8888           8 8888              .8. `88888.       `8.`8888.      `8.`8888.    
88 8888           8 8888             .8`8. `88888.       `8.`8888.      `8.`8888.   
88 8888           8 8888            .8' `8. `88888.       `8.`8888.      `8.`8888.  
`8 8888       .8' 8 8888           .8'   `8. `88888.  8b   `8.`8888. 8b   `8.`8888. 
   8888     ,88'  8 8888          .888888888. `88888. `8b.  ;8.`8888 `8b.  ;8.`8888 
    `8888888P'    8 888888888888 .8'       `8. `88888. `Y8888P ,88P'  `Y8888P ,88P' 
*
*
*
* A class capable of setting up a WebGL context and rendering a basic scene.
* Sub classes can overwrite specific functions to add additional functionality
* without having to create a completely new WebGL setup.
*/

/*
 * Constructor for the LibGL class. Sets up necessary variables and objects.
 */
var LibGL = function() {
	// WebGL context and extensions.
	this.gl;
	this.exts;

	// div encapsulating the canvas
	this.canvas_div;

	// shader program; primitive shape; cubemap/skybox setup
	this.Program = makeStruct("program attributes uniforms initialized");
	this.Cubemap = makeStruct("program texture");
	this.Primitive = makeStruct("type trans inv color settings texture"); // settings: shine, refractive index, selected, outer radius (torus/hollowCyl)
	this.Light = makeStruct("type posDir power radius radiance trans");

	// objects used as hashmaps
	this.programs = {};
	this.textures = {};
	this.cubemaps = {};
	this.models = {};
	this.buffers = {};
	this.HTMLElements = {};

	// framebuffers for rendering to textures
	this.framebuffers = {};

	// the fullscreen quad used for drawing
	this.fullScreenQuadVBO = null;

	// list of shapes and lights in the scene
	this.primitives = [];
	this.lights = [];
	this.MAX_LIGHTS = 10; // corresponds to shader value
	this.lightScale = 0.0; // total brightness of the scene
	this.ambientRadiance = vec3.create(); // ambient radiance light in the scene

	// orbit or action cam (action not implemented yet)
	this.camera = null;

	// input vars
	this.mouseDown = false;
	this.lastMouseX = null;
	this.lastMouseY = null;

	this.currentlyPressedKeys = {};
	this.moveCamera = false;
	this.spaceDown = false;

	// set to true when the update/render loop begins
	this.isTicking = false;
	this.requestId = undefined;

	// time updates (not used here but commonly needed)
	this.lastTime = 0; // in milliseconds

	// ray specific variables
	this.rayShape = null; // cpu raycasting
	this.antialiasing = false;
	this.brightness = 1.0;
	this.useShadows = false;
	this.reflectionIterations = 0;
}

/**
 * WebGL context and extensions setup
 */
LibGL.prototype.setUpGL = function(canvas, extensions) {

	try {
		this.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	} catch (e) {}

	if (!this.gl) {
		alert("WebGL couldn't be initialized :-(. Try using a current version of Firefox or Chrome.");
	}

	var numExtensions = extensions.length;
	this.exts = new Array(numExtensions);
	for (var i = 0; i < numExtensions; ++i) {
		try {
			this.exts[i] = this.gl.getExtension(extensions[i]);
		} catch (e) {}

		if (!this.exts[i]) {
			console.log("Browser doesn't support " + extensions[i] + " extension sorry :-(");
		}
	}

	// Enable depth testing, so that objects are occluded based on depth instead of drawing order.
	this.gl.enable(this.gl.DEPTH_TEST);

	// Move the polygons back a bit so lines are still drawn even though they are coplanar
	// with the polygons they came from, which will be drawn before them.
	this.gl.enable(this.gl.POLYGON_OFFSET_FILL);
	this.gl.polygonOffset(-1, -1);

	// Enable back-face culling, meaning only the front side of every face is rendered.
	this.gl.enable(this.gl.CULL_FACE);
	this.gl.cullFace(this.gl.BACK);

	// Specify that the front face is represented by vertices in counterclockwise order (this is the default).
	this.gl.frontFace(this.gl.CCW);
}


/*

   d888888o.   8 8888        8          .8.          8 888888888o.      8 8888888888   8 888888888o.     d888888o.   
 .`8888:' `88. 8 8888        8         .888.         8 8888    `^888.   8 8888         8 8888    `88.  .`8888:' `88. 
 8.`8888.   Y8 8 8888        8        :88888.        8 8888        `88. 8 8888         8 8888     `88  8.`8888.   Y8 
 `8.`8888.     8 8888        8       . `88888.       8 8888         `88 8 8888         8 8888     ,88  `8.`8888.     
  `8.`8888.    8 8888        8      .8. `88888.      8 8888          88 8 888888888888 8 8888.   ,88'   `8.`8888.    
   `8.`8888.   8 8888        8     .8`8. `88888.     8 8888          88 8 8888         8 888888888P'     `8.`8888.   
    `8.`8888.  8 8888888888888    .8' `8. `88888.    8 8888         ,88 8 8888         8 8888`8b          `8.`8888.  
8b   `8.`8888. 8 8888        8   .8'   `8. `88888.   8 8888        ,88' 8 8888         8 8888 `8b.    8b   `8.`8888. 
`8b.  ;8.`8888 8 8888        8  .888888888. `88888.  8 8888    ,o88P'   8 8888         8 8888   `8b.  `8b.  ;8.`8888 
 `Y8888P ,88P' 8 8888        8 .8'       `8. `88888. 8 888888888P'      8 888888888888 8 8888     `88. `Y8888P ,88P' 
 */

/**
 * Loads the specified shader program and adds it to the shader hash map.
 */
LibGL.prototype.addProgram = function(programName, vertexShader, fragShader, attribs, unis) {

	// add a new program object
	this.programs[programName] = new this.Program(undefined, {}, {}, false);
	var glLib = this;

	// asynchronously load the program
	this.loadVertFragProgram(vertexShader, fragShader, function(program) {

		// store the program and activate it
		var prog = glLib.programs[programName];
		prog.program = program;
		glLib.gl.useProgram(program);

		// set the program attributes
		var len = attribs.length;
		for (var i = 0; i < len; ++i) {
			prog.attributes[attribs[i]] = glLib.gl.getAttribLocation(program, attribs[i]);
			glLib.gl.enableVertexAttribArray(prog.attributes[attribs[i]]);
		}
		
		// set the program uniforms
		len = unis.length;
		for (var i = 0; i < len; ++i) {
			prog.uniforms[unis[i]] = glLib.gl.getUniformLocation(program, unis[i]);
		}

		// flag the program as initialized
		prog.initialized = true;
	});
}

/*
 * Program helpers and getters
 */

LibGL.prototype.useProgram = function(programName) {
	return this.gl.useProgram(this.programs[programName].program);
}
LibGL.prototype.getProgram = function(programName) {
	return this.programs[programName].program;
}
LibGL.prototype.getAttribute = function(programName, attrib) {
	return this.programs[programName].attributes[attrib];
}
LibGL.prototype.getUniform = function(programName, uni) {
	return this.programs[programName].uniforms[uni];
}
LibGL.prototype.isInitializedProgram = function(programName) {
	return this.programs[programName].initialized;
}
// iterate through all programs and check they are initialized
LibGL.prototype.isAllProgramsInitialized = function() {
	var names = Object.keys(this.programs);
	var len = names.length;
	for (var i = 0; i < len; ++i) {
		if (!this.programs[names[i]].initialized) {
			return false;
		}
	}
	return true;
}


/*

   d888888o.   8 8888        8          .8.          8 888888888o   8 8888888888     d888888o.   
 .`8888:' `88. 8 8888        8         .888.         8 8888    `88. 8 8888         .`8888:' `88. 
 8.`8888.   Y8 8 8888        8        :88888.        8 8888     `88 8 8888         8.`8888.   Y8 
 `8.`8888.     8 8888        8       . `88888.       8 8888     ,88 8 8888         `8.`8888.     
  `8.`8888.    8 8888        8      .8. `88888.      8 8888.   ,88' 8 888888888888  `8.`8888.    
   `8.`8888.   8 8888        8     .8`8. `88888.     8 888888888P'  8 8888           `8.`8888.   
    `8.`8888.  8 8888888888888    .8' `8. `88888.    8 8888         8 8888            `8.`8888.  
8b   `8.`8888. 8 8888        8   .8'   `8. `88888.   8 8888         8 8888        8b   `8.`8888. 
`8b.  ;8.`8888 8 8888        8  .888888888. `88888.  8 8888         8 8888        `8b.  ;8.`8888 
 `Y8888P ,88P' 8 8888        8 .8'       `8. `88888. 8 8888         8 888888888888 `Y8888P ,88P' 
 */

/*
 * The currently available light types.
 */
var LightType = Object.freeze({

	POINT: 				0,
	DIRECTIONAL: 		1,
	NUM_LIGHT_TYPES: 	2
	// SPOT
	// AREA

});

/*
 * Loads all primitive shape classes
 */
LibGL.prototype.initRayShape = function() {
	this.rayShape = new RayShape();
}

/*
 * Adds a primitive shape to the scene
 */
LibGL.prototype.addPrimitive = function(type, trans, color, settings, texture) {
	var inv = mat4.create();
	mat4.invert(inv, trans);
	this.primitives.push(new this.Primitive(type, mat4.clone(trans), inv, color, settings, texture));
	return this.primitives[this.primitives.length - 1];
}

/*
 * Renders all the primitives that have been added to the scene.
 */
LibGL.prototype.setPrimitives = function(program) {
	
	// iterate through the primitives
	var len = this.primitives.length;
	var prim;
	for (var i = 0; i < len; ++i) {
		prim = this.primitives[i];
		this.gl.uniform1i(this.gl.getUniformLocation(this.getProgram(program), "shapes[" + i + "].type"), prim.type);
		this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.getProgram(program), "shapes[" + i + "].trans"), false, prim.trans);
		this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.getProgram(program), "shapes[" + i + "].inv"), false, prim.inv);
		this.gl.uniform4fv(this.gl.getUniformLocation(this.getProgram(program), "shapes[" + i + "].color"), prim.color);
		this.gl.uniform4fv(this.gl.getUniformLocation(this.getProgram(program), "shapes[" + i + "].settings"), prim.settings);
	}

	this.gl.uniform1i(this.getUniform(program, "uNumShapes"), len);
}

/*
 * Adds a light to the scene
 */
LibGL.prototype.addLight = function(type, posDir, power, radius) {
	
	// compute radiance
	if (type == LightType.DIRECTIONAL) {
		radius = 1.0;
	}
	var radiance = vec3.create();
	var denom = 4.0 * Math.PI * Math.PI * radius * radius
	vec3.scale(radiance, power, 1.0 / denom);

	// create translation matrix
	var trans = mat4.create();
	if (type == LightType.POINT) {
		mat4.translate(trans, trans, posDir)
		mat4.scale(trans, trans, [radius, radius, radius]);
	}
	// add new Light
	this.lights.push(new this.Light(type, posDir, power, radius, radiance, trans));
}

/*
 * Renders all the point lights and sets the uniforms for each light.
 */
LibGL.prototype.setLights = function(program) {
	
	// iterate through the lights
	var len = this.lights.length;
	var light;
	for (var i = 0; i < len; ++i) {

		light = this.lights[i];
		this.gl.uniform1i(this.gl.getUniformLocation(this.getProgram(program), "lights[" + i + "].type"), light.type);
		this.gl.uniform3fv(this.gl.getUniformLocation(this.getProgram(program), "lights[" + i + "].posDir"), light.posDir);
		this.gl.uniform3fv(this.gl.getUniformLocation(this.getProgram(program), "lights[" + i + "].radiance"), light.radiance);
	}
}



/*
                                                               .         .                          
8 8888888888   8 888888888o.            .8.                   ,8.       ,8.          8 8888888888   
8 8888         8 8888    `88.          .888.                 ,888.     ,888.         8 8888         
8 8888         8 8888     `88         :88888.               .`8888.   .`8888.        8 8888         
8 8888         8 8888     ,88        . `88888.             ,8.`8888. ,8.`8888.       8 8888         
8 888888888888 8 8888.   ,88'       .8. `88888.           ,8'8.`8888,8^8.`8888.      8 888888888888 
8 8888         8 888888888P'       .8`8. `88888.         ,8' `8.`8888' `8.`8888.     8 8888         
8 8888         8 8888`8b          .8' `8. `88888.       ,8'   `8.`88'   `8.`8888.    8 8888         
8 8888         8 8888 `8b.       .8'   `8. `88888.     ,8'     `8.`'     `8.`8888.   8 8888         
8 8888         8 8888   `8b.    .888888888. `88888.   ,8'       `8        `8.`8888.  8 8888         
8 8888         8 8888     `88. .8'       `8. `88888. ,8'         `         `8.`8888. 8 888888888888 
                                                                                                         
8 888888888o   8 8888      88 8 8888888888   8 8888888888   8 8888888888   8 888888888o.     d888888o.   
8 8888    `88. 8 8888      88 8 8888         8 8888         8 8888         8 8888    `88.  .`8888:' `88. 
8 8888     `88 8 8888      88 8 8888         8 8888         8 8888         8 8888     `88  8.`8888.   Y8 
8 8888     ,88 8 8888      88 8 8888         8 8888         8 8888         8 8888     ,88  `8.`8888.     
8 8888.   ,88' 8 8888      88 8 888888888888 8 888888888888 8 888888888888 8 8888.   ,88'   `8.`8888.    
8 8888888888   8 8888      88 8 8888         8 8888         8 8888         8 888888888P'     `8.`8888.   
8 8888    `88. 8 8888      88 8 8888         8 8888         8 8888         8 8888`8b          `8.`8888.  
8 8888      88 ` 8888     ,8P 8 8888         8 8888         8 8888         8 8888 `8b.    8b   `8.`8888. 
8 8888    ,88'   8888   ,d8P  8 8888         8 8888         8 8888         8 8888   `8b.  `8b.  ;8.`8888 
8 888888888P      `Y88888P'   8 8888         8 8888         8 888888888888 8 8888     `88. `Y8888P ,88P' 
*/

/*
 * Creates a framebuffer and adds it to the framebuffer list
 * TODO: add color buffer and depth buffer options?
 */
LibGL.prototype.addFramebuffer = function(name, w, h) {

	var framebuffer;
	framebuffer = this.gl.createFramebuffer();
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
	framebuffer.width = w;
	framebuffer.height = h;

	var renderbuffer = this.gl.createRenderbuffer();
	this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
	this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, framebuffer.width, framebuffer.height);

	this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbuffer);

	this.framebuffers[name] = framebuffer;

	this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
}

LibGL.prototype.bindFramebuffer = function(name, texture) {
	if (name) {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers[name]);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.getTexture(texture), 0);
	} else {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
	}
}


/*

8888888 8888888888 8 8888888888   `8.`8888.      ,8' 8888888 8888888888 8 8888      88 8 888888888o.   8 8888888888     d888888o.   
      8 8888       8 8888          `8.`8888.    ,8'        8 8888       8 8888      88 8 8888    `88.  8 8888         .`8888:' `88. 
      8 8888       8 8888           `8.`8888.  ,8'         8 8888       8 8888      88 8 8888     `88  8 8888         8.`8888.   Y8 
      8 8888       8 8888            `8.`8888.,8'          8 8888       8 8888      88 8 8888     ,88  8 8888         `8.`8888.     
      8 8888       8 888888888888     `8.`88888'           8 8888       8 8888      88 8 8888.   ,88'  8 888888888888  `8.`8888.    
      8 8888       8 8888             .88.`8888.           8 8888       8 8888      88 8 888888888P'   8 8888           `8.`8888.   
      8 8888       8 8888            .8'`8.`8888.          8 8888       8 8888      88 8 8888`8b       8 8888            `8.`8888.  
      8 8888       8 8888           .8'  `8.`8888.         8 8888       ` 8888     ,8P 8 8888 `8b.     8 8888        8b   `8.`8888. 
      8 8888       8 8888          .8'    `8.`8888.        8 8888         8888   ,d8P  8 8888   `8b.   8 8888        `8b.  ;8.`8888 
      8 8888       8 888888888888 .8'      `8.`8888.       8 8888          `Y88888P'   8 8888     `88. 8 888888888888 `Y8888P ,88P' 
*/

/*
 * Stores a single texture.
 */
LibGL.prototype.handleSingleTexture = function(gl, texture, flipy) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipy);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

/*
 * Creates a texture and fills it with the initialArray while the image loads.
 */
LibGL.prototype.setUpTexture = function(initialArray, w, h, type, url, flipy) {
	// create texture and store the initialArray
	var texture = this.gl.createTexture();
	this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
	this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, w, h, 0, this.gl.RGBA, type, initialArray);

	// set the texture parameters
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
	this.gl.bindTexture(this.gl.TEXTURE_2D, null);

	if (url)
	{
		// asynchronously load image
		texture.image = new Image();
		var glLib = this;
		texture.image.onload = function() {
			glLib.handleSingleTexture(glLib.gl, texture, flipy);
		}

		texture.image.crossOrigin = 'anonymous';
		texture.image.src = url;
	}

	return texture;
}

/*
 * Sets the texture data to the given array.
 */
LibGL.prototype.updateTextureArray = function(name, w, h, type, array) {
	var texture = this.textures[name];
	this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
	this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, w, h, 0, this.gl.RGBA, type, array);
	this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

/*
 * Update the parameters for the given texture
 */
LibGL.prototype.setTextureParams = function(name, magFilter, minFilter, wrapS, wrapT) {
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(name));
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrapS);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrapT);
	this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

/*
 * Add or get a texture with a specific name.
 */

LibGL.prototype.addTexture = function(name, initialArray, w, h, type, url, flipy) {
	flipy = typeof flipy !== 'undefined' ? flipy : false;
	this.textures[name] = this.setUpTexture(initialArray, w, h, type, url, flipy);
}
LibGL.prototype.getTexture = function(name) {
	return this.textures[name];
}


/*
                                                                         .         .                                                
    ,o888888o.    8 8888      88 8 888888888o   8 8888888888            ,8.       ,8.                   .8.          8 888888888o   
   8888     `88.  8 8888      88 8 8888    `88. 8 8888                 ,888.     ,888.                 .888.         8 8888    `88. 
,8 8888       `8. 8 8888      88 8 8888     `88 8 8888                .`8888.   .`8888.               :88888.        8 8888     `88 
88 8888           8 8888      88 8 8888     ,88 8 8888               ,8.`8888. ,8.`8888.             . `88888.       8 8888     ,88 
88 8888           8 8888      88 8 8888.   ,88' 8 888888888888      ,8'8.`8888,8^8.`8888.           .8. `88888.      8 8888.   ,88' 
88 8888           8 8888      88 8 8888888888   8 8888             ,8' `8.`8888' `8.`8888.         .8`8. `88888.     8 888888888P'  
88 8888           8 8888      88 8 8888    `88. 8 8888            ,8'   `8.`88'   `8.`8888.       .8' `8. `88888.    8 8888         
`8 8888       .8' ` 8888     ,8P 8 8888      88 8 8888           ,8'     `8.`'     `8.`8888.     .8'   `8. `88888.   8 8888         
   8888     ,88'    8888   ,d8P  8 8888    ,88' 8 8888          ,8'       `8        `8.`8888.   .888888888. `88888.  8 8888         
    `8888888P'       `Y88888P'   8 888888888P   8 888888888888 ,8'         `         `8.`8888. .8'       `8. `88888. 8 8888         
*/

/*
 * Stores a single side of a cubemap texture.
 */
LibGL.prototype.handleCubemapTexture = function(gl, texture, side, image, flipy) {
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipy);
	gl.texImage2D(side, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

/*
 * Creates a new cubemap texture and fills it with the initialColor while the images load.
 */
LibGL.prototype.prepCubemapTexture = function(initialColor, texDir, size, ext) {

	// create a new texture and an array filled with the initial color
	var tex = this.gl.createTexture();
	var initImage = new Uint8Array(size * size * 4);
	var index = 0;
	for (var r = 0; r < size; ++r) {
		for (var c = 0; c < size; ++c) {
			initImage[index++] = initialColor[0];
			initImage[index++] = initialColor[1];
			initImage[index++] = initialColor[2];
			initImage[index++] = initialColor[3];
		}
	}

	// store the initial array in the texture
	this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, tex);
	this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, initImage);
	this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, initImage);
	this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, initImage);
	this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, initImage);
	this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, initImage);
	this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, initImage);

	// set the texture parameters
	this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
	this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

	this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
	this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
	this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);

	// create and asynchronously load cubemap images
	var pximg = new Image();
	var nximg = new Image();
	var pyimg = new Image();
	var nyimg = new Image();
	var pzimg = new Image();
	var nzimg = new Image();

	var glLib = this;
	pximg.onload = function() {
		glLib.handleCubemapTexture(glLib.gl, tex, glLib.gl.TEXTURE_CUBE_MAP_POSITIVE_X, pximg, false);
	}
	nximg.onload = function() {
		glLib.handleCubemapTexture(glLib.gl, tex, glLib.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, nximg, false);
	}
	pyimg.onload = function() {
		glLib.handleCubemapTexture(glLib.gl, tex, glLib.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, pyimg, true);
	}
	nyimg.onload = function() {
		glLib.handleCubemapTexture(glLib.gl, tex, glLib.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, nyimg, true);
	}
	pzimg.onload = function() {
		glLib.handleCubemapTexture(glLib.gl, tex, glLib.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, pzimg, false);
	}
	nzimg.onload = function() {
		glLib.handleCubemapTexture(glLib.gl, tex, glLib.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, nzimg, false);
	}

	pximg.src = texDir + "/xpos" + ext;
	nximg.src = texDir + "/xneg" + ext;
	pyimg.src = texDir + "/ypos" + ext;
	nyimg.src = texDir + "/yneg" + ext;
	pzimg.src = texDir + "/zpos" + ext;
	nzimg.src = texDir + "/zneg" + ext;

	return tex;
}

/*
 * Creates a new cubemap and builds the vbo if it hasn't be created yet.
 */
LibGL.prototype.setCubeMap = function(name, program, initialColor, textureDir, texSize, fileExtension) {

	// build the vbo is it doesn't already exist.
	var radius = 1.0;
	if (!this.cubemapVBO) {
		var data = [-radius ,  radius,  radius, // 4
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
		
		// create and bind buffer
		this.cubemapVBO = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubemapVBO);

		// fill buffer
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
		this.cubemapVBO.itemSize = 3;
		this.cubemapVBO.numItems = data.length / 3;
	}
	// load the textures
	var tex = this.prepCubemapTexture(initialColor, textureDir, texSize, fileExtension);

	// add the cubemap to the hash map
	this.cubemaps[name] = new this.Cubemap(program, tex);
}


/*
 * Renders the specified cubemap without the depthMask enabled (so it must be drawn first)
 */
LibGL.prototype.renderCubeMap = function(name) {

	// get the cubemap and set the program
	var cm = this.cubemaps[name];
	this.useProgram(cm.program);

	// bind the buffer and set the vbo attributes
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubemapVBO);
	var stride = Float32Array.BYTES_PER_ELEMENT * this.cubemapVBO.itemSize;
	this.gl.vertexAttribPointer(this.getAttribute("cubemap", "aPosition"), 3, this.gl.FLOAT, false, stride, 0);

	// set the uniforms
	this.gl.uniformMatrix4fv(this.getUniform(cm.program, "uPMatrix"), false, this.camera.projMatrix);
	this.gl.uniformMatrix4fv(this.getUniform(cm.program, "uVMatrix"), false, this.camera.viewMatrix);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, cm.texture);
	this.gl.uniform1i(this.getUniform(cm.program, "uEnvMap"), 0);

	// disable the depth mast and render
	this.gl.depthMask(false);
	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.cubemapVBO.numItems);
	this.gl.depthMask(true);

}


/*
                                      .         .                          
8 8888        8 8888888 8888888888   ,8.       ,8.          8 8888         
8 8888        8       8 8888        ,888.     ,888.         8 8888         
8 8888        8       8 8888       .`8888.   .`8888.        8 8888         
8 8888        8       8 8888      ,8.`8888. ,8.`8888.       8 8888         
8 8888        8       8 8888     ,8'8.`8888,8^8.`8888.      8 8888         
8 8888        8       8 8888    ,8' `8.`8888' `8.`8888.     8 8888         
8 8888888888888       8 8888   ,8'   `8.`88'   `8.`8888.    8 8888         
8 8888        8       8 8888  ,8'     `8.`'     `8.`8888.   8 8888         
8 8888        8       8 8888 ,8'       `8        `8.`8888.  8 8888         
8 8888        8       8 8888,8'         `         `8.`8888. 8 888888888888 
*/

/*
 * Sets a list of divs to appear/disappear when clicked.
 */
LibGL.prototype.setTogglePanels = function(panels) {

	var num = panels.length;
	for (var i = 0; i < 2; ++i) {
		this.setTogglePanel(panels[i]);
	}
}

/*
 * Sets a div to appear/disappear when clicked.
 */
LibGL.prototype.setTogglePanel = function(panel) {
	
	var glLib = this;
	document.getElementById(panel[0]).onclick = function() {
		glLib.toggleShow(panel[1]);
	}
}

/*
 * Sets the value of the reactive element to the changing value of the main element.
 * Adds the main input to the list of HTML inputs.
 */
LibGL.prototype.addLinkedInput = function(elementID1, elementID2) {
	
	var element1 = document.getElementById(elementID1);
	var element2 = document.getElementById(elementID2);

	element1.oninput = function() {
		element2.value = this.value;
	}
	element2.onchange = function() {
		element1.value = this.value;
		this.value = element1.value;
	}

	this.HTMLElements[elementID1] = element1;
}

/*
 * Adds an input to the list of HTML inputs.
 */
LibGL.prototype.addHTMLElement = function(elementID) {
	var element = document.getElementById(elementID);
	this.HTMLElements[elementID] = element;
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

/*
 * Mouse Events
 */

LibGL.prototype.handleMouseDown = function(mouseEvent) {
	this.mouseDown = true;
	var pos = this.getMousePos(mouseEvent);
	this.lastMouseX = pos.x;
	this.lastMouseY = pos.y;
}

LibGL.prototype.handleMouseUp = function(mouseEvent) {
	this.mouseDown = false;
}

LibGL.prototype.handleMouseWheel = function(mouseEvent) {
	mouseEvent.preventDefault(); // no page scrolling when using the canvas

	if (this.moveCamera) {
		this.updateZoomZ(mouseEvent.deltaY * 0.03);
	} else {}

	this.updateView();
}

LibGL.prototype.handleMouseMove = function(mouseEvent) {
	
	var pos = this.getMousePos(mouseEvent);

	if (!this.mouseDown) {
		var indexBest = this.castRay(pos);

		var num = this.primitives.length;
		for (var i = 0; i < num; ++i) {
			this.primitives[i].settings[2] = 0.0;
		}
		if (indexBest[0] >= 0) {
			this.primitives[indexBest[0]].settings[2] = 1.0;
		}

		return;
	}

	// var translation
	var deltaX = pos.x - this.lastMouseX;
	var deltaY = pos.y - this.lastMouseY;

	if (this.moveCamera) {
		this.updateAngleX(deltaX * 0.25);
		this.updateAngleY(deltaY * 0.25);
	} else {}

	this.lastMouseX = pos.x
	this.lastMouseY = pos.y;

	this.updateView();
}

/*
 * Key Events
 */

LibGL.prototype.handleKeyDown = function(keyEvent) {
	this.currentlyPressedKeys[keyEvent.keyCode] = true;
	switch(keyEvent.keyCode) {
		// CMD key (MAC)
		case 224: // Firefox
		case 17:  // Opera
		case 91:  // Chrome/Safari (left)
		case 93:  // Chrome/Safari (right)
			break;
		case 16: // shift
			this.moveCamera = true;
			break;
		case 32: // space
			this.spaceDown = true;
			keyEvent.preventDefault();
			break;
		default:
			// console.log(keyEvent.keyCode);
			break;
	}
}

LibGL.prototype.handleKeyUp = function(keyEvent) {
	this.currentlyPressedKeys[keyEvent.keyCode] = false;
	switch(keyEvent.keyCode) {
		// CMD key (MAC)
		case 224: // Firefox
		case 17:  // Opera
		case 91:  // Chrome/Safari (left)
		case 93:  // Chrome/Safari (right)
			break;
		case 16: // shift
			this.moveCamera = false;
			break;
		case 32: // space
			this.spaceDown = false;
			break;
		default:
			// console.log(keyEvent.keyCode);
			break;
	}
}

/*
 * Gets called on every frame and updates settings
 * based on currently pressed keys.
 */
LibGL.prototype.handleInput = function() {

	// speed and direction of movement
	var mag = 0.25;
	if (this.moveCamera) {
		mag = 0.05;
	}
	var dir = [0.0, 0.0, 0.0];

	// horizontal movement
	if (this.currentlyPressedKeys[87]) { // W
		dir[2] += 1.0;
	}
	if (this.currentlyPressedKeys[65]) { // A
		dir[0] -= 1.0;
	}
	if (this.currentlyPressedKeys[83]) { // S
		dir[2] -= 1.0;
	}
	if (this.currentlyPressedKeys[68]) { // D
		dir[0] += 1.0;
	}
	// if there is horizontal movement normalized it
	if (vec3.dot(dir, dir) > 0.001) {
		vec3.normalize(dir, dir);
	}

	// vertical movement
	if (this.currentlyPressedKeys[81]) { // Q
		dir[1] -= 1.0;
	}
	if (this.currentlyPressedKeys[69]) { // E
		dir[1] += 1.0;
	}

	// if there is movement update the orbit point
	if (vec3.dot(dir, dir) > 0.001) {
		vec3.scale(dir, dir, mag);
		this.camera.updateOrbitPoint(dir);

		this.updateView();
	}
}


/*
                                                .         .                                                                
    ,o888888o.           .8.                   ,8.       ,8.          8 8888888888   8 888888888o.            .8.          
   8888     `88.        .888.                 ,888.     ,888.         8 8888         8 8888    `88.          .888.         
,8 8888       `8.      :88888.               .`8888.   .`8888.        8 8888         8 8888     `88         :88888.        
88 8888               . `88888.             ,8.`8888. ,8.`8888.       8 8888         8 8888     ,88        . `88888.       
88 8888              .8. `88888.           ,8'8.`8888,8^8.`8888.      8 888888888888 8 8888.   ,88'       .8. `88888.      
88 8888             .8`8. `88888.         ,8' `8.`8888' `8.`8888.     8 8888         8 888888888P'       .8`8. `88888.     
88 8888            .8' `8. `88888.       ,8'   `8.`88'   `8.`8888.    8 8888         8 8888`8b          .8' `8. `88888.    
`8 8888       .8' .8'   `8. `88888.     ,8'     `8.`'     `8.`8888.   8 8888         8 8888 `8b.       .8'   `8. `88888.   
   8888     ,88' .888888888. `88888.   ,8'       `8        `8.`8888.  8 8888         8 8888   `8b.    .888888888. `88888.  
    `8888888P'  .8'       `8. `88888. ,8'         `         `8.`8888. 8 888888888888 8 8888     `88. .8'       `8. `88888. 
*/

/*
 * Camera helpers essentially wrapping camera class functions
 */

LibGL.prototype.addOrbitCam = function(zoomZ, angleX, angleY, orbitPoint, fovy, aspect, near, far) {
	this.camera = new OrbitCam(zoomZ, angleX, angleY, orbitPoint, fovy, aspect, near, far);
	this.camera.updateView();
}
LibGL.prototype.getViewMatrix = function() {
	return this.camera.viewMatrix;
}
LibGL.prototype.getProjMatrix = function() {
	return this.camera.projMatrix;
}
LibGL.prototype.getProjViewMatrix = function() {
	return this.camera.projViewMatrix;
}
LibGL.prototype.getScaleMatrix = function() {
	return this.camera.scaleMatrix;
}
LibGL.prototype.getScaleViewInvMatrix = function() {
	return this.camera.scaleViewInvMatrix;
}
LibGL.prototype.getEye = function() {
	return this.camera.eye;
}
LibGL.prototype.getLook = function() {
	return this.camera.look;
}
LibGL.prototype.getUp = function() {
	return this.camera.up;
}
LibGL.prototype.getRight = function() {
	return this.camera.right;
}
LibGL.prototype.getZoomZ = function() {
	return this.camera.zoomZ;
}
LibGL.prototype.updateZoomZ = function(deltaZ) {
	this.camera.zoomZ += deltaZ;
}
LibGL.prototype.updateAngleX = function(deltaX) {
	this.camera.angleX += deltaX;
}
LibGL.prototype.updateAngleY = function(deltaY) {
	this.camera.angleY += deltaY;
}
LibGL.prototype.setAngleX = function(angleX) {
	this.camera.angleX = angleX;
}
LibGL.prototype.setAngleY = function(angleY) {
	this.camera.angleY = angleY;
}
LibGL.prototype.setZoomZ = function(zoomZ) {
	this.camera.zoomZ = zoomZ;
}
LibGL.prototype.updateView = function() {
	this.camera.updateView();
}
LibGL.prototype.updateProjection = function() {
	this.camera.updateProjection();
}

/*
 * Updates the canvas, viewport, and camera based on the new dimensions.
 */
LibGL.prototype.resize = function(width, height) {
	this.gl.canvas.width = width;
	this.gl.canvas.height = height;

	this.gl.viewportWidth = this.gl.canvas.width;
	this.gl.viewportHeight = this.gl.canvas.height;

	this.camera.aspect = this.gl.viewportWidth / this.gl.viewportHeight;

	this.camera.updateProjection();
}

/*
 * The function specifying what to do when the window is resized.
 */
LibGL.prototype.resizeCanvas = function() {
	this.resize(window.innerWidth, window.innerHeight);
	this.render();
}


/*
                                                                                                  
8 888888888o.   8 8888888888   b.             8 8 888888888o.      8 8888888888   8 888888888o.   
8 8888    `88.  8 8888         888o.          8 8 8888    `^888.   8 8888         8 8888    `88.  
8 8888     `88  8 8888         Y88888o.       8 8 8888        `88. 8 8888         8 8888     `88  
8 8888     ,88  8 8888         .`Y888888o.    8 8 8888         `88 8 8888         8 8888     ,88  
8 8888.   ,88'  8 888888888888 8o. `Y888888o. 8 8 8888          88 8 888888888888 8 8888.   ,88'  
8 888888888P'   8 8888         8`Y8o. `Y88888o8 8 8888          88 8 8888         8 888888888P'   
8 8888`8b       8 8888         8   `Y8o. `Y8888 8 8888         ,88 8 8888         8 8888`8b       
8 8888 `8b.     8 8888         8      `Y8o. `Y8 8 8888        ,88' 8 8888         8 8888 `8b.     
8 8888   `8b.   8 8888         8         `Y8o.` 8 8888    ,o88P'   8 8888         8 8888   `8b.   
8 8888     `88. 8 888888888888 8            `Yo 8 888888888P'      8 888888888888 8 8888     `88. 
*/

/*
 *
 */
LibGL.prototype.initFullscreenBuffer = function() {
	this.fullScreenQuadVBO = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fullScreenQuadVBO);

	var data = [ 1.0,  1.0,
				-1.0,  1.0,
				 1.0, -1.0,
				-1.0, -1.0];
	
	this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
	this.fullScreenQuadVBO.itemSize = 2;
	this.fullScreenQuadVBO.numItems = data.length / this.fullScreenQuadVBO.itemSize;
}

/*
 * Functions to set uniform variables.
 */

LibGL.prototype.setCameraAndGlobalUniforms = function(program) {
	this.gl.uniformMatrix4fv(this.getUniform(program, "uScaleViewInv"), false, this.getScaleViewInvMatrix());
	this.gl.uniform4fv(this.getUniform(program, "uEyePos"), this.getEye());
	this.gl.uniform2f(this.getUniform(program, "uViewport"), this.gl.viewportWidth, this.gl.viewportHeight);

	// global settings:
	this.gl.uniform1i(this.getUniform(program, "uAntialiasing"), this.antialiasing);
	this.gl.uniform1i(this.getUniform(program, "uUseShadows"), this.useShadows);
	this.gl.uniform1f(this.getUniform(program, "uBrightness"), this.brightness);
	this.gl.uniform1i(this.getUniform(program, "uIterations"), this.reflectionIterations);
}

/*
 * Sets the camera and lights for the specified program then renders all shapes in the scene.
 */
LibGL.prototype.renderScene = function(program) {
	this.useProgram(program);
	this.setCameraAndGlobalUniforms(program);
	this.setLights(program);
	this.setPrimitives(program);

	// bind and render fullscreen quad
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fullScreenQuadVBO);
	this.gl.vertexAttribPointer(this.getAttribute(program, "aPosition"), 2, this.gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * this.fullScreenQuadVBO, 0);

	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.fullScreenQuadVBO.numItems);
}

/*
 * Called on every frame. Renders everything needed for the current frame.
 */
LibGL.prototype.render = function() {
	// set the viewport and clear the buffers
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
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
LibGL.prototype.tick = function() {
	// call this function again on the next frame
	requestAnimFrame(this.tick.bind(this));

	// update time example
	var timeNow = new Date().getTime(); // milliseconds
	var deltaTime = (timeNow - this.lastTime) / 1000.0; // seconds
	this.lastTime = timeNow;

	this.handleInput();
	this.render();
}

/*
 * Displays or hides an HTML element.
 */
LibGL.prototype.show = function(id, value) {
	document.getElementById(id).style.display = value ? "block" : "none";
}

/*
 * Displays a hidden element or hides a displayed element
 */
LibGL.prototype.toggleShow = function(element) {
	var div = document.getElementById(element);
	if (div.style.display == "block") {
		div.style.display = "none";
	} else {
		div.style.display = "block"
	}
}

/*
 * Completes any required initialization before the update/render loop begins
 */
LibGL.prototype.onStartTick = function() {
	// set the canvas size and begin the update/render loop
	this.resizeCanvas();
	this.tick();
}

/*
 * Continuously checks if the shaders are initialized then starts
 * the update/render loop once the program is ready.
 */
LibGL.prototype.continueLoadingScreen = function() {
	
	if (this.isTicking) {
		this.onStartTick();
		return;
	}

	// call this function again on the next frame
	this.requestId = requestAnimFrame(this.continueLoadingScreen.bind(this));

	// check if the shaders are done loading
	if (this.isAllProgramsInitialized()) {
		this.isTicking = true;
	}
}

/*
 * Starts the looping process.
 */
LibGL.prototype.start = function() {
	this.continueLoadingScreen();
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


/**
 * Loads all necessary shaders.
 */
LibGL.prototype.initShaders = function() {}


/*
 * Loads all necessary textures.
 */
LibGL.prototype.initTextures = function() {}

/*
 * Creates a scene of basic primitive shapes and lights.
 */
LibGL.prototype.setScene = function() {}

/*
 * Initializes everything needed to run the program.
 */
LibGL.prototype.init = function(canvas, canvas_div, extensions) {
	this.canvas_div = canvas_div;

	// set up the WebGL context; load shaders and textures
	this.setUpGL(canvas, extensions);
	this.initRayShape();
	this.initFullscreenBuffer();
	this.initShaders();
	this.initTextures();

	// add a camera and build the scene
	this.addOrbitCam(-15.0, 0.0, 0.0, [0, 0, 0], 45.0, 1.0, 0.1, 100.0);
	this.setScene();
	
	// specify default clear color
	this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// mouse event listeners
	canvas.onmousedown = this.handleMouseDown.bind(this);
	document.onmouseup = this.handleMouseUp.bind(this);
	document.onmousemove = this.handleMouseMove.bind(this);
	canvas.onwheel = this.handleMouseWheel.bind(this);

	// key event listeners
	document.onkeydown = this.handleKeyDown.bind(this);
	document.onkeyup = this.handleKeyUp.bind(this);

	// resize even listener
	window.onresize = this.resizeCanvas.bind(this);
}


/*
                                                         
8 8888      88 8888888 8888888888  8 8888 8 8888         
8 8888      88       8 8888        8 8888 8 8888         
8 8888      88       8 8888        8 8888 8 8888         
8 8888      88       8 8888        8 8888 8 8888         
8 8888      88       8 8888        8 8888 8 8888         
8 8888      88       8 8888        8 8888 8 8888         
8 8888      88       8 8888        8 8888 8 8888         
` 8888     ,8P       8 8888        8 8888 8 8888         
  8888   ,d8P        8 8888        8 8888 8 8888         
   `Y88888P'         8 8888        8 8888 8 888888888888 
*/

/*
 * Returns the mouse position relative to the canvas
 */
LibGL.prototype.getMousePos = function(evt) {
	var rect = this.gl.canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

/*
 * Constructs a ray into the scene based on the current mouse position.
 * Only returns an origin and direction.
 */
LibGL.prototype.getRayBare = function(orig, scaleViewInv, mousePos) {

	// convert mouse pos to screen space
	var x = mousePos.x * 2.0 / this.gl.canvas.width - 1.0;
	var y = 1.0 - mousePos.y * 2.0 / this.gl.canvas.height;

	// build the ray
	var dir = vec4.create();
	vec4.transformMat4(dir, [x, y, -1, 1], scaleViewInv);
	vec4.subtract(dir, dir, orig);
	vec3.normalize(dir, dir);

	return {
		o: orig,
		d: dir
	}
}

/*
 * Constructs a ray into the scene based on the current mouse position.
 * Returns an origin, direction, inverse direction, and sign vector.
 */
LibGL.prototype.getRay = function(orig, scaleViewInv, mousePos) {

	// convert mouse pos to screen space
	var x = mousePos.x * 2.0 / this.gl.canvas.width - 1.0;
	var y = 1.0 - mousePos.y * 2.0 / this.gl.canvas.height;

	// build the ray
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

/*
 * Casts a ray into the scene. Returns the index and distance
 * of the closest intersecting shape.
 */
LibGL.prototype.castRay = function(pos) {
	var ray = this.getRayBare(this.getEye(), this.getScaleViewInvMatrix(), pos);
	return this.rayShape.intersectWorld(ray.o, ray.d, this.primitives);
}

/*
 * @Override
 */


/*
 * Creates a new gl program after loading and compiling a vertex and fragment shader pair.
 * Scripts that use this must have an initfunction that assigns the new program elsewhere or
 * it will be out of scope after the function returns.
 */
LibGL.prototype.loadVertFragProgram = function(vertname, fragname, initFunction) {

	var glLib = this;
	loadFiles([vertname, fragname], function (shaderText) {
		var vertexShader = glLib.gl.createShader(glLib.gl.VERTEX_SHADER);
		var fragmentShader = glLib.gl.createShader(glLib.gl.FRAGMENT_SHADER);
		
		// store and compile the shaders
		glLib.gl.shaderSource(vertexShader, shaderText[0]);
		glLib.gl.shaderSource(fragmentShader, shaderText[1]);

		glLib.gl.compileShader(vertexShader);
		glLib.gl.compileShader(fragmentShader);

		// make sure the shaders compiled successfully
		if (!glLib.gl.getShaderParameter(vertexShader, glLib.gl.COMPILE_STATUS)) {
			alert(glLib.gl.getShaderInfoLog(vertexShader));
			return null;
		}
		if (!glLib.gl.getShaderParameter(fragmentShader, glLib.gl.COMPILE_STATUS)) {
			alert(glLib.gl.getShaderInfoLog(fragmentShader));
			return null;
		}

		// create and build the new program
		var program = glLib.gl.createProgram();

		glLib.gl.attachShader(program, vertexShader);
		glLib.gl.attachShader(program, fragmentShader);
		glLib.gl.linkProgram(program);

		if (!glLib.gl.getProgramParameter(program, glLib.gl.LINK_STATUS)) {
			alert("Could not initialize default shaders");
		}

		// program gets assigned to another var so it won't
		// be out of scope when the function finishes
		initFunction(program);

	}, function (url) { // loading failure callback
		alert('Failed to download "' + url + '"');
	}); 
	
}

/////////////// END LIBGL CLASS ///////////////








