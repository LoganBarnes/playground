
var internet = true;

/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */
var variable = [];
variable.theme_url = "./res";
/* REMOVE THIS BEFORE USING WITH WORDPRESS!!!! */

var BoostType =  Object.freeze({
	STARBOARD_THRUST: 	0,
	PORT_THRUST: 		1,
	STARBOARD_BOW_LIFT: 2,
	STARBOARD_AFT_LIFT: 3,
	PORT_BOW_LIFT: 		4,
	PORT_AFT_LIFT: 		5,
	STRAFE: 			6,
	NUM_BOOSTERS: 		7
});

var SpaceShip = function(spaceLib) {
	this.ShipPrim = makeStruct("prim relTrans");

	this.prims = [];
	this.boosters = {};

	// orientation matrices and vectors
	this.trans = mat4.create();
	this.rot = mat4.create();
	this.invRot = mat4.create();
	this.model = mat4.create();
	this.invModel = mat4.create();

	this.goalVel = vec3.create();
	this.goalAngVel = vec3.create();

	this.forward = [0, 0, -1, 0];
	this.up = [0, 1, 0, 0];
	this.right = [1, 0, 0, 0];

	// ellipsoid scale
	var radX = 0.005;
	var radY = 0.0007;
	var radZ = 0.005;

	// physics vars
	this.mass = 500;
	this.invMass = 1.0 / this.mass;

	// inverse moment of inertia matrix (ellipsoid)
	this.I = mat3.create();
	this.invI = mat3.create();
	var fifthMass = this.mass * 0.2;
	this.I[0] = (radY * radY + radZ * radZ) * fifthMass;
	this.I[4] = (radX * radX + radZ * radZ) * fifthMass;
	this.I[8] = (radX * radX + radY * radY) * fifthMass;
	mat3.invert(this.invI, this.I);

	this.IRot = mat4.clone(this.I);
	this.invIRot = mat4.clone(this.invI);

	// force and linear velocity
	this.force = [0, 0, 0];
	this.vel = [0, 0, 0];
	this.pos = [0, 0, 0];

	// torque and angular velocity
	this.torque = [0, 0, 0];
	this.angVel = [0, 0, 0];

	var prim;
	var transMat = mat4.create();

	// build space ship
	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [0, 0, 0]);
	mat4.scale(transMat, transMat, [radX, radY, radZ]);
	prim = spaceLib.addPrimitive(ShapeType.SPHERE, transMat, [0.7, 0.7, 0.7, 1.0], [64.0, 0.0, 0.0, 0.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [0, 0.0005, -0.0015]);
	mat4.scale(transMat, transMat, [0.0013, 0.00085, 0.002]);
	prim = spaceLib.addPrimitive(ShapeType.SPHERE, transMat, [0.7, 0.7, 0.7, 1.0], [64.0, 0.0, 0.0, 0.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));

	// add thrusters
	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [0.003, -0.0005, 0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[BoostType.STARBOARD_AFT_LIFT] = this.prims[this.prims.length - 1];

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [0.003, 0.0005, 0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[-BoostType.STARBOARD_AFT_LIFT] = this.prims[this.prims.length - 1];

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [-0.003, -0.0005, 0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[BoostType.PORT_AFT_LIFT] = this.prims[this.prims.length - 1];

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [-0.003, 0.0005, 0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[-BoostType.PORT_AFT_LIFT] = this.prims[this.prims.length - 1];

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [0.003, -0.0005, -0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[BoostType.STARBOARD_BOW_LIFT] = this.prims[this.prims.length - 1];

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [0.003, 0.0005, -0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[-BoostType.STARBOARD_BOW_LIFT] = this.prims[this.prims.length - 1];

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [-0.003, -0.0005, -0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[BoostType.PORT_BOW_LIFT] = this.prims[this.prims.length - 1];

	mat4.identity(transMat);
	mat4.translate(transMat, transMat, [-0.003, 0.0005, -0.003]);
	mat4.scale(transMat, transMat, [0.00015, 0.0004, 0.00015]);
	prim = spaceLib.createPrimitive(ShapeType.CYLINDER, transMat, [1.0, 1.0, 1.0, 1.0], [64.0, 0.0, 0.0, 1.0], "");
	this.prims.push(new this.ShipPrim(prim, mat4.clone(transMat)));
	this.boosters[-BoostType.PORT_BOW_LIFT] = this.prims[this.prims.length - 1];
}

SpaceShip.prototype.updateModel = function() {
	var num = this.prims.length;
	var shipPrim, prim;
	for (var i = 0; i < num; ++i) {
		shipPrim = this.prims[i];
		prim = shipPrim.prim;

		mat4.multiply(prim.trans, this.model, shipPrim.relTrans);
		mat4.invert(prim.invT, prim.trans);
		mat4.transpose(prim.invT, prim.invT);
	}
}

SpaceShip.prototype.getInvModel = function() {
	return this.invModel;
}

SpaceShip.prototype.setPos = function(pos) {
	this.pos = vec3.clone(pos);
}

SpaceShip.prototype.getPos = function() {
	var pos = vec4.create();
	vec4.transformMat4(pos, [0, 0, 0, 1], this.trans);
	return pos;
}

SpaceShip.prototype.setGoalVelocity = function(goalVel) {
	this.goalVel = vec3.clone(goalVel);
}

SpaceShip.prototype.setGoalAngVelocityDeg = function(goalAngVel) {
	this.goalAngVel = [degToRad(goalAngVel[0]), degToRad(goalAngVel[1]), degToRad(goalAngVel[2])];
}

SpaceShip.prototype.applyBoost = function(type, strength) {

	// should update which bosters get rendered too
	strength = Math.min(strength, 10);
	strength = Math.max(strength, -10);
	switch(type) {
		case BoostType.STARBOARD_THRUST:
			this.applyForce([0, 0, strength], [0.005, 0, 0]);
			break;
		case BoostType.PORT_THRUST:
			this.applyForce([0, 0, strength], [-0.005, 0, 0]);
			break;
		case BoostType.STARBOARD_BOW_LIFT:
			this.applyForce([0, strength, 0], [0.004, 0, -0.004]);
			break;
		case BoostType.STARBOARD_AFT_LIFT:
			this.applyForce([0, strength, 0], [0.004, 0, 0.004]);
			break;
		case BoostType.PORT_BOW_LIFT:
			this.applyForce([0, strength, 0], [-0.004, 0, -0.004]);
			break;
		case BoostType.PORT_AFT_LIFT:
			this.applyForce([0, strength, 0], [-0.004, 0, 0.004]);
			break;
		case BoostType.STRAFE:
			this.applyForce([strength, 0, 0], [0.001, 0, 0]);
			break;
		default:
			break;
	}
}

SpaceShip.prototype.applyForce = function(force, point) {

	// torque
	var temp = vec3.create();
	vec3.cross(temp, point, force);
	vec3.add(this.torque, this.torque, temp);

	// linear forces
	vec3.add(this.force, this.force, force);
}

SpaceShip.prototype.determineBoost = function(secs, precisionMode) {

	var accel = vec3.create();
	var vel = vec3.create();
	var angVel = vec3.create();

	var scale = 1.0;
	if (precisionMode) {
		scale = 0.1;
	}

	//////////////// LINEAR ////////////////
	var k = 0.5 * scale;
	if (Math.abs(this.vel[0]) < 0.000001) {
		this.vel[0] = 0.0;
	}
	if (Math.abs(this.vel[1]) < 0.000001) {
		this.vel[1] = 0.0;
	}
	if (Math.abs(this.vel[2]) < 0.000001) {
		this.vel[2] = 0.0;
	}
	vec3.transformMat4(vel, this.vel, this.invRot);

	vec3.subtract(accel, this.goalVel, vel);
	vec3.scale(accel, accel, k * this.mass / secs);

	// thrust
	this.applyBoost(BoostType.STARBOARD_THRUST, accel[2] * 0.5);
	this.applyBoost(BoostType.PORT_THRUST, accel[2] * 0.5);

	// vertical
	this.applyBoost(BoostType.STARBOARD_BOW_LIFT, accel[1] * 0.25);
	this.applyBoost(BoostType.STARBOARD_AFT_LIFT, accel[1] * 0.25);
	this.applyBoost(BoostType.PORT_BOW_LIFT, accel[1] * 0.25);
	this.applyBoost(BoostType.PORT_AFT_LIFT, accel[1] * 0.25);

	// strafe
	this.applyBoost(BoostType.STRAFE, accel[0]);

	//////////////// ANGULAR ////////////////
	k = 5.0 * scale;
	if (Math.abs(this.angVel[0]) < 0.001) {
		this.angVel[0] = 0.0;
	}
	if (Math.abs(this.angVel[1]) < 0.001) {
		this.angVel[1] = 0.0;
	}
	if (Math.abs(this.angVel[2]) < 0.001) {
		this.angVel[2] = 0.0;
	}
	vec3.transformMat4(angVel, this.angVel, this.invRot);

	vec3.subtract(accel, this.goalAngVel, angVel);

	vec3.transformMat3(accel, accel, this.I);
	vec3.scale(accel, accel, k / secs);

	// pitch
	this.applyBoost(BoostType.STARBOARD_BOW_LIFT, accel[0] * 1.0);
	this.applyBoost(BoostType.PORT_BOW_LIFT, accel[0] * 1.0);
	this.applyBoost(BoostType.STARBOARD_AFT_LIFT, -accel[0] * 1.0);
	this.applyBoost(BoostType.PORT_AFT_LIFT, -accel[0] * 1.0);

	// yaw
	this.applyBoost(BoostType.STARBOARD_THRUST, -accel[1] * 1.0);
	this.applyBoost(BoostType.PORT_THRUST, accel[1] * 1.0);

	// roll
	this.applyBoost(BoostType.PORT_BOW_LIFT, -accel[2] * 1.0);
	this.applyBoost(BoostType.PORT_AFT_LIFT, -accel[2] * 1.0);
	this.applyBoost(BoostType.STARBOARD_BOW_LIFT, accel[2] * 1.0);
	this.applyBoost(BoostType.STARBOARD_AFT_LIFT, accel[2] * 1.0);
}

SpaceShip.prototype.update = function(secs, useGoalVel, precisionMode) {

	if (useGoalVel) {
		this.determineBoost(secs, precisionMode);
	}

	var accel = vec3.create();
	var vel = vec3.create();
	var axis = vec3.create();
	var angle = 0.0;

	// linear calculations
	// F = m * a --> a = F * m-1
	vec3.scale(accel, this.force, this.invMass);
	// v = v + a * t
	vec3.transformMat4(accel, accel, this.rot); // vel is position here
	vec3.scale(accel, accel, secs);
	vec3.add(this.vel, this.vel, accel);
	// p = p + v * t
	vec3.scale(vel, this.vel, secs);
	vec3.add(this.pos, this.pos, vel);

	// update trans with linear position
	mat4.identity(this.trans);
	mat4.translate(this.trans, this.trans, this.pos);

	// angular calculations
	// torque = I * a --> a = torque * I-1
	vec3.transformMat3(accel, this.torque, this.invI);
	// v = v + a * t;
	vec3.transformMat4(accel, accel, this.rot);
	vec3.scale(accel, accel, secs);
	vec3.add(this.angVel, this.angVel, accel);
	// p = p + v * t
	vec3.scale(vel, this.angVel, secs); // vel is position here

	vec3.normalize(axis, vel);
	angle = vec3.length(vel);

	// update trans with angular position
	var trans = mat4.create();
	mat4.rotate(trans, trans, angle, axis);
	// mat4.rotate(trans, trans, degToRad(angle), axis);
	mat4.multiply(this.rot, trans, this.rot);
	mat4.invert(this.invRot, this.rot);

	// update model
	mat4.multiply(this.model, this.trans, this.rot);
	mat4.invert(this.invModel, this.model);
	this.updateModel();

	var relForce = vec3.create();
	var relTorque = vec3.create();
	vec3.transformMat4(relForce, this.force, this.invRot);
	vec3.transformMat4(relTorque, this.torque, this.invRot);

	var toDraw = [];
	if (this.torque[0] < -0.0001) {
		toDraw.push(this.boosters[BoostType.STARBOARD_AFT_LIFT].prim);
		toDraw.push(this.boosters[BoostType.PORT_AFT_LIFT].prim);
		toDraw.push(this.boosters[-BoostType.STARBOARD_BOW_LIFT].prim);
		toDraw.push(this.boosters[-BoostType.PORT_BOW_LIFT].prim);
	} else if (this.torque[0] > 0.0001) {
		toDraw.push(this.boosters[-BoostType.STARBOARD_AFT_LIFT].prim);
		toDraw.push(this.boosters[-BoostType.PORT_AFT_LIFT].prim);
		toDraw.push(this.boosters[BoostType.STARBOARD_BOW_LIFT].prim);
		toDraw.push(this.boosters[BoostType.PORT_BOW_LIFT].prim);
	}
	if (this.torque[2] < -0.0001) {
		toDraw.push(this.boosters[-BoostType.STARBOARD_AFT_LIFT].prim);
		toDraw.push(this.boosters[BoostType.PORT_AFT_LIFT].prim);
		toDraw.push(this.boosters[-BoostType.STARBOARD_BOW_LIFT].prim);
		toDraw.push(this.boosters[BoostType.PORT_BOW_LIFT].prim);
	} else if (this.torque[2] > 0.0001) {
		toDraw.push(this.boosters[BoostType.STARBOARD_AFT_LIFT].prim);
		toDraw.push(this.boosters[-BoostType.PORT_AFT_LIFT].prim);
		toDraw.push(this.boosters[BoostType.STARBOARD_BOW_LIFT].prim);
		toDraw.push(this.boosters[-BoostType.PORT_BOW_LIFT].prim);
	}


	// reset vars for next tick
	this.force = [0, 0, 0];
	this.torque = [0, 0, 0];

	this.printInfo(!useGoalVel, precisionMode);

	return toDraw;
}

SpaceShip.prototype.printInfo = function(isManual, precisionMode) {

	var vel = vec3.create();
	var angVel = vec3.create();
	vec3.transformMat4(vel, this.vel, this.invRot);
	vec3.scale(vel, vel, 1000); // km to meters
	vec3.transformMat4(angVel, this.angVel, this.invRot);

	var str =   "<p> Linear Velocity (m/s): " +
				vel[0].toFixed(1) + ", " +
				vel[1].toFixed(1) + ", " +
				(-vel[2]).toFixed(1) +
				"<br/> Pitch Velocity (rad/s): " + angVel[0].toFixed(2) +
				"<br/> Yaw Velocity (rad/s): " + angVel[1].toFixed(2) +
				"<br/> Roll Velocity (rad/s): " + angVel[2].toFixed(2);

	if (isManual) {
		str += "<br/><span style='color: red'>MANUAL CONTROLS</span>"
	}
	if (precisionMode) {
		str += "<br/><span style='color: lightgray'>PRECISION MODE</span>"
	}
	
	str += "</p>";

	document.getElementById("info").innerHTML = str;
}



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
*/

/*
 * Create a sub LibGL class to override functions and add
 * advanced functionality without having to completely
 * recreate a new WebGL setup.
 */
 function SpaceLibGL() {
 	LibGL.call(this);

 	if (internet) {
		this.controller = new Leap.Controller({});
		this.controller.connect();
 	}

 	this.terrainQuad = null;
 	this.terrainPrim = null;

 	this.spaceShip = null;
 	this.manualControls = false;

	this.SHADOW_TEXTURE_SIZE = 2048;

	// shadow buffers and textures
	this.shadowFramebuffer;
	this.colorTexture;
	this.depthTexture;

	// shadow vecs and matrices
	this.lightDir = vec3.create();
	this.depthPMatrix = mat4.create();
	this.depthVMatrix = mat4.create();
	this.depthPVMatrix = mat4.create();
	this.depthPVMMatrix = mat4.create();
	this.biasMatrix = mat4.create();
	this.depthBiasPVMMatrix = mat4.create();

	this.precisionMode = false;
 };

// make SpaceLibGL a subclass
SpaceLibGL.prototype = Object.create(LibGL.prototype);
// Set the "constructor" property to refer to SpaceLibGL
SpaceLibGL.prototype.constructor = SpaceLibGL;

/*
 * Loads all primitive shape classes
 * @Override
 */
SpaceLibGL.prototype.initShapes = function() {
	this.quadXY = new QuadXY(50, 50, 1.0);
	this.quadXZ = new QuadXZ(50, 50, 1.0);
	this.sphere = new Sphere(50, 50, 1.0);
	this.cylinder = new Cylinder(50, 50, 1.0, 1.0);
	this.terrainQuad = new QuadXZ(200, 200, 2.0);

	this.quadXY.createVBO(this.gl, true, true);
	this.quadXZ.createVBO(this.gl, true, true);
	this.sphere.createVBO(this.gl, true, true);
	this.cylinder.createVBO(this.gl, true, true);
	this.terrainQuad.createVBO(this.gl, true, true);
}


////////////////////////////////////////////////////////////////////
//////////////////////////// SHADOW MAP ////////////////////////////
////////////////////////////////////////////////////////////////////

/**
 * Initializes an framebuffer and texture for a shadow map
 */
SpaceLibGL.prototype.setShadowFramebuffer = function() {

	// Create a color texture
	this.colorTexture = this.gl.createTexture();
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTexture);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
	this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.SHADOW_TEXTURE_SIZE, this.SHADOW_TEXTURE_SIZE, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

	// Create the depth texture
	this.depthTexture = this.gl.createTexture();
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
	this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
	this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT, this.SHADOW_TEXTURE_SIZE, this.SHADOW_TEXTURE_SIZE, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_SHORT, null);

	shadowFramebuffer = this.gl.createFramebuffer();
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, shadowFramebuffer);
	this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.colorTexture, 0);
	this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.depthTexture, 0);
 
	this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
}

/*
 * Creates matrices necessary to render the scene from the light's perspective
 */
SpaceLibGL.prototype.setShadowCamera = function() {
	// vec to the light
	vec3.normalize(this.lightDir, this.lights[0].posDir);
	vec3.scale(this.lightDir, this.lightDir, 15.0);

	// projection and view matrices
	mat4.ortho(this.depthPMatrix, -12.0, 12.0, -12.0, 12.0, 1, 25);
	mat4.lookAt(this.depthVMatrix, this.lightDir, [0, 0, 0], [0, 1, 0]);

	mat4.multiply(this.depthPVMatrix, this.depthPMatrix, this.depthVMatrix);

	// bias matrix used for converting screen coords to uv coords
	mat4.scale(this.biasMatrix, this.biasMatrix,[0.5, 0.5, 0.5]);
	mat4.translate(this.biasMatrix, this.biasMatrix, [1, 1, 1]);
}


/*
 * Draws the scene from the light's point of view and stores the depth information.
 */
SpaceLibGL.prototype.createShadowMap = function() {
	// set the shadow framebuffer
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, shadowFramebuffer);

	this.gl.viewport(0, 0, this.SHADOW_TEXTURE_SIZE, this.SHADOW_TEXTURE_SIZE);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// draw the scene to the shadow texture
	this.useProgram("shadowmap");
	// this.gl.cullFace(this.gl.FRONT);

	this.renderPrimitives("shadowmap", this.setShapeUniforms.bind(this), [true]);

	this.gl.cullFace(this.gl.BACK);
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
}


/*
 * Renders the specified cubemap without the depthMask enabled (so it must be drawn first)
 */
SpaceLibGL.prototype.renderCubeMap = function(name) {

	// get the cubemap and set the program
	var cm = this.cubemaps[name];
	this.useProgram(cm.program);

	// bind the buffer and set the vbo attributes
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubemapVBO);
	var stride = Float32Array.BYTES_PER_ELEMENT * this.cubemapVBO.itemSize;
	this.gl.vertexAttribPointer(this.getAttribute("cubemap", "aPosition"), 3, this.gl.FLOAT, false, stride, 0);

	// set the uniforms
	this.gl.uniformMatrix4fv(this.getUniform(cm.program, "uPMatrix"), false, this.camera.projMatrix);
	var view = mat4.create();
	mat4.multiply(view, this.getViewMatrix(), this.spaceShip.getInvModel());
	this.gl.uniformMatrix4fv(this.getUniform(cm.program, "uVMatrix"), false, view);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, cm.texture);
	this.gl.uniform1i(this.getUniform(cm.program, "uEnvMap"), 0);

	// disable the depth mast and render
	this.gl.depthMask(false);
	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.cubemapVBO.numItems);
	this.gl.depthMask(true);

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
 * Gets called on every frame and updates settings
 * based on currently pressed keys.
 * @Override
 */
