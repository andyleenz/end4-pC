#version 440
// Downscale with a Catmull-Rom cubic kernel stretched over each output pixel's
// footprint in the source texture. Sharper than a box average, without aliasing.

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 texelStep; // 1 / source texture size
    vec2 footprint; // source texels per output pixel
};

layout(binding = 1) uniform sampler2D source;

const int MAX_TAPS = 8; // per side, per axis

float catmullRom(float x) {
    x = abs(x);
    if (x < 1.0) return (1.5 * x - 2.5) * x * x + 1.0;
    if (x < 2.0) return ((-0.5 * x + 2.5) * x - 4.0) * x + 2.0;
    return 0.0;
}

void main() {
    vec2 scale = max(footprint, vec2(1.0));
    vec2 radius = 2.0 * scale; // kernel support in texels
    // Step one texel at a time; widen the stride only if the kernel needs more taps.
    vec2 stride = max(vec2(1.0), ceil(radius / float(MAX_TAPS)));
    vec2 pos = qt_TexCoord0 / texelStep;      // in texels
    vec2 base = floor(pos - 0.5) + 0.5;       // nearest texel center at or below

    vec4 acc = vec4(0.0);
    float weightSum = 0.0;
    for (int j = -MAX_TAPS; j <= MAX_TAPS; j++) {
        float ty = base.y + float(j) * stride.y;
        float wy = catmullRom((ty - pos.y) / scale.y);
        if (wy == 0.0) continue;
        for (int i = -MAX_TAPS; i <= MAX_TAPS; i++) {
            float tx = base.x + float(i) * stride.x;
            float wx = catmullRom((tx - pos.x) / scale.x);
            if (wx == 0.0) continue;
            float w = wx * wy;
            acc += w * texture(source, vec2(tx, ty) * texelStep);
            weightSum += w;
        }
    }
    fragColor = clamp(acc / weightSum, 0.0, 1.0) * qt_Opacity;
}
