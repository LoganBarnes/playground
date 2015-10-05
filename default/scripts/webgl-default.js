
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = ".";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

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
 * Called on every frame. Renders everything needed for the current frame.
 */
SubLibGL.prototype.render = function() {

	// set the viewport and clear the buffers
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// render the environment and shapes
	this.renderCubeMap("labelledSky");
	this.renderScene("default");
}

/*
 * Completes any required initialization before the update/render loop begins
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
SubLibGL.prototype.initShaders = function() {

	// cubemap shaders
	this.addProgram("cubemap", variable.theme_url + "/res/shaders/cubemap.vert", variable.theme_url + "/res/shaders/cubemap.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uPMatrix", "uVMatrix", "uEnvMap"]);

	// default shaders
	this.addProgram("default", variable.theme_url + "/res/shaders/default.vert", variable.theme_url + "/res/shaders/default.frag",
					// attributes
					["aPosition", "aNormal", "aTexCoord"],
					// uniforms
					["uAmbientRadiance", "uLightScale", "uPVMatrix", "uMMatrix", "uMMatrixIT",
					 "uLightLocation", "uColor", "uShapeSettings", "uTexture"]);
}

/*
 * Loads all necessary textures.
 * @Override
 */
SubLibGL.prototype.initTextures = function() {
	this.addTexture("earth", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/earth.jpg");
	this.addTexture("logo", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/res/images/webgl_logo.png");
	this.setCubeMap("labelledSky", "cubemap", [127,127,127,255], variable.theme_url + "/res/images/cubemap", 1024, ".jpg");
}

/*
 * Creates a scene of basic primitive shapes and lights.
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
	this.addModelJSON("ltb", variable.theme_url + "/res/objects/ltb.json",
						trans, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 0.0], "");

	// add a textured quad buffer
	mat4.identity(trans);
	mat4.translate(trans, trans, [0, -3, 0]);
	mat4.rotateY(trans, trans, degToRad(45));
	mat4.scale(trans, trans, [2, 1, 1]);
	var data = [ 1,  1, 0, 0, 0,  1, 1, 0,
				-1, -1, 0, 0, 0,  1, 0, 1,
				 1, -1, 0, 0, 0,  1, 1, 1,

				-1,  1, 0, 0, 0,  1, 0, 0,
				-1, -1, 0, 0, 0,  1, 0, 1,
				 1,  1, 0, 0, 0,  1, 1, 0,

				-1,  1, 0, 0, 0, -1, 0, 0,
				 1,  1, 0, 0, 0, -1, 1, 0,
				-1, -1, 0, 0, 0, -1, 0, 1,

				 1,  1, 0, 0, 0, -1, 1, 0,
				 1, -1, 0, 0, 0, -1, 1, 1,
				-1, -1, 0, 0, 0, -1, 0, 1];
	this.addBuffer("triangle", data, 8, trans, [0.4, 1, 0.4], [64.0, 0.0, 1.0, 0.0], "logo", this.gl.TRIANGLES);
}

/*
 * 'main' function where program starts
 */
function main() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var libGL = new SubLibGL();
	libGL.init(canvas, canvas_div, []);
	libGL.start();
}




