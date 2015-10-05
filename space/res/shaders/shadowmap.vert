precision highp float;
precision highp int;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uDepthPVMMatrix;

void main(){
	vec3 norm = vec3(aNormal);
	vec2 tex = vec2(aTexCoord);

	gl_Position =  uDepthPVMMatrix * vec4(aPosition, 1.0);
}