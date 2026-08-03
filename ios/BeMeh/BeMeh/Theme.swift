//
//  Theme.swift
//  BeMeh
//
//  Palette and type scale, sampled from the house medallion.
//

import SwiftUI

enum Palette {
    static let ground     = Color(red: 0.078, green: 0.063, blue: 0.047) // #14100C
    static let panel      = Color(red: 0.133, green: 0.102, blue: 0.075) // #221A13
    static let panelLift  = Color(red: 0.200, green: 0.145, blue: 0.102) // #33251A
    static let ink        = Color(red: 0.941, green: 0.894, blue: 0.824) // #F0E4D2
    static let inkDim     = Color(red: 0.639, green: 0.541, blue: 0.416) // #A38A6A
    static let gold       = Color(red: 0.878, green: 0.690, blue: 0.380) // #E0B061
    static let goldDeep   = Color(red: 0.690, green: 0.463, blue: 0.235) // #B0763C
    static let copper     = Color(red: 0.910, green: 0.643, blue: 0.561) // #E8A48F
    static let sage       = Color(red: 0.616, green: 0.729, blue: 0.533) // #9DBA88
    static let hairline   = Color.white.opacity(0.10)

    static let goldFill = LinearGradient(
        colors: [gold, goldDeep],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let liftFill = LinearGradient(
        colors: [panelLift, panel],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

extension Font {
    /// Didot ships with iOS; the fallback is the system serif, which keeps the
    /// same editorial weight if the face is ever unavailable.
    static func display(_ size: CGFloat) -> Font {
        .custom("Didot", size: size)
    }

    static func label(_ size: CGFloat) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }

    static func data(_ size: CGFloat) -> Font {
        .system(size: size, weight: .medium, design: .monospaced)
    }
}

extension Text {
    /// The all-caps, wide-tracked eyebrow used above every screen title.
    func eyebrowStyle() -> some View {
        self.font(.label(10))
            .tracking(1.8)
            .textCase(.uppercase)
            .foregroundStyle(Palette.inkDim)
    }
}
