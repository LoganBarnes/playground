
/*
 * The currently available shape types.
 */
var ShapeType = Object.freeze({

	CYLINDER: 			0,
	SPHERE: 			1,
	QUADXY: 			2,
	QUADXZ: 			3,
	NUM_SHAPE_TYPES: 	4
	// CONE
	// CUBE
	// TORUS
	// PLANE
	// MESH

});


/*
 * 3D Shape 'class'
 *
 * TODO: Move this to a global 'engine' folder where all
 * programs can use the script.
 */

// constuctor
var Shape3D = function (longitudeBands, latitudeBands) {
	this.longitudeBands = longitudeBands;
	this.latitudeBands = latitudeBands;
	this.vbo = null;
}


// bind the vertex buffer object
Shape3D.prototype.bindBuffer = function(gl, positionAttribute, normalAttribute, texCoordAttribute) {
	if (!this.vbo) {
		return;
	}

	var step = Float32Array.BYTES_PER_ELEMENT;
	var stride = step * this.vbo.itemSize;

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
	gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, stride, 0);
	if (this.vbo.itemSize > 5) {// 6 or 8 
		gl.vertexAttribPointer(normalAttribute, 3, gl.FLOAT, false, stride, step * 3);
	} if (this.vbo.itemSize == 5) {
		gl.vertexAttribPointer(texCoordAttribute, 2, gl.FLOAT, false, stride, step * 3);
	} else if (this.vbo.itemSize == 8) {
		gl.vertexAttribPointer(texCoordAttribute, 2, gl.FLOAT, false, stride, step * 6);
	}
}

// make the call to drawArrays()
Shape3D.prototype.render = function (gl) {
	if (!this.vbo)
		return;

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vbo.numItems);
}

/*
 * Parts a, b, and c of a quadratic formula (see formula below) used to
 * determine the intersection points between a ray and a 3D shape.
 *
 *	for a function: ax^2 + bx + c = 0
 *
 *	the quadradic formula determines is solutions exist and what they are:
 *
 * 	(-b (+/-) sqrt(b^2 - 4ac)) / 2a
 */
Shape3D.calcIntersectDistances = function (a, b, c) {
	var discriminant = b*b - 4.0 * a * c;

	// Discriminant is 0. One solution exists.
	if (Math.abs(discriminant) < 0.0001) // epsilon value
		return [b / (2.0 * a)]

	// Discriminant is less than 0. No solutions exists.
	if (discriminant < 0.0)
		return [];

	// Discriminant is greater than 0. Two solutions exists.
	return [(b + discriminant) / (2.0 * a), (b - discriminant) / (2.0 * a)];
}

