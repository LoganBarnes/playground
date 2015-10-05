precision highp float;
precision highp int;

attribute vec2 aUV; // uv coordinates

void main(void) {
	gl_Position = vec4(aUV, 0.0, 1.0);
}
