precision highp float;
precision highp int;

attribute vec3 aPosition;

// uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

varying vec3 texcoord;

void main () {
	texcoord = aPosition;
	mat3 view = mat3(uVMatrix);

	// gl_Position = uPMatrix * mat4(view) * vec4(aPosition, 1.0); // moving cubemap
	gl_Position = vec4(aPosition, 1.0); // static cubemap
}