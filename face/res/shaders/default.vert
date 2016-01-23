precision highp float;
precision highp int;

attribute vec2 aPosition;

uniform bool uFrame;
uniform bool uSwitchX;

varying vec2 vUV;

void main(void)
{
    if (uFrame)
    {
        gl_Position = vec4(aPosition * vec2(2.0, -2.0) - vec2(1.0, -1.0), -1.0, 1.0);
    }
    else
    {
        if (uSwitchX)
            vUV = aPosition * vec2(-0.5) + vec2(0.5);
        else
            vUV = aPosition * vec2(0.5, -0.5) + vec2(0.5);

        gl_Position = vec4(aPosition, 0.0, 1);
    }
}
