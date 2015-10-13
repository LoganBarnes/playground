
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = ".";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */



////////////////////////////////////////////////////////////////////
///////////////////////// MENU LIBGL CLASS /////////////////////////
////////////////////////////////////////////////////////////////////

/*
 * Create a sub LibGL class to override functions and add
 * advanced functionality without having to completely
 * recreate a new WebGL setup.
 */
 function MenuLibGL() {
 	LibGL.call(this);

 	this.Icon = Object.freeze({
		GRAVITY: 	0,
		MUSIC: 		1,
		SPACE: 		2,
		RENDER: 	3,
		FFT: 		4,
		DEFAULT: 	5,
		LOGO: 		6,
		NUM_ICONS:  7
	});

	this.mainRadius = 8.0;
	var R = 1.0; // radius

	// cos of angle corresponds to z not x
	this.Box = makeStruct("min max center angle scale animate time");
	this.Shape = makeStruct("center scale primitive");

	this.gravityBox = new this.Box([R, R, R], [R, R, R], [0, 2, 0], 0, [1,   1,   1], false);
	this.musicBox   = new this.Box([R, R, R], [R, R, R], [0, 2, 0], 0, [1,   1,   1], false);
	this.spaceBox   = new this.Box([R, R, R], [R, R, R], [0, 2, 0], 0, [1,   1,   1], false);
	this.rayBox     = new this.Box([R, R, R], [R, R, R], [0, 2, 0], 0, [1,   1,   1], false);
	this.fftBox     = new this.Box([R, R, R], [R, R, R], [0, 2, 0], 0, [1,   1,   1], false);
	this.defaultBox = new this.Box([R, R, R], [R, R, R], [0, 2, 0], 0, [1,   1,   1], false);
	this.logoBox    = new this.Box([R, R, R], [R, R, R], [0, 2, 0], 0, [4, 1.5, 0.5], false);

	this.boxes = [this.gravityBox, this.musicBox, this.spaceBox, this.rayBox, this.fftBox, this.defaultBox, this.logoBox];

	var num = this.boxes.length - 1;
	for (var i = 0; i < num; ++i) {
		this.boxes[i].angle = i * 360 / num;
	}

	this.gravityShapes = [];
	this.musicShapes = [];
	this.spaceShapes = [];
	this.renderShapes = [];
	this.fftShapes = [];
	this.defaultShapes = [];

	this.musicFunction = [];

	this.selected = -1;
	this.hover = -1;
	this.goalVel;
	this.velocity;
	this.K;

	this.scaleViewMatrixInv = mat4.create();
};

// make MenuLibGL a subclass
MenuLibGL.prototype = Object.create(LibGL.prototype);
// Set the "constructor" property to refer to MenuLibGL
MenuLibGL.prototype.constructor = MenuLibGL;



/*
                                                                                                                    
    ,o888888o.    8 888888888o.            .8. `8.`888b           ,8'  8 8888 8888888 8888888888 `8.`8888.      ,8' 
   8888     `88.  8 8888    `88.          .888. `8.`888b         ,8'   8 8888       8 8888        `8.`8888.    ,8'  
,8 8888       `8. 8 8888     `88         :88888. `8.`888b       ,8'    8 8888       8 8888         `8.`8888.  ,8'   
88 8888           8 8888     ,88        . `88888. `8.`888b     ,8'     8 8888       8 8888          `8.`8888.,8'    
88 8888           8 8888.   ,88'       .8. `88888. `8.`888b   ,8'      8 8888       8 8888           `8.`88888'     
88 8888           8 888888888P'       .8`8. `88888. `8.`888b ,8'       8 8888       8 8888            `8. 8888      
88 8888   8888888 8 8888`8b          .8' `8. `88888. `8.`888b8'        8 8888       8 8888             `8 8888      
`8 8888       .8' 8 8888 `8b.       .8'   `8. `88888. `8.`888'         8 8888       8 8888              8 8888      
   8888     ,88'  8 8888   `8b.    .888888888. `88888. `8.`8'          8 8888       8 8888              8 8888      
    `8888888P'    8 8888     `88. .8'       `8. `88888. `8.`           8 8888       8 8888              8 8888      
*/

var gravityTime = -103.4; // random but good initial points
MenuLibGL.prototype.animateGravityIcons = function(deltaTime) {
	gravityTime += deltaTime;

	this.gravityShapes[0].center = [ Math.cos(gravityTime * 5.0) * 0.1,
									 Math.cos(gravityTime * 5.0) * 0.01,
									 Math.sin(gravityTime * 5.0) * 0.1];

	this.gravityShapes[1].center = [ Math.cos(gravityTime * 2.5) * 0.7,
									 Math.sin(gravityTime * 1.5) * 0.7,
									 Math.sin(gravityTime * 2.5) * 0.7];

	vec3.scale(this.gravityShapes[2].center, this.gravityShapes[0].center, -4.0);

	this.gravityShapes[3].center = [ Math.sin(gravityTime * 3.0) * 0.5,
									 Math.sin(gravityTime * 2.0) * 0.5,
									 Math.cos(gravityTime * 3.0) * 0.5];

	this.gravityShapes[0].center[1] += 0.25;
	this.gravityShapes[1].center[1] += 0.25;
	this.gravityShapes[2].center[1] += 0.25;
	this.gravityShapes[3].center[1] += 0.25;
	
	this.updateGravityIcons();
}

