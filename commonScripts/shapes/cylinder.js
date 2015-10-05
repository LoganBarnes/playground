/*
 * Cylinder 'class'
 *
 * Currently not top or bottom plans. Only hollow middle section.
 */

// constuctor
function Cylinder (longitudeBands, latitudeBands, radius, halfHeight) {
	Shape3D.call(this, longitudeBands, latitudeBands);

	this.radius = radius;
	this.halfHeight = halfHeight;
};


Cylinder.prototype = Object.create(Shape3D.prototype); // See note below

// Set the "constructor" property to refer to Cylinder
Cylinder.prototype.constructor = Cylinder;


// create the vbo for a cylinder
Cylinder.prototype.createVBO = function(gl, useNormals, useTexCoords) {
	var data = [];

	// outer loop vars
	var xPrev = 1.0; // cos(0);
	var zPrev = 0.0; // sin(0);
	var y;

	// inner loop vars
	var uPrev = 1.0;
	var v;
	
	var u = 1.0 - (1.0 / this.longitudeBands);
	var phi = 2.0 * Math.PI / this.longitudeBands;
	var x = Math.cos(phi);
	var z = Math.sin(phi);

	for (var longNumber = 1; longNumber <= this.longitudeBands; longNumber++) {

		for (var latNumber = 0; latNumber <= this.latitudeBands; latNumber++) {
			y = (latNumber / this.latitudeBands) * this.halfHeight * 2.0  - this.halfHeight;
			v = 1.0 - latNumber / this.latitudeBands;

			// add vertex, normal, and tex coords
			data.push(x * this.radius); data.push(y); data.push(z * this.radius);
			if (useNormals) {
				data.push(x); data.push(0.0); data.push(z);
			}
			if (useTexCoords) {
				data.push(u); data.push(v);
			}

			// add vertex, normal, and tex coords
			data.push(xPrev * this.radius); data.push(y); data.push(zPrev * this.radius);
			if (useNormals) {
				data.push(xPrev); data.push(0.0); data.push(zPrev);
			}
			if (useTexCoords) {
				data.push(uPrev); data.push(v);
			}
		}

		// except for the last vertex in the array, double the
		// bottom vertex to create a break in the TRIANGLE_STRIP
		if (longNumber < this.longitudeBands) {
			data.push(xPrev * this.radius); data.push(y); data.push(zPrev * this.radius);
			if (useNormals) {
				data.push(xPrev); data.push(0.0); data.push(zPrev);
			}
			if (useTexCoords) {
				data.push(uPrev); data.push(v);
			}

			xPrev = x;
			zPrev = z;
			uPrev = u;

			phi = (longNumber + 1) * 2.0 * Math.PI / this.longitudeBands;
			x = Math.cos(phi);
			z = Math.sin(phi);
			u = 1.0 - ((longNumber + 1) / this.longitudeBands);

			data.push(x * this.radius); data.push(-this.halfHeight); data.push(z * this.radius);
			if (useNormals) {
				data.push(x); data.push(0.0); data.push(z);
			}
			if (useTexCoords) {
				data.push(u); data.push(1.0);
			}
		}

	}
	
	this.vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

	this.vbo.itemSize = 3;
	if (useNormals) {
		this.vbo.itemSize += 3;
	}
	if (useTexCoords) {
		this.vbo.itemSize += 2;
	}

	this.vbo.numItems = data.length / this.vbo.itemSize;
};

/*
 * ro 	- 	ray origin
 * rd 	- 	normalized ray direction
 * c 	- 	cylinder bottom center point
 * r 	- 	cylinder top center point
 *
 * NOTE: THIS METHOD HASN'T BEEN TESTED YET.
 */
Cylinder.intersectsRay = function (ro, rd, cb, ct) {
	var cbMinusCt = vec3.create();
	var roMinusCt = vec3.create();
	var rdCrossCbt = vec3.create();
	var rotCrossCbt = vec3.create();

	vec3.subtract(cbMinusCt, cb, ct);
	vec3.subtract(roMinusCt, ro, ct);
	vec3.cross(rdCrossCbt, rd, cbMinusCt);
	vec3.cross(rotCrossCbt, roMinusCt, cbMinusCt);

	var a = vec3.dot(rdCrossCbt, rdCrossCbt);
	var b = 2.0 * vec3.dot(rdCrossCbt, rotCrossCbt);
	var c = vec3.dot(rotCrossCbt, rotCrossCbt) - vec3.dot(cbMinusCt, cbMinusCt);

	var solutions = Shape3D.calcIntersectDistances(a, b, c);

	if (solutions.length > 0)
		return true;

	return false;
}