SpaceLibGL.prototype.handleInput = function() {

	var forceScale = 0.03;

	if (internet && this.controller.streaming()) {
	///////////////////////// LEAP STUFF //////////////////////////
		var frame = this.controller.frame();

		if (!this.manualControls) {

			if (frame.hands.length == 2) {
				var leftHand = frame.hands[0];
				var rightHand = frame.hands[1];
				if (rightHand.palmPosition[0] < leftHand.palmPosition[0]) {
					rightHand = leftHand;
					leftHand = frame.hands[1];
				}
				// linear vel
				var leftForce = vec3.create();
				var rightForce = vec3.create();
				vec3.scale(leftForce, leftHand.palmPosition, forceScale);
				vec3.scale(rightForce, rightHand.palmPosition, forceScale);
				leftForce[1] -= 250.0 * forceScale;
				rightForce[1] -= 250.0 * forceScale;

				// avg
				vec3.add(rightForce, rightForce, leftForce);
				vec3.scale(rightForce, rightForce, 0.5);

				rightForce[0] *= rightForce[0] * rightForce[0];
				rightForce[1] *= rightForce[1] * rightForce[1];
				rightForce[2] *= rightForce[2] * rightForce[2];

				this.spaceShip.setGoalVelocity(rightForce);

				// angular vel
				leftForce[0] = (leftHand.direction[1] + rightHand.direction[1]) * 100 * forceScale;
				leftForce[1] = ((leftHand.palmPosition[2] + 200.0) - (rightHand.palmPosition[2] + 200.0)) * forceScale;
				leftForce[2] = (rightHand.palmPosition[1] - leftHand.palmPosition[1]) * forceScale;

				leftForce[0] *= leftForce[0] * leftForce[0];
				leftForce[1] *= leftForce[1] * leftForce[1];
				leftForce[2] *= leftForce[2] * leftForce[2];

				this.spaceShip.setGoalAngVelocityDeg(leftForce);

			}

		} else {
			// /////////////////////// ORIG LEAP STUFF //////////////////////////

			// if (frame.hands.length == 2) {
			// 	var leftHand = frame.hands[0];
			// 	var rightHand = frame.hands[1];
			// 	if (rightHand.palmPosition[0] < leftHand.palmPosition[0]) {
			// 		rightHand = leftHand;
			// 		leftHand = frame.hands[1];
			// 	}
			// 	var leftForce = vec3.create();
			// 	var rightForce = vec3.create();
			// 	vec3.scale(leftForce, leftHand.palmPosition, forceScale);
			// 	vec3.scale(rightForce, rightHand.palmPosition, forceScale);
			// 	leftForce[1] -= 200.0 * forceScale;
			// 	rightForce[1] -= 200.0 * forceScale;
			// 	leftForce[0] = 200.0 * forceScale * leftHand.direction[1];
			// 	rightForce[0] = 200.0 * forceScale * rightHand.direction[1];

			// 	leftForce[0] *= leftForce[0] * leftForce[0];
			// 	leftForce[1] *= leftForce[1] * leftForce[1];
			// 	leftForce[2] *= leftForce[2] * leftForce[2];
			// 	rightForce[0] *= rightForce[0] * rightForce[0];
			// 	rightForce[1] *= rightForce[1] * rightForce[1];
			// 	rightForce[2] *= rightForce[2] * rightForce[2];

			// 	// console.log(vec3.str(leftHand.palmPosition) + ", " + vec3.str(rightHand.palmPosition));
			// 	// console.log(vec3.str([0, 0, leftForce]) + ", " + vec3.str([0, 0, rightForce]));
			// 	// console.log(vec3.str(leftForce) + ", " + vec3.str(rightForce));
			// 	console.log(leftForce[0] + ", " + rightForce[0]);
			// 	// console.log(leftHand.pitch() + ", " + rightHand.pitch());
			// 	// console.log(leftHand.direction[1] + ", " + rightHand.direction[1]);
			// 	// leftForce[0] = Math.max(leftHand.direction[1] + 1.0, 0.0);
			// 	// rightForce[0] = Math.max(rightHand.direction[1] + 1.0, 0.0);
			// 	// leftForce[1] *= leftForce[0];
			// 	// rightForce[1] *= leftForce[0];


			// 	this.spaceShip.applyForce([0, 0, leftForce[2]], [-5, 0, 0]);
			// 	this.spaceShip.applyForce([0, 0, rightForce[2]], [5, 0, 0]);

			// 	this.spaceShip.applyForce([0, leftForce[1] - leftForce[0], 0], [-5, 0, 5]);
			// 	this.spaceShip.applyForce([0, leftForce[1] + leftForce[0], 0], [-5, 0, -5]);
			// 	this.spaceShip.applyForce([0, rightForce[1] - rightForce[0], 0], [5, 0, 5]);
			// 	this.spaceShip.applyForce([0, rightForce[1] + rightForce[0], 0], [5, 0, -5]);
			// }
			
		}


	} else {

	///////////////////////// KEY STUFF //////////////////////////

		var scale = 1.0;
		// if (this.precisionMode) {
		// 	scale = 0.1;
		// }

		if (!this.manualControls) {

			var goalForce = 0.1 * scale; // km / s
			var goalForceAng = 100 * scale; // degrees / second

			var tempAngGV = [0, 0, 0];
			var tempGV = [0, 0, 0];

			// OKL;IP
			if (this.currentlyPressedKeys[73]) { // I
				tempAngGV[1] += goalForceAng;
			}
			if (this.currentlyPressedKeys[80]) { // P
				tempAngGV[1] -= goalForceAng;
			}
			if (this.currentlyPressedKeys[79]) { // O
				tempAngGV[0] -= goalForceAng;
			}
			if (this.currentlyPressedKeys[76]) { // L
				tempAngGV[0] += goalForceAng;
			}
			if (this.currentlyPressedKeys[75]) { // K
				tempAngGV[2] += goalForceAng;
			}
			if (this.currentlyPressedKeys[59] || this.currentlyPressedKeys[186]) { // ;
				tempAngGV[2] -= goalForceAng;
			}
			this.spaceShip.setGoalAngVelocityDeg(tempAngGV);

			// WASDQE
			if (this.currentlyPressedKeys[87]) { // W
				tempGV[2] -= goalForce;
			}
			if (this.currentlyPressedKeys[65]) { // A
				tempGV[0] -= goalForce;
			}
			if (this.currentlyPressedKeys[83]) { // S
				tempGV[2] += goalForce;
			}
			if (this.currentlyPressedKeys[68]) { // D
				tempGV[0] += goalForce;
			}
			if (this.currentlyPressedKeys[81]) { // Q
				tempGV[1] -= goalForce;
			}
			if (this.currentlyPressedKeys[69]) { // E
				tempGV[1] += goalForce;
			}
			if (this.currentlyPressedKeys[32]) { // space bar
				tempGV[2] -= goalForce * 5;
			}
			this.spaceShip.setGoalVelocity(tempGV);

			// arrow keys
			if (this.currentlyPressedKeys[37]) {} // left
			if (this.currentlyPressedKeys[38]) {} // up
			if (this.currentlyPressedKeys[39]) {} // right
			if (this.currentlyPressedKeys[40]) {} // down

		} else {

			if (this.precisionMode) {
				scale = 0.1;
			}
			///////////////////////// ORIG KEY STUFF //////////////////////////

			// OKL;IP
			if (this.currentlyPressedKeys[73]) { // I
				this.spaceShip.applyForce([0, 0, 0.25 * scale], [-0.005, 0, 0]);
				this.spaceShip.applyForce([0, 0, -0.25 * scale], [0.005, 0, 0]);
			}
			if (this.currentlyPressedKeys[80]) { // P
				this.spaceShip.applyForce([0, 0, 0.25 * scale], [0.005, 0, 0]);
				this.spaceShip.applyForce([0, 0, -0.25 * scale], [-0.005, 0, 0]);
			}
			if (this.currentlyPressedKeys[79]) { // O
				this.spaceShip.applyForce([0, 0.2 * scale, 0], [0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, 0.2 * scale, 0], [-0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, -0.2 * scale, 0], [0.004, 0, -0.004]);
				this.spaceShip.applyForce([0, -0.2 * scale, 0], [-0.004, 0, -0.004]);
			}
			if (this.currentlyPressedKeys[76]) { // L
				this.spaceShip.applyForce([0, 0.5 * scale, 0], [0.004, 0, -0.004]);
				this.spaceShip.applyForce([0, 0.5 * scale, 0], [-0.004, 0, -0.004]);
				this.spaceShip.applyForce([0, -0.5 * scale, 0], [0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, -0.5 * scale, 0], [-0.004, 0, 0.004]);
			}
			if (this.currentlyPressedKeys[75]) { // K
				this.spaceShip.applyForce([0, 0.4 * scale, 0], [0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, 0.4 * scale, 0], [0.004, 0, -0.004]);
				this.spaceShip.applyForce([0, -0.4 * scale, 0], [-0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, -0.4 * scale, 0], [-0.004, 0, -0.004]);
			}
			if (this.currentlyPressedKeys[59] || this.currentlyPressedKeys[186]) { // ;
				this.spaceShip.applyForce([0, 0.4 * scale, 0], [-0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, 0.4 * scale, 0], [-0.004, 0, -0.004]);
				this.spaceShip.applyForce([0, -0.4 * scale, 0], [0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, -0.4 * scale, 0], [0.004, 0, -0.004]);
			}
			// WASDQE
			if (this.currentlyPressedKeys[87]) { // W
				this.spaceShip.applyForce([0, 0, -5 * scale], [0.005, 0, 0]);
				this.spaceShip.applyForce([0, 0, -5 * scale], [-0.005, 0, 0]);
			}
			if (this.currentlyPressedKeys[65]) { // A
				this.spaceShip.applyForce([-5 * scale, 0, 0], [1, 0, 0]);
				
			}
			if (this.currentlyPressedKeys[83]) { // S
				this.spaceShip.applyForce([0, 0, 5 * scale], [0.005, 0, 0]);
				this.spaceShip.applyForce([0, 0, 5 * scale], [-0.005, 0, 0]);
				
			}
			if (this.currentlyPressedKeys[68]) { // D
				this.spaceShip.applyForce([5 * scale, 0, 0], [0.001, 0, 0]);
				
			}
			if (this.currentlyPressedKeys[81]) { // Q
				this.spaceShip.applyForce([0, -2.5 * scale, 0], [0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, -2.5 * scale, 0], [-0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, -2.5 * scale, 0], [0.004, 0, -0.004]);
				this.spaceShip.applyForce([0, -2.5 * scale, 0], [-0.004, 0, -0.004]);
			}
			if (this.currentlyPressedKeys[69]) { // E
				this.spaceShip.applyForce([0, 2.5 * scale, 0], [0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, 2.5 * scale, 0], [-0.004, 0, 0.004]);
				this.spaceShip.applyForce([0, 2.5 * scale, 0], [0.004, 0, -0.004]);
				this.spaceShip.applyForce([0, 2.5 * scale, 0], [-0.004, 0, -0.004]);
			}
			// space bar
			if (this.currentlyPressedKeys[32]) {}
			// arrow keys
			if (this.currentlyPressedKeys[37]) {} // left
			if (this.currentlyPressedKeys[38]) {} // up
			if (this.currentlyPressedKeys[39]) {} // right
			if (this.currentlyPressedKeys[40]) {} // down

		}
	}

	if (this.currentlyPressedKeys[90]) { // Z
		this.spaceShip.setGoalVelocity([0, 0, 0]);
		this.spaceShip.setGoalAngVelocityDeg([0, 0, 0]);
	}
}