MenuLibGL.prototype.updateGravityIcons = function() {

	var num = this.gravityShapes.length;
	for (var i = 0; i < num; ++i) {
		var s = this.gravityShapes[i];
		var prim = s.primitive;

		mat4.identity(prim.trans);
		mat4.translate(prim.trans, prim.trans, this.boxes[this.Icon.GRAVITY].center);
		mat4.translate(prim.trans, prim.trans, s.center);
		mat4.scale(prim.trans, prim.trans, s.scale);
		mat4.invert(prim.invT, prim.trans);
		mat4.transpose(prim.invT, prim.invT);
	}
}

MenuLibGL.prototype.setUpGravityIcons = function() {

	var center = [0, 0, 0];
	var color;
	var scale;
	var prim;

	color = [1, 0, 0, 1];
	scale = [0.3, 0.3, 0.3];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.gravityShapes.push(new this.Shape(center, scale, prim));

	color = [1, 1, 1, 1];
	scale = [0.14, 0.14, 0.14];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.gravityShapes.push(new this.Shape(center, scale, prim));

	color = [1, 1, 1, 1];
	scale = [0.1, 0.1, 0.1];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.gravityShapes.push(new this.Shape(center, scale, prim));

	color = [1, 1, 1, 1];
	scale = [0.1, 0.1, 0.1];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.gravityShapes.push(new this.Shape(center, scale, prim));

	this.animateGravityIcons(0.0);
}


/*
          .         .                                                                
         ,8.       ,8.       8 8888      88    d888888o.    8 8888     ,o888888o.    
        ,888.     ,888.      8 8888      88  .`8888:' `88.  8 8888    8888     `88.  
       .`8888.   .`8888.     8 8888      88  8.`8888.   Y8  8 8888 ,8 8888       `8. 
      ,8.`8888. ,8.`8888.    8 8888      88  `8.`8888.      8 8888 88 8888           
     ,8'8.`8888,8^8.`8888.   8 8888      88   `8.`8888.     8 8888 88 8888           
    ,8' `8.`8888' `8.`8888.  8 8888      88    `8.`8888.    8 8888 88 8888           
   ,8'   `8.`88'   `8.`8888. 8 8888      88     `8.`8888.   8 8888 88 8888           
  ,8'     `8.`'     `8.`8888.` 8888     ,8P 8b   `8.`8888.  8 8888 `8 8888       .8' 
 ,8'       `8        `8.`8888. 8888   ,d8P  `8b.  ;8.`8888  8 8888    8888     ,88'  
,8'         `         `8.`8888. `Y88888P'    `Y8888P ,88P'  8 8888     `8888888P'    
*/

var musicTime = -103.4; // random but good initial points
MenuLibGL.prototype.animateMusicIcons = function(deltaTime) {
	musicTime += deltaTime * 7.0;

	var len = this.musicFunction.length;
	var angle;
	for (var i = 0; i < len; ++i) {
		this.musicFunction[i] = Math.sin(i * 17.0 / len + musicTime) * 0.5 + 0.5;
	}
	
	this.updateMusicIcons();
}

MenuLibGL.prototype.updateMusicIcons = function() {

	var num = this.musicShapes.length;
	for (var i = 0; i < num; ++i) {
		var s = this.musicShapes[i];
		var prim = s.primitive;

		mat4.identity(prim.trans);
		mat4.translate(prim.trans, prim.trans, this.boxes[this.Icon.MUSIC].center);
		mat4.translate(prim.trans, prim.trans, s.center);
		mat4.scale(prim.trans, prim.trans, s.scale);
		mat4.invert(prim.invT, prim.trans);
		mat4.transpose(prim.invT, prim.invT);
	}
}

