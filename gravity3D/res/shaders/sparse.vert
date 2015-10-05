precision highp float;
precision highp int;

attribute vec3 aPosition;

uniform mat4 uPVMatrix;
uniform mat4 uMMatrix;

void main () {
	gl_Position = uPVMatrix * uMMatrix * vec4(aPosition, 1.0);
}