SpaceLibGL.prototype.handleKeyUp = function(keyEvent) {
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
		case 67: // C
			this.spaceShip.vel = [0, 0, 0];
			this.spaceShip.angVel = [0, 0, 0];
			break;
		case 77: // M
			this.manualControls = !this.manualControls;
			break;
		case 82: // R
			this.precisionMode = !this.precisionMode;
			break;
		default:
			console.log(keyEvent.keyCode);
			break;
	}
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
 * Added an additional shadow map texture
 * @Override
 */
SpaceLibGL.prototype.setCameraAndLightUniforms = function(program) {
	var pvMatrix = mat4.create();
	mat4.multiply(pvMatrix, this.getProjViewMatrix(), this.spaceShip.getInvModel());
	this.gl.uniformMatrix4fv(this.getUniform(program, "uPVMatrix"), false, pvMatrix);
	// this.gl.uniformMatrix4fv(this.getUniform(program, "uPVMatrix"), false, this.camera.projViewMatrix);
	this.gl.uniform1f(this.getUniform(program, "uLightScale"), this.lightScale);
	this.gl.uniform3fv(this.getUniform(program, "uAmbientRadiance"), this.ambientRadiance);

	var numLights = this.lights.length;
	if (numLights < this.MAX_LIGHTS) {
		this.gl.uniform1i(this.gl.getUniformLocation(this.getProgram(program), "uLights[" + numLights + "].type"), -1);
	}
	
	this.gl.activeTexture(this.gl.TEXTURE1);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture);
	this.gl.uniform1i(this.getUniform(program, "uShadowMap"), 1);
}

