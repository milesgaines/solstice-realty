//
//  Theme.swift
//  BeMeh
//
//  The design system: palette sampled from the house medallion, a layered
//  bronze-gradient ground, a Didot-led type scale, and haptics.
//

import SwiftUI
import UIKit

enum Palette {
    static let ground     = Color(red: 0.067, green: 0.051, blue: 0.036) // #110D09 deep umber
    static let panel      = Color(red: 0.129, green: 0.098, blue: 0.070) // #211912
    static let panelLift  = Color(red: 0.204, green: 0.149, blue: 0.102) // #34261A
    static let ink        = Color(red: 0.957, green: 0.910, blue: 0.839) // #F4E8D6
    static let inkDim     = Color(red: 0.663, green: 0.565, blue: 0.435) // #A9906F
    static let gold       = Color(red: 0.894, green: 0.702, blue: 0.388) // #E4B363
    static let goldBright = Color(red: 0.976, green: 0.859, blue: 0.616) // #F9DB9D
    static let goldDeep   = Color(red: 0.635, green: 0.408, blue: 0.204) // #A26834
    static let copper     = Color(red: 0.910, green: 0.643, blue: 0.561) // #E8A48F
    static let sage       = Color(red: 0.616, green: 0.729, blue: 0.533) // #9DBA88
    static let hairline   = Color.white.opacity(0.09)

    /// The struck-metal fill used on the wordmark and primary accents.
    static let metal = LinearGradient(
        colors: [goldBright, gold, goldDeep],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )

    static let goldFill = LinearGradient(
        colors: [goldBright, goldDeep],
        startPoint: .top, endPoint: .bottom
    )

    /// Panel-to-lift gradient used for raised surfaces (e.g. the call self-view).
    static let liftFill = LinearGradient(
        colors: [panelLift, panel],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )

    /// A subtle bronze sheen for card surfaces.
    static let cardSheen = LinearGradient(
        colors: [Color.white.opacity(0.06), Color.clear, Color.black.opacity(0.10)],
        startPoint: .top, endPoint: .bottom
    )
}

/// The signature ground: deep umber with a warm radial bloom and a faint
/// angular bronze sweep, layered so surfaces read as lit metal rather than flat.
struct AtmosphereBackground: View {
    var body: some View {
        ZStack {
            Palette.ground
            RadialGradient(
                colors: [Palette.gold.opacity(0.22), Palette.goldDeep.opacity(0.05), .clear],
                center: .init(x: 0.5, y: 0.02), startRadius: 0, endRadius: 520
            )
            AngularGradient(
                colors: [Palette.goldDeep.opacity(0.10), .clear, Palette.copper.opacity(0.06),
                         .clear, Palette.goldDeep.opacity(0.10)],
                center: .init(x: 0.5, y: 0.35)
            )
            .blur(radius: 60)
            .opacity(0.5)
        }
        .ignoresSafeArea()
    }
}

extension Font {
    static func display(_ size: CGFloat) -> Font { .custom("Didot", size: size) }
    static func label(_ size: CGFloat) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }
    static func data(_ size: CGFloat) -> Font {
        .system(size: size, weight: .medium, design: .monospaced)
    }
}

extension Text {
    func eyebrowStyle() -> some View {
        self.font(.label(10))
            .tracking(2.2)
            .textCase(.uppercase)
            .foregroundStyle(Palette.gold.opacity(0.85))
    }
}

/// Light wrapper around UIKit haptics so taps feel physical.
enum Haptic {
    static func tap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    static func soft() {
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
    }
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