MenuLibGL.prototype.setUpMusicIcons = function() {

	var center = [0, 0, 0];
	var color;
	var scale;
	var prim;

	color = [0.25, 1.0, 0.25, 1];
	scale = [0.2, 0.2, 0.2];
	center = [0.0, -0.4, 0.2];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [1.0, 0.0, 0.0, 0.0], "");
	this.musicShapes.push(new this.Shape(center, scale, prim));
	
	color = [1.0, 0.25, 1.0, 1];
	scale = [0.2, 0.2, 0.2];
	center = [-0.7, 0.0, -0.2];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [1.0, 0.0, 0.0, 0.0], "");
	this.musicShapes.push(new this.Shape(center, scale, prim));

	color = [0.25, 1.0, 1.0, 1];
	scale = [0.2, 0.2, 0.2];
	center = [0.7, 0.0, -0.2];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [1.0, 0.0, 0.0, 0.0], "");
	this.musicShapes.push(new this.Shape(center, scale, prim));

	color = [1.0, 1.0, 0.25, 1];
	scale = [0.2, 0.2, 0.2];
	center = [0.0, 0.4, -0.7];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [1.0, 0.0, 0.0, 0.0], "");
	this.musicShapes.push(new this.Shape(center, scale, prim));

	for (var i = 0; i < 25; ++i) {
		this.musicFunction.push(0.0);
	}

	this.animateMusicIcons(0.0);
}


/*
                                                                            
   d888888o.   8 888888888o      .8.           ,o888888o.    8 8888888888   
 .`8888:' `88. 8 8888    `88.   .888.         8888     `88.  8 8888         
 8.`8888.   Y8 8 8888     `88  :88888.     ,8 8888       `8. 8 8888         
 `8.`8888.     8 8888     ,88 . `88888.    88 8888           8 8888         
  `8.`8888.    8 8888.   ,88'.8. `88888.   88 8888           8 888888888888 
   `8.`8888.   8 888888888P'.8`8. `88888.  88 8888           8 8888         
    `8.`8888.  8 8888      .8' `8. `88888. 88 8888           8 8888         
8b   `8.`8888. 8 8888     .8'   `8. `88888.`8 8888       .8' 8 8888         
`8b.  ;8.`8888 8 8888    .888888888. `88888.  8888     ,88'  8 8888         
 `Y8888P ,88P' 8 8888   .8'       `8. `88888.  `8888888P'    8 888888888888   
*/

var spaceTime = -103.4; // random but good initial points
var prevX = [	Math.cos(spaceTime * 3.5 + Math.PI),
				Math.cos(spaceTime * 3.5 + Math.PI * 0.3),
				Math.cos(spaceTime * 3.5)];
MenuLibGL.prototype.animateSpaceIcons = function(deltaTime) {
	spaceTime += deltaTime;

	this.spaceShapes[0].center = [0, -0.1, Math.cos(spaceTime * 3.5) * 0.5];

	this.spaceShapes[1].center = [0, 0.0, Math.cos(spaceTime * 3.5) * 0.5];

	var x = Math.cos(spaceTime * 3.5 + Math.PI);
	if (prevX[0] < x || x < -0.6 || x > 0.6) {
		prevX[0] = x;
		x = -1000;
	} else {
		prevX[0] = x;
	}
	this.spaceShapes[2].center = [x * 3, 0.2, -0.5];

	x = Math.cos(spaceTime * 3.5 + Math.PI * 0.3);
	if (prevX[1] < x || x < -0.6 || x > 0.6) {
		prevX[1] = x;
		x = -1000;
	} else {
		prevX[1] = x;
	}
	this.spaceShapes[3].center = [x * 2.5, -0.3, 0.6];

	x = Math.cos(spaceTime * 3.5);
	if (prevX[2] < x || x < -0.6 || x > 0.6) {
		prevX[2] = x;
		x = -1000;
	} else {
		prevX[2] = x;
	}
	this.spaceShapes[4].center = [x * 2.5, 0.3, 0.2];
	
	this.updateSpaceIcons();
}

MenuLibGL.prototype.updateSpaceIcons = function() {

	var num = this.spaceShapes.length;
	for (var i = 0; i < num; ++i) {
		var s = this.spaceShapes[i];
		var prim = s.primitive;

		mat4.identity(prim.trans);
		mat4.translate(prim.trans, prim.trans, this.boxes[this.Icon.SPACE].center);
		if (i == 0) {
			mat4.translate(prim.trans, prim.trans, [s.center[0], 0, s.center[2] ]);
			mat4.rotate(prim.trans, prim.trans, - Math.cos(spaceTime * 3.5 + Math.PI * 0.1) * 0.5, [1, 0, 0] );
			mat4.translate(prim.trans, prim.trans, [0, s.center[1], 0]);
		} else {
			mat4.translate(prim.trans, prim.trans, s.center);
		}
		mat4.scale(prim.trans, prim.trans, s.scale);
		mat4.invert(prim.invT, prim.trans);
		mat4.transpose(prim.invT, prim.invT);
	}
}

