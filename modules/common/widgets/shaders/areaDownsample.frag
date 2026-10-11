#version 440
// Area-average downscale: averages a grid of bilinear taps covering each
// output pixel's footprint in the source texture. Sharp, without aliasing.

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 texelStep; // 1 / source texture size
    vec2 footprint; // source texels per output pixel
};

layout(binding = 1) uniform sampler2D source;

void main() {
    // Each bilinear tap already averages 2x2 texels.
    vec2 taps = clamp(ceil(footprint * 0.5), vec2(1.0), vec2(8.0));
    vec2 span = max(footprint, vec2(1.0)) * texelStep;
    vec4 acc = vec4(0.0);
    for (int y = 0; y < 8; y++) {
        if (float(y) >= taps.y) break;
        for (int x = 0; x < 8; x++) {
            if (float(x) >= taps.x) break;
            vec2 offset = ((vec2(x, y) + 0.5) / taps - 0.5) * span;
            acc += texture(source, qt_TexCoord0 + offset);
        }
    }
    fragColor = acc / (taps.x * taps.y) * qt_Opacity;
}
