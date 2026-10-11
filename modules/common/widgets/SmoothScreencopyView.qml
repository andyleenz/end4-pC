import QtQuick
import QtQuick.Window
import Quickshell
import Quickshell.Wayland

/**
 * ScreencopyView that downscales with an area-average filter instead of plain bilinear.
 * Bilinear from a 4K capture to a small preview skips texels and aliases text.
 * Set width/height, or constraintSize to fit the capture's aspect ratio like ScreencopyView.
 */
Item {
    id: root
    property alias captureSource: view.captureSource
    property alias live: view.live
    property alias paintCursor: view.paintCursor
    readonly property alias hasContent: view.hasContent
    readonly property alias sourceSize: view.sourceSize
    property size constraintSize: Qt.size(0, 0)

    readonly property real fitScale: {
        const sw = view.sourceSize.width, sh = view.sourceSize.height;
        if (sw <= 0 || sh <= 0 || constraintSize.width <= 0 || constraintSize.height <= 0) return 1;
        return Math.min(constraintSize.width / sw, constraintSize.height / sh);
    }
    implicitWidth: view.sourceSize.width * fitScale
    implicitHeight: view.sourceSize.height * fitScale

    readonly property real dpr: Screen.devicePixelRatio || 1
    readonly property real outWidth: Math.max(1, width * dpr)
    readonly property real outHeight: Math.max(1, height * dpr)
    // Pre-shrink large captures 2:1 (exact box filter under bilinear) to save VRAM.
    readonly property int prescale: view.width / outWidth >= 4 ? 2 : 1

    ScreencopyView {
        id: view
        width: sourceSize.width > 0 ? sourceSize.width : root.width
        height: sourceSize.height > 0 ? sourceSize.height : root.height
    }

    ShaderEffectSource {
        id: viewTexture
        sourceItem: view
        hideSource: true
        live: true
        smooth: true
        visible: false
        textureSize: Qt.size(Math.max(1, Math.round(view.width / root.prescale)),
                             Math.max(1, Math.round(view.height / root.prescale)))
    }

    ShaderEffect {
        anchors.fill: parent
        property var source: viewTexture
        property point texelStep: Qt.point(1 / viewTexture.textureSize.width, 1 / viewTexture.textureSize.height)
        property point footprint: Qt.point(viewTexture.textureSize.width / root.outWidth,
                                           viewTexture.textureSize.height / root.outHeight)
        fragmentShader: Qt.resolvedUrl("shaders/areaDownsample.frag.qsb")
    }
}