/*
 * Used by the 'shadowmap' and 'default' programs to set shape uniforms
 * when rendering the scene.
 * @Override
 */
SpaceLibGL.prototype.setShapeUniforms = function(s, program, args) {
	mat4.multiply(this.depthPVMMatrix, this.depthPVMatrix, s.trans);

	if (args[0] == "shadow") {
		this.gl.uniformMatrix4fv(this.getUniform(program, "uDepthPVMMatrix"), false, this.depthPVMMatrix);
	} else {
		if (args[0] == "terrain") {
			var before = mat4.create();
			var pos = this.spaceShip.getPos();
			mat4.translate(before, before, [pos[0], 0, pos[2]]);
			this.gl.uniformMatrix4fv(this.getUniform(program, "uMBeforeMatrix"), false, before);

			if (s.texture.length > 0) {
				this.gl.activeTexture(this.gl.TEXTURE0);
				this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTexture(s.texture));
				this.gl.uniform1i(this.getUniform(program, "uTexture"), 0);
			}
		}

		this.gl.uniform4fv(this.getUniform(program, "uShapeSettings"), s.settings);
		this.gl.uniform3f(this.getUniform(program, "uColor"), s.color[0], s.color[1], s.color[2]);

		this.gl.uniformMatrix4fv(this.getUniform(program, "uMMatrix"), false, s.trans);
		this.gl.uniformMatrix4fv(this.getUniform(program, "uMMatrixIT"), false, s.invT);

		mat4.multiply(this.depthBiasPVMMatrix, this.biasMatrix, this.depthPVMMatrix);

		this.gl.uniformMatrix4fv(this.getUniform(program, "uDepthBiasPVMMatrix"), false, this.depthBiasPVMMatrix);

	}
}


