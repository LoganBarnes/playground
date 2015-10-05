
// /* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
// var variable = [];
// variable.theme_url = ".";
// /* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

/*
 * Create a sub LibGL class to override functions and add
 * advanced functionality without having to completely
 * recreate a new WebGL setup.
 */
 function SubLibGL() {
 	LibGL.call(this);
 };

// make SubLibGL a subclass
SubLibGL.prototype = Object.create(LibGL.prototype);
// Set the "constructor" property to refer to SubLibGL
SubLibGL.prototype.constructor = SubLibGL;


/**
 * Loads all necessary shaders.
 * 
 * @Override
 */
SubLibGL.prototype.initShaders = function() {

	// cubemap shaders
	this.addProgram("cubemap", variable.theme_url + "/shaders/default/cubemap.vert", variable.theme_url + "/shaders/default/cubemap.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uPMatrix", "uVMatrix", "uEnvMap"]);

	// default shaders
	this.addProgram("default", variable.theme_url + "/shaders/default/default.vert", variable.theme_url + "/shaders/default/default.frag",
					// attributes
					["aPosition", "aNormal", "aTexCoord"],
					// uniforms
					["uAmbientRadiance", "uLightScale", "uPVMatrix", "uMMatrix", "uMMatrixIT",
					 "uLightLocation", "uColor", "uShapeSettings", "uShapeTexture"]);
}


/*
 * Loads all necessary textures.
 * 
 * @Override
 */
SubLibGL.prototype.initTextures = function() {
	this.addTexture("earth", new Uint8Array([50, 50, 50]), variable.theme_url + "/images/earth.jpg");
	this.setCubeMap("labelledSky", "cubemap", [127,127,127,255], variable.theme_url + "/images/cubemaps/default", 1024, ".jpg");
}

/*
 * Creates a scene of basic primitive shapes and lights.
 * 
 * @Override
 */
SubLibGL.prototype.setScene = function() {

	// add a lights
	this.addLight(LightType.POINT, [2500, 1150, 750], [4000000.0, 4000000.0, 4000000.0], 100.0);
	this.addLight(LightType.POINT, [0, 1.5, 0], [4.0, 4.0, 4.0], 0.1);
	this.lightScale = 10.0; // inverse scene brightness (higher is darker)
	this.ambientRadiance = [3.0, 3.0, 3.0];

	// add shapes
	var trans = mat4.create();

	// add a single sphere with an earth texture
	mat4.identity(trans);
	this.addPrimitive(ShapeType.SPHERE, trans, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 1.0, 0.0], "earth");

	mat4.identity(trans);
	mat4.translate(trans, trans, [0, 3, 0]);
	this.addModelJSON("ltb", variable.theme_url + "/objects/ltb.json",
						trans, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 0.0], "");
}


/*
 * Completes any required initialization befor the update/render loop begins
 * 
 * @Override
 */
SubLibGL.prototype.onStartTick = function() {
	// show the canvas and remove the loading screen
	this.show("page", true);
	this.show("loading", false);

	// bind the shapes to avoid a warning when rendering the cubemap for the first time
	this.renderScene("default");

	// set the canvas size and begin the update/render loop
	this.resizeCanvas();
	this.tick();
}


/*
 * Called on every frame. Renders everything needed for the current frame.
 * 
 * @Override
 */
SubLibGL.prototype.render = function() {

	// set the viewport and clear the buffers
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// render the environment and shapes
	this.renderCubeMap("labelledSky");
	this.renderScene("default");
}


// var libGL;
function run() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var libGL = new SubLibGL();
	libGL.init(canvas, canvas_div, []);
	libGL.start();
}

run();


