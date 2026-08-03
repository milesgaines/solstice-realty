//
//  Components.swift
//  BeMeh
//
//  Premium surfaces: struck cards with depth, an animated score ring, buttons
//  that respond to touch, and the house emblem.
//

import SwiftUI

struct Card<Content: View>: View {
    var lifted: Bool = false
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(lifted ? AnyShapeStyle(Palette.panelLift) : AnyShapeStyle(Palette.panel))
                    .overlay {
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .fill(Palette.cardSheen)
                    }
            }
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .strokeBorder(
                        LinearGradient(colors: [Palette.gold.opacity(0.35), Palette.hairline],
                                       startPoint: .top, endPoint: .bottom),
                        lineWidth: 1
                    )
            }
            .shadow(color: .black.opacity(0.45), radius: 18, x: 0, y: 10)
    }
}

struct Pill: View {
    let text: String
    var tone: Tone = .neutral
    enum Tone { case neutral, live, good, selected }

    private var stroke: Color {
        switch tone {
        case .neutral:  return Palette.hairline
        case .live:     return Palette.copper.opacity(0.55)
        case .good:     return Palette.sage.opacity(0.55)
        case .selected: return Palette.gold.opacity(0.8)
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
            .tracking(1.0)
            .textCase(.uppercase)
            .foregroundStyle(fg)
            .padding(.horizontal, 11)
            .padding(.vertical, 6)
            .background {
                Capsule().fill(fg.opacity(0.08))
            }
            .overlay { Capsule().strokeBorder(stroke, lineWidth: 1) }
    }
}

struct GoldButtonStyle: ButtonStyle {
    var wide: Bool = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.label(15))
            .foregroundStyle(Color(red: 0.157, green: 0.098, blue: 0.035))
            .padding(.vertical, 13)
            .padding(.horizontal, 20)
            .frame(maxWidth: wide ? .infinity : nil)
            .background(Capsule().fill(Palette.goldFill))
            .overlay {
                Capsule().strokeBorder(Palette.goldBright.opacity(0.6), lineWidth: 0.5)
            }
            .shadow(color: Palette.gold.opacity(0.35), radius: 12, x: 0, y: 6)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct GhostButtonStyle: ButtonStyle {
    var wide: Bool = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.label(14))
            .foregroundStyle(Palette.gold)
            .padding(.vertical, 11)
            .padding(.horizontal, 18)
            .frame(maxWidth: wide ? .infinity : nil)
            .overlay { Capsule().strokeBorder(Palette.gold.opacity(0.5), lineWidth: 1) }
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// The skin-index gauge. Animates its fill and counts the number up on appear.
struct RingGauge: View {
    let value: Int
    var size: CGFloat = 84

    @State private var progress: CGFloat = 0
    @State private var shown: Int = 0

    var body: some View {
        ZStack {
            Circle().stroke(Palette.hairline, lineWidth: 9)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(Palette.metal, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: Palette.gold.opacity(0.5), radius: 6)
            Text("\(shown)")
                .font(.display(size * 0.34))
                .foregroundStyle(Palette.ink)
        }
        .frame(width: size, height: size)
        .onAppear { animate() }
    }

    private func animate() {
        withAnimation(.easeOut(duration: 1.0)) {
            progress = min(CGFloat(value) / 100.0, 1)
        }
        // Count the label up in step with the arc.
        for i in 0...value {
            let delay = 1.0 * Double(i) / Double(max(value, 1))
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                shown = i
            }
        }
    }
}

struct ScreenHeader: View {
    let eyebrow: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(eyebrow).eyebrowStyle()
            Text(title)
                .font(.display(34))
                .foregroundStyle(Palette.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// A circular monogram used where a real headshot would go.
struct Monogram: View {
    let letter: String
    var size: CGFloat = 42

    var body: some View {
        Circle()
            .fill(LinearGradient(colors: [Palette.gold, Palette.goldDeep,
                                          Color(red: 0.35, green: 0.22, blue: 0.11)],
                                 startPoint: .topLeading, endPoint: .bottomTrailing))
            .frame(width: size, height: size)
            .overlay {
                Circle().strokeBorder(Palette.goldBright.opacity(0.4), lineWidth: 0.5)
            }
            .overlay {
                Text(letter)
                    .font(.display(size * 0.44))
                    .foregroundStyle(Color(red: 0.18, green: 0.11, blue: 0.05))
            }
            .shadow(color: .black.opacity(0.4), radius: 6, y: 3)
    }
}

/// The house emblem, rendered from the bundled medallion art with a soft glow.
struct Emblem: View {
    var size: CGFloat = 120

    var body: some View {
        Image("Emblem")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
            .clipShape(Circle())
            .overlay {
                Circle().strokeBorder(Palette.gold.opacity(0.5), lineWidth: 1)
            }
            .shadow(color: Palette.gold.opacity(0.35), radius: 24, y: 8)
    }
}
