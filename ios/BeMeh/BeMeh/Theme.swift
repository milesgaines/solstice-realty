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
    // Warmed toward the medallion: a soft bronze-mocha ground instead of near
    // black, so surfaces read as lit metal that blends with the logo — without
    // flooding the screen with gold.
    static let ground     = Color(red: 0.145, green: 0.106, blue: 0.071) // #251B12 warm bronze-black
    static let panel      = Color(red: 0.200, green: 0.149, blue: 0.098) // #332619 warm taupe
    static let panelLift  = Color(red: 0.271, green: 0.204, blue: 0.133) // #453422
    static let ink        = Color(red: 0.965, green: 0.918, blue: 0.851) // #F6EAD9
    static let inkDim     = Color(red: 0.722, green: 0.616, blue: 0.478) // #B89D7A warmer
    static let gold       = Color(red: 0.882, green: 0.694, blue: 0.400) // #E1B166 softened
    static let goldBright = Color(red: 0.961, green: 0.847, blue: 0.612) // #F5D89C
    static let goldDeep   = Color(red: 0.616, green: 0.412, blue: 0.220) // #9D6938
    static let copper     = Color(red: 0.910, green: 0.643, blue: 0.561) // #E8A48F
    static let sage       = Color(red: 0.616, green: 0.729, blue: 0.533) // #9DBA88
    static let hairline   = Color(red: 1, green: 0.93, blue: 0.82).opacity(0.10)

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
            // Warm bloom from the top, echoing the logo's lit gold field.
            RadialGradient(
                colors: [Palette.gold.opacity(0.26), Palette.goldDeep.opacity(0.10), .clear],
                center: .init(x: 0.5, y: 0.0), startRadius: 0, endRadius: 560
            )
            // A second, lower copper glow so the whole field feels metallic, not flat.
            RadialGradient(
                colors: [Palette.copper.opacity(0.10), .clear],
                center: .init(x: 0.2, y: 0.9), startRadius: 0, endRadius: 420
            )
            AngularGradient(
                colors: [Palette.goldDeep.opacity(0.08), .clear, Palette.copper.opacity(0.05),
                         .clear, Palette.goldDeep.opacity(0.08)],
                center: .init(x: 0.5, y: 0.4)
            )
            .blur(radius: 70)
            .opacity(0.35)
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