MenuLibGL.prototype.setUpSpaceIcons = function() {

	var center = [0, 0, 0];
	var color;
	var scale;
	var prim;

	color = [0.8, 0.65, 0.5, 1];
	scale = [0.75, 0.15, 0.75];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.spaceShapes.push(new this.Shape(center, scale, prim));

	color = [0.8, 0.8, 0.8, 1];
	scale = [0.3, 0.15, 0.15];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.spaceShapes.push(new this.Shape(center, scale, prim));

	color = [0.55, 0.27, 0.075, 1];
	scale = [0.1, 0.1, 0.1];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.spaceShapes.push(new this.Shape(center, scale, prim));

	color = [0.55, 0.27, 0.075, 1];
	scale = [0.1, 0.1, 0.1];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.spaceShapes.push(new this.Shape(center, scale, prim));

	color = [0.55, 0.27, 0.075, 1];
	scale = [0.1, 0.1, 0.1];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 0.0, 0.0], "");
	this.spaceShapes.push(new this.Shape(center, scale, prim));

	this.animateSpaceIcons(0.0);
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

var renderTime = -103.4; // random but good initial points
// var renderMatrix = mat4.create();
MenuLibGL.prototype.animateRenderIcons = function(deltaTime) {
	renderTime += deltaTime;

	// mat4.rotate(renderMatrix, renderMatrix, degToRad(renderTime * 0.01), [0, 1, 0]);

	this.updateRenderIcons();
}

MenuLibGL.prototype.updateRenderIcons = function() {

	var s = this.renderShapes[0];
	var prim = s.primitive;

	mat4.identity(prim.trans);
	mat4.translate(prim.trans, prim.trans, this.boxes[this.Icon.RENDER].center);
	mat4.translate(prim.trans, prim.trans, s.center);
	mat4.rotate(prim.trans, prim.trans, renderTime, [0, 1, 0]);
	mat4.scale(prim.trans, prim.trans, s.scale);
	mat4.invert(prim.invT, prim.trans);
	mat4.transpose(prim.invT, prim.invT);
}

MenuLibGL.prototype.setUpRenderIcons = function() {

	var center = [0, 0, 0];
	var color;
	var scale;
	var prim;

	color = [1, 0.84, 0, 1];
	scale = [0.7, 0.7, 0.7];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 1.0, 0.0, 0.0], "normals");
	this.renderShapes.push(new this.Shape(center, scale, prim));

	this.animateRenderIcons(0.0);
}


/*
                                               
8 8888888888   8 8888888888 8888888 8888888888 
8 8888         8 8888             8 8888       
8 8888         8 8888             8 8888       
8 8888         8 8888             8 8888       
8 888888888888 8 888888888888     8 8888       
8 8888         8 8888             8 8888       
8 8888         8 8888             8 8888       
8 8888         8 8888             8 8888       
8 8888         8 8888             8 8888       
8 8888         8 8888             8 8888       
*/

var fftTime = -180;
MenuLibGL.prototype.animateFFTIcons = function(deltaTime) {
	fftTime += deltaTime;
	this.fftShapes[0].primitive.settings[3] = Math.sin(fftTime) * 0.5 + 0.5;
}

MenuLibGL.prototype.updateFFTIcons = function() {

	var s = this.fftShapes[0];
	var prim = s.primitive;

	mat4.identity(prim.trans);
	mat4.translate(prim.trans, prim.trans, this.boxes[this.Icon.FFT].center);
	mat4.translate(prim.trans, prim.trans, s.center);
	mat4.rotate(prim.trans, prim.trans, degToRad(20), [-1, 0, 0]);
	mat4.scale(prim.trans, prim.trans, s.scale);
	mat4.invert(prim.invT, prim.trans);
	mat4.transpose(prim.invT, prim.invT);
}

MenuLibGL.prototype.setUpFFTIcons = function() {

	var center = [0, 0, 0];
	var color;
	var scale;
	var prim;

	color = [1, 1, 1, 1];
	scale = [0.8, 0.8, 0.8];
	prim = this.addPrimitive(ShapeType.QUAD, mat4.create(), color, [1.0, 1.0, 1.0, 1.0], "fft");
	this.fftShapes.push(new this.Shape(center, scale, prim));

	this.animateFFTIcons(0.0);
	this.updateFFTIcons();
}


/*
                                                                                                          
8 888888888o.      8 8888888888   8 8888888888       .8.       8 8888      88 8 8888   8888888 8888888888 
8 8888    `^888.   8 8888         8 8888            .888.      8 8888      88 8 8888         8 8888       
8 8888        `88. 8 8888         8 8888           :88888.     8 8888      88 8 8888         8 8888       
8 8888         `88 8 8888         8 8888          . `88888.    8 8888      88 8 8888         8 8888       
8 8888          88 8 888888888888 8 888888888888 .8. `88888.   8 8888      88 8 8888         8 8888       
8 8888          88 8 8888         8 8888        .8`8. `88888.  8 8888      88 8 8888         8 8888       
8 8888         ,88 8 8888         8 8888       .8' `8. `88888. 8 8888      88 8 8888         8 8888       
8 8888        ,88' 8 8888         8 8888      .8'   `8. `88888.` 8888     ,8P 8 8888         8 8888       
8 8888    ,o88P'   8 8888         8 8888     .888888888. `88888. 8888   ,d8P  8 8888         8 8888       
8 888888888P'      8 888888888888 8 8888    .8'       `8. `88888. `Y88888P'   8 888888888888 8 8888       
*/

