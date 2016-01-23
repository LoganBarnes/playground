
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = "./res";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

/*
 * Create a sub LibGL class to override functions and add
 * advanced functionality without having to completely
 * recreate a new WebGL setup.
 */
 function RaySubLibGL() {
 	LibGL.call(this);
 };

// make RaySubLibGL a subclass
RaySubLibGL.prototype = Object.create(LibGL.prototype);
// Set the "constructor" property to refer to RaySubLibGL
RaySubLibGL.prototype.constructor = RaySubLibGL;


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

var lightAngle = 0.0;
/*
 * Called on every frame. Renders everything needed for the current frame.
 */
RaySubLibGL.prototype.render = function() {

	// set the viewport and clear the buffers
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// temporary: make light move
	lightAngle += 1.0;
	this.lights[0].posDir = [3 * Math.cos(degToRad(lightAngle)), 10, 3 * Math.sin(degToRad(lightAngle))];

	// update settings
	this.antialiasing = this.HTMLElements["antialiasing"].checked;
	this.brightness = this.HTMLElements["brightness"].value;
	this.useShadows = this.HTMLElements["shadows"].checked;
	if (this.HTMLElements["reflections"].checked) {
		this.reflectionIterations = this.HTMLElements["iterations"].value;
	} else {
		this.reflectionIterations = 0;
	}

	// render the environment and shapes
	this.renderScene("default");
}

/*
 * Completes any required initialization before the update/render loop begins
 */
RaySubLibGL.prototype.onStartTick = function() {
	// show the canvas and remove the loading screen
	// this.show("page", true);
	// this.show("loading", false);

	// bind the shapes to avoid a warning when rendering the cubemap for the first time
	this.renderScene("default");

	// set the canvas size and begin the update/render loop
	this.resizeCanvas();
	this.tick();
}

/*
 * The function specifying what to do when the window is resized.
 * @Override.
 */
RaySubLibGL.prototype.resizeCanvas = function() {
	this.resize(canvas_div.offsetWidth, canvas_div.offsetWidth);
	this.render();
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
RaySubLibGL.prototype.initShaders = function() {

	// default shaders
	this.addProgram("default", variable.theme_url + "/shaders/fullquad.vert", variable.theme_url + "/shaders/render-ray.frag",
					// attributes
					["aPosition", "aNormal", "aTexCoord"],
					// uniforms
					["uScaleViewInv", "uEyePos", "uViewport", "uNumShapes",
					 "uLightLocation", "uAntialiasing", "uUseShadows", "uBrightness",
					 "uIterations"]);
}

/*
 * Loads all necessary textures.
 * @Override
 */
RaySubLibGL.prototype.initTextures = function() {}

/*
 * Creates a scene of basic primitive shapes and lights.
 * @Override
 */
RaySubLibGL.prototype.setScene = function() {

	// add lights
	this.addLight(LightType.POINT, [0, 10, 0], [4.0, 4.0, 4.0], 0.1);

	// add primitives
	var trans = mat4.create();

	this.addPrimitive(ShapeType.SPHERE, trans, [0.0, 0.0, 1.0, 1.0], [64.0, 1.0, 0.0, 0.1], "");

	mat4.identity(trans);
	mat4.translate(trans, trans, [0, -7, 0]);
	mat4.rotate(trans, trans, degToRad(90), [1, 0, 0]);
	mat4.scale(trans, trans, [15, 15, 1]);
	this.addPrimitive(ShapeType.PLANE, trans, [1.0, 1.0, 1.0, 1.0], [512.0, 1.0, 0.0, 0.1], "");

	mat4.identity(trans);
	mat4.translate(trans, trans, [-5, 0, 0]);
	this.addPrimitive(ShapeType.CONE, trans, [1.0, 1.0, 0.0, 1.0], [64.0, 1.0, 0.0, 0.1], "");

	mat4.identity(trans);
	mat4.rotate(trans, trans, degToRad(90), [0, 0, 1]);
	mat4.translate(trans, trans, [-5, 0, 0]);
	this.addPrimitive(ShapeType.CYLINDER, trans, [1.0, 0.0, 1.0, 1.0], [64.0, 1.0, 0.0, 0.1], "");

	mat4.identity(trans);
	mat4.rotate(trans, trans, degToRad(180), [0, 0, 1]);
	mat4.translate(trans, trans, [-5, 0, 0]);
	this.addPrimitive(ShapeType.HOLLOW_CYLINDER, trans, [1.0, 0.0, 0.0, 1.0], [64.0, 1.0, 0.0, 0.1], "");
	
	mat4.identity(trans);
	mat4.rotate(trans, trans, degToRad(270), [0, 0, 1]);
	mat4.translate(trans, trans, [-5, 0, 0]);
	this.addPrimitive(ShapeType.CUBE, trans, [0.0, 1.0, 1.0, 1.0], [128.0, 1.0, 0.0, 0.1], "");

}

/*
 * 'main' function where program starts
 */
function main() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var rayLibGL = new RaySubLibGL();
	rayLibGL.init(canvas, canvas_div, []);

	// html input
	rayLibGL.addLinkedInput("brightness", "brightnessText");
	rayLibGL.addHTMLElement("antialiasing");
	rayLibGL.addHTMLElement("shadows");
	rayLibGL.addHTMLElement("reflections");
	rayLibGL.addLinkedInput("iterations", "iterationsText");

	rayLibGL.HTMLElements["reflections"].onclick = function() {
		if (rayLibGL.HTMLElements["reflections"].checked) {
			document.getElementById("reflection_div").className = "";
		} else {
			document.getElementById("reflection_div").className = "dull";
		}
	}

	rayLibGL.start();
}




