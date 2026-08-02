//
//  SessionView.swift
//  BeMeh
//
//  The live consult. Your pro annotates your own scan mid-call and you keep the
//  marked-up map. Video here is a placeholder stage; the real build renders a
//  LiveKit track and syncs annotations over a data channel.
//

import Combine
import SwiftUI

struct SessionView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var elapsed = 724   // 12:04, so the demo opens mid-call
    @State private var revealed = 0
    @State private var muted = false

    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var clock: String {
        String(format: "%d:%02d", elapsed / 60, elapsed % 60)
    }

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.23, green: 0.17, blue: 0.11), Palette.ground],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            GeometryReader { geo in
                ForEach(Array(state.sessionNotes.enumerated()), id: \.element.id) { i, note in
                    if i < revealed {
                        Circle()
                            .strokeBorder(Palette.copper, lineWidth: 1.5)
                            .background(Circle().fill(Palette.copper.opacity(0.10)))
                            .frame(width: 30, height: 30)
                            .position(x: geo.size.width * note.x, y: geo.size.height * note.y)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
            }

            VStack(spacing: 0) {
                HStack(alignment: .top) {
                    Pill(text: "Live · \(clock)", tone: .live)
                    Spacer()
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Palette.liftFill)
                        .frame(width: 78, height: 104)
                        .overlay {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .strokeBorder(Palette.hairline, lineWidth: 1)
                        }
                        .overlay(alignment: .bottom) {
                            Text("You")
                                .font(.label(9))
                                .foregroundStyle(Palette.inkDim)
                                .padding(.bottom, 6)
                        }
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)

                Spacer()

                noteCard
                    .padding(.horizontal, 18)

                controls
                    .padding(.top, 20)
                    .padding(.bottom, 10)
            }
        }
        .preferredColorScheme(.dark)
        .onReceive(tick) { _ in
            elapsed += 1
            if revealed < state.sessionNotes.count && elapsed % 3 == 0 {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                    revealed += 1
                }
            }
        }
    }

    /// "Renée marked 3 areas on your scan", with the count struck in gold.
    private var markedSummary: Text {
        let lead = Text("\(state.upcoming.pro.name) marked ")
            .font(.footnote)
            .foregroundStyle(Palette.ink)
        let count = Text("\(revealed) area\(revealed == 1 ? "" : "s")")
            .font(.label(13))
            .foregroundStyle(Palette.gold)
        let tail = Text(" on your scan")
            .font(.footnote)
            .foregroundStyle(Palette.ink)
        return lead + count + tail
    }

    private var noteCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    Monogram(letter: state.upcoming.pro.initial, size: 28)
                    markedSummary
                    Spacer(minLength: 0)
                }

                if let latest = state.sessionNotes.prefix(max(revealed, 1)).last {
                    Text("\u{201C}\(latest.note)\u{201D} — \(latest.area)")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkDim)
                }

                Button(state.savedMap ? "Saved to your map" : "Save to my map") {
                    state.savedMap = true
                }
                .buttonStyle(GhostButtonStyle(wide: true))
                .disabled(state.savedMap)
            }
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var controls: some View {
        HStack(spacing: 16) {
            circleButton(system: muted ? "mic.slash.fill" : "mic.fill",
                         label: muted ? "Unmute" : "Mute") {
                muted.toggle()
            }
            circleButton(system: "video.fill", label: "Camera") { }
            circleButton(system: "xmark", label: "End call", destructive: true) {
                state.isInSession = false
                dismiss()
            }
        }
    }

    private func circleButton(system: String,
                              label: String,
                              destructive: Bool = false,
                              action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: system)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .frame(width: 50, height: 50)
                .background {
                    Circle().fill(destructive
                                  ? Color(red: 0.69, green: 0.32, blue: 0.23)
                                  : Palette.ink.opacity(0.14))
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

#Preview {
    SessionView().environmentObject(AppState())
}
