precision highp float;
precision highp int;

const float PI = 3.14159265359;
const ivec2 TEX_SIZE = ivec2(128, 128);

const float EPS2 = 0.01; // make uniform?

uniform float uDensity; // make uniform?
uniform float uGravityConstant;
uniform bool uDetectCollisions;

uniform sampler2D uCurrPositions;
uniform sampler2D uPrevPositions;
uniform int uNumParticles;

uniform vec2 uViewport;
uniform float uDeltaTime;
uniform float uOldDeltaTime;

void main()
{
	vec2 fragCoord;
	vec2 tCoord;
	vec4 currPosition;

	// previous pixel has a value
	fragCoord = gl_FragCoord.xy;
	tCoord = fragCoord / uViewport;
	currPosition = texture2D(uCurrPositions, tCoord); // mass stored in 'w' var

	if (currPosition.w == 0.0)
	{
			gl_FragColor = vec4(0.0);
			return;
	}

	vec4 prevPosition = texture2D(uPrevPositions, tCoord);
	vec3 velocity = (currPosition.xyz - prevPosition.xyz) / uOldDeltaTime;

	// function of mass and density
	float radius = pow((3.0 * currPosition.w) / (uDensity * 4.0 * PI), 1.0 / 3.0);

	int x = int(floor(fragCoord.x));
	int y = int(floor(fragCoord.y));

	int index = y * int(uViewport.x) + x;


	vec4 otherParticle;
	vec3 force = vec3(0.0);
	vec3 dir;
	float dist2, invDist, otherRadius, sumRadius;
	int counter = 0;


	for (int r = 0; r < TEX_SIZE.y; r++)
	{
		for (int c = 0; c < TEX_SIZE.x; c++)
		{
			// keep track of number of particles
			if (counter > uNumParticles)
				break;
			counter += 1;

			// get the particle at index (c, r)
			otherParticle = texture2D(uCurrPositions, (vec2(c, r) + vec2(0.5)) / uViewport);
			
			if (uDetectCollisions && (x == c && y == r || otherParticle.w == 0.0))
			{
				continue;
			}

			// function of mass and density
			otherRadius = pow((3.0 * otherParticle.w) / (uDensity * 4.0 * PI), 1.0 / 3.0);

			dir = otherParticle.xyz - currPosition.xyz;
			dist2 = dot(dir, dir) + EPS2;

			sumRadius = radius + otherRadius;

			// detect collisions
			if (uDetectCollisions && dist2 < (radius + otherRadius) * (radius + otherRadius))
			{
				bool remove = false;
				// should actually combine with closest particle, not first contact.
				if (currPosition.w < otherParticle.w)
					remove = true;
				else if (currPosition.w == otherParticle.w && index > r * TEX_SIZE.x + c)
					remove = true;

				if (remove) // 'delete' this
				{
					gl_FragColor = vec4(0.0);
					return;
				}
				else // combine the two colliding particles
				{
					// calc velocity of other particle from previous position
					vec3 otherVelocity = (otherParticle.xyz - texture2D(uPrevPositions, (vec2(c, r) + vec2(0.5)) / uViewport).xyz) / uOldDeltaTime;

					// conservation of momentum (perfectly inelastic) : m1 * u1 + m2 * u2 = (m1 + m2) * v
					vec3 newVel = (otherParticle.w * otherVelocity + currPosition.w * velocity) / (otherParticle.w + currPosition.w);
					
					// new particle mass
					currPosition.w += otherParticle.w;

					/* 
					 *  f = m * a = m * (v' - v) / t
					 *  since force is later multiplied by G and m, we divide by it here:
					 *  (m * (v' - v) / t) / (m * G) = ((v' - v) / t) / G
					 */
					force += ((newVel - velocity) / uDeltaTime) / uGravityConstant;
					continue;
				}
			}
			if (counter > uNumParticles)
				break;

			/*
			 * gravitational equation:
			 * f = |dir| * G * (m1 * m2) / r^2
			 *
			 * |dir|  -   normalized direction vector
			 *   G    -   gravitational constant
			 *   r 	  -   distance between m1 and m2 
			 */

			// this is the '|dir| * m2 / r^2' part
			invDist = 1.0 / sqrt(dist2 * dist2 * dist2); // normalized then divided by dist^2
			force += dir * (otherParticle.w * invDist);
		}
	}

	// the 'G * m1' part of the above gravitational calculation
	force *= uGravityConstant * currPosition.w;

	// v = v + a * t = v + (f / m) * t
	velocity += (force / currPosition.w) * uDeltaTime;

	// p = p + v * t
	currPosition.xyz += velocity * uDeltaTime;

	// output new position
	gl_FragColor = currPosition;
}
