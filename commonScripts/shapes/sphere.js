/*
 * Sphere 'class'
 */

// constuctor
function Sphere (longitudeBands, latitudeBands, radius) {
	Shape3D.call(this, longitudeBands, latitudeBands);

	this.radius = radius;
}


Sphere.prototype = Object.create(Shape3D.prototype);

// Set the "constructor" property to refer to Sphere
Sphere.prototype.constructor = Sphere;


// create the vbo for a sphere
Sphere.prototype.createVBO = function(gl, useNormals, useTexCoords) {
	var data = [];

	// outer loop vars
	var sinPhiPrev = 0.0; // sin(0);
	var cosPhiPrev = 1.0; // cos(0);
	var phi, sinPhiCurr, cosPhiCurr;

	// inner loop vars
	var theta, sinTheta, cosTheta,
		x, y, z, u, v;
	
	u = 1.0 - (1.0 / this.longitudeBands);

	for (var longNumber = 1; longNumber <= this.longitudeBands; longNumber++) {
		phi = longNumber * 2.0 * Math.PI / this.longitudeBands;
		sinPhiCurr = Math.sin(phi);
		cosPhiCurr = Math.cos(phi);


		// add top vertex, normal, and tex coords
		data.push(0.0); data.push(1.0 * this.radius); data.push(0.0);
		if (useNormals) {
			data.push(0.0); data.push(1.0); data.push(0.0);
		}
		if (useTexCoords) {
			data.push(u); data.push(0.0);
		}

		for (var latNumber = 1; latNumber < this.latitudeBands; latNumber++) {
			theta = latNumber * Math.PI / this.latitudeBands;
			sinTheta = Math.sin(theta);
			cosTheta = Math.cos(theta);

			// calculate right vertex
			x = cosPhiCurr * sinTheta;
			y = cosTheta;
			z = sinPhiCurr * sinTheta;
			u = 1.0 - (longNumber / this.longitudeBands);
			v = latNumber / this.latitudeBands;

			// add vertex, normal, and tex coords
			data.push(x * this.radius); data.push(y * this.radius); data.push(z * this.radius);
			if (useNormals) {
				data.push(x); data.push(y); data.push(z);
			}
			if (useTexCoords) {
				data.push(u); data.push(v);
			}

			// calculate left vertex
			x = cosPhiPrev * sinTheta;
			y = cosTheta;
			z = sinPhiPrev * sinTheta;
			u = 1.0 - ((longNumber - 1.0) / this.longitudeBands);
			v = latNumber / this.latitudeBands;

			// add vertex, normal, and tex coords
			data.push(x * this.radius); data.push(y * this.radius); data.push(z * this.radius);
			if (useNormals) {
				data.push(x); data.push(y); data.push(z);
			}
			if (useTexCoords) {
				data.push(u); data.push(v);
			}
		}

		// add bottom vertex, normal, and tex coords
		data.push(0.0); data.push(-1.0 * this.radius); data.push(0.0);
		if (useNormals) {
			data.push(0.0); data.push(-1.0); data.push(0.0);
		}
		if (useTexCoords) {
			data.push(u); data.push(1.0);
		}

		// except for the last vertex in the array, double the
		// bottom vertex to create a break in the TRIANGLE_STRIP
		if (longNumber < this.longitudeBands) {
			data.push(0.0); data.push(-1.0 * this.radius); data.push(0.0);
			if (useNormals) {
				data.push(0.0); data.push(-1.0); data.push(0.0);
			}
			if (useTexCoords) {
				data.push(u); data.push(1.0);
			}

			u = 1.0 - (longNumber / this.longitudeBands);

			data.push(0.0); data.push(1.0 * this.radius); data.push(0.0);
			if (useNormals) {
				data.push(0.0); data.push(1.0); data.push(0.0);
			}
			if (useTexCoords) {
				data.push(u); data.push(0.0);
			}
		}

		sinPhiPrev = sinPhiCurr;
		cosPhiPrev = cosPhiCurr;
	}
	
	this.vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

	this.vbo.itemSize = 3;
	if (useNormals)
		this.vbo.itemSize += 3;
	if (useTexCoords)
		this.vbo.itemSize += 2;

	this.vbo.numItems = data.length / this.vbo.itemSize;
}

/*
 * ro 	- 	ray origin
 * rd 	- 	normalized ray direction
 * c 	- 	sphere center
 * r 	- 	sphere radius
 */
Sphere.intersectsRay = function (ro, rd, c, r) {
	var roMinusC = vec4.create();
	vec3.subtract(roMinusC, ro, c);

	var a = 1.0; // dot(rd, rd) but rd is normalized
	var b = 2.0 * vec3.dot(rd, roMinusC);
	var c = vec3.dot(roMinusC, roMinusC) - r * r;

	var solutions = Shape3D.calcIntersectDistances(1.0, b, c);

	if (solutions.length > 0)
		return true;

	return false;
}