var defaultTime = -103.4; // random but good initial points
MenuLibGL.prototype.animateDefaultIcons = function(deltaTime) {
	defaultTime += deltaTime;
	this.updateDefaultIcons();
}

MenuLibGL.prototype.updateDefaultIcons = function() {

	var s = this.defaultShapes[0];
	var prim = s.primitive;

	mat4.identity(prim.trans);
	mat4.translate(prim.trans, prim.trans, this.boxes[this.Icon.DEFAULT].center);
	mat4.translate(prim.trans, prim.trans, s.center);
	mat4.rotate(prim.trans, prim.trans, defaultTime, [0, 1, 0]);
	mat4.scale(prim.trans, prim.trans, s.scale);
	mat4.invert(prim.invT, prim.trans);
	mat4.transpose(prim.invT, prim.invT);
}

MenuLibGL.prototype.setUpDefaultIcons = function() {

	var center = [0, 0, 0];
	var color;
	var scale;
	var prim;

	color = [1, 1, 1, 1];
	scale = [0.7, 0.7, 0.7];
	prim = this.addPrimitive(ShapeType.SPHERE, mat4.create(), color, [0.0, 0.0, 1.0, 0.0], "earth");
	this.defaultShapes.push(new this.Shape(center, scale, prim));

	this.animateDefaultIcons(0.0);
}


/*
                                                    
         .8.          8 8888         8 8888         
        .888.         8 8888         8 8888         
       :88888.        8 8888         8 8888         
      . `88888.       8 8888         8 8888         
     .8. `88888.      8 8888         8 8888         
    .8`8. `88888.     8 8888         8 8888         
   .8' `8. `88888.    8 8888         8 8888         
  .8'   `8. `88888.   8 8888         8 8888         
 .888888888. `88888.  8 8888         8 8888         
.8'       `8. `88888. 8 888888888888 8 888888888888 
*/

MenuLibGL.prototype.updateIcons = function() {
	this.updateGravityIcons();
	this.updateMusicIcons();
	this.updateSpaceIcons();
	this.updateRenderIcons();
	this.updateFFTIcons();
	this.updateDefaultIcons();
}

MenuLibGL.prototype.setUpIcons = function() {
	this.setUpGravityIcons();
	this.setUpMusicIcons();
	this.setUpSpaceIcons();
	this.setUpRenderIcons();
	this.setUpFFTIcons();
	this.setUpDefaultIcons();
}


////////////////////////////////////////////////////////////////////
//////////////////////// SELECTION FUNCTIONS ///////////////////////
////////////////////////////////////////////////////////////////////

MenuLibGL.prototype.selectIcon = function(index) {
	
	if (index < 0) {
		// jQuery('.hidden').hide();
		// jQuery('#summary').fadeOut();
		return;
	}
	this.selected = index;
	this.velocity = -this.boxes[index].angle * 2;

	var length = this.boxes.length - 1; // don't check logo
	for (var i = 0; i < length; ++i) {
		if (i != this.selected) {
			this.boxes[i].animate = false;
		}
	}

	jQuery('.hidden').hide();

	switch(this.selected) {
		case this.Icon.GRAVITY:
			jQuery('#summary').fadeIn();
			jQuery('#gravity_div').fadeIn();
			break;
		case this.Icon.MUSIC:
			jQuery('#summary').fadeIn();
			jQuery('#music_div').fadeIn();
			break;
		case this.Icon.SPACE:
			jQuery('#summary').fadeIn();
			jQuery('#space_div').fadeIn();
			break;
		case this.Icon.RENDER:
			jQuery('#summary').fadeIn();
			jQuery('#render_div').fadeIn();
			break;
		case this.Icon.FFT:
			jQuery('#summary').fadeIn();
			jQuery('#fft_div').fadeIn();
			break;
		case this.Icon.DEFAULT:
			jQuery('#summary').fadeIn();
			jQuery('#default_div').fadeIn();
			break;
		default:
			break;
	}

	this.hover = -1;
}

/////////////////////////////////////////////////////////////////////
////////////////////////// RAY FUNCTIONS ////////////////////////////
/////////////////////////////////////////////////////////////////////

