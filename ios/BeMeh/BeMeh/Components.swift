//
//  Components.swift
//  BeMeh
//
//  The shared surfaces: struck cards, pills, the gold button, the score ring.
//

import SwiftUI

struct Card<Content: View>: View {
    var lifted: Bool = false
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(lifted ? AnyShapeStyle(Palette.liftFill) : AnyShapeStyle(Palette.panel))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(Palette.hairline, lineWidth: 1)
            }
    }
}

struct Pill: View {
    let text: String
    var tone: Tone = .neutral

    enum Tone { case neutral, live, good, selected }

    private var stroke: Color {
        switch tone {
        case .neutral:  return Palette.hairline
        case .live:     return Palette.copper.opacity(0.5)
        case .good:     return Palette.sage.opacity(0.5)
        case .selected: return Palette.gold.opacity(0.7)
        }
    }

    private var fg: Color {
        switch tone {
        case .neutral:  return Palette.inkDim
        case .live:     return Palette.copper
        case .good:     return Palette.sage
        case .selected: return Palette.gold
        }
    }

    var body: some View {
        Text(text)
            .font(.label(10))
            .tracking(0.9)
            .textCase(.uppercase)
            .foregroundStyle(fg)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .overlay {
                Capsule().strokeBorder(stroke, lineWidth: 1)
            }
    }
}

struct GoldButtonStyle: ButtonStyle {
    var wide: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.label(14))
            .foregroundStyle(Color(red: 0.145, green: 0.090, blue: 0.031))
            .padding(.vertical, 11)
            .padding(.horizontal, 18)
            .frame(maxWidth: wide ? .infinity : nil)
            .background(Capsule().fill(Palette.goldFill))
            .opacity(configuration.isPressed ? 0.78 : 1)
    }
}

struct GhostButtonStyle: ButtonStyle {
    var wide: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.label(13))
            .foregroundStyle(Palette.gold)
            .padding(.vertical, 10)
            .padding(.horizontal, 16)
            .frame(maxWidth: wide ? .infinity : nil)
            .overlay { Capsule().strokeBorder(Palette.gold.opacity(0.45), lineWidth: 1) }
            .opacity(configuration.isPressed ? 0.6 : 1)
    }
}

struct RingGauge: View {
    let value: Int
    var size: CGFloat = 76

    var body: some View {
        ZStack {
            Circle()
                .stroke(Palette.hairline, lineWidth: 8)
            Circle()
                .trim(from: 0, to: min(Double(value) / 100.0, 1))
                .stroke(Palette.goldFill, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(value)")
                .font(.display(24))
                .foregroundStyle(Palette.ink)
        }
        .frame(width: size, height: size)
        .animation(.easeOut(duration: 0.6), value: value)
    }
}

struct ScreenHeader: View {
    let eyebrow: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(eyebrow).eyebrowStyle()
            Text(title)
                .font(.display(30))
                .foregroundStyle(Palette.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct Monogram: View {
    let letter: String
    var size: CGFloat = 38

    var body: some View {
        Circle()
            .fill(LinearGradient(colors: [Palette.goldDeep, Color(red: 0.43, green: 0.27, blue: 0.13)],
                                 startPoint: .topLeading, endPoint: .bottomTrailing))
            .frame(width: size, height: size)
            .overlay {
                Text(letter)
                    .font(.display(size * 0.42))
                    .foregroundStyle(Color(red: 0.17, green: 0.10, blue: 0.05))
            }
    }
}

/// The page ground, used behind every tab.
struct GroundBackground: View {
    var body: some View {
        Palette.ground
            .overlay(alignment: .top) {
                RadialGradient(
                    colors: [Palette.gold.opacity(0.16), .clear],
                    center: .top, startRadius: 0, endRadius: 420
                )
            }
            .ignoresSafeArea()
    }
}
