precision highp float;
precision highp int;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

varying vec2 vTexc;
varying vec3 vVertex;	// Vertex, in world space
varying vec3 vNormal;	// Normal of the vertex, in world space

uniform mat4 uPVMatrix;
uniform mat4 uMMatrix;
uniform mat4 uMMatrixIT;

uniform vec4 uShapeSettings; // isMusicIcon, isRenderIcon, useTexture, isLight

// music function
uniform int uFunctionSize;
uniform float uFunction[32]; // won't be sending anything larger than 32

void calcVertex(inout vec3 v, inout vec3 n) {

	if (uFunctionSize == 0) {
		return;
	}

	float angle = acos(dot(normalize(aPosition), vec3(0, -1, 0)));

	float sizeMinus = float(uFunctionSize) - 1.0;
	float di = (angle / 3.14159265/*35897932384626433832795*/) * float(uFunctionSize) - 0.5;
	// float f = mod(di, 1.0);
	float f = di - 1.0 * floor(float(di));
	di -= f;
	int li, ri;
	float t;
	vec2 mid, left, right;
	if (f < 0.5) {
		t = f + 0.5;

		left.x = di - 0.5;
		mid.x = di;
		right.x = di + 0.5;

		li = int(max(0.0, di - 1.0));
		ri = int(min(di + 1.0, sizeMinus));
	} else {
		t = f - 0.5;

		left.x = di + 0.5;
		mid.x = di + 1.;
		right.x = di + 1.5;

		li = int(max(0.0, di));
		ri = int(min(di + 2.0, sizeMinus));
		di = min(di + 1.0, sizeMinus);
	}
	mid.y = uFunction[int(di)];
	left.y = (uFunction[li] + mid.y) / 2.0;
	right.y = (mid.y + uFunction[ri]) / 2.0;

	float t_1 = 1.0 - t;
	float curve = t_1 * (t_1 * left.y + t * mid.y) + t * (t_1 * mid.y + t * right.y);

	v += n * curve;

	vec2 tangent = 2.0 * t_1 * (mid - left) + 2.0 * t * (right - mid);
	tangent.x /= sizeMinus;

	float a = atan(tangent.y, tangent.x);

	vec3 axis = normalize(cross(vec3(0, 1, 0), n));

	float s = sin(-a);
	float c = cos(-a);
	float oc = 1.0 - c;

	mat3 rot = mat3(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
					oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
					oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c);

	n = rot * normalize(n);
	return;
}

float rand(vec2 co){
	return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() 
{
	vTexc = aTexCoord;

	vec3 pos = vec3(aPosition);
	vec3 norm = vec3(aNormal);

	if (uShapeSettings[0] > 0.5)
		calcVertex(pos, norm);
	
	vec4 vertexWorld = uMMatrix * vec4(pos, 1.0);

	vVertex = vec3(vertexWorld);
	vNormal = normalize(mat3(uMMatrixIT) * norm);

	gl_Position = uPVMatrix * vertexWorld;
}