MenuLibGL.prototype.intersectsAABB = function(ro, rdi, sign, bounds, t0, t1) {
	var tmin, tmax, tymin, tymax, tzmin, tzmax;

	tmin = (bounds[sign[0]][0] - ro[0]) * rdi[0];
	tmax = (bounds[1-sign[0]][0] - ro[0]) * rdi[0];
	tymin = (bounds[sign[1]][1] - ro[1]) * rdi[1];
	tymax = (bounds[1-sign[1]][1] - ro[1]) * rdi[1];

	if ( (tmin > tymax) || (tymin > tmax) ) 
		return false;

	if (tymin > tmin)
		tmin = tymin;
	if (tymax < tmax)
		tmax = tymax;
	tzmin = (bounds[sign[2]][2] - ro[2]) * rdi[2];
	tzmax = (bounds[1-sign[2]][2] - ro[2]) * rdi[2];

	if ( (tmin > tzmax) || (tzmin > tmax) ) 
		return false;

	if (tzmin > tmin)
		tmin = tzmin;
	if (tzmax < tmax)
		tmax = tzmax;

	if ( (tmin < t1) && (tmax > t0) )
		return (tmin < t0 ? tmax : tmin);
	return false;
}

MenuLibGL.prototype.castRay = function(mouseX, mouseY) {

	var x = mouseX * 2.0 / this.gl.canvas.width - 1.0;
	var y = 1.0 - mouseY * 2.0 / this.gl.canvas.height;

	// rayDir = farWorld temporarily
	var rayDir = vec4.create();
	vec4.transformMat4(rayDir, [x, y, -1, 1], this.scaleViewMatrixInv);
	vec4.subtract(rayDir, rayDir, this.getEye());
	vec4.normalize(rayDir, rayDir);

	var rayDirInv = [1.0 / rayDir[0], 1.0 / rayDir[1], 1.0 / rayDir[2]];
	var sign = [(rayDirInv[0] < 0.0 ? 1 : 0), (rayDirInv[1] < 0.0 ? 1 : 0), (rayDirInv[2] < 0.0 ? 1 : 0)];

	var index = -1;
	var length = this.boxes.length - 1; // don't check logo
	for (var i = 0; i < length; ++i) {
		if (this.intersectsAABB(this.getEye(), rayDirInv, sign, [this.boxes[i].min, this.boxes[i].max], 0.0, 100.0)) {
			this.boxes[i].animate = true;
			index = i;
		} else if (i != this.selected) {
			this.boxes[i].animate = false;
		}
	}
	return index;
}


/////////////////////////////////////////////////////////////////////
/////////////////////////// MOUSE EVENTS ////////////////////////////
/////////////////////////////////////////////////////////////////////

MenuLibGL.prototype.handleMouseUp = function(mouseEvent) {
	this.mouseDown = false;

	var pos = this.getMousePos(mouseEvent);
	var index = this.castRay(pos.x, pos.y);
	if (index != this.selected) {
		this.selectIcon(index);
	}
}


MenuLibGL.prototype.handleMouseMove = function(mouseEvent) {
	var pos = this.getMousePos(mouseEvent);
	
	if (!this.mouseDown) {
		// var oldHover = this.hover;
		this.hover = this.castRay(pos.x, pos.y);
		// if (oldHover == -1 && this.hover != -1) {
		// 	this.resumeTick();
		// }
		return;
	}

	var deltaX = pos.x - this.lastMouseX;
	var deltaY = pos.y - this.lastMouseY;

	this.lastMouseX = pos.x
	this.lastMouseY = pos.y;
}

/*
 * @Override
 */
MenuLibGL.prototype.handleMouseWheel = function(mouseEvent) {
	// don't need to disable default functionality for this
	// (it's disabled in the super function)
}


////////////////////////////////////////////////////////////////////
//////////////////////////// RENDERING /////////////////////////////
////////////////////////////////////////////////////////////////////

/*
 * Added an additional shadow map texture
 * @Override
 */
MenuLibGL.prototype.setCameraAndLightUniforms = function(program) {
	this.gl.uniformMatrix4fv(this.getUniform(program, "uPVMatrix"), false, this.camera.projViewMatrix);
	this.gl.uniform1f(this.getUniform(program, "uLightScale"), this.lightScale);
	this.gl.uniform3fv(this.getUniform(program, "uAmbientRadiance"), this.ambientRadiance);

	var numLights = this.lights.length;
	if (numLights < this.MAX_LIGHTS) {
		var prog = this.getProgram("default");
		var loc = this.gl.getUniformLocation(prog, "uLights[" + numLights + "].type");
		this.gl.uniform1i(loc, -1);
	}
	this.gl.activeTexture(this.gl.TEXTURE1);
	this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemaps["reflection"].texture);
	this.gl.uniform1i(this.getUniform(program, "uCubeMap"), 1);

	this.gl.uniform4fv(this.getUniform(program, "uEyePos"), this.getEye());

	this.gl.activeTexture(this.gl.TEXTURE2);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures["lenna"]);
	this.gl.uniform1i(this.getUniform(program, "uAltTexture"), 2);
}

// /*
//  * Used by the 'shadowmap' and 'default' programs to set shape uniforms
//  * when rendering the scene.
//  * @Override
//  */
// MenuLibGL.prototype.setShapeUniforms = function(s, program, args) {
// 	this.gl.uniform4fv(this.getUniform(program, "uShapeSettings"), s.settings);
// 	this.gl.uniform3f(this.getUniform(program, "uColor"), s.color[0], s.color[1], s.color[2]);

