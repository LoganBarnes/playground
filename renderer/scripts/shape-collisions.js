
var INF = Number.POSITIVE_INFINITY;
var EPS = 0.0001;

// shape types
var ShapeType = Object.freeze({

	CONE: 				0,
	CUBE: 				1,
	CYLINDER: 			2,
	HOLLOW_CYLINDER: 	3,
	SPHERE: 			4,
	PLANE: 				5,
	NUM_SHAPE_TYPES: 	6

});

var Shape = makeStruct("type trans inv color settings");

//////////////////////////////////////////////
//             INTERSECTIONS                //
//////////////////////////////////////////////

function solveQuadratic(a, b, c) {
	var discriminant = b * b - 4.0 * a * c;

	// Discriminant is 0. One solution exists.
	if (Math.abs(discriminant) < EPS) // epsilon value
	{
		if (Math.abs(b) < EPS)
			return [];

		if (Math.abs(a) < EPS)
			return [INF];

		// else
		return [- b / (2.0 * a)];
	}

	// Discriminant is less than 0. No solutions exists.
	if (discriminant < 0.0)
		return [];

	// Discriminant is greater than 0. Two solutions exists.

	var sqrtDisc = Math.sqrt(discriminant);
	return [(-b + sqrtDisc) / (2.0 * a), (-b - sqrtDisc) / (2.0 * a)];
}


//////////////////////////////////////// CONE ////////////////////////////////////////

function intersectCone(E, D) {
	var bestT = INF;
	var p = vec3.create();

	var a = D[0] * D[0] + D[2] * D[2] - D[1] * D[1] * 0.25;
	var b = 2.0 * E[0] * D[0] + 2.0 * E[2] * D[2] - 2.0 * (E[1] * D[1] - D[1]) * 0.25;
	var c = E[0] * E[0] + E[2] * E[2] - (E[1] * E[1] - 2.0 * E[1] + 1.0) * 0.25;

	var t = solveQuadratic(a, b, c);

	if (t.length > 0)
	{
		if (t[0] > 0.0 && t[0] < t) {
			vec3.scale(p, D, t[0]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t[0];
			}
		}
		if (t.length > 1 && t[1] < bestT && t[1] > 0.0) {
			vec3.scale(p, D, t[1]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t[1];
			}
		}
	}

	// bottom plane
	t = (-1.0 - E[1]) / D[1];
	vec3.scale(p, D, t);
	vec3.add(p, E, p);
	if (t < bestT && t > 0.0 && p[0] * p[0] + p[2] * p[2] <= 1.0)
		bestT = t;

	return bestT;
}

//////////////////////////////////////// CUBE ////////////////////////////////////////

function intersectAABB(E, D) {

	var Di = [1.0 / D[0], 1.0 / D[1], 1.0 / D[2]];
	var sign = [(Di[0] < 0.0 ? 1 : 0), (Di[1] < 0.0 ? 1 : 0), (Di[2] < 0.0 ? 1 : 0)];

	var tmin, tmax, tymin, tymax, tzmin, tzmax;
	var bounds = [[-1, -1, -1], [1, 1, 1]];

	tmin = (bounds[sign[0]][0] - E[0]) * Di[0];
	tmax = (bounds[1-sign[0]][0] - E[0]) * Di[0];
	tymin = (bounds[sign[1]][1] - E[1]) * Di[1];
	tymax = (bounds[1-sign[1]][1] - E[1]) * Di[1];

	if ( (tmin > tymax) || (tymin > tmax) ) 
		return false;

	if (tymin > tmin)
		tmin = tymin;
	if (tymax < tmax)
		tmax = tymax;
	tzmin = (bounds[sign[2]][2] - E[2]) * Di[2];
	tzmax = (bounds[1-sign[2]][2] - E[2]) * Di[2];

	if ( (tmin > tzmax) || (tzmin > tmax) ) 
		return false;

	if (tzmin > tmin)
		tmin = tzmin;
	if (tzmax < tmax)
		tmax = tzmax;

	if ( (tmin < INF) && (tmax > 0.0) )
		return true;
	return false;
}