/*
 * Sets the camera and lights for the specified program then renders all shapes in the scene.
 * @Override
 */
SpaceLibGL.prototype.renderScene = function(program, additionalPrims) {
	this.useProgram(program);
	this.setCameraAndLightUniforms(program);
	this.setLights(program, this.setLightUniforms.bind(this), [], true);
	this.renderPrimitives(program, this.setShapeUniforms.bind(this), []);
	this.renderPrimitives(program, this.setShapeUniforms.bind(this), [], additionalPrims);
	this.renderModels(program, this.setShapeUniforms.bind(this), []);
	this.renderBuffers(program, this.setShapeUniforms.bind(this), []);
}

/*
 *
 */
SpaceLibGL.prototype.renderTerrain = function(program) {
	this.useProgram(program);
	this.setCameraAndLightUniforms(program);
	this.setLights(program, this.setLightUniforms.bind(this), [], false);
	this.setShapeUniforms(this.terrainPrim, program, ["terrain"]);

	this.terrainQuad.bindBuffer(this.gl, this.getAttribute(program, "aPosition"),
										 this.getAttribute(program, "aNormal"),
										 this.getAttribute(program, "aTexCoord"));
	this.terrainQuad.render(this.gl);
}


/*
 * Called on every frame. Renders everything needed for the current frame.
 * Added shadowmap creation.
 * @Override
 */