// 	this.gl.uniformMatrix4fv(this.getUniform(program, "uMMatrix"), false, s.trans);
// 	this.gl.uniformMatrix4fv(this.getUniform(program, "uMMatrixIT"), false, s.invT);
// }

MenuLibGL.prototype.setShapeUniforms = function(sm, program, args) {
	this.gl.uniform4fv(this.getUniform(program, "uShapeSettings"), sm.settings);
	this.gl.uniform3f(this.getUniform(program, "uColor"), sm.color[0], sm.color[1], sm.color[2]);

	this.gl.uniformMatrix4fv(this.getUniform(program, "uMMatrix"), false, sm.trans);
	this.gl.uniformMatrix4fv(this.getUniform(program, "uMMatrixIT"), false, sm.invT);
	
	var prog = this.getProgram(program);
	var len = this.musicFunction.length;
	for (var i = 0; i < len; ++i) {
		this.gl.uniform1f(this.gl.getUniformLocation(prog, "uFunction[" + i + "]"), this.musicFunction[i]);
	}
	this.gl.uniform1i(this.getUniform(program, "uFunctionSize"), len);
}


/*
 * Called on every frame. Renders everything needed for the current frame.
 * Added shadowmap creation.
 * @Override
 */
MenuLibGL.prototype.render = function() {

	// set the viewport and clear the buffers
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// render the environment and shapes
	this.renderScene("default");
}


////////////////////////////////////////////////////////////////////
///////////////////////////// UPDATES //////////////////////////////
////////////////////////////////////////////////////////////////////

MenuLibGL.prototype.updatePos = function(deltaTime) {

	var diff = vec3.create();

	if (this.selected < 0 || Math.abs(this.boxes[this.selected].angle) < 1) {
		return;
	}
	if (this.velocity < 0.0 == this.boxes[this.selected].angle < 0.0) {
		this.velocity *= -0.5;
		return;
	}

	var angleDelta = this.velocity * deltaTime;
	// angleDelta = 0.5;

	var length = this.boxes.length - 1;
	for (var i = 0; i < length; ++i) {
		var box = this.boxes[i];
		box.angle += angleDelta;
		if (box.angle > 180.0)
			box.angle -= 360.0;
		if (box.angle < -180)
			box.angle += 360;

		vec3.copy(diff, box.center);

		box.center[0] = Math.sin(degToRad(box.angle)) * this.mainRadius;
		box.center[2] = Math.cos(degToRad(box.angle)) * this.mainRadius;

		vec3.subtract(diff, box.center, diff);

		vec3.add(box.min, box.min, diff);
		vec3.add(box.max, box.max, diff);
	}

	this.updateIcons();
}

MenuLibGL.prototype.animate = function(deltaTime) {
	switch (this.hover) {
		case this.Icon.GRAVITY:
			this.animateGravityIcons(deltaTime);
			break;
		case this.Icon.MUSIC:
			this.animateMusicIcons(deltaTime);
			break;
		case this.Icon.SPACE:
			this.animateSpaceIcons(deltaTime);
			break;
		case this.Icon.RENDER:
			this.animateRenderIcons(deltaTime);
			break;
		case this.Icon.FFT:
			this.animateFFTIcons(deltaTime);
			break;
		case this.Icon.DEFAULT:
			this.animateDefaultIcons(deltaTime);
			break;
		default:
			break;
	}

	switch (this.selected) {
		case this.Icon.GRAVITY:
			this.animateGravityIcons(deltaTime);
			break;
		case this.Icon.MUSIC:
			this.animateMusicIcons(deltaTime);
			break;
		case this.Icon.SPACE:
			this.animateSpaceIcons(deltaTime);
			break;
		case this.Icon.RENDER:
			this.animateRenderIcons(deltaTime);
			break;
		case this.Icon.FFT:
			this.animateFFTIcons(deltaTime);
			break;
		case this.Icon.DEFAULT:
			this.animateDefaultIcons(deltaTime);
			break;
		default:
			break;
	}
}

/*
 * Completes any required initialization before the update/render loop begins
 */