function intersectCube(E, D) {

	var Di = [1.0 / D[0], 1.0 / D[1], 1.0 / D[2]];
	var sign = [(Di[0] < 0.0 ? 1 : 0), (Di[1] < 0.0 ? 1 : 0), (Di[2] < 0.0 ? 1 : 0)];

	var tmin, tmax, tymin, tymax, tzmin, tzmax;
	var bounds = [[-1, -1, -1], [1, 1, 1]];

	tmin = (bounds[sign[0]][0] - E[0]) * Di[0];
	tmax = (bounds[1-sign[0]][0] - E[0]) * Di[0];
	tymin = (bounds[sign[1]][1] - E[1]) * Di[1];
	tymax = (bounds[1-sign[1]][1] - E[1]) * Di[1];

	if ( (tmin > tymax) || (tymin > tmax) ) 
		return INF;

	if (tymin > tmin)
		tmin = tymin;
	if (tymax < tmax)
		tmax = tymax;
	tzmin = (bounds[sign[2]][2] - E[2]) * Di[2];
	tzmax = (bounds[1-sign[2]][2] - E[2]) * Di[2];

	if ( (tmin > tzmax) || (tzmin > tmax) ) 
		return INF;

	if (tzmin > tmin)
		tmin = tzmin;
	if (tzmax < tmax)
		tmax = tzmax;

	if ( (tmin < INF) && (tmax > 0.0) )
		return (tmin < 0.0 ? tmax : tmin);
	return INF;
}

//////////////////////////////////////// CYLINDER ////////////////////////////////////////

function intersectCylinder(E, D) {
	var bestT = INF;
	var p = vec3.create();

	var a = vec2.dot([D[0],D[2]], [D[0],D[2]]);
	var b = 2.0 * vec2.dot([D[0],D[2]], [E[0],E[2]]);
	var c = vec2.dot([E[0],E[2]], [E[0],E[2]]) - 1.0;

	var t = solveQuadratic(a, b, c);

	if (t.length > 0)
	{
		if (t[0] > 0.0 && t[0] < bestT)
		{
			vec3.scale(p, D, t[0]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t[0];
			}
		}
		if (t.length > 1 && t[1] < bestT && t[1] > 0.0)
		{
			vec3.scale(p, D, t[1]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t[1];
			}
		}
	}

	// top plane
	t = (1.0 - E[1]) / D[1];
	vec3.scale(p, D, t);
	vec3.add(p, E, p);
	if (t < bestT && t > 0.0 && ((p[0] * p[0] + p[2] * p[2]) - 1.0) <= EPS) {
		bestT = t;
	}

	// bottom plane
	t = (-1.0 - E[1]) / D[1];
	vec3.scale(p, D, t);
	vec3.add(p, E, p);
	if (t < bestT && t > 0.0 && p[0] * p[0] + p[2] * p[2] <= 1.0) {
		bestT = t;
	}

	return bestT;
}


//////////////////////////////////////// HOLLOW CYLINDER ////////////////////////////////////////

function intersectHollowCylinder(E, D, outerRadius) {
	var bestT = INF;
	var p = vec3.create();

	var radius_inner = 1.0 - (outerRadius * 2.0);

	var a = vec2.dot([D[0],D[2]], [D[0],D[2]]);
	var b = 2.0 * vec2.dot([D[0],D[2]], [E[0],E[2]]);
	var c_out = vec2.dot([E[0],E[2]], [E[0],E[2]]) - 1.0;
	var c_in = vec2.dot([E[0],E[2]], [E[0],E[2]]) - radius_inner * radius_inner;

	var t_out = solveQuadratic(a, b, c_out);
	var t_in = solveQuadratic(a, b, c_in);

	if (t_out.length > 0)
	{
		if (t_out[0] > 0.0)
		{
			vec3.scale(p, D, t_out[0]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t_out[0];
			}
		}
		if (t_out.length > 1 && t_out[1] < bestT && t_out[1] > 0.0)
		{
			vec3.scale(p, D, t_out[1]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t_out[1];
			}
		}
	}
	if (t_in.length > 0)
	{
		if (t_in[0] < bestT && t_in[0] > 0.0)
		{
			vec3.scale(p, D, t_in[0]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t_in[0];
			}
		}
		if (t_in.length > 1 && t_in[1] < bestT && t_in[1] > 0.0)
		{
			vec3.scale(p, D, t_in[1]);
			vec3.add(p, E, p);
			if (p[1] < 1.0 && p[1] > -1.0) {
				bestT = t_in[1];
			}
		}
	}

	// top plane
	var t = (1.0 - E[1]) / D[1];
	vec3.scale(p, D, t);
	vec3.add(p, E, p);
	if (t < bestT && t > 0.0)
	{
		var rad = p[0] * p[0] + p[2] * p[2];
		if (rad < 1.0 && rad > radius_inner * radius_inner) {
			bestT = t;
		}
	}

	// bottom plane
	t = (-1.0 - E[1]) / D[1];
	vec3.scale(p, D, t);
	vec3.add(p, E, p);
	if (t < bestT && t > 0.0)
	{
		var rad = p[0] * p[0] + p[2] * p[2];
		if (rad < 1.0 && rad > radius_inner * radius_inner) {
			bestT = t;
		}
	}

	return bestT;
}


