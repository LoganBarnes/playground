precision highp float;
precision highp int;

attribute vec2 aPosition;

varying vec2 vUV;

uniform bool uSwitchX;

void main()
{
	if (uSwitchX)
		vUV = aPosition * vec2(-0.5, 0.5) + vec2(0.5);
	else
		vUV = aPosition * vec2(0.5, 0.5) + vec2(0.5);

	gl_Position = vec4(aPosition, -1, 1);
}