LibGL.prototype.onStartTick = function() {
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
 * The repeating 'update' function called each frame by requestAnimFrame()
 * @Override
 */
MenuLibGL.prototype.tick = function() {
	// only redraw if the image changed
	// if (this.hover != -1 || (this.selected > -1 && Math.abs(this.boxes[this.selected].angle) > 1)) {
	// }
	requestAnimFrame(this.tick.bind(this));

	// update time
	var timeNow = new Date().getTime(); // milliseconds
	var deltaTime = (timeNow - this.lastTime) / 1000.0; // seconds
	this.lastTime = timeNow;

	this.updatePos(deltaTime);
	this.animate(deltaTime);

	this.handleInput();
	this.render();
}

/*
 * The function specifying what to do when the window is resized.
 * @Override
 */
MenuLibGL.prototype.resizeCanvas = function() {
	var w = Math.max(500, Math.floor(window.innerWidth * 0.7));
	// var h = Math.floor(w * 0.485);
	var h = Math.floor(w * 0.56);
	this.resize(w, h);

	// only need this update here because the view matrix can't be altered
	mat4.multiply(this.scaleViewMatrixInv, this.getScaleMatrix(), this.getViewMatrix());
	mat4.invert(this.scaleViewMatrixInv, this.scaleViewMatrixInv);
	
	this.render();
}


////////////////////////////////////////////////////////////////////
////////////////////////////// SETUP ///////////////////////////////
////////////////////////////////////////////////////////////////////

/*
 * Stores a single texture. Added render ability
 * @Override
 */
MenuLibGL.prototype.handleSingleTexture = function(gl, texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	if (this.isAllProgramsInitialized()) {
		this.render();
	}
}

/*
 * Stores a single side of a cubemap texture.
 * @Override
 */
MenuLibGL.prototype.handleCubemapTexture = function(gl, texture, side, image, flipy) {
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipy);
	gl.texImage2D(side, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

	if (this.isAllProgramsInitialized()) {
		this.render();
	}
}

/*
 * Loads all necessary shaders. Added shadowmap shader.
 * @Override 
 */
MenuLibGL.prototype.initShaders = function() {

	// default shaders
	this.addProgram("default", variable.theme_url + "/menu/res/shaders/default.vert", variable.theme_url + "/menu/res/shaders/default.frag",
					// attributes
					["aPosition", "aNormal", "aTexCoord"],
					// uniforms
					["uAmbientRadiance", "uLightScale", "uPVMatrix", "uMMatrix", "uMMatrixIT",
					 "uLightLocation", "uColor", "uShapeSettings", "uShapeTexture",
					 "uCubeMap", "uEyePos", "uFunctionSize", "uAltSettings", "uAltTexture"]);
}

/*
 * Loads all necessary textures.
 * @Override
 */
MenuLibGL.prototype.initTextures = function() {
	this.addTexture("earth", new Uint8Array([50, 50, 50, 225]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/menu/res/images/earth.jpg");
	this.addTexture("normals", new Uint8Array([127, 127, 255, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/menu/res/images/sphere-normals.jpg");
	this.addTexture("lenna", new Uint8Array([127, 127, 255, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/menu/res/images/lenna.png");
	this.addTexture("fft", new Uint8Array([127, 127, 255, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/menu/res/images/fft_shift.png");
	this.setCubeMap("reflection", "default", [127,127,127,255], variable.theme_url + "/menu/res/images/cubemap", 256, ".jpeg");
}


MenuLibGL.prototype.initBoxes = function() {
	var box;
	var len = this.boxes.length;
	for (var i = 0; i < len; ++i) {
		box = this.boxes[i];

		if (i != this.Icon.LOGO) {
			box.center[0] = Math.sin(degToRad(box.angle)) * this.mainRadius;
			box.center[2] = Math.cos(degToRad(box.angle)) * this.mainRadius;
		}

		vec3.multiply(box.min, box.min, box.scale);
		vec3.multiply(box.max, box.max, box.scale);
		vec3.subtract(box.min, box.center, box.min);
		vec3.add(box.max, box.center, box.max); 
	}

	this.setUpIcons();
}

/*
 * Creates a scene of basic primitive shapes and lights.
 * @Override
 */
MenuLibGL.prototype.setScene = function() {

	// add a lights
	this.addLight(LightType.POINT, [25, 100, 50], [4.0, 4.0, 4.0], 0.1);
	this.lightScale = 10.0; // inverse scene brightness (higher is darker)
	this.ambientRadiance = [1.5, 1.5, 1.5];

	this.initBoxes();

	var trans = mat4.create();

	// add model to scene
	mat4.identity(trans);
	mat4.translate(trans, trans, [0, 2, 0]);
	mat4.scale(trans, trans, [3, 3, 3]);
	mat4.rotate(trans, trans, degToRad(-10), [1, 0, 0]);
	this.addModelJSON("ltb", variable.theme_url + "/menu/res/objects/ltb.json",
						trans, [0.8, 0.8, 0.8, 1.0], [0.0, 0.0, 0.0, 0.0], "");
}



////////////////////////////////////////////////////////////////////
/////////////////////////////// MAIN ///////////////////////////////
////////////////////////////////////////////////////////////////////

function main() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var spaceLib = new MenuLibGL();
	spaceLib.init(canvas, canvas_div, [] );

	spaceLib.gl.clearColor(0, 0, 0, 0);
	spaceLib.addOrbitCam(-18.0, 0.0, 30.0, [0, 0, 0], 40.0, 1.0, 0.1, 100.0);

	spaceLib.start();
}








