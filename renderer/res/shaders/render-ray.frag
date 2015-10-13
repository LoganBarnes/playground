precision highp float;
precision highp int;

// epsilon and infinity
const float EPS = 0.0001;
const float INF = 1000.0;
const float PI = 3.14159265359;

// CONE_
// CUBE_
// CYLINDER_
// HOLLOW_CYLINDER_
// SPHERE_
// PLANE_
// WORLD_

// index for each shape
const int CONE = 0;
const int CUBE = 1;
const int CYLINDER = 2;
const int HOLLOW_CYLINDER = 3;
const int SPHERE = 4;
const int PLANE = 5;
const int NUM_SHAPE_TYPES = 6;


// lighting vars
const float POWER = 4.0; //Watts
const float LIGHT_RADIUS = 0.1;
const float R = POWER / (4.0 * PI * PI * LIGHT_RADIUS * LIGHT_RADIUS);
const float attenRadius = 10.0;


struct Shape
{
	int type;
	mat4 trans;
	mat4 inv;
	vec4 color; // alpha is transparency
	vec4 settings; // shine, refractive index, selected, outer radius (torus/hollowCyl)
};

struct Light
{
	int type;
	vec3 posDir;
	vec3 radiance; // w is attenuation radius
};

// ray for raytracing
struct Ray
{
	vec3 o;		// origin
	vec3 d;		// direction
	vec3 di; 	// inverse direction
	bool sign0;
	bool sign1;
	bool sign2;
};

struct Intersection
{
	vec4 pos;
	vec4 norm;
	int index;
};

const int MAX_SHAPES = 10;
const int MAX_LIGHTS = 1;

uniform mat4 uScaleViewInv;
uniform vec4 uEyePos;
uniform vec2 uViewport;

uniform Shape shapes[MAX_SHAPES];
uniform int uNumShapes;

uniform Light lights[MAX_LIGHTS];
// uniform int uNumLights;
// uniform sampler2D uNormalTex;

// global vars
uniform bool uAntialiasing;
uniform bool uUseShadows;
uniform float uBrightness;

int NUM_SHAPES;


//////////////////////////////////////////////
//                   UTIL                   //
//////////////////////////////////////////////

mat4 transpose(in mat4 inMatrix) {
	vec4 i0 = inMatrix[0];
	vec4 i1 = inMatrix[1];
	vec4 i2 = inMatrix[2];
	vec4 i3 = inMatrix[3];

	mat4 outMatrix = mat4(vec4(i0.x, i1.x, i2.x, i3.x),
						  vec4(i0.y, i1.y, i2.y, i3.y),
						  vec4(i0.z, i1.z, i2.z, i3.z),
						  vec4(i0.w, i1.w, i2.w, i3.w));
	return outMatrix;
}

//////////////////////////////////////////////
//            RAY CONSTRUCTOR               //
//////////////////////////////////////////////

void initRay(inout Ray ray, in vec3 origin, in vec3 dir)
{
	ray.o = origin;
	ray.d = dir;

	ray.di = vec3(1.0 / ray.d.x, 1.0 / ray.d.y, 1.0 / ray.d.z);
	ray.sign0 = ray.di.x < 0.0;
	ray.sign1 = ray.di.y < 0.0;
	ray.sign2 = ray.di.z < 0.0;
}



//////////////////////////////////////////////
//                LIGHTING                  //
//////////////////////////////////////////////

vec3 calcLighting(in Ray r, in vec3 norm, in vec3 pointToLight, in vec4 color, in vec4 settings)
{
	float intensity = max(0.0, dot(norm, normalize(pointToLight)));

	float dist = length(pointToLight);
	float a = 0.0;
	float b = 1.0 / (attenRadius * attenRadius * 0.1);
	float atten = 1.0 / (1.0 + a * dist + b * dist * dist);
	atten = 1.0;
	vec3 reflection = normalize(-reflect(pointToLight, norm));
	intensity += pow(max(0.0, dot(-r.d, reflection)), settings.x);

	// float ambient = R * 0.2;
	
	return vec3((atten * intensity * R + atten * 2.0));// * color.xyz);
}