SpaceLibGL.prototype.render = function(additionalPrims) {
	// only use the depth buffer for the shadow map
	// this.gl.colorMask(false, false, false, false);
	// this.createShadowMap();
	// this.gl.colorMask(true, true, true, true);

	// set the viewport and clear the buffers
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// render the environment and shapes
	this.renderCubeMap("cubemap");
	this.renderScene("default", additionalPrims);
	this.renderTerrain("terrain");
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
 * @Override
 */
SpaceLibGL.prototype.tick = function() {
	// call this function again on the next frame
	requestAnimFrame(this.tick.bind(this));

	// update time example
	var timeNow = new Date().getTime(); // milliseconds
	var deltaTime = (timeNow - this.lastTime) / 1000.0; // seconds
	this.lastTime = timeNow;

	this.handleInput();
	var boosters = this.spaceShip.update(deltaTime, !this.manualControls, this.precisionMode);
	this.render(boosters);
}

/*
 * Completes any required initialization before the update/render loop begins
 * @Override
 */
SpaceLibGL.prototype.onStartTick = function() {
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
 * Loads all necessary shaders. Added shadowmap shader.
 * @Override 
 */
SpaceLibGL.prototype.initShaders = function() {

	// shadow shaders
	this.addProgram("shadowmap", variable.theme_url + "/shaders/shadowmap.vert", variable.theme_url + "/shaders/shadowmap.frag",
					// attributes
					["aPosition", "aNormal", "aTexCoord"],
					// uniforms
					["uDepthPVMMatrix"]);

	// cubemap shaders
	this.addProgram("cubemap", variable.theme_url + "/shaders/cubemap.vert", variable.theme_url + "/shaders/cubemap.frag",
					// attributes
					["aPosition"],
					// uniforms
					["uPMatrix", "uVMatrix", "uEnvMap"]);

	// default shaders
	this.addProgram("default", variable.theme_url + "/shaders/default.vert", variable.theme_url + "/shaders/default.frag",
					// attributes
					["aPosition", "aNormal", "aTexCoord"],
					// uniforms
					["uAmbientRadiance", "uLightScale", "uPVMatrix", "uMMatrix", "uMMatrixIT",
					 "uLightLocation", "uColor", "uShapeSettings", "uShapeTexture",
					 "uDepthBiasPVMMatrix", "uShadowMap"]);

	// terrain shaders
	this.addProgram("terrain", variable.theme_url + "/shaders/procedural.vert", variable.theme_url + "/shaders/default.frag",
					// attributes
					["aPosition", "aNormal", "aTexCoord"],
					// uniforms
					["uAmbientRadiance", "uLightScale", "uPVMatrix", "uMMatrix", "uMMatrixIT",
					 "uLightLocation", "uColor", "uShapeSettings", "uShapeTexture",
					 "uDepthBiasPVMMatrix", "uShadowMap", "uMBeforeMatrix"]);
}


/*
 * Loads all necessary textures.
 * @Override
 */
SpaceLibGL.prototype.initTextures = function() {
	this.addTexture("rock", new Uint8Array([139, 69, 19, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/images/rock.jpg");
	this.addTexture("earth", new Uint8Array([50, 50, 50, 255]), 1, 1, this.gl.UNSIGNED_BYTE, variable.theme_url + "/images/earth.jpg");
	this.setCubeMap("cubemap", "cubemap", [0,0,0,255], variable.theme_url + "/images/cubemap", 1024, ".png");
}

/*
 * Creates a scene of basic primitive shapes and lights.
 * @Override
 */
SpaceLibGL.prototype.setScene = function() {

	// add a lights
	this.addLight(LightType.POINT, [-2.5, 1, 2.5], [4.0, 4.0, 4.0], 0.1);
	// this.addLight(LightType.POINT, [0, 0.5, 0], [0.0004, 0.0004, 0.0004], 0.001);
	// this.addLight(LightType.POINT, [-2.5, 1, 0], [4.0, 4.0, 4.0], 0.1);
	// this.addLight(LightType.POINT, [0, 1, -2.5], [4.0, 4.0, 4.0], 0.1);
	this.lightScale = 10.0; // inverse scene brightness (higher is darker)
	this.ambientRadiance = [1.5, 1.5, 1.5];

	// add space ship
	this.spaceShip = new SpaceShip(this);
	this.spaceShip.setPos([-0.1, 0.1, 0]);

	// add shapes
	var trans = mat4.create();

	mat4.identity(trans);
	mat4.translate(trans, trans, [-0.1, 0.098, 0]);
	mat4.scale(trans, trans, [0.01, 0.0003, 0.01]);
	this.addPrimitive(ShapeType.SPHERE, trans, [0.5, 0.5, 0.5, 1.0], [64.0, 0.0, 0.0, 0.0], "");

	mat4.identity(trans);
	mat4.translate(trans, trans, [-0.109, 0.101, 0]);
	mat4.scale(trans, trans, [0.0002, 0.003, 0.01]);
	this.addPrimitive(ShapeType.CYLINDER, trans, [0.7, 0.7, 0.7, 1.0], [64.0, 0.0, 0.0, 0.0], "");

	mat4.identity(trans);
	mat4.translate(trans, trans, [-0.107, 0.102, 0]);
	mat4.scale(trans, trans, [0.001, 0.005, 0.001]);
	this.addPrimitive(ShapeType.CYLINDER, trans, [0.7, 0.7, 0.7, 1.0], [64.0, 0.0, 0.0, 0.0], "");

	mat4.identity(trans);
	mat4.translate(trans, trans, [0, 1.5, -5]);
	mat4.scale(trans, trans, [1, 1, 1]);
	this.addPrimitive(ShapeType.SPHERE, trans, [0.7, 0.7, 0.7, 1.0], [64.0, 0.0, 1.0, 0.0], "earth");

	mat4.identity(trans);
	mat4.scale(trans, trans, [1, 1, 1]);
	this.terrainPrim = this.createPrimitive(ShapeType.QUADXZ, trans, [0.81, 0.41, 0.11, 1.0], [64.0, 0.0, 1.0, 0.0], "rock");
}



////////////////////////////////////////////////////////////////////
/////////////////////////////// MAIN ///////////////////////////////
////////////////////////////////////////////////////////////////////

function main() {
	var canvas = document.getElementById("canvas");
	var canvas_div = document.getElementById("canvas_div");

	var spaceLib = new SpaceLibGL();
	spaceLib.init(canvas, canvas_div, ["WEBKIT_WEBGL_depth_texture", "WEBGL_depth_texture"]);

	// spaceLib.addOrbitCam(-0.025, 0.0, 15.0, [0, 0, 0], 45.0, 1.0, 0.0001, 5.0);
	spaceLib.addOrbitCam(-0.025, 0.0, 0.0, [0, 0, 0], 45.0, 1.0, 0.0001, 50.0);
	// spaceLib.addOrbitCam(0.0, 0.0, 0.0, [0, 0, 0], 45.0, 1.0, 0.0001, 5.0);

	// spaceLib.setShadowFramebuffer();
	// spaceLib.setShadowCamera();

	spaceLib.addHTMLElement("error");
	spaceLib.setTogglePanels([["controlsHeader", "controlsToggle"]]);

	spaceLib.start();
}





