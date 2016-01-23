precision highp float;
precision highp int;

float persistence = 0.15;
float frequency = 0.05;
float amplitude = 0.75;
const int octaves = 5;
int randomseed = 1;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

varying vec2 vTexc;
varying vec3 vVertex;	// Vertex, in world space
varying vec3 vNormal;	// Normal of the vertex, in world space

varying vec4 vShadowCoord;

uniform mat4 uPVMatrix;
uniform mat4 uMMatrix;
uniform mat4 uMBeforeMatrix;
uniform mat4 uMMatrixIT;

uniform mat4 uDepthBiasPVMMatrix;

float interpolate(float x, float y, float a)
{
	float negA = 1.0 - a;
	float negASqr = negA * negA;
	float fac1 = 3.0 * (negASqr) - 2.0 * (negASqr * negA);
	float aSqr = a * a;
	float fac2 = 3.0 * aSqr - 2.0 * (aSqr * a);

	return x * fac1 + y * fac2; //add the weighted factors
}

float noise(int x, int y)
{
    return fract(sin(dot(vec2(x, y) ,vec2(12.9898,78.233))) * 43758.5453) * 2.0 - 1.0;
}

float getValue(float x, float y)
{
	int Xint = int(x);
	int Yint = int(y);
	float Xfrac = x - float(Xint);
	float Yfrac = y - float(Yint);

	//noise values
	float n01 = noise(Xint-1, Yint-1);
	float n02 = noise(Xint+1, Yint-1);
	float n03 = noise(Xint-1, Yint+1);
	float n04 = noise(Xint+1, Yint+1);
	float n05 = noise(Xint-1, Yint);
	float n06 = noise(Xint+1, Yint);
	float n07 = noise(Xint, Yint-1);
	float n08 = noise(Xint, Yint+1);
	float n09 = noise(Xint, Yint);

	float n12 = noise(Xint+2, Yint-1);
	float n14 = noise(Xint+2, Yint+1);
	float n16 = noise(Xint+2, Yint);

	float n23 = noise(Xint-1, Yint+2);
	float n24 = noise(Xint+1, Yint+2);
	float n28 = noise(Xint, Yint+2);

	float n34 = noise(Xint+2, Yint+2);

	//find the noise values of the four corners
	float x0y0 = 0.0625*(n01+n02+n03+n04) + 0.125*(n05+n06+n07+n08) + 0.25*(n09);
	float x1y0 = 0.0625*(n07+n12+n08+n14) + 0.125*(n09+n16+n02+n04) + 0.25*(n06);
	float x0y1 = 0.0625*(n05+n06+n23+n24) + 0.125*(n03+n04+n09+n28) + 0.25*(n08);
	float x1y1 = 0.0625*(n09+n16+n28+n34) + 0.125*(n08+n14+n06+n24) + 0.25*(n04);

	//interpolate between those values according to the x and y fractions
	float v1 = interpolate(x0y0, x1y0, Xfrac); //interpolate in x direction (y)
	float v2 = interpolate(x0y1, x1y1, Xfrac); //interpolate in x direction (y+1)
	float fin = interpolate(v1, v2, Yfrac);  //interpolate in y direction

	return fin;
}

float total(float i, float j)
{
	//properties of one octave (changing each loop)
	float t = 0.0;
	float _amplitude = 1.0;
	float freq = frequency;
	float seedf = float(randomseed);

	for(int k = 0; k < octaves; k++)
	{
		t += getValue(j * freq + seedf, i * freq + seedf) * _amplitude;
		_amplitude *= persistence;
		freq *= 2.0;
	}
	return t;
}

float getHeight(float x, float y)
{
	return amplitude * total(x, y);
}

float getHeightV(vec2 v)
{
	return getHeight(v.x, v.y);
}

const vec3 off = vec3( -10, 0, 10);
const vec2 size = vec2(off.z - off.x, 0.0);

void setTerrain(inout vec3 position, inout vec3 norm)
{


	vec3 pos = position + vec3(1000.0);
	pos *= 100.0;

	float s11 = getHeightV(pos.xz);
	float s01 = getHeightV(pos.xz + off.xy) * 100.0;
	float s21 = getHeightV(pos.xz + off.zy) * 100.0;
	float s10 = getHeightV(pos.xz + off.yx) * 100.0;
	float s12 = getHeightV(pos.xz + off.yz) * 100.0;

	vec3 va = normalize(vec3(size.x, s21-s01, size.y));
	vec3 vb = normalize(vec3(size.y, s12-s10, size.x));
	vec4 bump = vec4( cross(vb,va), s11 );

	position.y = bump.a;
	norm = bump.xyz;
}

void main()
{
	vec3 position = vec3(aPosition);
	vec3 normal = vec3(aNormal);

	position = vec3(uMBeforeMatrix * vec4(position, 1.0));
	setTerrain(position, normal);

	vTexc = position.xz;
	vShadowCoord = uDepthBiasPVMMatrix * vec4(position, 1.0);
	
	vec4 vertexWorld = uMMatrix * vec4(position, 1.0);

	// vShadowCoord = uDepthBiasPVMMatrix * vertexWorld;

	vVertex = vec3(vertexWorld);
	vNormal = normalize(mat3(uMMatrixIT) * normal);

	gl_Position = uPVMatrix * vertexWorld;
}