//////////////////////////////////////////////
//             INTERSECTIONS                //
//////////////////////////////////////////////

int solveQuadratic(in float a, in float b, in float c, out float t1, out float t2)
{
	float discriminant = b * b - 4.0 * a * c;

	// Discriminant is 0. One solution exists.
	if (abs(discriminant) < EPS) // epsilon value
	{
		if (abs(b) < EPS)
			return 0;

		if (abs(a) < EPS)
		{
			t1 = INF;
			return 1;
		}

		// else
		t1 = - b / (2.0 * a);
		return 1;
	}

	// Discriminant is less than 0. No solutions exists.
	if (discriminant < 0.0)
		return 0;

	// Discriminant is greater than 0. Two solutions exists.
	// if (abs(a) < EPS)
	// {
	// 	t1 = INF;
	// 	t2 = -INF;
	// 	return 2;
	// }
	// else
	{
		float sqrtDisc = sqrt(discriminant);
		t1 = (-b + sqrtDisc) / (2.0 * a);
		t2 = (-b - sqrtDisc) / (2.0 * a);
	}
	return 2;
}


//////////////////////////////////////// CONE_ ////////////////////////////////////////

bool intersectConeQuick(in vec3 E, in vec3 D, in float dist)
{
	vec3 p;

	float a = D.x * D.x + D.z * D.z - D.y * D.y * 0.25;
	float b = 2.0 * E.x * D.x + 2.0 * E.z * D.z - 2.0 * (E.y * D.y - D.y) * 0.25;
	float c = E.x * E.x + E.z * E.z - (E.y * E.y - 2.0 * E.y + 1.0) * 0.25;

	float t1, t2;
	int solutions = solveQuadratic(a, b, c, t1, t2);

	if (solutions > 0)
	{
		if (t1 < dist && t1 > 0.0)
		{
			p = E + t1 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
		if (solutions > 1 && t2 < dist && t2 > 0.0)
		{
			p = E + t2 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
	}

	// bottom plane
	t1 = (-1.0 - E.y) / D.y;
	p = E + t1 * D;
	if (t1 < dist && t1 > 0.0 && p.x * p.x + p.z * p.z < 1.0)
		return true;

	return false;
}



vec4 intersectCone(in vec3 E, in vec3 D)
{
	vec4 n = vec4(0, 0, 0, INF);
	vec3 p;

	float mag;
	float slope = 0.5;

	float a = D.x * D.x + D.z * D.z - D.y * D.y * 0.25;
	float b = 2.0 * E.x * D.x + 2.0 * E.z * D.z - 2.0 * (E.y * D.y - D.y) * 0.25;
	float c = E.x * E.x + E.z * E.z - (E.y * E.y - 2.0 * E.y + 1.0) * 0.25;

	float t1, t2;
	int solutions = solveQuadratic(a, b, c, t1, t2);

	if (solutions > 0)
	{
		if (t1 > 0.0 && t1 < n.w)
		{
			p = E + t1 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
			{
				mag = sqrt(p.x * p.x + p.z * p.z);
				n = vec4(p.x, slope * mag, p.z, t1);
			}
		}
		if (solutions > 1 && t2 < n.w && t2 > 0.0)
		{
			p = E + t2 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
			{
				mag = sqrt(p.x * p.x + p.z * p.z);
				n = vec4(p.x, slope * mag, p.z, t2);
			}
		}
	}

	// bottom plane
	t1 = (-1.0 - E.y) / D.y;
	p = E + t1 * D;
	if (t1 < n.w && t1 > 0.0 && p.x * p.x + p.z * p.z <= 1.0)
		n = vec4(0, -1, 0, t1);

	return n;
}

//////////////////////////////////////// CUBE_ ////////////////////////////////////////

bool intersectCubeQuick(in vec3 E, in vec3 D, in float dist)
{
	vec3 norm = vec3(1);

	vec3 bounds[2];
	bounds[0] = vec3(-1);
	bounds[1] = vec3( 1);

	// hack for glsl since indices have to be constant
	vec3 bounds1, bounds2;
	if (D.x < 0.0)
	{
		bounds1.x = bounds[1].x;
		bounds2.x = bounds[0].x;
	}
	else
	{
		norm.x = -1.0;
		bounds1.x = bounds[0].x;
		bounds2.x = bounds[1].x;
	}
	if (D.y < 0.0)
	{
		bounds1.y = bounds[1].y;
		bounds2.y = bounds[0].y;
	}
	else
	{
		norm.y = -1.0;
		bounds1.y = bounds[0].y;
		bounds2.y = bounds[1].y;
	}
	if (D.z < 0.0)
	{
		bounds1.z = bounds[1].z;
		bounds2.z = bounds[0].z;
	}
	else
	{
		norm.z = -1.0;
		bounds1.z = bounds[0].z;
		bounds2.z = bounds[1].z;
	} // end hack

	vec4 nmin = vec4( norm.x, 0, 0, INF);
	vec4 nmax = vec4(-norm.x, 0, 0, INF);
	float tymin, tymax, tzmin, tzmax;

	nmin.w = (bounds1.x - E.x) / D.x;
	nmax.w = (bounds2.x - E.x) / D.x;
	tymin = (bounds1.y - E.y) / D.y;
	tymax = (bounds2.y - E.y) / D.y;
	if ( (nmin.w > tymax) || (tymin > nmax.w) ) 
		return false;
	if (tymin > nmin.w)
		nmin = vec4(0, norm.y, 0, tymin);
	if (tymax < nmax.w)
		nmax = vec4(0,-norm.y, 0, tymax);
	tzmin = (bounds1.z - E.z) / D.z;
	tzmax = (bounds2.z - E.z) / D.z;
	if ( (nmin.w > tzmax) || (tzmin > nmax.w) ) 
		return false;
	if (tzmin > nmin.w)
		nmin = vec4(0, 0, norm.z, tzmin);
	if (tzmax < nmax.w)
		nmax = vec4(0, 0,-norm.z, tzmax);
	if ( (nmin.w < dist) && (nmax.w > 0.0) )
		return true;
	return false;
}


vec4 intersectCube(in vec3 E, in vec3 D)
{
	vec3 norm = vec3(1);

	vec3 bounds[2];
	bounds[0] = vec3(-1);
	bounds[1] = vec3( 1);

	// hack for glsl since indices have to be constant
	vec3 bounds1, bounds2;
	if (D.x < 0.0)
	{
		bounds1.x = bounds[1].x;
		bounds2.x = bounds[0].x;
	}
	else
	{
		norm.x = -1.0;
		bounds1.x = bounds[0].x;
		bounds2.x = bounds[1].x;
	}
	if (D.y < 0.0)
	{
		bounds1.y = bounds[1].y;
		bounds2.y = bounds[0].y;
	}
	else
	{
		norm.y = -1.0;
		bounds1.y = bounds[0].y;
		bounds2.y = bounds[1].y;
	}
	if (D.z < 0.0)
	{
		bounds1.z = bounds[1].z;
		bounds2.z = bounds[0].z;
	}
	else
	{
		norm.z = -1.0;
		bounds1.z = bounds[0].z;
		bounds2.z = bounds[1].z;
	} // end hack

	vec4 nmin = vec4( norm.x, 0, 0, INF);
	vec4 nmax = vec4(-norm.x, 0, 0, INF);
	float tymin, tymax, tzmin, tzmax;

	nmin.w = (bounds1.x - E.x) / D.x;
	nmax.w = (bounds2.x - E.x) / D.x;
	tymin = (bounds1.y - E.y) / D.y;
	tymax = (bounds2.y - E.y) / D.y;
	if ( (nmin.w > tymax) || (tymin > nmax.w) ) 
		return vec4(INF);
	if (tymin > nmin.w)
		nmin = vec4(0, norm.y, 0, tymin);
	if (tymax < nmax.w)
		nmax = vec4(0,-norm.y, 0, tymax);
	tzmin = (bounds1.z - E.z) / D.z;
	tzmax = (bounds2.z - E.z) / D.z;
	if ( (nmin.w > tzmax) || (tzmin > nmax.w) ) 
		return vec4(INF);
	if (tzmin > nmin.w)
		nmin = vec4(0, 0, norm.z, tzmin);
	if (tzmax < nmax.w)
		nmax = vec4(0, 0,-norm.z, tzmax);
	if ( (nmin.w < INF) && (nmax.w > 0.0) )
		return (nmin.w < 0.0 ? nmax : nmin);
	return vec4(INF);
}

//////////////////////////////////////// CYLINDER_ ////////////////////////////////////////

bool intersectCylinderQuick(in vec3 E, in vec3 D, in float dist)
{
	vec3 p;

	float a = dot(D.xz, D.xz);
	float b = 2.0 * dot(D.xz, E.xz);
	float c = dot(E.xz, E.xz) - 1.0;

	float t1, t2;
	int solutions = solveQuadratic(a, b, c, t1, t2);

	if (solutions > 0)
	{
		if (t1 < dist && t1 > 0.0)
		{
			p = E + t1 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
		if (solutions > 1 && t2 < dist && t2 > 0.0)
		{
			p = E + t2 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
	}

	// top plane
	t1 = (1.0 - E.y) / D.y;
	p = E + t1 * D;
	if (t1 < dist && t1 > 0.0 && p.x * p.x + p.z * p.z < 1.0)
		return true;

	// bottom plane
	t1 = (-1.0 - E.y) / D.y;
	p = E + t1 * D;
	if (t1 < dist && t1 > 0.0 && p.x * p.x + p.z * p.z < 1.0)
		return true;

	return false;
}



vec4 intersectCylinder(in vec3 E, in vec3 D)
{
	vec4 n = vec4(0, 0, 0, INF);
	vec3 p;

	float a = dot(D.xz, D.xz);
	float b = 2.0 * dot(D.xz, E.xz);
	float c = dot(E.xz, E.xz) - 1.0;

	float t1, t2;
	int solutions = solveQuadratic(a, b, c, t1, t2);

	if (solutions > 0)
	{
		if (t1 > 0.0 && t1 < n.w)
		{
			p = E + t1 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
			{
				n = vec4(p.x, 0, p.z, t1);
			}
		}
		if (solutions > 1 && t2 < n.w && t2 > 0.0)
		{
			p = E + t2 * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				n = vec4(p.x, 0, p.z, t2);
		}
	}

	// top plane
	t1 = (1.0 - E.y) / D.y;
	p = E + t1 * D;
	if (t1 < n.w && t1 > 0.0 && ((p.x * p.x + p.z * p.z) - 1.0) <= EPS)
		n = vec4(0, 1, 0, t1);

	// bottom plane
	t1 = (-1.0 - E.y) / D.y;
	p = E + t1 * D;
	if (t1 < n.w && t1 > 0.0 && p.x * p.x + p.z * p.z <= 1.0)
		n = vec4(0, -1, 0, t1);

	return n;
}


//////////////////////////////////////// HOLLOW_CYLINDER_ ////////////////////////////////////////

bool intersectHollowCylinderQuick(in vec3 E, in vec3 D, in float dist, in float outerRadius)
{
	vec4 n = vec4(0, 0, 0, INF);
	vec3 p;

	float radius_inner = 1.0 - (outerRadius * 2.0);

	float a = dot(D.xz, D.xz);
	float b = 2.0 * dot(D.xz, E.xz);
	float c_out = dot(E.xz, E.xz) - 1.0;
	float c_in = dot(E.xz, E.xz) - radius_inner * radius_inner;

	float t1_out, t2_out, t1_in, t2_in;
	int solutions_out = solveQuadratic(a, b, c_out, t1_out, t2_out);
	int solutions_in = solveQuadratic(a, b, c_in, t1_in, t2_in);

	if (solutions_out > 0)
	{
		if (t1_out < dist && t1_out > 0.0)
		{
			p = E + t1_out * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
		if (solutions_out > 1 && t2_out < dist && t2_out > 0.0)
		{
			p = E + t2_out * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
	}
	if (solutions_in > 0)
	{
		if (t1_in < dist && t1_in > 0.0)
		{
			p = E + t1_in * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
		if (solutions_in > 1 && t2_in < dist && t2_in > 0.0)
		{
			p = E + t2_in * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				return true;
		}
	}

	// top plane
	t1_in = (1.0 - E.y) / D.y;
	p = E + t1_in * D;
	if (t1_in < dist && t1_in > 0.0)
	{
		float rad = p.x * p.x + p.z * p.z;
		if (rad < 1.0 && rad > radius_inner * radius_inner)
			return true;
	}

	// bottom plane
	t1_in = (-1.0 - E.y) / D.y;
	p = E + t1_in * D;
	if (t1_in < dist && t1_in > 0.0)
	{
		float rad = p.x * p.x + p.z * p.z;
		if (rad < 1.0 && rad > radius_inner * radius_inner)
			return true;
	}

	return false;
}



vec4 intersectHollowCylinder(in vec3 E, in vec3 D, in float outerRadius)
{
	vec4 n = vec4(0, 0, 0, INF);
	vec3 p;

	float radius_inner = 1.0 - (outerRadius * 2.0);

	float a = dot(D.xz, D.xz);
	float b = 2.0 * dot(D.xz, E.xz);
	float c_out = dot(E.xz, E.xz) - 1.0;
	float c_in = dot(E.xz, E.xz) - radius_inner * radius_inner;

	float t1_out, t2_out, t1_in, t2_in;
	int solutions_out = solveQuadratic(a, b, c_out, t1_out, t2_out);
	int solutions_in = solveQuadratic(a, b, c_in, t1_in, t2_in);

	if (solutions_out > 0)
	{
		if (t1_out > 0.0)
		{
			p = E + t1_out * D;
			if (p.y <= 1.0 && p.y >= -1.0)
			{
				n = vec4(p.x, 0, p.z, t1_out);
			}
		}
		if (solutions_out > 1 && t2_out < n.w && t2_out > 0.0)
		{
			p = E + t2_out * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				n = vec4(p.x, 0, p.z, t2_out);
		}
	}
	if (solutions_in > 0)
	{
		if (t1_in < n.w && t1_in > 0.0)
		{
			p = E + t1_in * D;
			if (p.y <= 1.0 && p.y >= -1.0)
			{
				n = vec4(-p.x, 0, -p.z, t1_in);
			}
		}
		if (solutions_in > 1 && t2_in < n.w && t2_in > 0.0)
		{
			p = E + t2_in * D;
			if (p.y <= 1.0 && p.y >= -1.0)
				n = vec4(-p.x, 0, -p.z, t2_in);
		}
	}

	// top plane
	t1_in = (1.0 - E.y) / D.y;
	p = E + t1_in * D;
	if (t1_in < n.w && t1_in > 0.0)
	{
		float rad = p.x * p.x + p.z * p.z;
		if (rad < 1.0 && rad > radius_inner * radius_inner)
			n = vec4(0, 1, 0, t1_in);
	}

	// bottom plane
	t1_in = (-1.0 - E.y) / D.y;
	p = E + t1_in * D;
	if (t1_in < n.w && t1_in > 0.0)
	{
		float rad = p.x * p.x + p.z * p.z;
		if (rad < 1.0 && rad > radius_inner * radius_inner)
			n = vec4(0, -1, 0, t1_in);
	}

	return n;
}


//////////////////////////////////////// SPHERE_ ////////////////////////////////////////

bool intersectSphereQuick(in vec3 E, in vec3 D, in float dist)
{

	float a = dot(D, D);
	float b = 2.0 * dot(D, E);
	float c = dot(E, E) - 1.0;

	float t1, t2;
	int solutions = solveQuadratic(1.0, b, c, t1, t2);

	if (solutions > 0)
	{
		if (t1 < dist && t1 > 0.0)
			return true;
		if (solutions > 1 && t2 < dist && t2 > 0.0)
			return true;
	}

	return false;
}


vec4 intersectSphere(in vec3 E, in vec3 D)
{
	vec4 n = vec4(0, 0, 0, INF);
	vec3 p;

	float a = dot(D, D);
	float b = 2.0 * dot(D, E);
	float c = dot(E, E) - 1.0;

	float t1, t2;
	int solutions = solveQuadratic(a, b, c, t1, t2);


	if (solutions > 0)
	{
		if (t1 > 0.0 && t1 < n.w)
		{
			p = E + t1 * D;
			n = vec4(p, t1);
		}
		if (solutions > 1 && t2 < n.w && t2 > 0.0)
		{
			p = E + t2 * D;
			n = vec4(p, t2);
		}
	}

	return n;
}


//////////////////////////////////////// PLANE_ ////////////////////////////////////////

bool intersectPlaneQuick(in vec3 E, in vec3 D, in float dist)
{
	float t = (-E.z) / D.z;
	vec3 p = E + t * D;
	if (t < dist && t > 0.0)
		return (p.x >= -1.0 && p.x <= 1.0 && p.y >= -1.0 && p.y <= 1.0);

	return false;
}


vec4 intersectPlane(in vec3 E, in vec3 D)
{
	float t = (-E.z) / D.z;
	vec3 p = E + t * D;
	if (t < INF && t > 0.0)
	{
		if (p.x >= -1.0 && p.x <= 1.0 && p.y >= -1.0 && p.y <= 1.0)
			return vec4(0, 0, (D.z < 0.0 ? 1 : -1), t);
	}

	return vec4(0, 0, 0, INF);
}


//////////////////////////////////////// WORLD_ ////////////////////////////////////////

bool intersectWorldQuick(in Ray r, in float distance, in int exclude)
{
	Shape shape;
	for (int i = 0; i < MAX_SHAPES; ++i)
	{
		if (i == exclude)
			continue;

		shape = shapes[i];

		vec3 E = vec3(shape.inv * vec4(r.o, 1.0));
		vec3 D = vec3(shape.inv * vec4(r.d, 0.0));

		// check bounding box first
		if (shape.type == SPHERE && shape.settings[3] > 0.5)
			continue;

		if (!intersectCubeQuick(E, D, distance))
			continue;

		if (shape.type == CONE)
		{
			if (intersectConeQuick(E, D, distance))
				return true;
		}
		else if (shape.type == CUBE)
		{
			if (intersectCubeQuick(E, D, distance))
				return true;
		}
		else if (shape.type == CYLINDER)
		{
			if (intersectCylinderQuick(E, D, distance))
				return true;
		}
		else if (shape.type == HOLLOW_CYLINDER)
		{
			if (intersectHollowCylinderQuick(E, D, distance, shape.settings[3]))
				return true;
		}
		else if (shape.type == SPHERE)
		{
			if (intersectSphereQuick(E, D, distance))
				return true;
		}
		else if (shape.type == PLANE)
		{
			if (intersectPlaneQuick(E, D, distance))
				return true;
		}
	}

	return false;
}

// check for intersections with every icon except the excluded one
int intersectWorld(in Ray r, out vec4 n, out Shape s, in int exclude)
{
	n = vec4(INF);
	vec4 tempN = vec4(INF);
	int index = -1;

	Shape shape;
	for (int i = 0; i < MAX_SHAPES; ++i)
	{
		if (i == exclude)
			continue;

		shape = shapes[i];

		vec3 E = vec3(shape.inv * vec4(r.o, 1.0));
		vec3 D = vec3(shape.inv * vec4(r.d, 0.0));

		// check bounding box first
		if (!intersectCubeQuick(E, D, INF))
			continue;

		if (shape.type == CONE)
		{
			tempN = intersectCone(E, D);
			if (tempN.w < n.w)
			{
				n = tempN;
				index = i;
				s = shape;
			}
		}
		else if (shape.type == CUBE)
		{
			tempN = intersectCube(E, D);
			if (tempN.w < n.w)
			{
				n = tempN;
				index = i;
				s = shape;
			}
		}
		else if (shape.type == CYLINDER)
		{
			tempN = intersectCylinder(E, D);
			if (tempN.w < n.w)
			{
				n = tempN;
				index = i;
				s = shape;
			}
		}
		else if (shape.type == HOLLOW_CYLINDER)
		{
			tempN = intersectHollowCylinder(E, D, shape.settings[3]);
			if (tempN.w < n.w)
			{
				n = tempN;
				index = i;
				s = shape;
			}
		}
		else if (shape.type == SPHERE)
		{
			tempN = intersectSphere(E, D);
			if (tempN.w < n.w)
			{
				n = tempN;
				index = i;
				s = shape;
			}
		}
		else if (shape.type == PLANE)
		{
			tempN = intersectPlane(E, D);
			if (tempN.w < n.w)
			{
				n = tempN;
				index = i;
				s = shape;
			}
		}
	}

	if (index >= 0)
	{
		n.xyz = mat3(transpose(s.inv)) * normalize(n.xyz);
		n.xyz = normalize(n.xyz);
	}

	return index;
}


//////////////////////////////////////////////
//                RAYTRACE                  //
//////////////////////////////////////////////

vec4 raytrace(in Ray r)
{
	vec4 color = vec4(0, 0, 0, 1);
	vec4 norm = vec4(INF);
	
	Shape shape;
	int index = intersectWorld(r, norm, shape, -1);

	if (index < 0)
		return vec4(vec3(0.0), 1.0);

	if (shape.type == SPHERE && shape.settings[3] > 0.5)
		return vec4(vec3(R * 1.5), 1.0);

	vec3 p = (r.o + norm.w * r.d) + (norm.xyz * EPS);

	vec3 vecToLight = lights[0].posDir - p;
	Ray rayToLight;
	initRay(rayToLight, p + norm.xyz * EPS, normalize(vecToLight));

	float dist = length(vecToLight);
	if (uUseShadows && intersectWorldQuick(rayToLight, dist, index))
	{
		// float a = 0.0;
		// float b = 1.0 / (attenRadius * attenRadius * 0.1);
		// float atten = 1.0 / (1.0 + a * dist + b * dist * dist);
		color = vec4(vec3(R * 0.2), 1);
	}
	else
		color = vec4(calcLighting(r, norm.xyz, vecToLight, shape.color, shape.settings), 1);

	if (shape.settings[2] > 0.5)
		color.xz *= 0.5;

	// return vec4(color.x < -0.1 ? 0.3 : color.x,
	// 			color.y < -0.1 ? 0.3 : color.y,
	// 			color.z < -0.1 ? 0.3 : color.z,
	// 			1.0);
	// color = vec4(vec3(norm.w / 10.0), 1.0);
	return color;
}


//////////////////////////////////////////////
//                  MAIN                    //
//////////////////////////////////////////////

void main ()
{

	NUM_SHAPES = (uNumShapes < MAX_SHAPES ? uNumShapes : MAX_SHAPES);

	// set up ray
	vec4 color = vec4(0.0);
	vec2 offset[5];

	if (uAntialiasing) // anti alliasing
	{
		offset[0] = vec2(-0.25);
		offset[1] = vec2(0.25, -0.25); 
		offset[2] = vec2(0.0); 
		offset[3] = vec2(-0.25, 0.25); 
		offset[4] = vec2(0.25);

		for (int i = 0; i < 5; ++i)
		{
			vec4 pos = vec4(((gl_FragCoord.xy + offset[i]) * 2.0 ) / uViewport - vec2(1, 1), -1, 1);

			Ray ray; // new ray for this fragment

			ray.d = vec3(uScaleViewInv * pos);
			ray.d = normalize(ray.d - uEyePos.xyz); // ray direction
			initRay(ray, uEyePos.xyz, ray.d);

			// use ray
			color += raytrace(ray);
		}
		color /= 5.0;
	}
	else
	{
		vec4 pos = vec4((gl_FragCoord.xy * 2.0 ) / uViewport - vec2(1, 1), -1, 1);

		Ray ray; // new ray for this fragment

		ray.d = vec3(uScaleViewInv * pos);
		ray.d = normalize(ray.d - uEyePos.xyz); // ray direction
		initRay(ray, uEyePos.xyz, ray.d);

		// use ray
		color += raytrace(ray);
	}

	color.xyz = clamp((color.xyz * uBrightness) / (R * 1.5), 0.0, 1.0);
	gl_FragColor = color;
}

// CONE_
// CUBE_
// CYLINDER_
// HOLLOW_CYLINDER_
// SPHERE_
// WORLD_




