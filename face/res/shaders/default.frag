precision highp float;
precision highp int;

uniform sampler2D uTexture;
uniform bool uFrame;

varying vec2 vUV;

void main(void)
{
    if (uFrame)
    {
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); // yellow
    }
    else
    {
        vec3 color = texture2D(uTexture, vUV).rgb;
        gl_FragColor = vec4(color, 1.0);
    }
}