//////////////////////////////////////// SPHERE ////////////////////////////////////////

function intersectSphere(E, D) {
	var bestT = INF;
	var p = vec3.create();

	var a = vec3.dot(D, D);
	var b = 2.0 * vec3.dot(D, E);
	var c = vec3.dot(E, E) - 1.0;

	var t = solveQuadratic(a, b, c);


	if (t.length > 0)
	{
		if (t[0] > 0.0 && t[0] < bestT) {
			vec3.scale(p, D, t[0]);
			vec3.add(p, E, p);
			bestT = t[0];
		}
		if (t.length > 1 && t[1] < bestT && t[1] > 0.0) {
			vec3.scale(p, D, t[1]);
			vec3.add(p, E, p);
			bestT = t[1];
		}
	}

	return bestT;
}


//////////////////////////////////////// PLANE ////////////////////////////////////////

function intersectPlane(E, D) {
	var t = (-E[2]) / D[2];
	var p = vec3.create();
	vec3.scale(p, D, t);
	vec3.add(p, E, p);

	if (t < INF && t > 0.0) {
		if (p[0] >= -1.0 && p[0] <= 1.0 && p[1] >= -1.0 && p[1] <= 1.0) {
			return t;
		}
	}

	return INF;
}


//////////////////////////////////////// WORLD ////////////////////////////////////////


// check for intersections with every icon except the excluded one
function intersectWorld(ro, rd, shapes) {
	var best = INF;
	var temp = INF;
	var index = -1;

	var s;
	var length = shapes.length;
	for (var i = 0; i < length; ++i)
	{
		s = shapes[i];

		var E = vec4.create();
		var D = vec4.create();
		vec4.transformMat4(E, ro, s.inv);
		vec4.transformMat4(D, rd, s.inv);

		// check bounding box first
		if (!intersectAABB(E, D, INF))
			continue;

		if (s.type == ShapeType.CONE)
		{
			temp = intersectCone(E, D);
			if (temp < best)
			{
				best = temp;
				index = i;
			}
		}
		else if (s.type == ShapeType.CUBE)
		{
			temp = intersectCube(E, D);
			if (temp < best)
			{
				best = temp;
				index = i;
			}
		}
		else if (s.type == ShapeType.CYLINDER)
		{
			temp = intersectCylinder(E, D);
			if (temp < best)
			{
				best = temp;
				index = i;
			}
		}
		else if (s.type == ShapeType.HOLLOW_CYLINDER)
		{
			temp = intersectHollowCylinder(E, D, s.settings[3]);
			if (temp < best)
			{
				best = temp;
				index = i;
			}
		}
		else if (s.type == ShapeType.SPHERE)
		{
			temp = intersectSphere(E, D);
			if (temp < best)
			{
				best = temp;
				index = i;
			}
		}
		else if (s.type == ShapeType.PLANE)
		{
			temp = intersectPlane(E, D);
			if (temp < best)
			{
				best = temp;
				index = i;
			}
		}
	}

	return [index, best];
}