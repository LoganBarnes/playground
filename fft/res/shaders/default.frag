precision highp float;
precision highp int;

varying vec2 vUV;

uniform bool uToBW;
uniform bool uIsFFT;
uniform float uThreshold;

uniform bool uFilter;

uniform sampler2D uTexture;
uniform sampler2D uMaxTex;

void main()
{
    if (uIsFFT)
    {
        float maxMag = texture2D(uMaxTex, vec2(0.5)).z;

        float c = 1.0 / log(1.0 + maxMag);
        float scaled = texture2D(uTexture, vUV + vec2(0.5)).z;

        if (scaled <= maxMag * uThreshold)
            scaled = 0.0;
        else
        {
            scaled = log(1.0 + scaled);
            scaled *= c;
        }
        gl_FragColor = vec4(vec3(scaled), 1.0);
        
    }
    else if (uFilter)
    {
        vec3 tex = texture2D(uTexture, vUV).xyz;
        tex *= texture2D(uMaxTex, vUV + vec2(0.5)).x;
        gl_FragColor = vec4(tex, 1.0);
    }
    else
    {
        gl_FragColor = texture2D(uTexture, vUV);

        // calculate black and white value (based on luminocity average)
        if (uToBW)
            gl_FragColor.xyz = vec3(0.21 * gl_FragColor.x + 0.72 * gl_FragColor.y + 0.07 * gl_FragColor.z);
    }
}

