/*
 * Quad 'class' in the xy plane
 */

// constuctor
function QuadXY (longitudeBands, latitudeBands, halfHeight) {
	Shape3D.call(this, longitudeBands, latitudeBands);

	this.halfHeight = halfHeight;
};


QuadXY.prototype = Object.create(Shape3D.prototype); // See note below

// Set the "constructor" property to refer to QuadXY
QuadXY.prototype.constructor = QuadXY;


// create the vbo for a quadXY
QuadXY.prototype.createVBO = function(gl, useNormals, useTexCoords) {
	var data = [];

	// outer loop vars
	var xPrev = -this.halfHeight;

	// inner loop vars
	var uPrev = 0.0;
	var y;
	var v;
	
	var u = (1.0 / this.longitudeBands);
	var x = u * this.halfHeight * 2.0  - this.halfHeight;

	for (var longNumber = 1; longNumber <= this.longitudeBands; longNumber++) {

		for (var latNumber = 0; latNumber <= this.latitudeBands; latNumber++) {
			y = (latNumber / this.latitudeBands) * this.halfHeight * 2.0  - this.halfHeight;
			v = 1.0 - latNumber / this.latitudeBands;

			// add vertex, normal, and tex coords
			data.push(xPrev); data.push(y); data.push(0.0);
			if (useNormals) {
				data.push(0.0); data.push(0.0); data.push(1.0);
			}
			if (useTexCoords) {
				data.push(uPrev); data.push(v);
			}

			// add vertex, normal, and tex coords
			data.push(x); data.push(y); data.push(0.0);
			if (useNormals) {
				data.push(0.0); data.push(0.0); data.push(1.0);
			}
			if (useTexCoords) {
				data.push(u); data.push(v);
			}
		}

		// except for the last vertex in the array, double the
		// bottom vertex to create a break in the TRIANGLE_STRIP
		if (longNumber < this.longitudeBands) {
			data.push(x); data.push(y); data.push(0.0);
			if (useNormals) {
				data.push(0.0); data.push(0.0); data.push(1.0);
			}
			if (useTexCoords) {
				data.push(uPrev); data.push(v);
			}

			xPrev = x;
			uPrev = u;

			u = ((longNumber + 1) / this.longitudeBands);
			x = u * this.halfHeight * 2.0  - this.halfHeight;

			data.push(xPrev); data.push(-this.halfHeight); data.push(0.0);
			if (useNormals) {
				data.push(0.0); data.push(0.0); data.push(1.0);
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
}

/*
 * ro 	- 	ray origin
 * rd 	- 	normalized ray direction
 *
 * NOTE: THIS METHOD HASN'T BEEN TESTED YET.
 */
QuadXY.intersectsRay = function (ro, rd) {
	return false;
}



/*
 * Quad 'class' in the xz plane
 */

// constuctor
function QuadXZ (longitudeBands, latitudeBands, halfHeight) {
	Shape3D.call(this, longitudeBands, latitudeBands);

	this.halfHeight = halfHeight;
};


QuadXZ.prototype = Object.create(Shape3D.prototype); // See note below

// Set the "constructor" property to refer to QuadXZ
QuadXZ.prototype.constructor = QuadXZ;


// create the vbo for a quadXZ
QuadXZ.prototype.createVBO = function(gl, useNormals, useTexCoords) {
	var data = [];

	// outer loop vars
	var xPrev = -this.halfHeight;

	// inner loop vars
	var uPrev = 0.0;
	var z;
	var v;
	
	var u = (1.0 / this.longitudeBands);
	var x = u * this.halfHeight * 2.0  - this.halfHeight;

	for (var longNumber = 1; longNumber <= this.longitudeBands; longNumber++) {

		for (var latNumber = 0; latNumber <= this.latitudeBands; latNumber++) {
			z = (latNumber / this.latitudeBands) * this.halfHeight * 2.0  - this.halfHeight;
			v = 1.0 - latNumber / this.latitudeBands;

			// add vertex, normal, and tex coords
			data.push(x); data.push(0.0); data.push(z);
			if (useNormals) {
				data.push(0.0); data.push(1.0); data.push(0.0);
			}
			if (useTexCoords) {
				data.push(u); data.push(v);
			}

			// add vertex, normal, and tex coords
			data.push(xPrev); data.push(0.0); data.push(z);
			if (useNormals) {
				data.push(0.0); data.push(1.0); data.push(0.0);
			}
			if (useTexCoords) {
				data.push(uPrev); data.push(v);
			}
		}

		// except for the last vertex in the array, double the
		// bottom vertex to create a break in the TRIANGLE_STRIP
		if (longNumber < this.longitudeBands) {
			data.push(xPrev); data.push(0.0); data.push(z);
			if (useNormals) {
				data.push(0.0); data.push(1.0); data.push(0.0);
			}
			if (useTexCoords) {
				data.push(uPrev); data.push(v);
			}

			xPrev = x;
			uPrev = u;

			u = ((longNumber + 1) / this.longitudeBands);
			x = u * this.halfHeight * 2.0  - this.halfHeight;

			data.push(x); data.push(0.0); data.push(-this.halfHeight);
			if (useNormals) {
				data.push(0.0); data.push(1.0); data.push(0.0);
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
}

/*
 * ro 	- 	ray origin
 * rd 	- 	normalized ray direction
 *
 * NOTE: THIS METHOD HASN'T BEEN TESTED YET.
 */
QuadXZ.intersectsRay = function (ro, rd) {
	return false;
}




